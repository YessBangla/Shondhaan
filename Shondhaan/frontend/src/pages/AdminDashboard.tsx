import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Calendar, Clock, MapPin, Phone, User, RefreshCw,
  LayoutDashboard, Zap, UserCheck, Wallet, MessageSquare, TrendingUp,
  Users, CheckCircle, Package, Grid3X3, Percent, Image, LayoutList,
  Settings, FileText, Briefcase, Star, ShieldCheck, Bot, MapPinCheck,
  BarChart3, Bell, Tag, Banknote, ImagePlus, Handshake, ShoppingCart,
  Store, Truck, Flag, Eye, Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import CategoryFilterDropdown, { useServiceCategoryMap } from "@/components/CategoryFilterDropdown";

// CMS sub-components
import AdminServices from "@/components/admin/AdminServices";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminOffers from "@/components/admin/AdminOffers";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminHomepageSections from "@/components/admin/AdminHomepageSections";
import AdminSiteSettings from "@/components/admin/AdminSiteSettings";
import AdminServiceRequests from "@/components/admin/AdminServiceRequests";
import AdminContactMessages from "@/components/admin/AdminContactMessages";
import AdminJobApplications from "@/components/admin/AdminJobApplications";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminUserRoles from "@/components/admin/AdminUserRoles";
import AdminPermissions from "@/components/admin/AdminPermissions";
import AdminChatHistory from "@/components/admin/AdminChatHistory";
import AdminRepresentatives from "@/components/admin/AdminRepresentatives";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";
import ServiceImageManager from "@/components/admin/ServiceImageManager";
import AdminDealManagement from "@/components/admin/AdminDealManagement";
import AdminMartOverview from "@/components/admin/AdminMartOverview";
import AdminDealOverview from "@/components/admin/AdminDealOverview";
import RepLeaderboard from "@/components/RepLeaderboard";
import AdminJobListings from "@/components/admin/AdminJobListings";
import AdminEmployerManagement from "@/components/admin/AdminEmployerManagement";

interface Booking {
  id: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  is_emergency: boolean;
  provider_id: string | null;
}

interface Provider {
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

const statusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "নিশ্চিত", className: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "সম্পন্ন", className: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const sidebarItems = [
  // ড্যাশবোর্ড
  { value: "analytics", label: "অ্যানালিটিক্স", icon: <BarChart3 />, group: "ড্যাশবোর্ড" },
  { value: "bookings", label: "বুকিং", icon: <Calendar />, group: "ড্যাশবোর্ড" },
  { value: "requests", label: "সেবা রিকোয়েস্ট", icon: <FileText />, group: "ড্যাশবোর্ড" },
  { value: "accounts", label: "একাউন্টস", icon: <Wallet />, group: "ড্যাশবোর্ড" },

  // সেবা CMS
  { value: "services", label: "সেবা", icon: <Package />, group: "সেবা CMS" },
  { value: "service-images", label: "সেবার ছবি", icon: <ImagePlus />, group: "সেবা CMS" },
  { value: "categories", label: "ক্যাটেগরি", icon: <Grid3X3 />, group: "সেবা CMS" },
  { value: "offers", label: "অফার", icon: <Percent />, group: "সেবা CMS" },
  { value: "banners", label: "ব্যানার", icon: <Image />, group: "সেবা CMS" },
  { value: "sections", label: "সেকশন", icon: <LayoutList />, group: "সেবা CMS" },

  // ইয়েস মার্ট
  { value: "mart-overview", label: "মার্ট ওভারভিউ", icon: <ShoppingCart />, group: "ইয়েস মার্ট" },

  // ইয়েস ডিল
  { value: "deal-overview", label: "ডিল ওভারভিউ", icon: <Handshake />, group: "ইয়েস ডিল" },
  { value: "deal-categories", label: "ডিল ক্যাটেগরি", icon: <Grid3X3 />, group: "ইয়েস ডিল" },

  // ইয়েস জবস
  { value: "job-listings", label: "চাকরি বিজ্ঞাপন", icon: <Briefcase />, group: "ইয়েস জবস" },
  { value: "employers", label: "এমপ্লয়ার", icon: <Store />, group: "ইয়েস জবস" },

  // কমিউনিকেশন
  { value: "contacts", label: "মেসেজ", icon: <MessageSquare />, group: "কমিউনিকেশন" },
  { value: "chat-history", label: "চ্যাট হিস্ট্রি", icon: <Bot />, group: "কমিউনিকেশন" },
  { value: "notifications", label: "নোটিফিকেশন", icon: <Bell />, group: "কমিউনিকেশন" },

  // হিউম্যান রিসোর্স
  { value: "jobs", label: "আবেদন", icon: <Briefcase />, group: "হিউম্যান রিসোর্স" },
  { value: "representatives", label: "প্রতিনিধি", icon: <MapPinCheck />, group: "হিউম্যান রিসোর্স" },
  { value: "leaderboard", label: "লিডারবোর্ড", icon: <Trophy />, group: "হিউম্যান রিসোর্স" },
  { value: "reviews", label: "রিভিউ", icon: <Star />, group: "হিউম্যান রিসোর্স" },

  // ফিনান্স
  { value: "coupons", label: "কুপন", icon: <Tag />, group: "ফিনান্স" },
  { value: "withdrawals", label: "উইথড্রয়াল", icon: <Banknote />, group: "ফিনান্স" },

  // সিস্টেম
  { value: "users", label: "ইউজার রোল", icon: <Users />, group: "সিস্টেম" },
  { value: "permissions", label: "পারমিশন", icon: <ShieldCheck />, group: "সিস্টেম" },
  { value: "settings", label: "সেটিংস", icon: <Settings />, group: "সিস্টেম" },
];

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { data: serviceCategoryMap } = useServiceCategoryMap();

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkAdmin = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (data) setIsAdmin(true);
    else { setIsAdmin(false); setLoading(false); }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (!error && data) setBookings(data as Booking[]);
    setLoading(false);
  }, []);

  const fetchProviders = useCallback(async () => {
    const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
    if (!roleData || roleData.length === 0) return;
    const { data: profileData } = await supabase.from("profiles").select("user_id, display_name, phone").in("user_id", roleData.map(r => r.user_id));
    if (profileData) setProviders(profileData);
  }, []);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);
  useEffect(() => { if (isAdmin) { fetchBookings(); fetchProviders(); } }, [isAdmin, fetchBookings, fetchProviders]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    if (!error) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    setUpdatingId(null);
  };

  const handleAssignProvider = async (bookingId: string, providerId: string | null) => {
    setAssigningId(bookingId);
    const { error } = await supabase.from("bookings").update({ provider_id: providerId || null }).eq("id", bookingId);
    if (!error) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, provider_id: providerId || null } : b));
    setAssigningId(null);
  };

  const statusFiltered = filterStatus === "all" ? bookings
    : filterStatus === "emergency" ? bookings.filter(b => b.is_emergency)
    : bookings.filter(b => b.status === filterStatus);
  const filtered = filterCategory === "all" ? statusFiltered
    : statusFiltered.filter(b => serviceCategoryMap?.get(b.service_slug) === filterCategory);
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (authLoading || loading) {
    return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>);
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><LayoutDashboard className="h-8 w-8 text-muted-foreground" /></div>
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">এই পেজটি শুধুমাত্র অ্যাডমিনদের জন্য।</p>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</button>
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  const renderContent = (activeTab: string) => {
    switch (activeTab) {
      case "analytics": return <AdminAnalytics />;
      case "bookings": return (
        <div className="p-4">
          {/* Dashboard Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
                  <p className="text-xs text-muted-foreground">মোট বুকিং</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookings.filter(b => b.status === "pending").length}</p>
                  <p className="text-xs text-muted-foreground">অপেক্ষমাণ</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookings.filter(b => b.status === "completed").length}</p>
                  <p className="text-xs text-muted-foreground">সম্পন্ন</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10"><Zap className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookings.filter(b => b.is_emergency).length}</p>
                  <p className="text-xs text-muted-foreground">জরুরী</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Emergency count */}
          {bookings.filter(b => b.is_emergency).length > 0 && (
            <button onClick={() => setFilterStatus(filterStatus === "emergency" ? "all" : "emergency")}
              className={`mb-4 flex items-center gap-2 rounded-xl border p-3 transition-all w-full ${
                filterStatus === "emergency" ? "border-destructive ring-1 ring-destructive bg-destructive/5" : "border-border hover:border-destructive/40"
              }`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><Zap className="h-4 w-4" /></div>
              <div className="text-left">
                <p className="text-lg font-bold text-foreground">{bookings.filter(b => b.is_emergency).length}</p>
                <p className="text-xs font-medium text-destructive">জরুরী বুকিং</p>
              </div>
            </button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {statusOptions.map(s => {
              const count = bookings.filter(b => b.status === s.value).length;
              return (
                <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    filterStatus === s.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  }`}>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <CategoryFilterDropdown value={filterCategory} onChange={setFilterCategory} />
            {(filterStatus !== "all" || filterCategory !== "all") && (
              <button onClick={() => { setFilterStatus("all"); setFilterCategory("all"); }} className="text-xs text-primary hover:underline">← সব দেখুন</button>
            )}
          </div>

          <div className="space-y-3">
            {sorted.length === 0 ? (
              <div className="text-center py-16"><p className="text-muted-foreground">কোনো বুকিং পাওয়া যায়নি</p></div>
            ) : sorted.map((b, i) => {
              const s = statusOptions.find(o => o.value === b.status) || statusOptions[0];
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/service/${b.service_slug}`)} className="font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors">{b.service_title}</button>
                        {b.is_emergency && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"><Zap className="h-3 w-3" /> জরুরী</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{b.package_name} — ৳{b.package_price}</p>
                    </div>
                    <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)} disabled={updatingId === b.id}
                      className={`rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring ${s.className} disabled:opacity-50`}>
                      {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {b.customer_name}</span>
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {b.customer_phone}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {b.booking_date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {b.booking_time}</span>
                    <span className="flex items-center gap-1.5 col-span-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {b.customer_address}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">প্রোভাইডার:</span>
                    <select value={b.provider_id || ""} onChange={e => handleAssignProvider(b.id, e.target.value || null)} disabled={assigningId === b.id}
                      className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                      <option value="">অ্যাসাইন করুন</option>
                      {providers.map(p => <option key={p.user_id} value={p.user_id}>{p.display_name || "নাম নেই"} {p.phone ? `(${p.phone})` : ""}</option>)}
                    </select>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground/60">আইডি: {b.id.slice(0, 8)} • {new Date(b.created_at).toLocaleDateString("bn-BD")}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
      case "accounts": return <div className="p-4"><AccountsSection userId={user!.id} role="admin" /></div>;
      case "services": return <div className="p-4"><AdminServices /></div>;
      case "service-images": return <div className="p-4"><ServiceImageManager /></div>;
      case "categories": return <div className="p-4"><AdminCategories /></div>;
      case "offers": return <div className="p-4"><AdminOffers /></div>;
      case "banners": return <div className="p-4"><AdminBanners /></div>;
      case "sections": return <div className="p-4"><AdminHomepageSections /></div>;
      case "requests": return <div className="p-4"><AdminServiceRequests /></div>;
      case "contacts": return <div className="p-4"><AdminContactMessages /></div>;
      case "jobs": return <div className="p-4"><AdminJobApplications /></div>;
      case "job-listings": return <div className="p-4"><AdminJobListings /></div>;
      case "employers": return <div className="p-4"><AdminEmployerManagement /></div>;
      case "reviews": return <div className="p-4"><AdminReviews /></div>;
      case "users": return (
        <div className="p-4 space-y-4">
          <button
            onClick={() => navigate("/admin/roles")}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm md:text-base font-semibold">প্রতিটি রোলের আলাদা পেইজ</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  ১৪টি রোল, ইউজার তালিকা, পারমিশন ও প্যানেল লিংক একসাথে দেখুন
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-primary">খুলুন →</span>
          </button>
          <AdminUserRoles />
        </div>
      );
      case "permissions": return <div className="p-4"><AdminPermissions /></div>;
      case "chat-history": return <div className="p-4"><AdminChatHistory /></div>;
      case "representatives": return <div className="p-4"><AdminRepresentatives /></div>;
      case "leaderboard": return <div className="p-4"><RepLeaderboard currentUserId={user?.id} /></div>;
      case "notifications": return <div className="p-4"><AdminNotificationCenter /></div>;
      case "coupons": return <div className="p-4"><AdminCoupons /></div>;
      case "withdrawals": return <div className="p-4"><AdminWithdrawals /></div>;
      case "mart-overview": return <AdminMartOverview />;
      case "deal-overview": return <AdminDealOverview />;
      case "deal-categories": return <div className="p-4"><AdminDealManagement /></div>;
      case "settings": return <div className="p-4"><AdminSiteSettings /></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="font-heading text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" /> অ্যাডমিন ড্যাশবোর্ড
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ইন্টার্নাল চ্যাট</span>
            </Button>
            <NotificationBell />
            <button onClick={fetchBookings} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={sidebarItems}
            defaultValue="analytics"
            panelTitle="অ্যাডমিন প্যানেল"
            panelIcon={<LayoutDashboard className="h-4 w-4" />}
            hero={{
              title: "অ্যাডমিন কন্ট্রোল সেন্টার",
              subtitle: "সেবা, অর্ডার, ইউজার ও কনটেন্ট — একটি ইউনিফাইড ওয়ার্কস্পেস থেকে নিয়ন্ত্রণ করুন।",
              badge: { label: "অ্যাডমিন ড্যাশবোর্ড" },
              gradient: "from-rose-500 via-red-600 to-rose-700",
            }}
          >
            {renderContent}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default AdminDashboard;
