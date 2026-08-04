import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, Save, RotateCcw, AlertTriangle, Package, Clock, ShieldAlert, Calendar,
  MessageSquare, Download, Upload, Copy, History, CheckCircle2, XCircle, GitMerge,
  Replace, FileWarning, ArrowLeft, Trash2, ShieldCheck, Search, Plus, Minus, Pencil, Undo2, FileJson, FileSpreadsheet,
  Loader2, ListRestart, ChevronUp, ChevronDown, Lock, RefreshCw, Eye, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { isLongRow, filterDiffRows } from "./notificationRulesDiffHelpers";

/**
 * Per-admin notification rules with:
 *  - Pre-import validation + diff preview (overwrite vs merge)
 *  - Auto-backup before any destructive change
 *  - Version history with rollback
 *  - Detailed errors + field mapping suggestions on bad imports
 */

const STORAGE_KEY = "yess.notification.rules.v1";
const HISTORY_KEY = "yess.notification.rules.history.v1";
const HISTORY_LIMIT = 20;

type Rules = {
  low_stock_threshold: number;
  pending_bookings_threshold: number;
  overdue_dispute_minutes: number;
  pending_approval_threshold: number;
  open_request_threshold: number;

  enabled_low_stock: boolean;
  enabled_pending_bookings: boolean;
  enabled_overdue_disputes: boolean;
  enabled_pending_approvals: boolean;
  enabled_open_requests: boolean;

  desktop_notifications: boolean;
  sound_alerts: boolean;
  digest_frequency: "off" | "hourly" | "daily";
};

const DEFAULTS: Rules = {
  low_stock_threshold: 5,
  pending_bookings_threshold: 10,
  overdue_dispute_minutes: 60,
  pending_approval_threshold: 5,
  open_request_threshold: 8,
  enabled_low_stock: true,
  enabled_pending_bookings: true,
  enabled_overdue_disputes: true,
  enabled_pending_approvals: true,
  enabled_open_requests: true,
  desktop_notifications: false,
  sound_alerts: false,
  digest_frequency: "off",
};

const FIELD_LABELS: Record<keyof Rules, string> = {
  low_stock_threshold: "কম স্টক সীমা",
  pending_bookings_threshold: "অপেক্ষমাণ বুকিং সীমা",
  overdue_dispute_minutes: "বিলম্বিত অভিযোগ (মিনিট)",
  pending_approval_threshold: "অনুমোদন কিউ সীমা",
  open_request_threshold: "খোলা রিকোয়েস্ট সীমা",
  enabled_low_stock: "কম স্টক সতর্কতা",
  enabled_pending_bookings: "অপেক্ষমাণ বুকিং সতর্কতা",
  enabled_overdue_disputes: "বিলম্বিত অভিযোগ সতর্কতা",
  enabled_pending_approvals: "অনুমোদন কিউ সতর্কতা",
  enabled_open_requests: "খোলা রিকোয়েস্ট সতর্কতা",
  desktop_notifications: "ডেস্কটপ নোটিফিকেশন",
  sound_alerts: "শব্দ সতর্কতা",
  digest_frequency: "ডাইজেস্ট ইমেইল",
};

const NUMERIC_FIELDS = new Set<keyof Rules>([
  "low_stock_threshold", "pending_bookings_threshold", "overdue_dispute_minutes",
  "pending_approval_threshold", "open_request_threshold",
]);
const BOOLEAN_FIELDS = new Set<keyof Rules>([
  "enabled_low_stock", "enabled_pending_bookings", "enabled_overdue_disputes",
  "enabled_pending_approvals", "enabled_open_requests",
  "desktop_notifications", "sound_alerts",
]);
const ENUM_DIGEST = new Set(["off", "hourly", "daily"]);

// Loose alias mapping — helps when someone hand-edits or uses an older format
const FIELD_ALIASES: Record<string, keyof Rules> = {
  lowStockThreshold: "low_stock_threshold",
  low_stock: "low_stock_threshold",
  pendingBookings: "pending_bookings_threshold",
  pending_bookings: "pending_bookings_threshold",
  overdueMinutes: "overdue_dispute_minutes",
  overdue_minutes: "overdue_dispute_minutes",
  pendingApprovals: "pending_approval_threshold",
  pending_approvals: "pending_approval_threshold",
  openRequests: "open_request_threshold",
  open_requests: "open_request_threshold",
  desktop: "desktop_notifications",
  sound: "sound_alerts",
  digest: "digest_frequency",
};

export const loadNotificationRules = (): Rules => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

type HistoryEntry = {
  id: string;
  at: string; // ISO
  label: string;
  action: "save" | "import-overwrite" | "import-merge" | "reset" | "auto-backup" | "rollback";
  rules: Rules;
};

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const saveHistory = (h: HistoryEntry[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, HISTORY_LIMIT)));
  } catch {/* quota — ignore */}
};

type ValidationIssue = {
  level: "error" | "warning" | "info";
  field?: string;
  message: string;
  suggestion?: string;
};

type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  normalized: Partial<Rules>;
  meta: { type?: string; version?: number; exported_at?: string };
};

function validatePayload(parsedRaw: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const normalized: Partial<Rules> = {};
  const meta: ValidationResult["meta"] = {};

  if (parsedRaw === null || typeof parsedRaw !== "object") {
    return {
      ok: false,
      issues: [{ level: "error", message: "JSON অবজেক্ট পাওয়া যায়নি — ফাইলটি একটি বৈধ JSON অবজেক্ট হতে হবে।" }],
      normalized: {},
      meta: {},
    };
  }

  // Detect envelope vs flat
  const hasEnvelope = "rules" in parsedRaw && parsedRaw.rules && typeof parsedRaw.rules === "object";
  const incoming: any = hasEnvelope ? parsedRaw.rules : parsedRaw;

  if (hasEnvelope) {
    meta.type = parsedRaw._type;
    meta.version = parsedRaw._version;
    meta.exported_at = parsedRaw._exported_at;
    if (parsedRaw._type && parsedRaw._type !== "yess-notification-rules") {
      issues.push({
        level: "error",
        field: "_type",
        message: `_type "${parsedRaw._type}" — এটি নোটিফিকেশন নিয়ম ফাইল নয়।`,
        suggestion: `আশা করা হয়েছিল: "yess-notification-rules"`,
      });
    } else if (!parsedRaw._type) {
      issues.push({
        level: "warning",
        field: "_type",
        message: "_type ফিল্ড নেই — ফাইলটি অজানা উৎসের।",
        suggestion: `নিরাপত্তার জন্য "yess-notification-rules" যুক্ত করুন।`,
      });
    }
    if (parsedRaw._version && parsedRaw._version !== 1) {
      issues.push({
        level: "warning",
        field: "_version",
        message: `_version ${parsedRaw._version} — বর্তমান সংস্করণ 1।`,
      });
    }
  } else {
    issues.push({
      level: "info",
      message: "ফ্ল্যাট ফরম্যাট সনাক্ত হয়েছে — সরাসরি নিয়ম অবজেক্ট হিসেবে ধরা হবে।",
    });
  }

  if (!incoming || typeof incoming !== "object") {
    issues.push({ level: "error", message: "rules অবজেক্ট নেই বা ভুল ধরনের।" });
    return { ok: false, issues, normalized: {}, meta };
  }

  // Check unknown keys + alias mapping
  const validKeys = new Set(Object.keys(DEFAULTS));
  for (const k of Object.keys(incoming)) {
    if (validKeys.has(k)) continue;
    if (FIELD_ALIASES[k]) {
      const target = FIELD_ALIASES[k];
      issues.push({
        level: "warning",
        field: k,
        message: `অপরিচিত ফিল্ড "${k}" — মিল পাওয়া গেছে।`,
        suggestion: `"${target}" হিসেবে ম্যাপ করা হবে।`,
      });
      if (!(target in incoming)) incoming[target] = incoming[k];
    } else {
      // Try fuzzy
      const close = Object.keys(DEFAULTS).find((vk) => vk.toLowerCase().replace(/_/g, "") === k.toLowerCase().replace(/_/g, ""));
      issues.push({
        level: "warning",
        field: k,
        message: `অপরিচিত ফিল্ড "${k}" — উপেক্ষা করা হবে।`,
        suggestion: close ? `আপনি কি "${close}" বোঝাচ্ছেন?` : undefined,
      });
    }
  }

  // Validate each known key
  for (const key of Object.keys(DEFAULTS) as (keyof Rules)[]) {
    if (!(key in incoming)) continue;
    const v = (incoming as any)[key];

    if (NUMERIC_FIELDS.has(key)) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) {
        issues.push({
          level: "error",
          field: key,
          message: `"${FIELD_LABELS[key]}" সংখ্যা হতে হবে — পাওয়া গেছে: ${JSON.stringify(v)}`,
          suggestion: `উদাহরণ: ${(DEFAULTS as any)[key]}`,
        });
        continue;
      }
      if (n < 1 || n > 1000) {
        issues.push({
          level: "warning",
          field: key,
          message: `"${FIELD_LABELS[key]}" মান ${n} — সীমার বাইরে মনে হচ্ছে।`,
          suggestion: "সাধারণত 1–240 এর মধ্যে রাখুন।",
        });
      }
      (normalized as any)[key] = Math.round(n);
    } else if (BOOLEAN_FIELDS.has(key)) {
      if (typeof v === "boolean") {
        (normalized as any)[key] = v;
      } else if (v === "true" || v === "false" || v === 0 || v === 1) {
        (normalized as any)[key] = v === true || v === "true" || v === 1;
        issues.push({
          level: "warning",
          field: key,
          message: `"${FIELD_LABELS[key]}" বুলিয়ান হওয়া উচিত — অটো-কনভার্ট করা হয়েছে।`,
        });
      } else {
        issues.push({
          level: "error",
          field: key,
          message: `"${FIELD_LABELS[key]}" true/false হতে হবে — পাওয়া গেছে: ${JSON.stringify(v)}`,
        });
      }
    } else if (key === "digest_frequency") {
      if (ENUM_DIGEST.has(v)) {
        normalized.digest_frequency = v;
      } else {
        issues.push({
          level: "error",
          field: key,
          message: `"${FIELD_LABELS[key]}" এর মান ভুল: ${JSON.stringify(v)}`,
          suggestion: `অনুমোদিত: "off" | "hourly" | "daily"`,
        });
      }
    }
  }

  const hasError = issues.some((i) => i.level === "error");
  const hasAnyKnown = Object.keys(normalized).length > 0;
  if (!hasAnyKnown && !hasError) {
    issues.push({
      level: "error",
      message: "কোনো বৈধ নিয়ম ফিল্ড পাওয়া যায়নি।",
      suggestion: `কী এক্সপেক্ট করা হয়: ${Object.keys(DEFAULTS).slice(0, 4).join(", ")}…`,
    });
  }

  return { ok: !hasError && hasAnyKnown, issues, normalized, meta };
}

type DiffKind = "added" | "removed" | "changed";
function diffRules(
  current: Rules,
  next: Rules,
): Array<{ field: keyof Rules; from: any; to: any; kind: DiffKind }> {
  const out: Array<{ field: keyof Rules; from: any; to: any; kind: DiffKind }> = [];
  for (const k of Object.keys(DEFAULTS) as (keyof Rules)[]) {
    const a = current[k];
    const b = next[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    let kind: DiffKind = "changed";
    // Treat boolean flips as added/removed for clearer visual cue
    if (typeof a === "boolean" || typeof b === "boolean") {
      if (!a && b) kind = "added";
      else if (a && !b) kind = "removed";
    }
    if (a === "off" && b !== "off") kind = "added";
    else if (a !== "off" && b === "off") kind = "removed";
    out.push({ field: k, from: a, to: b, kind });
  }
  return out;
}

const fmtVal = (v: any): string => {
  if (typeof v === "boolean") return v ? "চালু" : "বন্ধ";
  if (v === "off") return "বন্ধ";
  if (v === "hourly") return "প্রতি ঘণ্টায়";
  if (v === "daily") return "দৈনিক";
  return String(v);
};

const AdminNotificationRules = () => {
  const [rules, setRules] = useState<Rules>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Import preview state
  const [importPreview, setImportPreview] = useState<{
    source: "file" | "clipboard";
    fileName?: string;
    raw: any;
    validation: ValidationResult;
  } | null>(null);
  const [importMode, setImportMode] = useState<"overwrite" | "merge">("merge");
  const [expandedDiff, setExpandedDiff] = useState<Record<string, boolean>>({});
  const [diffSearch, setDiffSearch] = useState("");
  const [debouncedDiffSearch, setDebouncedDiffSearch] = useState("");
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());
  // Track the last per-field revert toggle so the user gets a one-step Undo.
  // `prev` captures whether the field was excluded BEFORE the toggle, so Undo
  // restores the exact previous state.
  const [lastRevert, setLastRevert] = useState<{ field: string; prev: boolean; at: number } | null>(null);
  // Full revert history (chronological). Each entry is one toggle action.
  // `prev` captures the EXCLUDED-set BEFORE this entry was applied, so jumping
  // back to step N replays the state as it was right after step N (i.e. the
  // entries[N].prev = state-before becomes state-after by restoring entries[N+1].prev,
  // or entries[N].after when N is the latest). We store both for convenience.
  type RevertHistoryEntry = {
    id: string;
    at: number;
    field: string;
    direction: "exclude" | "include";
    after: string[]; // excludedFields snapshot AFTER this action
  };
  const [revertHistory, setRevertHistory] = useState<RevertHistoryEntry[]>([]);
  const [revertHistoryOpen, setRevertHistoryOpen] = useState(false);

  // Export busy flag — disables JSON/CSV buttons + shows spinner. Keyed by
  // format so concurrent triggers can't interleave.
  const [exportBusy, setExportBusy] = useState<null | "json" | "csv">(null);
  // Visible progress text shown next to the spinner (e.g. "প্রস্তুত হচ্ছে…",
  // "৫০টি ফিল্ড এনকোড করা হচ্ছে…", "ডাউনলোড শুরু হয়েছে") and a parallel
  // dedicated aria-live region that announces start / complete states.
  const [exportProgress, setExportProgress] = useState<string>("");
  const [exportAnnouncement, setExportAnnouncement] = useState<string>("");
  // aria-live status counter that announces visible row & exclusion changes.
  const [statusMessage, setStatusMessage] = useState("");

  // localStorage persistence key — scoped per import session so different files
  // don't bleed state into each other. Cleared when the preview closes.
  const persistKey = useMemo(() => {
    if (!importPreview) return null;
    const fp = importPreview.fileName || importPreview.source || "session";
    return `yess.notification.diff.session.${fp}`;
  }, [importPreview]);

  // URL query string sync — when an import preview is open, also reflect
  // search / expanded sections / excluded fields in the URL so a refresh OR
  // a shared link restores the exact diff view. URL takes priority over
  // localStorage on first read.
  //
  // Keys used (kept short to fit in shareable links):
  //   ds  = diff search query
  //   de  = expanded diff field keys (comma-separated)
  //   dx  = excluded (reverted) field keys (comma-separated)
  const urlSyncReadyRef = useRef(false);

  // UX consistency:
  // - Opening a preview tries to RESTORE persisted UI state from localStorage so
  //   a refresh / re-open keeps the user's place.
  // - Closing a preview clears state (in-memory + persisted entry).
  // - Toggling overwrite ⇄ merge is the SAME session → keep everything.
  useEffect(() => {
    if (!importPreview || !persistKey) {
      // closing
      setExpandedDiff({});
      setDiffSearch("");
      setDebouncedDiffSearch("");
      setExcludedFields(new Set());
      setLastRevert(null);
      setRevertHistory([]);
      setRevertHistoryOpen(false);
      // Strip our keys from the URL so the next session starts clean.
      try {
        const u = new URL(window.location.href);
        let touched = false;
        ["ds", "de", "dx"].forEach((k) => {
          if (u.searchParams.has(k)) { u.searchParams.delete(k); touched = true; }
        });
        if (touched) window.history.replaceState({}, "", u.toString());
      } catch { /* non-fatal */ }
      urlSyncReadyRef.current = false;
      return;
    }
    try {
      // 1) URL params take priority — they enable shareable diff links.
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get("ds");
      const urlExpanded = params.get("de");
      const urlExcluded = params.get("dx");
      const hasUrlState = urlSearch !== null || urlExpanded !== null || urlExcluded !== null;

      const raw = localStorage.getItem(persistKey);
      if (hasUrlState) {
        const exp: Record<string, boolean> = {};
        (urlExpanded || "").split(",").filter(Boolean).forEach((f) => { exp[f] = true; });
        setExpandedDiff(exp);
        setDiffSearch(urlSearch || "");
        setDebouncedDiffSearch(urlSearch || "");
        setExcludedFields(new Set((urlExcluded || "").split(",").filter(Boolean)));
        // Revert history is large — keep it in localStorage only, but try to
        // recover it so jump-to-step still works on a shared/refreshed link.
        if (raw) {
          try {
            const saved = JSON.parse(raw) as { revertHistory?: RevertHistoryEntry[] };
            setRevertHistory(saved.revertHistory || []);
          } catch { setRevertHistory([]); }
        } else {
          setRevertHistory([]);
        }
      } else if (raw) {
        const saved = JSON.parse(raw) as {
          expandedDiff?: Record<string, boolean>;
          diffSearch?: string;
          excludedFields?: string[];
          revertHistory?: RevertHistoryEntry[];
        };
        setExpandedDiff(saved.expandedDiff || {});
        setDiffSearch(saved.diffSearch || "");
        setDebouncedDiffSearch(saved.diffSearch || "");
        setExcludedFields(new Set(saved.excludedFields || []));
        setRevertHistory(saved.revertHistory || []);
      } else {
        setExpandedDiff({});
        setDiffSearch("");
        setDebouncedDiffSearch("");
        setExcludedFields(new Set());
        setRevertHistory([]);
      }
      setLastRevert(null);
      setRevertHistoryOpen(false);
      // Allow URL sync writes only AFTER the initial restore to avoid a
      // write-before-read race that could overwrite shared-link params.
      requestAnimationFrame(() => { urlSyncReadyRef.current = true; });
    } catch {
      // bad payload — start clean
      setExpandedDiff({}); setDiffSearch(""); setDebouncedDiffSearch("");
      setExcludedFields(new Set()); setRevertHistory([]); setLastRevert(null);
      urlSyncReadyRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // Persist UI state on every change so refresh / mode-toggle / re-open keep it.
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({
        expandedDiff,
        diffSearch,
        excludedFields: Array.from(excludedFields),
        revertHistory,
      }));
    } catch { /* quota errors etc — non-fatal */ }
  }, [persistKey, expandedDiff, diffSearch, excludedFields, revertHistory]);

  // Mirror the user-facing slices to URL query params (debounced so we don't
  // thrash history.replaceState on every keystroke). Excludes revertHistory
  // because it can grow large and isn't useful in a shared link.
  useEffect(() => {
    if (!persistKey || !urlSyncReadyRef.current) return;
    const t = window.setTimeout(() => {
      try {
        const u = new URL(window.location.href);
        const setOrDelete = (k: string, v: string) => {
          if (v) u.searchParams.set(k, v);
          else u.searchParams.delete(k);
        };
        setOrDelete("ds", diffSearch);
        const expandedKeys = Object.entries(expandedDiff)
          .filter(([, v]) => !!v)
          .map(([k]) => k)
          .join(",");
        setOrDelete("de", expandedKeys);
        setOrDelete("dx", Array.from(excludedFields).join(","));
        window.history.replaceState({}, "", u.toString());
      } catch { /* non-fatal */ }
    }, 250);
    return () => window.clearTimeout(t);
  }, [persistKey, diffSearch, expandedDiff, excludedFields]);

  // Debounce search input (200ms) so we don't re-filter on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDiffSearch(diffSearch), 200);
    return () => window.clearTimeout(t);
  }, [diffSearch]);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  // Refs to each "ফিরে যান" button inside the revert history panel — used by
  // Alt+ArrowUp/Down keyboard shortcuts to move focus between steps without
  // exiting the panel (no focus trap; Tab still leaves naturally).
  const historyStepRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setRules(loadNotificationRules());
    setHistory(loadHistory());
  }, []);

  const pushHistory = (entry: Omit<HistoryEntry, "id" | "at">) => {
    const next: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
    };
    const updated = [next, ...history].slice(0, HISTORY_LIMIT);
    setHistory(updated);
    saveHistory(updated);
  };

  const autoBackup = (label: string) => {
    const current = loadNotificationRules();
    const updated: HistoryEntry[] = [
      {
        id: `${Date.now()}-bak-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        label,
        action: "auto-backup" as const,
        rules: current,
      },
      ...history,
    ].slice(0, HISTORY_LIMIT);
    setHistory(updated);
    saveHistory(updated);
  };

  const update = <K extends keyof Rules>(key: K, value: Rules[K]) => {
    setRules((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    autoBackup("সংরক্ষণের আগের অবস্থা");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent("yess:notification-rules-changed", { detail: rules }));
    pushHistory({ label: "ম্যানুয়াল সংরক্ষণ", action: "save", rules });
    toast.success("নিয়ম সংরক্ষিত হয়েছে");
    setDirty(false);
  };

  const reset = () => {
    if (!window.confirm("সব নিয়ম ডিফল্টে রিসেট করবেন?")) return;
    autoBackup("রিসেটের আগের অবস্থা");
    setRules(DEFAULTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    window.dispatchEvent(new CustomEvent("yess:notification-rules-changed", { detail: DEFAULTS }));
    pushHistory({ label: "ডিফল্টে রিসেট", action: "reset", rules: DEFAULTS });
    toast.success("ডিফল্টে রিসেট হয়েছে");
    setDirty(false);
  };

  const exportRules = () => {
    autoBackup("এক্সপোর্টের সময় স্ন্যাপশট");
    const payload = {
      _type: "yess-notification-rules",
      _version: 1,
      _exported_at: new Date().toISOString(),
      rules,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notification-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("নিয়ম এক্সপোর্ট হয়েছে");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ _type: "yess-notification-rules", _version: 1, rules }, null, 2));
      toast.success("ক্লিপবোর্ডে কপি হয়েছে");
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  const beginImport = (source: "file" | "clipboard", text: string, fileName?: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      toast.error(`JSON পার্স ব্যর্থ: ${e?.message || "অজানা ত্রুটি"}`);
      setImportPreview({
        source,
        fileName,
        raw: null,
        validation: {
          ok: false,
          issues: [{ level: "error", message: `JSON সিনট্যাক্স ত্রুটি: ${e?.message || "পার্স করা যায়নি"}`, suggestion: "ব্যালেন্সড { } [ ] আছে কিনা যাচাই করুন।" }],
          normalized: {},
          meta: {},
        },
      });
      return;
    }
    const validation = validatePayload(parsed);
    setImportPreview({ source, fileName, raw: parsed, validation });
    setImportMode("merge");
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      beginImport("file", text, file.name);
    } catch {
      toast.error("ফাইল পড়া যায়নি");
    }
  };

  const importFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { toast.error("ক্লিপবোর্ড খালি"); return; }
      beginImport("clipboard", text);
    } catch {
      toast.error("ক্লিপবোর্ড থেকে পড়া যায়নি");
    }
  };

  const confirmImport = () => {
    if (!importPreview || !importPreview.validation.ok) return;
    autoBackup("ইমপোর্টের আগের ব্যাকআপ");
    const rawIncoming = importPreview.validation.normalized;
    // Drop fields the user reverted in the preview UI
    const incoming: Partial<Rules> = {};
    for (const k of Object.keys(rawIncoming) as (keyof Rules)[]) {
      if (excludedFields.has(k as string)) continue;
      (incoming as any)[k] = (rawIncoming as any)[k];
    }
    // overwrite: replace from DEFAULTS, but preserve current value for excluded fields.
    // merge: keep current rules, only overlay non-excluded incoming fields.
    const overwriteBase: Rules = { ...DEFAULTS };
    for (const f of excludedFields) {
      const k = f as keyof Rules;
      if (k in rules) (overwriteBase as any)[k] = (rules as any)[k];
    }
    const merged: Rules =
      importMode === "overwrite"
        ? { ...overwriteBase, ...incoming }
        : { ...rules, ...incoming };
    setRules(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("yess:notification-rules-changed", { detail: merged }));
    pushHistory({
      label: importMode === "overwrite" ? "ইমপোর্ট (ওভাররাইট)" : "ইমপোর্ট (মার্জ)",
      action: importMode === "overwrite" ? "import-overwrite" : "import-merge",
      rules: merged,
    });
    setDirty(false);
    setImportPreview(null);
    toast.success(`ইমপোর্ট সফল — ${importMode === "overwrite" ? "ওভাররাইট" : "মার্জ"}`);
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    if (!window.confirm(`"${entry.label}" — ${new Date(entry.at).toLocaleString("bn-BD")} এই ভার্সনে ফিরবেন?`)) return;
    autoBackup("রোলব্যাকের আগের অবস্থা");
    setRules(entry.rules);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.rules));
    window.dispatchEvent(new CustomEvent("yess:notification-rules-changed", { detail: entry.rules }));
    pushHistory({ label: `রোলব্যাক → ${entry.label}`, action: "rollback", rules: entry.rules });
    setDirty(false);
    toast.success("পূর্বের ভার্সন পুনরুদ্ধার হয়েছে");
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      beginImport("file", text, file.name);
      toast.message("ফাইল লোড হয়েছে — প্রিভিউ যাচাই করে নিশ্চিত করুন");
    } catch {
      toast.error("রিস্টোর ফাইল পড়া যায়নি");
    }
  };

  const clearHistory = () => {
    if (!window.confirm("সব হিস্ট্রি মুছে ফেলবেন? এটি অপরিবর্তনীয়।")) return;
    setHistory([]);
    saveHistory([]);
    toast.success("হিস্ট্রি মুছে ফেলা হয়েছে");
  };

  const requestDesktop = async () => {
    if (!("Notification" in window)) {
      toast.error("এই ব্রাউজার ডেস্কটপ নোটিফিকেশন সাপোর্ট করে না");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      update("desktop_notifications", true);
      new Notification("সন্ধান বাংলা", { body: "ডেস্কটপ নোটিফিকেশন চালু হয়েছে ✓" });
    } else {
      toast.error("ব্রাউজার পারমিশন দেয়নি");
    }
  };

  // Diff for import preview
  const previewDiff = useMemo(() => {
    if (!importPreview || !importPreview.validation.ok) return [];
    const incoming = importPreview.validation.normalized;
    const next: Rules =
      importMode === "overwrite"
        ? { ...DEFAULTS, ...incoming }
        : { ...rules, ...incoming };
    const kindOrder: Record<DiffKind, number> = { added: 0, changed: 1, removed: 2 };
    const typeRank = (v: any): number => {
      if (typeof v === "boolean") return 0;
      if (typeof v === "number") return 1;
      if (typeof v === "string") return 2;
      if (Array.isArray(v)) return 3;
      return 4;
    };
    return diffRules(rules, next).slice().sort((a, b) => {
      // 1) kind: added → changed → removed
      if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
      // 2) value type: boolean → number → string → array → other
      const ta = typeRank(a.to ?? a.from);
      const tb = typeRank(b.to ?? b.from);
      if (ta !== tb) return ta - tb;
      // 3) field key: stable alphabetical (locale-aware)
      return String(a.field).localeCompare(String(b.field));
    });
  }, [importPreview, importMode, rules]);

  // Diff filtered by debounced search box. Matches field key OR Bengali label,
  // case- and accent-insensitive. Logic lives in `notificationRulesDiffHelpers`
  // so it can be unit tested without rendering this page.
  const visibleDiff = useMemo(
    () =>
      filterDiffRows(
        previewDiff as Array<{ field: string } & typeof previewDiff[number]>,
        debouncedDiffSearch,
        (f) => FIELD_LABELS[f as keyof Rules] || "",
      ),
    [previewDiff, debouncedDiffSearch],
  );

  // aria-live status: announce visible-row count + exclusion count whenever
  // either changes. Kept terse so screen readers can keep up.
  useEffect(() => {
    if (!importPreview) { setStatusMessage(""); return; }
    const total = previewDiff.length;
    const visible = visibleDiff.length;
    const excluded = excludedFields.size;
    const filterPart =
      debouncedDiffSearch.trim().length > 0
        ? `${visible}/${total} ফিল্ড দৃশ্যমান`
        : `${visible} ফিল্ড দৃশ্যমান`;
    const revertPart = excluded > 0 ? `, ${excluded}টি রিভার্টে বাদ` : "";
    setStatusMessage(`${filterPart}${revertPart}।`);
  }, [importPreview, previewDiff.length, visibleDiff.length, excludedFields, debouncedDiffSearch]);

  // Per-field revert toggle. Captures the previous state for one-step Undo,
  // and appends a chronological history entry that the revert-history panel
  // can replay. Re-entrant safe via functional state update.
  const toggleRevertField = (field: string) => {
    setExcludedFields((prev) => {
      const wasExcluded = prev.has(field);
      const next = new Set(prev);
      if (wasExcluded) next.delete(field);
      else next.add(field);
      // Append the corresponding history entry inside the same render cycle.
      const direction: "exclude" | "include" = wasExcluded ? "include" : "exclude";
      const entry: RevertHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        field,
        direction,
        after: Array.from(next),
      };
      setRevertHistory((h) => [...h, entry].slice(-50)); // cap at 50
      setLastRevert({ field, prev: wasExcluded, at: entry.at });
      // Announce the action with the field's Bengali label so the user
      // sees exactly which field flipped and to which side.
      const label = FIELD_LABELS[field as keyof Rules] || field;
      if (direction === "exclude") {
        toast.success(`"${label}" — ইমপোর্ট থেকে বাদ দেওয়া হয়েছে`, {
          description: "এই ফিল্ডের পরিবর্তন প্রয়োগ হবে না।",
        });
      } else {
        toast.success(`"${label}" — ইমপোর্টে আবার যোগ করা হয়েছে`, {
          description: "এই ফিল্ডের পরিবর্তন প্রয়োগ হবে।",
        });
      }
      return next;
    });
  };

  /**
   * Restore the exclusion-set to the snapshot AFTER the given step. Steps after
   * that index are dropped (linear history — branching not supported).
   */
  const jumpToRevertStep = (entryId: string) => {
    const idx = revertHistory.findIndex((e) => e.id === entryId);
    if (idx === -1) return;
    const entry = revertHistory[idx];
    setExcludedFields(new Set(entry.after));
    setRevertHistory((h) => h.slice(0, idx + 1));
    setLastRevert(null);
    const label = FIELD_LABELS[entry.field as keyof Rules] || entry.field;
    const dir = entry.direction === "exclude" ? "বাদ" : "পুনরায় যোগ";
    toast.success(`স্টেপ #${idx + 1}-এ ফেরা হয়েছে — "${label}" (${dir})`, {
      description: `${entry.after.length}টি ফিল্ড এখন রিভার্টে বাদ আছে।`,
    });
  };

  /** Undo every revert AND clear the history (used by panel "শুরুতে ফেরান"). */
  const jumpToRevertStart = () => {
    setExcludedFields(new Set());
    setRevertHistory([]);
    setLastRevert(null);
    toast.success("রিভার্ট ইতিহাস সাফ — শুরুতে ফেরা হয়েছে");
  };

  // Restore the exact previous state of the most-recently toggled field.
  const undoLastRevert = () => {
    if (!lastRevert) return;
    const { field, prev } = lastRevert;
    setExcludedFields((curr) => {
      const next = new Set(curr);
      if (prev) next.add(field);
      else next.delete(field);
      return next;
    });
    // Drop the latest history entry to keep the timeline coherent.
    setRevertHistory((h) => h.slice(0, -1));
    setLastRevert(null);
    toast.success("শেষ রিভার্ট পূর্বাবস্থায় ফেরানো হয়েছে");
  };

  // Clear ALL per-field reverts. Confirmation required to avoid accidental wipes.
  const clearAllRevertsRef = useRef(false);
  const clearAllReverts = () => {
    if (clearAllRevertsRef.current) return; // guard against double-trigger
    if (excludedFields.size === 0) return;
    clearAllRevertsRef.current = true;
    try {
      const ok = window.confirm(
        `সব রিভার্ট সাফ করবেন? (${excludedFields.size}টি ফিল্ড) — এই ফিল্ডগুলো আবার ইমপোর্টে অন্তর্ভুক্ত হবে।`
      );
      if (!ok) return;
      setExcludedFields(new Set());
      setRevertHistory([]);
      setLastRevert(null);
      toast.success("সব রিভার্ট সাফ হয়েছে");
    } finally {
      // release on next tick so a stray double-click doesn't re-fire
      setTimeout(() => { clearAllRevertsRef.current = false; }, 250);
    }
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * Export the revert-history timeline as a self-contained JSON file. Each
   * entry includes the action's index, ISO timestamp, field key + Bengali
   * label, direction (exclude/include), and the full excluded-set snapshot
   * AFTER the action — making the file replay-able later.
   */
  const exportRevertHistory = () => {
    if (revertHistory.length === 0) {
      toast.error("রিভার্ট ইতিহাস খালি — রপ্তানি করার মতো কিছু নেই");
      return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const payload = {
      _type: "yess-notification-rules-revert-timeline",
      _version: 1,
      _generated_at: new Date().toISOString(),
      session: {
        file_name: importPreview?.fileName || null,
        source: importPreview?.source || null,
        mode: importMode,
      },
      summary: {
        total_steps: revertHistory.length,
        currently_excluded: excludedFields.size,
        first_at: revertHistory[0] ? new Date(revertHistory[0].at).toISOString() : null,
        last_at: revertHistory[revertHistory.length - 1]
          ? new Date(revertHistory[revertHistory.length - 1].at).toISOString()
          : null,
      },
      timeline: revertHistory.map((e, idx) => ({
        step: idx + 1,
        id: e.id,
        at: new Date(e.at).toISOString(),
        field: e.field,
        label: FIELD_LABELS[e.field as keyof Rules] || e.field,
        direction: e.direction,
        excluded_after: e.after,
      })),
    };
    downloadFile(
      `notification-rules-revert-timeline-${ts}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    toast.success(`রিভার্ট ইতিহাস রপ্তানি সফল — ${revertHistory.length}টি স্টেপ`);
    setExportAnnouncement(`রিভার্ট টাইমলাইন রপ্তানি সম্পন্ন — ${revertHistory.length}টি স্টেপ সংরক্ষিত।`);
    setTimeout(() => setExportAnnouncement(""), 2500);
  };

  const exportDiff = async (format: "json" | "csv") => {
    // Hard guard: if any export is in progress, ignore. Buttons are also
    // disabled at the UI layer, but this keeps the contract correct in tests
    // and against keyboard double-Enter.
    if (exportBusy) return;
    const exportRows = visibleDiff;
    if (exportRows.length === 0) {
      toast.error(
        debouncedDiffSearch.trim()
          ? `"${debouncedDiffSearch}" ফিল্টারে কোনো ফিল্ড নেই`
          : "রপ্তানি করার মতো কোনো পরিবর্তন নেই",
      );
      return;
    }
    setExportBusy(format);
    setExportProgress("প্রস্তুত হচ্ছে…");
    setExportAnnouncement(`${format.toUpperCase()} রপ্তানি শুরু হয়েছে — ${exportRows.length}টি ফিল্ড।`);
    // Yield to the browser so the spinner paints before we encode/serialize.
    await new Promise((r) => setTimeout(r, 30));
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filtered = debouncedDiffSearch.trim().length > 0;
    try {
    setExportProgress(`${exportRows.length}টি ফিল্ড এনকোড করা হচ্ছে…`);
    if (format === "json") {
      const payload = {
        _type: "yess-notification-rules-diff",
        _version: 1,
        _generated_at: new Date().toISOString(),
        mode: importMode,
        filter: filtered ? { search: debouncedDiffSearch, total_before_filter: previewDiff.length } : null,
        summary: {
          added: exportRows.filter((d) => d.kind === "added").length,
          changed: exportRows.filter((d) => d.kind === "changed").length,
          removed: exportRows.filter((d) => d.kind === "removed").length,
          excluded: excludedFields.size,
        },
        changes: exportRows.map((d) => ({
          field: d.field,
          label: FIELD_LABELS[d.field],
          kind: d.kind,
          from: d.from,
          to: d.to,
          excluded: excludedFields.has(d.field as string),
        })),
      };
      downloadFile(`notification-rules-diff-${ts}.json`, JSON.stringify(payload, null, 2), "application/json");
    } else {
      const esc = (v: any) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["kind", "field", "label", "from", "to", "from_display", "to_display", "excluded"];
      const rows = exportRows.map((d) => [
        d.kind,
        d.field,
        FIELD_LABELS[d.field],
        JSON.stringify(d.from),
        JSON.stringify(d.to),
        fmtVal(d.from),
        fmtVal(d.to),
        excludedFields.has(d.field as string) ? "true" : "false",
      ]);
      // UTF-8 BOM for Bengali support in Excel
      const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
      downloadFile(`notification-rules-diff-${ts}.csv`, csv, "text/csv;charset=utf-8");
    }
    setExportProgress("ডাউনলোড শুরু হয়েছে…");
    toast.success(
      filtered
        ? `ডিফ রপ্তানি সফল — ${format.toUpperCase()} (ফিল্টার প্রয়োগ: ${exportRows.length}/${previewDiff.length})`
        : `ডিফ রপ্তানি সফল — ${format.toUpperCase()}`
    );
    setExportAnnouncement(`${format.toUpperCase()} রপ্তানি সম্পন্ন — ${exportRows.length}টি ফিল্ড সংরক্ষিত।`);
    } finally {
      // Keep the "Done" announcement readable for a moment, then clear so the
      // live region is ready for the next event.
      setExportBusy(null);
      setTimeout(() => setExportProgress(""), 800);
      setTimeout(() => setExportAnnouncement(""), 2500);
    }
  };

  const RuleCard = ({
    icon, title, description, enabled, onToggle, threshold, unit, onChange, min = 1, max = 100,
  }: {
    icon: React.ReactNode; title: string; description: string; enabled: boolean;
    onToggle: (v: boolean) => void; threshold: number; unit: string;
    onChange: (v: number) => void; min?: number; max?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition ${enabled ? "border-primary/40 bg-card shadow-sm" : "border-border bg-muted/20"}`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            <label className="inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="sr-only peer" />
              <div className="relative w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition peer-checked:after:translate-x-4" />
            </label>
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
          <div className={`mt-3 flex items-center gap-2 ${enabled ? "" : "opacity-50 pointer-events-none"}`}>
            <input type="range" min={min} max={max} value={threshold}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 accent-primary cursor-pointer" />
            <div className="text-xs font-bold tabular-nums w-16 text-right">
              {threshold} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const errors = importPreview?.validation.issues.filter((i) => i.level === "error") ?? [];
  const warnings = importPreview?.validation.issues.filter((i) => i.level === "warning") ?? [];
  const infos = importPreview?.validation.issues.filter((i) => i.level === "info") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground flex items-center justify-center">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight">নোটিফিকেশন নিয়ম</h1>
          <p className="text-[11px] text-muted-foreground">কখন আপনাকে সতর্ক করা হবে তা ঠিক করুন</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRestoreFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={exportRules} title="JSON ফাইল হিসেবে ডাউনলোড"
            className="inline-flex items-center gap-1 rounded-xl bg-muted hover:bg-muted/70 text-foreground px-3 h-9 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> এক্সপোর্ট
          </button>
          <button onClick={() => fileInputRef.current?.click()} title="JSON ফাইল থেকে আমদানি (প্রিভিউ সহ)"
            className="inline-flex items-center gap-1 rounded-xl bg-muted hover:bg-muted/70 text-foreground px-3 h-9 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5" /> ইমপোর্ট
          </button>
          <button onClick={copyToClipboard} title="ক্লিপবোর্ডে কপি"
            className="inline-flex items-center justify-center rounded-xl bg-muted hover:bg-muted/70 text-foreground w-9 h-9">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setHistoryOpen((v) => !v)}
            title="ভার্সন হিস্ট্রি"
            className={`inline-flex items-center gap-1 rounded-xl px-3 h-9 text-xs font-semibold transition ${historyOpen ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-foreground"}`}>
            <History className="h-3.5 w-3.5" /> হিস্ট্রি
            {history.length > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-[10px] ${historyOpen ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"}`}>
                {history.length}
              </span>
            )}
          </button>
          <button onClick={reset}
            className="inline-flex items-center gap-1 rounded-xl bg-muted hover:bg-muted/70 text-foreground px-3 h-9 text-xs font-semibold">
            <RotateCcw className="h-3.5 w-3.5" /> রিসেট
          </button>
          <button onClick={save} disabled={!dirty}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground px-3 h-9 text-xs font-semibold disabled:opacity-50 shadow-sm">
            <Save className="h-3.5 w-3.5" /> সংরক্ষণ
          </button>
        </div>
      </div>

      {/* IMPORT PREVIEW PANEL */}
      {importPreview && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/40 bg-card shadow-md overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">ইমপোর্ট প্রিভিউ — যাচাই করুন</h3>
            {importPreview.fileName && (
              <span className="text-[11px] text-muted-foreground truncate">• {importPreview.fileName}</span>
            )}
            <button
              onClick={() => setImportPreview(null)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> বাতিল
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Validation summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-xl border p-2.5 text-center ${errors.length ? "border-destructive/40 bg-destructive/5" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900"}`}>
                <div className="flex items-center justify-center gap-1">
                  {errors.length ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  <span className="text-[11px] font-semibold">{errors.length} ত্রুটি</span>
                </div>
              </div>
              <div className={`rounded-xl border p-2.5 text-center ${warnings.length ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900" : "border-border bg-muted/20"}`}>
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold">{warnings.length} সতর্কতা</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-center">
                <span className="text-[11px] font-semibold">{Object.keys(importPreview.validation.normalized).length} ফিল্ড</span>
              </div>
            </div>

            {/* Meta */}
            {(importPreview.validation.meta.type || importPreview.validation.meta.exported_at) && (
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                {importPreview.validation.meta.type && <span>টাইপ: <code className="font-mono">{importPreview.validation.meta.type}</code></span>}
                {importPreview.validation.meta.version && <span>সংস্করণ: {importPreview.validation.meta.version}</span>}
                {importPreview.validation.meta.exported_at && <span>এক্সপোর্ট: {new Date(importPreview.validation.meta.exported_at).toLocaleString("bn-BD")}</span>}
              </div>
            )}

            {/* Issues list */}
            {(errors.length > 0 || warnings.length > 0 || infos.length > 0) && (
              <div className="space-y-1.5 max-h-48 overflow-auto">
                {[...errors, ...warnings, ...infos].map((iss, idx) => (
                  <div key={idx}
                    className={`rounded-lg border px-3 py-2 text-[11.5px] flex items-start gap-2 ${
                      iss.level === "error" ? "border-destructive/40 bg-destructive/5" :
                      iss.level === "warning" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900" :
                      "border-border bg-muted/30"
                    }`}>
                    {iss.level === "error" ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> :
                     iss.level === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /> :
                     <FileWarning className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      {iss.field && <code className="font-mono text-[10.5px] bg-background/60 rounded px-1 mr-1">{iss.field}</code>}
                      <span>{iss.message}</span>
                      {iss.suggestion && <div className="text-muted-foreground mt-0.5">💡 {iss.suggestion}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mode toggle */}
            {importPreview.validation.ok && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setImportMode("merge")}
                    className={`rounded-xl border p-3 text-left transition ${importMode === "merge" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <GitMerge className={`h-4 w-4 ${importMode === "merge" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">মার্জ</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug">শুধু আগত ফিল্ডগুলো আপডেট হবে; বাকি বিদ্যমান নিয়ম অক্ষুণ্ণ থাকবে।</p>
                  </button>
                  <button
                    onClick={() => setImportMode("overwrite")}
                    className={`rounded-xl border p-3 text-left transition ${importMode === "overwrite" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Replace className={`h-4 w-4 ${importMode === "overwrite" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">ওভাররাইট</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug">আগের সব মান বাদ দিয়ে আগত ফাইল + ডিফল্ট দিয়ে রিপ্লেস হবে।</p>
                  </button>
                </div>

                {/* Per-slice retain/reset panel — makes it explicit which UI state
                    survives a mode toggle and which gets cleared on preview close. */}
                {(() => {
                  const expandedCount = Object.values(expandedDiff).filter(Boolean).length;
                  const slices = [
                    {
                      key: "search",
                      icon: Search,
                      label: "সার্চ",
                      active: !!diffSearch,
                      detail: diffSearch ? `"${diffSearch}"` : "খালি",
                    },
                    {
                      key: "expand",
                      icon: Eye,
                      label: "এক্সপ্যান্ড",
                      active: expandedCount > 0,
                      detail: expandedCount > 0 ? `${expandedCount}টি খোলা` : "সব বন্ধ",
                    },
                    {
                      key: "revert",
                      icon: Undo2,
                      label: "রিভার্ট",
                      active: excludedFields.size > 0,
                      detail: excludedFields.size > 0 ? `${excludedFields.size}টি বাদ` : "কিছু বাদ নেই",
                    },
                  ];
                  const anyActive = slices.some((s) => s.active);
                  return (
                    <div
                      role="note"
                      aria-live="polite"
                      aria-label="স্টেট সংরক্ষণ অবস্থা"
                      className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground leading-snug">
                        <Lock className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span className="font-semibold text-foreground">মোড পরিবর্তনে সংরক্ষিত:</span>
                        <span>মার্জ ⇄ ওভাররাইট টগল করলে নিচের সব slice বজায় থাকে।</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {slices.map((s) => {
                          const Icon = s.icon;
                          return (
                            <span
                              key={s.key}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition ${
                                s.active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                  : "bg-muted/40 text-muted-foreground border-border"
                              }`}
                              title={`${s.label}: ${s.detail} — মোড পরিবর্তনে বজায় থাকবে, প্রিভিউ বন্ধে রিসেট হবে`}
                            >
                              <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                              <span>{s.label}:</span>
                              <span className="font-bold">{s.detail}</span>
                              {s.active && <Lock className="h-2.5 w-2.5 opacity-70" aria-hidden="true" />}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground leading-snug pt-0.5 border-t border-border/40">
                        <RefreshCw className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                        <span className="font-semibold text-foreground">প্রিভিউ বন্ধে রিসেট:</span>
                        <span>বাতিল চাপলে বা নতুন ফাইল লোড করলে — উপরের সব {anyActive ? "সংরক্ষিত" : ""} স্টেট মুছে যাবে।</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Diff */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-[11px] font-semibold flex items-center justify-between gap-2 flex-wrap">
                    <span>পরিবর্তনের সারাংশ (ফিল্ড-লেভেল ডিফ)</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {(["added", "changed", "removed"] as const).map((kind) => {
                        const items = previewDiff.filter((d) => d.kind === kind);
                        const KindIcon = kind === "added" ? Plus : kind === "removed" ? Minus : Pencil;
                        const label = kind === "added" ? "নতুন" : kind === "removed" ? "বন্ধ" : "পরিবর্তিত";
                        const cls =
                          kind === "added"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : kind === "removed"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
                        const longInKind = items
                          .filter((d) => {
                            return isLongRow({
                              fromDisplay: fmtVal(d.from),
                              toDisplay: fmtVal(d.to),
                              label: FIELD_LABELS[d.field] || "",
                            });
                          })
                          .map((d) => d.field as string);
                        const anyOpen = longInKind.some((f) => expandedDiff[f]);
                        const onClick = () => {
                          if (longInKind.length === 0) return;
                          const willOpen = !anyOpen;
                          setExpandedDiff((s) => {
                            const next = { ...s };
                            longInKind.forEach((f) => { next[f] = willOpen; });
                            return next;
                          });
                          // Focus management: when expanding, move focus to the first
                          // matching row's button so keyboard users land on the
                          // newly revealed content. We do NOT trap — Tab still
                          // walks naturally out of the list.
                          if (willOpen && longInKind.length > 0) {
                            requestAnimationFrame(() => {
                              const first = longInKind[0];
                              const el = document.querySelector<HTMLButtonElement>(
                                `#diff-rows-list [data-diff-field="${CSS.escape(first)}"]`,
                              );
                              el?.focus();
                            });
                          }
                        };
                        return (
                          <button
                            key={kind}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onClick();
                              }
                            }}
                            disabled={longInKind.length === 0}
                            aria-pressed={anyOpen}
                            aria-controls="diff-rows-list"
                            aria-label={
                              longInKind.length === 0
                                ? `${label}: কোনো বিস্তারিত ফিল্ড নেই`
                                : anyOpen
                                  ? `${label} বিস্তারিত বন্ধ করুন (${longInKind.length}টি ফিল্ড)`
                                  : `${label} বিস্তারিত দেখুন (${longInKind.length}টি ফিল্ড)`
                            }
                            title={longInKind.length === 0 ? `কোনো ${label} long-value নেই` : (anyOpen ? `${label} বন্ধ করুন` : `${label} বিস্তারিত দেখুন`)}
                            className={`inline-flex items-center gap-1 rounded-full ${cls} px-1.5 py-0.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-default ${longInKind.length > 0 ? "hover:brightness-95" : ""} ${anyOpen ? "ring-1 ring-primary/40" : ""}`}
                          >
                            <KindIcon className="h-3 w-3" aria-hidden="true" />
                            <span>{items.length} {label}</span>
                          </button>
                        );
                      })}
                      {(() => {
                        const longFields = previewDiff
                          .filter((d) => {
                            return isLongRow({
                              fromDisplay: fmtVal(d.from),
                              toDisplay: fmtVal(d.to),
                              label: FIELD_LABELS[d.field] || "",
                            });
                          })
                          .map((d) => d.field as string);
                        if (longFields.length === 0) return null;
                        const allOpen = longFields.every((f) => expandedDiff[f]);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDiff((s) => {
                                const next = { ...s };
                                longFields.forEach((f) => { next[f] = !allOpen; });
                                return next;
                              });
                            }}
                            className="rounded-full bg-card border border-border px-2 py-0.5 font-semibold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-pressed={allOpen}
                            aria-controls="diff-rows-list"
                            aria-label={allOpen ? "সব বিস্তারিত বন্ধ করুন" : "সব বিস্তারিত দেখুন"}
                          >
                            {allOpen ? "সব বন্ধ" : "সব দেখান"}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Search + Export toolbar */}
                  {previewDiff.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50 flex-wrap">
                      <label className="relative flex-1 min-w-[140px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="search"
                          value={diffSearch}
                          onChange={(e) => setDiffSearch(e.target.value)}
                          placeholder="ফিল্ড দিয়ে খুঁজুন (যেমন: low_stock বা স্টক)"
                          aria-label="ডিফ ফিল্ড অনুসন্ধান"
                          className="w-full h-7 pl-7 pr-2 rounded-lg border border-border bg-background text-[11.5px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      {lastRevert && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); undoLastRevert(); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60 px-2 h-7 text-[10.5px] font-semibold"
                          title={`শেষ রিভার্ট পূর্বাবস্থায় ফেরান: ${FIELD_LABELS[lastRevert.field as keyof Rules] || lastRevert.field}`}
                          aria-label="শেষ রিভার্ট পূর্বাবস্থায় ফেরান"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          শেষটি ফেরান
                        </button>
                      )}
                      {excludedFields.size > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearAllReverts(); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-muted hover:bg-muted/70 px-2 h-7 text-[10.5px] font-semibold"
                          title="সব রিভার্ট তুলে নিন (নিশ্চিতকরণ চাওয়া হবে)"
                          aria-label={`সব রিভার্ট সাফ করুন (${excludedFields.size}টি)`}
                        >
                          <Undo2 className="h-3 w-3" aria-hidden="true" />
                          {excludedFields.size} রিভার্ট সাফ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void exportDiff("json")}
                        disabled={exportBusy !== null}
                        aria-busy={exportBusy === "json"}
                        className="inline-flex items-center gap-1 rounded-lg bg-card border border-border hover:bg-muted px-2 h-7 text-[10.5px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        title={exportBusy === "json" ? "JSON রপ্তানি চলছে…" : "ডিফ JSON হিসেবে নামান"}
                      >
                        {exportBusy === "json" ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileJson className="h-3 w-3" aria-hidden="true" />
                        )}
                        {exportBusy === "json" ? "নামছে…" : "JSON"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void exportDiff("csv")}
                        disabled={exportBusy !== null}
                        aria-busy={exportBusy === "csv"}
                        className="inline-flex items-center gap-1 rounded-lg bg-card border border-border hover:bg-muted px-2 h-7 text-[10.5px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        title={exportBusy === "csv" ? "CSV রপ্তানি চলছে…" : "ডিফ CSV হিসেবে নামান (Excel সমর্থিত)"}
                      >
                        {exportBusy === "csv" ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
                        )}
                        {exportBusy === "csv" ? "নামছে…" : "CSV"}
                      </button>
                      {/* Inline progress text — visible to sighted users while
                          encoding so they know the spinner is making progress.
                          A separate aria-live region handles screen readers. */}
                      {(exportBusy || exportProgress) && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                          aria-hidden="true"
                        >
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          {exportProgress || "প্রক্রিয়াধীন…"}
                        </span>
                      )}
                      {/* Dedicated aria-live announcer for export start/complete.
                          Visually hidden — pairs with the toast for sighted users. */}
                      <span
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                      >
                        {exportAnnouncement}
                      </span>
                    </div>
                  )}

                  {/* aria-live status announcer (visually compact, screen-reader friendly). */}
                  {previewDiff.length > 0 && (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="px-3 py-1 border-b border-border bg-muted/20 text-[10.5px] text-muted-foreground flex items-center justify-between gap-2"
                    >
                      <span>{statusMessage}</span>
                      {revertHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setRevertHistoryOpen((v) => !v); }}
                          aria-expanded={revertHistoryOpen}
                          aria-controls="diff-revert-history"
                          className="inline-flex items-center gap-1 rounded-md bg-card border border-border hover:bg-muted px-1.5 h-5 text-[10px] font-semibold"
                          title={revertHistoryOpen ? "রিভার্ট ইতিহাস বন্ধ করুন" : "রিভার্ট ইতিহাস দেখুন"}
                        >
                          <History className="h-2.5 w-2.5" aria-hidden="true" />
                          ইতিহাস ({revertHistory.length})
                          {revertHistoryOpen
                            ? <ChevronUp className="h-2.5 w-2.5" aria-hidden="true" />
                            : <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Revert history panel — chronological log with jump-to-step. */}
                  {revertHistoryOpen && revertHistory.length > 0 && (
                    <div
                      id="diff-revert-history"
                      role="region"
                      aria-label="রিভার্ট ইতিহাস"
                      className="border-b border-border bg-card/40"
                    >
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground border-b border-border/60 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>প্রতিটি স্টেপে ফিরে যেতে পারেন</span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-muted/60 border border-border/60 px-1.5 py-0.5 text-[9.5px] font-mono font-normal"
                            title="ফোকাস ইতিহাস প্যানেলে থাকা অবস্থায় Alt + ↑/↓ চাপুন"
                          >
                            Alt + ↑/↓
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); exportRevertHistory(); }}
                            className="inline-flex items-center gap-1 rounded-md bg-card border border-border hover:bg-muted px-1.5 h-5 text-[10px] font-semibold"
                            title="রিভার্ট ইতিহাস JSON টাইমলাইন হিসেবে নামান"
                            aria-label={`রিভার্ট ইতিহাস রপ্তানি করুন (${revertHistory.length}টি স্টেপ)`}
                          >
                            <FileJson className="h-2.5 w-2.5" aria-hidden="true" />
                            টাইমলাইন
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); jumpToRevertStart(); }}
                            className="inline-flex items-center gap-1 rounded-md bg-card border border-border hover:bg-muted px-1.5 h-5 text-[10px] font-semibold"
                            title="শুরুতে ফিরে যান (সব রিভার্ট সাফ + ইতিহাস মুছবে)"
                          >
                            <ListRestart className="h-2.5 w-2.5" aria-hidden="true" />
                            শুরুতে
                          </button>
                        </div>
                      </div>
                      <ol
                        className="max-h-32 overflow-auto divide-y divide-border/60 focus:outline-none"
                        onKeyDown={(e) => {
                          // Alt+Arrow shortcuts move focus between step buttons
                          // without leaving the panel. We DO NOT trap Tab so
                          // users can still escape forward to the next region.
                          if (!e.altKey) return;
                          if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
                          e.preventDefault();
                          e.stopPropagation();
                          const buttons = historyStepRefs.current.filter(Boolean) as HTMLButtonElement[];
                          if (buttons.length === 0) return;
                          const active = document.activeElement as HTMLElement | null;
                          const currentIdx = buttons.findIndex((b) => b === active);
                          let nextIdx = currentIdx;
                          if (e.key === "ArrowDown") {
                            nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, buttons.length - 1);
                          } else if (e.key === "ArrowUp") {
                            nextIdx = currentIdx < 0 ? buttons.length - 1 : Math.max(currentIdx - 1, 0);
                          } else if (e.key === "Home") {
                            nextIdx = 0;
                          } else if (e.key === "End") {
                            nextIdx = buttons.length - 1;
                          }
                          buttons[nextIdx]?.focus();
                          buttons[nextIdx]?.scrollIntoView({ block: "nearest" });
                        }}
                      >
                        {revertHistory.map((entry, idx) => {
                          const fieldLabel = FIELD_LABELS[entry.field as keyof Rules] || entry.field;
                          const time = new Date(entry.at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          const dirCls = entry.direction === "exclude"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
                          const dirText = entry.direction === "exclude" ? "বাদ" : "পুনরায় যোগ";
                          const isLatest = idx === revertHistory.length - 1;
                          return (
                            <li key={entry.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                              <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0 tabular-nums">#{idx + 1}</span>
                              <span className={`inline-flex items-center rounded-md px-1.5 h-4 text-[9.5px] font-bold shrink-0 ${dirCls}`}>{dirText}</span>
                              <span className="flex-1 min-w-0 truncate font-medium" title={fieldLabel}>{fieldLabel}</span>
                              <span className="text-[9.5px] text-muted-foreground tabular-nums shrink-0">{time}</span>
                              <button
                                type="button"
                                ref={(el) => { historyStepRefs.current[idx] = el; }}
                                onClick={(e) => { e.stopPropagation(); jumpToRevertStep(entry.id); }}
                                disabled={isLatest}
                                className="inline-flex items-center gap-1 rounded-md bg-card border border-border hover:bg-muted px-1.5 h-5 text-[9.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1"
                                title={isLatest ? "এটি বর্তমান অবস্থা" : `স্টেপ #${idx + 1}-এ ফিরে যান`}
                                aria-label={`স্টেপ ${idx + 1}-এ ফিরে যান`}
                              >
                                <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                                {isLatest ? "এখানে" : "ফিরে যান"}
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                      {/* Hint line + share-link button bound to URL sync. */}
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/60">
                        <span>
                          <kbd className="font-mono text-[9.5px] px-1 rounded bg-muted/60 border border-border">Alt</kbd>
                          {" + "}
                          <kbd className="font-mono text-[9.5px] px-1 rounded bg-muted/60 border border-border">↑/↓</kbd>
                          {" "}স্টেপের মধ্যে ফোকাস সরান •{" "}
                          <kbd className="font-mono text-[9.5px] px-1 rounded bg-muted/60 border border-border">Home</kbd>/<kbd className="font-mono text-[9.5px] px-1 rounded bg-muted/60 border border-border">End</kbd>
                          {" "}প্রথম/শেষ স্টেপ
                        </span>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await navigator.clipboard.writeText(window.location.href);
                              toast.success("ডিফ ভিউ লিঙ্ক কপি হয়েছে — শেয়ার করুন");
                            } catch {
                              toast.error("লিঙ্ক কপি করা যায়নি");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-card border border-border hover:bg-muted px-1.5 h-5 text-[10px] font-semibold"
                          title="বর্তমান সার্চ + এক্সপ্যান্ড + রিভার্ট সহ লিঙ্ক কপি করুন"
                        >
                          <Link2 className="h-2.5 w-2.5" aria-hidden="true" />
                          লিঙ্ক কপি
                        </button>
                      </div>
                    </div>
                  )}

                  {previewDiff.length === 0 ? (
                    <div className="px-3 py-3 text-[11.5px] text-muted-foreground text-center">কোনো পরিবর্তন নেই — সব মান বর্তমান অবস্থার সাথে মিলছে।</div>
                  ) : visibleDiff.length === 0 ? (
                    <div className="px-3 py-3 text-[11.5px] text-muted-foreground text-center">
                      "{debouncedDiffSearch}" এর জন্য কোনো ফিল্ড মেলেনি।
                    </div>
                  ) : (
                    <div
                      id="diff-rows-list"
                      role="list"
                      aria-label="ডিফ ফিল্ড তালিকা"
                      className="max-h-56 overflow-auto divide-y divide-border"
                    >
                      {visibleDiff.map((d) => {
                        const KindIcon = d.kind === "added" ? Plus : d.kind === "removed" ? Minus : Pencil;
                        // Pattern + color so colorblind users can still distinguish kinds
                        const tone =
                          d.kind === "added"
                            ? { row: "bg-emerald-50/60 dark:bg-emerald-950/20", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", to: "text-emerald-700 dark:text-emerald-300", stripe: "before:bg-emerald-500 before:[background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_5px)]", srKind: "যোগ" }
                            : d.kind === "removed"
                              ? { row: "bg-rose-50/60 dark:bg-rose-950/20", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", to: "text-rose-700 dark:text-rose-300", stripe: "before:bg-rose-500 before:[background-image:repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(0,0,0,0.2)_3px,rgba(0,0,0,0.2)_5px)]", srKind: "বাদ" }
                              : { row: "bg-amber-50/40 dark:bg-amber-950/10", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", to: "text-amber-700 dark:text-amber-300", stripe: "before:bg-amber-500 before:[background-image:repeating-linear-gradient(90deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_5px)]", srKind: "পরিবর্তন" };
                        const fromStr = fmtVal(d.from);
                        const toStr = fmtVal(d.to);
                        const isLong = isLongRow({
                          fromDisplay: fromStr,
                          toDisplay: toStr,
                          label: FIELD_LABELS[d.field] || "",
                        });
                        const isOpen = !!expandedDiff[d.field];
                        const panelId = `diff-panel-${d.field}`;
                        const toggle = () => isLong && setExpandedDiff((s) => ({ ...s, [d.field]: !s[d.field] }));
                        const isReverted = excludedFields.has(d.field as string);
                        return (
                          <div key={d.field} className={`relative text-[11.5px] ${tone.row} ${isReverted ? "opacity-60" : ""} pl-1.5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${tone.stripe}`}>
                            <span className="sr-only">{tone.srKind}: </span>
                            <button
                              type="button"
                              onClick={toggle}
                            data-diff-field={d.field}
                            onKeyDown={(e) => {
                              if (!isLong) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggle();
                              }
                            }}
                            className={`w-full px-3 py-2 flex items-center gap-2 text-left rounded-md focus:outline-none ${isLong ? "hover:bg-muted/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:ring-offset-1 focus-visible:bg-primary/[0.04]" : "cursor-default"}`}
                              title={isLong ? `${FIELD_LABELS[d.field]}: ${fromStr} → ${toStr}` : undefined}
                              aria-expanded={isLong ? isOpen : undefined}
                              aria-controls={isLong ? panelId : undefined}
                              aria-label={isLong ? `${FIELD_LABELS[d.field]} — ${isOpen ? "বিস্তারিত বন্ধ করুন" : "বিস্তারিত দেখুন"}` : undefined}
                              tabIndex={isLong ? 0 : -1}
                            >
                              <span className={`shrink-0 rounded-md ${tone.badge} w-5 h-5 inline-flex items-center justify-center`} aria-hidden="true">
                                <KindIcon className="h-3 w-3" strokeWidth={3} />
                              </span>
                              <span className={`font-medium flex-1 min-w-0 truncate ${isReverted ? "line-through" : ""}`} title={FIELD_LABELS[d.field]}>{FIELD_LABELS[d.field]}</span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through tabular-nums max-w-[110px] truncate" title={fromStr}>{fromStr}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={`rounded bg-card border border-border px-1.5 py-0.5 font-semibold tabular-nums max-w-[110px] truncate ${tone.to}`} title={toStr}>{toStr}</span>
                              {isLong && (
                                <span aria-hidden="true" className="text-muted-foreground text-[10px] shrink-0">{isOpen ? "▲" : "▼"}</span>
                              )}
                            </button>
                            {isLong && isOpen && (
                              <div id={panelId} role="region" aria-label={`${FIELD_LABELS[d.field]} বিস্তারিত`} className="px-3 pb-2 pt-0 space-y-1">
                                <div className="rounded-md bg-muted/40 p-2">
                                  <div className="text-[10px] font-bold text-muted-foreground mb-0.5">ফিল্ড</div>
                                  <div className="text-[11.5px] font-medium break-words">{FIELD_LABELS[d.field]}</div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  <div className="rounded-md bg-muted/40 p-2">
                                    <div className="text-[10px] font-bold text-muted-foreground mb-0.5">আগের মান</div>
                                    <div className="text-[11.5px] line-through break-all">{fromStr}</div>
                                  </div>
                                  <div className={`rounded-md bg-card border border-border p-2`}>
                                    <div className="text-[10px] font-bold text-muted-foreground mb-0.5">নতুন মান</div>
                                    <div className={`text-[11.5px] font-semibold break-all ${tone.to}`}>{toStr}</div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleRevertField(d.field as string); }}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[10.5px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ${isReverted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card border border-border hover:bg-muted"}`}
                                    title={isReverted ? "এই ফিল্ড আবার ইমপোর্টে যোগ করুন" : "এই ফিল্ডের পরিবর্তন বাদ দিন"}
                                    aria-pressed={isReverted}
                                  >
                                    <Undo2 className="h-3 w-3" aria-hidden="true" />
                                    {isReverted ? "রিভার্ট সাফ" : "এই ফিল্ড রিভার্ট"}
                                  </button>
                                </div>
                              </div>
                            )}
                            {!isLong && (
                              <div className="px-3 pb-1.5 -mt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleRevertField(d.field as string); }}
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 h-5 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ${isReverted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card border border-border hover:bg-muted text-muted-foreground"}`}
                                  title={isReverted ? "এই ফিল্ড আবার ইমপোর্টে যোগ করুন" : "এই ফিল্ডের পরিবর্তন বাদ দিন"}
                                  aria-pressed={isReverted}
                                >
                                  <Undo2 className="h-2.5 w-2.5" aria-hidden="true" />
                                  {isReverted ? "সাফ" : "রিভার্ট"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setImportPreview(null)}
                className="rounded-xl border border-border bg-card hover:bg-muted px-3 h-9 text-xs font-semibold">
                বাতিল
              </button>
              <button
                onClick={confirmImport}
                disabled={!importPreview.validation.ok}
                className="ml-auto inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground px-3 h-9 text-xs font-semibold disabled:opacity-50 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {importMode === "overwrite" ? "ওভাররাইট নিশ্চিত" : "মার্জ নিশ্চিত"}
              </button>
            </div>

            {!importPreview.validation.ok && (
              <p className="text-[11px] text-destructive text-center">⚠ ত্রুটিগুলো ঠিক না করা পর্যন্ত ইমপোর্ট করা যাবে না।</p>
            )}
          </div>
        </motion.div>
      )}

      {/* HISTORY PANEL */}
      {historyOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">ভার্সন হিস্ট্রি</h3>
            <span className="text-[11px] text-muted-foreground">সর্বশেষ {HISTORY_LIMIT}টি পর্যন্ত সংরক্ষিত</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => restoreInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg bg-muted hover:bg-muted/70 px-2.5 h-7 text-[11px] font-semibold">
                <Upload className="h-3 w-3" /> ফাইল থেকে রিস্টোর
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive px-2.5 h-7 text-[11px] font-semibold">
                  <Trash2 className="h-3 w-3" /> সব মুছুন
                </button>
              )}
            </div>
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground">
              এখনো কোনো ভার্সন সেভ হয়নি — সংরক্ষণ, ইমপোর্ট, বা এক্সপোর্ট করলে এখানে যুক্ত হবে।
            </div>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-auto">
              {history.map((h, idx) => {
                const diff = diffRules(rules, h.rules);
                return (
                  <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      h.action === "auto-backup" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                      h.action === "rollback" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" :
                      h.action.startsWith("import") ? "bg-primary/10 text-primary" :
                      h.action === "reset" ? "bg-destructive/10 text-destructive" :
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}>
                      {h.action === "auto-backup" ? <ShieldCheck className="h-4 w-4" /> :
                       h.action === "rollback" ? <RotateCcw className="h-4 w-4" /> :
                       h.action.startsWith("import") ? <Upload className="h-4 w-4" /> :
                       h.action === "reset" ? <RotateCcw className="h-4 w-4" /> :
                       <Save className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-semibold truncate">{h.label}</span>
                        {idx === 0 && <span className="text-[9.5px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5 font-bold">সর্বশেষ</span>}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {new Date(h.at).toLocaleString("bn-BD")} • {diff.length === 0 ? "বর্তমানের সমান" : `${diff.length} ফিল্ড পার্থক্য`}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreFromHistory(h)}
                      disabled={diff.length === 0}
                      className="inline-flex items-center gap-1 rounded-lg bg-card border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary px-2.5 h-7 text-[11px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
                      <RotateCcw className="h-3 w-3" /> রোলব্যাক
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RuleCard icon={<Package className="h-4 w-4" />} title="কম স্টক সতর্কতা"
          description="যখন কোনো প্রোডাক্টের স্টক এই সীমার নিচে আসবে"
          enabled={rules.enabled_low_stock} onToggle={(v) => update("enabled_low_stock", v)}
          threshold={rules.low_stock_threshold} unit="ইউনিট"
          onChange={(v) => update("low_stock_threshold", v)} min={1} max={50} />
        <RuleCard icon={<Calendar className="h-4 w-4" />} title="অপেক্ষমাণ বুকিং"
          description="অপেক্ষমাণ বুকিং সংখ্যা এই সীমা ছাড়ালে সতর্ক করুন"
          enabled={rules.enabled_pending_bookings} onToggle={(v) => update("enabled_pending_bookings", v)}
          threshold={rules.pending_bookings_threshold} unit="বুকিং"
          onChange={(v) => update("pending_bookings_threshold", v)} min={1} max={50} />
        <RuleCard icon={<AlertTriangle className="h-4 w-4" />} title="বিলম্বিত অভিযোগ (SLA)"
          description="SLA-এর কত মিনিট পর অভিযোগকে 'overdue' গণ্য করা হবে"
          enabled={rules.enabled_overdue_disputes} onToggle={(v) => update("enabled_overdue_disputes", v)}
          threshold={rules.overdue_dispute_minutes} unit="মিনিট"
          onChange={(v) => update("overdue_dispute_minutes", v)} min={5} max={240} />
        <RuleCard icon={<ShieldAlert className="h-4 w-4" />} title="অনুমোদন কিউ বিল্ড-আপ"
          description="অপেক্ষমাণ অনুমোদন এই সংখ্যা ছাড়ালে সতর্ক করুন"
          enabled={rules.enabled_pending_approvals} onToggle={(v) => update("enabled_pending_approvals", v)}
          threshold={rules.pending_approval_threshold} unit="আইটেম"
          onChange={(v) => update("pending_approval_threshold", v)} min={1} max={50} />
        <RuleCard icon={<MessageSquare className="h-4 w-4" />} title="খোলা সেবা রিকোয়েস্ট"
          description="খোলা রিকোয়েস্ট এই সংখ্যা ছাড়ালে সতর্ক করুন"
          enabled={rules.enabled_open_requests} onToggle={(v) => update("enabled_open_requests", v)}
          threshold={rules.open_request_threshold} unit="রিকোয়েস্ট"
          onChange={(v) => update("open_request_threshold", v)} min={1} max={50} />
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">ডেলিভারি প্রেফারেন্স</h3>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">ডেস্কটপ নোটিফিকেশন</p>
              <p className="text-[11px] text-muted-foreground">ব্রাউজার থেকে রিয়েলটাইম পপ-আপ</p>
            </div>
            {rules.desktop_notifications ? (
              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked onChange={() => update("desktop_notifications", false)} className="sr-only peer" />
                <div className="relative w-9 h-5 bg-primary rounded-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:translate-x-4" />
              </label>
            ) : (
              <button onClick={requestDesktop}
                className="text-[11px] font-semibold rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground px-2.5 py-1 transition shrink-0">
                চালু করুন
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 py-1.5 border-t border-border/50">
            <div className="min-w-0">
              <p className="text-sm font-medium">শব্দ সতর্কতা</p>
              <p className="text-[11px] text-muted-foreground">নতুন আইটেম এলে বিপ শব্দ</p>
            </div>
            <label className="inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" checked={rules.sound_alerts} onChange={(e) => update("sound_alerts", e.target.checked)} className="sr-only peer" />
              <div className="relative w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition peer-checked:after:translate-x-4" />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 py-1.5 border-t border-border/50">
            <div className="min-w-0">
              <p className="text-sm font-medium">ডাইজেস্ট ইমেইল</p>
              <p className="text-[11px] text-muted-foreground">কত সময় পর পর সারসংক্ষেপ পাবেন</p>
            </div>
            <select
              value={rules.digest_frequency}
              onChange={(e) => update("digest_frequency", e.target.value as Rules["digest_frequency"])}
              className="text-xs font-semibold rounded-lg border border-input bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring">
              <option value="off">বন্ধ</option>
              <option value="hourly">প্রতি ঘণ্টায়</option>
              <option value="daily">দৈনিক</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold">অন্য অ্যাডমিনের সাথে শেয়ার</p>
          <p className="text-[11px] text-muted-foreground">এক্সপোর্ট করে JSON পাঠান, অথবা পেস্ট করে অন্যজনের সেটিংস ব্যবহার করুন (প্রিভিউ যাচাই করে নিশ্চিত হবে)</p>
        </div>
        <button onClick={importFromClipboard}
          className="inline-flex items-center gap-1 rounded-xl bg-card hover:bg-primary hover:text-primary-foreground text-foreground px-3 h-8 text-xs font-semibold border border-border transition">
          <Upload className="h-3.5 w-3.5" /> ক্লিপবোর্ড থেকে পেস্ট
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        💡 এই নিয়মগুলো শুধু আপনার জন্য — অন্য অ্যাডমিনদের সেটিংস আলাদা থাকবে
      </p>
    </div>
  );
};

export default AdminNotificationRules;