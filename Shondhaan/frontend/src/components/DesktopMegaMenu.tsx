import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { getRoleProfilePath, getRoleRedirectPath } from "@/lib/roleRedirect";
import { ROLES, type RoleKey } from "@/config/roles";
import {
  Home, Briefcase, ShoppingCart, Tag, ChevronDown,
  Search, FileText, Users, Building2, UserCircle, Heart,
  Clock, Star, Globe, MapPin, Laptop, GraduationCap,
  TrendingUp, PlusCircle, LayoutDashboard, BookOpen, Award,
  CalendarCheck, Send, Wrench, Headphones, MapPinCheck,
  ShieldCheck, Crown, DollarSign, MessageSquare, Store,
  Package, Truck, HelpCircle, Info, Phone, Shield,
  ClipboardList, Eye, Zap, Route, UserPlus, Settings,
  ShoppingBag, Layers, Grid3X3, Inbox, BarChart3,
  FileSearch, Video, Hash, List, Percent, ArrowRightLeft,
  Receipt, LogIn, BookMarked, History, CreditCard,
  Bookmark, PackageSearch, Gift, BadgePercent, Megaphone,
  Image, Bell, UserCheck, AlertTriangle, Wallet, Banknote,
  ReceiptText, HandCoins, ServerCog, Database, KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  labelBn: string;
  labelEn: string;
  href?: string;
  icon?: any;
  description?: string;
  descriptionEn?: string;
}

interface MenuGroup {
  key: string;
  labelBn: string;
  labelEn: string;
  icon: any;
  children: MenuItem[];
}

const DesktopMegaMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const mysqlRole = getMySqlAuth()?.user.type;
  const effectiveRoles = Array.from(new Set([...userRoles, ...(mysqlRole ? [mysqlRole] : [])]));
  const rolePriority: RoleKey[] = [
    "super_admin",
    "admin",
    "mart_admin",
    "job_admin",
    "moderator",
    "finance",
    "supervisor",
    "call_center",
    "representative",
    "provider",
    "mart_vendor",
    "mart_delivery",
    "mart_cs",
    "yessdeal_seller",
    "employer",
    "user",
  ];
  const dashboardRole = ROLES.find((role) =>
    rolePriority.some((key) => key === role.key && effectiveRoles.includes(key))
  );
  const dashboardLabelBn =
    dashboardRole && dashboardRole.key !== "user"
      ? `${dashboardRole.labelBn} ড্যাশবোর্ড`
      : "ক্লায়েন্ট ড্যাশবোর্ড";
  const dashboardLabelEn =
    dashboardRole && dashboardRole.key !== "user"
      ? `${dashboardRole.labelEn} Dashboard`
      : "Dashboard";
  const isMartVendor = effectiveRoles.includes("mart_vendor");
  const profileLabelBn = isMartVendor ? "মার্ট ভেন্ডর প্রোফাইল" : "প্রোফাইল সেটিংস";
  const profileLabelEn = isMartVendor ? "Mart Vendor Profile" : "Profile Settings";
const hasSidebar =
  location.pathname.startsWith("/mart/store") ||
  location.pathname.startsWith("/mart/delivery") ||
  location.pathname.startsWith("/dashboard");
  useEffect(() => {
    if (!user) { setUserRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id)
      .then(({ data }) => setUserRoles(data?.map(r => r.role) || []));
  }, [user]);

  const hiddenPaths = [
    "/login", "/reset-password",
    "/main-login", "/mart/login", "/deal/login", "/jobs/login",
    "/admin", "/call-center", "/provider", "/representative",
    "/moderator", "/supervisor", "/finance", "/internal", "/super-admin",
    "/mart/admin", "/mart/cs",
    "/yessdeal", "/dashboard",
  ];
  if (location.pathname === "/mart") return null;
if (hiddenPaths.some(p => location.pathname === p || location.pathname.startsWith(p + "/"))) return null;

  const handleDashboardClick = async () => {
    const path = await getRoleRedirectPath();
    navigate(path);
  };

  const handleProfileClick = async () => {
    const path = await getRoleProfilePath();
    navigate(path);
  };

  const menus: MenuGroup[] = [
    {
      key: "home",
      labelBn: "হোম ও সার্ভিস",
      labelEn: "Home & Services",
      icon: Home,
      children: [
        { labelBn: "মূল পেজ", labelEn: "Home", href: "/", icon: Home },
        { labelBn: "সকল সার্ভিস", labelEn: "All Services", href: "/all-services", icon: Layers },
        { labelBn: "সার্ভিস তুলনা", labelEn: "Compare Services", href: "/compare", icon: ArrowRightLeft },
        { labelBn: "সার্ভিস ট্র্যাকিং", labelEn: "Track Service", href: "/track/search", icon: Route },
        // { labelBn: "চেকআউট", labelEn: "Checkout", href: "/checkout", icon: ShoppingCart },
        // { labelBn: "বুকিং কনফার্মেশন", labelEn: "Booking Confirmation", href: "/booking-confirmation", icon: BookMarked },
      ],
    },
    {
      key: "mart",
      labelBn: "মার্ট",
      labelEn: "Mart",
      icon: ShoppingBag,
      children: [
        { labelBn: "মার্ট হোম", labelEn: "Mart Home", href: "/mart/home", icon: Store },
        { labelBn: "প্রোডাক্ট খুঁজুন", labelEn: "Browse Products", href: "/mart/home#products", icon: Search },
        { labelBn: "উইশলিস্ট", labelEn: "Wishlist", href: "/mart/wishlist", icon: Heart },
        { labelBn: "অর্ডারসমূহ", labelEn: "My Orders", href: "/mart/orders", icon: Package },
        { labelBn: "প্রোডাক্ট তুলনা", labelEn: "Compare Products", href: "/mart/compare", icon: ArrowRightLeft },
        { labelBn: "মার্ট চেকআউট", labelEn: "Mart Checkout", href: "/mart/checkout", icon: ShoppingCart },
        { labelBn: "মার্ট ইনবক্স", labelEn: "Mart Inbox", href: "/mart/inbox", icon: Inbox },
        { labelBn: "আমার শপ", labelEn: "My Shop", href: "/mart/my-shop", icon: Store },
      ],
    },
    {
      key: "deal",
      labelBn: "ডিল",
      labelEn: "Deal",
      icon: Tag,
      children: [
        { labelBn: "ডিল হোম", labelEn: "Deal Home", href: "/deal", icon: Tag },
        { labelBn: "সকল বিজ্ঞাপন", labelEn: "All Ads", href: "/deal/ads", icon: List },
        { labelBn: "বিজ্ঞাপন পোস্ট করুন", labelEn: "Post an Ad", href: "/deal/post", icon: PlusCircle },
        { labelBn: "আমার বিজ্ঞাপন", labelEn: "My Ads", href: "/deal/my-ads", icon: ClipboardList },
        { labelBn: "ডিল ইনবক্স", labelEn: "Deal Inbox", href: "/deal/inbox", icon: Inbox },
      ],
    },
    {
      key: "jobs",
      labelBn: "জবস",
      labelEn: "Jobs",
      icon: Briefcase,
      children: [
        { labelBn: "চাকরি হোম", labelEn: "Jobs Home", href: "/jobs", icon: Briefcase },
        { labelBn: "চাকরি পোস্ট করুন", labelEn: "Post a Job", href: "/jobs/post", icon: PlusCircle },
        { labelBn: "আমার আবেদন", labelEn: "My Applications", href: "/jobs/my", icon: Send },
        { labelBn: "চাকরিপ্রার্থী প্রোফাইল", labelEn: "Seeker Profile", href: "/jobs/profile", icon: UserCircle },
        { labelBn: "কোম্পানি তালিকা", labelEn: "Employer Directory", href: "/jobs/employers", icon: Building2 },
        { labelBn: "নিয়োগদাতা প্যানেল", labelEn: "Employer Panel", href: "/employer", icon: LayoutDashboard },
      ],
    },
    {
      key: "account",
      labelBn: "আমার একাউন্ট",
      labelEn: "My Account",
      icon: UserCircle,
      children: [
        { labelBn: dashboardLabelBn, labelEn: dashboardLabelEn, href: "/dashboard", icon: LayoutDashboard },
        { labelBn: profileLabelBn, labelEn: profileLabelEn, href: "/profile", icon: isMartVendor ? Store : UserCircle },
        { labelBn: "বুকিং ইতিহাস", labelEn: "Booking History", href: "/dashboard?tab=bookings", icon: History },
        { labelBn: "Service Requests", labelEn: "Service Requests", href: "/dashboard?tab=requests", icon: FileSearch },
        { labelBn: "Mart Orders", labelEn: "Mart Orders", href: "/dashboard?tab=mart-orders", icon: Package },
        { labelBn: "Mart Favorites", labelEn: "Mart Favorites", href: "/dashboard?tab=deal-favorites", icon: Heart },
        { labelBn: "My Ads", labelEn: "My Ads", href: "/dashboard?tab=deal-my-ads", icon: Megaphone },
        { labelBn: "Messages", labelEn: "Messages", href: "/dashboard?tab=deal-messages", icon: MessageSquare },
        { labelBn: "Payments", labelEn: "Payments", href: "/dashboard?tab=payments", icon: Wallet },
        { labelBn: "Reviews", labelEn: "Reviews", href: "/dashboard?tab=reviews", icon: Star },
        { labelBn: "Notifications", labelEn: "Notifications", href: "/dashboard?tab=notifications", icon: Bell },
        { labelBn: "সার্ভিস ট্র্যাক করুন", labelEn: "Track My Service", href: "/track/search", icon: Route },
        ...(!user ? [
          { labelBn: "লগইন", labelEn: "Login", href: "/login", icon: LogIn },
          { labelBn: "রেজিস্ট্রেশন", labelEn: "Register", href: "/auth?mode=register", icon: UserPlus },
          { labelBn: "পাসওয়ার্ড রিসেট", labelEn: "Reset Password", href: "/reset-password", icon: KeyRound },
        ] as MenuItem[] : []),
      ],
    },
    {
      key: "info",
      labelBn: "তথ্য ও সাহায্য",
      labelEn: "Info & Help",
      icon: Info,
      children: [
        { labelBn: "আমাদের সম্পর্কে", labelEn: "About Us", href: "/about", icon: Info },
        { labelBn: "যোগাযোগ করুন", labelEn: "Contact Us", href: "/contact", icon: Phone },
        { labelBn: "প্রশ্নোত্তর (FAQ)", labelEn: "FAQ", href: "/faq", icon: HelpCircle },
        { labelBn: "যোগ দিন (ক্যারিয়ার)", labelEn: "Join Us (Career)", href: "/join", icon: UserPlus },
        { labelBn: "শর্তাবলী", labelEn: "Terms & Conditions", href: "/terms", icon: FileText },
        { labelBn: "গোপনীয়তা নীতি", labelEn: "Privacy Policy", href: "/privacy", icon: Shield },
      ],
    },
    {
      key: "admin",
      labelBn: "অ্যাডমিন ও স্টাফ",
      labelEn: "Admin & Staff",
      icon: Settings,
      children: [
        { labelBn: "সুপার অ্যাডমিন", labelEn: "Super Admin", href: "/super-admin", icon: Crown },
        { labelBn: "অ্যাডমিন প্যানেল", labelEn: "Admin Dashboard", href: "/admin", icon: Settings },
        { labelBn: "কল সেন্টার", labelEn: "Call Center", href: "/call-center", icon: Headphones },
        { labelBn: "সার্ভিসদাতা প্যানেল", labelEn: "Provider Panel", href: "/provider", icon: Wrench },
        { labelBn: "এরিয়া প্রতিনিধি", labelEn: "Representative", href: "/representative", icon: MapPinCheck },
        { labelBn: "মডারেটর", labelEn: "Moderator", href: "/moderator", icon: ShieldCheck },
        { labelBn: "সুপারভাইজার", labelEn: "Supervisor", href: "/supervisor", icon: Eye },
        { labelBn: "ফিনান্স প্যানেল", labelEn: "Finance Panel", href: "/finance", icon: DollarSign },
        { labelBn: "ইন্টারনাল চ্যাট হাব", labelEn: "Internal Chat Hub", href: "/internal", icon: MessageSquare },
        { labelBn: "মার্ট শপ প্যানেল", labelEn: "Mart Shop Panel", href: "/mart", icon: Store },
        { labelBn: "মার্ট অ্যাডমিন", labelEn: "Mart Admin", href: "/mart/admin", icon: BarChart3 },
        { labelBn: "মার্ট ডেলিভারি", labelEn: "Mart Delivery", href: "/mart/delivery", icon: Truck },
        { labelBn: "মার্ট কাস্টমার সার্ভিস", labelEn: "Mart Customer Service", href: "/mart/cs", icon: Headphones },
        { labelBn: "ডিল প্যানেল", labelEn: "Deal Panel", href: "/yessdeal", icon: Tag },
      ],
    },
  ];

  const hasStaffRole = effectiveRoles.some(r => [
    "admin",
    "super_admin",
    "mart_admin",
    "job_admin",
    "deal_admin",
    "service_admin",
    "provider",
    "call_center",
    "representative",
    "moderator",
    "supervisor",
    "finance",
    "mart_vendor",
    "mart_delivery",
    "mart_cs",
    "yessdeal_seller",
    "employer",
  ].includes(r));

  const visibleMenus = menus.filter(m => {
    if (m.key === "admin") return user && hasStaffRole;
    return true;
  });

  // Check if current path is under this menu
  const isMenuActive = (menu: MenuGroup) => {
    return menu.children.some(c => c.href && c.href !== "/" && location.pathname.startsWith(c.href.split("?")[0]));
  };

  return (
  <div
  className={`hidden md:block fixed left-0 right-0 z-30
  ${hasSidebar ? "top-16" : "top-[68px]"}
    bg-primary border-b border-border/40`}>
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-center">
          {visibleMenus.map((menu) => {
            const active = isMenuActive(menu) || (menu.key === "home" && location.pathname === "/");
            return (
              <div
                key={menu.key}
                className="relative"
                onMouseEnter={() => setOpenMenu(menu.key)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  className={`
                    relative flex items-center gap-1.5 px-3 lg:px-4 py-2.5 text-xs lg:text-[13px] font-medium whitespace-nowrap transition-all duration-200
                    ${active
                      ? "text-white"
                      : openMenu === menu.key
                        ? "text-white"
                        : "text-white hover:text-foreground"
                    }
                  `}
                >
                  <menu.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  <span>{bn ? menu.labelBn : menu.labelEn}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openMenu === menu.key ? "rotate-180" : ""}`} />
                  
                  {/* Active indicator line */}
                  {(active || openMenu === menu.key) && (
                    <motion.div
                      layoutId="megamenu-active"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {openMenu === menu.key && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 
                      min-w-[260px] max-h-[75vh] overflow-y-auto rounded-xl border 
                      border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl py-2 z-50"
                    >
                      <div className="px-3 py-1.5 mb-1 border-b border-border/30">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {bn ? menu.labelBn : menu.labelEn}
                        </p>
                      </div>
                      {menu.children.map((child, i) => {
                        const isActive = child.href && (
                          child.href === "/" ? location.pathname === "/" : location.pathname === child.href.split("?")[0]
                        );
                        return (
                          <button
                            key={i}
                            onClick={async () => {
                              setOpenMenu(null);
                              if (child.href === "/dashboard") {
                                await handleDashboardClick();
                              } else if (child.href === "/profile") {
                                await handleProfileClick();
                              } else if (child.href) {
                                navigate(child.href);
                              }
                            }}
                            className={`
                              group flex w-full items-center gap-3 px-4 py-2.5 text-[13px] transition-all duration-150 rounded-lg mx-1
                              ${isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-foreground/80 hover:bg-primary hover:text-accent-foreground"
                              }
                            `}
                            style={{ width: "calc(100% - 8px)" }}
                          >
                            {child.icon && (
                              <span className={`
                                flex h-7 w-7 items-center justify-center rounded-lg transition-colors
                                ${isActive ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-white"}
                              `}>
                                <child.icon className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span>{bn ? child.labelBn : child.labelEn}</span>
                            {isActive && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
export default DesktopMegaMenu;

