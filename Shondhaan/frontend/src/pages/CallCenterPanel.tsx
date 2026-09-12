import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Search, User, Phone, MapPin, Calendar, Clock,
  Plus, RefreshCw, FileText, ClipboardList, Headphones, Loader2,
  Zap, Download, Wallet, MessageSquare, FlaskConical, ShoppingCart,
  AlertCircle, CheckCircle, Circle, Briefcase, IdCard, Send, Camera, X,
  type LucideIcon,
  UserRound,
  UserPlus,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { toast } from "sonner";
import Swal from "sweetalert2";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import ServiceStaffChatInbox from "@/components/admin/ServiceStaffChatInbox";
import ServiceAreaLocationSelector, { type ServiceAreaLocation } from "@/components/call-center/ServiceAreaLocationSelector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import CategoryFilterDropdown, { useServiceCategoryMap } from "@/components/CategoryFilterDropdown";
import { useCmsCategories } from "@/hooks/useCmsData";
import { useForm } from "react-hook-form";
import { CENTRAL_API_BASE_URL, INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
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
  shondhaan_id?: string | null;
  profile_image?: string | null;
  name?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  provider_district?: string | null;
  raw_provider_district?: string | null;
  thana?: string[] | null;
  area?: string | null;
  services?: string[] | null;
    service_names?: string[] | null;
  service_category?: string | null;
  experience_years?: number | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  status?: string | null;
  status_reason?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  total_jobs?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  { value: "pending", labelBn: "অপেক্ষমাণ", labelEn: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "confirmed", labelBn: "নিশ্চিত", labelEn: "Confirmed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "assigned", labelBn: "অ্যাসাইনড", labelEn: "Assigned", className: "bg-purple-50 text-purple-700 border border-purple-200" },
  { value: "completed", labelBn: "সম্পন্ন", labelEn: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { value: "cancelled", labelBn: "বাতিল", labelEn: "Cancelled", className: "bg-slate-100 text-slate-700 border border-slate-200" },
];

const requestStatusOptions = [
  { value: "pending", labelBn: "অপেক্ষমাণ", labelEn: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "contacted", labelBn: "যোগাযোগ হয়েছে", labelEn: "Contacted", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "resolved", labelBn: "সমাধান হয়েছে", labelEn: "Resolved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { value: "rejected", labelBn: "বাতিল", labelEn: "Rejected", className: "bg-slate-100 text-slate-700 border border-slate-200" },
];

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");
const CENTRAL_API_URL = CENTRAL_API_BASE_URL.replace(/\/+$/, "");

const getProviderAssetUrl = (value?: string | null) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

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
  if (data && typeof data === "object") {
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

type ProviderFormValues = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  service_category: string[];
  experience_years: number;
};

const NidUpload = ({
  label,
  file,
  onFileChange,
  preview,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  preview: string | null;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30"
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Camera className="h-4 w-4" />
            <span className="text-xs">{bn ? "ছবি আপলোড করুন" : "Upload image"}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      {file && <span className="max-w-full truncate text-[10px] text-muted-foreground">{file.name}</span>}
    </div>
  );
};

const SectionHeading = ({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-3.5 w-3.5" />
    </div>
    <h2 className="text-sm font-semibold text-foreground tracking-wide">{children}</h2>
  </div>
);

const CallCenterPanel = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const mysqlAuth = getMySqlAuth();
  const mysqlUser = mysqlAuth?.user;
  const activeUserId = mysqlUser?.id;
  const [isCallCenter, setIsCallCenter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [allProvidersPage, setAllProvidersPage] = useState(1);
  const [allProvidersLoading, setAllProvidersLoading] = useState(false);
  const [allProvidersSearch, setAllProvidersSearch] = useState("");
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reqStatusFilter, setReqStatusFilter] = useState("all");
  const { data: serviceCategoryMap } = useServiceCategoryMap();
  const { data: serviceCategories = [], isLoading: categoriesLoading, isError: categoriesError } = useCmsCategories();
  const form = useForm<ProviderFormValues>({
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      service_category: [],
      experience_years: 0,
    },
  });
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [serviceArea, setServiceArea] = useState<ServiceAreaLocation>({
    division: "",
    district: "",
    thana: [],
    area: "",
  });

  const handleFileChange = (side: "front" | "back") => (file: File | null) => {
    const preview = file ? URL.createObjectURL(file) : null;
    if (side === "front") {
      setNidFront(file);
      setFrontPreview(preview);
    } else {
      setNidBack(file);
      setBackPreview(preview);
    }
  };

  const resetProviderForm = () => {
    setEditingProvider(null);
    form.reset({ full_name: "", phone: "", email: "", address: "", service_category: [], experience_years: 0 });
    setNidFront(null);
    setNidBack(null);
    setFrontPreview(null);
    setBackPreview(null);
    setServiceArea({ division: "", district: "", thana: [], area: "" });
  };

  const openProviderEditor = (provider: Provider, setActiveTab: (tab: string) => void) => {
    const serviceIds = Array.isArray(provider.services) && provider.services.length
      ? provider.services.map(String)
      : provider.service_category ? [String(provider.service_category)] : [];
    setEditingProvider(provider);
    form.reset({
      full_name: provider.full_name || provider.name || "",
      phone: provider.phone || "",
      email: provider.email || "",
      address: provider.address || "",
      service_category: serviceIds,
      experience_years: Number(provider.experience_years || 0),
    });
    setNidFront(null);
    setNidBack(null);
    setFrontPreview(getProviderAssetUrl(provider.nid_front_url));
    setBackPreview(getProviderAssetUrl(provider.nid_back_url));
    setServiceArea({
      division: provider.division || "",
      district: provider.district || provider.provider_district || "",
      thana: provider.thana || [],
      area: provider.area || "",
    });
    setActiveTab("create-provider");
  };

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
  const [serviceCategorySearch, setServiceCategorySearch] = useState("");
  const [showServiceCategoryDropdown, setShowServiceCategoryDropdown] = useState(false);
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
        fetchOptionalArray<ServiceRequest>(`${API_BASE_URL}/api/service-requests`),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/lab-test-reports`),
      ]);
      setBookings((bookingRows || []) as Booking[]);
      setRequests(requestRows || []);
      setLabTests(labRows || []);
    } catch (error: any) {
      console.error("Call center data load error:", error);
      toast.error(error?.message || (bn ? "কল সেন্টারের তথ্য লোড করা যায়নি" : "Failed to load call center data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServicesAndPackages = useCallback(async () => {
    try {
      const [servicesRes, packagesRes] = await Promise.all([
        fetchOptionalArray<any>(`${API_BASE_URL}/api/services`),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/packages`),
      ]);
      setServices(servicesRes);
      setPackages(packagesRes);
    } catch (error) {
      console.error("Failed to fetch services/packages", error);
    }
  }, []);

  const loadAllProviders = useCallback(async () => {
    setAllProvidersLoading(true);
    try {
      const search = allProvidersSearch.trim();
      const usersResponse = await fetch(
        `${CENTRAL_API_URL}/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        { headers: getAuthHeaders(), credentials: "include" }
      );
      const usersPayload = await usersResponse.json().catch(() => ({}));
      const matchingUsers = extractArray<any>(usersPayload);
      const matchingUserIds = matchingUsers.map((user) => String(user.id)).filter(Boolean);
      const providerParams = new URLSearchParams({ status: "all" });
      if (search) providerParams.set("search", search);
      if (matchingUserIds.length) providerParams.set("user_ids", matchingUserIds.join(","));

      const response = await fetch(`${API_BASE_URL}/api/providers?${providerParams.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to fetch all providers");
      }

      const userMap = new Map(
        extractArray<any>(usersPayload).map((user) => [String(user.id), user])
      );
      const parseThana = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.map(String).filter(Boolean);
        if (!value) return [];
        try {
          const parsed = JSON.parse(String(value));
          return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [String(parsed)];
        } catch {
          return String(value).split(",").map((item) => item.trim()).filter(Boolean);
        }
      };
      setAllProviders(extractArray<Provider>(payload).map((provider: any) => ({
        ...provider,
        provider_district: provider.raw_provider_district ?? provider.provider_district ?? provider.district ?? provider.location_district ?? "",
        district: provider.raw_provider_district ?? provider.provider_district ?? provider.district ?? provider.location_district ?? "",
        thana: parseThana(provider.thana ?? provider.thanas ?? provider.location_thana),
        area: provider.area ?? provider.detail_area ?? provider.location_area ?? "",
        shondhaan_id: userMap.get(String(provider.user_id))?.shondhaan_id || null,
        profile_image: userMap.get(String(provider.user_id))?.profile_image || provider.image_url || null,
      })));
      setAllProvidersPage(1);
    } catch (error: any) {
      console.error("Failed to fetch all providers list:", error);
      toast.error(error?.message || (bn ? "প্রোভাইডার তালিকা লোড করা যায়নি" : "Failed to load provider directory"));
      setAllProviders([]);
    } finally {
      setAllProvidersLoading(false);
    }
  }, [allProvidersSearch]);

  useEffect(() => {
    if (!isCallCenter) return;
    const timer = window.setTimeout(() => {
      loadAllProviders();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [allProvidersSearch, isCallCenter, loadAllProviders]);

  useEffect(() => {
    checkRole();
  }, [checkRole]);
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
        credentials: "include",
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
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (error: any) {
      toast.error(error?.message || (bn ? "বুকিং স্ট্যাটাস আপডেট ব্যর্থ হয়েছে" : "Booking status update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignProvider = async (id: string, providerId: string) => {
    setUpdatingId(id);
    try {
      const updated = await assignBookingProvider(id, providerId || null);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      toast.success(providerId ? (bn ? "প্রোভাইডার নির্ধারণ করা হয়েছে" : "Provider assigned") : (bn ? "প্রোভাইডার সরানো হয়েছে" : "Provider removed"));
    } catch (error: any) {
      toast.error(error?.message || (bn ? "প্রোভাইডার নির্ধারণ ব্যর্থ হয়েছে" : "Provider assign failed"));
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
        throw new Error(bn ? "অনুরোধের স্ট্যাটাস আপডেট ব্যর্থ হয়েছে" : "Request status update failed");
      }
      setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status } : request)));
    } catch (error: any) {
      toast.error(error?.message || (bn ? "অনুরোধের স্ট্যাটাস আপডেট ব্যর্থ হয়েছে" : "Request status update failed"));
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
          sendPasswordInEmail: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || (bn ? "OTP পাঠাতে ব্যর্থ" : "Failed to send OTP"));
      }

      toast.success(bn ? "OTP এবং পাসওয়ার্ড পাঠানো হয়েছে। গ্রাহকের ইমেইল চেক করুন।" : "OTP and password sent. Please check the customer's email.");
      setRegisterStep("otp");
    } catch (error: any) {
      console.error("[handleRequestOtp] Error:", error);
      toast.error(error?.message || (bn ? "OTP পাঠাতে ব্যর্থ" : "Failed to send OTP"));
    } finally {
      setRegistering(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length !== 6) {
      toast.error(bn ? "৬ সংখ্যার OTP দিন" : "Enter the 6-digit OTP");
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
        throw new Error(data?.message || (bn ? "ভুল OTP" : "Invalid OTP"));
      }

      const createdUser = data.user;
      if (!createdUser || !createdUser.id) {
        throw new Error(bn ? "ব্যবহারকারী যাচাই হয়েছে, কিন্তু আইডি পাওয়া যায়নি।" : "User verified, but failed to get User ID.");
      }

      setNewBooking((prev) => ({
        ...prev,
        user_id: String(createdUser.id),
        customer_name: createdUser.name || newUser.name,
        customer_phone: createdUser.mobile || newUser.phone,
        customer_address: createdUser.address || newUser.address,
      }));

      toast.success(bn ? "গ্রাহক সফলভাবে ভেরিফাই হয়েছে" : "Customer verified successfully");
      setShowRegisterUser(false);
      setRegisterStep("details");
      setOtpInput("");
      setNewUser({ name: "", phone: "", email: "", address: "", password: "CallCenter123@" });
    } catch (error: any) {
      console.error("[handleVerifyOtp] Error:", error);
      toast.error(error?.message || (bn ? "OTP যাচাই ব্যর্থ" : "OTP verification failed"));
    } finally {
      setRegistering(false);
    }
  };

  const handleCreateProvider = async (
    values: ProviderFormValues,
    setActiveTab: (tab: string) => void,
  ) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      const userResponse = await fetch(`${CENTRAL_API_URL}/api/admin/users/provider`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: values.full_name.trim() || "Provider",
          mobile: values.phone.trim() || `provider${Date.now()}`,
          address: values.address.trim() || null,
          email,
          password: "shondhaan134",
          type: "provider",
        }),
      });
      const userPayload = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok || !userPayload?.user?.id) {
        throw new Error(userPayload?.message || "Provider user could not be created");
      }

      const providerFormData = new FormData();
      providerFormData.append("user_id", String(userPayload.user.id));
      providerFormData.append("full_name", values.full_name.trim());
      providerFormData.append("phone", values.phone.trim());
      providerFormData.append("email", userPayload.user.email || email);
      providerFormData.append("address", values.address.trim());
      providerFormData.append("service_category", values.service_category[0] || "");
      providerFormData.append("services", JSON.stringify(values.service_category));
      providerFormData.append("experience_years", String(values.experience_years || 0));
      providerFormData.append("division", serviceArea.division);
      providerFormData.append("district", serviceArea.district);
      providerFormData.append("thana", JSON.stringify(serviceArea.thana));
      providerFormData.append("area", serviceArea.area);
      if (nidFront) providerFormData.append("nid_front", nidFront);
      if (nidBack) providerFormData.append("nid_back", nidBack);

      const providerResponse = await fetch(`${API_BASE_URL}/api/providers/call-center`, {
        method: "POST",
        headers: mysqlAuth?.token
          ? { Authorization: `Bearer ${mysqlAuth.token}` }
          : {},
        credentials: "include",
        body: providerFormData,
      });
      const providerPayload = await providerResponse.json().catch(() => ({}));
      if (!providerResponse.ok) {
        throw new Error(providerPayload?.message || "Provider record could not be created");
      }

      await Swal.fire({
        icon: "success",
        title: bn ? "সফলভাবে তৈরি হয়েছে" : "Created Successfully",
        text: bn ? "প্রোভাইডার সফলভাবে রেজিস্টার হয়েছে।" : "Provider registered successfully.",
        confirmButtonText: bn ? "ঠিক আছে" : "OK",
      });
      form.reset();
      setNidFront(null);
      setNidBack(null);
      setFrontPreview(null);
      setBackPreview(null);
      setServiceArea({ division: "", district: "", thana: [], area: "" });
      await loadAllProviders();
      setActiveTab("all-providers");
    } catch (error: any) {
      console.error("Create provider error:", error);
      toast.error(error?.message || (bn ? "প্রোভাইডার তৈরি করা যায়নি" : "Provider could not be created"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProvider = async (
    values: ProviderFormValues,
    setActiveTab: (tab: string) => void,
  ) => {
    if (!editingProvider) return;
    setSubmitting(true);
    try {
      const providerFormData = new FormData();
      providerFormData.append("full_name", values.full_name.trim());
      providerFormData.append("phone", values.phone.trim());
      providerFormData.append("email", values.email.trim());
      providerFormData.append("address", values.address.trim());
      providerFormData.append("service_category", values.service_category[0] || "");
      providerFormData.append("services", JSON.stringify(values.service_category));
      providerFormData.append("experience_years", String(values.experience_years || 0));
      providerFormData.append("division", serviceArea.division);
      providerFormData.append("district", serviceArea.district);
      providerFormData.append("thana", JSON.stringify(serviceArea.thana));
      providerFormData.append("area", serviceArea.area);
      if (nidFront) providerFormData.append("nid_front", nidFront);
      if (nidBack) providerFormData.append("nid_back", nidBack);

      const response = await fetch(`${API_BASE_URL}/api/providers/call-center/${editingProvider.id}`, {
        method: "PATCH",
        headers: mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {},
        credentials: "include",
        body: providerFormData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Provider could not be updated");

      await Swal.fire({
        icon: "success",
        title: bn ? "সফলভাবে আপডেট হয়েছে" : "Provider updated",
        text: bn ? "প্রোভাইডারের তথ্য সফলভাবে আপডেট হয়েছে।" : "Provider information was updated successfully.",
        confirmButtonText: bn ? "ঠিক আছে" : "OK",
      });
      resetProviderForm();
      await loadAllProviders();
      setActiveTab("all-providers");
    } catch (error: any) {
      console.error("Update provider error:", error);
      toast.error(error?.message || (bn ? "প্রোভাইডার আপডেট করা যায়নি" : "Provider could not be updated"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.service_title || !newBooking.customer_name || !newBooking.customer_phone || !newBooking.booking_date || !newBooking.booking_time) {
      toast.error(bn ? "সব তথ্য পূরণ করুন" : "Please complete all required fields");
      return;
    }
    if (!newBooking.user_id) {
      toast.error(bn ? "কাস্টমার সিলেক্ট করুন" : "Select a customer");
      return;
    }

    if (!activeUserId) {
      toast.error(bn ? "অপারেটর আইডি পাওয়া যায়নি, আবার লগইন করুন" : "Operator ID not found. Please log in again.");
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
      toast.error(error?.message || (bn ? "বুকিং তৈরি ব্যর্থ হয়েছে" : "Booking create failed"));
      return;
    }
    setSubmitting(false);
    toast.success(bn ? "বুকিং তৈরি হয়েছে" : "Booking created successfully");
    setShowNewBooking(false);
    setNewBooking({
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
    setServiceSearch("");
    setPackageSearch("");
    fetchData();
  };
  

  const statusFilteredBookings = filterStatus === "all"
    ? bookings
    : filterStatus === "emergency"
      ? bookings.filter((b) => b.is_emergency || b.note === "Emergency booking")
      : bookings.filter((b) => b.status === filterStatus);
  const filteredBookings = filterCategory === "all"
    ? statusFilteredBookings
    : statusFilteredBookings.filter((b) => serviceCategoryMap?.get(b.service_slug) === filterCategory);

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Filtered requests
  const filteredRequests = reqStatusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === reqStatusFilter);

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
          <h1 className="font-semibold text-lg text-slate-900 mb-2">{bn ? "অ্যাক্সেস সীমিত" : "Access Restricted"}</h1>
          <p className="text-slate-600 text-sm mb-6 text-center max-w-xs">{bn ? "এই বৈশিষ্ট্য শুধুমাত্র কল সেন্টার অপারেটরদের জন্য উপলব্ধ।" : "This feature is available only to call center operators."}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {bn ? "হোমপেজে ফিরুন" : "Return Home"}
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
              { value: "search", label: bn ? "কাস্টমার সার্চ" : "Customer Search", icon: <Search className="h-4 w-4" />, group: bn ? "সার্চ" : "Search" },
              { value: "new-booking", label: bn ? "নতুন সার্ভিস বুকিং" : "New Service Booking", icon: <Plus className="h-4 w-4" /> },
              { value: "create-provider", label: bn ? "প্রোভাইডার রেজিস্ট্রেশন" : "Provider Registration", icon: <UserPlus className="h-4 w-4" /> },
              { value: "all-providers", label: bn ? "সকল প্রোভাইডার" : "All Providers", icon: <Users className="h-4 w-4" /> },
              { value: "bookings", label: bn ? "সকল বুকিং" : "All Bookings", icon: <ClipboardList className="h-4 w-4" />, group: bn ? "ম্যানেজমেন্ট" : "Management" },
              { value: "requests", label: bn ? "সার্ভিস রিকোয়েস্ট" : "Service Requests", icon: <FileText className="h-4 w-4" /> },
              { value: "service-messages", label: bn ? "কাস্টমার মেসেজ" : "Messages", icon: <MessageSquare className="h-4 w-4" /> },
            ]}
            defaultValue="search"
      
          >
            {(activeTab, setActiveTab) => {
              /* ─────────────────────────────────────────────
                 TAB: SEARCH
              ───────────────────────────────────────────── */
              if (activeTab === "search")
                return (
                  <div className="p-6 space-y-5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={bn ? "ফোন নম্বর বা নাম দিয়ে অনুসন্ধান করুন..." : "Search by phone number or name..."}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
                        />
                        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                      </div>
                      <button
                        onClick={searchCustomer}
                        disabled={searching}
                        className="px-4 py-2 bg-userprimaryshade text-userprimary border border-userprimary text-sm font-medium rounded-lg hover:bg-userprimary hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {bn ? "সার্চ করুন" : "Search"}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 font-medium">{searchResults.length} {bn ? "টি ফলাফল পাওয়া গেছে" : "results found"}</p>
                        {searchResults.map((p) => {
                          const customerBookings = bookings.filter((b) => b.user_id === p.user_id);
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
                                  <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">{bn ? "বুকিং" : "Bookings"} ({customerBookings.length})</p>
                                  {customerBookings.slice(0, 3).map((b) => {
                                    const s = bookingStatusOptions.find((o) => o.value === b.status) || bookingStatusOptions[0];
                                    return (
                                      <div key={b.id} className="flex items-center justify-between text-xs gap-2">
                                        <span className="text-slate-700 truncate">{b.service_title} — {b.package_name}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${s.className}`}>{bn ? s.labelBn : s.labelEn}</span>
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
                        <p className="text-sm text-slate-500">{bn ? "কোনো গ্রাহক পাওয়া যায়নি" : "No customer found"}</p>
                      </div>
                    )}
                  </div>
                );

              /* ─────────────────────────────────────────────
                 TAB: BOOKINGS
              ───────────────────────────────────────────── */
              if (activeTab === "bookings")
                return (
                  <div className="p-6">
                    {bookings.filter((b) => b.is_emergency).length > 0 && (
                      <button
                        onClick={() => setFilterStatus(filterStatus === "emergency" ? "all" : "emergency")}
                        className={`mb-5 w-full flex items-center gap-3 rounded-lg border p-4 transition-all ${
                          filterStatus === "emergency" ? "border-red-300 bg-red-50 ring-1 ring-red-200" : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-bold text-slate-900">{bookings.filter((b) => b.is_emergency).length}</p>
                          <p className="text-xs font-medium text-red-600">{bn ? "জরুরী বুকিং" : "Emergency Booking"}</p>
                        </div>
                      </button>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
                      {bookingStatusOptions.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                          className={`rounded-lg border p-3 text-left transition-all ${filterStatus === s.value ? `${s.className} ring-2 ring-offset-1` : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <p className="text-lg font-semibold text-slate-900">{bookings.filter((b) => b.status === s.value).length}</p>
                          <p className={`mt-1 text-[11px] font-medium ${s.className.includes("bg-") ? s.className : "text-slate-600"}`}>{bn ? s.labelBn : s.labelEn}</p>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <CategoryFilterDropdown value={filterCategory} onChange={setFilterCategory} />
                      {(filterStatus !== "all" || filterCategory !== "all") && (
                        <button
                          onClick={() => {
                            setFilterStatus("all");
                            setFilterCategory("all");
                          }}
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
                          <p className="text-sm text-slate-500">{bn ? "কোনো বুকিং নেই" : "No bookings found"}</p>
                        </div>
                      ) : (
                        sortedBookings.map((b, i) => {
                          const s = bookingStatusOptions.find((o) => o.value === b.status) || bookingStatusOptions[0];
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
                                  onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                                  disabled={updatingId === b.id}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${s.className} disabled:opacity-50 shrink-0`}
                                >
                                  {bookingStatusOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {bn ? o.labelBn : o.labelEn}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <select
                                value={b.provider_id ? String(b.provider_id) : ""}
                                onChange={(e) => handleAssignProvider(b.id, e.target.value)}
                                disabled={updatingId === b.id}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 transition-all"
                              >
                                <option value="">{bn ? "সার্ভিস প্রদানকারী নির্ধারণ করুন" : "Assign a service provider"}</option>
                                {providers.map((provider) => (
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

              /* ─────────────────────────────────────────────
                 TAB: NEW BOOKING
              ───────────────────────────────────────────── */
              if (activeTab === "new-booking")
                return (
                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-slate-900 mb-5">{bn ? "নতুন বুকিং তৈরি করুন" : "Create New Booking"}</h3>

                    {/* Step 1: Customer Selection / Registration */}
                    <div className="mb-5 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{bn ? "ধাপ ১: গ্রাহক নির্বাচন করুন" : "Step 1: Select Customer"}</p>
                        {!newBooking.user_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowRegisterUser(!showRegisterUser);
                              setRegisterStep("details");
                            }}
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
                              placeholder={bn ? "ফোন বা নাম দিয়ে সার্চ করুন..." : "Search by phone or name..."}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                            />
                            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                          </div>

                          {searchResults.length > 0 && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {searchResults.map((p) => (
                                <button
                                  key={p.user_id}
                                  type="button"
                                  onClick={() => {
                                    setNewBooking((prev) => ({
                                      ...prev,
                                      user_id: p.user_id,
                                      customer_name: p.display_name || "",
                                      customer_phone: p.phone || "",
                                      customer_address: p.address || "",
                                    }));
                                    setSearchQuery("");
                                    setSearchResults([]);
      toast.success(bn ? `${p.display_name} নির্বাচিত হয়েছে` : `${p.display_name} selected`);
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
                              কোনো গ্রাহক পাওয়া যায়নি।{" "}
                              <button onClick={() => setShowRegisterUser(true)} className="text-blue-600 font-medium">
                                নতুন গ্রাহক রেজিস্টার করুন
                              </button>
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          {registerStep === "details" ? (
                            <>
                              <input
                                type="text"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder={bn ? "গ্রাহকের নাম" : "Customer name"}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                              />
                              <input
                                type="tel"
                                value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                placeholder={bn ? "ফোন নম্বর" : "Phone number"}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                              />
                              <input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder={bn ? "ইমেইল (OTP এখানে যাবে)" : "Email (OTP will be sent here)"}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                              />
                              <input
                                type="text"
                                value={newUser.address}
                                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                                placeholder={bn ? "ঠিকানা" : "Address"}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                              />
                              <input
                                type="text"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder={bn ? "পাসওয়ার্ড" : "Password"}
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
                                    {bn ? "OTP পাঠানো হচ্ছে..." : "Sending OTP..."}
                                  </>
                                ) : (
                                  bn ? "OTP এবং পাসওয়ার্ড পাঠান" : "Send OTP and Password"
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-slate-600 text-center mb-1">
                                {bn ? <><span className="font-medium">{newUser.email}</span>-এ OTP পাঠানো হয়েছে</> : <>OTP sent to <span className="font-medium">{newUser.email}</span></>}
                              </p>
                              <input
                                type="text"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder={bn ? "৬ সংখ্যার OTP দিন" : "Enter 6-digit OTP"}
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
                                    {bn ? "যাচাই হচ্ছে..." : "Verifying..."}
                                  </>
                                ) : (
                                  bn ? "ভেরিফাই এবং সিলেক্ট করুন" : "Verify and Select"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRegisterStep("details")}
                                className="w-full text-xs text-slate-500 hover:text-slate-700 pt-1"
                              >
                                {bn ? "← বিস্তারিত পরিবর্তন করুন" : "← Edit Details"}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {newBooking.user_id && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mt-2">
                          <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4" />
                            {bn ? "গ্রাহক নির্বাচিত" : "Customer selected"}: {newBooking.customer_name}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewBooking((prev) => ({ ...prev, user_id: "", customer_name: "", customer_phone: "", customer_address: "" }));
                              setShowRegisterUser(false);
                            }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            {bn ? "পরিবর্তন করুন" : "Change"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Booking Details Form */}
                    <form onSubmit={handleCreateBooking} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={newBooking.customer_name}
                          onChange={(e) => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                          placeholder={bn ? "গ্রাহকের নাম" : "Customer name"}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        />
                        <input
                          value={newBooking.customer_phone}
                          onChange={(e) => setNewBooking({ ...newBooking, customer_phone: e.target.value })}
                          placeholder={bn ? "ফোন নম্বর" : "Phone number"}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        />

                        {/* Service Searchable Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder={bn ? "সার্ভিস সার্চ করুন..." : "Search services..."}
                            value={newBooking.service_id ? newBooking.service_title : serviceSearch}
                            onChange={(e) => {
                              setServiceSearch(e.target.value);
                              setShowServiceDropdown(true);
                              if (newBooking.service_id) {
                                setNewBooking((prev) => ({ ...prev, service_id: "", service_title: "", service_slug: "", package_id: "", package_name: "", package_price: 0 }));
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
                                .filter((s) => (s.title || s.name || "").toLowerCase().includes(serviceSearch.toLowerCase()))
                                .map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setNewBooking((prev) => ({
                                        ...prev,
                                        service_id: s.id,
                                        service_title: s.title || s.name || "",
                                        service_slug: s.slug || "",
                                        package_id: "",
                                        package_name: "",
                                        package_price: 0,
                                      }));
                                      setFilteredPackages(packages.filter((p) => p.service_id === s.id || p.service_slug === s.slug));
                                      setServiceSearch("");
                                      setShowServiceDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    {s.title || s.name}
                                  </button>
                                ))}
                              {services.filter((s) => (s.title || s.name || "").toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                <p className="px-3 py-2 text-xs text-slate-500">{bn ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services found"}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Package Searchable Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder={newBooking.service_id ? (bn ? "প্যাকেজ সার্চ করুন..." : "Search packages...") : (bn ? "প্রথমে সার্ভিস নির্বাচন করুন" : "Select a service first")}
                            disabled={!newBooking.service_id}
                            value={newBooking.package_id ? `${newBooking.package_name} - ৳${newBooking.package_price}` : packageSearch}
                            onChange={(e) => {
                              setPackageSearch(e.target.value);
                              setShowPackageDropdown(true);
                              if (newBooking.package_id) {
                                setNewBooking((prev) => ({ ...prev, package_id: "", package_name: "", package_price: 0 }));
                              }
                            }}
                            onFocus={() => newBooking.service_id && setShowPackageDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPackageDropdown(false), 200)}
                            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 disabled:bg-slate-50 transition-all"
                          />
                          {showPackageDropdown && newBooking.service_id && (
                            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                              {filteredPackages
                                .filter((p) => (p.name || p.title || "").toLowerCase().includes(packageSearch.toLowerCase()))
                                .map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setNewBooking((prev) => ({
                                        ...prev,
                                        package_id: p.id,
                                        package_name: p.name || p.title || "",
                                        package_price: Number(p.price || p.amount || 0),
                                      }));
                                      setPackageSearch("");
                                      setShowPackageDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    {p.name || p.title} — ৳{p.price || p.amount || 0}
                                  </button>
                                ))}
                              {filteredPackages.filter((p) => (p.name || p.title || "").toLowerCase().includes(packageSearch.toLowerCase())).length === 0 && (
                                <p className="px-3 py-2 text-xs text-slate-500">{bn ? "কোনো প্যাকেজ পাওয়া যায়নি" : "No packages found"}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <input
                          type="date"
                          value={newBooking.booking_date}
                          onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        />
                        <input
                          type="time"
                          value={newBooking.booking_time}
                          onChange={(e) => setNewBooking({ ...newBooking, booking_time: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        />
                      </div>

                      <input
                        value={newBooking.customer_address}
                        onChange={(e) => setNewBooking({ ...newBooking, customer_address: e.target.value })}
                        placeholder={bn ? "ঠিকানা" : "Address"}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newBooking.is_emergency}
                          onChange={(e) => setNewBooking({ ...newBooking, is_emergency: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-red-600 font-medium">{bn ? "জরুরী বুকিং" : "Emergency Booking"}</span>
                      </label>

                      <button
                        type="submit"
                        disabled={submitting || !newBooking.user_id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            তৈরি হচ্ছে...
                          </>
                        ) : (
                          bn ? "বুকিং তৈরি করুন" : "Create Booking"
                        )}
                      </button>
                    </form>
                  </div>
                );

                /* ─────────────────────────────────────────────
                 TAB: NEW PROVIDER REGISTRATOIN
              ───────────────────────────────────────────── */
              if (activeTab === "create-provider")
                return (
                  <div className="p-6 bg-background">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900 mb-5 flex gap-2"><UserPlus className="h-5 w-5 text-userprimary my-auto"/> {editingProvider ? (bn ? "প্রোভাইডার তথ্য সম্পাদনা" : "Edit Provider") : (bn ? "নতুন প্রোভাইডার রেজিস্ট্রেশন করুন" : "New Provider Registration")}</h3>
                      <button
                        type="button"
                        onClick={() => { resetProviderForm(); setActiveTab("all-providers"); }}
                        className="w-auto group flex items-center justify-center gap-2 px-3 py-1 bg-userprimaryshade text-foreground text-sm font-medium rounded-full hover:bg-userprimary hover:text-white border border-userprimary disabled:opacity-50 transition-colors"
                        >
                        <Users className="h-4 w-4 group-hover:text-white text-userprimary my-auto"/>
                        {bn ? "সকল প্রোভাইডার" : "All Providers"}
                      </button>
                    </div>
                    <div className="w-full py-8 md:py-2 mb-8">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 md:p-8"
                        >
                        <Form {...form}>
                          <form className="space-y-6" onSubmit={form.handleSubmit((values) => editingProvider ? handleUpdateProvider(values, setActiveTab) : handleCreateProvider(values, setActiveTab))}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                              {/* Left column: personal + work info */}
                              <div className="space-y-8">
                                <div>
                                  <SectionHeading icon={UserRound}>
                                    {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
                                  </SectionHeading>

                                  <div className="space-y-4">
                                    <FormField
                                      control={form.control}
                                      name="full_name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "পুরো নাম" : "Full Name"} *</FormLabel>
                                          <FormControl>
                                            <Input placeholder={bn ? "পুরো নাম" : "Full name"} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="phone"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "ফোন নম্বর" : "Phone"} *</FormLabel>
                                          <FormControl>
                                            <Input placeholder="01XXXXXXXXX" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="email"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "ইমেইল (অপশনাল)" : "Email (optional)"}</FormLabel>
                                          <FormControl>
                                            <Input type="email" placeholder={bn ? "আপনার ইমেইল" : "Your email"} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="address"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "ঠিকানা" : "Address"} *</FormLabel>
                                          <FormControl>
                                            <Textarea rows={2} placeholder={bn ? "আপনার বর্তমান ঠিকানা" : "Your current address"} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>

                                <div className="pt-6 border-t border-border/60">
                                  <SectionHeading icon={Briefcase}>
                                    {bn ? "কাজের তথ্য" : "Work Information"}
                                  </SectionHeading>

                                  <div className="space-y-4">
                                    <FormField
                                      control={form.control}
                                      name="service_category"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "সার্ভিস ক্যাটেগরি" : "Service Categories"}</FormLabel>
                                          <div className="relative">
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              onClick={() => setShowServiceCategoryDropdown((open) => !open)}
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                  event.preventDefault();
                                                  setShowServiceCategoryDropdown((open) => !open);
                                                }
                                              }}
                                              className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-left"
                                            >
                                              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                                                {field.value.map((categoryId) => {
                                                  const category = serviceCategories.find((item) => item.id === categoryId);
                                                  if (!category) return null;
                                                  return (
                                                    <span key={category.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                                      {bn ? category.name : category.name_en || category.name}
                                                      <button
                                                        type="button"
                                                        aria-label={`Remove ${category.name}`}
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                          field.onChange(field.value.filter((id) => id !== category.id));
                                                        }}
                                                        className="rounded-full text-slate-500 hover:text-slate-900"
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </button>
                                                    </span>
                                                  );
                                                })}
                                                {!field.value.length && (
                                                  <span className="text-muted-foreground">
                                                    {bn ? "ক্যাটেগরি নির্বাচন করুন" : "Select categories"}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="shrink-0 text-muted-foreground">▾</span>
                                            </div>
                                            {showServiceCategoryDropdown && (
                                              <div className="absolute z-30 mt-1 w-full rounded-md border bg-white p-1 shadow-lg">
                                                <Input
                                                  autoFocus
                                                  value={serviceCategorySearch}
                                                  onChange={(event) => setServiceCategorySearch(event.target.value)}
                                                  onClick={(event) => event.stopPropagation()}
                                                  placeholder={bn ? "ক্যাটেগরি খুঁজুন..." : "Search categories..."}
                                                  className="mb-1 h-9"
                                                />
                                                <div className="max-h-52 overflow-y-auto">
                                                {serviceCategories
                                                  .filter((category) => category.is_active)
                                                  .filter((category) => {
                                                    const query = serviceCategorySearch.trim().toLowerCase();
                                                    return !query || category.name.toLowerCase().includes(query) || (category.name_en || "").toLowerCase().includes(query);
                                                  })
                                                  .map((category) => {
                                                  const selected = field.value.includes(category.id);
                                                  return (
                                                    <label
                                                      key={category.id}
                                                      onClick={(event) => event.stopPropagation()}
                                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-slate-50"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => field.onChange(
                                                          selected
                                                            ? field.value.filter((id) => id !== category.id)
                                                            : [...field.value, category.id]
                                                        )}
                                                        className="h-4 w-4 rounded border-slate-300"
                                                      />
                                                      <span>{bn ? category.name : category.name_en || category.name}</span>
                                                    </label>
                                                  );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          {categoriesError && <p className="text-sm font-medium text-destructive">{bn ? "ক্যাটেগরি লোড করা যায়নি" : "Could not load service categories"}</p>}
                                          {categoriesLoading && <p className="text-sm text-muted-foreground">{bn ? "ক্যাটেগরি লোড হচ্ছে..." : "Loading categories..."}</p>}
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="experience_years"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{bn ? "অভিজ্ঞতা (বছর)" : "Experience (years)"}</FormLabel>
                                          <FormControl>
                                            <Input type="number" min={0} max={50} placeholder="0" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right column: NID upload + submit, sticky on desktop */}
                              <div className="md:sticky md:top-24 md:self-start">
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5 mb-6">
                                  <ServiceAreaLocationSelector
                                    value={serviceArea}
                                    onChange={setServiceArea}
                                  />
                                  
                                </div>

                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
                                  <SectionHeading icon={IdCard}>
                                    {bn ? "জাতীয় পরিচয়পত্র (NID)" : "National ID (NID)"} {editingProvider ? "" : "*"}
                                  </SectionHeading>
                                  <div className="grid grid-cols-2 gap-3">
                                    <NidUpload
                                      label={bn ? "সামনের পাশ" : "Front Side"}
                                      file={nidFront}
                                      onFileChange={handleFileChange("front")}
                                      preview={frontPreview}
                                    />
                                    <NidUpload
                                      label={bn ? "পেছনের পাশ" : "Back Side"}
                                      file={nidBack}
                                      onFileChange={handleFileChange("back")}
                                      preview={backPreview}
                                    />
                                  </div>
                                  <p className="mt-2 text-[11px] text-muted-foreground text-center">
                                    {bn ? "সর্বোচ্চ ৫MB, JPG/PNG ফরম্যাট" : "Max 5MB, JPG/PNG format"}
                                  </p>
                                </div>

                                <Button
                                  type="submit"
                                  disabled={submitting}
                                  className="w-full gap-2 h-12 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 bg-userprimary text-white "
                                  >
                                  <Send className="h-4 w-4" />
                                  {submitting
                                    ? (editingProvider ? (bn ? "আপডেট হচ্ছে..." : "Updating...") : (bn ? "তৈরি হচ্ছে..." : "Creating..."))
                                    : (editingProvider ? (bn ? "আপডেট করুন" : "Update Provider") : (bn ? "তৈরি করুন" : "Create Provider"))}
                                </Button>

                                <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
                                  {bn
                                    ? "জমা দেওয়ার মাধ্যমে আপনি আমাদের শর্তাবলীতে সম্মত হচ্ছেন।"
                                    : "By submitting, you agree to our terms and application review process."}
                                </p>
                              </div>
                            </div>
                          </form>
                        </Form>
                      </motion.div>
                    </div>
                  </div>
                );

              /* ─────────────────────────────────────────────
                 TAB: ALL PROVIDERS
              ───────────────────────────────────────────── */
              if (activeTab === "all-providers") {
                const totalPages = Math.max(1, Math.ceil(allProviders.length / 10));
                const startIndex = (allProvidersPage - 1) * 10;
                const paginatedProviders = allProviders.slice(startIndex, startIndex + 10);
                const getCategoryName = (categoryId: string) => {
                  const category = serviceCategories.find((item) => String(item.id) === String(categoryId));
                  return category ? (bn ? category.name : category.name_en || category.name) : categoryId;
                };
                const getProfileImageUrl = (image?: string | null) => {
                  if (!image) return "";
                  return /^https?:\/\//i.test(image) ? image : `${CENTRAL_API_URL}${image.startsWith("/") ? image : `/${image}`}`;
                };

                return (
                  <div className="p-6 bg-background">
                    <div className="mb-4 w-full flex items-center justify-between gap-3">
                      <div className="w-full flex gap-3">
                        <div className="w-auto flex gap-3">
                            <Users className="my-auto text-userprimary" />
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 text-nowrap">{bn ? "সকল প্রোভাইডার" : "All Providers"}</h3>
                            <p className="text-xs text-slate-500">{allProviders.length} {bn ? "টি প্রোফাইল" : "profiles"}</p>
                          </div>
                        </div>
                        <div className="relative my-auto w-full">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={allProvidersSearch}
                            onChange={(event) => {
                              setAllProvidersSearch(event.target.value);
                              setAllProvidersPage(1);
                            }}
                            placeholder={bn ? "নাম, ফোন, ইমেইল বা Shondhaan-ID দিয়ে খুঁজুন" : "Search by name, phone, email or Shondhaan-ID"}
                            className="h-10 bg-white pl-9"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end w-full gap-2">
                        <button
                          type="button"
                          onClick={loadAllProviders}
                          disabled={allProvidersLoading}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                          <RefreshCw className={`h-3.5 w-3.5 ${allProvidersLoading ? "animate-spin" : ""}`} />
                          {bn ? "রিফ্রেশ" : "Refresh"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { resetProviderForm(); setActiveTab("create-provider"); }}
                          className="inline-flex items-center gap-2 rounded-lg border border-userprimary bg-userprimary px-3 py-2 text-xs font-medium text-white hover:bg-userprimaryshade hover:text-black disabled:opacity-50"
                          >
                          <UserPlus className={`h-3.5 w-3.5`} />
                          {bn ? "নতুন যোগ করুন" : "Add New"}
                        </button>
                      </div>
                    </div>


                    {allProvidersLoading ? (
                      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {bn ? "লোড হচ্ছে..." : "Loading..."}
                        </div>
                      </div>
                    ) : paginatedProviders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                        {bn ? "কোন প্রোভাইডার নেই" : "No providers found"}
                      </div>
                    ) : (
                      <>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-userprimaryshade text-slate-600">
                                <tr>
                                  <th className="px-4 py-3 font-bold">{bn ? "প্রোফাইল" : "Profile"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "সার্ভিস" : "Service"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "সার্ভিস এরিয়া" : "Service Area"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "অভিজ্ঞতা" : "Experience"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "এন-আই-ডি" : "NID"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "রেজিস্ট্রেশন ডেইট" : "Registration Date"}</th>
                                  <th className="px-4 py-3 font-bold">{bn ? "স্ট্যাটাস" : "Status"}</th>
                                  <th className="sticky right-0 z-10 bg-userprimaryshade px-4 py-3 font-bold">{bn ? "অ্যাকশন" : "Action"}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedProviders.map((provider) => (
                                  <tr key={provider.id || `${provider.user_id}-${provider.full_name}`} className="border-t border-slate-200 hover:bg-slate-50/80">
                                    <td className="min-w-[260px] px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        {provider.profile_image || provider.image_url ? (
                                          <img src={getProfileImageUrl(provider.profile_image || provider.image_url)} alt={provider.full_name || "Provider"} className="h-11 w-11 rounded-full object-cover" />
                                        ) : (
                                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{(provider.full_name || "P").charAt(0)}</div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="truncate font-semibold text-slate-900">{provider.full_name || provider.name || "—"}</p>
                                          <p className="truncate text-xs text-slate-500">{provider.email || "—"}</p>
                                          <p className="truncate text-xs text-slate-500">{provider.phone || "—"}</p>
                                          <p className="truncate text-xs text-userprimary">{bn ? "সন্ধান আইডি" : "Shondhaan-ID"} : {provider.shondhaan_id || "—"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="min-w-[210px] px-4 py-3"><div className="flex flex-wrap gap-1">{provider.service_names?.length ? provider.service_names.map((serviceName) => <span key={serviceName} className="rounded-full bg-userprimaryshade px-2 py-1 text-[11px] border border-userprimary font-bold text-userprimary">{serviceName}</span>) : <span>—</span>}</div></td>
                                    <td className="min-w-[190px] px-4 py-3 text-slate-700">
                                      <p className="font-medium">{provider.raw_provider_district || provider.provider_district || provider.district || "—"}</p>
                                      <div className="flex flex-wrap gap-1">{provider.thana?.length ? provider.thana.map((thana) => <span key={thana} className="text-xs text-slate-500">{thana}</span>) : <span className="text-xs text-slate-500">—</span>}</div>
                                      <p className="text-xs text-slate-500">{provider.area || "—"}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{provider.experience_years ?? 0} {bn ? "বছর" : "years"}</td>
                                   <td>
                                    <span className={`whitespace-nowrap px-3 rounded-full text-[12px] py-1 border ${
                                            provider.nid_front_url || provider.nid_back_url
                                                ? "border-userprimary bg-userprimaryshade text-userprimary font-bold"
                                                : "border-red-500 bg-red-100 text-red-700 font-medium"
                                        } text-slate-700`}>
                                        {provider.nid_front_url || provider.nid_back_url
                                            ? (bn ? "দেওয়া হয়েছে" : "Submitted")
                                            : (bn ? "দেওয়া হয়নি" : "Not submitted")}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{provider.created_at ? new Date(provider.created_at).toLocaleDateString("bn-BD") : "—"}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        provider.status === "approved"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : provider.status === "pending"
                                            ? "bg-amber-100 text-amber-700"
                                            : provider.status === "rejected"
                                              ? "bg-rose-100 text-rose-700"
                                              : "bg-slate-100 text-slate-700"
                                      }`}>
                                        {provider.status || "pending"}
                                      </span>
                                    </td>
                                    <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-6px_0_8px_-8px_rgba(15,23,42,0.45)]"><button type="button" onClick={() => openProviderEditor(provider, setActiveTab)} className="rounded-lg bg-userprimary px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800">{bn ? "ওপেন" : "Open"}</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {totalPages > 1 && (
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAllProvidersPage((page) => Math.max(1, page - 1))}
                              disabled={allProvidersPage === 1}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {bn ? "পূর্ববর্তী" : "Previous"}
                            </button>

                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setAllProvidersPage(page)}
                                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition-colors ${
                                  allProvidersPage === page
                                    ? "bg-slate-900 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {page}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => setAllProvidersPage((page) => Math.min(totalPages, page + 1))}
                              disabled={allProvidersPage === totalPages}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {bn ? "পরবর্তী" : "Next"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              }

              /* ─────────────────────────────────────────────
                 TAB: SERVICE REQUESTS
              ───────────────────────────────────────────── */
              if (activeTab === "requests")
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-semibold text-slate-900">{bn ? "সার্ভিস অনুরোধ" : "Service Requests"}</h3>
                      <button
                        onClick={fetchData}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        title={bn ? "রিফ্রেশ" : "Refresh"}
                      >
                        <RefreshCw className="h-4 w-4 text-slate-600" />
                      </button>
                    </div>

                    {/* Status Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                      <button
                        onClick={() => setReqStatusFilter("all")}
                        className={`rounded-lg border p-2.5 text-left transition-all ${reqStatusFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <p className="text-lg font-semibold">{requests.length}</p>
                        <p className="text-[11px] font-medium">{bn ? "সব" : "All"}</p>
                      </button>
                      {requestStatusOptions.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setReqStatusFilter(reqStatusFilter === s.value ? "all" : s.value)}
                          className={`rounded-lg border p-2.5 text-left transition-all ${reqStatusFilter === s.value ? `${s.className} ring-2 ring-offset-1` : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <p className="text-lg font-semibold text-slate-900">{requests.filter((r) => r.status === s.value).length}</p>
                          <p className={`mt-1 text-[11px] font-medium ${s.className.includes("bg-") ? s.className : "text-slate-600"}`}>{bn ? s.labelBn : s.labelEn}</p>
                        </button>
                      ))}
                    </div>

                    {/* Requests List */}
                    <div className="space-y-3">
                      {filteredRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500">{bn ? "কোনো সার্ভিস অনুরোধ নেই" : "No service requests found"}</p>
                        </div>
                      ) : (
                        filteredRequests.map((req, i) => {
                          const s = requestStatusOptions.find((o) => o.value === req.status) || requestStatusOptions[0];
                          return (
                            <motion.div
                              key={req.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                                    <p className="text-sm font-medium text-slate-900">{req.customer_name}</p>
                                  </div>
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {req.customer_phone}
                                  </p>
                                </div>
                                <select
                                  value={req.status}
                                  onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                                  disabled={updatingId === req.id}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${s.className} disabled:opacity-50 shrink-0`}
                                >
                                  {requestStatusOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {bn ? o.labelBn : o.labelEn}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{req.service_description}</p>
                              <div className="flex items-start gap-1.5 text-xs text-slate-500">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>
                                  {[req.district, req.thana, req.detail_area].filter(Boolean).join(", ") || "ঠিকানা নেই"}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleString("bn-BD")}</p>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );

              /* ─────────────────────────────────────────────
                 TAB: SERVICE MESSAGES (CHAT)
              ───────────────────────────────────────────── */
              if (activeTab === "service-messages") {
                return <ServiceStaffChatInbox />;
              }

              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>
    </div>
  );
};

export default CallCenterPanel;
