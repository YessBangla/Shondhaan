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
  Coins, Gift,
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
  ADMIN_ACCESS_BY_ROLE,
  canAccessAdminPath,
  getFirstAdminPathForRole,
  isAdminPanelRole,
} from "@/config/adminAccess";
import {
  BackendPageActionsProvider,
  useBackendPageMeta,
} from "@/contexts/BackendPageActionsContext";

const WALLET_API_BASE_URL = import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "";

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
      { to: "/admin/service", label: "বুকিং", icon: <Calendar className="h-4 w-4" /> },
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
      { to: "/admin/service-images", label: "সার্ভিসের ছবি", icon: <ImagePlus className="h-4 w-4" /> },
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
    label: "সার্ভিস অ্যাডমিন - একাউন্টস",
    accent: "from-sky-500 to-blue-600",
    dot: "bg-sky-500",
    items: [{ to: "/admin/service-admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> }],
  },
  {
    label: "ডিল অ্যাডমিন - একাউন্টস",
    accent: "from-amber-500 to-orange-600",
    dot: "bg-amber-500",
    items: [{ to: "/admin/deal-admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> }],
  },
  {
    label: "মার্ট অ্যাডমিন - একাউন্টস",
    accent: "from-emerald-500 to-teal-600",
    dot: "bg-teal-500",
    items: [{ to: "/admin/mart-admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> }],
  },
  {
    label: "জবস অ্যাডমিন - একাউন্টস",
    accent: "from-blue-500 to-indigo-600",
    dot: "bg-blue-500",
    items: [{ to: "/admin/job-admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> }],
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
    label: "রেফারেল",
    accent: "from-violet-500 to-purple-600",
    dot: "bg-violet-500",
    items: [
      { to: "/admin/referral-codes", label: "রেফারেল কোড", icon: <Gift className="h-4 w-4" /> },
      { to: "/admin/referral-settings", label: "রেফারেল সেটিংস", icon: <Settings className="h-4 w-4" /> },
      { to: "/admin/referral-transactions", label: "রিওয়ার্ড ট্রানজেকশন", icon: <Coins className="h-4 w-4" /> },
      { to: "/admin/referral-report", label: "রেফারেল রিপোর্ট", icon: <BarChart3 className="h-4 w-4" /> },
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

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Mart",
    accent: "from-emerald-500 to-teal-600",
    dot: "bg-teal-500",
    items: [
      { to: "/admin/mart-management?tab=orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=returns", label: "Returns", icon: <RefreshCw className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=rewards", label: "Mart Rewards", icon: <Coins className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=products", label: "Products", icon: <Package className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=vendors", label: "Vendors", icon: <Store className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=package", label: "Packages", icon: <Package className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=withdrawals", label: "Withdrawals", icon: <Banknote className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=transactions", label: "Package Transactions", icon: <Banknote className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=categories", label: "Categories", icon: <Grid3X3 className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=banners", label: "Banners", icon: <ImageIcon className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=coupons", label: "Coupons", icon: <Tag className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=mart-overview", label: "Mart Overview", icon: <ShoppingCart className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=kyc%20verification", label: "Seller KYC", icon: <ShieldCheck className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=delivery%20kyc%20verification", label: "Delivery KYC", icon: <Users className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=category%20add", label: "Category Setup", icon: <Grid3X3 className="h-4 w-4" /> },
      { to: "/admin/mart-management?tab=mart-banners", label: "Mart Banners", icon: <ImageIcon className="h-4 w-4" /> },
    ],
  },
  ...NAV
    .filter((group) => !group.items.some((item) => item.to === "/admin/mart-overview"))
    .map((group) => {
      if (group.items.some((item) => item.to === "/admin/job-listings")) {
        return {
          ...group,
          items: [
            ...group.items,
            { to: "/admin/jobs", label: "Job Applications", icon: <Briefcase className="h-4 w-4" /> },
          ],
        };
      }
      return { ...group, items: group.items.filter((item) => item.to !== "/admin/jobs") };
    }),
];

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

  const [adminWalletBalance, setAdminWalletBalance] = useState(0);

  const A11Y = {
    group: "গ্রুপ",
    item: "আইটেম",
    expanded: "এক্সপ্যান্ড করা হয়েছে",
    collapsed: "কোলাপ্স করা হয়েছে",
    of: "এর মধ্যে",
    pageLoaded: "পেজ লোড হয়েছে",
  } as const;

  const toBnDigits = (n: number | string) =>
    String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

  const normalizeLabel = (el: HTMLElement) => {
    const raw = el.getAttribute("aria-label") || el.textContent || "";
    return raw
      .replace(/\s+/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .replace(/\s+\d+$/, "")
      .trim();
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
    if (!userRole) return [];
    const allowed = ADMIN_ACCESS_BY_ROLE[userRole as keyof typeof ADMIN_ACCESS_BY_ROLE];
    if (!allowed || allowed === "*") return ADMIN_NAV;

    return ADMIN_NAV.map(group => ({
      ...group,
      items: group.items.filter(item => (allowed as string[]).includes(item.to.split("?")[0]))
    })).filter(group => group.items.length > 0);
  }, [userRole]);

  const isNavItemActive = (to: string) => {
    const [path, query] = to.split("?");
    if (location.pathname !== path) return false;
    if (!query) return !location.search;
    return new URLSearchParams(location.search).toString() === new URLSearchParams(query).toString();
  };

  const flatItems = useMemo(() => filteredNav.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))), [filteredNav]);
  const pinnedItems = useMemo(() => flatItems.filter(i => pinned.includes(i.to)), [flatItems, pinned]);

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
        const positional = pos >= 0 ? ` (${A11Y.item} ${toBnDigits(pos + 1)} ${A11Y.of} ${toBnDigits(total)})` : "";
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
      target?.focus();
      announceFocused(target);
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
      d: { to: "/admin/smart-dashboard", label: "ড্যাশবোর্ড" },
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
      e: { to: "/admin/referral-codes", label: "রেফারেল" },
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
    if (!authLoading && !user && !getMySqlAuth()) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const mysqlAuth = getMySqlAuth();
    const role = mysqlAuth?.user?.type as string | undefined;

    if (role && isAdminPanelRole(role)) {
      setIsAdmin(true);
      setUserRole(role);
    } else {
      setIsAdmin(false);
      setUserRole(null);
    }

    const fetchAdminWallet = async () => {
      const adminId = mysqlAuth?.user?.id;
      if (!adminId) return;
      try {
        const res = await fetch(`${WALLET_API_BASE_URL}/api/wallet/balance/${adminId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const walletData = data.wallet || data;
          setAdminWalletBalance(Number(walletData.cash_balance || 0));
        }
      } catch (err) {
        console.error("Failed to fetch admin wallet balance");
      }
    };

    if (role) fetchAdminWallet();
  }, [user, authLoading]);

  useEffect(() => {
    if (isAdmin && userRole && filteredNav.length > 0) {
      const currentPath = location.pathname;
      if (currentPath === "/admin" || !canAccessAdminPath(userRole, currentPath)) {
        const firstPath = getFirstAdminPathForRole(userRole) || filteredNav[0].items[0]?.to;
        if (firstPath) {
          navigate(firstPath, { replace: true });
        }
      }
    }
  }, [isAdmin, userRole, filteredNav, location.pathname, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const { currentLabel, currentGroup, currentIcon } = useMemo(() => {
    for (const g of filteredNav) {
      const hit = g.items.find((i) => isNavItemActive(i.to));
      if (hit) return { currentLabel: hit.label, currentGroup: g.label, currentIcon: hit.icon };
    }
    return { currentLabel: "অ্যাডমিন প্যানেল", currentGroup: "ড্যাশবোর্ড", currentIcon: <LayoutDashboard className="h-4 w-4" /> };
  }, [location.pathname, location.search, filteredNav]);

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
    setCollapsedGroups(initial);
    setGroupsInit(true);
  }, [currentGroup, groupsInit, filteredNav]);

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
        <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">হোমে ফিরুন</button>
      </div>
    );
  }

  const SidebarBody = (
    <nav
      ref={sidebarNavRef}
      onKeyDown={handleSidebarKeyDown}
      aria-label="ব্যাকএন্ড নেভিগেশন"
      className="flex-1 overflow-y-auto py-3 px-2 focus:outline-none custom-scrollbar"
    >
      {!collapsed && (
        <div className="px-1 mb-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors px-3 py-2 text-[13px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">খুঁজুন…</span>
            <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-card px-1.5 text-[10px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}
      {pinnedItems.length > 0 && !collapsed && (
        <div className="mb-3">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 inline-flex items-center gap-1.5">
            <Pin className="h-3 w-3" />পিন করা
          </p>
          <ul className="space-y-1">
            {pinnedItems.map(item => (
              <li key={`pin-${item.to}`}>
                <NavLink to={item.to} end
                  data-sidebar-link
                  data-group={item.group}
                  className={() =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                    isNavItemActive(item.to) ? "bg-gradient-to-r from-primary to-emerald-600 text-white shadow-md shadow-primary/25 font-semibold" : "text-foreground/75 hover:bg-secondary hover:translate-x-0.5 transition-transform"
                  }`}>
                  <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  <button onClick={(e) => { e.preventDefault(); togglePin(item.to); }}
                    aria-label={`${item.label} আনপিন করুন`}
                    className="opacity-60 hover:opacity-100 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><PinOff className="h-3.5 w-3.5" /></button>
                </NavLink>
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
              data-sidebar-group
              data-group={group.label}
              aria-expanded={!collapsedGroups[group.label]}
              aria-controls={`sidebar-group-${group.label}`}
              className={cn(
                "w-full flex items-center justify-between px-3 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                group.label === currentGroup ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
                {group.label}
                <span className="ml-1 text-[10px] font-mono text-muted-foreground/60 normal-case tracking-normal">{group.items.length}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsedGroups[group.label] ? "-rotate-90" : ""}`} />
            </button>
          )}
          {collapsed && (
            <div className="px-2 pt-3 pb-2 flex justify-center">
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
                      to={item.to}
                      end
                      data-sidebar-link
                      data-group={group.label}
                      className={() =>
                        `relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                          isNavItemActive(item.to)
                            ? `bg-gradient-to-r ${group.accent} text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5`
                            : "text-foreground/75 hover:bg-secondary hover:text-foreground hover:translate-x-0.5"
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
                        className={`absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${pinned.includes(item.to) ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 hover:opacity-100 focus-visible:opacity-100 text-muted-foreground"}`}
                        title={pinned.includes(item.to) ? "পিন সরান" : "পিন করুন"}
                      >
                        {pinned.includes(item.to) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
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
      <aside
        className={`hidden md:flex flex-col transition-[width] duration-300 ease-in-out border-r border-border/40 bg-card/50 backdrop-blur-sm ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <div className={`flex items-center gap-3 border-b border-border/40 px-4 h-16 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-emerald-500 to-emerald-600 text-white shadow-md ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">অ্যাডমিন প্যানেল</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Yess Workspace</p>
            </div>
          )}
        </div>
        {SidebarBody}
        <div className="border-t border-border/40 p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>সংকুচিত করুন</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[80%] max-w-[300px] bg-card/95 backdrop-blur-2xl border-r border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 px-4 h-16">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-md"><Sparkles className="h-4 w-4" /></div>
                <p className="text-sm font-bold">অ্যাডমিন প্যানেল</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-card/70 backdrop-blur-2xl">
          <div className="h-[3px] w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />

          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary"
                aria-label="মেনু খুলুন"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary ring-1 ring-primary/20 shrink-0 [&>*]:h-4 [&>*]:w-4">
                {currentIcon}
              </div>

              <div className="min-w-0">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 leading-none mb-1">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Home className="h-3 w-3" />
                    <span className="hidden xs:inline">হোম</span>
                  </button>
                  <ChevRight className="h-3 w-3 opacity-50" />
                  <span className="hover:text-primary cursor-default">{currentGroup}</span>
                  <ChevRight className="h-3 w-3 opacity-50" />
                  <span className="text-foreground/80 font-medium truncate max-w-[120px] md:max-w-none">{currentLabel}</span>
                </nav>
                <h1 className="font-heading text-base md:text-lg font-bold text-foreground truncate leading-tight">
                  {currentLabel}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <NavLink 
                to="/admin/accounts" 
                className="hidden sm:flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 ring-1 ring-primary/25 px-3 py-1.5 hover:ring-primary/40 hover:shadow-sm transition-all"
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  ৳ {adminWalletBalance.toLocaleString('bn-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </NavLink>

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
              <div className="hidden md:flex flex-col items-end leading-tight px-2 border-l border-border/40 ml-1">
                <span className="text-[12px] font-semibold text-foreground">{timeStr}</span>
                <span className="text-[11px] text-muted-foreground">{dateStr}</span>
              </div>

              <NotificationBell />

              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 ring-1 ring-primary/25 pl-1 pr-2 md:pr-3 py-0.5 hover:ring-primary/40 hover:shadow-sm transition-all">
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-emerald-600 text-white flex items-center justify-center text-[12px] font-bold shadow-inner">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="hidden xl:flex flex-col leading-tight">
                  <span className="text-[11px] font-semibold text-foreground inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    {userRole ? userRole.replace('_', ' ') : 'Admin'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
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
          <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6">
            <BackendPageHeader
              fallbackTitle={currentLabel}
              fallbackEyebrow={currentGroup}
            />

            <div className="mt-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>

            <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" /> Yess Workspace
                </span>
                <span className="opacity-50">•</span>
                <span>v2026.04</span>
                <span className="opacity-50">•</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> All systems operational</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <button onClick={() => setShortcutsHelpOpen(true)} className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">Shift + ?</kbd> শর্টকাট
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-xl rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/60 shadow-2xl overflow-hidden ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
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
                <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
                {filteredPalette.length === 0 ? (
                  <p className="text-center py-10 text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>
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
                      <p className="text-[11px] text-muted-foreground truncate">{item.group}</p>
                    </div>
                    {i === paletteHi && <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">↵</kbd>}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 text-[11px] text-muted-foreground bg-card/50">
                <span className="flex items-center gap-4">
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
          { keys: "g r", label: "সার্ভিস রিকোয়েস্ট" },
          { keys: "g u", label: "ইউজার ম্যানেজমেন্ট" },
          { keys: "g s", label: "সার্ভিস CMS" },
          { keys: "g m", label: "সন্ধান মার্ট" },
          { keys: "g l", label: "সন্ধান ডিল" },
          { keys: "g j", label: "সন্ধান জবস" },
          { keys: "g n", label: "নোটিফিকেশন" },
          { keys: "g p", label: "পারমিশন" },
          { keys: "g t", label: "স্টাফ অ্যাসাইনমেন্ট" },
          { keys: "g f", label: "ফিনান্স / লেজার" },
          { keys: "g e", label: "রেফারেল" },
          { keys: "g g", label: "সেটিংস" },
          { keys: "Esc", label: "বন্ধ করুন" },
        ]}
      />
      
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
    <div className="w-full">
      {meta.toolbar && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-3 py-2.5 shadow-sm">
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