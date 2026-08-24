import { Search, X, LayoutGrid, UserPlus, Info, FileText, Shield, HelpCircle, Phone, Wrench, Headphones, MapPinCheck, ShieldCheck, FileSearch, Eye, DollarSign, MessageSquare, Store } from "lucide-react";
import { getServiceImage } from "@/data/serviceImages";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCmsServices } from "@/hooks/useCmsData";
import EmergencyServiceModal from "@/components/EmergencyServiceModal";
import RequestService from "@/components/RequestService";
import { haptic, getHapticIntensity, setHapticIntensity, type HapticIntensity } from "@/lib/haptics";
import { useBadgeCounts } from "@/hooks/useBadgeCounts";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Monitor, Mic, Vibrate, QrCode } from "lucide-react";
import QRScannerSheet from "@/components/QRScannerSheet";
import { getMobileFloatingBottom, mobileNavBottom, MOBILE_BOTTOM_NAV_HEIGHT, MOBILE_BOTTOM_NAV_GAP } from "@/lib/mobileBottomOffsets";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  resolveMobileNavTabs,
  isTabActive,
  type MobileNavTabConfig,
  type BadgeKey,
} from "@/config/mobileNavTabs";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const bn = language === "bn";
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const badges = useBadgeCounts();
  const { mode, cycle } = useTheme();
  const ThemeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;
  const themeLabel = mode === "dark" ? (bn ? "ডার্ক মোড" : "Dark") : mode === "light" ? (bn ? "লাইট মোড" : "Light") : (bn ? "সিস্টেম থিম" : "System");
  const [hapticMode, setHapticMode] = useState<HapticIntensity>(() => getHapticIntensity());
  const cycleHaptic = () => {
    const order: HapticIntensity[] = ["off", "light", "normal", "strong"];
    const next = order[(order.indexOf(hapticMode) + 1) % order.length];
    setHapticIntensity(next);
    setHapticMode(next);
    if (next !== "off") haptic("medium");
  };
  const hapticLabel = hapticMode === "off"
    ? (bn ? "বন্ধ" : "Off")
    : hapticMode === "light"
    ? (bn ? "হালকা" : "Light")
    : hapticMode === "strong"
    ? (bn ? "শক্তিশালী" : "Strong")
    : (bn ? "স্বাভাবিক" : "Normal");
  const [listening, setListening] = useState(false);
  const startVoiceSearch = () => {
    type SREvt = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    type SR = { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; onresult: ((e: SREvt) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    const SR = Ctor;
    if (!SR) return;
    haptic("light");
    const rec = new SR();
    rec.lang = bn ? "bn-BD" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) setQuery(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  };

  useEffect(() => {
    if (!user) { setUserRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id)
      .then(({ data }) => setUserRoles(data?.map(r => r.role) || []));
  }, [user]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [trackToken, setTrackToken] = useState("");
  const [trackOpen, setTrackOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: cmsServices = [] } = useCmsServices();

  const moreRoutes = ["/all-services", "/join", "/about", "/contact", "/faq", "/terms", "/privacy", "/provider", "/call-center", "/representative", "/moderator", "/supervisor", "/finance"];

  // Resolve the configured nav tabs (filters by auth & roles, applies preset)
  const navTabs: MobileNavTabConfig[] = resolveMobileNavTabs({
    isAuthenticated: !!user,
    roles: userRoles,
  });

  // Map badge keys → live counts (extend here when adding new BadgeKey values)
  const badgeCount = (key?: BadgeKey): number => {
    if (!key) return 0;
    const map: Record<BadgeKey, number> = {
      bookings: badges.bookings,
      chat: badges.chat,
      cart: 0,
      notifications: 0,
    };
    return map[key] ?? 0;
  };

  // Derive active tab from the current route via config-defined activeRoutes;
  // fall back to "more" when on any of the moreRoutes.
  const activeTab: string = (
    navTabs.find((t) => isTabActive(t, routerLocation.pathname))?.id
    ?? (moreRoutes.includes(routerLocation.pathname) ? "more" : "")
  );

  const activeServices = cmsServices.filter((s) => s.is_active);

  const filtered = query.trim().length > 0
    ? activeServices.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.title_en && s.title_en.toLowerCase().includes(query.toLowerCase())) ||
        s.slug.includes(query.toLowerCase())
      )
    : activeServices.slice(0, 8);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [searchOpen]);

  const handleSelect = (slug: string) => {
    setSearchOpen(false);
    setQuery("");
    navigate(`/service/${slug}`);
  };

  const handleTabClick = (id: string) => {
    haptic("selection");
    const tab = navTabs.find((t) => t.id === id);
    if (!tab) return;
    const a = tab.action;
    if (a.kind === "navigate") {
      navigate(a.to);
    } else if (a.kind === "navigate-auth") {
      navigate(user ? a.authedTo : a.guestTo);
    } else if (a.kind === "modal") {
      switch (a.modal) {
        case "search": setSearchOpen(true); break;
        case "track": setTrackOpen(true); break;
        case "qr": setQrOpen(true); break;
        case "more": setMoreOpen(true); break;
        case "request": setRequestOpen(true); break;
      }
    }
  };

  const isProvider = userRoles.includes("provider") || userRoles.includes("admin");
  const isCallCenter = userRoles.includes("call_center") || userRoles.includes("admin");
  const isRepresentative = userRoles.includes("representative") || userRoles.includes("admin");
  const isModerator = userRoles.includes("moderator") || userRoles.includes("admin");
  const isSupervisor = userRoles.includes("supervisor") || userRoles.includes("admin");
  const isFinance = userRoles.includes("finance") || userRoles.includes("admin");
  const hasStaffRole = userRoles.some(r => ["admin", "call_center", "provider", "representative", "supervisor", "finance", "moderator"].includes(r));

  const moreItems = [
    ...(isProvider ? [{ icon: Wrench, label: bn ? "প্রোভাইডার প্যানেল" : "Provider Panel", path: "/provider" }] : []),
    ...(isCallCenter ? [{ icon: Headphones, label: bn ? "কল সেন্টার" : "Call Center", path: "/call-center" }] : []),
    ...(isRepresentative ? [{ icon: MapPinCheck, label: bn ? "প্রতিনিধি প্যানেল" : "Representative", path: "/representative" }] : []),
    ...(isRepresentative ? [{ icon: Store, label: bn ? "আমার শপ" : "My Shop", path: "/mart/my-shop" }] : []),
    ...(isModerator ? [{ icon: ShieldCheck, label: bn ? "মডারেটর প্যানেল" : "Moderator", path: "/moderator" }] : []),
    ...(isSupervisor ? [{ icon: Eye, label: bn ? "সুপারভাইজার প্যানেল" : "Supervisor", path: "/supervisor" }] : []),
    ...(isFinance ? [{ icon: DollarSign, label: bn ? "ফিনান্স প্যানেল" : "Finance", path: "/finance" }] : []),
    ...(hasStaffRole ? [{ icon: MessageSquare, label: bn ? "ইন্টার্নাল চ্যাট" : "Internal Chat", path: "/internal" }] : []),
    { icon: FileSearch, label: bn ? "সার্ভিস ট্র্যাক" : "Track Service", path: "__track__" },
    { icon: QrCode, label: bn ? "QR স্ক্যান" : "Scan QR", path: "__qr__" },
    { icon: LayoutGrid, label: bn ? "সার্ভিসসমূহ" : "All Services", path: "/all-services" },
    { icon: UserPlus, label: bn ? "আমাদের সাথে যোগ দিন" : "Join Us", path: "/join" },
    { icon: Info, label: bn ? "আমাদের সম্পর্কে" : "About Us", path: "/about" },
    { icon: Phone, label: bn ? "যোগাযোগ" : "Contact Us", path: "/contact" },
    { icon: HelpCircle, label: bn ? "সচরাচর জিজ্ঞাসা" : "FAQ", path: "/faq" },
    { icon: FileText, label: bn ? "শর্তাবলী" : "Terms", path: "/terms" },
    { icon: Shield, label: bn ? "গোপনীয়তা নীতি" : "Privacy", path: "/privacy" },
  ];

  // Dev-only sanity check — bottom nav looks best with exactly 5 tabs.
  if (import.meta.env.DEV && navTabs.length !== 5) {
    console.warn(
      `[MobileBottomNav] ${navTabs.length} tabs configured — design is optimized for 5. Edit src/config/mobileNavTabs.ts.`
    );
  }

  // Hide on role-based dashboard / panel routes (Laravel-style separate shells)
  const dashboardPrefixes = [
    "/admin", "/dashboard", "/call-center", "/provider", "/representative",
    "/moderator", "/supervisor", "/finance", "/internal", "/super-admin",
    "/employer", "/mart/admin", "/mart/delivery", "/mart/cs", "/mart/my-shop",
    "/mart/inbox", "/yessdeal",
  ];
  const _path = routerLocation.pathname;
  const _isDashboardRoute = _path === "/mart" || dashboardPrefixes.some(
    (p) => _path === p || _path.startsWith(p + "/")
  );
  if (_isDashboardRoute) return null;

  return (
    <>
      {/* Full-screen search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] glass-strong flex flex-col md:hidden"
          >
            <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3 glass-nav">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={bn ? "সার্ভিস খুঁজুন..." : "Search services..."}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={startVoiceSearch}
                className={`p-1.5 rounded-full transition-colors ${listening ? "bg-destructive/15 text-destructive animate-pulse" : "text-muted-foreground hover:text-primary"}`}
                aria-label="Voice search"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button onClick={() => setSearchOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!query.trim() && (
              <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border/50">
                {["এসি", "ক্লিনিং", "ইলেকট্রিক", "সেলুন", "প্লাম্বিং"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filtered.length > 0 ? (
                <ul>
                  {filtered.map((s) => (
                    <li key={s.slug}>
                      <button
                        onClick={() => handleSelect(s.slug)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary active:bg-secondary border-b border-border/30"
                      >
                        <img src={getServiceImage(s.slug, s.image_url)} alt={s.title} className="h-12 w-12 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {bn ? s.title : (s.title_en || s.title)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ⭐ {s.rating ?? 4.5} • {(s.total_orders ?? 0).toLocaleString("bn-BD")}+ {bn ? "অর্ডার" : "orders"}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {bn ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services found"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracking overlay */}
      <AnimatePresence>
        {trackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] glass-strong flex flex-col items-center justify-center md:hidden"
          >
            <button onClick={() => setTrackOpen(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="w-full max-w-sm px-6">
              <FileSearch className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-center text-base font-bold text-foreground mb-1">
                {bn ? "সার্ভিস ট্র্যাক করুন" : "Track Your Service"}
              </h3>
              <p className="text-center text-xs text-muted-foreground mb-4">
                {bn ? "আপনার ট্র্যাকিং টোকেন আইডি দিন" : "Enter your tracking token ID"}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = trackToken.trim();
                  if (!trimmed) return;
                  setTrackOpen(false);
                  setTrackToken("");
                  navigate(`/track/${trimmed}`);
                }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  value={trackToken}
                  onChange={(e) => setTrackToken(e.target.value)}
                  placeholder={bn ? "টোকেন আইডি লিখুন..." : "Token ID..."}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={!trackToken.trim()}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed left-0 right-0 bottom-0 z-[55] bg-black/40 md:hidden"
              style={{ top: "var(--app-header-h, 0px)" }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 right-0 z-[56] max-h-[calc(100dvh-var(--app-header-h,0px)-108px)] overflow-hidden rounded-t-2xl glass-strong md:hidden"
              style={{
                bottom: 0,
                maxHeight: `calc(100dvh - var(--app-header-h, 0px) - env(safe-area-inset-bottom, 0px) - ${MOBILE_BOTTOM_NAV_HEIGHT + MOBILE_BOTTOM_NAV_GAP + 20}px)`,
              }}
              >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                <div className="absolute right-2 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Close"
                    >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
              <div className="max-h-[inherit] overflow-y-auto px-4 pb-3 overscroll-contain">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {bn ? "আরও অপশন" : "More Options"}
                </h3>
                <button
                  onClick={() => { haptic("selection"); cycle(); }}
                  className="mb-3 flex w-full items-center justify-between rounded-xl border shadow bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary"
                  >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ThemeIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {bn ? "থিম" : "Theme"}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-primary">{themeLabel}</span>
                </button>

                <button
                  onClick={cycleHaptic}
                  className="mb-3 flex w-full items-center justify-between rounded-xl border shadow bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary"
                  >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Vibrate className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {bn ? "ভাইব্রেশন" : "Haptics"}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-primary">{hapticLabel}</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {moreItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        setMoreOpen(false);
                        if (item.path === "__track__") {
                          setTrackOpen(true);
                        } else if (item.path === "__qr__") {
                          setQrOpen(true);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                        routerLocation.pathname === item.path
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/50 border shadow text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Emergency action lives in the unified MobileFabHub now (no duplicate button here). */}
      <EmergencyServiceModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
      <RequestService externalOpen={requestOpen} onExternalOpenChange={setRequestOpen} hideCard />
      <QRScannerSheet open={qrOpen} onClose={() => setQrOpen(false)} />

      {/* Bottom navigation bar — clean app-style */}
      <nav
        aria-label={bn ? "প্রধান নেভিগেশন" : "Primary navigation"}
        role="navigation"
        className="fixed left-0 !bottom-[-10px] py-2 z-[70] w-full overflow-hidden border bg-primary md:hidden "
        style={{ bottom: mobileNavBottom }}
        >
        {/* Subtle top hairline highlight for the iOS frosted feel */}
        <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
        <ul
          role="tablist"
          aria-orientation="horizontal"
          className="relative grid items-stretch gap-0.5 px-1.5 pt-1.5"
          style={{
            gridTemplateColumns: `repeat(${navTabs.length}, minmax(0, 1fr))`,
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          {navTabs.map((tab, idx) => {
            const tabLabel = bn ? tab.label.bn : tab.label.en;
            const tabDescribe = bn ? tab.describe.bn : tab.describe.en;
            const tabBadge = badgeCount(tab.badge);
            const isActive =
              tab.id === "search" ? searchOpen
              : tab.id === "more" ? moreOpen
              : activeTab === tab.id;
            const badgeText = tabBadge > 0
              ? `, ${tabBadge > 99 ? "99+" : tabBadge} ${bn ? "নতুন" : "new"}`
              : "";
            const stateText = isActive
              ? `, ${bn ? "নির্বাচিত" : "selected"}`
              : "";
            const fullAriaLabel = `${tabLabel}${badgeText}${stateText}. ${tabDescribe}`;
            return (
              <li key={tab.id} role="presentation" className="contents">
                <button
                  type="button"
                  role="tab"
                  onClick={() => handleTabClick(tab.id)}
                  onKeyDown={(e) => {
                    // Arrow-key navigation between tabs (a11y best practice)
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const dir = e.key === "ArrowRight" ? 1 : -1;
                      const next = (idx + dir + navTabs.length) % navTabs.length;
                      const list = (e.currentTarget.closest("[role='tablist']") as HTMLElement | null);
                      const buttons = list?.querySelectorAll<HTMLButtonElement>("button[role='tab']");
                      buttons?.[next]?.focus();
                    } else if (e.key === "Home") {
                      e.preventDefault();
                      (e.currentTarget.closest("[role='tablist']") as HTMLElement | null)
                        ?.querySelector<HTMLButtonElement>("button[role='tab']")?.focus();
                    } else if (e.key === "End") {
                      e.preventDefault();
                      const buttons = (e.currentTarget.closest("[role='tablist']") as HTMLElement | null)
                        ?.querySelectorAll<HTMLButtonElement>("button[role='tab']");
                      buttons?.[buttons.length - 1]?.focus();
                    }
                  }}
                  aria-label={fullAriaLabel}
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  tabIndex={isActive ? 0 : -1}
                  className={`press group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 pt-2 pb-1.5 min-h-[58px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mobile-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    isActive
                      ? "text-green-600"
                      : "text-white hover:text-green-600 active:text-white"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                {/* Active pill — soft tinted backdrop */}
                {isActive && (
                  <>
                    <motion.span
                      layoutId="bottom-nav-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-x-1 inset-y-1 rounded-2xl bg-mobile-accent/12 ring-1 ring-mobile-accent/15"
                      aria-hidden
                    />
                    {/* Top accent dot — Material 3 inspired */}
                    <motion.span
                      layoutId="bottom-nav-dot"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      className="absolute top-1 h-1 w-6 rounded-full bg-mobile-accent"
                      aria-hidden
                    />
                  </>
                )}
                <div className="relative z-[1]">
                  <tab.icon
                    aria-hidden
                    focusable={false}
                    className={`h-[22px] w-[22px] transition-all duration-300 ease-out ${isActive ? "scale-[1.08] -translate-y-0.5" : "group-active:scale-95"}`}
                    strokeWidth={isActive ? 2.4 : 1.75}
                  />
                  {tabBadge > 0 && (
                    <motion.span
                      key={tabBadge}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
                      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                      className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none ring-2 ring-card shadow-sm"
                      aria-hidden
                    >
                      {tabBadge > 99 ? "99+" : tabBadge}
                      <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" aria-hidden />
                    </motion.span>
                  )}
                </div>
                <span
                  aria-hidden
                  className={`relative z-[1] max-w-full truncate text-[10.5px] leading-none tracking-[-0.01em] transition-all duration-200 ${isActive ? "font-bold" : "font-medium"}`}
                >
                  {tabLabel}
                </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Live region — announces tab changes / badge updates to assistive tech */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {(() => {
          const t = navTabs.find((x) => x.id === activeTab);
          if (!t) return "";
          return `${bn ? t.label.bn : t.label.en} ${bn ? "ট্যাব নির্বাচিত" : "tab selected"}`;
        })()}
      </div>
    </>
  );
};

export default MobileBottomNav;
