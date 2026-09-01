import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Search, User, Phone, MapPin, Calendar, Clock,
  Plus, RefreshCw, FileText, ClipboardList, Headphones, Loader2,
  Zap, Download, Wallet, MessageSquare, FlaskConical, ShoppingCart,
  AlertCircle, CheckCircle, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { toast } from "sonner";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import ServiceStaffChatInbox from "@/components/admin/ServiceStaffChatInbox";
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
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "confirmed", label: "নিশ্চিত", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "assigned", label: "অ্যাসাইনড", className: "bg-purple-50 text-purple-700 border border-purple-200" },
  { value: "completed", label: "সম্পন্ন", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { value: "cancelled", label: "বাতিল", className: "bg-slate-100 text-slate-700 border border-slate-200" },
];

const requestStatusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "contacted", label: "যোগাযোগ হয়েছে", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "resolved", label: "সমাধান হয়েছে", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { value: "rejected", label: "বাতিল", className: "bg-slate-100 text-slate-700 border border-slate-200" },
];

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");
const CENTRAL_API_URL = CENTRAL_API_BASE_URL.replace(/\/+$/, "");

const getAuthHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const extractArray = <T,>(payload: any): T[] => {  
  if (Array.isArray(payload)) return payload as T[];
  const data = payload?.data ?? payload?.items ?? payload?.rows ?? payload?.result ?? payload?.users ?? payload?.bookings ?? payload?.providers;
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.rows)) return data.rows as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  if (Array.isArray(data?.users)) return data.users as T[];
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key] as T[];
    }
  }
  return [];
};

const fetchOptionalArray = async <T,>(url: string): Promise<T[]> => {
  try {
    const response = await fetch(url, { headers: getAuthHeaders(), credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return [];
    return extractArray<T>(payload);
  } catch (error) {
    console.error(`[fetchOptionalArray] Error fetching ${url}:`, error);
    return [];
  }
};

const normalizeUserToProfile = (item: any): Profile => ({
  user_id: String(item.id ?? item.user_id ?? ""),
  display_name: item.name ?? item.display_name ?? item.full_name ?? item.username ?? null,
  phone: item.mobile ?? item.phone ?? item.phoneNumber ?? null,
  address: item.address ?? item.location ?? null,
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

  // Services & Packages states
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<any[]>([]);

  // New booking form
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    service_id: "",
    service_title: "", 
    service_slug: "", 
    package_id: "",
    package_name: "", 
    package_price: 0,
    customer_name: "", 
    customer_phone: "", 
    customer_address: "",
    booking_date: "", 
    booking_time: "", 
    user_id: "", 
    is_emergency: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Registration (OTP) states
  const [showRegisterUser, setShowRegisterUser] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState<"details" | "otp">("details");
  const [otpInput, setOtpInput] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "CallCenter123@", 
  });

  // Service & Package Search states
  const [serviceSearch, setServiceSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);

  useEffect(() => {
    if (!mysqlAuth?.token || !activeUserId) {
      navigate("/main-login", { replace: true });
    }
  }, [activeUserId, mysqlAuth?.token, navigate]);

  const checkRole = useCallback(() => {
    const role = mysqlUser?.type || mysqlUser?.role;
    setIsCallCenter(["call_center", "admin", "super_admin"].includes(String(role || "")));
    setLoading(false);
  }, [mysqlUser?.role, mysqlUser?.type]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
const providersRes = await fetch(`${API_BASE_URL}/api/providers?status=approved`, {
  headers: getAuthHeaders(),
  credentials: "include",
});

const providerPayload = await providersRes.json().catch(() => ({}));

if (!providersRes.ok) {
  throw new Error(providerPayload.message || "Failed to fetch providers");
}

  setProviders(extractArray<Provider>(providerPayload));
      const [bookingRows, requestRows, labRows] = await Promise.all([
        listBookings(),
        fetchOptionalArray<ServiceRequest>(`${API_BASE_URL}/api/bookings`),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/lab-test-reports`),
      ]);
      setBookings((bookingRows || []) as Booking[]);
      setRequests(requestRows || []);
      setLabTests(labRows || []);
    } catch (error: any) {
      console.error("Call center data load error:", error);
      toast.error(error?.message || "Failed to load call center data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServicesAndPackages = useCallback(async () => {
    try {
      const [servicesRes, packagesRes] = await Promise.all([
        fetchOptionalArray<any>(`${API_BASE_URL}/api/services`),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/packages`)
      ]);
      setServices(servicesRes);
      setPackages(packagesRes);
    } catch (error) {
      console.error("Failed to fetch services/packages", error);
    }
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { 
    if (isCallCenter) {
      fetchData();
      fetchServicesAndPackages();
    } 
  }, [isCallCenter, fetchData, fetchServicesAndPackages]);

  const searchCustomer = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const q = searchQuery.trim();
      const url = `${CENTRAL_API_URL}/api/admin/users?search=${encodeURIComponent(q)}`;
      const response = await fetch(url, { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Customer search failed");
      }
      let users = extractArray<any>(payload);
      const mappedProfiles = users.map(normalizeUserToProfile);
      setSearchResults(mappedProfiles);
    } catch (error: any) {
      console.error("[searchCustomer] Error during search:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchCustomer();
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchCustomer]);

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
        credentials: "include",
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

  // --- OTP Registration Handlers ---
  const handleRequestOtp = async () => {
    if (!newUser.name || !newUser.phone || !newUser.email) {
      toast.error("নাম, ফোন এবং ইমেইল বাধ্যতামূলক");
      return;
    }
    setRegistering(true);
    try {
      const response = await fetch(`${CENTRAL_API_URL}/api/auth/signup/request-otp`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: newUser.name,
          mobile: newUser.phone,
          email: newUser.email,
          address: newUser.address,
          password: newUser.password,
          type: "user",
          sendPasswordInEmail: true, // 👈 ADD THIS LINE!
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to send OTP");
      }

      toast.success("OTP এবং পাসওয়ার্ড পাঠানো হয়েছে। গ্রাহকের ইমেইল চেক করুন।");
      setRegisterStep("otp");
    } catch (error: any) {
      console.error("[handleRequestOtp] Error:", error);
      toast.error(error?.message || "OTP পাঠাতে ব্যর্থ");
    } finally {
      setRegistering(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length !== 6) {
      toast.error("৬ সংখ্যার OTP দিন");
      return;
    }
    setRegistering(true);
    try {
      const response = await fetch(`${CENTRAL_API_URL}/api/auth/signup/verify-otp`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          email: newUser.email,
          otp: otpInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Invalid OTP");
      }

      const createdUser = data.user;
      if (!createdUser || !createdUser.id) {
        throw new Error("User verified, but failed to get User ID.");
      }

      setNewBooking(prev => ({
        ...prev,
        user_id: String(createdUser.id),
        customer_name: createdUser.name || newUser.name,
        customer_phone: createdUser.mobile || newUser.phone,
        customer_address: createdUser.address || newUser.address
      }));

      toast.success("গ্রাহক সফলভাবে ভেরিফাই হয়েছে");
      setShowRegisterUser(false);
      setRegisterStep("details");
      setOtpInput("");
      setNewUser({ name: "", phone: "", email: "", address: "", password: "CallCenter123@" });
    } catch (error: any) {
      console.error("[handleVerifyOtp] Error:", error);
      toast.error(error?.message || "OTP যাচাই ব্যর্থ");
    } finally {
      setRegistering(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.service_title || !newBooking.customer_name || !newBooking.customer_phone || !newBooking.booking_date || !newBooking.booking_time) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    if (!newBooking.user_id) {
      toast.error("কাস্টমার সিলেক্ট করুন");
      return;
    }
    
    if (!activeUserId) {
      toast.error("অপারেটর আইডি পাওয়া যায়নি, আবার লগইন করুন");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        user_id: String(newBooking.user_id),
        booked_by: String(activeUserId),
        booker_name: mysqlUser?.name || mysqlUser?.display_name || "Call Center Agent",
        booker_phone: mysqlUser?.phone || mysqlUser?.mobile || "",
        service_id: newBooking.service_id || null,
        package_id: newBooking.package_id || null,
        service_title: newBooking.service_title,
        service_slug: newBooking.service_slug || newBooking.service_title.toLowerCase().trim().replace(/\s+/g, "-"),
        package_name: newBooking.package_name || "Call Center Package",
        package_price: Number(newBooking.package_price || 0),
        customer_name: newBooking.customer_name.trim(),
        customer_phone: newBooking.customer_phone.trim(),
        customer_address: newBooking.customer_address.trim() || "Call center booking",
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
    toast.success(" তৈরি হয়েছে");
    setShowNewBooking(false);
    setNewBooking({ 
      service_id: "", service_title: "", service_slug: "", 
      package_id: "", package_name: "", package_price: 0, 
      customer_name: "", customer_phone: "", customer_address: "", 
      booking_date: "", booking_time: "", user_id: "", is_emergency: false 
    });
    setServiceSearch("");
    setPackageSearch("");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (!isCallCenter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="pt-20 md:pt-32 flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-6">
            <Headphones className="h-6 w-6 text-slate-600" />
          </div>
          <h1 className="font-semibold text-lg text-slate-900 mb-2">অ্যাক্সেস সীমিত</h1>
          <p className="text-slate-600 text-sm mb-6 text-center max-w-xs">এই বৈশিষ্ট্য শুধুমাত্র কল সেন্টার অপারেটরদের জন্য উপলব্ধ।</p>
          <button onClick={() => navigate("/")} className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            হোমপেজে ফিরুন
          </button>
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-full">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "search", label: "কাস্টমার সার্চ", icon: <Search className="h-4 w-4" />, group: "সার্চ" },
              { value: "new-booking", label: "নতুন ", icon: <Plus className="h-4 w-4" /> },
              { value: "bookings", label: "সব বুকিং", icon: <ClipboardList className="h-4 w-4" />, group: "ম্যানেজমেন্ট" },
              { value: "requests", label: "সার্ভিস অনুরোধ", icon: <FileText className="h-4 w-4" /> },
              { value: "service-messages", label: "বার্তা", icon: <MessageSquare className="h-4 w-4" /> },
            ]}
            defaultValue="search"
            panelTitle="কল সেন্টার"
            panelIcon={<Headphones className="h-4 w-4" />}
            hero={{
              title: "কল সেন্টার ম্যানেজমেন্ট",
              gradient: "from-blue-600 via-slate-700 to-slate-900",
            }}
          >
            {(activeTab) => {
              if (activeTab === "search") return (
                <div className="p-6 space-y-5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="ফোন নম্বর বা নাম দিয়ে অনুসন্ধান করুন..."
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    <button
                      onClick={searchCustomer}
                      disabled={searching}
                      className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      অনুসন্ধান
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 font-medium">{searchResults.length}টি ফলাফল পাওয়া গেছে</p>
                      {searchResults.map(p => {
                        const customerBookings = bookings.filter(b => b.user_id === p.user_id);
                        return (
                          <div key={p.user_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600 shrink-0">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900">{p.display_name || "—"}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3" />
                                  {p.phone || "—"}
                                </p>
                                {p.address && (
                                  <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{p.address}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            {customerBookings.length > 0 && (
                              <div className="border-t border-slate-200 pt-3 space-y-2">
                                <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">বুকিং ({customerBookings.length})</p>
                                {customerBookings.slice(0, 3).map(b => {
                                  const s = bookingStatusOptions.find(o => o.value === b.status) || bookingStatusOptions[0];
                                  return (
                                    <div key={b.id} className="flex items-center justify-between text-xs gap-2">
                                      <span className="text-slate-700 truncate">{b.service_title} — {b.package_name}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${s.className}`}>
                                        {s.label}
                                      </span>
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

                  {searchQuery && searchResults.length === 0 && !searching && (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500">কোনো গ্রাহক পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              );

              if (activeTab === "bookings") return (
                <div className="p-6">
                  {bookings.filter(b => b.is_emergency).length > 0 && (
                    <button
                      onClick={() => setFilterStatus(filterStatus === "emergency" ? "all" : "emergency")}
                      className={`mb-5 w-full flex items-center gap-3 rounded-lg border p-4 transition-all ${
                        filterStatus === "emergency"
                          ? "border-red-300 bg-red-50 ring-1 ring-red-200"
                          : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-slate-900">{bookings.filter(b => b.is_emergency).length}</p>
                        <p className="text-xs font-medium text-red-600">জরুরী বুকিং</p>
                      </div>
                    </button>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
                    {bookingStatusOptions.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          filterStatus === s.value
                            ? `${s.className} ring-2 ring-offset-1`
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-lg font-semibold text-slate-900">{bookings.filter(b => b.status === s.value).length}</p>
                        <p className={`mt-1 text-[11px] font-medium ${s.className.includes("bg-") ? s.className : "text-slate-600"}`}>
                          {s.label}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <CategoryFilterDropdown value={filterCategory} onChange={setFilterCategory} />
                    {(filterStatus !== "all" || filterCategory !== "all") && (
                      <button
                        onClick={() => { setFilterStatus("all"); setFilterCategory("all"); }}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        সব মুছুন
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {sortedBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Circle className="h-8 w-8 mx-auto text-slate-300 mb-3 opacity-50" />
                        <p className="text-sm text-slate-500">কোনো বুকিং নেই</p>
                      </div>
                    ) : (
                      sortedBookings.map((b, i) => {
                        const s = bookingStatusOptions.find(o => o.value === b.status) || bookingStatusOptions[0];
                        return (
                          <motion.div
                            key={b.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-sm font-semibold text-slate-900">{b.service_title}</p>
                                  {(b.is_emergency || b.note === "Emergency booking") && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                      <Zap className="h-3 w-3" />
                                      জরুরী
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{b.package_name} — ৳{b.package_price}</p>
                              </div>
                              <select
                                value={b.status}
                                onChange={e => updateBookingStatus(b.id, e.target.value)}
                                disabled={updatingId === b.id}
                                className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${s.className} disabled:opacity-50 shrink-0`}
                              >
                                {bookingStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>

                            <select
                              value={b.provider_id ? String(b.provider_id) : ""}
                              onChange={e => handleAssignProvider(b.id, e.target.value)}
                              disabled={updatingId === b.id}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 transition-all"
                            >
                              <option value="">সার্ভিস প্রদানকারী নির্ধারণ করুন</option>
                              {providers.map(provider => (
                                <option key={provider.id} value={provider.id}>
                                  {provider.full_name || provider.name || provider.shop_name || `প্রদানকারী ${provider.id}`}
                                  {provider.phone || provider.mobile ? ` · ${provider.phone || provider.mobile}` : ""}
                                </option>
                              ))}
                            </select>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                              <span className="flex items-center gap-2">
                                <User className="h-3 w-3 text-slate-400" />
                                {b.customer_name}
                              </span>
                              <span className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {b.customer_phone}
                              </span>
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {b.booking_date}
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {b.booking_time}
                              </span>
                              <span className="flex items-start gap-2 col-span-2">
                                <MapPin className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                                <span className="truncate">{b.customer_address}</span>
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );

              if (activeTab === "new-booking") return (
                <div className="p-6 bg-white">
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">নতুন বুকিং তৈরি করুন</h3>

                  {/* Step 1: Customer Selection / Registration */}
                  <div className="mb-5 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ধাপ ১: গ্রাহক নির্বাচন করুন</p>
                      {!newBooking.user_id && (
                        <button 
                          type="button"
                          onClick={() => { setShowRegisterUser(!showRegisterUser); setRegisterStep("details"); }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {showRegisterUser ? "← সার্চে ফিরুন" : "+ নতুন গ্রাহক রেজিস্টার করুন"}
                        </button>
                      )}
                    </div>

                    {!showRegisterUser ? (
                      <>
                        <div className="relative flex gap-2">
                          <input
                            type="text"
                            placeholder="ফোন বা নাম দিয়ে সার্চ করুন..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                          />
                          {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                          )}
                        </div>

                        {searchResults.length > 0 && (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {searchResults.map(p => (
                              <button
                                key={p.user_id}
                                type="button"
                                onClick={() => {
                                  setNewBooking(prev => ({
                                    ...prev,
                                    user_id: p.user_id,
                                    customer_name: p.display_name || "",
                                    customer_phone: p.phone || "",
                                    customer_address: p.address || ""
                                  }));
                                  setSearchQuery(""); 
                                  setSearchResults([]);
                                  toast.success(`${p.display_name} নির্বাচিত হয়েছে`);
                                }}
                                className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50 transition-colors"
                              >
                                <User className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-slate-900 truncate">{p.display_name || "—"}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{p.phone}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchQuery && searchResults.length === 0 && !searching && (
                           <p className="text-center text-xs text-slate-500 py-2">
                              কোনো গ্রাহক পাওয়া যায়নি। <button onClick={() => setShowRegisterUser(true)} className="text-blue-600 font-medium">নতুন গ্রাহক রেজিস্টার করুন</button>
                           </p>
                        )}
                      </>
                    ) : (
                      // Registration Form (2-Step OTP Flow)
                      <div className="space-y-2">
                                           {registerStep === "details" ? (
                          <>
                            <input
                              type="text"
                              value={newUser.name}
                              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                              placeholder="গ্রাহকের নাম"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            <input
                              type="tel"
                              value={newUser.phone}
                              onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                              placeholder="ফোন নম্বর"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            <input
                              type="email"
                              value={newUser.email}
                              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                              placeholder="ইমেইল (OTP এখানে যাবে)"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            <input
                              type="text"
                              value={newUser.address}
                              onChange={e => setNewUser({ ...newUser, address: e.target.value })}
                              placeholder="ঠিকানা"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            {/* 👈 ADD THIS PASSWORD INPUT */}
                            <input
                              type="text"
                              value={newUser.password}
                              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                              placeholder="পাসওয়ার্ড"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleRequestOtp}
                              disabled={registering}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {registering ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  OTP পাঠানো হচ্ছে...
                                </>
                              ) : (
                                "OTP এবং পাসওয়ার্ড পাঠান"
                              )}
                            </button>
                          </>
                        ) : (
                          // Step 2: OTP Verification
                          <>
                            <p className="text-xs text-slate-600 text-center mb-1">
                              <span className="font-medium">{newUser.email}</span>-এ OTP পাঠানো হয়েছে
                            </p>
                            <input
                              type="text"
                              value={otpInput}
                              onChange={e => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="৬ সংখ্যার OTP দিন"
                              className="w-full text-center tracking-[0.5em] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={registering}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {registering ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  যাচাই হচ্ছে...
                                </>
                              ) : (
                                "ভেরিফাই এবং সিলেক্ট করুন"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRegisterStep("details")}
                              className="w-full text-xs text-slate-500 hover:text-slate-700 pt-1"
                            >
                              ← বিস্তারিত পরিবর্তন করুন
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {newBooking.user_id && (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mt-2">
                        <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          গ্রাহক নির্বাচিত: {newBooking.customer_name}
                        </p>
                        <button 
                          type="button"
                          onClick={() => {
                            setNewBooking(prev => ({ ...prev, user_id: "", customer_name: "", customer_phone: "", customer_address: "" }));
                            setShowRegisterUser(false);
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          পরিবর্তন করুন
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Booking Details Form */}
                  <form onSubmit={handleCreateBooking} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={newBooking.customer_name}
                        onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                        placeholder="গ্রাহকের নাম"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                      <input
                        value={newBooking.customer_phone}
                        onChange={e => setNewBooking({ ...newBooking, customer_phone: e.target.value })}
                        placeholder="ফোন নম্বর"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                      
                      {/* Service Searchable Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="সার্ভিস সার্চ করুন..."
                          value={newBooking.service_id ? newBooking.service_title : serviceSearch}
                          onChange={e => {
                            setServiceSearch(e.target.value);
                            setShowServiceDropdown(true);
                            if (newBooking.service_id) {
                              setNewBooking(prev => ({ ...prev, service_id: "", service_title: "", service_slug: "", package_id: "", package_name: "", package_price: 0 }));
                              setFilteredPackages([]);
                            }
                          }}
                          onFocus={() => setShowServiceDropdown(true)}
                          onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        />
                        {showServiceDropdown && (
                          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                            {services
                              .filter(s => (s.title || s.name || "").toLowerCase().includes(serviceSearch.toLowerCase()))
                              .map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setNewBooking(prev => ({
                                      ...prev,
                                      service_id: s.id,
                                      service_title: s.title || s.name || "",
                                      service_slug: s.slug || "",
                                      package_id: "",
                                      package_name: "",
                                      package_price: 0
                                    }));
                                    setFilteredPackages(packages.filter(p => p.service_id === s.id || p.service_slug === s.slug));
                                    setServiceSearch("");
                                    setShowServiceDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                >
                                  {s.title || s.name}
                                </button>
                              ))}
                            {services.filter(s => (s.title || s.name || "").toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                              <p className="px-3 py-2 text-xs text-slate-500">কোনো সার্ভিস পাওয়া যায়নি</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Package Searchable Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={newBooking.service_id ? "প্যাকেজ সার্চ করুন..." : "প্রথমে সার্ভিস নির্বাচন করুন"}
                          disabled={!newBooking.service_id}
                          value={newBooking.package_id ? `${newBooking.package_name} - ৳${newBooking.package_price}` : packageSearch}
                          onChange={e => {
                            setPackageSearch(e.target.value);
                            setShowPackageDropdown(true);
                            if (newBooking.package_id) {
                              setNewBooking(prev => ({ ...prev, package_id: "", package_name: "", package_price: 0 }));
                            }
                          }}
                          onFocus={() => setShowPackageDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPackageDropdown(false), 200)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {showPackageDropdown && newBooking.service_id && (
                          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                            {filteredPackages
                              .filter(p => (p.name || p.title || "").toLowerCase().includes(packageSearch.toLowerCase()))
                              .map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setNewBooking(prev => ({
                                      ...prev,
                                      package_id: p.id,
                                      package_name: p.name || p.title || "",
                                      package_price: p.price || 0
                                    }));
                                    setPackageSearch("");
                                    setShowPackageDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                >
                                  {p.name || p.title} - ৳{p.price}
                                </button>
                              ))}
                            {filteredPackages.filter(p => (p.name || p.title || "").toLowerCase().includes(packageSearch.toLowerCase())).length === 0 && (
                              <p className="px-3 py-2 text-xs text-slate-500">কোনো প্যাকেজ পাওয়া যায়নি</p>
                            )}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        value={newBooking.package_price || ""}
                        onChange={e => setNewBooking({ ...newBooking, package_price: Number(e.target.value) })}
                        placeholder="মূল্য (৳)"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                      <input
                        type="date"
                        value={newBooking.booking_date}
                        onChange={e => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                      <input
                        type="time"
                        value={newBooking.booking_time}
                        onChange={e => setNewBooking({ ...newBooking, booking_time: e.target.value })}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                    </div>

                    <textarea
                      value={newBooking.customer_address}
                      onChange={e => setNewBooking({ ...newBooking, customer_address: e.target.value })}
                      placeholder="ঠিকানা"
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 resize-none transition-all"
                    />

                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={newBooking.is_emergency}
                        onChange={e => setNewBooking({ ...newBooking, is_emergency: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-0"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Zap className="h-3.5 w-3.5 text-red-600" />
                        জরুরী বুকিং
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          তৈরি হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          বুকিং তৈরি করুন
                        </>
                      )}
                    </button>
                  </form>
                </div>
              );

              if (activeTab === "requests") return (
                <div className="p-6">
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

                    const exportCSV = () => {
                      const header = "নাম,ফোন,বিভাগ,জেলা,থানা,বিস্তারিত,বিবরণ,স্ট্যাটাস,তারিখ";
                      const rows = locationFilteredReqs.map(r => [
                        r.customer_name,
                        r.customer_phone,
                        r.division,
                        r.district,
                        r.thana || "",
                        r.detail_area || "",
                        `"${r.service_description.replace(/"/g, '""')}"`,
                        requestStatusOptions.find(o => o.value === r.status)?.label || r.status,
                        new Date(r.created_at).toLocaleDateString("bn-BD")
                      ].join(","));
                      const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `অনুরোধ-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                    };

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                          {requestStatusOptions.map(s => (
                            <div key={s.value} className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-lg font-semibold text-slate-900">
                                {locationFilteredReqs.filter(r => r.status === s.value).length}
                              </p>
                              <p className={`mt-1 text-[11px] font-medium ${s.className}`}>{s.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                          <select
                            value={reqDivisionFilter}
                            onChange={e => {
                              setReqDivisionFilter(e.target.value);
                              setReqDistrictFilter("all");
                              setReqThanaFilter("all");
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                          >
                            <option value="all">সব বিভাগ</option>
                            {reqDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>

                          <select
                            value={reqDistrictFilter}
                            onChange={e => {
                              setReqDistrictFilter(e.target.value);
                              setReqThanaFilter("all");
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                          >
                            <option value="all">সব জেলা</option>
                            {reqDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>

                          {reqThanas.length > 0 && (
                            <select
                              value={reqThanaFilter}
                              onChange={e => setReqThanaFilter(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            >
                              <option value="all">সব থানা</option>
                              {reqThanas.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          )}

                          {(reqDivisionFilter !== "all" || reqDistrictFilter !== "all" || reqThanaFilter !== "all") && (
                            <button
                              onClick={() => {
                                setReqDivisionFilter("all");
                                setReqDistrictFilter("all");
                                setReqThanaFilter("all");
                              }}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1.5"
                            >
                              ফিল্টার মুছুন
                            </button>
                          )}
                        </div>

                        {locationFilteredReqs.length > 0 && (
                          <div className="flex gap-2 mb-5">
                            <button
                              onClick={exportCSV}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              CSV ডাউনলোড করুন
                            </button>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {locationFilteredReqs.length === 0 ? (
                            <div className="text-center py-8">
                              <FileText className="h-8 w-8 mx-auto text-slate-300 mb-3 opacity-50" />
                              <p className="text-sm text-slate-500">কোনো অনুরোধ নেই</p>
                            </div>
                          ) : (
                            locationFilteredReqs.map(r => {
                              const s = requestStatusOptions.find(o => o.value === r.status) || requestStatusOptions[0];
                              return (
                                <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" />
                                        {r.customer_name}
                                      </p>
                                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                        {r.customer_phone}
                                      </p>
                                    </div>
                                    <select
                                      value={r.status}
                                      onChange={e => updateRequestStatus(r.id, e.target.value)}
                                      disabled={updatingId === r.id}
                                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${s.className} disabled:opacity-50 shrink-0`}
                                    >
                                      {requestStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  </div>

                                  <p className="text-xs text-slate-700 flex items-start gap-2 pt-1">
                                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    {r.service_description}
                                  </p>

                                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200">
                                      {r.division}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                                      {r.district}
                                    </span>
                                    {r.thana && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 border border-purple-200">
                                        {r.thana}
                                      </span>
                                    )}
                                  </div>

                                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(r.created_at).toLocaleDateString("bn-BD")}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              );

              if (activeTab === "service-messages") return (
                <div className="p-6">
                  <ServiceStaffChatInbox />
                </div>
              );

              if (activeTab === "lab-tests") return (
                <div className="p-6 space-y-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    মোট ল্যাব টেস্ট: {labTests.length}
                  </p>
                  {labTests.length === 0 ? (
                    <div className="py-12 text-center">
                      <FlaskConical className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm text-slate-500">কোনো ল্যাব টেস্ট রেকর্ড নেই</p>
                    </div>
                  ) : (
                    labTests.map((t: any) => {
                      const labStatusMap: Record<string, { label: string; className: string }> = {
                        collected: { label: "নমুনা সংগৃহীত", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                        processing: { label: "প্রক্রিয়াধীন", className: "bg-purple-50 text-purple-700 border border-purple-200" },
                        completed: { label: "সম্পন্ন", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                      };
                      const s = labStatusMap[t.status] || labStatusMap.collected;
                      return (
                        <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{t.test_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">ট্র্যাকিং: {t.tracking_id}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 ${s.className}`}>
                              {s.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                            <span>রোগী: {t.customer_name || "—"}</span>
                            <span>ফোন: {t.customer_phone || "—"}</span>
                            <span>নমুনা তারিখ: {new Date(t.sample_date).toLocaleDateString("bn-BD")}</span>
                            <span>{t.report_ready ? "রিপোর্ট প্রস্তুত" : "রিপোর্ট অপেক্ষমাণ"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );

              if (activeTab === "mart-orders") return (
                <div className="p-6">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-1">মার্ট অর্ডার ম্যানেজমেন্ট</h3>
                    <p className="text-sm text-slate-600 mb-5">গ্রাহক সহায়তা এবং অর্ডার ট্র্যাকিং সহায়তা</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/mart/cs")}>
                      মার্ট ড্যাশবোর্ডে যান
                    </Button>
                  </div>
                </div>
              );

              if (activeTab === "accounts") return activeUserId ? (
                <div className="p-6">
                  <AccountsSection userId={String(activeUserId)} role="call_center" />
                </div>
              ) : null;

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
