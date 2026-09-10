import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, User, Phone, MapPin, Calendar, Clock, Save, Loader2,
  Star, Briefcase, TrendingUp, CheckCircle, Package, RefreshCw, Zap, Wallet, MessageSquare, MessageCircle,
  Camera, IdCard, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import BookingChatModal from "@/components/client/BookingChatModal";
import CategoryFilterDropdown, {
  useServiceCategoryMap,
} from "@/components/CategoryFilterDropdown";
import { useCmsCategories } from "@/hooks/useCmsData";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import {
  listBookings,
  listProviderAssignedBookings,
  updateBookingStatus as updateBackendBookingStatus,
  type BookingRecord,
} from "@/lib/bookingApi";
import { listReviews } from "@/lib/reviewApi";

type Booking = BookingRecord;

interface ProviderProfile {
  id?: string | number;
  user_id?: string | number;
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ProviderApplication extends ProviderProfile {
  service_category?: string;
  experience_years?: number;
  nid_front_url?: string;
  nid_back_url?: string;
  status?: "pending" | "approved" | "rejected" | string;
  status_reason?: string | null;
}

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");

interface Review {
  id: string;
  service_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
const statusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "নিশ্চিত", className: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "সম্পন্ন", className: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const getAuthHeaders = () => {
  const token = getMySqlAuth()?.token;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeBooking = (item: any): Booking => ({
  id: String(item.id),
  user_id: item.user_id ?? "",
  service_title: item.service_title || item.title || "",
  service_slug: item.service_slug || item.slug || "",
  package_name: item.package_name || "",
  package_price: Number(item.package_price || item.price || 0),
  customer_name: item.customer_name || "",
  customer_phone: item.customer_phone || "",
  customer_address: item.customer_address || "",
  booking_date: item.booking_date || "",
  booking_time: item.booking_time || "",
  status: item.status || "pending",
  created_at: item.created_at || new Date().toISOString(),
  is_emergency: Boolean(item.is_emergency),
  provider_id: item.provider_id ?? null,
  assigned_to: item.assigned_to ?? null,
});

const extractArray = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const extractObject = (payload: any) => {
  return payload?.data || payload?.provider || payload?.profile || payload?.result || payload || null;
};

const fetchProviderProfileByUserId = async (
  userId: string | number
): Promise<ProviderProfile | null> => {
  const res = await fetch(`${API_BASE_URL}/api/providers/user/${userId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(payload?.message || "Provider profile load failed");
  }
  return extractObject(payload);
};
const fetchProviderProfileFallback = async (
  mysqlUser: any
): Promise<ProviderProfile | null> => {
  if (!mysqlUser?.email && !mysqlUser?.mobile) return null;
  const res = await fetch(`${API_BASE_URL}/api/providers?status=approved`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.message || "Provider profile load failed");
  }
  const providers = extractArray(payload) as ProviderProfile[];
  const email = String(mysqlUser.email || "").trim().toLowerCase();
  const mobile = String(mysqlUser.mobile || "").trim();

  return (
    providers.find((provider) => {
      const providerEmail = String(provider.email || "").trim().toLowerCase();
      const providerPhone = String(provider.phone || "").trim();
      return (
        (email && providerEmail === email) ||
        (mobile && providerPhone === mobile)
      );
    }) || null
  );
};

const mergeBookings = (groups: Booking[][]) => {
  const byId = new Map<string, Booking>();

  groups.flat().forEach((booking) => {
    byId.set(String(booking.id), booking);
  });

  return Array.from(byId.values());
};

const fetchAssignedBookings = async (ids: Array<string | number>) => {
  const usableIds = Array.from(
    new Set(ids.filter((id) => id !== undefined && id !== null && id !== ""))
  );

  if (!usableIds.length) return [];

  const results = await Promise.allSettled(
    usableIds.flatMap((id) => [
      listBookings({ provider_id: id }),
      listBookings({ assigned_to: id }),
    ])
  );

  const groups = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  return mergeBookings(groups).map(normalizeBooking);
};

const ProviderPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [profile, setProfile] = useState({ display_name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const { data: serviceCategoryMap } = useServiceCategoryMap();
  const {
    data: serviceCategories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useCmsCategories();
  const [providerApplication, setProviderApplication] = useState<ProviderApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [verificationForm, setVerificationForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    service_category: "",
    experience_years: "0",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(() => {
    const mysqlAuth = getMySqlAuth();
    const role = mysqlAuth?.user?.type || mysqlAuth?.user?.role;

    if (role === "admin" || role === "super_admin") {
      setIsProvider(true);
    } else {
      // A provider role alone is not enough; the backend application must be approved.
      setIsProvider(false);
      setLoading(false);
    }
  }, []);

  const fetchProviderApplication = useCallback(async () => {
    if (!user) return;
    setApplicationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/providers/applications/me`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Provider verification load failed");
      const application = data.application || null;
      setProviderApplication(application);
      if (application) {
        setVerificationForm((current) => ({
          ...current,
          full_name: application.full_name || current.full_name,
          phone: application.phone || current.phone,
          email: application.email || current.email,
          address: application.address || current.address,
          service_category: application.service_category || current.service_category,
          experience_years: String(application.experience_years ?? current.experience_years),
        }));
      }
      const role = getMySqlAuth()?.user?.type || getMySqlAuth()?.user?.role;
      if (role === "provider" || application?.status === "approved") {
        setIsProvider(application?.status === "approved");
        setLoading(false);
      }
    } catch (error) {
      console.warn("Provider application fetch failed:", error);
      setIsProvider(false);
      setLoading(false);
    } finally {
      setApplicationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProviderApplication();
  }, [fetchProviderApplication]);
  const submitProviderApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nidFront || !nidBack) {
      toast.error("NID-এর সামনে ও পেছনের ছবি দিন");
      return;
    }
    setSubmittingApplication(true);
    try {
      const formData = new FormData();
      Object.entries(verificationForm).forEach(([key, value]) => formData.append(key, value));
      formData.append("nid_front", nidFront);
      formData.append("nid_back", nidBack);

      const response = await fetch(`${API_BASE_URL}/api/providers/applications`, {
        method: "POST",
        headers: {
          ...(getMySqlAuth()?.token ? { Authorization: `Bearer ${getMySqlAuth()!.token}` } : {}),
        },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Verification submission failed");
      setProviderApplication(data.application);
      setNidFront(null);
      setNidBack(null);
      toast.success("আপনার ভেরিফিকেশন আবেদন জমা হয়েছে। অ্যাডমিন অনুমোদনের পর আপনি প্রোভাইডার হিসেবে কাজ করতে পারবেন।");
    } catch (error: any) {
      toast.error(error.message || "ভেরিফিকেশন আবেদন জমা দেওয়া যায়নি");
    } finally {
      setSubmittingApplication(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const mysqlAuth = getMySqlAuth();
      const mysqlUser = mysqlAuth?.user;
      const currentUserId = user?.id ? String(user.id) : "";
      let currentProviderProfile: ProviderProfile | null = null;
      if (mysqlUser?.id) {
        try {
          currentProviderProfile = await fetchProviderProfileByUserId(mysqlUser.id);
          if (!currentProviderProfile) {
            currentProviderProfile = await fetchProviderProfileFallback(mysqlUser);
          }
          setProviderProfile(currentProviderProfile);
        } catch (error) {
          console.warn("Provider profile fetch failed:", error);
          try {
            currentProviderProfile = await fetchProviderProfileFallback(mysqlUser);
            setProviderProfile(currentProviderProfile);
          } catch (fallbackError) {
            console.warn("Provider profile fallback failed:", fallbackError);
            setProviderProfile(null);
          }
        }
      }

      const bookingLookupIds = [
        currentProviderProfile?.id,
        currentProviderProfile?.user_id,
        mysqlUser?.id,
        currentUserId,
      ];

      try {
        let assignedBookings: Booking[] = [];

        if (mysqlUser?.id) {
          assignedBookings = (await listProviderAssignedBookings(mysqlUser.id)).map(normalizeBooking);
        }

        if (!assignedBookings.length) {
          assignedBookings = await fetchAssignedBookings(bookingLookupIds);
        }

        setBookings(assignedBookings);
      } catch (error: any) {
        console.error("Assigned bookings fetch error:", error);
        toast.error(error.message || "Assigned bookings load failed");
        setBookings([]);
      }

      try {
        const reviewsData = await listReviews();
        setReviews(
          (reviewsData || []).map((review) => ({
            id: String(review.id),
            service_slug: review.service_slug,
            reviewer_name: review.reviewer_name,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
          }))
        );
      } catch (error) {
        console.warn("Reviews fetch failed:", error);
        setReviews([]);
      }

      setProfile((prev) => ({
        display_name:
          currentProviderProfile?.full_name ||
          mysqlUser?.name ||
          prev.display_name ||
          "",
        phone:
          currentProviderProfile?.phone ||
          mysqlUser?.mobile ||
          prev.phone ||
          "",
        address: currentProviderProfile?.address || prev.address || "",
      }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (isProvider) fetchData(); }, [isProvider, fetchData]);

  const updateBookingStatus = async (id: string, status: string) => {
    setUpdatingId(id);

    try {
      const updated = await updateBackendBookingStatus(id, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
      );

      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Booking status update error:", error);
      toast.error(error.message || "স্ট্যাটাস আপডেট ব্যর্থ");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!profile.display_name.trim()) {
      toast.error("নাম দিন");
      return;
    }

    setSaving(true);
    try {
      setProfile((prev) => ({
        ...prev,
        display_name: profile.display_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      }));
      setProviderProfile((prev) => ({
        ...(prev || {}),
        full_name: profile.display_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      }));
      toast.success("প্রোফাইল আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast.error(error.message || "আপডেট ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  // Earnings calculation
  const completedBookings = bookings.filter(b => b.status === "completed");
  const totalEarnings = completedBookings.reduce((sum, b) => sum + b.package_price, 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const statusFilteredBookings = filterStatus === "all" ? bookings : bookings.filter(b => b.status === filterStatus);
  const filteredBookings = filterCategory === "all" ? statusFilteredBookings
    : statusFilteredBookings.filter(b => serviceCategoryMap?.get(b.service_slug) === filterCategory);
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isProvider) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-2xl flex-col px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">প্রোভাইডার ভেরিফিকেশন</h1>
              <p className="text-sm text-muted-foreground">অনুমোদনের আগে আপনার তথ্য ও NID যাচাই করা হবে।</p>
            </div>
          </div>

          {applicationLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {providerApplication?.status && (
                <div className={`mb-5 rounded-xl border p-3 text-sm ${providerApplication.status === "rejected" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  আপনার আবেদন: <strong>{providerApplication.status === "pending" ? "পর্যালোচনাধীন" : providerApplication.status === "rejected" ? "বাতিল" : providerApplication.status}</strong>
                  {providerApplication.status_reason && <p className="mt-1 text-xs">{providerApplication.status_reason}</p>}
                </div>
              )}
              <form onSubmit={submitProviderApplication} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted-foreground">পূর্ণ নাম<input required value={verificationForm.full_name} onChange={(e) => setVerificationForm({ ...verificationForm, full_name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-muted-foreground">ফোন<input required value={verificationForm.phone} onChange={(e) => setVerificationForm({ ...verificationForm, phone: e.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></label>
                </div>
                <label className="block text-xs font-medium text-muted-foreground">ইমেইল<input type="email" value={verificationForm.email} onChange={(e) => setVerificationForm({ ...verificationForm, email: e.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium text-muted-foreground">ঠিকানা<textarea required rows={3} value={verificationForm.address} onChange={(e) => setVerificationForm({ ...verificationForm, address: e.target.value })} className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted-foreground">সার্ভিস ক্যাটাগরি<select required value={verificationForm.service_category} onChange={(e) => setVerificationForm({ ...verificationForm, service_category: e.target.value })} disabled={categoriesLoading || categoriesError} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"><option value="">{categoriesLoading ? "ক্যাটাগরি লোড হচ্ছে..." : categoriesError ? "ক্যাটাগরি লোড করা যায়নি" : "ক্যাটাগরি নির্বাচন করুন"}</option>{serviceCategories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name_en || category.name}</option>)}</select>{categoriesError && <span className="mt-1 block text-[11px] text-destructive">সার্ভিস ব্যাকএন্ড চালু আছে কিনা পরীক্ষা করুন।</span>}</label>
                  <label className="text-xs font-medium text-muted-foreground">অভিজ্ঞতা (বছর)<input required min="0" max="60" type="number" value={verificationForm.experience_years} onChange={(e) => setVerificationForm({ ...verificationForm, experience_years: e.target.value })} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[{ key: "front", label: "NID-এর সামনের ছবি", value: nidFront, set: setNidFront }, { key: "back", label: "NID-এর পেছনের ছবি", value: nidBack, set: setNidBack }].map((item) => (
                    <label key={item.key} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-center hover:border-primary/50">
                      {item.value ? <IdCard className="h-8 w-8 text-primary" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
                      <span className="text-xs font-medium text-foreground">{item.value?.name || item.label}</span>
                      <input required={!providerApplication?.nid_front_url && item.key === "front" || !providerApplication?.nid_back_url && item.key === "back"} type="file" accept="image/*" className="hidden" onChange={(e) => item.set(e.target.files?.[0] || null)} />
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={submittingApplication} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">{submittingApplication ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} আবেদন জমা দিন</button>
              </form>
            </div>
          )}
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="" />

      <div className="mx-auto max-w-8xl">
       
        
      

        {/* Stats */}


        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "bookings", label: "অ্যাসাইনড বুকিং", icon: <Package className="h-4 w-4" />, group: "অপারেশন" },
              { value: "reviews", label: "রিভিউ", icon: <Star className="h-4 w-4" /> },
              { value: "earnings", label: "আয় রিপোর্ট", icon: <TrendingUp className="h-4 w-4" />, group: "ফিনান্স" },
              { value: "accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" /> },
              { value: "profile", label: "প্রোফাইল", icon: <User className="h-4 w-4" />, group: "অ্যাকাউন্ট" },
            ]}
            defaultValue="bookings"
            panelTitle="প্রোভাইডার"
            panelIcon={<Briefcase className="h-4 w-4" />}
          
          >
            {(activeTab) => {
              if (activeTab === "bookings") return (
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {statusOptions.map(s => (
                      <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${filterStatus === s.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}>
                        <p className="text-xl font-bold text-foreground">{bookings.filter(b => b.status === s.value).length}</p>
                        <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <CategoryFilterDropdown value={filterCategory} onChange={setFilterCategory} />
                    {(filterStatus !== "all" || filterCategory !== "all") && <button onClick={() => { setFilterStatus("all"); setFilterCategory("all"); }} className="text-xs text-primary hover:underline">← সব দেখুন</button>}
                  </div>
                  <div className="space-y-2">
                    {sortedBookings.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground">কোনো অ্যাসাইনড বুকিং নেই</p>
                      </div>
                    ) : sortedBookings.map((b, i) => {
                      const s = statusOptions.find(o => o.value === b.status) || statusOptions[0];
                      return (
                        <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-foreground">{b.service_title}</p>
                                {b.is_emergency && <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"><Zap className="h-3 w-3" /> জরুরী</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">{b.package_name} — ৳{b.package_price}</p>
                            </div>
                            <select value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)} disabled={updatingId === b.id}
                              className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {b.customer_name}</span>
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.customer_phone}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                            <span className="flex items-center gap-1 col-span-2"><MapPin className="h-3 w-3 shrink-0" /> {b.customer_address}</span>
                          </div>
                          {/* <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                            <button onClick={() => setChatBooking(b)} className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
                              <MessageCircle className="h-3 w-3" /> চ্যাট করুন
                            </button>
                          </div> */}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
              if (activeTab === "profile") return (
                <div className="p-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 max-w-lg">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary"><User className="h-6 w-6" /></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{profile.display_name || "প্রোভাইডার"}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <span className="inline-block mt-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">সার্ভিস প্রদানকারী</span>
                      </div>
                    </div>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">নাম</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input type="text" value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                            placeholder="আপনার নাম" maxLength={100}
                            className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">ফোন</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="01XXXXXXXXX" maxLength={11}
                            className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">ঠিকানা / এলাকা</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <textarea value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })}
                            placeholder="আপনার সার্ভিস এরিয়া" maxLength={300} rows={2}
                            className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
                        </div>
                      </div>
                      <button type="submit" disabled={saving}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="h-4 w-4" /> সেভ করুন</>}
                      </button>
                    </form>
                  </motion.div>
                </div>
              );
              if (activeTab === "earnings") return (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold text-foreground">৳{totalEarnings.toLocaleString("bn-BD")}</p>
                      <p className="text-xs text-muted-foreground">মোট আয়</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-foreground">{completedBookings.length}</p>
                      <p className="text-xs text-muted-foreground">সম্পন্ন কাজ</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                      <p className="text-2xl font-bold text-foreground">{avgRating}</p>
                      <p className="text-xs text-muted-foreground">গড় রেটিং</p>
                    </div>
                  </div>
                  {completedBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">সম্পন্ন কাজের তালিকা</h3>
                      <div className="space-y-2">
                        {completedBookings.map(b => (
                          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{b.service_title}</p>
                              <p className="text-[10px] text-muted-foreground">{b.booking_date} • {b.customer_name}</p>
                            </div>
                            <p className="text-sm font-bold text-foreground">৳{b.package_price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
              if (activeTab === "reviews") return (
                <div className="p-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">এখনো কোনো রিভিউ নেই</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reviews.map(r => (
                        <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{r.reviewer_name}</p>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("bn-BD")}</span>
                          </div>
                          {r.comment && <p className="text-xs text-foreground bg-secondary/50 rounded-lg p-2">{r.comment}</p>}
                          <p className="text-[10px] text-primary">সার্ভিস: {r.service_slug}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
              if (activeTab === "accounts") return (
                <div className="p-4"><AccountsSection userId={String(user!.id)} role="provider" /></div>
              );
              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      <BookingChatModal
        open={!!chatBooking}
        onClose={() => setChatBooking(null)}
        bookingId={chatBooking?.id || ""}
        serviceTitle={chatBooking?.service_title || ""}
        providerName={chatBooking?.customer_name}
        senderRole="provider"
      />
      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default ProviderPanel;
