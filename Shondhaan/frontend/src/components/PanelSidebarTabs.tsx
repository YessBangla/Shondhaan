import { useState, useEffect, useMemo, useCallback, ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Menu, X, Search, Sun, Moon, Monitor, Bell,
  Languages, Pin, PinOff, Command as CommandIcon, Sparkles, ChevronDown,
  Home, RotateCcw, LogOut, Clock, Zap, User as UserIcon, Package as PackageIcon,
  Calendar as CalendarIcon, ShoppingBag, FileText as FileTextIcon, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import BackendShortcutsHelp from "@/components/BackendShortcutsHelp";
import PanelHero from "@/components/PanelHero";
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
  liveStatus?: string;
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
}

const PanelSidebarTabs = ({
  items,
  defaultValue,
  children,
  panelTitle,
  panelIcon,
  profileImageUrl,
  hero,
  offsetForDesktopMegaMenu = false,
}: PanelSidebarTabsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { mode, cycle } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [activeTab, setActiveTabState] = useState(defaultValue);
  const requestedTab = searchParams.get("tab");

  useEffect(() => {
    if (!requestedTab) return;
    if (items.some((item) => item.value === requestedTab)) {
      setActiveTabState(requestedTab);
    }
  }, [items, requestedTab]);

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

  // ── KEY FIX: handleSelect only updates state, NO navigate() calls ──
  const handleSelect = useCallback((value: string) => {
    setActiveTabState(value);
    setMobileOpen(false);
    // Update recent MRU list
    setRecent((prev) => {
      const next = [value, ...prev.filter((v) => v !== value)].slice(0, 6);
      return next;
    });
  }, []);

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
    const src = user?.user_metadata?.full_name || user?.email || "U";
    return String(src).trim().slice(0, 1).toUpperCase();
  }, [user]);

  const ThemeIcon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;

  const SidebarBody = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "px-3.5 h-14 flex items-center gap-2.5 border-b border-border/40",
          collapsed && !inDrawer && "justify-center px-0"
        )}
      >
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary via-emerald-500 to-emerald-600 text-primary-foreground flex items-center justify-center shadow-md ring-1 ring-primary/30 shrink-0">
          {panelIcon || <Sparkles className="h-4 w-4" />}
        </div>
        {(!collapsed || inDrawer) && (
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-foreground leading-tight truncate tracking-tight">{panelTitle || "প্যানেল"}</p>
            <p className="text-[10.5px] font-medium text-muted-foreground leading-tight">Yess Workspace</p>
          </div>
        )}
      </div>

      {(!collapsed || inDrawer) && (
        <div className="px-2.5 pt-2.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors px-2.5 py-2 text-[12px] text-muted-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">খুঁজুন…</span>
            <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-card px-1 text-[9px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {pinnedItems.length > 0 && (!collapsed || inDrawer) && (
        <div className="px-2.5 pt-3">
          <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 inline-flex items-center gap-1">
            <Pin className="h-2.5 w-2.5" /> পিন করা
          </p>
          <div className="space-y-0.5">
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

      <nav className="flex-1 overflow-y-auto py-2.5 px-2.5 space-y-0.5 scrollbar-none">
        {groups.map((group, gi) => {
          const groupKey = group.label || `g-${gi}`;
          const groupCollapsed = collapsedGroups[groupKey];
          return (
            <div key={gi} className="mb-1">
              {group.label && (!collapsed || inDrawer) ? (
                <button
                  onClick={() => setCollapsedGroups((c) => ({ ...c, [groupKey]: !c[groupKey] }))}
                  className="w-full flex items-center justify-between px-2 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {group.label}
                    <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-secondary text-[9.5px] font-bold tabular-nums text-foreground/70">
                      {group.items.length}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", groupCollapsed && "-rotate-90")} />
                </button>
              ) : group.label && collapsed && gi > 0 ? (
                <div className="mx-2 my-2 border-t border-border/30" />
              ) : null}

              <AnimatePresence initial={false}>
                {!groupCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden space-y-0.5"
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

      <div className="border-t border-border/40 p-2 space-y-1">
        {(!collapsed || inDrawer) && user && (
          <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-2 py-1.5">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground flex items-center justify-center text-[11px] font-bold ring-1 ring-card shrink-0">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{user.user_metadata?.full_name || user.email?.split("@")[0]}</p>
              <p className="text-[9px] text-muted-foreground truncate leading-tight">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "hidden md:flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : (<><ChevronLeft className="h-3.5 w-3.5" /> সংকুচিত</>)}
        </button>

        <button
          onClick={() => setResetConfirmOpen(true)}
          className={cn(
            "hidden md:flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
            collapsed ? "justify-center" : "justify-start"
          )}
          title="সব প্যানেলের সাইডবার লেআউট ডিফল্টে রিসেট করুন"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {!collapsed && <span>লেআউট রিসেট</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("flex w-full min-h-screen bg-muted/40", offsetForDesktopMegaMenu && "md:pt-10")}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 sticky self-start border-r border-border bg-card transition-[width] duration-200 z-30",
          offsetForDesktopMegaMenu ? "top-10 h-[calc(100vh-2.5rem)]" : "top-0 h-screen",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-[70] w-[78%] max-w-[300px] bg-card/95 backdrop-blur-2xl border-r border-border shadow-2xl"
            >
              <SidebarBody inDrawer />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col bg-muted/30">
        <header className={cn(
          "sticky z-40 border-b border-border bg-card shadow-sm",
          offsetForDesktopMegaMenu ? "top-0 md:top-10" : "top-0"
        )}>
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />
          <div className="flex items-center justify-between gap-2 px-4 md:px-6 h-14">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary ring-1 ring-primary/20 shrink-0 [&>*]:h-4 [&>*]:w-4">
                {activeItem?.icon || panelIcon}
              </div>
              <div className="min-w-0">
                <nav className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/80 leading-none">
                  <button onClick={() => navigate("/")} className="inline-flex items-center gap-1 hover:text-primary">
                    <Home className="h-2.5 w-2.5" /> হোম
                  </button>
                  {activeGroup && (
                    <>
                      <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                      <span>{activeGroup}</span>
                    </>
                  )}
                </nav>
                <h1 className="text-[14px] md:text-[15px] font-bold text-foreground truncate leading-tight mt-0.5">{activeLabel || panelTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden lg:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-[11px] text-muted-foreground"
              >
                <Search className="h-3.5 w-3.5" /> খুঁজুন
                <kbd className="ml-1 rounded border border-border bg-card px-1 text-[9px] font-mono">⌘K</kbd>
              </button>
              <button
                onClick={() => setPaletteOpen(true)}
                className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground"
                title="খুঁজুন (⌘K)"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={cycle}
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground"
                title={`Theme: ${mode}`}
              >
                <ThemeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
                className="h-9 px-2 rounded-xl hover:bg-secondary text-[11px] font-bold text-muted-foreground inline-flex items-center gap-1"
                title="ভাষা পরিবর্তন"
              >
                <Languages className="h-3.5 w-3.5" />{language.toUpperCase()}
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div className="w-full px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-5">
            {hero && !hero.hideOnTabs?.includes(activeTab) && (
              <PanelHero
                title={hero.title}
                subtitle={hero.subtitle}
                badge={hero.badge}
                gradient={hero.gradient}
                liveStatus={hero.liveStatus}
                rightIcon={hero.rightIcon || panelIcon}
              />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
          { keys: "Shift + ?", label: "এই হেল্প" },
          { keys: "g h", label: "হোম পেজে যান" },
          ...items.slice(0, 9).map((it, i) => ({ keys: `g ${i + 1}`, label: it.label })),
          { keys: "Esc", label: "বন্ধ করুন" },
        ]}
      />

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              কী রিসেট করবেন?
            </AlertDialogTitle>
            <AlertDialogDescription>
              নিচ থেকে যেকোনো একটি অপশন বাছাই করুন। রিসেটের পর "আনডু" বাটন দিয়ে আগের অবস্থা ফিরিয়ে আনতে পারবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={signOutConfirmOpen}
        onOpenChange={(o) => !signingOut && setSignOutConfirmOpen(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              সাইন আউট নিশ্চিত করুন
            </AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে সাইন আউট করতে চান? পরবর্তীতে অ্যাকাউন্টে প্রবেশ করতে আবার লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        "relative w-full flex items-center gap-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        collapsed ? "justify-center px-0 py-2.5 h-10 w-10 mx-auto" : "px-2.5 py-2",
        active
          ? "bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-md shadow-primary/25"
          : "text-foreground hover:bg-secondary/80 hover:text-foreground active:scale-[0.98]"
      )}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-foreground/90" />
      )}
      {active && collapsed && (
        <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
      )}
      <span className={cn(
        "shrink-0 transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]",
        active ? "text-primary-foreground" : "text-foreground/85 group-hover:text-primary"
      )}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
      {!collapsed && item.badge != null && String(item.badge) !== "0" && (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      {!collapsed && active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />}
      {collapsed && item.badge != null && String(item.badge) !== "0" && (
        <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground">
          {typeof item.badge === "number" && item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </button>

    {collapsed && (
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-lg bg-popover text-popover-foreground border border-border/60 px-2 py-1 text-[12px] font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {item.label}
      </span>
    )}

    {!collapsed && (
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all",
          pinned ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100 text-muted-foreground"
        )}
        title={pinned ? "পিন সরান" : "পিন করুন"}
      >
        {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
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
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/60 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <CommandIcon className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="পেজ, ইউজার, অর্ডার, সার্ভিস বা একশন খুঁজুন…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border bg-card px-1.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2 space-y-1">
          {rows.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>
          ) : (
            rows.map((it, idx) => (
              <button
                key={it.value}
                onMouseEnter={() => setHi(idx)}
                onClick={() => onSelect(it.value)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors text-left",
                  idx === hi ? "bg-primary/10 text-foreground" : "text-foreground/85 hover:bg-secondary"
                )}
              >
                <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0">{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.label}</p>
                </div>
                {idx === hi && (
                  <kbd className="rounded border border-border bg-card px-1.5 text-[9px] font-mono text-muted-foreground">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span>Yess Workspace</span>
          <span>Theme: <b>{themeMode}</b></span>
          <span>Lang: <b>{language}</b></span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PanelSidebarTabs;
