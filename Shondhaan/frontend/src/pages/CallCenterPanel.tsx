import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Search, User, Phone, MapPin, Calendar, Clock,
  Plus, RefreshCw, FileText, ClipboardList, Headphones, Loader2,
  Zap, Download, Wallet, MessageSquare, FlaskConical, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { toast } from "sonner";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import CategoryFilterDropdown, { useServiceCategoryMap } from "@/components/CategoryFilterDropdown";
import { CENTRAL_API_BASE_URL, INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import {
  assignBookingProvider,
  createBooking,
  listBookings,
  updateBookingStatus as updateBackendBookingStatus,
  type BookingRecord,
} from "@/lib/bookingApi";
import { getMySqlAuth } from "@/lib/mysqlAuth";


type Booking = BookingRecord;

interface Provider {
  id: string | number;
  user_id: string | number;
  full_name: string;
  phone?: string | null;
  service_category?: string | null;
}

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  service_description: string;
  status: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  address: string | null;
}

const bookingStatusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "নিশ্চিত", className: "bg-blue-100 text-blue-800" },
  { value: "assigned", label: "অ্যাসাইনড", className: "bg-purple-100 text-purple-800" },
  { value: "completed", label: "সম্পন্ন", className: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const requestStatusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "contacted", label: "যোগাযোগ হয়েছে", className: "bg-blue-100 text-blue-800" },
  { value: "resolved", label: "সমাধান হয়েছে", className: "bg-green-100 text-green-800" },
  { value: "rejected", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const API_BASE_URL = (INDIVIDUAL_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const CENTRAL_API_URL = (CENTRAL_API_BASE_URL || "https://backend-shondhaan.yessbd.top").replace(/\/+$/, "");

const getAuthHeaders = () => {
  const auth = getMySqlAuth();

  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const extractArray = <T,>(payload: any): T[] => {
  const data =
    payload?.data ??
    payload?.items ??
    payload?.rows ??
    payload?.result ??
    payload?.bookings ??
    payload?.providers ??
    payload?.users ??
    payload;

  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.rows)) return data.rows as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  if (Array.isArray(data?.users)) return data.users as T[];

  return [];
};

const fetchOptionalArray = async <T,>(url: string): Promise<T[]> => {
  try {
    const response = await fetch(url, { headers: getAuthHeaders() });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) return [];
    return extractArray<T>(payload);
  } catch {
    return [];
  }
};

const normalizeUserToProfile = (item: any): Profile => ({
  user_id: String(item.id ?? item.user_id ?? ""),
  display_name: item.name ?? item.display_name ?? item.full_name ?? null,
  phone: item.mobile ?? item.phone ?? null,
  address: item.address ?? null,
});

const CallCenterPanel = () => {
  const navigate = useNavigate();
  const mysqlAuth = getMySqlAuth();
  const mysqlUser = mysqlAuth?.user;
  const activeUserId = mysqlUser?.id;
  const [isCallCenter, setIsCallCenter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reqDivisionFilter, setReqDivisionFilter] = useState("all");
  const [reqDistrictFilter, setReqDistrictFilter] = useState("all");
  const [reqThanaFilter, setReqThanaFilter] = useState("all");
  const { data: serviceCategoryMap } = useServiceCategoryMap();

  // New booking form
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    service_title: "", service_slug: "", package_name: "", package_price: 0,
    customer_name: "", customer_phone: "", customer_address: "",
    booking_date: "", booking_time: "", user_id: "", is_emergency: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mysqlAuth?.token || !activeUserId) {
      navigate("/main-login", { replace: true });
    }
  }, [activeUserId, mysqlAuth?.token, navigate]);

  const checkRole = useCallback(() => {
    const role = mysqlUser?.type || mysqlUser?.role;

    setIsCallCenter(
      ["call_center", "admin", "super_admin"].includes(String(role || ""))
    );

    setLoading(false);
  }, [mysqlUser?.role, mysqlUser?.type]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const providersRes = await fetch(`${API_BASE_URL}/api/providers?status=approved`, {
        headers: getAuthHeaders(),
      });

      const providerPayload = await providersRes.json().catch(() => ({}));

      if (!providersRes.ok) {
        throw new Error(providerPayload.message || "Failed to fetch providers");
      }

      const [bookingRows, requestRows, labRows] = await Promise.all([
        listBookings(),
        fetchOptionalArray<ServiceRequest>(`${API_BASE_URL}/api/service-requests`),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/lab-test-reports`),
      ]);

      setBookings((bookingRows || []) as Booking[]);
      setProviders(extractArray<Provider>(providerPayload));
      setRequests(requestRows || []);
      setLabTests(labRows || []);
    } catch (error: any) {
      console.error("Call center data load error:", error);
      toast.error(error?.message || "Failed to load call center data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (isCallCenter) fetchData(); }, [isCallCenter, fetchData]);

  const searchCustomer = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);

    try {
      const q = searchQuery.trim();

      const response = await fetch(
        `${CENTRAL_API_URL}/api/admin/users?search=${encodeURIComponent(q)}`,
        { headers: getAuthHeaders() }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Customer search failed");
      }

      let users = extractArray<any>(payload);

      // Some backends ignore ?search=. If so, filter on frontend.
      users = users.filter((item) => {
        const text = [
          item.id,
          item.user_id,
          item.name,
          item.display_name,
          item.full_name,
          item.mobile,
          item.phone,
          item.email,
          item.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(q.toLowerCase());
      });

      setSearchResults(users.map(normalizeUserToProfile));
    } catch (error: any) {
      console.error("Customer search error:", error);
      toast.error(error?.message || "Customer search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const updated = await updateBackendBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
    } catch (error: any) {
      toast.error(error?.message || "Booking status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignProvider = async (id: string, providerId: string) => {
    setUpdatingId(id);
    try {
      const updated = await assignBookingProvider(id, providerId || null);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
      toast.success(providerId ? "Provider assigned" : "Provider removed");
    } catch (error: any) {
      toast.error(error?.message || "Provider assign failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    setUpdatingId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/service-requests/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Request status update failed");
      }

      setRequests((prev) =>
        prev.map((request) => (request.id === id ? { ...request, status } : request))
      );
    } catch (error: any) {
      toast.error(error?.message || "Request status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.service_title || !newBooking.customer_name || !newBooking.customer_phone || !newBooking.booking_date || !newBooking.booking_time) {
      toast.error("সব তথ্য পূরণ করুন"); return;
    }
    if (!newBooking.user_id) { toast.error("কাস্টমার সিলেক্ট করুন"); return; }
    setSubmitting(true);
    try {
      await createBooking({
        user_id: String(newBooking.user_id),
        service_id: null,
        package_id: null,
        service_title: newBooking.service_title,
        service_slug:
          newBooking.service_slug ||
          newBooking.service_title.toLowerCase().trim().replace(/\s+/g, "-"),
        package_name: newBooking.package_name || "Call Center Package",
        package_price: Number(newBooking.package_price || 0),
        customer_name: newBooking.customer_name.trim(),
        customer_phone: newBooking.customer_phone.trim(),
        customer_address:
          newBooking.customer_address.trim() || "Call center booking",
        booking_date: newBooking.booking_date,
        booking_time: newBooking.booking_time,
        status: "pending",
        payment_status: "unpaid",
        note: newBooking.is_emergency ? "Emergency booking" : null,
      } as any);
    } catch (error: any) {
      setSubmitting(false);
      toast.error(error?.message || "Booking create failed");
      return;
    }
    setSubmitting(false);
    toast.success("বুকিং তৈরি হয়েছে");
    setShowNewBooking(false);
    setNewBooking({ service_title: "", service_slug: "", package_name: "", package_price: 0, customer_name: "", customer_phone: "", customer_address: "", booking_date: "", booking_time: "", user_id: "", is_emergency: false });
    fetchData();
  };

  const statusFilteredBookings = filterStatus === "all" ? bookings
    : filterStatus === "emergency" ? bookings.filter(b => b.is_emergency || b.note === "Emergency booking")
    : bookings.filter(b => b.status === filterStatus);
  const filteredBookings = filterCategory === "all" ? statusFilteredBookings
    : statusFilteredBookings.filter(b => serviceCategoryMap?.get(b.service_slug) === filterCategory);

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isCallCenter) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Headphones className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">এই পেজটি শুধুমাত্র কল সেন্টার স্টাফদের জন্য।</p>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</button>
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> পেছনে যান
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Headphones className="h-6 w-6 text-primary" /> কল সেন্টার প্যানেল
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">বুকিং: {bookings.length} • রিকোয়েস্ট: {requests.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> চ্যাট হাব
            </Button>
            <NotificationBell />
            <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
            </button>
          </div>
        </div>


        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "search", label: "কাস্টমার সার্চ", icon: <Search className="h-4 w-4" />, group: "কাস্টমার" },
              { value: "new-booking", label: "নতুন বুকিং", icon: <Plus className="h-4 w-4" /> },
              { value: "bookings", label: "বুকিং", icon: <ClipboardList className="h-4 w-4" />, group: "অপারেশন" },
              { value: "requests", label: "সেবা রিকোয়েস্ট", icon: <FileText className="h-4 w-4" /> },
              { value: "lab-tests", label: "ল্যাব টেস্ট", icon: <FlaskConical className="h-4 w-4" /> },
              { value: "mart-orders", label: "মার্ট অর্ডার", icon: <ShoppingCart className="h-4 w-4" />, group: "ইয়েস মার্ট" },
              { value: "accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" />, group: "ফিনান্স" },
            ]}
            defaultValue="search"
            panelTitle="কল সেন্টার"
            panelIcon={<Headphones className="h-4 w-4" />}
            hero={{
              title: "কল সেন্টার অপারেশন্স",
              subtitle: "কল গ্রহণ, বুকিং তৈরি, কাস্টমার সাপোর্ট — এন্টারপ্রাইজ-গ্রেড ওয়ার্কফ্লো।",
              badge: { label: "কল সেন্টার প্যানেল" },
              gradient: "from-blue-500 via-indigo-600 to-blue-700",
            }}
          >
            {(activeTab) => {
              if (activeTab === "search") return (
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && searchCustomer()}
                        placeholder="ফোন নম্বর বা নাম দিয়ে খুঁজুন..."
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <button onClick={searchCustomer} disabled={searching}
                      className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "খুঁজুন"}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{searchResults.length}টি ফলাফল পাওয়া গেছে</p>
                      {searchResults.map(p => {
                        const customerBookings = bookings.filter(b => b.user_id === p.user_id);
                        return (
                          <div key={p.user_id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary"><User className="h-5 w-5" /></div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{p.display_name || "—"}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone || "—"}</p>
                                {p.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.address}</p>}
                              </div>
                            </div>
                            {customerBookings.length > 0 && (
                              <div className="border-t border-border pt-2 space-y-1.5">
                                <p className="text-[10px] text-muted-foreground font-medium">বুকিং ({customerBookings.length})</p>
                                {customerBookings.slice(0, 3).map(b => {
                                  const s = bookingStatusOptions.find(o => o.value === b.status) || bookingStatusOptions[0];
                                  return (
                                    <div key={b.id} className="flex items-center justify-between text-xs">
                                      <span className="text-foreground">{b.service_title} — {b.package_name}</span>
                                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${s.className}`}>{s.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
              if (activeTab === "bookings") return (
                <div className="p-4">
                  {bookings.filter(b => b.is_emergency).length > 0 && (
                    <button onClick={() => setFilterStatus(filterStatus === "emergency" ? "all" : "emergency")}
                      className={`mb-4 flex items-center gap-2 rounded-xl border p-3 w-full ${filterStatus === "emergency" ? "border-destructive ring-1 ring-destructive bg-destructive/5" : "border-border hover:border-destructive/40"}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><Zap className="h-4 w-4" /></div>
                      <div className="text-left"><p className="text-lg font-bold text-foreground">{bookings.filter(b => b.is_emergency).length}</p><p className="text-xs font-medium text-destructive">জরুরী বুকিং</p></div>
                    </button>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {bookingStatusOptions.map(s => (
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
                    {sortedBookings.length === 0 ? <p className="text-center py-8 text-muted-foreground">কোনো বুকিং নেই</p> :
                      sortedBookings.map((b, i) => {
                        const s = bookingStatusOptions.find(o => o.value === b.status) || bookingStatusOptions[0];
                        return (
                          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-foreground">{b.service_title}</p>
                                  {(b.is_emergency || b.note === "Emergency booking") && <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"><Zap className="h-3 w-3" /> জরুরী</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">{b.package_name} — ৳{b.package_price}</p>
                              </div>
                              <select value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)} disabled={updatingId === b.id}
                                className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                                {bookingStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div className="mb-2">
                              <select
                                value={b.provider_id ? String(b.provider_id) : ""}
                                onChange={e => handleAssignProvider(b.id, e.target.value)}
                                disabled={updatingId === b.id}
                                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                              >
                                <option value="">Provider assign করুন</option>
                                {providers.map(provider => (
                                  <option key={provider.id} value={provider.id}>
                                    {provider.full_name || provider.name || provider.shop_name || `Provider ${provider.id}`}{provider.phone || provider.mobile ? ` - ${provider.phone || provider.mobile}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {b.customer_name}</span>
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.customer_phone}</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                              <span className="flex items-center gap-1 col-span-2"><MapPin className="h-3 w-3 shrink-0" /> {b.customer_address}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              );
              if (activeTab === "new-booking") return (
                <div className="p-4 max-w-lg">
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">কাস্টমারের জন্য বুকিং তৈরি করুন</h3>
                  <div className="mb-4 p-3 rounded-xl border border-border bg-card space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">প্রথমে কাস্টমার খুঁজুন</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="ফোন বা নাম..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <button onClick={searchCustomer} disabled={searching} className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
                        {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "খুঁজুন"}
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-1">
                        {searchResults.map(p => (
                          <button key={p.user_id} onClick={() => { setNewBooking(prev => ({ ...prev, user_id: p.user_id, customer_name: p.display_name || "", customer_phone: p.phone || "", customer_address: p.address || "" })); toast.success(`${p.display_name} সিলেক্ট হয়েছে`); }}
                            className="w-full flex items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-secondary transition-colors">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div><p className="text-xs font-medium text-foreground">{p.display_name || "—"}</p><p className="text-[10px] text-muted-foreground">{p.phone}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                    {newBooking.user_id && <p className="text-[10px] text-primary">✓ কাস্টমার সিলেক্ট: {newBooking.customer_name}</p>}
                  </div>
                  <form onSubmit={handleCreateBooking} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={newBooking.customer_name} onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })} placeholder="কাস্টমারের নাম *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input value={newBooking.customer_phone} onChange={e => setNewBooking({ ...newBooking, customer_phone: e.target.value })} placeholder="ফোন নম্বর *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input value={newBooking.service_title} onChange={e => setNewBooking({ ...newBooking, service_title: e.target.value })} placeholder="সার্ভিসের নাম *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input value={newBooking.service_slug} onChange={e => setNewBooking({ ...newBooking, service_slug: e.target.value })} placeholder="সার্ভিস স্লাগ *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input value={newBooking.package_name} onChange={e => setNewBooking({ ...newBooking, package_name: e.target.value })} placeholder="প্যাকেজের নাম *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input type="number" value={newBooking.package_price || ""} onChange={e => setNewBooking({ ...newBooking, package_price: Number(e.target.value) })} placeholder="মূল্য (৳) *" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input type="date" value={newBooking.booking_date} onChange={e => setNewBooking({ ...newBooking, booking_date: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <input type="time" value={newBooking.booking_time} onChange={e => setNewBooking({ ...newBooking, booking_time: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <textarea value={newBooking.customer_address} onChange={e => setNewBooking({ ...newBooking, customer_address: e.target.value })} placeholder="ঠিকানা *" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={newBooking.is_emergency} onChange={e => setNewBooking({ ...newBooking, is_emergency: e.target.checked })} /><Zap className="h-3.5 w-3.5 text-destructive" /> জরুরী বুকিং</label>
                    <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> তৈরি হচ্ছে...</> : <><Plus className="h-4 w-4" /> বুকিং তৈরি করুন</>}
                    </button>
                  </form>
                </div>
              );
              if (activeTab === "requests") return (
                <div className="p-4">
                  {(() => {
                    const reqDivisions = [...new Set(requests.map(r => r.division))].sort();
                    const reqDistricts = [...new Set(requests.filter(r => reqDivisionFilter === "all" || r.division === reqDivisionFilter).map(r => r.district))].sort();
                    const reqThanas = [...new Set(requests.filter(r => (reqDivisionFilter === "all" || r.division === reqDivisionFilter) && (reqDistrictFilter === "all" || r.district === reqDistrictFilter) && r.thana).map(r => r.thana!))].sort();
                    const locationFilteredReqs = requests.filter(r => {
                      if (reqDivisionFilter !== "all" && r.division !== reqDivisionFilter) return false;
                      if (reqDistrictFilter !== "all" && r.district !== reqDistrictFilter) return false;
                      if (reqThanaFilter !== "all" && r.thana !== reqThanaFilter) return false;
                      return true;
                    });
                    const filteredReqs = locationFilteredReqs;
                    const getStatusLabel = (st: string) => requestStatusOptions.find(o => o.value === st)?.label || st;
                    const exportCSV = () => {
                      const header = "নাম,ফোন,বিভাগ,জেলা,থানা,বিস্তারিত,বিবরণ,স্ট্যাটাস,তারিখ";
                      const rows = filteredReqs.map(r => [r.customer_name, r.customer_phone, r.division, r.district, r.thana || "", r.detail_area || "", `"${r.service_description.replace(/"/g, '""')}"`, getStatusLabel(r.status), new Date(r.created_at).toLocaleDateString("bn-BD")].join(","));
                      const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `requests-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                    };
                    return <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {requestStatusOptions.map(s => (
                          <div key={s.value} className="rounded-xl border border-border p-2.5">
                            <p className="text-xl font-bold text-foreground">{locationFilteredReqs.filter(r => r.status === s.value).length}</p>
                            <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <select value={reqDivisionFilter} onChange={e => { setReqDivisionFilter(e.target.value); setReqDistrictFilter("all"); setReqThanaFilter("all"); }} className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                          <option value="all">সব বিভাগ</option>{reqDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={reqDistrictFilter} onChange={e => { setReqDistrictFilter(e.target.value); setReqThanaFilter("all"); }} className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                          <option value="all">সব জেলা</option>{reqDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {reqThanas.length > 0 && (
                          <select value={reqThanaFilter} onChange={e => setReqThanaFilter(e.target.value)} className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                            <option value="all">সব থানা</option>{reqThanas.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                        {(reqDivisionFilter !== "all" || reqDistrictFilter !== "all" || reqThanaFilter !== "all") && (
                          <button onClick={() => { setReqDivisionFilter("all"); setReqDistrictFilter("all"); setReqThanaFilter("all"); }} className="text-xs text-primary hover:underline">✕ ফিল্টার মুছুন</button>
                        )}
                      </div>
                      {filteredReqs.length > 0 && (
                        <div className="flex gap-1.5 mb-4">
                          <button onClick={exportCSV} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"><Download className="h-3 w-3" /> CSV</button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {filteredReqs.length === 0 ? <p className="text-center py-8 text-muted-foreground">কোনো রিকোয়েস্ট নেই</p> :
                          filteredReqs.map(r => {
                            const s = requestStatusOptions.find(o => o.value === r.status) || requestStatusOptions[0];
                            return (
                              <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {r.customer_name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {r.customer_phone}</p>
                                  </div>
                                  <select value={r.status} onChange={e => updateRequestStatus(r.id, e.target.value)} disabled={updatingId === r.id}
                                    className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                                    {requestStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                                <p className="text-xs text-foreground flex items-start gap-1.5"><FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {r.service_description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">📍 {r.division}</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">🏙️ {r.district}</span>
                                  {r.thana && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">📌 {r.thana}</span>}
                                </div>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString("bn-BD")}</span>
                              </div>
                            );
                          })}
                      </div>
                    </>;
                  })()}
                </div>
              );
              if (activeTab === "lab-tests") return (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">মোট ল্যাব টেস্ট: {labTests.length}</p>
                  {labTests.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>কোনো ল্যাব টেস্ট নেই</p>
                    </div>
                  ) : labTests.map((t: any) => {
                    const labStatusMap: Record<string, { label: string; cls: string }> = {
                      collected: { label: "স্যাম্পল সংগৃহীত", cls: "bg-blue-100 text-blue-800" },
                      processing: { label: "প্রসেসিং", cls: "bg-indigo-100 text-indigo-800" },
                      completed: { label: "সম্পন্ন", cls: "bg-green-100 text-green-800" },
                    };
                    const s = labStatusMap[t.status] || labStatusMap.collected;
                    return (
                      <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{t.test_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">ট্র্যাকিং: {t.tracking_id}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                          <span>👤 {t.customer_name || "—"}</span>
                          <span>📞 {t.customer_phone || "—"}</span>
                          <span>📅 {new Date(t.sample_date).toLocaleDateString("bn-BD")}</span>
                          <span>{t.report_ready ? "✅ রিপোর্ট প্রস্তুত" : "⏳ রিপোর্ট অপেক্ষমাণ"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
              if (activeTab === "mart-orders") return (
                <div className="p-4">
                  <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
                    <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="font-bold text-foreground mb-1">মার্ট অর্ডার ম্যানেজমেন্ট</h3>
                    <p className="text-sm text-muted-foreground mb-3">কাস্টমারদের মার্ট অর্ডার সম্পর্কিত সমস্যা সমাধানের জন্য</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/mart/cs")}>
                      মার্ট CS প্যানেলে যান →
                    </Button>
                  </div>
                </div>
              );
              if (activeTab === "accounts") return activeUserId ? <div className="p-4"><AccountsSection userId={String(activeUserId)} role="call_center" /></div> : null;
              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default CallCenterPanel;
