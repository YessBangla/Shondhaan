import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, User, Phone, MapPin, Save, Loader2,
  Package, Star, Bell, ClipboardList, CheckCircle2,
  FileSearch, Wallet, LogOut, Settings, Store,
  Home, Camera
} from "lucide-react";
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
import { ShoppingBag, Megaphone, Heart, MessageSquare } from "lucide-react";
import DealSection from "@/components/client/DealSection";
import MartOrdersTab from "@/components/client/MartOrdersTab";
import AIWeeklySummaryCard from "@/components/client/AIWeeklySummaryCard";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { getMySqlAuth, saveMySqlAuth } from "@/lib/mysqlAuth";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

const MART_API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const PROFILE_API_BASE = MART_API_BASE;
const SERVICE_API_BASE = (INDIVIDUAL_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

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

type MartOrderRecord = Record<string, unknown> & {
  id?: string | number;
  items?: unknown[];
  order_items?: unknown[];
  mart_order_items?: unknown[];
};


const extractApiArray = <T,>(payload: any): T[] => {
  const data =
    payload?.data ??
    payload?.bookings ??
    payload?.items ??
    payload?.rows ??
    payload?.result ??
    payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeMartOrders = (orders: unknown[]): MartOrderRecord[] =>
  orders.map((order) => {
    const source = order as MartOrderRecord;
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

const ClientDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { count: martWishlistCount } = useMartWishlist();
  const bn = language === "bn";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [martOrders, setMartOrders] = useState<unknown[]>([]);
  const [dealAdsCount, setDealAdsCount] = useState(0);

  const fetchMartOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${MART_API_BASE}/api/orders?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch mart orders");
      }
      setMartOrders(normalizeMartOrders(Array.isArray(data.orders) ? data.orders : []));
    } catch (err) {
      console.error("fetchMartOrders error:", err);
      toast.error(bn ? "à¦®à¦¾à¦°à§à¦Ÿ à¦…à¦°à§à¦¡à¦¾à¦° à¦²à§‹à¦¡ à¦¬à§à¦¯à¦°à§à¦¥" : "Failed to load mart orders");
      setMartOrders([]);
    }
  }, [user, bn]);


  const [profile, setProfile] = useState({ display_name: "", phone: "", address: "", profile_image_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [rebookTarget, setRebookTarget] = useState<Booking | null>(null);
  const [chatTarget, setChatTarget] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const localUser = user as unknown as {
      id?: string | number;
      name?: string;
      mobile?: string;
      phone?: string;
      address?: string | null;
      user_metadata?: Record<string, unknown>;
    };
    setBookings([]);
    setReviews([]);
    setNotifications([]);
    setDealAdsCount(0);
    const fallbackProfile = {
      display_name: localUser.name || String(localUser.user_metadata?.display_name || localUser.user_metadata?.name || ""),
      phone: localUser.mobile || localUser.phone || String(localUser.user_metadata?.phone || ""),
      address: localUser.address || String(localUser.user_metadata?.address || ""),
      profile_image_url: String(localUser.user_metadata?.avatar_url || ""),
    };
    setProfile(fallbackProfile);

    const [
      reviewsRes,
      notificationsRes,
      dealAdsRes,
    ] = await Promise.all([
      supabase
        .from("service_reviews")
        .select("id, service_slug, reviewer_name, rating, comment, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("app_notifications")
        .select("id, title, message, is_read, type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("deal_listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (!reviewsRes.error && reviewsRes.data) setReviews(reviewsRes.data as Review[]);
    if (!notificationsRes.error && notificationsRes.data) setNotifications(notificationsRes.data as Notification[]);
    if (!dealAdsRes.error) setDealAdsCount(dealAdsRes.count || 0);

    const mysqlAuth = getMySqlAuth();
    const userId = Number(mysqlAuth?.user?.id ?? localUser.id);

    // MySQL service bookings by logged-in user's numeric ID
    if (Number.isInteger(userId) && userId > 0) {
      try {
        const bookingRes = await fetch(
          `${SERVICE_API_BASE}/api/bookings?user_id=${encodeURIComponent(String(userId))}`,
          {
            headers: {
              ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}),
            },
          }
        );

        const bookingData = await bookingRes.json().catch(() => ({}));

        if (!bookingRes.ok) {
          throw new Error(
            bookingData?.message ||
              bookingData?.error ||
              "Failed to load bookings"
          );
        }

        const safeBookings = extractApiArray<Booking>(bookingData);
        setBookings(safeBookings);
        console.log("✅ Client bookings by user id:", userId, safeBookings);
      } catch (err) {
        console.error("fetchUserBookings error:", err);
        setBookings([]);
        toast.error(bn ? "বুকিং লোড ব্যর্থ" : "Failed to load bookings");
      }
    } else {
      console.warn("No valid MySQL user id found for bookings", {
        mysqlUser: mysqlAuth?.user,
        localUser,
      });
      setBookings([]);
    }

    if (mysqlAuth?.token && Number.isInteger(userId) && userId > 0) {
      try {
        const res = await fetch(`${PROFILE_API_BASE}/api/profile/${userId}`, {
          headers: { Authorization: `Bearer ${mysqlAuth.token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load profile");
        setProfile({
          display_name: data.profile?.display_name || fallbackProfile.display_name,
          phone: data.profile?.phone || fallbackProfile.phone,
          address: data.profile?.address || fallbackProfile.address,
          profile_image_url: data.profile?.profile_image_url || fallbackProfile.profile_image_url,
        });
      } catch (err) {
        console.error("fetchProfile error:", err);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); fetchMartOrders(); }, [fetchAll, fetchMartOrders]);

  // Realtime booking updates
  useEffect(() => {
    if (!user) return;
    const channel = { channel: (..._args: unknown[]) => ({ on: (..._args: unknown[]) => ({ subscribe: () => null }) }) }
      .channel('client-bookings')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `user_id=eq.${user.id}`,
      }, (payload: { new: Booking }) => {
        const updated = payload.new as Booking;
        setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
        const labels: Record<string, string> = {
          confirmed: bn ? "à¦†à¦ªà¦¨à¦¾à¦° à¦¬à§à¦•à¦¿à¦‚ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡!" : "Booking confirmed!",
          in_progress: bn ? "à¦†à¦ªà¦¨à¦¾à¦° à¦¸à§‡à¦¬à¦¾ à¦šà¦²à¦›à§‡!" : "Service in progress!",
          completed: bn ? "à¦†à¦ªà¦¨à¦¾à¦° à¦¸à§‡à¦¬à¦¾ à¦¸à¦®à§à¦ªà¦¨à§à¦¨!" : "Service completed!",
          cancelled: bn ? "à¦¬à§à¦•à¦¿à¦‚ à¦¬à¦¾à¦¤à¦¿à¦² à¦¹à¦¯à¦¼à§‡à¦›à§‡" : "Booking cancelled",
        };
        if (labels[updated.status]) toast.info(labels[updated.status]);
      })
      .subscribe();
    return () => { void channel; };
  }, [user, bn]);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;
    const channel = { channel: (..._args: unknown[]) => ({ on: (..._args: unknown[]) => ({ subscribe: () => null }) }) }
      .channel('client-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: { new: Notification }) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        toast.info(n.title);
      })
      .subscribe();
    return () => { void channel; };
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!profile.display_name.trim()) { toast.error(bn ? "à¦¨à¦¾à¦® à¦¦à¦¿à¦¨" : "Enter name"); return; }
    if (profile.phone.trim() && !/^01[3-9]\d{8}$/.test(profile.phone.trim())) {
      toast.error(bn ? "à¦¸à¦ à¦¿à¦• à¦«à§‹à¦¨ à¦¨à¦®à§à¦¬à¦° à¦¦à¦¿à¦¨" : "Enter valid phone"); return;
    }
    setSaving(true);
    try {
      const mysqlAuth = getMySqlAuth();
      const userId = Number((user as unknown as { id?: string | number }).id);
      if (!mysqlAuth?.token || !Number.isInteger(userId) || userId <= 0) {
        throw new Error("MySQL login is required to save profile");
      }

      const res = await fetch(`${PROFILE_API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${mysqlAuth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          phone: profile.phone.trim() || null,
          address: profile.address.trim() || null,
          profile_image_url: profile.profile_image_url || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Update failed");

      setProfile({
        display_name: data.profile?.display_name || profile.display_name.trim(),
        phone: data.profile?.phone || profile.phone.trim(),
        address: data.profile?.address || profile.address.trim(),
        profile_image_url: data.profile?.profile_image_url || profile.profile_image_url,
      });
      saveMySqlAuth({
        ...mysqlAuth,
        user: {
          ...mysqlAuth.user,
          name: data.profile?.display_name || profile.display_name.trim(),
          mobile: data.profile?.phone || mysqlAuth.user.mobile,
          address: data.profile?.address || null,
        },
      });
      toast.success(bn ? "à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¹à¦¯à¦¼à§‡à¦›à§‡" : "Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¬à§à¦¯à¦°à§à¦¥" : "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(bn ? "à¦¶à§à¦§à§à¦®à¦¾à¦¤à§à¦° à¦›à¦¬à¦¿ à¦«à¦¾à¦‡à¦² à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§à¦¨" : "Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(bn ? "à¦«à¦¾à¦‡à¦² à¦¸à¦¾à¦‡à¦œ à§¨MB à¦à¦° à¦¬à§‡à¦¶à¦¿ à¦¹à¦¤à§‡ à¦ªà¦¾à¦°à¦¬à§‡ à¦¨à¦¾" : "File size must be under 2MB");
      return;
    }

    const mysqlAuth = getMySqlAuth();
    const userId = Number((user as unknown as { id?: string | number }).id);
    if (!mysqlAuth?.token || !Number.isInteger(userId) || userId <= 0) {
      toast.error(bn ? "à¦›à¦¬à¦¿ à¦¸à§‡à¦­ à¦•à¦°à¦¤à§‡ à¦²à¦—à¦‡à¦¨ à¦•à¦°à§à¦¨" : "Login is required to save profile photo");
      return;
    }

    setUploadingProfileImage(true);
    try {
      const image = await fileToDataUrl(file);
      const res = await fetch(`${PROFILE_API_BASE}/api/profile/${userId}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mysqlAuth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");

      const nextUrl = data.profile_image_url || "";
      setProfile(prev => ({ ...prev, profile_image_url: nextUrl }));
      toast.success(bn ? "à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦›à¦¬à¦¿ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¹à¦¯à¦¼à§‡à¦›à§‡" : "Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "à¦†à¦ªà¦²à§‹à¦¡ à¦¬à§à¦¯à¦°à§à¦¥" : "Upload failed"));
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success(bn ? "à¦¸à¦¬ à¦ªà¦ à¦¿à¦¤ à¦¹à¦¿à¦¸à§‡à¦¬à§‡ à¦šà¦¿à¦¹à§à¦¨à¦¿à¦¤" : "All marked as read");
  };

  const deleteReview = async (id: string) => {
    if (!confirm(bn ? "à¦°à¦¿à¦­à¦¿à¦‰ à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¬à§‡à¦¨?" : "Delete review?")) return;
    const error = null;
    if (!error) { setReviews(prev => prev.filter(r => r.id !== id)); toast.success(bn ? "à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡" : "Deleted"); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const reviewedSlugs = new Set(reviews.map(r => r.service_slug));
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalSpent = bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.package_price, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center  justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <>
        <PanelSidebarTabs
         items={[
  {
    value: "dashboard",
    label: bn ? "ড্যাশবোর্ড" : "Dashboard",
    icon: <Home className="h-5 w-5" />,
    group: bn ? "ড্যাশবোর্ড" : "Dashboard",
  },
  {
    value: "bookings",
    label: bn ? "বুকিং" : "Bookings",
    icon: <ClipboardList className="h-5 w-5" />,
    group: bn ? "সেবা" : "Services",
  },
  {
    value: "requests",
    label: bn ? "রিকোয়েস্ট" : "Requests",
    icon: <FileSearch className="h-5 w-5" />,
  },
  {
    value: "mart-orders",
    label: bn ? "মার্ট অর্ডার" : "Mart Orders",
    icon: <ShoppingBag className="h-5 w-5" />,
    group: bn ? "শপিং" : "Shopping",
  },
  {
    value: "deal-my-ads",
    label: bn ? "আমার বিজ্ঞাপন" : "My Ads",
    icon: <Megaphone className="h-5 w-5" />,
    group: bn ? "ইয়েস ডিল" : "Yess Deal",
  },
  {
    value: "deal-favorites",
    label: bn ? "ফেভারিট" : "Favorites",
    icon: <Heart className="h-5 w-5" />,
  },
  {
    value: "deal-messages",
    label: bn ? "মেসেজ" : "Messages",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    value: "payments",
    label: bn ? "পেমেন্ট" : "Payments",
    icon: <Wallet className="h-5 w-5" />,
    group: bn ? "আর্থিক" : "Finance",
  },
  {
    value: "reviews",
    label: bn ? "রিভিউ" : "Reviews",
    icon: <Star className="h-5 w-5" />,
    group: bn ? "অন্যান্য" : "Others",
  },
  {
    value: "notifications",
    label: bn ? "নোটিফিকেশন" : "Notifications",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    value: "profile",
    label: bn ? "প্রোফাইল" : "Profile",
    icon: <User className="h-5 w-5" />,
    group: bn ? "অ্যাকাউন্ট" : "Account",
  },
]}
          defaultValue="dashboard"
          panelTitle={profile.display_name || (bn ? "à¦•à§à¦²à¦¾à¦¯à¦¼à§‡à¦¨à§à¦Ÿ à¦¡à§à¦¯à¦¾à¦¶à¦¬à§‹à¦°à§à¦¡" : "Client Dashboard")}
          panelIcon={<Store className="h-5 w-5" />}
          profileImageUrl={profile.profile_image_url || undefined}
          offsetForDesktopMegaMenu
        >
          {(activeTab, setTab) => (
            <div className="space-y-5">
               {/* Dashboard */}
              {activeTab === "dashboard" && (
                 <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                      {profile.profile_image_url ? (
                        <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-7 w-7" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="font-heading  text-xl font-bold text-foreground truncate">
                        {profile.display_name || (bn ? "à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à¦•à¦¾à¦°à§€" : "User")}
                      </h1>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      {profile.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3.5 w-3.5" /> {profile.phone}
                        </p>
                      )}
                    </div>
                    <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                      <LogOut className="h-4 w-4" /> {bn ? "à¦²à¦—à¦†à¦‰à¦Ÿ" : "Logout"}
                    </button>
                  </div>
                  
              )}
              {/* Bookings */}
              {activeTab === "bookings" && (
                bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base text-muted-foreground">{bn ? "à¦•à§‹à¦¨à§‹ à¦¬à§à¦•à¦¿à¦‚ à¦¨à§‡à¦‡" : "No bookings yet"}</p>
                    <button onClick={() => navigate("/")} className="mt-3 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                      {bn ? "সেবা দেখুন" : "Browse Services"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground  flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      {bn ? "à¦¸à§‡à¦¬à¦¾ à¦¬à§à¦•à¦¿à¦‚ à¦¹à¦¿à¦¸à§à¦Ÿà§à¦°à¦¿" : "Service Booking History"}
                      <span className="text-xs text-muted-foreground font-normal">({bookings.length})</span>
                    </h2>
                    {bookings.map((b, i) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        index={i}
                        onNavigate={navigate}
                        onReview={(b) => setReviewTarget(b)}
                        onRebook={(b) => setRebookTarget(b)}
                        onChat={(b) => setChatTarget(b)}
                        hasReview={reviewedSlugs.has(b.service_slug)}
                      />
                    ))}
                  </div>
                )
              )}

              {/* Profile Banner */}
              {activeTab === "bookings" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                 
                </motion.div>
              )}

              {/* Quick Stats */}
              {activeTab === "dashboard" && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { value: bookings.length, label: bn ? "à¦¬à§à¦•à¦¿à¦‚" : "Bookings", color: "text-primary", tab: "bookings" },
                    { value: bookings.filter(b => b.status === "completed").length, label: bn ? "à¦¸à¦®à§à¦ªà¦¨à§à¦¨" : "Done", color: "text-green-600", tab: "bookings" },
                    { value: martOrders.length, label: bn ? "à¦®à¦¾à¦°à§à¦Ÿ à¦…à¦°à§à¦¡à¦¾à¦°" : "Mart Orders", color: "text-indigo-600", tab: "mart-orders" },
                    { value: dealAdsCount, label: bn ? "à¦¬à¦¿à¦œà§à¦žà¦¾à¦ªà¦¨" : "Ads", color: "text-orange-600", tab: "deal-my-ads" },
                    { value: martWishlistCount, label: bn ? "à¦«à§‡à¦­à¦¾à¦°à¦¿à¦Ÿ" : "Favorites", color: "text-pink-600", tab: "deal-favorites" },
                    { value: unreadCount, label: bn ? "à¦¨à§‹à¦Ÿà¦¿à¦«à¦¿à¦•à§‡à¦¶à¦¨" : "Alerts", color: "text-primary", tab: "notifications" },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setTab(stat.tab)}
                      className="rounded-2xl border border-slate-100 bg-white p-3 text-center cursor-pointer shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
                    >
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* AI Weekly Summary */}
              {activeTab === "bookings" && (
                <div>
                  <AIWeeklySummaryCard />
                </div>
              )}

              {/* Quick Actions */}
              {activeTab === "dashboard" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    onClick={() => navigate("/mart/home")}
                    className="rounded-xl border border-border bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-4 text-left hover:border-indigo-400/40 hover:shadow-sm transition-all group"
                  >
                    <ShoppingBag className="h-6 w-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-foreground">{bn ? "à¦‡à¦¯à¦¼à§‡à¦¸ à¦®à¦¾à¦°à§à¦Ÿ" : "Yess Mart"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? "à¦ªà¦£à§à¦¯ à¦•à¦¿à¦¨à§à¦¨" : "Shop products"}</p>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    onClick={() => navigate("/deal")}
                    className="rounded-xl border border-border bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-4 text-left hover:border-orange-400/40 hover:shadow-sm transition-all group"
                  >
                    <Megaphone className="h-6 w-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-foreground">{bn ? "à¦‡à¦¯à¦¼à§‡à¦¸ à¦¡à¦¿à¦²" : "Yess Deal"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? "à¦•à¦¿à¦¨à§à¦¨ à¦“ à¦¬à¦¿à¦•à§à¦°à¦¿ à¦•à¦°à§à¦¨" : "Buy & sell"}</p>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    onClick={() => navigate("/deal/post")}
                    className="rounded-xl border border-border bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4 text-left hover:border-green-400/40 hover:shadow-sm transition-all group"
                  >
                    <Megaphone className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-foreground">{bn ? "à¦¬à¦¿à¦œà§à¦žà¦¾à¦ªà¦¨ à¦¦à¦¿à¦¨" : "Post Ad"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? "à¦«à§à¦°à¦¿ à¦¬à¦¿à¦œà§à¦žà¦¾à¦ªà¦¨" : "Free listing"}</p>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    onClick={() => navigate("/")}
                    className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <ClipboardList className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-foreground">{bn ? "à¦¸à§‡à¦¬à¦¾ à¦¨à¦¿à¦¨" : "Get Service"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? "à§§à§®à§¬+ à¦¸à§‡à¦¬à¦¾" : "186+ services"}</p>
                  </motion.button>
                </div>
              )}
              {/* Service Requests */}
              {activeTab === "requests" && <ServiceRequestsTab userPhone={profile.phone} />}

              {/* Mart Orders - Enhanced Daraz-style */}
              {activeTab === "mart-orders" && (
                <MartOrdersTab orders={martOrders as unknown[] as never[]} onRefresh={fetchMartOrders} apiBase={`${MART_API_BASE}/api`} />
              )}


              {/* Yess Deal Sections */}
              {activeTab === "deal-my-ads" && <DealSection activeTab="my-ads" />}
              {activeTab === "deal-favorites" && <DealSection activeTab="favorites" />}
              {activeTab === "deal-messages" && <DealSection activeTab="messages" />}

              {/* Payments */}
              {activeTab === "payments" && <PaymentHistoryTab bookings={bookings} martOrders={martOrders} />}

              {/* Reviews */}
              {activeTab === "reviews" && (
                reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base text-muted-foreground">{bn ? "à¦•à§‹à¦¨à§‹ à¦°à¦¿à¦­à¦¿à¦‰ à¦¦à§‡à¦¨à¦¨à¦¿" : "No reviews yet"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(r => (
                      <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-primary font-semibold">{r.service_slug}</p>
                            <div className="flex items-center gap-0.5 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </div>
                          <button onClick={() => deleteReview(r.id)} className="text-xs text-destructive hover:underline">{bn ? "à¦®à§à¦›à§à¦¨" : "Delete"}</button>
                        </div>
                        {r.comment && <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-2.5">{r.comment}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("bn-BD")}</p>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* Notifications */}
              {activeTab === "notifications" && (
                notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base text-muted-foreground">{bn ? "à¦•à§‹à¦¨à§‹ à¦¨à§‹à¦Ÿà¦¿à¦«à¦¿à¦•à§‡à¦¶à¦¨ à¦¨à§‡à¦‡" : "No notifications"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-sm text-primary hover:underline mb-1">
                        {bn ? "à¦¸à¦¬ à¦ªà¦ à¦¿à¦¤ à¦•à¦°à§à¦¨" : "Mark all as read"}
                      </button>
                    )}
                    {notifications.map(n => (
                      <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)}
                        className={`rounded-xl border bg-card p-4 cursor-pointer transition-all ${n.is_read ? "border-border opacity-60" : "border-primary/30 bg-primary/5"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {n.is_read ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" /> : <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />}
                            <div>
                              <p className="text-base font-medium text-foreground">{n.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{new Date(n.created_at).toLocaleDateString("bn-BD")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Profile */}
              {activeTab === "profile" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 max-w-lg">
                  <div className="mb-5 flex items-center gap-3">
                    <label className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 text-primary transition hover:border-primary/50">
                      {profile.profile_image_url ? (
                        <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-black/55 text-white">
                        {uploadingProfileImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingProfileImage}
                        onChange={handleProfileImageChange}
                      />
                    </label>
                    <div>
                      <p className="text-base font-semibold text-foreground">{profile.display_name || (bn ? "à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à¦•à¦¾à¦°à§€" : "User")}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{bn ? "à¦¨à¦¾à¦®" : "Name"}</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                          placeholder={bn ? "à¦†à¦ªà¦¨à¦¾à¦° à¦¨à¦¾à¦®" : "Your name"} maxLength={100}
                          className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{bn ? "à¦«à§‹à¦¨" : "Phone"}</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="01XXXXXXXXX" maxLength={11}
                          className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{bn ? "à¦ à¦¿à¦•à¦¾à¦¨à¦¾" : "Address"}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <textarea value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })}
                          placeholder={bn ? "à¦†à¦ªà¦¨à¦¾à¦° à¦ à¦¿à¦•à¦¾à¦¨à¦¾" : "Your address"} maxLength={300} rows={2}
                          className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base outline-none focus:ring-1 focus:ring-ring resize-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={saving}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50">
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {bn ? "à¦¸à§‡à¦­ à¦¹à¦šà§à¦›à§‡..." : "Saving..."}</> : <><Save className="h-4 w-4" /> {bn ? "à¦¸à§‡à¦­ à¦•à¦°à§à¦¨" : "Save"}</>}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          )}
        </PanelSidebarTabs>

      {/* Modals */}
      <ReviewModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        serviceSlug={reviewTarget?.service_slug || ""}
        serviceTitle={reviewTarget?.service_title || ""}
        onSubmitted={fetchAll}
      />
      <RebookModal
        open={!!rebookTarget}
        onClose={() => setRebookTarget(null)}
        booking={rebookTarget}
        onRebooked={fetchAll}
      />
      <BookingChatModal
        open={!!chatTarget}
        onClose={() => setChatTarget(null)}
        bookingId={chatTarget?.id || ""}
        serviceTitle={chatTarget?.service_title || ""}
      />
    </>
  );
};

export default ClientDashboard;
