import { motion } from "framer-motion";
import {
  User,
  LogOut,
  ClipboardList,
  Globe,
  ShoppingBag,
  Zap,
  HelpCircle,
  Wrench,
  Headphones,
  MapPinCheck,
  ShieldCheck,
  Search,
  Route,
  Store,
  Crown,
  LayoutGrid,
  ChevronDown,
  UserPlus,
  LogIn,
  Building2,
  Bell,
  ShoppingCart,
  Heart,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartCart } from "@/contexts/MartCartContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { getRoleProfilePath, getRoleRedirectPath } from "@/lib/roleRedirect";

import LocationSelector from "@/components/LocationSelector";
import EmergencyServiceModal from "@/components/EmergencyServiceModal";
import RequestService from "@/components/RequestService";
import LongPressTooltip from "@/components/LongPressTooltip";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";


const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL;
  import.meta.env.VITE_API_BASE;

const  Navbar = () => {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [trackToken, setTrackToken] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  const navRef = useRef<HTMLElement | null>(null);

  const { user, signOut } = useAuth();
  const { totalItems, setIsOpen } = useMartCart();
  const { settings } = useSiteSettings();
  const { language, setLanguage, t } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const { mode, cycle } = useTheme();


  const bn = language === "bn";

  const mysqlAuth = getMySqlAuth();
  const martUser = mysqlAuth?.user;
  const martToken = mysqlAuth?.token || mysqlAuth?.access_token || mysqlAuth?.authToken;
  const mysqlRole = martUser?.type;

  const isLoggedIn = Boolean(user || martUser || martToken);

  const effectiveRoles = Array.from(
    new Set([...userRoles, ...(mysqlRole ? [mysqlRole] : [])])
  );

  const isMartVendor = effectiveRoles.includes("mart_vendor");
  const isSuperAdmin = userRoles.includes("super_admin");
  const isSupervisor =
    userRoles.includes("supervisor") || userRoles.includes("admin") || isSuperAdmin;
  const isFinance =
    userRoles.includes("finance") || userRoles.includes("admin") || isSuperAdmin;

  const isProvider = userRoles.includes("provider") || userRoles.includes("admin");
  const isCallCenter = userRoles.includes("call_center") || userRoles.includes("admin");
  const isRepresentative =
    userRoles.includes("representative") || userRoles.includes("admin");
  const isModerator = userRoles.includes("moderator") || userRoles.includes("admin");

  const isJobsHeader =
    location.pathname.startsWith("/jobs") || location.pathname.startsWith("/employer");

  const loadWishlistCount = useCallback(async () => {
    if (!martToken) {
      setWishlistCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        headers: {
          Authorization: `Bearer ${martToken}`,
        },
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setWishlistCount((json.data || []).length);
      } else {
        setWishlistCount(0);
      }
    } catch (error) {
      console.error("Navbar wishlist count error:", error);
      setWishlistCount(0);
    }
  }, [martToken]);

  useEffect(() => {
    loadWishlistCount();

    const refreshWishlist = () => loadWishlistCount();
    window.addEventListener("mart:wishlist-updated", refreshWishlist);

    return () => {
      window.removeEventListener("mart:wishlist-updated", refreshWishlist);
    };
  }, [loadWishlistCount]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const setVar = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty("--app-header-h", `${h}px`);
    };

    setVar();

    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener("resize", setVar);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRoles([]);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setUserRoles(data?.map((r) => r.role) || []));
  }, [user]);

  useEffect(() => {
    const open = () => setMobileMenuOpen(true);
    window.addEventListener("yess:open-mobile-menu", open as EventListener);

    return () => window.removeEventListener("yess:open-mobile-menu", open as EventListener);
  }, []);

  useEffect(() => {
    const openRequest = () => setRequestOpen(true);
    const openEmergency = () => setEmergencyOpen(true);

    window.addEventListener("yess:open-service-request", openRequest as EventListener);
    window.addEventListener("yess:open-emergency", openEmergency as EventListener);

    return () => {
      window.removeEventListener("yess:open-service-request", openRequest as EventListener);
      window.removeEventListener("yess:open-emergency", openEmergency as EventListener);
    };
  }, []);

  useEffect(() => {
    if (settings.favicon_url) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

      if (link) {
        link.href = settings.favicon_url;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = settings.favicon_url;
        document.head.appendChild(newLink);
      }
    }
  }, [settings.favicon_url]);

  const handleSignOut = async () => {
    await signOut();
    setWishlistCount(0);
    navigate("/");
  };

  const handleDashboardClick = async () => {
    const path = await getRoleRedirectPath();
    navigate(path);
  };

  const handleProfileClick = async () => {
    const path = await getRoleProfilePath();
    navigate(path);
  };

  const toggleLang = () => setLanguage(language === "bn" ? "en" : "bn");

  const L = {
    request: {
      short: bn ? "রিকোয়েস্ট" : "Request",
      long: bn ? "সার্ভিস রিকোয়েস্ট করুন" : "Request a service",
    },
    emergency: {
      short: bn ? "জরুরি" : "Emergency",
      long: bn ? "জরুরি সার্ভিস — তাৎক্ষণিক সাড়া" : "Emergency service — instant response",
    },
    track: {
      short: bn ? "ট্র্যাক" : "Track",
      long: bn ? "সার্ভিস ট্র্যাক করুন" : "Track your service",
    },
    lang: {
      short: bn ? "ভাষা" : "Lang",
      long: language === "bn" ? "Switch to English" : "বাংলায় দেখুন",
    },
    cart: {
      short: bn ? "কার্ট" : "Cart",
      long:
        totalItems > 0
          ? bn
            ? `কার্ট দেখুন — ${totalItems} আইটেম`
            : `View cart — ${totalItems} item${totalItems > 1 ? "s" : ""}`
          : bn
            ? "কার্ট দেখুন"
            : "View cart",
    },
    alerts: {
      short: bn ? "নোটিফাই" : "Alerts",
      long: bn ? "নোটিফিকেশন দেখুন" : "View notifications",
    },
    logo: {
      long: bn ? "হোমপেজে যান" : "Go to homepage",
    },
  };

  const handleTrackSearch = (e: FormEvent, closePopover: () => void) => {
    e.preventDefault();

    const trimmed = trackToken.trim();
    if (!trimmed) return;

    navigate(`/track/${trimmed}`);
    setTrackToken("");
    closePopover();
  };

  const TrackingPopover = ({
    iconSize = "h-4 w-4",
    showLabel = false,
    mobileLabel = false,
  }: {
    iconSize?: string;
    showLabel?: boolean;
    mobileLabel?: boolean;
  }) => {
    const [popOpen, setPopOpen] = useState(false);

    return (
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger asChild>
          {showLabel ? (
            <button
              className="text-nowrap flex items-center gap-1.5 rounded-lg border border-primary/30 dark:border-white bg-primary/10 dark:text-white px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
              title={bn ? "সার্ভিস ট্র্যাক করুন" : "Track Service"}
            >
              <Route className={iconSize} />
              {mobileLabel
                ? bn
                  ? "সার্ভিস ট্র্যাক"
                  : "Track"
                : bn
                  ? "সার্ভিস ট্র্যাক করুন"
                  : "Track Your Service"}
            </button>
          ) : (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title={bn ? "সার্ভিস ট্র্যাক করুন" : "Track Service"}
            >
              <Route className={iconSize} />
            </button>
          )}
        </PopoverTrigger>

        <PopoverContent className="w-72 p-3 bg-background border-primary" align="end">
          <p className="text-xs font-semibold text-accent mb-2">
            {bn ? "সার্ভিস ট্র্যাক করুন" : "Track Service"}
          </p>

          <form
            onSubmit={(e) => handleTrackSearch(e, () => setPopOpen(false))}
            className="flex gap-1.5"
          >
            <Input
              value={trackToken}
              onChange={(e) => setTrackToken(e.target.value)}
              placeholder={bn ? "টোকেন আইডি..." : "Token ID..."}
              className="h-8 text-xs flex-1"
            />

            <button
              type="submit"
              disabled={!trackToken.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </PopoverContent>
      </Popover>
    );
  };

  const panelLinks: {
    show: boolean;
    to: string;
    icon: LucideIcon;
    label: string;
  }[] = [
    {
      show: isSuperAdmin,
      to: "/super-admin",
      icon: Crown,
      label: bn ? "সুপার অ্যাডমিন" : "Super Admin",
    },
    {
      show: isProvider,
      to: "/provider",
      icon: Wrench,
      label: bn ? "প্রোভাইডার" : "Provider",
    },
    {
      show: isCallCenter,
      to: "/call-center",
      icon: Headphones,
      label: bn ? "কল সেন্টার" : "Call Center",
    },
    {
      show: isRepresentative,
      to: "/representative",
      icon: MapPinCheck,
      label: bn ? "প্রতিনিধি" : "Representative",
    },
    {
      show: isRepresentative,
      to: "/mart/my-shop",
      icon: Store,
      label: bn ? "আমার শপ" : "My Shop",
    },
    {
      show: isModerator,
      to: "/moderator",
      icon: ShieldCheck,
      label: bn ? "মডারেটর" : "Moderator",
    },
    {
      show: isSupervisor && !userRoles.includes("admin"),
      to: "/supervisor",
      icon: ShieldCheck,
      label: bn ? "সুপারভাইজার" : "Supervisor",
    },
    {
      show: isFinance && !userRoles.includes("admin"),
      to: "/finance",
      icon: ShieldCheck,
      label: bn ? "ফিনান্স" : "Finance",
    },
  ];

  const visiblePanels = panelLinks.filter((p) => p.show);

  return (
    <>
      <motion.nav
        ref={navRef as any}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-40 glass-nav bg-background/95 md:!border-b-0 md:!shadow-none"
        style={isJobsHeader ? { borderBottom: 0, boxShadow: "none" } : undefined}
      >
        {/* Mobile header */}
        <div
          className="md:hidden px-3 pb-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              aria-label={`${settings.logo_text} — ${L.logo.long}`}
              title={L.logo.long}
              className="press flex shrink-0 items-center justify-center"
            >
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.logo_text}
                  className="h-8 object-contain"
                />
              ) : (
                <span className="font-heading text-[17px] font-bold tracking-tight text-foreground whitespace-nowrap">
                  {settings.logo_text}
                  <span className="text-gradient-green">{settings.logo_accent}</span>
                </span>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <LocationSelector compact />
            </div>
          </div>

          <div className="mt-2 flex items-stretch justify-between gap-[3px] xs:gap-1 sm:gap-1.5">
            <LongPressTooltip label={L.request.long}>
              <button
                onClick={() => setRequestOpen(true)}
                aria-label={L.request.long}
                title={L.request.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 to-primary/10 px-0.5 py-1.5 sm:px-1 text-primary shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200  hover:bg-blue-700 active:scale-[0.97]"
              >
                <HelpCircle className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.request.short}
                </span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label={L.emergency.long}>
              <button
                onClick={() => setEmergencyOpen(true)}
                aria-label={L.emergency.long}
                title={L.emergency.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-destructive/20 bg-gradient-to-b from-destructive/5 to-destructive/10 px-0.5 py-1.5 sm:px-1 text-destructive transition-all duration-200 active:scale-[0.97]"
              >
                <Zap className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.emergency.short}
                </span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label={L.track.long}>
              <button
                onClick={() => navigate("/track")}
                aria-label={L.track.long}
                title={L.track.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-secondary/40 px-0.5 py-1.5 sm:px-1 text-foreground/90 transition-all duration-200 active:scale-[0.97]"
              >
                <Route className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.track.short}
                </span>
              </button>
            </LongPressTooltip>

            <span
              aria-hidden
              className="mx-px xs:mx-0.5 sm:mx-1 my-1.5 w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-border/70 to-transparent"
            />

            <LongPressTooltip label={L.lang.long}>
              <button
                onClick={toggleLang}
                aria-label={L.lang.long}
                title={L.lang.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-secondary/40 px-0.5 py-1.5 sm:px-1 text-foreground/90 transition-all duration-200 active:scale-[0.97]"
              >
                <Globe className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.lang.short}
                </span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label={L.cart.long}>
              <button
                onClick={() => setIsOpen(true)}
                aria-label={L.cart.long}
                title={L.cart.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-secondary/40 px-0.5 py-1.5 sm:px-1 text-foreground/90 transition-all duration-200 active:scale-[0.97]"
              >
                <span className="relative flex h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px] items-center justify-center">
                  <ShoppingBag className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-mobile-accent px-1 text-[9px] font-bold leading-none text-mobile-accent-foreground ring-[1.5px] ring-background">
                      {totalItems}
                    </span>
                  )}
                </span>
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.cart.short}
                </span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label={L.alerts.long}>
              <button
                onClick={() => navigate("/notifications")}
                aria-label={L.alerts.long}
                title={L.alerts.long}
                className="press group relative flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-secondary/40 px-0.5 py-1.5 sm:px-1 text-foreground/90 transition-all duration-200 active:scale-[0.97]"
              >
                <span className="relative flex h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px] items-center justify-center">
                  <Bell className="h-4 w-4 xs:h-[17px] xs:w-[17px] sm:h-[18px] sm:w-[18px]" />
                  <span className="absolute -top-0.5 -right-0.5 h-[7px] w-[7px] rounded-full bg-destructive motion-safe:animate-pulse" />
                </span>
                <span className="text-[9px] xs:text-[10px] font-semibold leading-none truncate max-w-full">
                  {L.alerts.short}
                </span>
              </button>
            </LongPressTooltip>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 top-0 z-40 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 right-0 top-full z-50 border-t border-border bg-card px-3 py-3 shadow-xl"
            >
              <div className="mb-2">
                <LocationSelector />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRequestOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-mobile-accent px-3 py-2 text-xs font-semibold text-mobile-accent-foreground active:scale-95"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {L.request.short}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setEmergencyOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground active:scale-95"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {L.emergency.short}
                </button>

                <button
                  onClick={toggleLang}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground active:scale-95"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {L.lang.short}
                </button>
              </div>

              <div className="mt-3">
                <TrackingPopover iconSize="h-3.5 w-3.5" showLabel mobileLabel />
              </div>
            </motion.div>
          </div>
        )}

        {/* Desktop header */}
        <div className="app-container hidden md:flex items-center gap-4 py-1.5">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/")} className="flex bg-transparent dark:bg-white rounded-xl p-1 items-center gap-2">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.logo_text}
                  className="h-10 lg:h-12 object-contain"
                />
              ) : (
                <span className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                  {settings.logo_text}
                  <span className="text-gradient-green">{settings.logo_accent}</span>
                </span>
              )}
            </button>

            <LocationSelector />
          </div>

          {/* Primary actions */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <button
              onClick={() => setRequestOpen(true)}
              className="flex text-nowrap items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-400 hover:shadow-md"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {bn ? "সার্ভিস রিকোয়েস্ট" : "Request"}
            </button>

            <button
              onClick={() => setEmergencyOpen(true)}
              className="text-nowrap flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground shadow-sm transition-all hover:bg-destructive/90 hover:shadow-md animate-pulse"
            >
              <Zap className="h-3.5 w-3.5" />
              {t("emergency.btn")}
            </button>

            <TrackingPopover showLabel />
          </div>

          {/* Utilities + User */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Wishlist */}
            <button
              onClick={() => {
                if (isLoggedIn) {
                  navigate("/mart/wishlist");
                } else {
                  navigate("/auth", { state: { from: "/mart/wishlist" } });
                }
              }}
              className="relative h-10 w-10 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
              aria-label={bn ? "উইশলিস্ট" : "Wishlist"}
              title={
                isLoggedIn
                  ? bn
                    ? "উইশলিস্ট"
                    : "Wishlist"
                  : bn
                    ? "উইশলিস্ট দেখতে লগইন করুন"
                    : "Login to view wishlist"
              }
            >
              <Heart
                className={`h-4.5 w-4.5 ${
                  isLoggedIn ? "text-foreground" : "text-muted-foreground"
                }`}
              />

              {isLoggedIn && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              aria-label={bn ? "কার্ট" : "Cart"}
              title={bn ? "কার্ট" : "Cart"}
            >
              <ShoppingCart className="h-4.5 w-4.5 text-primary dark:text-white" />

              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Theme toggle (dark/light) */}
            <button
              onClick={() => cycle()}
              aria-label={bn ? "থিম পরিবর্তন করুন" : "Toggle theme"}
              title={bn ? "থিম পরিবর্তন করুন" : "Toggle theme"}
              className="group flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 text-foreground/85 transition-all hover:border-primary/40 hover:bg-secondary hover:text-foreground"
            >
              {mode === "dark" ? (
                <Moon className="h-4 w-4 text-primary/80" />
              ) : (
                <Sun className="h-4 w-4 text-primary/80" />
              )}
              <span className="text-[11px] font-bold leading-none tracking-wide">
                {bn ? (mode === "dark" ? "ডার্ক" : "লাইট") : mode === "dark" ? "Dark" : "Light"}
              </span>
            </button>

            {/* Language */}
            <button
              onClick={toggleLang}
              aria-label={language === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
              title={language === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
              className="group flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 text-foreground/85 transition-all hover:border-primary/40 hover:bg-secondary hover:text-foreground"
            >
              <Globe className="h-4 w-4 text-primary/80" />
              <span className="flex items-center gap-1 text-[11px] font-bold leading-none tracking-wide">
                <span className={language === "bn" ? "text-foreground" : "text-muted-foreground/60"}>
                  BN
                </span>
                <span aria-hidden="true" className="h-2.5 w-px bg-border/80" />
                <span className={language === "en" ? "text-foreground" : "text-muted-foreground/60"}>
                  EN
                </span>
              </span>
            </button>

            {user ? (
              <>
                {visiblePanels.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {bn ? "প্যানেল" : "Panels"}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-56 p-1.5" align="end">
                      <div className="flex flex-col">
                        {visiblePanels.map((p) => {
                          const Icon = p.icon;

                          return (
                            <button
                              key={p.to}
                              onClick={() => navigate(p.to)}
                              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                            >
                              <Icon className="h-4 w-4 text-primary" />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <button
                  onClick={() => navigate("/dashboard?tab=bookings")}
                  className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {t("nav.myBookings")}
                </button>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80">
                      <User className="h-3.5 w-3.5" />
                      {bn ? "অ্যাকাউন্ট" : "Account"}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent className="w-48 p-1.5 z-[9999] bg-secondary" align="end">
                    <div className="flex flex-col">
                      <button
                        onClick={() => navigate("/dashboard?tab=bookings")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary lg:hidden"
                      >
                        <ClipboardList className="h-4 w-4 text-primary" />
                        {t("nav.myBookings")}
                      </button>

                      <button
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        {isMartVendor ? (
                          <Store className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                        {isMartVendor
                          ? bn
                            ? "মার্ট ভেন্ডর প্রোফাইল"
                            : "Mart Vendor Profile"
                          : bn
                            ? "প্রোফাইল"
                            : "Profile"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=requests")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <Route className="h-4 w-4 text-primary" />
                        {bn ? "সার্ভিস রিকোয়েস্ট" : "Service Requests"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=mart-orders")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        {bn ? "মার্ট অর্ডার্স" : "Mart Orders"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=deal-favorites")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <Heart className="h-4 w-4 text-primary" />
                        {bn ? "পছন্দের" : "Favorites"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=deal-my-ads")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <Store className="h-4 w-4 text-primary" />
                        {bn ? "আমার এড" : "My Ads"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=deal-messages")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <Headphones className="h-4 w-4 text-primary" />
                        {bn ? "মেসেজ" : "Messages"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=payments")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        {bn ? "পেমেন্টস" : "Payments"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=reviews")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {bn ? "রিভিউ" : "Reviews"}
                      </button>

                      <button
                        onClick={() => navigate("/dashboard?tab=notifications")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <Bell className="h-4 w-4 text-primary" />
                        {bn ? "নোটিফিকেশন" : "Notifications"}
                      </button>

                      <div className="my-1 border-t border-border" />

                      <button
                        onClick={() => navigate("/user-dashboard")}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <User className="h-4 w-4 text-blue-600" />
                        {bn ? "আমার ড্যাশবোর্ড" : "My Dashboard"}
                      </button>

                      <button
                        onClick={handleDashboardClick}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <User className="h-4 w-4 text-primary" />
                        {bn ? "ড্যাশবোর্ড" : "Dashboard"}
                      </button>

                      <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                        >
                        <LogOut className="h-4 w-4" />
                        {t("nav.logout")}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/80">
                    <User className="h-3.5 w-3.5" />
                    {t("nav.login")}
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
                </PopoverTrigger>

                <PopoverContent className="w-52 p-1.5 z-[9999] bg-secondary" align="end">
                  <div className="flex flex-col">
                    <button
                      onClick={() => navigate("/auth?tab=signup")}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-primary 
                      hover:text-white"
                    >
                      <UserPlus className="h-4 w-4" />
                      {bn ? "একাউন্ট তৈরী করুন" : "Create Account"}
                    </button>

                    <button
                      onClick={() => navigate("/auth")}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-primary 
                      hover:text-white"
                    >
                      <LogIn className="h-4 w-4 text-forground" />
                      {bn ? "লগইন করুন" : "Login"}
                    </button>

                    {/* <div className="my-1 border-t border-border" /> */}

                    <button
                      onClick={() => navigate("/main-login")}
                      className="hidden items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Building2 className="h-4 w-4 text-primary" />
                      {bn ? "অফিস লগইন" : "Office Login"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </motion.nav>

      <EmergencyServiceModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
      <RequestService
        externalOpen={requestOpen}
        onExternalOpenChange={setRequestOpen}
        hideCard
      />
    </>
  );
};

export default Navbar;
