import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Wrench, Sparkles, BarChart3, Calendar, FileText, Wallet, Inbox, LifeBuoy, Package, ImagePlus, Grid3X3, Percent, Image as ImageIcon, LayoutList, ShoppingCart, Handshake, Briefcase, Store, MessageSquare, Bot, Bell, ShieldCheck, MapPinCheck, Trophy, Star, UserPlus, Users, Tag, Banknote, BookOpenCheck, Settings, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[]; accent: string; dot: string };

export const NAV: NavGroup[] = [
  {
    label: "ড্যাশবোর্ড",
    accent: "from-emerald-500 to-emerald-600",
    dot: "bg-emerald-500",
    items: [
      { to: "/admin/service", label: "সার্ভিস ড্যাশবোর্ড", icon: <Wrench className="h-5 w-5" /> },
      { to: "/admin/smart-dashboard", label: "স্মার্ট ড্যাশবোর্ড", icon: <Sparkles className="h-5 w-5" /> },
      { to: "/admin/analytics", label: "অ্যানালিটিক্স", icon: <BarChart3 className="h-5 w-5" /> },
      { to: "/admin/bookings", label: "বুকিং", icon: <Calendar className="h-5 w-5" /> },
      { to: "/admin/requests", label: "সার্ভিস রিকোয়েস্ট", icon: <FileText className="h-5 w-5" /> },
      { to: "/admin/accounts", label: "একাউন্টস", icon: <Wallet className="h-5 w-5" /> },
      { to: "/admin/approval-queue", label: "অনুমোদন কিউ", icon: <Inbox className="h-5 w-5" /> },
      { to: "/admin/disputes", label: "অভিযোগ ও রিফান্ড", icon: <LifeBuoy className="h-5 w-5" /> },
    ],
  },
  {
    label: "সার্ভিস CMS",
    accent: "from-sky-500 to-blue-600",
    dot: "bg-sky-500",
    items: [
      { to: "/admin/services", label: "সার্ভিস", icon: <Package className="h-5 w-5" /> },
      { to: "/admin/service-images", label: "সার্ভিসর ছবি", icon: <ImagePlus className="h-5 w-5" /> },
      { to: "/admin/categories", label: "ক্যাটেগরি", icon: <Grid3X3 className="h-5 w-5" /> },
      { to: "/admin/offers", label: "অফার", icon: <Percent className="h-5 w-5" /> },
      { to: "/admin/banners", label: "ব্যানার", icon: <ImageIcon className="h-5 w-5" /> },
      { to: "/admin/sections", label: "সেকশন", icon: <LayoutList className="h-5 w-5" /> },
    ],
  },
  {
    label: "সন্ধান মার্ট",
    accent: "from-emerald-500 to-teal-600",
    dot: "bg-teal-500",
    items: [
      { to: "/admin/mart-overview", label: "মার্ট ওভারভিউ", icon: <ShoppingCart className="h-5 w-5" /> },
    ],
  },
  {
    label: "সন্ধান ডিল",
    accent: "from-amber-500 to-orange-600",
    dot: "bg-amber-500",
    items: [
      { to: "/admin/deal-overview", label: "ডিল ওভারভিউ", icon: <Handshake className="h-5 w-5" /> },
      { to: "/admin/deal-categories", label: "ডিল ক্যাটেগরি", icon: <Grid3X3 className="h-5 w-5" /> },
    ],
  },
  {
    label: "সন্ধান জবস",
    accent: "from-blue-500 to-indigo-600",
    dot: "bg-blue-500",
    items: [
      { to: "/admin/job-listings", label: "চাকরি বিজ্ঞাপন", icon: <Briefcase className="h-5 w-5" /> },
      { to: "/admin/employers", label: "এমপ্লয়ার", icon: <Store className="h-5 w-5" /> },
    ],
  },
  {
    label: "কমিউনিকেশন",
    accent: "from-fuchsia-500 to-purple-600",
    dot: "bg-fuchsia-500",
    items: [
      { to: "/admin/contacts", label: "মেসেজ", icon: <MessageSquare className="h-5 w-5" /> },
      { to: "/admin/chat-history", label: "চ্যাট হিস্ট্রি", icon: <Bot className="h-5 w-5" /> },
      { to: "/admin/notifications", label: "নোটিফিকেশন", icon: <Bell className="h-5 w-5" /> },
      { to: "/admin/notification-rules", label: "নোটিফিকেশন নিয়ম", icon: <ShieldCheck className="h-5 w-5" /> },
    ],
  },
  {
    label: "হিউম্যান রিসোর্স",
    accent: "from-rose-500 to-pink-600",
    dot: "bg-rose-500",
    items: [
      { to: "/admin/jobs", label: "আবেদন", icon: <Briefcase className="h-5 w-5" /> },
      { to: "/admin/representatives", label: "প্রতিনিধি", icon: <MapPinCheck className="h-5 w-5" /> },
      { to: "/admin/leaderboard", label: "লিডারবোর্ড", icon: <Trophy className="h-5 w-5" /> },
      { to: "/admin/reviews", label: "রিভিউ", icon: <Star className="h-5 w-5" /> },
      { to: "/admin/staff-assignments", label: "স্টাফ অ্যাসাইনমেন্ট", icon: <UserPlus className="h-5 w-5" /> },
      { to: "/admin/staff-workload", label: "স্টাফ ওয়ার্কলোড", icon: <Users className="h-5 w-5" /> },
    ],
  },
  {
    label: "ফিনান্স",
    accent: "from-yellow-500 to-amber-600",
    dot: "bg-yellow-500",
    items: [
      { to: "/admin/coupons", label: "কুপন", icon: <Tag className="h-5 w-5" /> },
      { to: "/admin/withdrawals", label: "উইথড্রয়াল", icon: <Banknote className="h-5 w-5" /> },
      { to: "/admin/payment-ledger", label: "পেমেন্ট লেজার", icon: <BookOpenCheck className="h-5 w-5" /> },
    ],
  },
  {
    label: "সিস্টেম",
    accent: "from-slate-500 to-slate-700",
    dot: "bg-slate-500",
    items: [
      { to: "/admin/users", label: "ইউজার ম্যানেজমেন্ট", icon: <Users className="h-5 w-5" /> },
      { to: "/admin/permissions", label: "পারমিশন", icon: <ShieldCheck className="h-5 w-5" /> },
      { to: "/admin/settings", label: "সেটিংস", icon: <Settings className="h-5 w-5" /> },
      { to: "/admin/audit-logs", label: "অডিট লগ", icon: <ScrollText className="h-5 w-5" /> },
    ],
  },
];

interface WorkspaceDashboardProps {
  userRole?: string;
}

const SERVICE_ADMIN_ALLOWED_PATHS = new Set([
  "/admin/service",
  "/admin/bookings",
  "/admin/requests",
  "/admin/services",
  "/admin/service-images",
  "/admin/categories",
  "/admin/offers",
  "/admin/banners",
  "/admin/sections",
  "/admin/contacts",
  "/admin/chat-history",
  "/admin/notifications",
  "/admin/reviews",
]);

const WorkspaceDashboard = ({ userRole }: WorkspaceDashboardProps) => {
  const filteredNav =
    userRole === "service_admin"
      ? NAV.map((group) => ({
          ...group,
          items: group.items.filter((item) => SERVICE_ADMIN_ALLOWED_PATHS.has(item.to)),
        })).filter((group) => group.items.length > 0)
      : NAV;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          অ্যাডমিন ওয়ার্কস্পেস
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          দ্রুত অ্যাক্সেস করতে নিচের মডিউলগুলোতে ক্লিক করুন
        </p>
      </div>

      {/* Render each group dynamically */}
      {filteredNav.map((group, groupIndex) => (
        <div key={group.label}>
          {/* Group Header */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className={cn("h-2 w-2 rounded-full", group.dot)} />
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50 uppercase">{group.label}</h3>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{group.items.length}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50 ml-2" />
          </div>

          {/* Grid Container */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {group.items.map((item, itemIndex) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: (groupIndex * 0.02) + (itemIndex * 0.02) }}
              >
                <Link
                  to={item.to}
                  className="group flex flex-col h-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1 cursor-pointer"
                  aria-label={`Go to ${item.label}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 [&>svg]:h-5 [&>svg]:w-5",
                      group.accent
                    )}>
                      {item.icon}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                      {item.to}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceDashboard;