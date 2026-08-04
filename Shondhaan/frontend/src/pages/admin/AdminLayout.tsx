import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, Calendar, FileText, Wallet, Package, ImagePlus,
  Grid3X3, Percent, Image as ImageIcon, LayoutList, ShoppingCart, Handshake,
  Briefcase, Store, MessageSquare, Bot, Bell, MapPinCheck, Trophy, Star, Tag,
  Banknote, Users, ShieldCheck, Settings, ChevronLeft, ChevronRight,
  RefreshCw, Menu, X, LogOut, Home, ChevronRight as ChevRight, Search, Sparkles,
  ScrollText, BookOpenCheck, Inbox, LifeBuoy,
  UserPlus, Sun, Moon, Monitor, Languages, Pin, PinOff, Command as CommandIcon,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import BackendShortcutsHelp from "@/components/BackendShortcutsHelp";
import { toast } from "sonner";
import {
  BackendPageActionsProvider,
  useBackendPageMeta,
} from "@/contexts/BackendPageActionsContext";

type NavItem = { to: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[]; accent: string; dot: string };

const NAV: NavGroup[] = [
  {
    label: "ড্যাশবোর্ড",
    accent: "from-emerald-500 to-emerald-600",
    dot: "bg-emerald-500",
    items: [
      { to: "/admin/smart-dashboard", label: "স্মার্ট ড্যাশবোর্ড", icon: <Sparkles className="h-4 w-4" /> },
      { to: "/admin/analytics", label: "অ্যানালিটিক্স", icon: <BarChart3 className="h-4 w-4" /> },
      { to: "/admin/bookings", label: "বুকিং", icon: <Calendar className="h-4 w-4" /> },
      { to: "/admin/requests", label: "সেবা রিকোয়েস্ট", icon: <FileText className="h-4 w-4" /> },
      { to: "/admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> },
      { to: "/admin/approval-queue", label: "অনুমোদন কিউ", icon: <Inbox className="h-4 w-4" /> },
      { to: "/admin/disputes", label: "অভিযোগ ও রিফান্ড", icon: <LifeBuoy className="h-4 w-4" /> },
    ],
  },
  {
    label: "সেবা CMS",
    accent: "from-sky-500 to-blue-600",
    dot: "bg-sky-500",
    items: [
      { to: "/admin/services", label: "সেবা", icon: <Package className="h-4 w-4" /> },
      { to: "/admin/service-images", label: "সেবার ছবি", icon: <ImagePlus className="h-4 w-4" /> },
      { to: "/admin/categories", label: "ক্যাটেগরি", icon: <Grid3X3 className="h-4 w-4" /> },
      { to: "/admin/offers", label: "অফার", icon: <Percent className="h-4 w-4" /> },
      { to: "/admin/banners", label: "ব্যানার", icon: <ImageIcon className="h-4 w-4" /> },
      { to: "/admin/sections", label: "সেকশন", icon: <LayoutList className="h-4 w-4" /> },
    ],
  },
  {
    label: "সন্ধান মার্ট",
    accent: "from-emerald-500 to-teal-600",
    dot: "bg-teal-500",
    items: [
      { to: "/admin/mart-overview", label: "মার্ট ওভারভিউ", icon: <ShoppingCart className="h-4 w-4" /> },
    ],
  },
  {
    label: "সন্ধান ডিল",
    accent: "from-amber-500 to-orange-600",
    dot: "bg-amber-500",
    items: [
      { to: "/admin/deal-overview", label: "ডিল ওভারভিউ", icon: <Handshake className="h-4 w-4" /> },
      { to: "/admin/deal-categories", label: "ডিল ক্যাটেগরি", icon: <Grid3X3 className="h-4 w-4" /> },
    ],
  },
  {
    label: "সন্ধান জবস",
    accent: "from-blue-500 to-indigo-600",
    dot: "bg-blue-500",
    items: [
      { to: "/admin/job-listings", label: "চাকরি বিজ্ঞাপন", icon: <Briefcase className="h-4 w-4" /> },
      { to: "/admin/employers", label: "এমপ্লয়ার", icon: <Store className="h-4 w-4" /> },
    ],
  },
  {
    label: "কমিউনিকেশন",
    accent: "from-fuchsia-500 to-purple-600",
    dot: "bg-fuchsia-500",
    items: [
      { to: "/admin/contacts", label: "মেসেজ", icon: <MessageSquare className="h-4 w-4" /> },
      { to: "/admin/chat-history", label: "চ্যাট হিস্ট্রি", icon: <Bot className="h-4 w-4" /> },
      { to: "/admin/notifications", label: "নোটিফিকেশন", icon: <Bell className="h-4 w-4" /> },
      { to: "/admin/notification-rules", label: "নোটিফিকেশন নিয়ম", icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  },
  {
    label: "হিউম্যান রিসোর্স",
    accent: "from-rose-500 to-pink-600",
    dot: "bg-rose-500",
    items: [
      { to: "/admin/jobs", label: "আবেদন", icon: <Briefcase className="h-4 w-4" /> },
      { to: "/admin/representatives", label: "প্রতিনিধি", icon: <MapPinCheck className="h-4 w-4" /> },
      { to: "/admin/leaderboard", label: "লিডারবোর্ড", icon: <Trophy className="h-4 w-4" /> },
      { to: "/admin/reviews", label: "রিভিউ", icon: <Star className="h-4 w-4" /> },
      { to: "/admin/staff-assignments", label: "স্টাফ অ্যাসাইনমেন্ট", icon: <UserPlus className="h-4 w-4" /> },
      { to: "/admin/staff-workload", label: "স্টাফ ওয়ার্কলোড", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: "ফিনান্স",
    accent: "from-yellow-500 to-amber-600",
    dot: "bg-yellow-500",
    items: [
      { to: "/admin/coupons", label: "কুপন", icon: <Tag className="h-4 w-4" /> },
      { to: "/admin/withdrawals", label: "উইথড্রয়াল", icon: <Banknote className="h-4 w-4" /> },
      { to: "/admin/payment-ledger", label: "পেমেন্ট লেজার", icon: <BookOpenCheck className="h-4 w-4" /> },
    ],
  },
  {
    label: "সিস্টেম",
    accent: "from-slate-500 to-slate-700",
    dot: "bg-slate-500",
    items: [
      { to: "/admin/users", label: "ইউজার ম্যানেজমেন্ট", icon: <Users className="h-4 w-4" /> },
      { to: "/admin/permissions", label: "পারমিশন", icon: <ShieldCheck className="h-4 w-4" /> },
      { to: "/admin/settings", label: "সেটিংস", icon: <Settings className="h-4 w-4" /> },
      { to: "/admin/audit-logs", label: "অডিট লগ", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
];

const AdminLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, cycle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupsInit, setGroupsInit] = useState(false);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const [paletteHi, setPaletteHi] = useState(0);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const sidebarNavRef = useRef<HTMLElement | null>(null);

  // Bengali a11y vocabulary — keep all sidebar/route announcements consistent
  const A11Y = {
    group: "গ্রুপ",
    item: "আইটেম",
    expanded: "এক্সপ্যান্ড করা হয়েছে",
    collapsed: "কোলাপ্স করা হয়েছে",
    of: "এর মধ্যে",
    pageLoaded: "পেজ লোড হয়েছে",
  } as const;

  // Convert a Western digit string ("3") into Bengali digits ("৩")
  const toBnDigits = (n: number | string) =>
    String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

  // Normalize a focusable element's accessible label:
  // 1) Prefer aria-label, else textContent
  // 2) Strip stray digits / kbd-style chars, collapse whitespace
  // 3) Remove a trailing numeric badge (group item count)
  const normalizeLabel = (el: HTMLElement) => {
    const raw = el.getAttribute("aria-label") || el.textContent || "";
    return raw
      .replace(/\s+/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
      .trim()
      .replace(/\s+\d+$/, "") // strip trailing count (e.g. "ফিনান্স 3")
      .trim();
  };

  // ARIA live announcements for keyboard nav (group expand/collapse, focus, route)
  const [announcement, setAnnouncement] = useState("");
  const announceTimer = useRef<number | null>(null);
  const announce = (msg: string) => {
    if (announceTimer.current) window.clearTimeout(announceTimer.current);
    // Toggle to empty first so identical consecutive messages still re-fire SR output
    setAnnouncement("");
    announceTimer.current = window.setTimeout(() => setAnnouncement(msg), 30);
  };
  useEffect(() => () => { if (announceTimer.current) window.clearTimeout(announceTimer.current); }, []);

  // Pinned favorites (persisted)
  const PIN_KEY = "admin_panel_pins";
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(PIN_KEY, JSON.stringify(pinned)); }, [pinned]);
  const togglePin = (path: string) => setPinned((p) => p.includes(path) ? p.filter(x => x !== path) : [...p, path]);

  // Flat item list for palette / pinned lookup
  const flatItems = useMemo(() => NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))), []);
  const pinnedItems = useMemo(() => flatItems.filter(i => pinned.includes(i.to)), [flatItems, pinned]);

  // Roving keyboard navigation inside the sidebar
  const focusableSidebarLinks = () => {
    const root = sidebarNavRef.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(
      root.querySelectorAll<HTMLElement>('a[data-sidebar-link], button[data-sidebar-group]')
    ).filter((el) => !el.hasAttribute('data-disabled'));
  };
  const handleSidebarKeyDown = (e: React.KeyboardEvent) => {
    const items = focusableSidebarLinks();
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;
    const linkItems = items.filter((el) => el.hasAttribute("data-sidebar-link"));
    const announceFocused = (el?: HTMLElement) => {
      if (!el) return;
      const isGroup = el.hasAttribute("data-sidebar-group");
      const groupLabel = el.getAttribute("data-group") || "";
      const label = normalizeLabel(el) || groupLabel;
      if (isGroup) {
        const expanded = el.getAttribute("aria-expanded") === "true";
        announce(`${label} ${A11Y.group}, ${expanded ? A11Y.expanded : A11Y.collapsed}`);
      } else {
        const pos = linkItems.indexOf(el);
        const total = linkItems.length;
        const positional = pos >= 0
          ? ` (${A11Y.item} ${toBnDigits(pos + 1)} ${A11Y.of} ${toBnDigits(total)})`
          : "";
        announce(`${label}${groupLabel ? `, ${groupLabel} ${A11Y.group}` : ""}${positional}`);
      }
    };
    const focusAt = (i: number) => {
      const el = items[(i + items.length) % items.length];
      el?.focus();
      announceFocused(el);
    };

    if (e.key === "ArrowDown") { e.preventDefault(); focusAt(idx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(idx - 1); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); announceFocused(items[0]); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); announceFocused(items[items.length - 1]); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // Expand/collapse the group of the focused item or button
      const groupLabel = active?.getAttribute("data-group");
      if (groupLabel) {
        e.preventDefault();
        const willCollapse = e.key === "ArrowLeft";
        setCollapsedGroups((c) => ({ ...c, [groupLabel]: willCollapse }));
        announce(`${groupLabel} ${A11Y.group} ${willCollapse ? A11Y.collapsed : A11Y.expanded}`);
      }
    } else if (e.key === "[" || e.key === "]") {
      // Jump to previous/next group header
      const headers = items.filter((el) => el.hasAttribute("data-sidebar-group"));
      if (!headers.length) return;
      e.preventDefault();
      const currentGroupLabel = active?.getAttribute("data-group");
      let hIdx = headers.findIndex((h) => h.getAttribute("data-group") === currentGroupLabel);
      if (hIdx === -1) hIdx = 0;
      const next = e.key === "]" ? hIdx + 1 : hIdx - 1;
      const target = headers[(next + headers.length) % headers.length];
      target?.focus();
      announceFocused(target);
    }
  };

  // ⌘K palette + g-prefix backend jumps + Shift+? help
  useEffect(() => {
    let lastG = 0;
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (t as HTMLElement).isContentEditable;
    };
    // g+key → backend section jump
    const jumpMap: Record<string, { to: string; label: string }> = {
      d: { to: "/admin/smart-dashboard", label: "ড্যাশবোর্ড" },
      a: { to: "/admin/analytics", label: "অ্যানালিটিক্স" },
      b: { to: "/admin/bookings", label: "বুকিং" },
      r: { to: "/admin/requests", label: "সেবা রিকোয়েস্ট" },
      u: { to: "/admin/users", label: "ইউজার" },
      s: { to: "/admin/services", label: "সেবা" },
      m: { to: "/admin/mart-overview", label: "মার্ট" },
      l: { to: "/admin/deal-overview", label: "ডিল" },
      j: { to: "/admin/job-listings", label: "জবস" },
      n: { to: "/admin/notifications", label: "নোটিফিকেশন" },
      p: { to: "/admin/permissions", label: "পারমিশন" },
      t: { to: "/admin/staff-assignments", label: "স্টাফ অ্যাসাইনমেন্ট" },
      f: { to: "/admin/payment-ledger", label: "ফিনান্স" },
      g: { to: "/admin/settings", label: "সেটিংস" },
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen(o => !o); return;
      }
      if (e.key === "Escape") { setPaletteOpen(false); setShortcutsHelpOpen(false); return; }
      if (isTyping(e.target)) return;
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault(); setShortcutsHelpOpen(o => !o); return;
      }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        lastG = Date.now(); return;
      }
      if (Date.now() - lastG < 900) {
        const target = jumpMap[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target.to);
          toast.success(target.label, { duration: 900 });
          lastG = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => { if (paletteOpen) { setPaletteQuery(""); setPaletteHi(0); setTimeout(() => paletteInputRef.current?.focus(), 50); } }, [paletteOpen]);

  const filteredPalette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return flatItems.slice(0, 12);
    return flatItems.filter(i => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [flatItems, paletteQuery]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const mysqlAuth = getMySqlAuth();
    if (mysqlAuth) {
      setIsAdmin(mysqlAuth.user.type === "admin" || mysqlAuth.user.type === "super_admin");
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const { currentLabel, currentGroup, currentIcon } = useMemo(() => {
    for (const g of NAV) {
      const hit = g.items.find((i) => location.pathname.startsWith(i.to));
      if (hit) return { currentLabel: hit.label, currentGroup: g.label, currentIcon: hit.icon };
    }
    return { currentLabel: "অ্যাডমিন প্যানেল", currentGroup: "ড্যাশবোর্ড", currentIcon: <LayoutDashboard className="h-4 w-4" /> };
  }, [location.pathname]);

  // Announce active page changes (route → live region)
  const lastPathRef = useRef<string>("");
  useEffect(() => {
    if (!groupsInit) return; // skip first render hydration
    if (lastPathRef.current && lastPathRef.current !== location.pathname) {
      announce(`${currentLabel} ${A11Y.pageLoaded}, ${currentGroup} ${A11Y.group}`);
    }
    lastPathRef.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentLabel, currentGroup]);

  // Auto-collapse non-active groups on first load for cleaner sidebar
  useEffect(() => {
    if (groupsInit) return;
    const initial: Record<string, boolean> = {};
    NAV.forEach((g) => { if (g.label !== currentGroup) initial[g.label] = true; });
    setCollapsedGroups(initial);
    setGroupsInit(true);
  }, [currentGroup, groupsInit]);

  const initials = useMemo(() => {
    const src = user?.user_metadata?.full_name || user?.email || "অ্যাডমিন";
    return String(src).trim().slice(0, 1).toUpperCase();
  }, [user]);

  const dateStr = now.toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  const ThemeIcon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground mb-2">অ্যাক্সেস নেই</h1>
        <p className="text-muted-foreground text-sm mb-4">এই পেজটি শুধুমাত্র অ্যাডমিনদের জন্য।</p>
        <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</button>
      </div>
    );
  }

  const SidebarBody = (
    <nav
      ref={sidebarNavRef}
      onKeyDown={handleSidebarKeyDown}
      aria-label="ব্যাকএন্ড নেভিগেশন"
      className="flex-1 overflow-y-auto py-3 focus:outline-none"
    >
      {/* Search trigger */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors px-2.5 py-2 text-[12px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">খুঁজুন…</span>
            <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-card px-1 text-[9px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}
      {pinnedItems.length > 0 && !collapsed && (
        <div className="px-2 mb-2">
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 inline-flex items-center gap-1">
            <Pin className="h-2.5 w-2.5" /> পিন করা
          </p>
          <ul className="space-y-0.5 px-0">
            {pinnedItems.map(item => (
              <li key={`pin-${item.to}`}>
                <NavLink to={item.to} end
                  data-sidebar-link
                  data-group={item.group}
                  className={({ isActive }) =>
                  `group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                    isActive ? "bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-md shadow-primary/25 font-semibold" : "text-foreground/75 hover:bg-secondary"
                  }`}>
                  <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  <button onClick={(e) => { e.preventDefault(); togglePin(item.to); }}
                    aria-label={`${item.label} আনপিন করুন`}
                    className="opacity-60 hover:opacity-100 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><PinOff className="h-3 w-3" /></button>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      {NAV.map((group) => (
        <div key={group.label} className="mb-1">
          {!collapsed && (
            <button
              onClick={() => {
                const willCollapse = !collapsedGroups[group.label];
                setCollapsedGroups(c => ({ ...c, [group.label]: willCollapse }));
                announce(`${group.label} ${A11Y.group} ${willCollapse ? A11Y.collapsed : A11Y.expanded}`);
              }}
              data-sidebar-group
              data-group={group.label}
              aria-expanded={!collapsedGroups[group.label]}
              aria-controls={`sidebar-group-${group.label}`}
              className={cn(
                "w-full flex items-center justify-between px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                group.label === currentGroup ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
                {group.label}
                <span className="ml-1 text-[9px] font-mono text-muted-foreground/60 normal-case tracking-normal">{group.items.length}</span>
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${collapsedGroups[group.label] ? "-rotate-90" : ""}`} />
            </button>
          )}
          {collapsed && (
            <div className="px-2 pt-2 pb-1 flex justify-center">
              <span className={cn("h-1 w-6 rounded-full opacity-70", group.dot)} />
            </div>
          )}
          <AnimatePresence initial={false}>
            {!collapsedGroups[group.label] && (
              <motion.ul
                id={`sidebar-group-${group.label}`}
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                className="overflow-hidden space-y-0.5 px-2"
              >
                {group.items.map((item) => (
                  <li key={item.to} className="group relative">
                    <NavLink
                      to={item.to}
                      end
                      data-sidebar-link
                      data-group={group.label}
                      className={({ isActive }) =>
                        `relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                          isActive
                            ? `bg-gradient-to-r ${group.accent} text-white font-semibold shadow-md`
                            : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                        } ${collapsed ? "justify-center" : ""}`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    </NavLink>
                    {!collapsed && (
                      <button
                        onClick={() => togglePin(item.to)}
                        aria-label={pinned.includes(item.to) ? `${item.label} আনপিন করুন` : `${item.label} পিন করুন`}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${pinned.includes(item.to) ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 hover:opacity-100 focus-visible:opacity-100 text-muted-foreground"}`}
                        title={pinned.includes(item.to) ? "পিন সরান" : "পিন করুন"}
                      >
                        {pinned.includes(item.to) ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </button>
                    )}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border/50 bg-card/70 backdrop-blur-2xl transition-[width] duration-200 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <div className={`flex items-center gap-2.5 border-b border-border/40 px-3.5 h-14 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-emerald-500 to-emerald-600 text-primary-foreground shadow-md ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate leading-tight">অ্যাডমিন প্যানেল</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Yess Workspace</p>
            </div>
          )}
        </div>
        {SidebarBody}
        <div className="border-t border-border/40 p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            {!collapsed && <span>সংকুচিত</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[78%] max-w-[300px] bg-card/95 backdrop-blur-2xl border-r border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 px-3.5 h-14">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-md"><Sparkles className="h-4 w-4" /></div>
                <p className="text-[13px] font-bold">অ্যাডমিন প্যানেল</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-card/70 backdrop-blur-2xl">
          {/* Accent gradient line */}
          <div className="h-[3px] w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />

          <div className="flex items-center justify-between gap-2 px-3 md:px-5 py-2">
            {/* Left: mobile menu + breadcrumb + title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary"
                aria-label="মেনু খুলুন"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Section icon tile */}
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary ring-1 ring-primary/20 shrink-0 [&>*]:h-4 [&>*]:w-4">
                {currentIcon}
              </div>

              <div className="min-w-0">
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[10px] text-muted-foreground/80 leading-none">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Home className="h-2.5 w-2.5" />
                    <span className="hidden xs:inline">হোম</span>
                  </button>
                  <ChevRight className="h-2.5 w-2.5 opacity-50" />
                  <span className="hover:text-primary cursor-default">{currentGroup}</span>
                  <ChevRight className="h-2.5 w-2.5 opacity-50" />
                  <span className="text-foreground/80 font-medium truncate max-w-[100px] md:max-w-none">{currentLabel}</span>
                </nav>
                {/* Title */}
                <h1 className="font-heading text-[14px] md:text-[15px] font-bold text-foreground truncate mt-0.5 leading-tight">
                  {currentLabel}
                </h1>
              </div>
            </div>

            {/* Center: command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-[11px] text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" /> খুঁজুন
              <kbd className="ml-1 rounded border border-border bg-card px-1 text-[9px] font-mono">⌘K</kbd>
            </button>

            {/* Right: date/time + actions + role badge */}
            <div className="flex items-center gap-1">
              <button onClick={() => setPaletteOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground" title="খুঁজুন">
                <Search className="h-4 w-4" />
              </button>
              <button onClick={cycle} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground" title={`Theme: ${mode}`}>
                <ThemeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
                className="h-9 px-2 rounded-xl hover:bg-secondary text-[11px] font-bold text-muted-foreground inline-flex items-center gap-1"
                title="ভাষা"
              >
                <Languages className="h-3.5 w-3.5" />{language.toUpperCase()}
              </button>
              {/* Date / time pill */}
              <div className="hidden md:flex flex-col items-end leading-tight px-2 border-l border-border/40 ml-1">
                <span className="text-[11px] font-semibold text-foreground">{timeStr}</span>
                <span className="text-[10px] text-muted-foreground">{dateStr}</span>
              </div>

              <NotificationBell />

              {/* Role badge — sheba.xyz inspired */}
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 ring-1 ring-primary/25 pl-1 pr-2 md:pr-2.5 py-0.5 hover:ring-primary/40 transition-all">
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground flex items-center justify-center text-[11px] font-bold shadow-inner">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="hidden xl:flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold text-foreground inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    সুপার অ্যাডমিন
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
                    {user?.email || "admin"}
                  </span>
                </div>
              </div>

              <button
                onClick={async () => { await signOut(); navigate("/main-login", { replace: true }); }}
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                title="লগআউট"
                aria-label="লগআউট"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 bg-gradient-to-b from-transparent to-muted/20">
          <div className="mx-auto w-full max-w-[1440px] px-3 md:px-6 lg:px-8 py-5 md:py-6">
            {/* Page header — Laravel Nova-style */}
            <BackendPageHeader
              fallbackTitle={currentLabel}
              fallbackEyebrow={currentGroup}
            />

            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border)),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
              <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>

            {/* Workspace footer */}
            <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Yess Workspace
                </span>
                <span className="opacity-50">•</span>
                <span>v2026.04</span>
                <span className="opacity-50">•</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <button onClick={() => setShortcutsHelpOpen(true)} className="hover:text-foreground inline-flex items-center gap-1">
                  <kbd className="rounded border border-border bg-card px-1 font-mono text-[9px]">Shift + ?</kbd> শর্টকাট
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/60 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <CommandIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={paletteInputRef}
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteHi(h => Math.min(h + 1, filteredPalette.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteHi(h => Math.max(h - 1, 0)); }
                    else if (e.key === "Enter" && filteredPalette[paletteHi]) {
                      navigate(filteredPalette[paletteHi].to); setPaletteOpen(false);
                    }
                  }}
                  placeholder="পেজ, সেকশন বা একশন খুঁজুন…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded-md border border-border bg-card px-1.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {filteredPalette.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>
                ) : filteredPalette.map((item, i) => (
                  <button
                    key={item.to}
                    onMouseEnter={() => setPaletteHi(i)}
                    onClick={() => { navigate(item.to); setPaletteOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors text-left",
                      i === paletteHi ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-secondary"
                    )}
                  >
                    <span className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-primary [&>svg]:h-4 [&>svg]:w-4 shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.group}</p>
                    </div>
                    {i === paletteHi && <kbd className="rounded border border-border bg-card px-1.5 text-[9px] font-mono text-muted-foreground">↵</kbd>}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-3">
                  <span><kbd className="font-mono">↑↓</kbd> নেভিগেট</span>
                  <span><kbd className="font-mono">↵</kbd> খুলুন</span>
                </span>
                <span>Yess Workspace</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BackendShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
        shortcuts={[
          { keys: "⌘K / Ctrl+K", label: "কমান্ড প্যালেট" },
          { keys: "Shift + ?", label: "এই হেল্প" },
          { keys: "↑ / ↓", label: "সাইডবারে নেভিগেট" },
          { keys: "← / →", label: "গ্রুপ কোলাপ্স / এক্সপ্যান্ড" },
          { keys: "[ / ]", label: "আগের / পরের গ্রুপ" },
          { keys: "Home / End", label: "প্রথম / শেষ আইটেম" },
          { keys: "g d", label: "ড্যাশবোর্ড" },
          { keys: "g a", label: "অ্যানালিটিক্স" },
          { keys: "g b", label: "বুকিং" },
          { keys: "g r", label: "সেবা রিকোয়েস্ট" },
          { keys: "g u", label: "ইউজার ম্যানেজমেন্ট" },
          { keys: "g s", label: "সেবা CMS" },
          { keys: "g m", label: "সন্ধান মার্ট" },
          { keys: "g l", label: "সন্ধান ডিল" },
          { keys: "g j", label: "সন্ধান জবস" },
          { keys: "g n", label: "নোটিফিকেশন" },
          { keys: "g p", label: "পারমিশন" },
          { keys: "g t", label: "স্টাফ অ্যাসাইনমেন্ট" },
          { keys: "g f", label: "ফিনান্স / লেজার" },
          { keys: "g g", label: "সেটিংস" },
          { keys: "Esc", label: "বন্ধ করুন" },
        ]}
      />

      {/* ARIA live region — announces sidebar group/state and route changes for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
};

/**
 * Page header that consumes the BackendPageActions context.
 * Renders a Laravel Nova-style header with eyebrow, title, description,
 * primary/secondary action slots and an optional toolbar row underneath.
 */
const BackendPageHeader = ({
  fallbackTitle,
  fallbackEyebrow,
}: {
  fallbackTitle: React.ReactNode;
  fallbackEyebrow: React.ReactNode;
}) => {
  const meta = useBackendPageMeta();
  const eyebrow = meta.eyebrow ?? fallbackEyebrow;
  const title = meta.title ?? fallbackTitle;

  return (
    <div className="mb-4 md:mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70">
              {eyebrow}
            </p>
          )}
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground truncate leading-tight">
            {title}
          </h2>
          {meta.description && (
            <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2 max-w-2xl">
              {meta.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta.secondary && (
            <div className="flex items-center gap-1.5 [&_button]:h-9 [&_a]:h-9">
              {meta.secondary}
            </div>
          )}
          {meta.primary && (
            <div className="flex items-center gap-1.5 [&_button]:h-9 [&_a]:h-9">
              {meta.primary}
            </div>
          )}
          {!meta.primary && !meta.secondary && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border/60 px-2.5 py-1 font-mono">
                <kbd className="text-[9px]">⌘K</kbd>
              </span>
            </div>
          )}
        </div>
      </div>
      {meta.toolbar && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-2.5 py-2">
          {meta.toolbar}
        </div>
      )}
    </div>
  );
};

const AdminLayoutWithProviders = () => (
  <BackendPageActionsProvider>
    <AdminLayout />
  </BackendPageActionsProvider>
);

export default AdminLayoutWithProviders;