import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, Calendar, FileText, Wallet, Package, ImagePlus,
  Grid3X3, Percent, Image as ImageIcon, LayoutList, ShoppingCart, Handshake,
  Briefcase, Store, MessageSquare, Bot, Bell, MapPinCheck, Trophy, Star, Tag,
  Banknote, Users, ShieldCheck, Settings, ChevronLeft, ChevronRight,
  RefreshCw, Menu, X, LogOut, Home, ChevronRight as ChevRight, Search, Sparkles,
  ScrollText, BookOpenCheck, Inbox, LifeBuoy,
  UserPlus, Sun, Moon, Monitor, Languages, Pin, PinOff, Command as CommandIcon,
  ChevronDown, Wrench,
} from "lucide-react";
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
import WorkspaceDashboard from "./WorkspaceDashboard";
type NavItem = { to: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[]; accent: string; dot: string };
const NAV: NavGroup[] = [
  {
    label: "ড্যাশবোর্ড",
    accent: "from-emerald-500 to-emerald-600",
    dot: "bg-emerald-500",
    items: [
      { to: "/admin/service", label: "সার্ভিস ড্যাশবোর্ড", icon: <Wrench className="h-4 w-4" /> },
      { to: "/admin/smart-dashboard", label: "স্মার্ট ড্যাশবোর্ড", icon: <Sparkles className="h-4 w-4" /> },
      { to: "/admin/analytics", label: "অ্যানালিটিক্স", icon: <BarChart3 className="h-4 w-4" /> },
      { to: "/admin/bookings", label: "বুকিং", icon: <Calendar className="h-4 w-4" /> },
      { to: "/admin/requests", label: "সার্ভিস রিকোয়েস্ট", icon: <FileText className="h-4 w-4" /> },
      { to: "/admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> },
      { to: "/admin/approval-queue", label: "অনুমোদন কিউ", icon: <Inbox className="h-4 w-4" /> },
      { to: "/admin/disputes", label: "অভিযোগ ও রিফান্ড", icon: <LifeBuoy className="h-4 w-4" /> },
    ],
  },
  {
    label: "সার্ভিস CMS",
    accent: "from-sky-500 to-blue-600",
    dot: "bg-sky-500",
    items: [
      { to: "/admin/services", label: "সার্ভিস", icon: <Package className="h-4 w-4" /> },
      { to: "/admin/service-images", label: "সার্ভিসর ছবি", icon: <ImagePlus className="h-4 w-4" /> },
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

const ROLE_ALLOWED_PATHS: Record<string, Set<string>> = {
  service_admin: new Set([
    "/admin/service", "/admin/bookings", "/admin/requests", "/admin/services",
    "/admin/service-images", "/admin/categories", "/admin/offers", "/admin/banners",
    "/admin/sections", "/admin/contacts", "/admin/chat-history", "/admin/notifications", "/admin/reviews",
  ]),
  deal_admin: new Set([
    "/admin/deal-overview", "/admin/deal-categories", "/admin/contacts",
    "/admin/chat-history", "/admin/notifications", "/admin/reviews",
  ]),
};

const isSameOrChildPath = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

const canRoleAccessPath = (role: string | null, pathname: string) => {
  if (!role || !ROLE_ALLOWED_PATHS[role]) return true;
  const allowed = ROLE_ALLOWED_PATHS[role];
  return Array.from(allowed).some((path) => isSameOrChildPath(pathname, path));
};

const AdminLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, cycle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  const A11Y = {
    group: "গ্রুপ", item: "আইটেম", expanded: "এক্সপ্যান্ড করা হয়েছে",
    collapsed: "কোলাপ্স করা হয়েছে", of: "এর মধ্যে", pageLoaded: "পেজ লোড হয়েছে",
  } as const;

  const toBnDigits = (n: number | string) =>
    String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

  const normalizeLabel = (el: HTMLElement) => {
    const raw = el.getAttribute("aria-label") || el.textContent || "";
    return raw.replace(/\s+/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\s+\d+$/, "").trim();
  };

  const [announcement, setAnnouncement] = useState("");
  const announceTimer = useRef<number | null>(null);
  const announce = (msg: string) => {
    if (announceTimer.current) window.clearTimeout(announceTimer.current);
    setAnnouncement("");
    announceTimer.current = window.setTimeout(() => setAnnouncement(msg), 30);
  };
  useEffect(() => () => { if (announceTimer.current) window.clearTimeout(announceTimer.current); }, []);

  const PIN_KEY = "admin_panel_pins";
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(PIN_KEY, JSON.stringify(pinned)); }, [pinned]);
  const togglePin = (path: string) => setPinned((p) => p.includes(path) ? p.filter(x => x !== path) : [...p, path]);

  const filteredNav = useMemo(() => {
    if (userRole && ROLE_ALLOWED_PATHS[userRole]) {
      const allowedPaths = ROLE_ALLOWED_PATHS[userRole];
      return NAV
        .map((group) => ({ ...group, items: group.items.filter((item) => allowedPaths.has(item.to)) }))
        .filter((group) => group.items.length > 0);
    }
    return NAV;
  }, [userRole]);

  const flatItems = useMemo(() => filteredNav.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))), [filteredNav]);
  const pinnedItems = useMemo(() => flatItems.filter(i => pinned.includes(i.to)), [flatItems, pinned]);

  const focusableSidebarLinks = () => {
    const root = sidebarNavRef.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(root.querySelectorAll<HTMLElement>('a[data-sidebar-link], button[data-sidebar-group]')).filter((el) => !el.hasAttribute('data-disabled'));
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
        const positional = pos >= 0 ? ` (${A11Y.item} ${toBnDigits(pos + 1)} ${A11Y.of} ${toBnDigits(total)})` : "";
        announce(`${label}${groupLabel ? `, ${groupLabel} ${A11Y.group}` : ""}${positional}`);
      }
    };
    const focusAt = (i: number) => {
      const el = items[(i + items.length) % items.length];
      el?.focus(); announceFocused(el);
    };

    if (e.key === "ArrowDown") { e.preventDefault(); focusAt(idx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(idx - 1); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); announceFocused(items[0]); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); announceFocused(items[items.length - 1]); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const groupLabel = active?.getAttribute("data-group");
      if (groupLabel) {
        e.preventDefault();
        const willCollapse = e.key === "ArrowLeft";
        setCollapsedGroups((c) => ({ ...c, [groupLabel]: willCollapse }));
        announce(`${groupLabel} ${A11Y.group} ${willCollapse ? A11Y.collapsed : A11Y.expanded}`);
      }
    } else if (e.key === "[" || e.key === "]") {
      const headers = items.filter((el) => el.hasAttribute("data-sidebar-group"));
      if (!headers.length) return;
      e.preventDefault();
      const currentGroupLabel = active?.getAttribute("data-group");
      let hIdx = headers.findIndex((h) => h.getAttribute("data-group") === currentGroupLabel);
      if (hIdx === -1) hIdx = 0;
      const next = e.key === "]" ? hIdx + 1 : hIdx - 1;
      const target = headers[(next + headers.length) % headers.length];
      target?.focus(); announceFocused(target);
    }
  };

  useEffect(() => {
    let lastG = 0;
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (t as HTMLElement).isContentEditable;
    };
    const jumpMap: Record<string, { to: string; label: string }> = {
      d: { to: userRole === "service_admin" ? "/admin/service" : userRole === "deal_admin" ? "/admin/deal-overview" : "/admin/smart-dashboard", label: userRole === "service_admin" ? "সার্ভিস ড্যাশবোর্ড" : userRole === "deal_admin" ? "ডিল ড্যাশবোর্ড" : "ড্যাশবোর্ড" },
      a: { to: "/admin/analytics", label: "অ্যানালিটিক্স" },
      b: { to: "/admin/bookings", label: "বুকিং" },
      r: { to: "/admin/requests", label: "সার্ভিস রিকোয়েস্ট" },
      u: { to: "/admin/users", label: "ইউজার" },
      s: { to: "/admin/services", label: "সার্ভিস" },
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); return; }
      if (e.key === "Escape") { setPaletteOpen(false); setShortcutsHelpOpen(false); return; }
      if (isTyping(e.target)) return;
      if (e.key === "?" && e.shiftKey) { e.preventDefault(); setShortcutsHelpOpen(o => !o); return; }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) { lastG = Date.now(); return; }
      if (Date.now() - lastG < 900) {
        const target = jumpMap[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          if (!canRoleAccessPath(userRole, target.to)) { toast.error("এই রোলে শুধু নির্দিষ্ট পেজ দেখা যাবে"); lastG = 0; return; }
          navigate(target.to); toast.success(target.label, { duration: 900 }); lastG = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, userRole]);

  useEffect(() => { if (paletteOpen) { setPaletteQuery(""); setPaletteHi(0); setTimeout(() => paletteInputRef.current?.focus(), 50); } }, [paletteOpen]);

  const filteredPalette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return flatItems.slice(0, 12);
    return flatItems.filter(i => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [flatItems, paletteQuery]);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!authLoading && !user) navigate("/main-login", { replace: true }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const mysqlAuth = getMySqlAuth();
    if (mysqlAuth) {
      const type = mysqlAuth.user.type;
      if (["admin", "super_admin", "service_admin", "deal_admin"].includes(type)) { setIsAdmin(true); setUserRole(type); } 
      else { setIsAdmin(false); }
      return;
    }
    setIsAdmin(false);
  }, [user]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    if (!userRole || !ROLE_ALLOWED_PATHS[userRole]) return;
    if (canRoleAccessPath(userRole, location.pathname)) return;
    const redirectPath = userRole === "service_admin" ? "/admin/service" : userRole === "deal_admin" ? "/admin/deal-overview" : "/admin";
    navigate(redirectPath, { replace: true });
  }, [location.pathname, navigate, userRole]);

  const { currentLabel, currentGroup, currentIcon } = useMemo(() => {
    for (const g of filteredNav) {
      const hit = g.items.find((i) => isSameOrChildPath(location.pathname, i.to));
      if (hit) return { currentLabel: hit.label, currentGroup: g.label, currentIcon: hit.icon };
    }
    return { currentLabel: "অ্যাডমিন প্যানেল", currentGroup: "ড্যাশবোর্ড", currentIcon: <LayoutDashboard className="h-4 w-4" /> };
  }, [location.pathname, filteredNav]);

  const lastPathRef = useRef<string>("");
  useEffect(() => {
    if (!groupsInit) return; 
    if (lastPathRef.current && lastPathRef.current !== location.pathname) {
      announce(`${currentLabel} ${A11Y.pageLoaded}, ${currentGroup} ${A11Y.group}`);
    }
    lastPathRef.current = location.pathname;
  }, [location.pathname, currentLabel, currentGroup, groupsInit]);

  useEffect(() => {
    if (groupsInit) return;
    const initial: Record<string, boolean> = {};
    filteredNav.forEach((g) => { if (g.label !== currentGroup) initial[g.label] = true; });
    setCollapsedGroups(initial); setGroupsInit(true);
  }, [currentGroup, groupsInit, filteredNav]);

  const initials = useMemo(() => {
    const src = user?.user_metadata?.full_name || user?.email || "অ্যাডমিন";
    return String(src).trim().slice(0, 1).toUpperCase();
  }, [user]);

  const dateStr = now.toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  const ThemeIcon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;
  
  const roleBadgeText = userRole === "service_admin" ? "সার্ভিস অ্যাডমিন" : userRole === "deal_admin" ? "ডিল অ্যাডমিন" : "সুপার অ্যাডমিন";

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
        <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">হোমে ফিরুন</button>
      </div>
    );
  }

  if (location.pathname === "/admin") {
    if (userRole === "service_admin") return <Navigate to="/admin/service" replace />;
    if (userRole === "deal_admin") return <Navigate to="/admin/deal-overview" replace />;
  }

  // Sidebar Body (Clean, Light POS-style)
  const SidebarBody = (
    <nav
      ref={sidebarNavRef}
      onKeyDown={handleSidebarKeyDown}
      aria-label="ব্যাকএন্ড নেভিগেশন"
      className="flex-1 overflow-y-auto py-4 px-3 focus:outline-none scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
    >
      {!collapsed && (
        <div className="mb-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card pl-3 pr-2 py-2 text-[12.5px] outline-none focus:border-primary/50 transition-colors hover:shadow-sm"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-left text-muted-foreground">খুঁজুন…</span>
            <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">⌘K</kbd>
          </button>
        </div>
      )}
      {pinnedItems.length > 0 && !collapsed && (
        <div className="mb-4">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 inline-flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> পিন করা
          </p>
          <ul className="space-y-1">
            {pinnedItems.map(item => (
              <li key={`pin-${item.to}`} className="group relative">
                <NavLink to={item.to} end
                  data-sidebar-link data-group={item.group}
                  className={({ isActive }) => cn(
                    "relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-[14px] font-semibold transition-all duration-200 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                    isActive 
                      ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                      : "text-foreground/70 hover:bg-card hover:shadow-sm hover:text-foreground border-transparent"
                  )}>
                  {({ isActive }) => (
                    <>
                      <span className={cn("shrink-0 transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]", isActive ? "text-primary" : "text-foreground/70 group-hover:text-primary")}>{item.icon}</span>
                      <span className="truncate flex-1 text-left tracking-tight">{item.label}</span>
                    </>
                  )}
                </NavLink>
                <button onClick={(e) => { e.preventDefault(); togglePin(item.to); }} aria-label={`${item.label} আনপিন করুন`} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-60 hover:opacity-100 text-muted-foreground hover:bg-secondary">
                  <PinOff className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {filteredNav.map((group) => (
        <div key={group.label} className="mb-2">
          {!collapsed && (
            <button
              onClick={() => {
                const willCollapse = !collapsedGroups[group.label];
                setCollapsedGroups(c => ({ ...c, [group.label]: willCollapse }));
                announce(`${group.label} ${A11Y.group} ${willCollapse ? A11Y.collapsed : A11Y.expanded}`);
              }}
              data-sidebar-group data-group={group.label}
              aria-expanded={!collapsedGroups[group.label]} aria-controls={`sidebar-group-${group.label}`}
              className={cn(
                "w-full flex items-center justify-between px-2 pt-3 pb-2 text-[11px] font-bold uppercase tracking-wider hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                group.label === currentGroup ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
                {group.label}
                <span className="ml-1 text-[9px] font-mono text-muted-foreground/60 normal-case tracking-normal">{group.items.length}</span>
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsedGroups[group.label] && "-rotate-90")} />
            </button>
          )}
          {collapsed && (
            <div className="px-2 pt-3 pb-1 flex justify-center">
              <span className={cn("h-1 w-6 rounded-full opacity-70", group.dot)} />
            </div>
          )}
          <AnimatePresence initial={false}>
            {!collapsedGroups[group.label] && (
              <motion.ul
                id={`sidebar-group-${group.label}`}
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden space-y-1"
              >
                {group.items.map((item) => (
                  <li key={item.to} className="group relative">
                    <NavLink
                      to={item.to} end
                      data-sidebar-link data-group={group.label}
                      className={({ isActive }) => cn(
                        "relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-[14px] font-semibold transition-all duration-200 outline-none",
                        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                        collapsed ? "justify-center px-0 py-3 h-12 w-12 mx-auto" : "px-3 py-2.5",
                        isActive
                          ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                          : "text-foreground/70 hover:bg-card hover:shadow-sm hover:text-foreground border-transparent"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span className={cn("shrink-0 transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]", isActive ? "text-primary" : "text-foreground/70 group-hover:text-primary")}>
                            {item.icon}
                          </span>
                          {!collapsed && <span className="truncate flex-1 text-left tracking-tight">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                    {!collapsed && (
                      <button
                        onClick={() => togglePin(item.to)}
                        aria-label={pinned.includes(item.to) ? `${item.label} আনপিন করুন` : `${item.label} পিন করুন`}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all [&>svg]:h-3.5 [&>svg]:w-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                          pinned.includes(item.to) ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:bg-secondary"
                        )}
                        title={pinned.includes(item.to) ? "পিন সরান" : "পিন করুন"}
                      >
                        {pinned.includes(item.to) ? <PinOff /> : <Pin />}
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
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/60 bg-primary/[0.03] backdrop-blur-xl transition-[width] duration-300 ease-in-out z-30 sticky top-0 h-screen",
          collapsed ? "w-[76px]" : "w-[270px]"
        )}
      >
        <div className={cn("flex items-center gap-3 border-b border-border/60 px-4 h-16", collapsed && "justify-center px-0")}>
          <div className="h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md ring-1 ring-primary/30 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-foreground leading-tight truncate tracking-tight">অ্যাডমিন প্যানেল</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">Shondhaan Workspace</p>
            </div>
          )}
        </div>
        {SidebarBody}
        <div className="border-t border-border/60 p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "hidden md:flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors",
              collapsed ? "justify-center" : "justify-start"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : (<><ChevronLeft className="h-4 w-4" /> সংকুচিত</>)}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-[70] w-[85%] max-w-[320px] bg-card/95 backdrop-blur-2xl border-r border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 h-16">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md ring-1 ring-primary/30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-[15px] font-bold">অ্যাডমিন প্যানেল</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {SidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-16">
           
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => setMobileOpen(true)} className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary text-foreground transition-colors" aria-label="মেনু খুলুন">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shrink-0 [&>*]:h-5 [&>*]:w-5 shadow-sm">
                {currentIcon}
              </div>
              <div className="min-w-0">
                <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/80 leading-none font-medium">
                  <button onClick={() => navigate("/")} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <Home className="h-3 w-3" /> হোম
                  </button>
                  <ChevRight className="h-3 w-3 opacity-50" />
                  <span className="hover:text-primary cursor-default">{currentGroup}</span>
                  <ChevRight className="h-3 w-3 opacity-50" />
                  <span className="text-foreground/80 font-medium truncate max-w-[100px] md:max-w-none">{currentLabel}</span>
                </nav>
                <h1 className="text-[16px] md:text-[18px] font-bold text-foreground truncate leading-tight mt-1 tracking-tight">{currentLabel}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative hidden lg:flex items-center w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  onClick={() => setPaletteOpen(true)}
                  readOnly
                  placeholder="খুঁজুন…"
                  aria-label="মডিউল খুঁজুন"
                  className="w-full rounded-xl border border-border/60 bg-card pl-9 pr-3 py-2 text-[12.5px] outline-none focus:border-primary/50 cursor-pointer hover:shadow-sm transition-shadow"
                />
              </div>
              <button onClick={() => setPaletteOpen(true)} className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground transition-colors" title="খুঁজুন (⌘K)">
                <Search className="h-5 w-5" />
              </button>
              <button onClick={cycle} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={`Theme: ${mode}`}>
                <ThemeIcon className="h-5 w-5" />
              </button>
              <button onClick={() => setLanguage(language === "bn" ? "en" : "bn")} className="h-10 px-3 rounded-xl hover:bg-secondary text-[12px] font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors" title="ভাষা পরিবর্তন">
                <Languages className="h-4 w-4" />{language.toUpperCase()}
              </button>
              <div className="h-6 w-px bg-border/60 hidden sm:block mx-1"></div>
              <NotificationBell />
              <div className="flex items-center gap-2 rounded-full bg-card border border-border/60 pl-1 pr-2 md:pr-2.5 py-0.5 hover:shadow-sm transition-shadow">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold shadow-inner">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="hidden xl:flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold text-foreground inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-primary" /> {roleBadgeText}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{user?.email || "admin"}</span>
                </div>
              </div>
              <button
                onClick={async () => { await signOut(); navigate("/main-login", { replace: true }); }}
                className="flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                title="লগআউট" aria-label="লগআউট"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          {/* POS-style Main Content Container */}
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 py-6 md:py-8 space-y-6">
            <BackendPageHeader fallbackTitle={currentLabel} fallbackEyebrow={currentGroup} userRole={userRole} />
            <section className="rounded-3xl border border-border/60 bg-primary/[0.04] p-4 md:p-6">
              <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </section>
            <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Shondhaan Workspace
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

      {/* Command Palette (Restyled to match POS Workspace) */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-md"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: -10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={paletteInputRef} value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteHi(h => Math.min(h + 1, filteredPalette.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteHi(h => Math.max(h - 1, 0)); }
                    else if (e.key === "Enter" && filteredPalette[paletteHi]) { navigate(filteredPalette[paletteHi].to); setPaletteOpen(false); }
                  }}
                  placeholder="পেজ, সেকশন বা একশন খুঁজুন…"
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70 font-medium"
                />
                <kbd className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-mono text-muted-foreground">ESC</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {filteredPalette.length === 0 ? (
                  <p className="text-center py-10 text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>
                ) : filteredPalette.map((item, i) => (
                  <button
                    key={item.to} onMouseEnter={() => setPaletteHi(i)}
                    onClick={() => { navigate(item.to); setPaletteOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all text-left",
                      i === paletteHi ? "bg-primary/10 text-primary border-primary/20" : "text-foreground/80 hover:bg-card hover:shadow-sm border-transparent"
                    )}
                  >
                    <span className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4 transition-colors",
                      i === paletteHi ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    )}>{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.group}</p>
                    </div>
                    {i === paletteHi && <kbd className="rounded border border-border bg-card px-1.5 text-[9px] font-mono text-muted-foreground">↵</kbd>}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/60 text-[10px] text-muted-foreground bg-primary/[0.02]">
                <span className="font-medium">Shondhaan Workspace</span>
                <div className="flex items-center gap-4">
                  <span>Theme: <b className="text-foreground">{mode}</b></span>
                  <span>Lang: <b className="text-foreground">{language}</b></span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BackendShortcutsHelp
        open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)}
        shortcuts={[
          { keys: "⌘K / Ctrl+K", label: "কমান্ড প্যালেট" }, { keys: "Shift + ?", label: "এই হেল্প" },
          { keys: "↑/↓", label: "সাইডবারে নেভিগেট" }, { keys: "←/→", label: "গ্রুপ কোলাপ্স / এক্সপ্যান্ড" },
          { keys: "[ / ]", label: "আগের / পরের গ্রুপ" }, { keys: "Home / End", label: "প্রথম / শেষ আইটেম" },
          { keys: "g d", label: "ড্যাশবোর্ড" }, { keys: "g a", label: "অ্যানালিটিক্স" },
          { keys: "g b", label: "বুকিং" }, { keys: "g r", label: "সার্ভিস রিকোয়েস্ট" },
          { keys: "g u", label: "ইউজার ম্যানেজমেন্ট" }, { keys: "g s", label: "সার্ভিস CMS" },
          { keys: "g m", label: "সন্ধান মার্ট" }, { keys: "g l", label: "সন্ধান ডিল" },
          { keys: "g j", label: "সন্ধান জবস" }, { keys: "g n", label: "নোটিফিকেশন" },
          { keys: "g p", label: "পারমিশন" }, { keys: "g t", label: "স্টাফ অ্যাসাইনমেন্ট" },
          { keys: "g f", label: "ফিনান্স / লেজার" }, { keys: "g g", label: "সেটিংস" },
          { keys: "Esc", label: "বন্ধ করুন" },
        ]}
      />
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};
const BackendPageHeader = ({ fallbackTitle, fallbackEyebrow, userRole }: { fallbackTitle: React.ReactNode; fallbackEyebrow: React.ReactNode; userRole?: string }) => {
  const meta = useBackendPageMeta();
  const eyebrow = meta.eyebrow ?? fallbackEyebrow;
  const title = meta.title ?? fallbackTitle;
  return (
    <div className="">
      <WorkspaceDashboard userRole={userRole} />
      {meta.toolbar && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2">
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