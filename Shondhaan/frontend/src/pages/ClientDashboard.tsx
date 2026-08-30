import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Phone, MapPin, Save, Loader2,
  Package, Star, Bell, ClipboardList, CheckCircle2,
  FileSearch, Wallet, LogOut, Settings, Store,
  Home, Camera, MessageSquare, Mail,
  TrendingUp, BarChart3, PieChart, ArrowUpRight,
  Gift, Share2, Copy, Facebook, Youtube, Twitter, MessageCircle, X,
  Settings2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BookingCard from "@/components/client/BookingCard";
import ReviewModal from "@/components/client/ReviewModal";
import RebookModal from "@/components/client/RebookModal";
import ServiceRequestsTab from "@/components/client/ServiceRequestsTab";
import PaymentHistoryTab from "@/components/client/PaymentHistoryTab";
import BookingChatModal from "@/components/client/BookingChatModal";
import { ShoppingBag, Megaphone, Heart } from "lucide-react";
import DealSection from "@/components/client/DealSection";
import MartOrdersTab from "@/components/client/MartOrdersTab";
import AIWeeklySummaryCard from "@/components/client/AIWeeklySummaryCard";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { getMySqlAuth, saveMySqlAuth } from "@/lib/mysqlAuth";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import JobApplicationsTab from "@/components/client/JobApplicationsTab";
import ProfileContent from "@/components/ProfileContent";
import ServiceMessage from "@/pages/ServiceMessage";
import ReferralTab from "@/components/client/ReferralTab";
import { fetchReferralSettings } from "../lib/referralSettings";
import { useReferral } from "@/contexts/ReferalContext";


const MART_API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE;
const PROFILE_API_BASE =
  import.meta.env.VITE_CENTRAL_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE;
const SERVICE_API_BASE = (INDIVIDUAL_API_BASE_URL).replace(/\/+$/, "");
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
}

interface Review {
  id: string;
  service_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  created_at: string;
}

const extractApiArray = <T,>(payload: any): T[] => {
  return (
    payload?.data ??
    payload?.bookings ??
    payload?.orders ??
    payload?.results ??
    []
  );
};

const normalizeMartOrders = (orders: unknown[]): any[] =>
  orders.map((order) => {
    const source = order as Record<string, any>;
    const items = Array.isArray(source.items)
      ? source.items
      : Array.isArray(source.order_items)
        ? source.order_items
        : Array.isArray(source.mart_order_items)
          ? source.mart_order_items
          : [];
    return { ...source, items };
  });

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

const AreaChart = () => (
  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-20">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(0, 148, 67)" stopOpacity="0.3" />
        <stop offset="100%" stopColor="rgb(2, 109, 34)" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,30 Q20,5 40,20 T80,10 T100,25 V40 H0" fill="url(#grad1)" />
    <path d="M0,30 Q20,5 40,20 T80,10 T100,25" fill="none" stroke="rgb(1, 151, 93)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
  </svg>
);

const BarChart = ({ data }: { data: number[] }) => (
  <div className="flex items-end justify-between h-24 gap-2 w-full">
    {data.map((h, i) => (
      <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group flex items-end overflow-hidden border border-slate-200">
        <div className="w-full bg-gradient-to-t from-userprimary to-userprimaryshade rounded-t-lg transition-all duration-300 hover:from-userprimary hover:to-indigo-500 shadow-sm" style={{ height: `${h}%` }}></div>
      </div>
    ))}
  </div>
);

const ClientDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { count: martWishlistCount } = useMartWishlist();
  const { stats: referralStats } = useReferral();
  const bn = language === "bn";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [martOrders, setMartOrders] = useState<any[]>([]);
  const [dealAdsCount, setDealAdsCount] = useState(0);

  const fetchMartOrders = useCallback(async () => {
    if (!user) return;
    const mysqlAuth = getMySqlAuth();
    const localUser = user as unknown as { id?: string | number };
    const userId = Number(mysqlAuth?.user?.id ?? localUser.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      setMartOrders([]);
      return;
    }

    try {
      const res = await fetch(`${MART_API_BASE}/api/orders?user_id=${encodeURIComponent(String(userId))}`, {
        headers: { ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch mart orders");
      setMartOrders(normalizeMartOrders(Array.isArray(data.orders) ? data.orders : []));
    } catch (err) {
      console.error("fetchMartOrders error:", err);
      toast.error(bn ? "মার্ট অর্ডার লোড ব্যর্থ" : "Failed to load mart orders");
      setMartOrders([]);
    }
  }, [user, bn]);

  const [profile, setProfile] = useState({ 
    display_name: "", 
    phone: "", 
    address: "", 
    profile_image_url: "",
    shondhaan_id: "", 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [referralSettings, setReferralSettings] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralSharing, setReferralSharing] = useState(false);
  const [referralPopupOpen, setReferralPopupOpen] = useState(false);
  const [referralShareLink, setReferralShareLink] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [rebookTarget, setRebookTarget] = useState<Booking | null>(null);
  const [chatTarget, setChatTarget] = useState<Booking | null>(null);

  const fetchReferralCode = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${PROFILE_API_BASE}/api/referral/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load referral code");
      setReferralCode(data.code?.code || null);
    } catch (err) {
      console.error("fetchReferralCode error:", err);
      setReferralCode(null);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const localUser = user as unknown as {
      id?: string | number; name?: string; mobile?: string; phone?: string; address?: string | null; user_metadata?: Record<string, unknown>;
    };
    setBookings([]); setReviews([]); setNotifications([]); setDealAdsCount(0);
    
    const mysqlAuth = getMySqlAuth();

    const fallbackProfile = {
      display_name: localUser.name || String(localUser.user_metadata?.display_name || localUser.user_metadata?.name || ""),
      phone: localUser.mobile || localUser.phone || String(localUser.user_metadata?.phone || ""),
      address: localUser.address || String(localUser.user_metadata?.address || ""),
      profile_image_url: String(localUser.user_metadata?.avatar_url || ""),
      shondhaan_id: String(mysqlAuth?.user?.shondhaan_id || ""),
    };
    setProfile(fallbackProfile);

    const [reviewsRes, notificationsRes, dealAdsRes] = await Promise.all([
      supabase.from("service_reviews").select("id, service_slug, reviewer_name, rating, comment, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("app_notifications").select("id, title, message, is_read, type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("deal_listings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (!reviewsRes.error && reviewsRes.data) setReviews(reviewsRes.data as Review[]);
    if (!notificationsRes.error && notificationsRes.data) setNotifications(notificationsRes.data as Notification[]);
    if (!dealAdsRes.error) setDealAdsCount(dealAdsRes.count || 0);

    const userId = Number(mysqlAuth?.user?.id ?? localUser.id);

    if (Number.isInteger(userId) && userId > 0) {
      try {
        const bookingRes = await fetch(`${SERVICE_API_BASE}/api/bookings?user_id=${encodeURIComponent(String(userId))}`, {
          headers: { ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}) },
        });
        const bookingData = await bookingRes.json().catch(() => ({}));
        if (!bookingRes.ok) throw new Error(bookingData?.message || bookingData?.error || "Failed to load bookings");
        const safeBookings = extractApiArray<Booking>(bookingData);
        setBookings(safeBookings);
      } catch (err) {
        console.error("fetchUserBookings error:", err);
        setBookings([]);
        toast.error(bn ? "বুকিং লোড ব্যর্থ" : "Failed to load bookings");
      }
    } else {
      setBookings([]);
    }

    // ✅ FIXED: Correct endpoint and field mappings
    if (mysqlAuth?.token) {
      try {
        const res = await fetch(`${PROFILE_API_BASE}/api/users/me/profile`, {
          headers: { Authorization: `Bearer ${mysqlAuth.token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load profile");

        const settingsData = await fetchReferralSettings(mysqlAuth.token);
        setReferralSettings(settingsData);
        await fetchReferralCode(mysqlAuth.token);
        
        setProfile({
          display_name: data.name || fallbackProfile.display_name,
          phone: data.phone || data.mobile || fallbackProfile.phone,
          address: data.address || fallbackProfile.address,
          profile_image_url: data.avatar_url || data.profile_image || fallbackProfile.profile_image_url,
          shondhaan_id: data.shondhaan_id || fallbackProfile.shondhaan_id,
        });

        // ✅ Update mysqlAuth with latest shondhaan_id if missing
        if (data.shondhaan_id && !mysqlAuth.user?.shondhaan_id) {
          saveMySqlAuth({
            ...mysqlAuth,
            user: { ...mysqlAuth.user, shondhaan_id: data.shondhaan_id },
          });
        }
      } catch (err) {
        console.error("fetchProfile error:", err);
        console.error("fetchReferralSettings error:", err);
      }
    }
    setLoading(false);
  }, [user, fetchReferralCode]);

  useEffect(() => { fetchAll(); fetchMartOrders(); }, [fetchAll, fetchMartOrders]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('client-bookings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, (payload: { new: Booking }) => {
        const updated = payload.new as Booking;
        setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
        const labels: Record<string, string> = {
          confirmed: bn ? "আপনার বুকিং নিশ্চিত হয়েছে!" : "Booking confirmed!",
          in_progress: bn ? "আপনার সার্ভিস চলছে!" : "Service in progress!",
          completed: bn ? "আপনার সার্ভিস সম্পন্ন!" : "Service completed!",
          cancelled: bn ? "বুকিং বাতিল হয়েছে" : "Booking cancelled",
        };
        if (labels[updated.status]) toast.info(labels[updated.status]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, bn]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('client-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications', filter: `user_id=eq.${user.id}` }, (payload: { new: Notification }) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        toast.info(n.title);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ✅ FIXED: handleSaveProfile with correct endpoint and field mappings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!profile.display_name.trim()) { toast.error(bn ? "নাম দিন" : "Enter name"); return; }
    if (profile.phone.trim() && !/^01[3-9]\d{8}$/.test(profile.phone.trim())) {
      toast.error(bn ? "সঠিক ফোন নম্বর দিন" : "Enter valid phone"); return;
    }
    setSaving(true);
    try {
      const mysqlAuth = getMySqlAuth();
      if (!mysqlAuth?.token) throw new Error("MySQL login is required to save profile");

      const res = await fetch(`${PROFILE_API_BASE}/api/users/me/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${mysqlAuth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.display_name.trim(),
          phone: profile.phone.trim() || null,
          address: profile.address.trim() || null,
          profile_image_url: profile.profile_image_url || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Update failed");

      setProfile({
        display_name: data.name || profile.display_name.trim(),
        phone: data.phone || data.mobile || profile.phone.trim(),
        address: data.address || profile.address.trim(),
        profile_image_url: data.avatar_url || data.profile_image || profile.profile_image_url,
        shondhaan_id: data.shondhaan_id || profile.shondhaan_id,
      });
      
      saveMySqlAuth({
        ...mysqlAuth,
        user: { 
          ...mysqlAuth.user, 
          name: data.name || profile.display_name.trim(), 
          mobile: data.phone || data.mobile || mysqlAuth.user.mobile, 
          address: data.address || null,
          shondhaan_id: data.shondhaan_id || mysqlAuth.user.shondhaan_id,
        },
      });
      toast.success(bn ? "প্রোফাইল আপডেট হয়েছে" : "Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "আপডেট ব্যর্থ" : "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  // ✅ FIXED: handleProfileImageChange with correct endpoint
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error(bn ? "শুধুমাত্র ছবি ফাইল আপলোড করুন" : "Please upload an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(bn ? "ফাইল সাইজ ২MB এর বেশি হতে পারবে না" : "File size must be under 2MB"); return; }

    const mysqlAuth = getMySqlAuth();
    if (!mysqlAuth?.token) { toast.error(bn ? "ছবি সেভ করতে লগইন করুন" : "Login is required to save profile photo"); return; }

    setUploadingProfileImage(true);
    try {
      const image = await fileToDataUrl(file);
      const res = await fetch(`${PROFILE_API_BASE}/api/users/me/profile/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${mysqlAuth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");

      const nextUrl = data.avatar_url || data.profile_image_url || data.profile_image || "";
      setProfile(prev => ({ ...prev, profile_image_url: nextUrl }));
      toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "আপলোড ব্যর্থ" : "Upload failed"));
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const markAsRead = async (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success(bn ? "সব পঠিত হিসেবে চিহ্নিত" : "All marked as read");
  };

  const deleteReview = async (id: string) => {
    if (!confirm(bn ? "রিভিউ মুছে ফেলবেন?" : "Delete review?")) return;
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted");
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const reviewedSlugs = new Set(reviews.map(r => r.service_slug));
  const unreadCount = notifications.filter(n => !n.is_read).length;


  const handleReferralGenerate = async () => {
    setReferralSharing(true);
    try {
      const mysqlAuth = getMySqlAuth();
      if (!mysqlAuth?.token) throw new Error("Login required");

      const res = await fetch(`${PROFILE_API_BASE}/api/referral/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${mysqlAuth.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.reason || data.message || "Failed to generate referral code");
      }

      toast.success(bn ? "রেফারেল কোড তৈরি হয়েছে" : "Referral code generated");

      // reload so fetchAll() re-runs and fetchReferralCode picks up the new code
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "রেফারেল কোড তৈরি করা যায়নি" : "Could not generate referral code"));
    } finally {
      setReferralSharing(false);
    }
  };

  const handleReferralShare = async () => {
    setReferralSharing(true);
    try {
      if (!referralCode) throw new Error("No referral code available");
      const link = `${import.meta.env.VITE_FRONTEND_URL}/?ref=${referralCode}`;
      toast.success(bn ? `রেফারেল লিংক: ${link}` : `Referral link: ${link}`);

      setReferralShareLink(link);
      setReferralPopupOpen(true);
    } catch {
      toast.error(bn ? "রেফারেল লিংক তৈরি করা যায়নি" : "Could not prepare referral link");
    } finally {
      setReferralSharing(false);
    }
  };

  const shareReferralTo = async (platform: string) => {
    const link = referralShareLink || referralStats?.code?.link;
    if (!link) return;
    const text = bn ? "আমার রেফারেল লিংক দিয়ে সাইন আপ করুন" : "Sign up with my Shondhaan referral link";
    const targets: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      youtube: "https://www.youtube.com/",
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
      messenger: `https://m.me/?link=${encodeURIComponent(link)}`,
    };

    if (platform === "youtube") {
      await navigator.clipboard.writeText(link);
      toast.success(bn ? "লিংক কপি হয়েছে, YouTube খুলছে" : "Link copied, opening YouTube");
    }
    window.open(targets[platform], "_blank", "noopener,noreferrer");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[var(--app-header-h,72px)]">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-72px)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <User className="h-6 w-6 text-white" />
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PanelSidebarTabs
        items={[
          { value: "dashboard", label: bn ? "ড্যাশবোর্ড" : "Dashboard", icon: <Home className="h-5 w-5" />, group: bn ? "ড্যাশবোর্ড" : "Dashboard" },
          { value: "bookings", label: bn ? "বুকিং" : "Bookings", icon: <ClipboardList className="h-5 w-5" />, group: bn ? "সার্ভিস" : "Services" },
          { value: "messages", label: bn ? "ম্যাসেজ" : "Messages", icon: <MessageSquare className="h-5 w-5" />, group: bn ? "সার্ভিস" : "Services" },
          { value: "requests", label: bn ? "রিকোয়েস্ট" : "Requests", icon: <FileSearch className="h-5 w-5" /> },
          { value: "mart-orders", label: bn ? "মার্ট অর্ডার" : "Mart Orders", icon: <ShoppingBag className="h-5 w-5" />, group: bn ? "শপিং" : "Shopping" },
          { value: "deal-my-ads", label: bn ? "আমার বিজ্ঞাপন" : "My Ads", icon: <Megaphone className="h-5 w-5" />, group: bn ? "সন্ধান ডিল" : "Deal" },
          { value: "deal-favorites", label: bn ? "ফেভারিট" : "Favorites", icon: <Heart className="h-5 w-5" /> },
          { value: "deal-messages", label: bn ? "মেসেজ" : "Messages", icon: <MessageSquare className="h-5 w-5" /> },
          { value: "payments", label: bn ? "পেমেন্ট" : "Payments", icon: <Wallet className="h-5 w-5" />, group: bn ? "আর্থিক" : "Finance" },
          { value: "referral", label: bn ? "রেফারেল" : "Referral", icon: <Gift className="h-5 w-5" />, group: bn ? "আর্থিক" : "Finance" },
          { value: "reviews", label: bn ? "রিভিউ" : "Reviews", icon: <Star className="h-5 w-5" />, group: bn ? "অন্যান্য" : "Others" },
          { value: "notifications", label: bn ? "নোটিফিকেশন" : "Notifications", icon: <Bell className="h-5 w-5" /> },
          { value: "job", label: bn ? "আমার আবেদনসমূহ" : "My Applications", icon: <User className="h-5 w-5" />, group: bn ? "চাকরি" : "Job" },
          { value: "profile", label: bn ? "প্রোফাইল" : "Profile", icon: <User className="h-5 w-5" />, group: bn ? "অ্যাকাউন্ট" : "Account" },
        ]}
        defaultValue="dashboard"
        panelTitle={profile.display_name || (bn ? "ক্লায়েন্ট ড্যাশবোর্ড" : "Client Dashboard")}
        panelIcon={<Store className="h-5 w-5" />}
        profileImageUrl={profile.profile_image_url || undefined}
        offsetForDesktopMegaMenu
      >
        {(activeTab, setTab) => (
          <div className="bg-slate-50 min-h-screen">

            {/* === DASHBOARD TAB === */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">

                {/* Hero Profile Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative overflow-hidden rounded-3xl shadow-xl border border-blue-100 bg-white"
                >
                  <div className="h-32 bg-gradient-to-r from-userprimary to-userprimaryshade relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  </div>

                  <div className="px-6 pb-6 relative">
                    <div className="flex items-end justify-between -mt-14 mb-4">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                      >
                        <div className="h-24 w-24 rounded-3xl bg-white p-1.5 shadow-lg border border-slate-100 relative group">
                          {profile.profile_image_url ? (
                            <img src={profile.profile_image_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center">
                              <User className="h-10 w-10 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-3 right-3 h-5 w-5 bg-green-500 border-4 border-white rounded-full shadow-md"></div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex gap-2 mb-2"
                        >
                        <button
                          onClick={() => setTab("profile")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-all border border-slate-200 shadow-sm"
                        >
                          <Settings className="h-3.5 w-3.5" /> {bn ? "এডিট" : "Edit"}
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 transition-all border border-red-200 shadow-sm"
                        >
                          <LogOut className="h-3.5 w-3.5" /> {bn ? "লগআউট" : "Logout"}
                        </button>
                      </motion.div>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-4 items-center">
                        <h1 className="text-xl font-bold text-slate-900">
                          {profile.display_name || (bn ? "ব্যবহারকারী" : "User")}
                        </h1>
                        <div className="flex gap-2 text-[11px] border px-3 py-1 rounded-full border-userprimary bg-userprimaryshade">
                          <span className="font-bold my-auto">
                            {bn ? "সন্ধান আইডিঃ" : "Shondhaan ID:"}
                          </span>
                          <span className="text-slate-800 font-mono font-semibold my-auto">
                            {profile.shondhaan_id || "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-userprimary" />
                          {user?.email}
                        </span>
                        {profile.phone && (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-userprimary" />
                            {profile.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {referralSettings && referralSettings.is_enabled === true && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 shadow-sm md:p-6"
                    >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                          <Gift className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{bn ? "এই রেফারেল লিঙ্কটি শেয়ার করুন" : "Invite friends and earn rewards"}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {bn ? (
                              <>
                                এই লিঙ্কের মাধ্যমে যেকোনো সার্ভিস বুক করলে কিংবা কোনো পণ্য অর্ডার করলে
                                আপনি পাবেন{" "}
                                <span className="font-bold">
                                  {referralSettings.referrer_reward_amount}{" "}
                                  {referralSettings.referrer_reward_currency}
                                </span>{" "}
                                এবং যিনি লিঙ্কটি ব্যবহার করবেন তিনি পাবেন{" "}
                                <span className="font-bold">
                                  {referralSettings.referred_reward_amount}{" "}
                                  {referralSettings.referred_reward_currency}
                                </span>
                                ।
                              </>
                            ) : (
                              <>
                                When someone books a service or orders a product through your referral
                                link, you will receive{" "}
                                <span className="font-bold">
                                  {referralSettings.referrer_reward_amount}{" "}
                                  {referralSettings.referrer_reward_currency}
                                </span>
                                , and the person who uses your link will receive{" "}
                                <span className="font-bold">
                                  {referralSettings.referred_reward_amount}{" "}
                                  {referralSettings.referred_reward_currency}
                                </span>
                                .
                              </>
                            )}
                          </p>
                          {referralSettings.min_order_amount !== null && (
                            <p className="mt-1 text-xs text-slate-500">
                              {bn ? `ন্যূনতম অর্ডার: ৳${referralSettings.min_order_amount}` : `Minimum order: ৳${referralSettings.min_order_amount}`}
                            </p>
                          )}
                        </div>
                      </div>
                    <div className="relative shrink-0">
                     {referralCode ? (
                        <>
                          <p className="text-sm font-semibold text-slate-700">
                            <p>{bn ? "আপনার রেফারেল লিঙ্ক:" : "Your referral link:"}{" "}</p>
                            <span className="text-emerald-700">{`${import.meta.env.VITE_FRONTEND_URL}/?ref=${referralCode}`}</span>
                          </p>
                            <button
                              type="button"
                              onClick={handleReferralShare}
                              disabled={referralSharing}
                              className="inline-flex w-full mt-2 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                              >
                              {referralSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                              {bn ? "শেয়ার করুন" : "Share referral link"}
                            </button>
                        </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReferralGenerate}
                            disabled={referralSharing}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                            <Settings className="h-4 w-4" />
                            {bn ? "রেফারাল লিঙ্ক তৈরি করুন" : "Generate Referral Link"}
                          </button>
                      )}
                       {referralPopupOpen && (referralShareLink || referralStats?.code?.link) && (
                          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-bold text-slate-900">{bn ? "শেয়ার করুন" : "Share referral link"}</p>
                              <button type="button" onClick={() => setReferralPopupOpen(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close share options">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { key: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, className: "bg-[#1877F2]" },
                                { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, className: "bg-[#FF0000]" },
                                { key: "twitter", label: "Twitter", icon: <Twitter className="h-4 w-4" />, className: "bg-slate-900" },
                                { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, className: "bg-[#25D366]" },
                                { key: "messenger", label: "Messenger", icon: <MessageCircle className="h-4 w-4" />, className: "bg-[#0084FF]" },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  title={item.label}
                                  onClick={() => shareReferralTo(item.key)}
                                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110 ${item.className}`}
                                >
                                  {item.icon}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{referralShareLink || referralStats?.code?.link}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const link = referralShareLink || referralStats?.code?.link;
                                  if (!link) return;
                                  await navigator.clipboard.writeText(link);
                                  toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
                                }}
                                className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700"
                                title={bn ? "লিংক কপি করুন" : "Copy link"}
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                    </div>
                  </motion.div>
                )}



                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { value: bookings.length, label: bn ? "বুকিং" : "Bookings", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <ClipboardList className="h-5 w-5" />, tab: "bookings" },
                    { value: bookings.filter(b => b.status === "completed").length, label: bn ? "সম্পূর্ণ" : "Done", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <CheckCircle2 className="h-5 w-5" />, tab: "bookings" },
                    { value: martOrders.length, label: bn ? "মার্ট অর্ডার" : "Mart Orders", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <ShoppingBag className="h-5 w-5" />, tab: "mart-orders" },
                    { value: dealAdsCount, label: bn ? "বিজ্ঞাপন" : "Ads", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <Megaphone className="h-5 w-5" />, tab: "deal-my-ads" },
                    { value: martWishlistCount, label: bn ? "ফেভারিট" : "Favorites", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <Heart className="h-5 w-5" />, tab: "deal-favorites" },
                    { value: unreadCount, label: bn ? "এলার্ট" : "Alerts", color: "text-userprimary", bg: "bg-userprimaryshade", icon: <Bell className="h-5 w-5" />, tab: "notifications" },
                  ].map((stat, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setTab(stat.tab)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group text-left"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                        <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                          {stat.icon}
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Premium Graph Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-userprimaryshade text-userprimary">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          {bn ? "বুকিং অ্যাক্টিভিটি" : "Booking Activity"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 ml-10">{bn ? "গত ৬ মাসের পরিসংখ্যান" : "Last 6 months statistics"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
                        <p className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end mt-1">
                          <ArrowUpRight className="h-3 w-3" /> 12%
                        </p>
                      </div>
                    </div>
                    <AreaChart />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                      <div className="p-2 rounded-lg bg-userprimaryshade text-userprimary">
                        <PieChart className="h-5 w-5" />
                      </div>
                      {bn ? "ব্যবহার বিভাজন" : "Usage Split"}
                    </h3>

                    <div className="flex-1 flex flex-col justify-center space-y-4">
                      {[
                        { label: "Services", value: bookings.length, color: "bg-userprimaryshade", width: `${Math.min(bookings.length * 10, 100)}%` },
                        { label: "Mart Orders", value: martOrders.length, color: "bg-userprimary", width: `${Math.min(martOrders.length * 10, 100)}%` },
                        { label: "Deal Ads", value: dealAdsCount, color: "bg-userprimary", width: `${Math.min(dealAdsCount * 10, 100)}%` },
                      ].map((stat, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 font-medium">{stat.label}</span>
                            <span className="text-slate-900 font-bold">{stat.value}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${stat.color} rounded-full transition-all duration-500`} style={{ width: stat.width }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: bn ? "মার্ট" : "Mart", subtitle: bn ? "পণ্য কিনুন" : "Shop products", icon: ShoppingBag, bg: "bg-userprimaryshade", color: "text-userprimary", action: () => navigate("/mart/home") },
                    { title: bn ? "ডিল" : "Deal", subtitle: bn ? "কিনুন ও বিক্রি করুন" : "Buy & sell", icon: Megaphone, bg: "bg-userprimaryshade", color: "text-userprimary", action: () => navigate("/deal") },
                    { title: bn ? "বিজ্ঞাপন দিন" : "Post Ad", subtitle: bn ? "ফ্রি বিজ্ঞাপন" : "Free listing", icon: Megaphone, bg: "bg-userprimaryshade", color: "text-userprimary", action: () => navigate("/deal/post") },
                    { title: bn ? "সার্ভিস নিন" : "Get Service", subtitle: bn ? "১৮৬+ সার্ভিস" : "186+ services", icon: ClipboardList, bg: "bg-userprimaryshade", color: "text-userprimary", action: () => navigate("/") },
                  ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        onClick={action.action}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-left group"
                      >
                        <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">{action.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.subtitle}</p>
                      </motion.button>
                    );
                  })}
                </div>

              </div>
            )}

            {/* === BOOKINGS TAB === */}
            {activeTab === "bookings" && (
              bookings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <Package className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-900">{bn ? "কোনো বুকিং নেই" : "No bookings yet"}</p>
                  <p className="text-sm text-slate-500 mt-1 mb-4">{bn ? "আপনার প্রথম সার্ভিস বুক করুন" : "Book your first service today"}</p>
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 rounded-xl bg-userprimary px-5 py-2.5 text-sm font-semibold text-white hover:userprimary transition-colors"
                  >
                    <ClipboardList className="h-4 w-4" /> {bn ? "সার্ভিস দেখুন" : "Browse Services"}
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        {bn ? "মাসিক খরচ" : "Monthly Spend"}
                      </h3>
                    </div>
                    <BarChart data={[40, 65, 30, 80, 50, 90, 70]} />
                  </motion.div>

                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 pt-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    {bn ? "সার্ভিস বুকিং হিস্টোরি" : "Service Booking History"}
                    <span className="text-xs text-slate-400 font-normal ml-auto">({bookings.length})</span>
                  </h2>
                  {bookings.map((b, i) => (
                    <BookingCard key={b.id} booking={b} index={i} onNavigate={navigate} onReview={(b) => setReviewTarget(b)} onRebook={(b) => setRebookTarget(b)} onChat={(b) => setChatTarget(b)} hasReview={reviewedSlugs.has(b.service_slug)} />
                  ))}
                  <AIWeeklySummaryCard />
                </div>
              )
            )}

            {/* === OTHER TABS === */}
            {activeTab === "messages" && <ServiceMessage />}
            {activeTab === "requests" && <ServiceRequestsTab userPhone={profile.phone} />}
            {activeTab === "mart-orders" && (<MartOrdersTab orders={martOrders as any} onRefresh={fetchMartOrders} apiBase={`${MART_API_BASE}/api`} />)}
            {activeTab === "deal-my-ads" && <DealSection activeTab="my-ads" />}
            {activeTab === "deal-favorites" && <DealSection activeTab="favorites" />}
            {activeTab === "deal-messages" && <DealSection activeTab="messages" />}
            {activeTab === "payments" && <PaymentHistoryTab bookings={bookings} martOrders={martOrders} />}

            {activeTab === "referral" && (
              <ReferralTab onNavigateToPayments={() => setTab("payments")} />
            )}

            {activeTab === "job" && <JobApplicationsTab bn={bn} />}

            {/* === REVIEWS TAB === */}
            {activeTab === "reviews" && (
              reviews.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <Star className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-900">{bn ? "কোনো রিভিউ দেননি" : "No reviews yet"}</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-semibold">{r.service_slug}</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        <button onClick={() => deleteReview(r.id)} className="text-xs text-red-500 hover:underline">{bn ? "মুছুন" : "Delete"}</button>
                      </div>
                      {r.comment && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5">{r.comment}</p>}
                      <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString("bn-BD")}</p>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {/* === NOTIFICATIONS TAB === */}
            {activeTab === "notifications" && (
              notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <Bell className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-900">{bn ? "কোনো নোটিফিকেশন নেই" : "No notifications"}</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline mb-1 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> {bn ? "সব পঠিত করুন" : "Mark all as read"}
                    </button>
                  )}
                  {notifications.map(n => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`rounded-xl border p-4 cursor-pointer transition-all ${n.is_read ? "bg-white border-slate-200 opacity-60" : "bg-blue-50/50 border-blue-200"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {n.is_read ? <CheckCircle2 className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" /> : <Bell className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />}
                          <div>
                            <p className="text-base font-medium text-slate-900">{n.title}</p>
                            <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{new Date(n.created_at).toLocaleDateString("bn-BD")}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {/* === PROFILE TAB === */}
            {activeTab === "profile" && (
              <div className="max-w-2xl mx-auto">
                <ProfileContent
                  onProfileUpdated={(updated) => {
                    setProfile({
                      display_name: updated.display_name,
                      phone: updated.phone,
                      address: updated.address,
                      profile_image_url: updated.profile_image_url || "",
                      shondhaan_id: updated.shondhaan_id || profile.shondhaan_id,
                    });
                  }}
                />
              </div>
            )}
          </div>
        )}
      </PanelSidebarTabs>

      <ReviewModal open={!!reviewTarget} onClose={() => setReviewTarget(null)} serviceSlug={reviewTarget?.service_slug || ""} serviceTitle={reviewTarget?.service_title || ""} onSubmitted={fetchAll} />
      <RebookModal open={!!rebookTarget} onClose={() => setRebookTarget(null)} booking={rebookTarget} onRebooked={fetchAll} />
      <BookingChatModal open={!!chatTarget} onClose={() => setChatTarget(null)} bookingId={chatTarget?.id || ""} serviceTitle={chatTarget?.service_title || ""} />
    </>
  );
};

export default ClientDashboard;