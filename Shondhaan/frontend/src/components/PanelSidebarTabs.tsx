import { useState, useEffect, useMemo, useCallback, ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Menu, Search, Sun, Moon, Monitor,
  Languages, Pin, Globe, PinOff, Command as CommandIcon, Sparkles, ChevronDown,
  Home, RotateCcw, LogOut, Wallet, Plus, Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { WALLET_HIDDEN_ROLES } from "@/config/roles";
import NotificationBell from "@/components/NotificationBell";
import BackendShortcutsHelp from "@/components/BackendShortcutsHelp";
import PanelHero from "@/components/PanelHero";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply, faHouse } from "@fortawesome/free-solid-svg-icons";
import { useReferralCode } from "@/hooks/useReferralCode";

const ReferralCode = () => {
  const referralCode = useReferralCode();
  return <p>{referralCode}</p>;
};

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SidebarItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
  badge?: number | string;
}

export interface PanelHeroConfig {
  title: string;
  subtitle?: string;
  badge?: { icon?: React.ReactNode; label: string };
  gradient?: string;
  rightIcon?: React.ReactNode;
  hideOnTabs?: string[];
}

interface PanelSidebarTabsProps {
  items: SidebarItem[];
  defaultValue: string;
  children: (activeTab: string, setActiveTab: (tab: string) => void) => ReactNode;
  panelTitle?: string;
  panelIcon?: React.ReactNode;
  profileImageUrl?: string;
  hero?: PanelHeroConfig;
  offsetForDesktopMegaMenu?: boolean;
  embedded?: boolean;
  /** Tabs that should fill the entire viewport (no wrapper scroll, no hero) */
  fullViewportTabs?: string[];
}

const customScrollbar = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-500/50 [&::-webkit-scrollbar]:transition-colors";

const WALLET_API_BASE_URL = import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "";

const PanelSidebarTabs = ({
  items,
  defaultValue,
  children,
  panelTitle,
  panelIcon,
  profileImageUrl,
  hero,
  offsetForDesktopMegaMenu = false,
  embedded = false,
  fullViewportTabs = [],
}: PanelSidebarTabsProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { mode, cycle } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [activeTab, setActiveTabState] = useState(defaultValue);
  const requestedTab = searchParams.get("tab");

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletCoins, setWalletCoins] = useState(0);

  const mysqlAuthUser = useMemo(() => getMySqlAuth()?.user, []);
  const userRole =
    (mysqlAuthUser as any)?.type ||
    (mysqlAuthUser as any)?.role ||
    (user as any)?.user_metadata?.role ||
    "";
  const isWalletHiddenRole = WALLET_HIDDEN_ROLES.has(userRole);

  useEffect(() => {
    if (!requestedTab) return;
    if (items.some((item) => item.value === requestedTab)) {
      setActiveTabState(requestedTab);
    }
  }, [requestedTab, items]);

  const collapseKey = `panel_collapsed_${panelTitle || "default"}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(collapseKey) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(collapseKey, collapsed ? "1" : "0"); } catch {}
  }, [collapseKey, collapsed]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupsInit, setGroupsInit] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Whether current tab should fill the full viewport
  const isFullViewport = fullViewportTabs.includes(activeTab);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.id) return;
      try {
        const auth = getMySqlAuth();
        const res = await fetch(`${WALLET_API_BASE_URL}/api/wallet/balance/${user.id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const walletData = data.wallet || data;
          setWalletBalance(Number(walletData.cash_balance || 0));
          setWalletCoins(Number(walletData.coin_balance || 0));
        }
      } catch (error) {
        console.error("Failed to fetch wallet balance");
      }
    };
    fetchWallet();
  }, [user?.id]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node))
        setProfileMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileMenuOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [profileMenuOpen]);

  const pinKey = `panel_pins_${panelTitle || "default"}`;
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(pinKey) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(pinKey, JSON.stringify(pinned)); }, [pinKey, pinned]);

  const recentKey = `panel_recent_${panelTitle || "default"}`;
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(recentKey, JSON.stringify(recent)); } catch {}
  }, [recentKey, recent]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea && e.storageArea !== localStorage) return;
      if (e.key === collapseKey) {
        const next = e.newValue === "1";
        setCollapsed((prev) => (prev === next ? prev : next));
        return;
      }
      if (e.key === pinKey) {
        try {
          const next: string[] = e.newValue ? JSON.parse(e.newValue) : [];
          setPinned(Array.isArray(next) ? next : []);
        } catch {}
        return;
      }
      if (e.key === null) { setCollapsed(false); setPinned([]); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [collapseKey, pinKey]);

  const togglePin = (value: string) => {
    setPinned((p) => (p.includes(value) ? p.filter((x) => x !== value) : [...p, value]));
  };

  const groups = useMemo(() => {
    const out: { label: string | null; items: SidebarItem[] }[] = [];
    let cur: string | null | undefined = undefined;
    items.forEach((item) => {
      if (item.group !== cur) {
        cur = item.group;
        out.push({ label: item.group || null, items: [] });
      }
      out[out.length - 1].items.push(item);
    });
    return out;
  }, [items]);

  const pinnedItems = useMemo(() => items.filter((i) => pinned.includes(i.value)), [items, pinned]);

  const handleSelect = useCallback((value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
    setActiveTabState(value);
    setRecent((prev) => {
      const next = prev.filter((v) => v !== value);
      next.unshift(value);
      return next.slice(0, 10);
    });
    setMobileOpen(false);
  }, [setSearchParams]);

  const activeItem = items.find((i) => i.value === activeTab);
  const activeLabel = activeItem?.label || "";
  const activeGroup = activeItem?.group || "";

  useEffect(() => {
    if (groupsInit) return;
    const initial: Record<string, boolean> = {};
    groups.forEach((g) => {
      if (g.label && g.label !== activeGroup) initial[g.label] = true;
    });
    setCollapsedGroups(initial);
    setGroupsInit(true);
  }, [groups, activeGroup, groupsInit]);

  useEffect(() => {
    let lastG = 0;
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (t as HTMLElement).isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setShortcutsHelpOpen(false);
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShortcutsHelpOpen((o) => !o);
        return;
      }
      if (e.key === "h" && !e.metaKey && !e.ctrlKey && !e.altKey && Date.now() - lastG < 900) {
        e.preventDefault();
        navigate("/");
        lastG = 0;
        return;
      }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 900 && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const target = items[idx];
        if (target) {
          e.preventDefault();
          handleSelect(target.value);
          toast.success(target.label, { duration: 900 });
          lastG = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, handleSelect, navigate]);

  const filteredPalette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.group || "").toLowerCase().includes(q)
    );
  }, [items, paletteQuery]);

  const initials = useMemo(() => {
    const src = (user as any)?.user_metadata?.full_name || (user as any)?.email || "U";
    return String(src).trim().slice(0, 1).toUpperCase();
  }, [user]);

  const resolveProfileImageUrl = useCallback((url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    const base = (import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const formatted = url.startsWith("/") ? url : `/${url}`;
    return base ? `${base}${formatted}` : formatted;
  }, []);

  const ThemeIcon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;
  const toggleLang = () => setLanguage(language === "bn" ? "en" : "bn");

  const SidebarBody = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div className="flex flex-col h-full bg-background text-userprimary border-r border-white/5">
      {/* User Profile Mini Card */}
      {(!collapsed || inDrawer) && user && (
        <div className="px-3 pt-4" ref={profileMenuRef}>
          <div
            className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors p-2.5 cursor-pointer"
            onClick={() => setProfileMenuOpen(o => !o)}
          >
            <div className="h-9 w-9 overflow-hidden rounded-full bg-userprimary text-white flex items-center justify-center text-[13px] font-bold ring-1 ring-white/20 shrink-0">
              {profileImageUrl ? (
                <img src={resolveProfileImageUrl(profileImageUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{(user as any)?.user_metadata?.full_name || (user as any)?.email?.split("@")[0]}</p>
              <p className="text-[10px] text-foreground truncate leading-tight">{(user as any)?.email}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-foreground transition-transform", profileMenuOpen && "rotate-180")} />
          </div>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-1 mt-1"
              >
                <button onClick={() => setResetConfirmOpen(true)} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 hover:bg-white/5 hover:text-foreground transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> লেআউট রিসেট
                </button>
                <button onClick={() => setSignOutConfirmOpen(true)} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> সাইন আউট
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Wallet Balance Card */}
      {(!collapsed || inDrawer) && user && !isWalletHiddenRole && (
        <div className="px-2.5 pt-3">
          <div className="rounded-lg bg-gradient-to-br from-primary to-green-700 p-2 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold opacity-90 flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Shondhaan Wallet
              </span>
              <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Coins className="h-2 w-2" /> {walletCoins}
              </span>
            </div>
            <p className="text-base font-bold tracking-tight mt-0.5">৳ {walletBalance.toFixed(2)}</p>
            <button
              onClick={() => navigate("/wallet")}
              className="mt-1.5 w-full bg-white/20 hover:bg-white/30 rounded-md py-1 text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors"
            >
              <Plus className="h-2.5 w-2.5" /> টাকা যোগ করুন
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {(!collapsed || inDrawer) && (
        <div className="px-3 pt-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors px-3 py-2.5 text-[13px] text-slate-400 border border-userprimary shadow hover:border-userprimary group"
          >
            <Search className="h-4 w-4 group-hover:text-blue-400 transition-colors" />
            <span className="flex-1 text-left font-medium">খুঁজুন…</span>
            <kbd className="hidden md:inline-flex items-center rounded-md border border-white/5 px-1.5 py-0.5 text-[10px] font-mono text-userprimary">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Pinned Items */}
      {pinnedItems.length > 0 && (!collapsed || inDrawer) && (
        <div className="px-3 pt-4">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-userprimary inline-flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> পিন করা
          </p>
          <div className="space-y-1">
            {pinnedItems.map((item) => (
              <NavBtn
                key={`pin-${item.value}`}
                item={item}
                active={activeTab === item.value}
                onClick={() => handleSelect(item.value)}
                onPin={() => togglePin(item.value)}
                pinned
                collapsed={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-4 px-3 space-y-1 min-h-0", customScrollbar)}>
        {groups.map((group, gi) => {
          const groupKey = group.label || `g-${gi}`;
          const groupCollapsed = collapsedGroups[groupKey];
          return (
            <div key={gi} className="mb-2">
              {group.label && (!collapsed || inDrawer) ? (
                <button
                  onClick={() => setCollapsedGroups((c) => ({ ...c, [groupKey]: !c[groupKey] }))}
                  className="w-full flex items-center justify-between px-2 pt-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-userprimary hover:text-primary transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {group.label}
                    <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-gray-200 text-[9.5px] font-bold tabular-nums text-userprimary">
                      {group.items.length}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", groupCollapsed && "-rotate-90")} />
                </button>
              ) : group.label && collapsed && gi > 0 ? (
                <div className="mx-2 my-3 border-t border-white/5" />
              ) : null}

              <AnimatePresence initial={false}>
                {!groupCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden space-y-1"
                  >
                    {group.items.map((item) => (
                      <NavBtn
                        key={item.value}
                        item={item}
                        active={activeTab === item.value}
                        onClick={() => handleSelect(item.value)}
                        onPin={() => togglePin(item.value)}
                        pinned={pinned.includes(item.value)}
                        collapsed={collapsed && !inDrawer}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer Collapse Btn */}
      <div className="border-t border-white/5 p-3 shrink-0">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "hidden md:flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-forground hover:text-userprimary transition-colors",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (<><ChevronLeft className="h-4 w-4" /> সংকুচিত</>)}
        </button>
      </div>
    </div>
  );

  const bn = language === "bn";

  return (
    <div className={cn("flex w-full", !embedded && "h-screen overflow-hidden", offsetForDesktopMegaMenu && "md:pt-0")}>
      {/* Desktop sidebar */}
      {!embedded && (
        <aside
          className={cn(
            "hidden md:flex flex-col shrink-0 h-full transition-[width] duration-300 ease-in-out z-30 border shadow-2xl shrink-0",
            collapsed ? "w-[80px]" : "w-[280px]"
          )}
        >
          <SidebarBody />
        </aside>
      )}

      {/* Mobile drawer */}
      {!embedded && (
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="md:hidden fixed left-0 top-0 bottom-0 z-[70] w-[85%] max-w-[320px] shadow-2xl"
              >
                <SidebarBody inDrawer />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ═══════════════════════════════════════════
          Main content — sticky, fills viewport
      ═══════════════════════════════════════════ */}
      <div className={cn(
        "flex-1 min-w-0 flex flex-col overflow-hidden",
        !embedded && "bg-slate-50 dark:bg-slate-950"
      )}>
        {/* Header — shrink-0, no sticky needed since parent is fixed height */}
        {!embedded && (
          <header className="shrink-0 z-40 py-3 bg-userprimaryshade">
            <div className="flex h-full items-center gap-4 px-4 md:px-6">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-300 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex w-full">
                <div className="w-full flex">
                  <h1 className="text-xl font-semibold text-gray-800 my-auto">
                    {bn ? "ড্যাশবোর্ড" : "Dashboard"}
                  </h1>
                  <p><ReferralCode /></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleLang}
                    aria-label={language === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
                    title={language === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
                    className="group flex h-9 items-center gap-1.5 rounded-full border shadow bg-background/60 px-2.5 text-foreground/85 transition-all hover:border-primary/40 hover:bg-secondary hover:text-foreground"
                  >
                    <Globe className="h-4 w-4 text-primary/80" />
                    <span className="flex items-center gap-1 text-[11px] font-bold leading-none tracking-wide">
                      <span className={language === "bn" ? "text-foreground" : "text-muted-foreground/60"}>BN</span>
                      <span aria-hidden="true" className="h-2.5 w-px bg-border/80" />
                      <span className={language === "en" ? "text-foreground" : "text-muted-foreground/60"}>EN</span>
                    </span>
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="border hidden md:block shadow text-nowrap rounded-full px-2 py-1 border-userprimary bg-userprimaryshade text-black font-semibold hover:bg-userprimary text-[12px] hover:text-white transition-all"
                  >
                    {bn ? "হোম পেইজ" : "Home Page"} <FontAwesomeIcon icon={faReply} />
                  </button>
                  <button onClick={() => navigate("/")} className="md:hidden text-[20px] text-userprimary">
                    <FontAwesomeIcon icon={faHouse} />
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* ═══ Main content area — fills remaining height ═══ */}
        <main className={cn(
          "flex-1 min-h-0 overflow-hidden",
          isFullViewport ? "flex flex-col" : ""
        )}>
          <div className={cn(
            "w-full",
            isFullViewport
              ? "h-full flex-1 min-h-0"
              : "h-full overflow-y-auto",
            embedded ? "p-0" : "px-5 py-2"
          )}>
            {/* Hero — hidden for full-viewport tabs */}
            {hero && !hero.hideOnTabs?.includes(activeTab) && !isFullViewport && (
              <PanelHero
                title={hero.title}
                subtitle={hero.subtitle}
                badge={hero.badge}
                gradient={hero.gradient}
                rightIcon={hero.rightIcon || panelIcon}
              />
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={isFullViewport ? "h-full min-h-0" : "space-y-6"}
              >
                {children(activeTab, setActiveTabState)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            query={paletteQuery}
            setQuery={setPaletteQuery}
            items={filteredPalette}
            allItems={items}
            recentValues={recent}
            onSelect={(value) => {
              handleSelect(value);
              setPaletteOpen(false);
            }}
            onClose={() => setPaletteOpen(false)}
            onCycleTheme={cycle}
            themeMode={mode}
            onToggleLanguage={() => setLanguage(language === "bn" ? "en" : "bn")}
            language={language}
            onSignOut={() => {
              setPaletteOpen(false);
              setSignOutConfirmOpen(true);
            }}
            onNavigate={(path) => {
              setPaletteOpen(false);
              navigate(path);
            }}
          />
        )}
      </AnimatePresence>

      <BackendShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
        shortcuts={[
          { keys: "⌘K / Ctrl+K", label: "কমান্ড প্যালেট" },
          { keys: "Shift + ?", label: "এই হেলপ" },
          { keys: "g h", label: "হোম পেজে যান" },
          ...items.slice(0, 9).map((it, i) => ({ keys: `g ${i + 1}`, label: it.label })),
          { keys: "Esc", label: "বন্ধ করুন" },
        ]}
      />

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-500" />
              কী রিসেট করবেন?
            </AlertDialogTitle>
            <AlertDialogDescription>
              নিচ থেকে যেকোনো একটি অপশন বাছাই করুন। রিসেটের পর "আনডু" বাটন দিয়ে আগের অবস্থা ফিরিয়ে আনতে পারবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={signOutConfirmOpen}
        onOpenChange={(o) => !signingOut && setSignOutConfirmOpen(o)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-rose-500" />
              সাইন আউট নিশ্চিত করুন
            </AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে সাইন আউট করতে চান? পরবর্তীতে অ্যাকাউন্টে প্রবেশ করতে আবার লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={signingOut}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              className="bg-rose-500 text-white hover:bg-rose-600 rounded-xl"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  setSigningOut(true);
                  await signOut();
                  toast.success("সফলভাবে সাইন আউট হয়েছে");
                  setSignOutConfirmOpen(false);
                  navigate("/");
                } catch {
                  toast.error("সাইন আউটে সমস্যা হয়েছে");
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              {signingOut ? "সাইন আউট হচ্ছে..." : "সাইন আউট করুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── NavBtn ──────────────────────────────────────────────────────────────────
const NavBtn = ({
  item, active, onClick, onPin, pinned, collapsed,
}: {
  item: SidebarItem; active: boolean; onClick: () => void;
  onPin: () => void; pinned: boolean; collapsed: boolean;
}) => (
  <div className="group relative">
    <button
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-userprimary focus-visible:ring-offset-1 focus-visible:ring-offset-[#0b0f17]",
        collapsed ? "justify-center px-0 py-3 h-12 w-12 mx-auto" : "px-3 py-2.5",
        active
          ? "bg-userprimaryshade text-foreground font-semibold border"
          : "text-foreground hover:bg-userprimary/10 hover:text-userprimary active:scale-[0.98]"
      )}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-userprimary shadow-[0_0_10px_rgb(59,130,246)]" />
      )}
      {active && collapsed && (
        <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-userprimary shadow-[0_0_8px_rgb(59,130,246)]" />
      )}
      <span className={cn(
        "shrink-0 transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]",
        active ? "text-userprimary" : "text-foreground group-hover:text-userprimary"
      )}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate flex-1 text-left tracking-tight">{item.label}</span>}
      {!collapsed && item.badge != null && String(item.badge) !== "0" && (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-colors",
            active
              ? "bg-blue-500/20 text-userprimary"
              : "bg-white/5 text-slate-400 group-hover:bg-rose-500/10 group-hover:text-rose-400"
          )}
        >
          {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      {collapsed && item.badge != null && String(item.badge) !== "0" && (
        <span className="absolute -right-0 -top-0 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-[#0b0f17]">
          {typeof item.badge === "number" && item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </button>

    {collapsed && (
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-lg bg-slate-900 text-white border border-white/10 px-2.5 py-1.5 text-[12px] font-semibold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        {item.label}
      </span>
    )}

    {!collapsed && (
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all [&>svg]:h-3.5 [&>svg]:w-3.5",
          pinned ? "text-blue-400 opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100 text-slate-500 hover:bg-white/5"
        )}
        title={pinned ? "পিন সরান" : "পিন করুন"}
      >
        {pinned ? <PinOff /> : <Pin />}
      </button>
    )}
  </div>
);

// ── CommandPalette ───────────────────────────────────────────────────────────
const CommandPalette = ({
  query, setQuery, items, allItems, recentValues, onSelect, onClose,
  onCycleTheme, themeMode, onToggleLanguage, language, onSignOut, onNavigate,
}: {
  query: string; setQuery: (s: string) => void; items: SidebarItem[];
  allItems: SidebarItem[]; recentValues: string[];
  onSelect: (v: string) => void; onClose: () => void;
  onCycleTheme: () => void; themeMode: string;
  onToggleLanguage: () => void; language: string;
  onSignOut: () => void; onNavigate: (path: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hi, setHi] = useState(0);
  const [recentItems] = useState(
    () => recentValues.map((v) => allItems.find((i) => i.value === v)).filter(Boolean) as SidebarItem[]
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setHi(0); }, [query]);

  const rows = [...recentItems, ...items].slice(0, 20);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && rows[hi]) { e.preventDefault(); onSelect(rows[hi].value); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-white backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <Search className="h-5 w-5 text-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="পেজ, ইউজার, অর্ডার, সার্ভিস বা একশন খুঁজুন…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-500 text-foreground font-medium"
          />
          <kbd className="rounded-md border border-white/5 bg-userprimaryshade px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shadow-sm">ESC</kbd>
        </div>
        <div className={cn("max-h-[50vh] overflow-y-auto p-2 space-y-1", customScrollbar)}>
          {rows.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-500">কিছু পাওয়া যায়নি</p>
          ) : (
            rows.map((it, idx) => (
              <button
                key={it.value}
                onMouseEnter={() => setHi(idx)}
                onClick={() => onSelect(it.value)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all text-left",
                  idx === hi ? "bg-userprimaryshade text-black shadow-sm" : "text-slate-700 hover:bg-white/5"
                )}
              >
                <span className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4 transition-colors",
                  idx === hi ? "bg-userprimaryshade text-userprimary" : "bg-white/5 text-slate-500"
                )}>{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{it.label}</p>
                </div>
                {idx === hi && (
                  <kbd className="rounded border border-white/5 bg-black/20 px-1.5 text-[9px] font-mono text-slate-500">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-[10px] text-slate-500 bg-white/5">
          <span className="font-medium">Shondhaan Workspace</span>
          <div className="flex items-center gap-4">
            <span>Theme: <b className="text-slate-600">{themeMode}</b></span>
            <span>Lang: <b className="text-slate-600">{language}</b></span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PanelSidebarTabs;