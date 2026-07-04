import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, ShieldCheck, Check, X, Crown, Loader2, CircleDashed, RefreshCw, Copy, ClipboardCheck, FileText, Download, FileDown, Search, Info, History, Trash2, Filter, Settings2, RotateCcw, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import SwipeDownSheet from "@/components/SwipeDownSheet";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "কমপক্ষে ১২ অক্ষর হতে হবে")
  .max(128, "সর্বোচ্চ ১২৮ অক্ষর")
  .regex(/[A-Z]/, "একটি বড় হাতের অক্ষর (A-Z) দরকার")
  .regex(/[a-z]/, "একটি ছোট হাতের অক্ষর (a-z) দরকার")
  .regex(/[0-9]/, "একটি সংখ্যা (0-9) দরকার")
  .regex(/[^A-Za-z0-9]/, "একটি বিশেষ চিহ্ন (!@#$ ইত্যাদি) দরকার");

const checks = [
  { label: "১২+ অক্ষর", test: (p: string) => p.length >= 12 },
  { label: "বড় হাতের অক্ষর (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "ছোট হাতের অক্ষর (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "সংখ্যা (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "বিশেষ চিহ্ন (!@#$%)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { label: "সাধারণ পাসওয়ার্ড নয়", test: (p: string) => !/^(password|123456|qwerty|admin|letmein|welcome)/i.test(p) },
];

// Lightweight windowed list — renders only the rows visible in the scroll
// viewport (plus a small overscan) so very large run histories scroll smoothly
// without pulling in a virtualization dependency. Fixed row height keeps the
// math simple and predictable.
type VirtualMatchRow = {
  sig: string;
  matched: boolean;
  scope: "base" | "user-scoped";
  head: string;
};
const VirtualKeyList: React.FC<{
  rows: VirtualMatchRow[];
  rowHeight?: number;
  maxHeight?: number;
  overscan?: number;
  startIndex?: number;
}> = ({ rows, rowHeight = 28, maxHeight = 480, overscan = 8, startIndex = 0 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(maxHeight);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll when the source list reference changes (filter/page swap).
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [rows]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportH(el.clientHeight || maxHeight);
  }, [maxHeight]);

  const total = rows.length;
  const totalHeight = total * rowHeight;
  const firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportH / rowHeight) + overscan * 2;
  const lastVisible = Math.min(total, firstVisible + visibleCount);
  const offsetY = firstVisible * rowHeight;
  const slice = rows.slice(firstVisible, lastVisible);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      className="overflow-y-auto rounded-md border border-border/60 bg-background/50"
      style={{ maxHeight }}
      role="list"
      aria-label="Run key matches"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <ol
          className="absolute left-0 right-0 space-y-0"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {slice.map((m, i) => {
            const absIndex = firstVisible + i + startIndex;
            return (
              <li
                key={`${m.sig}-${absIndex}`}
                style={{ height: rowHeight }}
                className={`flex items-center justify-between gap-2 border-b border-border/40 px-2 font-mono text-[10px] ${
                  m.matched
                    ? "bg-emerald-500/5 text-emerald-700"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className="text-muted-foreground tabular-nums shrink-0 w-10">
                  #{absIndex + 1}
                </span>
                <span
                  className={`flex-1 truncate ${m.matched ? "" : "line-through"}`}
                  title={m.sig}
                >
                  {m.sig}
                </span>
                <span className="shrink-0 text-[9px] uppercase font-semibold opacity-70">
                  {m.scope}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

const SuperAdminProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  type StepKey = "verify" | "update" | "validate" | "refresh" | "fallback" | "confirm";
  type StepState = "idle" | "loading" | "success" | "failed" | "skipped";
  const initialSteps: Record<StepKey, StepState> = {
    verify: "idle",
    update: "idle",
    validate: "idle",
    refresh: "idle",
    fallback: "idle",
    confirm: "idle",
  };
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(initialSteps);
  const [stepError, setStepError] = useState<string | null>(null);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  // Per-section optimistic refresh state — shows lightweight skeletons
  // for each cache section instead of a single full-page spinner.
  type SectionKey = "profile" | "user_roles" | "permissions" | "dashboard" | "currentUser";
  type SectionState = "idle" | "refreshing" | "done" | "failed";
  const sectionMeta: Record<SectionKey, string> = {
    profile: "প্রোফাইল",
    user_roles: "ইউজার রোল",
    permissions: "পারমিশন",
    dashboard: "ড্যাশবোর্ড",
    currentUser: "কারেন্ট ইউজার",
  };
  const initialSections: Record<SectionKey, SectionState> = {
    profile: "idle",
    user_roles: "idle",
    permissions: "idle",
    dashboard: "idle",
    currentUser: "idle",
  };
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(initialSections);

  // Dry-run match results: which exact keys were actually present in the
  // React Query cache (matched) vs absent (unmatched). Cleared on every run.
  type KeyMatch = { key: readonly unknown[]; sig: string; matched: boolean };
  // `scope` distinguishes base/global keys from user-scoped keys, and
  // `head` is the first segment (query "context"/group) — used in exports.
  type KeyMatchEx = KeyMatch & {
    scope: "base" | "user-scoped";
    head: string;
  };
  const [keyMatches, setKeyMatches] = useState<KeyMatch[]>([]);
  // Detailed key entries (with scope + head) populated alongside `keyMatches`.
  const [keyMatchesEx, setKeyMatchesEx] = useState<KeyMatchEx[]>([]);
  // Context of the last dry-run / invalidation pass — exported with reports.
  type RunContext = {
    runAt: Date;
    dryRun: boolean;
    triggeredBy: string;
    totalKeys: number;
    matchedCount: number;
    unmatchedCount: number;
  };
  const [lastRunContext, setLastRunContext] = useState<RunContext | null>(null);
  // ---------------------------------------------------------------------
  // Run history: persist the last N invalidation/dry-run runs in
  // localStorage so historical CSV/PDF exports work even after reloads.
  // ---------------------------------------------------------------------
  type SerializableMatch = {
    sig: string;
    matched: boolean;
    scope: "base" | "user-scoped";
    head: string;
  };
  type RunRecord = {
    id: string;
    runAt: string; // ISO string for safe serialization
    dryRun: boolean;
    triggeredBy: string;
    totalKeys: number;
    matchedCount: number;
    unmatchedCount: number;
    matches: SerializableMatch[];
  };
  const RUN_HISTORY_KEY = "yess_super_admin_run_history";
  const RUN_HISTORY_LIMIT_KEY = "yess_super_admin_run_history_limit";
  const HISTORY_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
  const [historyLimit, setHistoryLimit] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(RUN_HISTORY_LIMIT_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 20;
    } catch {
      return 20;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(RUN_HISTORY_LIMIT_KEY, String(historyLimit));
    } catch { /* ignore */ }
  }, [historyLimit]);
  const [runHistory, setRunHistory] = useState<RunRecord[]>(() => {
    try {
      const raw = localStorage.getItem(RUN_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RunRecord[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runHistory));
    } catch { /* quota / serialization — ignore */ }
  }, [runHistory]);
  // Trim history when the user lowers the limit.
  useEffect(() => {
    setRunHistory((prev) => (prev.length > historyLimit ? prev.slice(0, historyLimit) : prev));
  }, [historyLimit]);
  const pushRunRecord = (rec: RunRecord) =>
    setRunHistory((prev) => [rec, ...prev].slice(0, historyLimit));
  const deleteRunRecord = (id: string) =>
    setRunHistory((prev) => prev.filter((r) => r.id !== id));

  // Aggregate exporter — flattens many RunRecords into one CSV/PDF.
  // Used by the "live-only" preset and the timeline "Export all" button.
  const exportRunHistory = (
    format: "csv" | "pdf",
    records: RunRecord[],
    label: string,
  ) => {
    if (records.length === 0) {
      toast.error("এক্সপোর্ট করার মতো কোনো রান নেই");
      return;
    }
    const ts = new Date();
    const stamp = ts.toISOString().replace(/[:.]/g, "-");
    const fileBase = `runs-${label}-${stamp}`;
    const totals = records.reduce(
      (acc, r) => {
        acc.total += r.totalKeys;
        acc.matched += r.matchedCount;
        acc.unmatched += r.unmatchedCount;
        return acc;
      },
      { total: 0, matched: 0, unmatched: 0 },
    );

    if (format === "csv") {
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const meta = [
        ["# Report", "Multi-Run Query Key Export"],
        ["# Preset / Scope", label],
        ["# Runs Included", String(records.length)],
        ["# Total Keys (sum)", String(totals.total)],
        ["# Matched (sum)", String(totals.matched)],
        ["# Unmatched (sum)", String(totals.unmatched)],
        ["# Exported At", ts.toISOString()],
      ]
        .map((r) => r.map(escape).join(","))
        .join("\n");
      const header = [
        "Run #", "Run ID", "Run At (ISO)", "Action", "Triggered By",
        "Total", "Matched", "Unmatched",
        "Query Key", "Context (head)", "Scope", "Status", "Visible Order",
      ].map(escape).join(",");
      const body = records.flatMap((r, ri) =>
        r.matches.map((m, mi) =>
          [
            String(ri + 1),
            r.id,
            r.runAt,
            r.dryRun ? "Dry-Run" : "Live Invalidation",
            r.triggeredBy,
            String(r.totalKeys),
            String(r.matchedCount),
            String(r.unmatchedCount),
            m.sig,
            m.head,
            m.scope,
            m.matched ? "matched" : "unmatched",
            String(mi + 1),
          ].map(escape).join(","),
        ),
      ).join("\n");
      const blob = new Blob(
        ["\uFEFF" + meta + "\n\n" + header + "\n" + body],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`CSV এক্সপোর্ট হয়েছে (${records.length} রান)`);
      return;
    }

    // PDF — printable HTML window with one section per run.
    const escHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const sections = records.map((r, ri) => `
      <h2 style="font-size:13px;margin:14px 0 4px">রান #${ri + 1} —
        <span class="badge ${r.dryRun ? "dry" : "live"}">${r.dryRun ? "Dry-Run" : "Live"}</span>
      </h2>
      <div class="meta">
        ${escHtml(new Date(r.runAt).toLocaleString("bn-BD"))} ·
        ট্রিগার: ${escHtml(r.triggeredBy)} ·
        মোট ${r.totalKeys} (ম্যাচড ${r.matchedCount} / অম্যাচড ${r.unmatchedCount})
      </div>
      <table><thead><tr>
        <th>#</th><th>Query Key</th><th>Context</th><th>Scope</th><th>স্ট্যাটাস</th><th>Visible Order</th>
      </tr></thead><tbody>
      ${r.matches.map((m, i) =>
        `<tr><td>${i + 1}</td><td class="key">${escHtml(m.sig)}</td><td>${escHtml(m.head)}</td>
         <td><span class="${m.scope === "base" ? "scope-base" : "scope-user"}">${m.scope}</span></td>
         <td class="${m.matched ? "matched" : "unmatched"}">${m.matched ? "matched" : "unmatched"}</td>
         <td><span class="vo">#${i + 1}</span></td></tr>`,
      ).join("")}
      </tbody></table>`).join("");
    const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"/>
<title>Run History — ${label}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'SolaimanLipi','Noto Sans Bengali',Arial,sans-serif;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 4px}
  .meta{font-size:11px;color:#555;margin:2px 0 6px}
  .badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600}
  .badge.dry{background:#fef3c7;color:#92400e}
  .badge.live{background:#dcfce7;color:#166534}
  .scope-base{background:#eef2ff;color:#3730a3;padding:1px 6px;border-radius:4px;font-size:10px}
  .scope-user{background:#fce7f3;color:#9d174d;padding:1px 6px;border-radius:4px;font-size:10px}
  .vo{display:inline-block;background:#f1f5f9;color:#334155;padding:1px 6px;border-radius:4px;font-size:10px;font-family:'SF Mono',Menlo,Consolas,monospace}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f4f4f5}
  td.key{font-family:'SF Mono',Menlo,Consolas,monospace;word-break:break-all}
  .matched{color:#047857;font-weight:600}
  .unmatched{color:#6b7280;text-decoration:line-through}
  @media print {.noprint{display:none}}
</style></head><body>
<h1>Invalidation Timeline — ${escHtml(label)}</h1>
<div class="meta">${records.length} রান · মোট ${totals.total} key (ম্যাচড ${totals.matched} / অম্যাচড ${totals.unmatched}) · তৈরি: ${ts.toLocaleString("bn-BD")}</div>
${sections}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
</body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) { toast.error("পপআপ ব্লকড — অনুমতি দিন"); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    toast.success(`PDF প্রিন্ট খোলা হয়েছে (${records.length} রান)`);
  };
  // Filter for the dry-run highlight panel: show all keys, only matched, or only unmatched.
  const [matchFilter, setMatchFilter] = useState<"all" | "matched" | "unmatched">("all");
  // Free-text search across query-key signatures (case-insensitive substring).
  const [keySearch, setKeySearch] = useState("");
  // Refs to each rendered key chip — used to auto-scroll/focus the first
  // visible chip whenever the filter or search changes.
  const keyRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  // Controlled open-state for unmatched-key popovers, keyed by signature.
  // Used so keyboard (Enter) can open a popover and arrow keys can move
  // focus without trapping it inside an open popover.
  const [openPopoverSig, setOpenPopoverSig] = useState<string | null>(null);
  // Reasoning depth used by `explainUnmatched`:
  //  - "exact": only check exact-match cache hits
  //  - "near":  also surface prefix/loose matches (default)
  const [reasonMode, setReasonMode] = useState<"exact" | "near">("near");
  // Currently focused/selected key signature in the highlight grid.
  // Updated by arrow-key navigation and mouse click so the visible
  // ring follows the user's intent and matches the popover target.
  const [focusedSig, setFocusedSig] = useState<string | null>(null);
  // Tab inside the dry-run/highlight card: "highlight" shows the per-key
  // match grid; "timeline" shows the historical run list with re-export.
  const [panelTab, setPanelTab] = useState<"highlight" | "timeline">("highlight");

  // ---------------------------------------------------------------------
  // Timeline tab — search & filter controls so operators can quickly find
  // a specific run by query key, triggered-by, dry-run/live, or by whether
  // the run produced any matched / unmatched keys.
  // ---------------------------------------------------------------------
  const [timelineQuery, setTimelineQuery] = useState("");           // query-key substring
  const [timelineTriggered, setTimelineTriggered] = useState("");   // triggered-by substring
  const [timelineTriggeredSelect, setTimelineTriggeredSelect] = useState<string>(""); // exact triggered-by from dropdown
  const [timelineMode, setTimelineMode] = useState<"all" | "dry" | "live">("all");
  const [timelineStatus, setTimelineStatus] = useState<"all" | "has-matched" | "has-unmatched">("all");
  // Combobox UI state for the searchable triggered-by dropdown.
  const [triggeredByOpen, setTriggeredByOpen] = useState(false);
  const [triggeredBySearch, setTriggeredBySearch] = useState("");
  // Toggle: show/hide the per-row matched query-key chips. Persisted so the
  // operator's preference survives reloads.
  const SHOW_MATCHED_CHIPS_KEY = "yess_super_admin_show_matched_chips";
  const DEFAULT_CHIPS_KEY = "yess_super_admin_default_show_matched_chips";
  const [showMatchedChips, setShowMatchedChips] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SHOW_MATCHED_CHIPS_KEY);
      return raw === null ? true : raw === "1";
    } catch {
      return true;
    }
  });
  // "Default chips visibility" — the state that the reset button restores.
  const [defaultShowMatchedChips, setDefaultShowMatchedChips] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DEFAULT_CHIPS_KEY);
      return raw === null ? true : raw === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_CHIPS_KEY, defaultShowMatchedChips ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [defaultShowMatchedChips]);
  useEffect(() => {
    try {
      localStorage.setItem(SHOW_MATCHED_CHIPS_KEY, showMatchedChips ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [showMatchedChips]);

  // Keyboard navigation state for the searchable triggered-by dropdown.
  const [triggeredByActiveIdx, setTriggeredByActiveIdx] = useState(0);

  // Per-row "View details" drawer state — opens a SwipeDownSheet that
  // paginates through every match in the selected RunRecord and exposes
  // the same per-run export presets as the row-level dropdowns.
  const [detailsRunId, setDetailsRunId] = useState<string | null>(null);
  const [detailsPage, setDetailsPage] = useState(0);
  const [detailsFilter, setDetailsFilter] = useState<"all" | "matched" | "unmatched">("all");
  const detailsRecord = useMemo(
    () => runHistory.find((r) => r.id === detailsRunId) ?? null,
    [runHistory, detailsRunId],
  );
  const DETAILS_PAGE_SIZE = 500;
  const detailsRows = useMemo(() => {
    if (!detailsRecord) return [];
    return detailsRecord.matches.filter((m) =>
      detailsFilter === "all" ? true : detailsFilter === "matched" ? m.matched : !m.matched,
    );
  }, [detailsRecord, detailsFilter]);
  useEffect(() => { setDetailsPage(0); }, [detailsRunId, detailsFilter]);

  // Dry-run mode: validate and preview the invalidation key list WITHOUT
  // actually calling queryClient.invalidateQueries or refetching anything.
  // Persisted in localStorage so the preference survives page reloads.
  const DRY_RUN_KEY = "yess_super_admin_profile_dry_run";
  const [dryRun, setDryRun] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DRY_RUN_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DRY_RUN_KEY, dryRun ? "1" : "0");
    } catch { /* ignore */ }
  }, [dryRun]);

  type LogEntry = {
    step: StepKey;
    label: string;
    status: Exclude<StepState, "idle">;
    at: Date;
    detail?: string;
  };
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const stepLabels: Record<StepKey, string> = {
    verify: "বর্তমান পাসওয়ার্ড যাচাই",
    update: "পাসওয়ার্ড আপডেট",
    validate: "ক্যাশ key যাচাই (invalidation preview)",
    refresh: "সেশন রিফ্রেশ (টোকেন রোটেশন)",
    fallback: "ফলব্যাক সাইন-ইন",
    confirm: "সাইন-ইন স্ট্যাটাস নিশ্চিতকরণ",
  };

  const appendLog = (
    step: StepKey,
    status: Exclude<StepState, "idle">,
    detail?: string,
  ) =>
    setLogs((prev) => [
      ...prev,
      { step, label: stepLabels[step], status, at: new Date(), detail },
    ]);

  const setStep = (k: StepKey, s: StepState) =>
    setSteps((prev) => ({ ...prev, [k]: s }));

  const statusText = (s: Exclude<StepState, "idle">) =>
    s === "success" ? "সফল" : s === "failed" ? "ব্যর্থ" : s === "loading" ? "চলছে" : "প্রয়োজন নেই";

  const buildLogText = () => {
    const header = `সুপার অ্যাডমিন পাসওয়ার্ড পরিবর্তন লগ\nইউজার: ${user?.email ?? "—"}\nতৈরি: ${new Date().toLocaleString("bn-BD")}\n${"-".repeat(40)}`;
    const body = logs
      .map(
        (l, i) =>
          `${i + 1}. [${l.at.toLocaleTimeString("bn-BD")}] ${l.label} — ${statusText(l.status)}${l.detail ? ` (${l.detail})` : ""}`,
      )
      .join("\n");
    return `${header}\n${body}`;
  };

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(buildLogText());
      setCopied(true);
      toast.success("লগ কপি হয়েছে");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  // ---------------------------------------------------------------------
  // Export presets — one-click filters that bypass the live UI state so
  // the user can generate the right report without juggling filter toggles.
  //   matched-only     → only keys that hit the cache
  //   unmatched-only   → only keys that missed the cache (no-ops)
  //   live-only        → matched+unmatched of LIVE invalidation runs only
  //   all              → no filtering (mirrors live UI when no override)
  // ---------------------------------------------------------------------
  type PresetId = "all" | "matched" | "unmatched" | "live";
  type ExportOpts = {
    /** Apply a preset filter instead of the live `matchFilter`. */
    preset?: PresetId;
    /** Bypass the live key-search input. */
    ignoreSearch?: boolean;
    /** Export against a specific historical run instead of the latest. */
    record?: RunRecord;
  };

  // Export query-key matches as CSV (UTF-8 BOM for Bengali support) or PDF.
  // When called without options, mirrors the visible (filter+search) panel.
  const exportKeyMatches = (format: "csv" | "pdf", opts: ExportOpts = {}) => {
    const { preset, ignoreSearch, record } = opts;

    // Resolve the data source: a historical record takes priority, otherwise
    // use the latest in-memory run (with defensive fallback to keyMatches).
    // For live (non-record, non-preset) exports we want to preserve the exact
    // ordering the user sees on screen — i.e. `visibleMatches` order.
    const isLiveUiExport = !record && !preset;
    const fullSource: KeyMatchEx[] = record
      ? record.matches.map((m) => ({
          // Reconstruct a minimal KeyMatchEx — `key` is unused by the export.
          key: [],
          sig: m.sig,
          matched: m.matched,
          scope: m.scope,
          head: m.head,
        }))
      : keyMatchesEx.length > 0
        ? keyMatchesEx
        : keyMatches.map((m) => ({
            ...m,
            scope: "base" as const,
            head: String((m.key as unknown[])[0] ?? ""),
          }));
    // For live UI exports: project visibleMatches order onto the enriched
    // source so labels (Context/Scope) survive but row ordering matches UI.
    const source: KeyMatchEx[] = isLiveUiExport
      ? visibleMatches
          .map((vm) => fullSource.find((s) => s.sig === vm.sig))
          .filter((m): m is KeyMatchEx => Boolean(m))
      : fullSource;

    // Resolve the active filter — preset wins over live UI state.
    // "live" preset only makes sense for the multi-run Timeline (handled
    // by callers iterating `runHistory`), but we still support it here as
    // a passthrough no-op (treats it like "all" within a single run).
    const effectiveFilter: "all" | "matched" | "unmatched" =
      preset === "matched" ? "matched"
      : preset === "unmatched" ? "unmatched"
      : preset === "all" || preset === "live" ? "all"
      : matchFilter;

    const q = ignoreSearch ? "" : keySearch.trim().toLowerCase();
    // Skip re-filtering when source is already the live UI view (visibleMatches
    // is by definition filter+search applied) — this also preserves order.
    const filtered = isLiveUiExport
      ? source
      : source.filter((m) => {
          const filterPass =
            effectiveFilter === "all" ? true
            : effectiveFilter === "matched" ? m.matched
            : !m.matched;
          if (!filterPass) return false;
          if (!q) return true;
          return m.sig.toLowerCase().includes(q);
        });
    if (filtered.length === 0) {
      toast.error("এক্সপোর্ট করার মতো কোনো key নেই");
      return;
    }
    const ts = new Date();
    const stamp = ts.toISOString().replace(/[:.]/g, "-");
    const filterLabel = preset ?? effectiveFilter;
    const fileBase = `query-keys-${filterLabel}${record ? `-run-${record.id.slice(0, 8)}` : ""}-${stamp}`;

    // Common run context — what action ran, when, dry-run or live.
    // For historical exports we use the record's own context.
    const recRunAt = record ? new Date(record.runAt) : null;
    const ctxDryRun = record ? record.dryRun : lastRunContext?.dryRun ?? false;
    const ctxTriggeredBy = record ? record.triggeredBy : lastRunContext?.triggeredBy ?? user?.email ?? "—";
    const ctxTotal = record ? record.totalKeys : lastRunContext?.totalKeys ?? source.length;
    const ctxMatched = record ? record.matchedCount : lastRunContext?.matchedCount ?? source.filter((m) => m.matched).length;
    const ctxUnmatched = record ? record.unmatchedCount : lastRunContext?.unmatchedCount ?? source.filter((m) => !m.matched).length;
    const actionLabel = ctxDryRun ? "Dry-Run (preview only)" : "Live Invalidation";
    // Reason mode + active search text — captured per-row so re-imports
    // know the exact UI context that produced this export.
    const reasonModeLabel = reasonMode === "exact" ? "Exact-only" : "Near-match";
    const searchTextLabel = ignoreSearch ? "" : keySearch.trim();
    const orderingLabel = isLiveUiExport
      ? "Visible UI order (filter+search applied)"
      : record
        ? "Historical record order"
        : `Preset: ${preset}`;
    const runAtIso = recRunAt?.toISOString() ?? lastRunContext?.runAt.toISOString() ?? "—";
    const runAtLocal = recRunAt?.toLocaleString("bn-BD") ?? lastRunContext?.runAt.toLocaleString("bn-BD") ?? "—";
    const lastRefreshIso = lastRefreshAt?.toISOString() ?? "—";
    const lastRefreshLocal = lastRefreshAt?.toLocaleString("bn-BD") ?? "—";

    if (format === "csv") {
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      // Metadata block — invalidation/refresh context, prepended as commented
      // header rows so the file remains a valid CSV when opened in Excel.
      const metaRows = [
        ["# Report", "Query Key Match Export"],
        ["# Preset", preset ?? "(live UI)"],
        ["# Ordering", orderingLabel],
        ["# Run Source", record ? `History (${record.id})` : "Latest"],
        ["# Action", actionLabel],
        ["# Run At (ISO)", runAtIso],
        ["# Run At (Local)", runAtLocal],
        ["# Last Refresh At (ISO)", lastRefreshIso],
        ["# Last Refresh At (Local)", lastRefreshLocal],
        ["# Triggered By", ctxTriggeredBy],
        ["# Filter", filterLabel],
        ["# Search", ignoreSearch ? "(ignored)" : (keySearch || "—")],
        ["# Reason Mode", reasonModeLabel],
        ["# Total Keys (in run)", String(ctxTotal)],
        ["# Matched (in run)", String(ctxMatched)],
        ["# Unmatched (in run)", String(ctxUnmatched)],
        ["# Exported Rows", String(filtered.length)],
        ["# Exported At", ts.toISOString()],
      ]
        .map((r) => r.map(escape).join(","))
        .join("\n");
      const rows = [
        [
          "#",
          "Query Key",
          "Context (head)",
          "Scope",
          "Status",
          "Matched",
          "Action",
          "Run At (ISO)",
          "Last Refresh At (ISO)",
          "Dry Run",
          "Triggered By",
          "Reason Mode",
          "Search Text",
          "Visible Order",
          "Exported At",
        ]
          .map(escape)
          .join(","),
        ...filtered.map((m, i) =>
          [
            String(i + 1),
            m.sig,
            m.head,
            m.scope,
            m.matched ? "matched" : "unmatched",
            m.matched ? "true" : "false",
            actionLabel,
            runAtIso,
            lastRefreshIso,
            ctxDryRun ? "true" : "false",
            ctxTriggeredBy,
            reasonModeLabel,
            searchTextLabel,
            String(i + 1),
            ts.toISOString(),
          ]
            .map(escape)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob(
        ["\uFEFF" + metaRows + "\n\n" + rows],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`CSV এক্সপোর্ট হয়েছে (${filtered.length})`);
      return;
    }

    // PDF: open a printable HTML window — works without extra deps.
    const matchedCount = filtered.filter((m) => m.matched).length;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"/>
<title>Query Keys — ${filterLabel}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'SolaimanLipi','Noto Sans Bengali',Arial,sans-serif;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 4px}
  .meta{font-size:11px;color:#555;margin-bottom:10px}
  .ctx{font-size:11px;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:8px 0 14px}
  .ctx dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:0}
  .ctx dt{color:#6b7280}
  .ctx dd{margin:0;color:#111}
  .badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600}
  .badge.dry{background:#fef3c7;color:#92400e}
  .badge.live{background:#dcfce7;color:#166534}
  .scope-base{background:#eef2ff;color:#3730a3;padding:1px 6px;border-radius:4px;font-size:10px}
  .scope-user{background:#fce7f3;color:#9d174d;padding:1px 6px;border-radius:4px;font-size:10px}
  .vo{display:inline-block;background:#f1f5f9;color:#334155;padding:1px 6px;border-radius:4px;font-size:10px;font-family:'SF Mono',Menlo,Consolas,monospace}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f4f4f5}
  td.key{font-family:'SF Mono',Menlo,Consolas,monospace;word-break:break-all}
  .matched{color:#047857;font-weight:600}
  .unmatched{color:#6b7280;text-decoration:line-through}
  @media print {.noprint{display:none}}
</style></head><body>
<h1>Query Key ম্যাচ রিপোর্ট</h1>
<div class="meta">
  ফিল্টার: <b>${filterLabel}</b> · মোট: <b>${filtered.length}</b>
  · ম্যাচড: <b>${matchedCount}</b> · অম্যাচড: <b>${filtered.length - matchedCount}</b>
  · ইউজার: ${user?.email ?? "—"} · তৈরি: ${ts.toLocaleString("bn-BD")}
</div>
<div class="ctx"><dl>
  <dt>অ্যাকশন</dt><dd><span class="badge ${ctxDryRun ? "dry" : "live"}">${esc(actionLabel)}</span></dd>
  <dt>রান টাইম</dt><dd>${esc(runAtLocal)}</dd>
  <dt>শেষ রিফ্রেশ</dt><dd>${esc(lastRefreshLocal)}</dd>
  <dt>ট্রিগার</dt><dd>${esc(ctxTriggeredBy)}</dd>
  <dt>প্রিসেট</dt><dd>${esc(preset ?? "(live UI)")}</dd>
  <dt>সার্চ</dt><dd>${esc(ignoreSearch ? "(ignored)" : (keySearch || "—"))}</dd>
  <dt>Reason Mode</dt><dd>${esc(reasonModeLabel)}</dd>
  <dt>অর্ডারিং</dt><dd>${esc(orderingLabel)}</dd>
  <dt>রানে মোট key</dt><dd>${ctxTotal} (ম্যাচড ${ctxMatched} / অম্যাচড ${ctxUnmatched})</dd>
</dl></div>
<table><thead><tr>
  <th>#</th><th>Query Key</th><th>Context</th><th>Scope</th><th>স্ট্যাটাস</th><th>Reason</th><th>Search</th><th>Visible Order</th>
</tr></thead><tbody>
${filtered
  .map(
    (m, i) =>
      `<tr><td>${i + 1}</td><td class="key">${esc(m.sig)}</td><td>${esc(m.head)}</td><td><span class="${m.scope === "base" ? "scope-base" : "scope-user"}">${m.scope}</span></td><td class="${m.matched ? "matched" : "unmatched"}">${m.matched ? "matched" : "unmatched"}</td><td>${esc(reasonModeLabel)}</td><td>${esc(searchTextLabel || "—")}</td><td><span class="vo">#${i + 1}</span></td></tr>`,
  )
  .join("")}
</tbody></table>
<div class="noprint" style="margin-top:16px;font-size:11px;color:#555">
  প্রিন্ট ডায়ালগ থেকে "Save as PDF" নির্বাচন করুন।
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
</body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) {
      toast.error("পপআপ ব্লকড — অনুমতি দিন");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    toast.success(`PDF প্রিন্ট খোলা হয়েছে (${filtered.length})`);
  };

  /**
   * After session is re-confirmed, invalidate cached profile/role/dashboard
   * data so every screen using React Query re-fetches with the fresh JWT.
   */
  const refreshAppData = async (opts: { dryRun?: boolean } = {}) => {
    const isDry = opts.dryRun ?? dryRun;
    setRefreshState("loading");
    // In dry-run we keep sections idle (no skeleton churn) since nothing
    // is actually being invalidated or refetched.
    if (!isDry) {
      setSections({
        profile: "refreshing",
        user_roles: "refreshing",
        permissions: "refreshing",
        dashboard: "refreshing",
        currentUser: "refreshing",
      });
    } else {
      setSections(initialSections);
    }
    try {
      // 1) Invalidate ONLY the exact keys tied to identity/session-bound data
      //    so other cached queries (lists, settings, etc.) are not refetched.
      //    Using `exact: true` guarantees we hit the intended cache entries
      //    only — no accidental fuzzy/prefix matches.
      const baseKeys: Array<readonly unknown[]> = [
        ["profile"],
        ["user_roles"],
        ["permissions"],
        ["dashboard"],
        ["currentUser"],
      ];
      const userScopedKeys: Array<readonly unknown[]> = user?.id
        ? [
            ["profile", user.id],
            ["user_roles", user.id],
            ["permissions", user.id],
          ]
        : [];

      // De-duplicate by serialized key to avoid redundant invalidations.
      const seen = new Set<string>();
      const uniqueKeys = [...baseKeys, ...userScopedKeys].filter((key) => {
        const sig = JSON.stringify(key);
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });

      // Validation step: print exactly which keys are about to be invalidated
      // (including user-scoped) so the operator can confirm they match intent.
      const baseList = baseKeys.map((k) => JSON.stringify(k));
      const scopedList = userScopedKeys.map((k) => JSON.stringify(k));
      const previewLines = [
        isDry ? "🧪 DRY-RUN — কোনো invalidate/refetch করা হয়নি" : "",
        `মোট: ${uniqueKeys.length} key (exact: true)`,
        `বেস: ${baseList.join(", ") || "—"}`,
        `ইউজার-স্কোপড: ${scopedList.join(", ") || "—"}`,
        `চূড়ান্ত: ${uniqueKeys.map((k) => JSON.stringify(k)).join(" | ")}`,
      ].filter(Boolean);
      // eslint-disable-next-line no-console
      console.info(`[SuperAdminProfile] invalidation preview${isDry ? " (DRY-RUN)" : ""}`, {
        count: uniqueKeys.length,
        keys: uniqueKeys,
        dryRun: isDry,
      });
      appendLog("validate", "success", previewLines.join("\n"));

      // Compute actual cache match status for each unique key (exact match).
      // This shows which keys really exist in the React Query cache right now
      // — useful in dry-run to spot keys that would be a no-op invalidation.
      const cache = queryClient.getQueryCache();
      const matches: KeyMatch[] = uniqueKeys.map((key) => {
        const found = cache.findAll({ queryKey: key as unknown[], exact: true });
        return { key, sig: JSON.stringify(key), matched: found.length > 0 };
      });
      setKeyMatches(matches);
      // Build the extended view (scope + head) used by exports.
      const baseSet = new Set(baseList);
      const matchesEx: KeyMatchEx[] = matches.map((m) => ({
        ...m,
        scope: baseSet.has(m.sig) ? "base" : "user-scoped",
        head: String((m.key as unknown[])[0] ?? ""),
      }));
      setKeyMatchesEx(matchesEx);
      const matchedNow = matches.filter((m) => m.matched).length;
      setLastRunContext({
        runAt: new Date(),
        dryRun: isDry,
        triggeredBy: user?.email ?? "—",
        totalKeys: matches.length,
        matchedCount: matchedNow,
        unmatchedCount: matches.length - matchedNow,
      });
      // Persist this run into the rolling history so it can be re-exported
      // later from the Invalidation Timeline tab.
      const runRec: RunRecord = {
        id:
          (typeof crypto !== "undefined" && "randomUUID" in crypto)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        runAt: new Date().toISOString(),
        dryRun: isDry,
        triggeredBy: user?.email ?? "—",
        totalKeys: matches.length,
        matchedCount: matchedNow,
        unmatchedCount: matches.length - matchedNow,
        matches: matchesEx.map((m) => ({
          sig: m.sig,
          matched: m.matched,
          scope: m.scope,
          head: m.head,
        })),
      };
      pushRunRecord(runRec);
      const matchedCount = matches.filter((m) => m.matched).length;
      const unmatchedSigs = matches.filter((m) => !m.matched).map((m) => m.sig);
      appendLog(
        "validate",
        unmatchedSigs.length === 0 ? "success" : "failed",
        [
          `ক্যাশ ম্যাচ: ${matchedCount}/${matches.length}`,
          unmatchedSigs.length > 0 ? `অম্যাচড: ${unmatchedSigs.join(", ")}` : "সব key ম্যাচ করেছে",
        ].join("\n"),
      );

      // Dry-run short-circuits BEFORE any cache mutation or network calls.
      if (isDry) {
        setLastRefreshAt(new Date());
        setRefreshState("success");
        return;
      }

      // Invalidate per section so we can flip its skeleton to "done"
      // as soon as that specific cache slice is refreshed.
      const sectionKeysMap: Record<SectionKey, Array<readonly unknown[]>> = {
        profile: [["profile"], ...(user?.id ? [["profile", user.id]] : [])],
        user_roles: [["user_roles"], ...(user?.id ? [["user_roles", user.id]] : [])],
        permissions: [["permissions"], ...(user?.id ? [["permissions", user.id]] : [])],
        dashboard: [["dashboard"]],
        currentUser: [["currentUser"]],
      };
      await Promise.all(
        (Object.keys(sectionKeysMap) as SectionKey[]).map(async (sec) => {
          try {
            await Promise.all(
              sectionKeysMap[sec].map((key) =>
                queryClient.invalidateQueries({ queryKey: key, exact: true }),
              ),
            );
            setSections((prev) => ({ ...prev, [sec]: "done" }));
          } catch {
            setSections((prev) => ({ ...prev, [sec]: "failed" }));
          }
        }),
      );

      // 2) Eagerly re-fetch the most-visible identity signals so UI updates immediately
      if (user?.id) {
        await Promise.allSettled([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
        ]);
      }

      setLastRefreshAt(new Date());
      setRefreshState("success");
    } catch {
      setRefreshState("failed");
      setSections((prev) => {
        const next = { ...prev };
        (Object.keys(next) as SectionKey[]).forEach((k) => {
          if (next[k] === "refreshing") next[k] = "failed";
        });
        return next;
      });
    }
  };

  const passed = useMemo(() => checks.map((c) => c.test(newPassword)), [newPassword]);

  // Filter + search applied to the key match list.
  const visibleMatches = useMemo(() => {
    const q = keySearch.trim().toLowerCase();
    return keyMatches.filter((m) => {
      const filterPass =
        matchFilter === "all" ? true : matchFilter === "matched" ? m.matched : !m.matched;
      if (!filterPass) return false;
      if (!q) return true;
      return m.sig.toLowerCase().includes(q);
    });
  }, [keyMatches, matchFilter, keySearch]);

  // Filtered Timeline view — applies the timeline search/filter controls so
  // "Export history" only emits the visible runs, and so the row list, count
  // badges, and aggregate exports stay consistent with what the user sees.
  const visibleRunHistory = useMemo(() => {
    const q = timelineQuery.trim().toLowerCase();
    const tq = timelineTriggered.trim().toLowerCase();
    return runHistory.filter((r) => {
      if (timelineMode === "dry" && !r.dryRun) return false;
      if (timelineMode === "live" && r.dryRun) return false;
      if (timelineStatus === "has-matched" && r.matchedCount === 0) return false;
      if (timelineStatus === "has-unmatched" && r.unmatchedCount === 0) return false;
      if (tq && !r.triggeredBy.toLowerCase().includes(tq)) return false;
      if (timelineTriggeredSelect && r.triggeredBy !== timelineTriggeredSelect) return false;
      if (q && !r.matches.some((m) => m.sig.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [runHistory, timelineQuery, timelineTriggered, timelineTriggeredSelect, timelineMode, timelineStatus]);

  // Distinct triggered-by values across run history, sorted by recency-of-use
  // (i.e. most-recent run first) so the dropdown surfaces active operators.
  const triggeredByOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; count: number }[] = [];
    const counts = new Map<string, number>();
    for (const r of runHistory) counts.set(r.triggeredBy, (counts.get(r.triggeredBy) ?? 0) + 1);
    for (const r of runHistory) {
      if (!seen.has(r.triggeredBy)) {
        seen.add(r.triggeredBy);
        out.push({ value: r.triggeredBy, count: counts.get(r.triggeredBy) ?? 0 });
      }
    }
    return out;
  }, [runHistory]);

  // Highlight search-term occurrences inside a text fragment for the Timeline
  // rows. Case-insensitive, returns a fragment so callers can drop it inline.
  const renderHighlighted = (text: string, term: string): React.ReactNode => {
    const t = term.trim();
    if (!t) return text;
    try {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(${escaped})`, "ig");
      const parts = text.split(re);
      return parts.map((p, i) =>
        re.test(p) && p.toLowerCase() === t.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-amber-300/60 text-foreground px-0.5 py-0"
          >
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      );
    } catch {
      return text;
    }
  };

  // Convenience: are any timeline filters active right now?
  const timelineFiltersActive =
    !!timelineQuery ||
    !!timelineTriggered ||
    !!timelineTriggeredSelect ||
    timelineMode !== "all" ||
    timelineStatus !== "all";
  const resetTimelineFilters = () => {
    setTimelineQuery("");
    setTimelineTriggered("");
    setTimelineTriggeredSelect("");
    setTimelineMode("all");
    setTimelineStatus("all");
    // Restore the matched-key chips toggle to the operator's saved default.
    setShowMatchedChips(defaultShowMatchedChips);
  };

  // Auto-scroll & focus the first visible key whenever filter/search changes
  // (only when the filter is restrictive — skip "all" with no search to avoid
  // jumping the page on initial render).
  useEffect(() => {
    if (visibleMatches.length === 0) return;
    if (matchFilter === "all" && !keySearch.trim()) return;
    const first = visibleMatches[0];
    const el = keyRefs.current.get(first.sig);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Defer focus so scroll animation isn't canceled by focus jump.
    const t = setTimeout(() => el.focus({ preventScroll: true }), 200);
    return () => clearTimeout(t);
  }, [matchFilter, keySearch, visibleMatches]);

  // Auto-close any open popover and reset focus when filter/search changes,
  // so a stale unmatched-key popover never lingers over a re-rendered grid.
  useEffect(() => {
    setOpenPopoverSig(null);
    setFocusedSig(null);
  }, [matchFilter, keySearch]);

  // Keep focusedSig valid: if the focused key is no longer visible after
  // a filter/search change, drop it.
  useEffect(() => {
    if (!focusedSig) return;
    if (!visibleMatches.some((m) => m.sig === focusedSig)) {
      setFocusedSig(null);
    }
  }, [visibleMatches, focusedSig]);

  /**
   * Build a human-readable explanation for why a given key was reported as
   * unmatched. Inspects the live cache for prefix/loose matches so the user
   * can see whether a similar key exists (typo/scope mismatch) or no related
   * cache entry exists at all.
   */
  const explainUnmatched = (km: KeyMatch, mode: "exact" | "near" = reasonMode) => {
    const cache = queryClient.getQueryCache();
    const exact = cache.findAll({ queryKey: km.key as unknown[], exact: true });
    if (exact.length > 0) {
      return {
        title: "এখন আবার ম্যাচ করছে",
        reason: "এই ড্রাই-রানের পর ক্যাশে এন্ট্রি যোগ হয়েছে — পরবর্তী রানে ম্যাচড দেখাবে।",
        related: [] as string[],
      };
    }
    // Exact-only mode skips prefix/loose lookup entirely.
    if (mode === "exact") {
      return {
        title: "এই key ক্যাশে নেই (exact-match)",
        reason:
          "শুধু exact-match যাচাই — এই signature-এর কোনো এন্ট্রি ক্যাশে নেই, তাই invalidate কল no-op হবে।",
        related: [] as string[],
      };
    }
    // Loose/prefix matches by first segment (e.g. ["profile", userId] vs ["profile"]).
    const head = (km.key as unknown[])[0];
    const related = cache
      .findAll({ queryKey: [head] as unknown[], exact: false })
      .map((q) => JSON.stringify(q.queryKey))
      .filter((s) => s !== km.sig)
      .slice(0, 6);
    if (related.length > 0) {
      return {
        title: "এই key ক্যাশে নেই",
        reason:
          "একই prefix-এর কাছাকাছি key ক্যাশে আছে, কিন্তু `exact: true` ম্যাচিং-এ scope (যেমন user id) আলাদা হওয়ায় no-op হবে।",
        related,
      };
    }
    return {
      title: "এই key ক্যাশে নেই",
      reason:
        "কোনো কম্পোনেন্ট এই query এখনও mount/fetch করেনি — invalidate কল করলে কিছুই refetch হবে না (no-op)।",
      related,
    };
  };
  const strengthScore = passed.filter(Boolean).length;
  const strengthLabel =
    strengthScore <= 2 ? "দুর্বল" : strengthScore <= 4 ? "মাঝারি" : strengthScore === 5 ? "শক্তিশালী" : "অত্যন্ত শক্তিশালী";
  const strengthColor =
    strengthScore <= 2 ? "bg-destructive" : strengthScore <= 4 ? "bg-amber-500" : "bg-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return toast.error("ইউজার পাওয়া যায়নি");

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (newPassword !== confirmPassword) return toast.error("পাসওয়ার্ড মিলছে না");
    if (newPassword === currentPassword) return toast.error("নতুন পাসওয়ার্ড আগের মতো হতে পারবে না");

    setLoading(true);
    setStepError(null);
    setSteps({ ...initialSteps });
    setLogs([]);
    try {
      // 1) Verify current password
      setStep("verify", "loading");
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInErr) {
        setStep("verify", "failed");
        appendLog("verify", "failed", "বর্তমান পাসওয়ার্ড সঠিক নয়");
        setStepError("বর্তমান পাসওয়ার্ড সঠিক নয়");
        toast.error("বর্তমান পাসওয়ার্ড সঠিক নয়");
        return;
      }
      setStep("verify", "success");
      appendLog("verify", "success");

      // 2) Update password
      setStep("update", "loading");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setStep("update", "failed");
        appendLog("update", "failed", error.message);
        setStepError(error.message || "পাসওয়ার্ড পরিবর্তন ব্যর্থ");
        toast.error(error.message || "পাসওয়ার্ড পরিবর্তন ব্যর্থ");
        return;
      }
      setStep("update", "success");
      appendLog("update", "success");

      // 3) Refresh session (rotate tokens)
      setStep("refresh", "loading");
      const { data: refreshed, error: refreshErr } =
        await supabase.auth.refreshSession();

      let activeSession = refreshed?.session ?? null;

      if (refreshErr || !activeSession) {
        setStep("refresh", "failed");
        appendLog("refresh", "failed", refreshErr?.message || "সেশন পাওয়া যায়নি");
        // 4) Fallback: explicit sign-in with new credentials
        setStep("fallback", "loading");
        const { data: reSignIn, error: reSignErr } =
          await supabase.auth.signInWithPassword({
            email: user.email,
            password: newPassword,
          });
        if (reSignErr || !reSignIn.session) {
          setStep("fallback", "failed");
          appendLog("fallback", "failed", reSignErr?.message || "সাইন-ইন ব্যর্থ");
          setStepError("সেশন রিফ্রেশ ব্যর্থ — অনুগ্রহ করে আবার লগইন করুন");
          toast.error("সেশন রিফ্রেশ ব্যর্থ — অনুগ্রহ করে আবার লগইন করুন");
          await supabase.auth.signOut();
          return;
        }
        setStep("fallback", "success");
        appendLog("fallback", "success", "নতুন পাসওয়ার্ডে সাইন-ইন সফল");
        activeSession = reSignIn.session;
      } else {
        setStep("refresh", "success");
        appendLog("refresh", "success", "টোকেন রোটেট হয়েছে");
        setStep("fallback", "skipped");
      }

      // 5) Confirm session is valid
      setStep("confirm", "loading");
      const { data: userCheck, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userCheck.user) {
        setStep("confirm", "failed");
        appendLog("confirm", "failed", userErr?.message || "ইউজার পাওয়া যায়নি");
        setStepError("সেশন যাচাই ব্যর্থ — আবার লগইন করুন");
        toast.error("সেশন যাচাই ব্যর্থ — আবার লগইন করুন");
        await supabase.auth.signOut();
        return;
      }
      setStep("confirm", "success");
      appendLog("confirm", "success", `ইউজার: ${userCheck.user.email ?? userCheck.user.id}`);

      toast.success("পাসওয়ার্ড পরিবর্তিত ও সেশন রিফ্রেশ হয়েছে ✅");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto-refresh profile/dashboard data so UI reflects the new session.
      await refreshAppData();
    } catch (err: any) {
      appendLog("confirm", "failed", err?.message || "অপ্রত্যাশিত ত্রুটি");
      setStepError(err?.message || "একটি ত্রুটি হয়েছে");
      toast.error(err?.message || "একটি ত্রুটি হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
          <Crown className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate">সুপার অ্যাডমিন প্রোফাইল</h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Password Change Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-card p-5 md:p-6 space-y-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">পাসওয়ার্ড পরিবর্তন</h3>
        </div>

        {/* Current */}
        <div className="space-y-2">
          <Label htmlFor="current">বর্তমান পাসওয়ার্ড</Label>
          <div className="relative">
            <Input
              id="current"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="toggle"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New */}
        <div className="space-y-2">
          <Label htmlFor="new">নতুন পাসওয়ার্ড</Label>
          <div className="relative">
            <Input
              id="new"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="toggle"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength meter */}
          {newPassword && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">পাসওয়ার্ড শক্তি</span>
                <span className="font-semibold">{strengthLabel}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all ${strengthColor}`}
                  style={{ width: `${(strengthScore / checks.length) * 100}%` }}
                />
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                {checks.map((c, i) => (
                  <li
                    key={c.label}
                    className={`flex items-center gap-2 text-xs ${
                      passed[i] ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {passed[i] ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="space-y-2">
          <Label htmlFor="confirm">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="toggle"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> পাসওয়ার্ড মিলছে না
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            সুপার অ্যাডমিন অ্যাকাউন্টের জন্য একটি ইউনিক ও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।
          </p>
        </div>

        {/* Re-auth flow status tracker */}
        {(loading || Object.values(steps).some((s) => s !== "idle")) && (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground">
              সেশন রিফ্রেশ ও যাচাই
            </p>
            {(
              [
                ["verify", "বর্তমান পাসওয়ার্ড যাচাই"],
                ["update", "পাসওয়ার্ড আপডেট"],
                ["refresh", "সেশন রিফ্রেশ (টোকেন রোটেশন)"],
                ["fallback", "ফলব্যাক সাইন-ইন"],
                ["confirm", "সাইন-ইন স্ট্যাটাস নিশ্চিতকরণ"],
              ] as Array<[keyof typeof steps, string]>
            ).map(([key, label]) => {
              const s = steps[key];
              const styles =
                s === "success"
                  ? "text-emerald-600"
                  : s === "failed"
                  ? "text-destructive"
                  : s === "loading"
                  ? "text-primary"
                  : s === "skipped"
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground";
              const badge =
                s === "success" ? "সফল" :
                s === "failed" ? "ব্যর্থ" :
                s === "loading" ? "চলছে..." :
                s === "skipped" ? "প্রয়োজন নেই" : "অপেক্ষমাণ";
              return (
                <div key={key} className={`flex items-center justify-between gap-3 text-xs ${styles}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {s === "loading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                    {s === "success" && <Check className="h-3.5 w-3.5 shrink-0" />}
                    {s === "failed" && <X className="h-3.5 w-3.5 shrink-0" />}
                    {(s === "idle" || s === "skipped") && <CircleDashed className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{label}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0">
                    {badge}
                  </span>
                </div>
              );
            })}
            {stepError && (
              <p className="text-xs text-destructive pt-1 border-t border-destructive/20">
                {stepError}
              </p>
            )}
            {!loading && steps.confirm === "success" && (
              <p className="text-xs text-emerald-600 pt-1 border-t border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                আপনি এখনো সাইন-ইন আছেন — কোনো পুনরায় লগইনের প্রয়োজন নেই।
              </p>
            )}

            {steps.confirm === "success" && (
              <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-border/60">
                <div className="flex items-center gap-2 min-w-0">
                  <RefreshCw
                    className={`h-3.5 w-3.5 shrink-0 ${
                      refreshState === "loading" ? "animate-spin text-primary" :
                      refreshState === "success" ? "text-emerald-600" :
                      refreshState === "failed" ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                  <span className={
                    refreshState === "success" ? "text-emerald-600" :
                    refreshState === "failed" ? "text-destructive" :
                    refreshState === "loading" ? "text-primary" : "text-muted-foreground"
                  }>
                    প্রোফাইল ও ড্যাশবোর্ড ডেটা রিফ্রেশ
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lastRefreshAt && refreshState === "success" && (
                    <span className="text-[10px] text-muted-foreground">
                      {lastRefreshAt.toLocaleTimeString("bn-BD")}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {refreshState === "loading" ? "চলছে..." :
                     refreshState === "success" ? "আপডেটেড" :
                     refreshState === "failed" ? "ব্যর্থ" : "অপেক্ষমাণ"}
                  </span>
                  {refreshState !== "loading" && (
                    <>
                      <button
                        type="button"
                        onClick={() => refreshAppData()}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        আবার রিফ্রেশ
                      </button>
                      <button
                        type="button"
                        onClick={() => refreshAppData({ dryRun: true })}
                        className="text-[10px] font-semibold text-amber-600 hover:underline"
                        title="শুধু key যাচাই — কোনো invalidate/refetch নয়"
                      >
                        Dry-Run
                      </button>
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-amber-500"
                          checked={dryRun}
                          onChange={(e) => setDryRun(e.target.checked)}
                        />
                        ডিফল্ট dry-run
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Per-section optimistic loading chips */}
            {steps.confirm === "success" && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2">
                {(Object.keys(sectionMeta) as SectionKey[]).map((sec) => {
                  const s = sections[sec];
                  const isRefreshing = s === "refreshing";
                  const tone =
                    s === "done" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" :
                    s === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                    s === "refreshing" ? "border-primary/30 bg-primary/10 text-primary" :
                    "border-border bg-muted/40 text-muted-foreground";
                  return (
                    <div
                      key={sec}
                      className={`relative overflow-hidden rounded-lg border px-2 py-1.5 text-[10px] font-semibold flex items-center justify-between gap-1 ${tone}`}
                      aria-busy={isRefreshing}
                    >
                      <span className="truncate">{sectionMeta[sec]}</span>
                      {s === "refreshing" && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                      {s === "done" && <Check className="h-3 w-3 shrink-0" />}
                      {s === "failed" && <X className="h-3 w-3 shrink-0" />}
                      {s === "idle" && <CircleDashed className="h-3 w-3 shrink-0 opacity-60" />}
                      {isRefreshing && (
                        <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dry-run / validation: tabs for highlight + invalidation timeline */}
            {(keyMatches.length > 0 || runHistory.length > 0) && (
              <div className="rounded-xl border bg-card p-3 space-y-2">
                {/* Tab switcher */}
                <div className="flex items-center gap-1 text-[11px] font-semibold border-b border-border pb-2">
                  <button
                    type="button"
                    onClick={() => setPanelTab("highlight")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                      panelTab === "highlight"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    aria-pressed={panelTab === "highlight"}
                  >
                    <FileText className="h-3.5 w-3.5" /> হাইলাইট
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("timeline")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                      panelTab === "timeline"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    aria-pressed={panelTab === "timeline"}
                  >
                    <History className="h-3.5 w-3.5" /> টাইমলাইন ({runHistory.length})
                  </button>
                </div>

                {panelTab === "highlight" && keyMatches.length > 0 && (
                <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Query key ম্যাচ ({keyMatches.filter((m) => m.matched).length}/{keyMatches.length})
                  </p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> ম্যাচড
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> অম্যাচড
                    </span>
                    <button
                      type="button"
                      onClick={() => exportKeyMatches("csv")}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold text-foreground hover:bg-muted"
                      title="বর্তমান ফিল্টার অনুযায়ী CSV এক্সপোর্ট"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportKeyMatches("pdf")}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold text-foreground hover:bg-muted"
                      title="বর্তমান ফিল্টার অনুযায়ী PDF এক্সপোর্ট"
                    >
                      <FileDown className="h-3 w-3" /> PDF
                    </button>
                  </div>
                </div>
                {/* One-click export presets */}
                <div className="flex items-center gap-1 flex-wrap text-[10px]">
                  <span className="inline-flex items-center gap-1 text-muted-foreground mr-1">
                    <Filter className="h-3 w-3" /> প্রিসেট:
                  </span>
                  {([
                    { id: "matched" as const, label: "শুধু ম্যাচড", title: "শুধু matched keys (CSV)" },
                    { id: "unmatched" as const, label: "শুধু অম্যাচড", title: "শুধু unmatched keys (CSV)" },
                    { id: "all" as const, label: "সব key", title: "এই রানের সব key (CSV)" },
                  ]).map((p) => (
                    <span key={p.id} className="inline-flex">
                      <button
                        type="button"
                        onClick={() => exportKeyMatches("csv", { preset: p.id, ignoreSearch: true })}
                        className="inline-flex items-center gap-1 rounded-l-full border border-r-0 border-border bg-muted/40 px-2 py-0.5 font-semibold hover:bg-muted"
                        title={p.title}
                      >
                        <Download className="h-3 w-3" /> {p.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => exportKeyMatches("pdf", { preset: p.id, ignoreSearch: true })}
                        className="inline-flex items-center rounded-r-full border border-border bg-muted/40 px-1.5 py-0.5 font-semibold hover:bg-muted"
                        title={`${p.label} — PDF`}
                      >
                        <FileDown className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      exportRunHistory("csv", runHistory.filter((r) => !r.dryRun), "live-only")
                    }
                    disabled={runHistory.filter((r) => !r.dryRun).length === 0}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 px-2 py-0.5 font-semibold hover:bg-emerald-500/20 disabled:opacity-50"
                    title="শুধু লাইভ (non-dry-run) সব রান একসাথে CSV"
                  >
                    <Download className="h-3 w-3" /> শুধু লাইভ ({runHistory.filter((r) => !r.dryRun).length})
                  </button>
                </div>
                {/* Reasoning depth toggle for unmatched popovers */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">ব্যাখ্যা মোড:</span>
                  <div className="inline-flex rounded-full border border-border overflow-hidden">
                    {([
                      { id: "exact", label: "Exact-only" },
                      { id: "near", label: "Near-match" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReasonMode(opt.id)}
                        className={`px-2 py-0.5 font-semibold transition ${
                          reasonMode === opt.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                        aria-pressed={reasonMode === opt.id}
                        title={
                          opt.id === "exact"
                            ? "শুধু exact-match যাচাই দেখাবে"
                            : "exact + prefix/loose কাছাকাছি keys দেখাবে"
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Filter toggle */}
                <div className="flex items-center gap-1 text-[10px] font-semibold">
                  {([
                    { id: "all", label: `সব (${keyMatches.length})` },
                    { id: "matched", label: `ম্যাচড (${keyMatches.filter((m) => m.matched).length})` },
                    { id: "unmatched", label: `অম্যাচড (${keyMatches.filter((m) => !m.matched).length})` },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMatchFilter(opt.id)}
                      className={`px-2 py-0.5 rounded-full border transition ${
                        matchFilter === opt.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                      aria-pressed={matchFilter === opt.id}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Search input — case-insensitive substring on key signature */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="search"
                    value={keySearch}
                    onChange={(e) => setKeySearch(e.target.value)}
                    placeholder="Key signature বা JSON খুঁজুন..."
                    className="w-full rounded-md border border-border bg-background pl-7 pr-7 py-1 text-[11px] font-mono placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {keySearch && (
                    <button
                      type="button"
                      onClick={() => setKeySearch("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      aria-label="সার্চ পরিষ্কার"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visibleMatches.map((m, idx) => {
                    const isFocused = focusedSig === m.sig;
                    const baseCls = `flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] font-mono w-full text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      m.matched
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                    } ${
                      isFocused
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-md scale-[1.01]"
                        : ""
                    }`;
                    // Arrow keys move focus across visible chips; Home/End jump
                    // to first/last; Enter on an unmatched chip opens its popover.
                    const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
                      const last = visibleMatches.length - 1;
                      let nextIdx: number | null = null;
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        nextIdx = idx < last ? idx + 1 : 0;
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        nextIdx = idx > 0 ? idx - 1 : last;
                      } else if (e.key === "Home") {
                        nextIdx = 0;
                      } else if (e.key === "End") {
                        nextIdx = last;
                      } else if (e.key === "Enter" || e.key === " ") {
                        if (!m.matched) {
                          e.preventDefault();
                          setFocusedSig(m.sig);
                          setOpenPopoverSig((cur) => (cur === m.sig ? null : m.sig));
                        }
                        return;
                      } else if (e.key === "Escape") {
                        if (openPopoverSig) {
                          e.preventDefault();
                          setOpenPopoverSig(null);
                        }
                        return;
                      } else {
                        return;
                      }
                      e.preventDefault();
                      const target = visibleMatches[nextIdx!];
                      setFocusedSig(target.sig);
                      const el = keyRefs.current.get(target.sig);
                      el?.focus({ preventScroll: false });
                      el?.scrollIntoView({ block: "nearest" });
                    };
                    if (m.matched) {
                      return (
                        <button
                          key={m.sig}
                          type="button"
                          ref={(el) => { keyRefs.current.set(m.sig, el); }}
                          onKeyDown={handleKey}
                          onFocus={() => setFocusedSig(m.sig)}
                          onClick={() => setFocusedSig(m.sig)}
                          className={baseCls}
                          title="ক্যাশে পাওয়া গেছে"
                        >
                          <span className="truncate">{m.sig}</span>
                          <Check className="h-3 w-3 shrink-0" />
                        </button>
                      );
                    }
                    return (
                      <Popover
                        key={m.sig}
                        open={openPopoverSig === m.sig}
                        onOpenChange={(o) => {
                          setOpenPopoverSig(o ? m.sig : null);
                          if (o) setFocusedSig(m.sig);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            ref={(el) => { keyRefs.current.set(m.sig, el); }}
                            onKeyDown={handleKey}
                            onFocus={() => setFocusedSig(m.sig)}
                            onClick={() => {
                              // Mouse click sets focus + opens this key's popover
                              // (Radix Popover handles open via onOpenChange,
                              // but we explicitly set focusedSig here so the
                              // visible focus ring follows the click target).
                              setFocusedSig(m.sig);
                              keyRefs.current.get(m.sig)?.focus({ preventScroll: true });
                            }}
                            className={`${baseCls} hover:bg-muted cursor-pointer`}
                            title="বিস্তারিত দেখতে ক্লিক করুন"
                          >
                            <span className="truncate line-through">{m.sig}</span>
                            <Info className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="start"
                          sideOffset={8}
                          collisionPadding={12}
                          className="w-72 p-3 space-y-2 text-xs will-change-[transform,opacity] transform-gpu origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:duration-150 data-[state=closed]:duration-100 data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1"
                          onCloseAutoFocus={(e) => {
                            // Keep the triggering chip focused so the ring is
                            // stable across open → Escape → close transitions.
                            e.preventDefault();
                            const el = keyRefs.current.get(m.sig);
                            el?.focus({ preventScroll: true });
                          }}
                          onOpenAutoFocus={(e) => {
                            // Prevent Radix from yanking focus into the
                            // popover during the open animation — keeping the
                            // ring on the trigger eliminates the visible
                            // focus jump while the content is still scaling
                            // in. Users can still Tab into the popover.
                            e.preventDefault();
                          }}
                          onEscapeKeyDown={() => {
                            // Match our internal openPopoverSig state so a
                            // subsequent Enter re-opens cleanly.
                            setOpenPopoverSig(null);
                          }}
                        >
                          {(() => {
                            const info = explainUnmatched(m);
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                  <div className="space-y-1">
                                    <p className="font-semibold">{info.title}</p>
                                    <p className="text-[11px] text-muted-foreground">{info.reason}</p>
                                  </div>
                                </div>
                                <div className="rounded bg-muted/50 px-2 py-1 font-mono text-[10px] break-all">
                                  {m.sig}
                                </div>
                                {info.related.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                      কাছাকাছি key ({info.related.length})
                                    </p>
                                    <ul className="space-y-0.5">
                                      {info.related.map((r) => (
                                        <li key={r} className="font-mono text-[10px] text-foreground/80 break-all">
                                          • {r}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                  {visibleMatches.length === 0 && (
                    <p className="col-span-full text-center text-[11px] text-muted-foreground py-2">
                      {keySearch ? `"${keySearch}" এর জন্য কোনো key নেই` : "এই ফিল্টারে কোনো key নেই"}
                    </p>
                  )}
                </div>
                </>
                )}

                {panelTab === "timeline" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-primary" />
                        ইনভ্যালিডেশন টাইমলাইন ({visibleRunHistory.length}/{runHistory.length})
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {timelineFiltersActive && (
                          <button
                            type="button"
                            onClick={resetTimelineFilters}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 text-primary px-2 py-0.5 font-semibold hover:bg-primary/20"
                            title="সব ফিল্টার ও সার্চ রিসেট করুন"
                          >
                            <RotateCcw className="h-3 w-3" /> ফিল্টার রিসেট
                          </button>
                        )}
                        <label className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold">
                          <Settings2 className="h-3 w-3" />
                          <span className="text-muted-foreground">লিমিট</span>
                          <select
                            value={historyLimit}
                            onChange={(e) => setHistoryLimit(parseInt(e.target.value, 10))}
                            className="bg-transparent outline-none text-[10px] font-bold cursor-pointer"
                            title="সংরক্ষিত রান হিস্টরির সর্বোচ্চ সংখ্যা"
                          >
                            {HISTORY_LIMIT_OPTIONS.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => exportRunHistory("csv", visibleRunHistory, "visible")}
                          disabled={visibleRunHistory.length === 0}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold hover:bg-muted disabled:opacity-50"
                          title="দৃশ্যমান রান CSV (ফিল্টার+সার্চ)"
                        >
                          <Download className="h-3 w-3" /> এক্সপোর্ট CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => exportRunHistory("pdf", visibleRunHistory, "visible")}
                          disabled={visibleRunHistory.length === 0}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold hover:bg-muted disabled:opacity-50"
                          title="দৃশ্যমান রান PDF (ফিল্টার+সার্চ)"
                        >
                          <FileDown className="h-3 w-3" /> এক্সপোর্ট PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (runHistory.length === 0) return;
                            if (confirm("সব রান হিস্টরি মুছে ফেলবেন?")) setRunHistory([]);
                          }}
                          disabled={runHistory.length === 0}
                          className="inline-flex items-center gap-1 rounded-full border border-destructive/30 text-destructive px-2 py-0.5 font-semibold hover:bg-destructive/10 disabled:opacity-50"
                          title="হিস্টরি মুছুন"
                        >
                          <Trash2 className="h-3 w-3" /> মুছুন
                        </button>
                      </div>
                    </div>

                    {/* Timeline search & filter controls */}
                    {runHistory.length > 0 && (
                      <div className="rounded-lg border border-border/70 bg-muted/30 p-2 space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                              type="text"
                              value={timelineQuery}
                              onChange={(e) => setTimelineQuery(e.target.value)}
                              placeholder="Query key খুঁজুন…"
                              className="w-full rounded-md border border-border bg-card pl-7 pr-7 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            {timelineQuery && (
                              <button
                                type="button"
                                onClick={() => setTimelineQuery("")}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                                aria-label="সার্চ পরিষ্কার"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                              type="text"
                              value={timelineTriggered}
                              onChange={(e) => setTimelineTriggered(e.target.value)}
                              placeholder="ট্রিগার (ইমেইল)…"
                              className="w-full rounded-md border border-border bg-card pl-7 pr-7 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            {timelineTriggered && (
                              <button
                                type="button"
                                onClick={() => setTimelineTriggered("")}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                                aria-label="পরিষ্কার"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {triggeredByOptions.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-muted-foreground font-semibold shrink-0">
                              ট্রিগারকারী:
                            </span>
                            <div className="relative flex-1">
                              <Popover
                                open={triggeredByOpen}
                                onOpenChange={(o) => {
                                  setTriggeredByOpen(o);
                                  if (!o) {
                                    setTriggeredBySearch("");
                                  } else {
                                    setTriggeredByActiveIdx(0);
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-full inline-flex items-center justify-between rounded-md border border-border bg-card pl-2 pr-2 py-1 text-[11px] font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    title="নির্দিষ্ট ট্রিগারকারী অনুযায়ী ফিল্টার"
                                  >
                                    <span className="truncate text-left">
                                      {timelineTriggeredSelect
                                        ? timelineTriggeredSelect
                                        : `— সবাই (${runHistory.length}) —`}
                                    </span>
                                    <span className="flex items-center gap-1 shrink-0 ml-1">
                                      {timelineTriggeredSelect && (
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTimelineTriggeredSelect("");
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setTimelineTriggeredSelect("");
                                            }
                                          }}
                                          className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                          aria-label="ট্রিগারকারী ফিল্টার পরিষ্কার"
                                        >
                                          <X className="h-3 w-3" />
                                        </span>
                                      )}
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  sideOffset={4}
                                  className="w-[--radix-popover-trigger-width] min-w-[220px] p-0 text-[11px]"
                                >
                                  {(() => {
                                    const q = triggeredBySearch.trim().toLowerCase();
                                    const filtered = q
                                      ? triggeredByOptions.filter((o) =>
                                          o.value.toLowerCase().includes(q),
                                        )
                                      : triggeredByOptions;
                                    // Combined list: index 0 = "all", 1..n = options.
                                    const total = 1 + filtered.length;
                                    const safeIdx = Math.min(triggeredByActiveIdx, Math.max(0, total - 1));
                                    const commit = (idx: number) => {
                                      if (idx === 0) {
                                        setTimelineTriggeredSelect("");
                                      } else {
                                        const o = filtered[idx - 1];
                                        if (o) setTimelineTriggeredSelect(o.value);
                                      }
                                      setTriggeredByOpen(false);
                                    };
                                    return (
                                      <>
                                        <div className="p-1.5 border-b border-border/60">
                                          <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                            <input
                                              autoFocus
                                              type="text"
                                              value={triggeredBySearch}
                                              onChange={(e) => {
                                                setTriggeredBySearch(e.target.value);
                                                setTriggeredByActiveIdx(0);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "ArrowDown") {
                                                  e.preventDefault();
                                                  setTriggeredByActiveIdx((i) =>
                                                    Math.min(total - 1, i + 1),
                                                  );
                                                } else if (e.key === "ArrowUp") {
                                                  e.preventDefault();
                                                  setTriggeredByActiveIdx((i) =>
                                                    Math.max(0, i - 1),
                                                  );
                                                } else if (e.key === "Home") {
                                                  e.preventDefault();
                                                  setTriggeredByActiveIdx(0);
                                                } else if (e.key === "End") {
                                                  e.preventDefault();
                                                  setTriggeredByActiveIdx(Math.max(0, total - 1));
                                                } else if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  if (total > 0) commit(safeIdx);
                                                } else if (e.key === "Escape") {
                                                  e.preventDefault();
                                                  setTriggeredByOpen(false);
                                                }
                                              }}
                                              placeholder="অপারেটর খুঁজুন…"
                                              role="combobox"
                                              aria-expanded={triggeredByOpen}
                                              aria-controls="triggered-by-listbox"
                                              aria-activedescendant={`tb-opt-${safeIdx}`}
                                              className="w-full rounded-md border border-border bg-card pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            />
                                          </div>
                                        </div>
                                        <div
                                          id="triggered-by-listbox"
                                          role="listbox"
                                          className="max-h-60 overflow-y-auto py-1"
                                        >
                                          <button
                                            type="button"
                                            id="tb-opt-0"
                                            role="option"
                                            aria-selected={!timelineTriggeredSelect}
                                            onClick={() => commit(0)}
                                            onMouseEnter={() => setTriggeredByActiveIdx(0)}
                                            ref={(el) => {
                                              if (el && safeIdx === 0)
                                                el.scrollIntoView({ block: "nearest" });
                                            }}
                                            className={`w-full flex items-center justify-between gap-2 px-2 py-1 text-left ${
                                              safeIdx === 0
                                                ? "bg-primary/15 ring-1 ring-inset ring-primary/40"
                                                : !timelineTriggeredSelect
                                                  ? "bg-muted/60 font-semibold"
                                                  : "hover:bg-muted"
                                            }`}
                                          >
                                            <span className="truncate">— সবাই —</span>
                                            <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                                              <span className="font-mono tabular-nums">
                                                {runHistory.length}
                                              </span>
                                              {!timelineTriggeredSelect && (
                                                <Check className="h-3 w-3 text-primary" />
                                              )}
                                            </span>
                                          </button>
                                          {filtered.length === 0 ? (
                                            <p className="px-2 py-2 text-center text-muted-foreground">
                                              কোনো অপারেটর মেলেনি
                                            </p>
                                          ) : (
                                            filtered.map((o, i) => {
                                              const idx = i + 1;
                                              const active = o.value === timelineTriggeredSelect;
                                              const focused = safeIdx === idx;
                                              return (
                                                <button
                                                  key={o.value}
                                                  type="button"
                                                  id={`tb-opt-${idx}`}
                                                  role="option"
                                                  aria-selected={active}
                                                  ref={(el) => {
                                                    if (el && focused)
                                                      el.scrollIntoView({ block: "nearest" });
                                                  }}
                                                  onMouseEnter={() => setTriggeredByActiveIdx(idx)}
                                                  onClick={() => commit(idx)}
                                                  className={`w-full flex items-center justify-between gap-2 px-2 py-1 text-left ${
                                                    focused
                                                      ? "bg-primary/15 ring-1 ring-inset ring-primary/40"
                                                      : active
                                                        ? "bg-muted/60 font-semibold"
                                                        : "hover:bg-muted"
                                                  }`}
                                                >
                                                  <span className="truncate">
                                                    {renderHighlighted(o.value, triggeredBySearch)}
                                                  </span>
                                                  <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                                                    <span className="font-mono tabular-nums">
                                                      {o.count}
                                                    </span>
                                                    {active && <Check className="h-3 w-3 text-primary" />}
                                                  </span>
                                                </button>
                                              );
                                            })
                                          )}
                                        </div>
                                        <div className="px-2 py-1 text-[9px] text-muted-foreground border-t border-border/60 bg-muted/30 flex items-center justify-between">
                                          <span>↑/↓ নেভিগেট · Enter সিলেক্ট · Esc বন্ধ</span>
                                          <span className="font-mono tabular-nums">
                                            {total} অপশন
                                          </span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground font-semibold mr-0.5">মোড:</span>
                          {(["all", "dry", "live"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setTimelineMode(m)}
                              className={`rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                                timelineMode === m
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card hover:bg-muted"
                              }`}
                            >
                              {m === "all" ? "সব" : m === "dry" ? "Dry-Run" : "Live"}
                            </button>
                          ))}
                          <span className="text-muted-foreground font-semibold mx-1">·</span>
                          <span className="text-muted-foreground font-semibold mr-0.5">স্ট্যাটাস:</span>
                          {(
                            [
                              { id: "all", label: "সব" },
                              { id: "has-matched", label: "ম্যাচড আছে" },
                              { id: "has-unmatched", label: "অম্যাচড আছে" },
                            ] as const
                          ).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setTimelineStatus(s.id)}
                              className={`rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                                timelineStatus === s.id
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card hover:bg-muted"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowMatchedChips((v) => !v)}
                            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                              showMatchedChips
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:bg-muted"
                            }`}
                            title="রান তালিকায় ম্যাচ-করা query key চিপ দেখান/লুকান"
                            aria-pressed={showMatchedChips}
                          >
                            <span
                              className={`relative inline-flex h-3 w-5 items-center rounded-full transition-colors ${
                                showMatchedChips ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                              aria-hidden
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full bg-background transition-transform ${
                                  showMatchedChips ? "translate-x-2.5" : "translate-x-0.5"
                                }`}
                              />
                            </span>
                            ম্যাচ চিপ
                          </button>
                          <button
                            type="button"
                            onClick={() => setDefaultShowMatchedChips(showMatchedChips)}
                            disabled={defaultShowMatchedChips === showMatchedChips}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                              defaultShowMatchedChips === showMatchedChips
                                ? "border-border bg-muted/40 text-muted-foreground cursor-default"
                                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                            title={`বর্তমান অবস্থা (${showMatchedChips ? "দৃশ্যমান" : "লুকানো"}) ডিফল্ট হিসেবে সংরক্ষণ করুন — রিসেটে এই অবস্থায় ফিরবে। বর্তমান ডিফল্ট: ${defaultShowMatchedChips ? "দৃশ্যমান" : "লুকানো"}`}
                          >
                            {defaultShowMatchedChips === showMatchedChips ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Settings2 className="h-3 w-3" />
                            )}
                            ডিফল্ট
                          </button>
                          {timelineFiltersActive && (
                            <button
                              type="button"
                              onClick={resetTimelineFilters}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 text-primary px-2 py-0.5 font-semibold hover:bg-primary/20"
                              title="সব ফিল্টার ও সার্চ রিসেট"
                            >
                              <RotateCcw className="h-3 w-3" /> রিসেট
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {runHistory.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        এখনো কোনো রান নেই — Dry-Run বা Refresh চালান।
                      </p>
                    ) : visibleRunHistory.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        ফিল্টার/সার্চে কোনো রান মেলেনি।
                      </p>
                    ) : (
                      <ol className="space-y-1.5">
                        {visibleRunHistory.map((r, idx) => {
                          const tone = r.dryRun
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-emerald-500/30 bg-emerald-500/5";
                          return (
                            <li
                              key={r.id}
                              className={`rounded-lg border ${tone} px-2.5 py-1.5 text-[11px]`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                                    #{visibleRunHistory.length - idx}
                                  </span>
                                  <span
                                    className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                      r.dryRun
                                        ? "bg-amber-500/15 text-amber-700"
                                        : "bg-emerald-500/15 text-emerald-700"
                                    }`}
                                  >
                                    {r.dryRun ? "Dry-Run" : "Live"}
                                  </span>
                                  <span className="truncate font-medium">
                                    {renderHighlighted(r.triggeredBy, timelineTriggered)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailsRunId(r.id);
                                      setDetailsFilter("all");
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 font-semibold hover:bg-muted"
                                    title="বিস্তারিত দেখুন"
                                  >
                                    <Info className="h-3 w-3" /> ডিটেইলস
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 font-semibold hover:bg-muted"
                                        title="এই রান CSV এক্সপোর্ট"
                                      >
                                        <Download className="h-3 w-3" /> CSV
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-[11px]">
                                      <DropdownMenuItem onClick={() => exportKeyMatches("csv", { record: r, preset: "all", ignoreSearch: true })}>
                                        সব ({r.totalKeys})
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={r.matchedCount === 0}
                                        onClick={() => exportKeyMatches("csv", { record: r, preset: "matched", ignoreSearch: true })}
                                      >
                                        শুধু ম্যাচড ({r.matchedCount})
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={r.unmatchedCount === 0}
                                        onClick={() => exportKeyMatches("csv", { record: r, preset: "unmatched", ignoreSearch: true })}
                                      >
                                        শুধু অম্যাচড ({r.unmatchedCount})
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 font-semibold hover:bg-muted"
                                        title="এই রান PDF এক্সপোর্ট"
                                      >
                                        <FileDown className="h-3 w-3" /> PDF
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-[11px]">
                                      <DropdownMenuItem onClick={() => exportKeyMatches("pdf", { record: r, preset: "all", ignoreSearch: true })}>
                                        সব ({r.totalKeys})
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={r.matchedCount === 0}
                                        onClick={() => exportKeyMatches("pdf", { record: r, preset: "matched", ignoreSearch: true })}
                                      >
                                        শুধু ম্যাচড ({r.matchedCount})
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={r.unmatchedCount === 0}
                                        onClick={() => exportKeyMatches("pdf", { record: r, preset: "unmatched", ignoreSearch: true })}
                                      >
                                        শুধু অম্যাচড ({r.unmatchedCount})
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm("এই রানটি মুছে ফেলবেন?")) deleteRunRecord(r.id);
                                    }}
                                    className="inline-flex items-center justify-center rounded-full border border-destructive/30 text-destructive px-1.5 py-0.5 font-semibold hover:bg-destructive/10"
                                    title="এই রান মুছুন"
                                    aria-label="এই রান মুছুন"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                <span className="font-mono tabular-nums">
                                  {new Date(r.runAt).toLocaleString("bn-BD")}
                                </span>
                                <span>
                                  মোট <b>{r.totalKeys}</b> ·
                                  <span className="text-emerald-600"> ম্যাচড {r.matchedCount}</span> ·
                                  <span className="text-muted-foreground"> অম্যাচড {r.unmatchedCount}</span>
                                </span>
                              </div>
                              {showMatchedChips && timelineQuery.trim() && (() => {
                                const q = timelineQuery.trim().toLowerCase();
                                const hits = r.matches.filter((m) =>
                                  m.sig.toLowerCase().includes(q),
                                );
                                if (hits.length === 0) return null;
                                const shown = hits.slice(0, 6);
                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                                      মিল ({hits.length}):
                                    </span>
                                    {shown.map((m) => (
                                      <span
                                        key={m.sig}
                                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${
                                          m.matched
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                            : "border-border bg-muted/40 text-muted-foreground"
                                        }`}
                                        title={m.sig}
                                      >
                                        <span className="max-w-[180px] truncate">
                                          {renderHighlighted(m.sig, timelineQuery)}
                                        </span>
                                      </span>
                                    ))}
                                    {hits.length > shown.length && (
                                      <span className="text-[9px] text-muted-foreground font-semibold">
                                        +{hits.length - shown.length} আরও
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step-by-step summary log with copy */}
        {logs.length > 0 && !loading && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold">সারাংশ লগ ({logs.length})</p>
              </div>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5" /> কপি হয়েছে
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> লগ কপি করুন
                  </>
                )}
              </button>
            </div>
            <ol className="space-y-1.5">
              {logs.map((l, i) => {
                const color =
                  l.status === "success"
                    ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                    : l.status === "failed"
                    ? "text-destructive border-destructive/30 bg-destructive/5"
                    : "text-muted-foreground border-border bg-muted/30";
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-xs rounded-lg border px-2.5 py-1.5 ${color}`}
                  >
                    <span className="font-mono text-[10px] tabular-nums shrink-0 pt-0.5">
                      {l.at.toLocaleTimeString("bn-BD")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{l.label}</span>
                        <span className="text-[10px] uppercase tracking-wide shrink-0">
                          {statusText(l.status)}
                        </span>
                      </div>
                      {l.detail && (
                        <p className="text-[11px] opacity-80 truncate">{l.detail}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || strengthScore < checks.length || newPassword !== confirmPassword}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> প্রক্রিয়াধীন...
            </span>
          ) : (
            "পাসওয়ার্ড পরিবর্তন করুন"
          )}
        </Button>
      </form>

      {/* Per-run "View details" drawer — paginated full match list with
          per-run export presets that match the row-level dropdowns. */}
      <SwipeDownSheet
        open={!!detailsRecord}
        onClose={() => setDetailsRunId(null)}
        title={detailsRecord ? `রান বিস্তারিত — ${detailsRecord.dryRun ? "Dry-Run" : "Live"}` : "রান বিস্তারিত"}
      >
        {detailsRecord && (() => {
          const totalPages = Math.max(1, Math.ceil(detailsRows.length / DETAILS_PAGE_SIZE));
          const page = Math.min(detailsPage, totalPages - 1);
          const start = page * DETAILS_PAGE_SIZE;
          const slice = detailsRows.slice(start, start + DETAILS_PAGE_SIZE);
          return (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/30 p-2 space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{detailsRecord.triggeredBy}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {new Date(detailsRecord.runAt).toLocaleString("bn-BD")}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  মোট <b className="text-foreground">{detailsRecord.totalKeys}</b> ·
                  <span className="text-emerald-600"> ম্যাচড {detailsRecord.matchedCount}</span> ·
                  <span> অম্যাচড {detailsRecord.unmatchedCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-muted-foreground font-semibold mr-0.5">ফিল্টার:</span>
                {(
                  [
                    { id: "all", label: `সব (${detailsRecord.totalKeys})` },
                    { id: "matched", label: `ম্যাচড (${detailsRecord.matchedCount})` },
                    { id: "unmatched", label: `অম্যাচড (${detailsRecord.unmatchedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDetailsFilter(f.id)}
                    className={`rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                      detailsFilter === f.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      exportKeyMatches("csv", { record: detailsRecord, preset: detailsFilter, ignoreSearch: true })
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-semibold hover:bg-muted"
                  >
                    <Download className="h-3 w-3" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportKeyMatches("pdf", { record: detailsRecord, preset: detailsFilter, ignoreSearch: true })
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-semibold hover:bg-muted"
                  >
                    <FileDown className="h-3 w-3" /> PDF
                  </button>
                </div>
              </div>

              {detailsRows.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-4">
                  এই ফিল্টারে কোনো key নেই।
                </p>
              ) : (
                <VirtualKeyList
                  rows={slice}
                  startIndex={start}
                  rowHeight={28}
                  maxHeight={Math.min(480, Math.max(160, slice.length * 28))}
                />
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDetailsPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-full border border-border bg-card px-3 py-1 font-semibold hover:bg-muted disabled:opacity-40"
                  >
                    ← পূর্ববর্তী
                  </button>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailsPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-full border border-border bg-card px-3 py-1 font-semibold hover:bg-muted disabled:opacity-40"
                  >
                    পরবর্তী →
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </SwipeDownSheet>
    </div>
  );
};

export default SuperAdminProfile;