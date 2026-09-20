import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Search, User, Phone, MapPin, Calendar, Clock,
  Plus, RefreshCw, ClipboardList, Headphones, Loader2,
  Zap, Download, Wallet, MessageSquare, FlaskConical, ShoppingCart,
  AlertCircle, CheckCircle, Circle, Briefcase, IdCard, Send, Camera, X, Mail,
  type LucideIcon,
  UserRound,
  UserPlus,
  Users,
  Trash2,
  ArrowBigRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { toast } from "sonner";
import Swal from "sweetalert2";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import ServiceStaffChatInbox from "@/components/admin/ServiceStaffChatInbox";
import ServiceAreaLocationSelector, { type ServiceAreaLocation } from "@/components/call-center/ServiceAreaLocationSelector";
import { divisions as locationData, thanaEnMap } from "@/data/locations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import CategoryFilterDropdown, { useServiceCategoryMap } from "@/components/CategoryFilterDropdown";
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
  mobile?: string | null;
  email?: string | null;
  shop_name?: string | null;
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

interface Profile {
  user_id: string;
  shondhaan_id: string | null;
  display_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  profile_image: string | null;
  created_at: string | null;
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

const getProfileImageUrl = (image?: string | null) => {
  if (!image) return "";
  return /^https?:\/\//i.test(image) ? image : `${CENTRAL_API_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatBookingDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
};

const formatBookingTime = (value?: string | null) => {
  if (!value) return "—";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  if (hour > 23) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minute} ${period}`;
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
  shondhaan_id: item.shondhaan_id ?? item.shondhaanId ?? item.customer_id ?? null,
  display_name: item.name ?? item.display_name ?? item.full_name ?? item.username ?? null,
  phone: item.mobile ?? item.phone ?? item.phoneNumber ?? null,
  address: item.address ?? item.location ?? null,
  email: item.email ?? null,
  profile_image: item.profile_image ?? item.profile_photo ?? item.avatar ?? item.image_url ?? null,
  created_at: item.created_at ?? item.createdAt ?? item.registered_at ?? null,
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
  const [newBookingProviders, setNewBookingProviders] = useState<Provider[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [allProvidersPage, setAllProvidersPage] = useState(1);
  const [allProvidersLoading, setAllProvidersLoading] = useState(false);
  const [allProvidersSearch, setAllProvidersSearch] = useState("");
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [customerShondhaanIds, setCustomerShondhaanIds] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [providerPickerBookingId, setProviderPickerBookingId] = useState<string | null>(null);
  const [providerPickerSearch, setProviderPickerSearch] = useState("");
  const [providerPickerServiceFilter, setProviderPickerServiceFilter] = useState("");
  const [providerPickerDistrictFilter, setProviderPickerDistrictFilter] = useState("");
  const [providerPickerThanaFilter, setProviderPickerThanaFilter] = useState("");
  const [providerPickerFilterOpen, setProviderPickerFilterOpen] = useState<"service" | "district" | "thana" | null>(null);
  const [newBookingProviderId, setNewBookingProviderId] = useState("");
  const [newBookingProviderServiceFilter, setNewBookingProviderServiceFilter] = useState("");
  const [newBookingProviderDistrictFilter, setNewBookingProviderDistrictFilter] = useState("");
  const [newBookingProviderThanaFilter, setNewBookingProviderThanaFilter] = useState("");
  const [newBookingProviderFilterOpen, setNewBookingProviderFilterOpen] = useState<"service" | "district" | "thana" | null>(null);
  const { data: serviceCategoryMap } = useServiceCategoryMap();
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
    const handleOutsideDropdownClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-dropdown-container]")) return;
      setProviderPickerBookingId(null);
      setProviderPickerFilterOpen(null);
      setNewBookingProviderFilterOpen(null);
      setShowServiceCategoryDropdown(false);
      setShowServiceDropdown(false);
      setShowPackageDropdown(false);
    };

    document.addEventListener("mousedown", handleOutsideDropdownClick);
    return () => document.removeEventListener("mousedown", handleOutsideDropdownClick);
  }, []);

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

      const providerRows = extractArray<Provider>(providerPayload);
      const usersResponse = await fetch(`${CENTRAL_API_URL}/api/admin/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const usersPayload = await usersResponse.json().catch(() => ({}));
      const userMap = new Map(
        extractArray<any>(usersPayload).map((user) => [String(user.id), user])
      );
      setCustomerShondhaanIds(Object.fromEntries(
        extractArray<any>(usersPayload)
          .filter((user) => user?.shondhaan_id)
          .map((user) => [String(user.id), String(user.shondhaan_id)])
      ));
      setProviders(providerRows.map((provider) => ({
        ...provider,
        shondhaan_id: userMap.get(String(provider.user_id))?.shondhaan_id || provider.shondhaan_id || null,
      })));
      const [bookingRows, labRows] = await Promise.all([
        listBookings({ payment_status: "all" }),
        fetchOptionalArray<any>(`${API_BASE_URL}/api/lab-test-reports`),
      ]);
      setBookings((bookingRows || []) as Booking[]);
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

  const loadNewBookingProviders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: "approved", limit: "10" });
      if (newBookingProviderServiceFilter.trim()) params.set("service_category", newBookingProviderServiceFilter.trim());
      if (newBookingProviderDistrictFilter.trim()) params.set("district", newBookingProviderDistrictFilter.trim());
      if (newBookingProviderThanaFilter.trim()) params.set("thana", newBookingProviderThanaFilter.trim());

      const response = await fetch(`${API_BASE_URL}/api/providers?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Failed to fetch providers");
      setNewBookingProviders(extractArray<Provider>(payload).slice(0, 10));
    } catch (error) {
      console.error("Failed to fetch New Booking providers:", error);
      setNewBookingProviders([]);
    }
  }, [newBookingProviderDistrictFilter, newBookingProviderServiceFilter, newBookingProviderThanaFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadNewBookingProviders, 250);
    return () => window.clearTimeout(timer);
  }, [loadNewBookingProviders]);

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

  const handleDeleteProvider = async (provider: Provider) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: bn ? "প্রোভাইডার মুছে ফেলবেন?" : "Delete provider?",
      text: bn
        ? "এই প্রোভাইডার এবং তার Shondhaan ইউজার অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে।"
        : "This provider and the linked Shondhaan user account will be permanently deleted.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: bn ? "হ্যাঁ, মুছে ফেলুন" : "Yes, delete",
      cancelButtonText: bn ? "বাতিল" : "Cancel",
    });

    if (!confirmation.isConfirmed) return;

    setSubmitting(true);
    try {
      const providerResponse = await fetch(
        `${API_BASE_URL}/api/providers/call-center/${encodeURIComponent(String(provider.id))}`,
        {
          method: "DELETE",
          headers: mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {},
          credentials: "include",
        },
      );
      const providerPayload = await providerResponse.json().catch(() => ({}));
      if (!providerResponse.ok) {
        throw new Error(providerPayload?.message || "Provider could not be deleted");
      }

      const userResponse = await fetch(
        `${CENTRAL_API_URL}/api/admin/users/${encodeURIComponent(String(providerPayload?.user_id || provider.user_id))}/provider`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        },
      );
      const userPayload = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok) {
        throw new Error(userPayload?.message || "Linked Shondhaan user could not be deleted");
      }

      await Swal.fire({
        icon: "success",
        title: bn ? "মুছে ফেলা হয়েছে" : "Deleted successfully",
        text: bn ? "প্রোভাইডার এবং ইউজার অ্যাকাউন্ট মুছে ফেলা হয়েছে।" : "The provider and linked user account were deleted.",
        confirmButtonText: bn ? "ঠিক আছে" : "OK",
      });
      await loadAllProviders();
    } catch (error: any) {
      console.error("Delete provider error:", error);
      toast.error(error?.message || (bn ? "প্রোভাইডার মুছে ফেলা যায়নি" : "Provider could not be deleted"));
      await loadAllProviders();
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
      const operatorId = String(mysqlAuth?.user?.id ?? activeUserId ?? "").trim();
      const createdBooking = await createBooking({
        user_id: String(newBooking.user_id),
        booked_by: operatorId,
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
      });
      if (newBookingProviderId && createdBooking?.id) {
        await assignBookingProvider(String(createdBooking.id), newBookingProviderId);
      }
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
    setNewBookingProviderId("");
    setNewBookingProviderSearch("");
    setNewBookingProviderServiceFilter("");
    setNewBookingProviderDistrictFilter("");
    setNewBookingProviderThanaFilter("");
    setNewBookingProviderFilterOpen(null);
    fetchData();
  };
  

  const statusFilteredBookings = filterStatus === "all"
    ? bookings
    : filterStatus === "emergency"
      ? bookings.filter((b) => b.is_emergency || b.note === "Emergency booking")
      : bookings.filter((b) => b.status === filterStatus);
  const categoryFilteredBookings = filterCategory === "all"
    ? statusFilteredBookings
    : statusFilteredBookings.filter((b) => serviceCategoryMap?.get(b.service_slug) === filterCategory);
  const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
  const filteredBookings = normalizedBookingSearch
    ? categoryFilteredBookings.filter((booking) => {
        const provider = providers.find((item) => String(item.id) === String(booking.provider_id));
        return [
          booking.service_title,
          booking.customer_name,
          booking.customer_phone,
          booking.customer_address,
          customerShondhaanIds[String(booking.user_id)],
          provider?.phone,
          provider?.mobile,
          provider?.shondhaan_id,
          provider?.full_name,
          provider?.name,
          provider?.email,
          provider?.address,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedBookingSearch));
      })
    : categoryFilteredBookings;

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const bookingsPerPage = 10;
  const bookingPageCount = Math.max(1, Math.ceil(sortedBookings.length / bookingsPerPage));
  const paginatedBookings = sortedBookings.slice((bookingPage - 1) * bookingsPerPage, bookingPage * bookingsPerPage);

  useEffect(() => {
    setBookingPage(1);
  }, [filterStatus, filterCategory, bookingSearch, sortedBookings.length]);

  const normalizeSearchValue = (value: unknown) => String(value || "").toLowerCase().trim();
  const toProviderValueArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value == null ? [] : [value];
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  };
  const getProviderAreas = (provider: Provider) => [
    provider.division,
    provider.district,
    provider.provider_district,
    provider.raw_provider_district,
    provider.thana,
    provider.area,
  ].flatMap(toProviderValueArray).filter(Boolean).map(String);
  const getProviderCategories = (provider: Provider) => {
    const resolvedServiceNames = toProviderValueArray(provider.service_names).filter(Boolean).map(String);
    if (resolvedServiceNames.length) return resolvedServiceNames;

    return [provider.service_category, provider.services]
      .flatMap(toProviderValueArray)
      .filter(Boolean)
      .map((value) => {
    const serviceId = String(value).trim();
    const service = services.find((item) => normalizeSearchValue(item.id) === normalizeSearchValue(serviceId));
    return service ? (service.title || service.name || service.service_title || serviceId) : serviceId;
      });
  };
  const providerPickerServices = [...new Set(providers.flatMap(getProviderCategories).filter(Boolean))].sort();
  const newBookingProviderServices = [...new Set([
    ...services.flatMap((service) => [service.title, service.title_en, service.name, service.name_en, service.service_title]),
  ].filter(Boolean).map(String))].sort();
  const providerPickerDistricts = [...new Map(locationData.flatMap((division) => division.districts).map((district) => [district.nameBn, district])).values()];
  const providerPickerThanas = providerPickerDistrictFilter
    ? [...new Set(locationData.flatMap((division) => division.districts).find((district) => district.nameBn === providerPickerDistrictFilter)?.thanas || [])].sort()
    : [];
  const getProviderSearchScore = (provider: Provider, query: string) => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return 0;
    const district = String(provider.district || provider.provider_district || provider.raw_provider_district || "");
    const districtRecord = locationData.flatMap((division) => division.districts).find((item) => item.nameBn === district || item.name === district);
    const districtSearchValues = [district, districtRecord?.name, districtRecord?.nameBn];
    const thanaSearchValues = toProviderValueArray(provider.thana).flatMap((thana) => [
      String(thana),
      ...Object.entries(thanaEnMap).filter(([, banglaName]) => banglaName === String(thana)).map(([englishName]) => englishName),
    ]);
    const serviceSearchValues = toProviderValueArray(provider.services).flatMap((serviceId) => {
      const service = services.find((item) => normalizeSearchValue(item.id) === normalizeSearchValue(serviceId));
      return service ? [service.title, service.name, service.name_en, service.service_title] : [String(serviceId)];
    });
    const areas = [...getProviderAreas(provider), ...districtSearchValues, ...thanaSearchValues].filter(Boolean).map(normalizeSearchValue);
    const categories = [...getProviderCategories(provider), ...serviceSearchValues].filter(Boolean).map(normalizeSearchValue);
    const details = [
      provider.full_name, provider.name, provider.phone, provider.mobile,
      provider.address, provider.email, provider.shondhaan_id, provider.id,
    ].map(normalizeSearchValue);
    if (areas.some((value) => value.includes(normalizedQuery))) return 300;
    if (categories.some((value) => value.includes(normalizedQuery))) return 200;
    if (details.some((value) => value.includes(normalizedQuery))) return 100;
    return -1;
  };
  const getProviderSearchResultsFor = (query: string, serviceFilter: string, districtFilter: string, thanaFilter: string, sourceProviders: Provider[] = providers) => sourceProviders
    .map((provider) => ({ provider, score: getProviderSearchScore(provider, query) }))
    .filter(({ score }) => !query.trim() || score >= 0)
    .filter(({ provider }) => !serviceFilter || getProviderCategories(provider).some((value) => normalizeSearchValue(value).includes(normalizeSearchValue(serviceFilter))))
    .filter(({ provider }) => !districtFilter || String(provider.district || provider.provider_district || provider.raw_provider_district || "") === districtFilter)
    .filter(({ provider }) => !thanaFilter || toProviderValueArray(provider.thana).map(String).includes(thanaFilter))
    .sort((a, b) => b.score - a.score || String(a.provider.full_name || a.provider.name || "").localeCompare(String(b.provider.full_name || b.provider.name || "")))
    .map(({ provider }) => provider);
  const getProviderSearchResults = () => getProviderSearchResultsFor(providerPickerSearch, providerPickerServiceFilter, providerPickerDistrictFilter, providerPickerThanaFilter);
  const newBookingProviderResults = getProviderSearchResultsFor("", newBookingProviderServiceFilter, newBookingProviderDistrictFilter, newBookingProviderThanaFilter, newBookingProviders);
  const newBookingProviderThanas = newBookingProviderDistrictFilter
    ? [...new Set(locationData.flatMap((division) => division.districts).find((district) => district.nameBn === newBookingProviderDistrictFilter)?.thanas || [])].sort()
    : [];

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
              { value: "bookings", label: bn ? "সার্ভিস রিকোয়েস্ট" : "Service Request", icon: <ClipboardList className="h-4 w-4" /> },
              { value: "new-booking", label: bn ? "নতুন সার্ভিস বুকিং" : "New Service Booking", icon: <Plus className="h-4 w-4" /> },
              { value: "create-provider", label: bn ? "প্রোভাইডার রেজিস্ট্রেশন" : "Provider Registration", icon: <UserPlus className="h-4 w-4" /> },
              { value: "all-providers", label: bn ? "সকল প্রোভাইডার" : "All Providers", icon: <Users className="h-4 w-4" /> },
              // { value: "bookings", label: bn ? "সার্ভিস রিকোয়েস্ট" : "Service Request", icon: <ClipboardList className="h-4 w-4" />, group: bn ? "ম্যানেজমেন্ট" : "Management" },
              { value: "service-messages", label: bn ? "কাস্টমার মেসেজ" : "Messages", icon: <MessageSquare className="h-4 w-4" /> },
            ]}
            defaultValue="bookings"
      
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
                          const profileImageUrl = getProfileImageUrl(p.profile_image);
                          return (
                            <div key={p.user_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                {profileImageUrl ? (
                                  <img
                                    src={profileImageUrl}
                                    alt={p.display_name || "Customer"}
                                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600 shrink-0">
                                    <User className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xl font-medium text-slate-900">{p.display_name || "—"}</p>
                                  <div className="mt-2 flex flex-col items-start gap-1">
                                    <span className="text-xs bg-userprimaryshade border px-3 py-1 rounded-full border-userprimary text-black font-semibold flex items-center gap-1">
                                      <IdCard className="h-3 w-3 shrink-0" />
                                      {bn ? "সন্ধান আইডি" : "Shondhaan ID"}: {p.shondhaan_id || "—"}
                                    </span>
                                    <span className="text-sm text-slate-900 flex items-center gap-1">
                                      <Phone className="h-3 w-3 shrink-0" />
                                      {p.phone || "—"}
                                    </span>
                                    <span className="text-sm text-slate-900 flex items-center gap-1">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      {p.email || "—"}
                                    </span>
                                    <span className="text-xs text-slate-600 flex items-center gap-1">
                                      <Calendar className="h-3 w-3 shrink-0" />
                                        {bn ? "তৈরি" : "Created"}: {p.created_at ? new Date(p.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US") : "—"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 flex items-start gap-1 mt-1.5">
                                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{p.address || "—"}</span>
                                  </p>
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
                          <span className={`mt-1 text-[11px] px-2 rounded-full font-medium ${s.className.includes("bg-") ? s.className : "text-slate-600"}`}>{bn ? s.labelBn : s.labelEn}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap py-2 px-2 bg-userprimaryshade rounded-xl">
                      <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                        <CategoryFilterDropdown value={filterCategory} onChange={setFilterCategory} />
                        <div className="relative min-w-[260px] flex-1 md:max-w-md">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={bookingSearch}
                            onChange={(event) => setBookingSearch(event.target.value)}
                            placeholder={bn ? "সার্ভিস, কাস্টমার নম্বর, ফোন, আইডি বা ঠিকানা খুঁজুন" : "Search service, customer number, phone, ID or address"}
                            className="h-10 bg-white pl-9"
                          />
                        </div>
                        {(filterStatus !== "all" || filterCategory !== "all" || bookingSearch) && (
                          <button
                            onClick={() => {
                              setFilterStatus("all");
                              setFilterCategory("all");
                              setBookingSearch("");
                            }}
                            className="text-xs font-medium text-red-600 hover:text-slate-900 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-userprimary bg-userprimary px-3 text-xs font-medium text-white hover:bg-userprimaryshade hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        title={bn ? "বুকিং রিফ্রেশ করুন" : "Refresh bookings"}
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">{bn ? "রিফ্রেশ" : "Refresh"}</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {sortedBookings.length === 0 ? (
                        <div className="text-center py-8">
                          <Circle className="h-8 w-8 mx-auto text-slate-300 mb-3 opacity-50" />
                          <p className="text-sm text-slate-500">{bn ? "কোনো বুকিং নেই" : "No bookings found"}</p>
                        </div>
                      ) : (
                        paginatedBookings.map((b, i) => {
                          const s = bookingStatusOptions.find((o) => o.value === b.status) || bookingStatusOptions[0];
                          const assignedProvider = providers.find((provider) => {
                            const assignedIds = [b.provider_id, b.assigned_to].filter((value) => value !== undefined && value !== null && value !== "").map(String);
                            return assignedIds.includes(String(provider.id)) || assignedIds.includes(String(provider.user_id));
                          });
                          const assignedProviderServices = assignedProvider ? getProviderCategories(assignedProvider) : [];
                          const assignedProviderThanas = assignedProvider ? [...new Set(toProviderValueArray(assignedProvider.thana).map(String))] : [];
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

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                                <span className="flex items-center gap-2 text-[14px]">
                                  <User className="h-3 w-3 text-userprimary" />
                                  <span>
                                    {b.customer_name}
                                    {customerShondhaanIds[String(b.user_id)] && (
                                      <span className="ml-1.5 text-[12px] text-userprimary">
                                        · {bn ? "সন্ধান আইডি" : "Shondhaan ID"}: {customerShondhaanIds[String(b.user_id)]}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-userprimary" />
                                  {b.customer_phone}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-userprimary" />
                                  {formatBookingDate(b.booking_date)}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-userprimary" />
                                  {formatBookingTime(b.booking_time)}
                                </span>
                                <span className="flex items-start gap-2 text-[14px] col-span-2">
                                  <MapPin className="h-3 w-3 text-userprimary mt-0.5 text-[14px] shrink-0" />
                                  <span className="truncate text-[14px]">{b.customer_address}</span>
                                </span>
                              </div>

                              <div className="relative flex items-start gap-2" data-dropdown-container>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProviderPickerBookingId(providerPickerBookingId === b.id ? null : b.id);
                                    setProviderPickerSearch("");
                                    setProviderPickerServiceFilter("");
                                    setProviderPickerDistrictFilter("");
                                    setProviderPickerThanaFilter("");
                                    setProviderPickerFilterOpen(null);
                                  }}
                                  disabled={updatingId === b.id}
                                  className="rounded-lg border flex gap-2 border-userprimary bg-userprimaryshade px-3 py-2 text-left text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 transition-all"
                                >
                                  {b.provider_id || b.assigned_to
                                    ? (assignedProvider?.full_name || assignedProvider?.name || assignedProvider?.shop_name || (bn ? "নির্ধারিত প্রদানকারী" : "Assigned provider"))
                                    : (bn ? "সার্ভিস প্রদানকারী নির্ধারণ করুন" : "Assign a service provider")}
                                  {b.provider_id || b.assigned_to ? (
                                    <CheckCircle className="h-4 w-4 shrink-0 text-userprimary" />
                                  ) : (
                                    <Plus className="h-4 w-4 shrink-0" />
                                  )}
                                </button>
                                {assignedProvider && (
                                  <div className="mt-1 flex max-w-[min(65%,32rem)] flex-wrap items-center gap-1 text-[10px] text-slate-500">
                                    {assignedProviderServices.map((service) => (
                                      <span key={`assigned-service-${service}`} className="rounded-full bg-userprimaryshade my-auto px-2 py-0.5 text-userprimary">{service}</span>
                                    ))}
                                    {assignedProviderThanas.map((thana) => (
                                      <span key={`assigned-thana-${thana}`} className="rounded-full bg-slate-100 px-2 py-0.5 my-auto text-slate-600">{thana}</span>
                                    ))}
                                  </div>
                                )}
                                {providerPickerBookingId === b.id && (
                                  <div className="absolute left-0 right-0 z-30 top-0 mt-[50px] rounded-xl border border-userprimary bg-[aliceblue] p-2 shadow-xl">
                                    <div className="relative mb-2">
                                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                      <input
                                        autoFocus
                                        value={providerPickerSearch}
                                        onChange={(e) => setProviderPickerSearch(e.target.value)}
                                        placeholder={bn ? "এলাকা, ক্যাটেগরি, নাম বা ফোনে খুঁজুন" : "Search area, category, name or phone"}
                                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-slate-900/20"
                                      />
                                    </div>
                                    <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <div className="relative">
                                        <input
                                          value={providerPickerServiceFilter}
                                          onFocus={() => setProviderPickerFilterOpen("service")}
                                          onChange={(event) => { setProviderPickerServiceFilter(event.target.value); setProviderPickerFilterOpen("service"); }}
                                          placeholder={bn ? "সার্ভিস ক্যাটেগরি" : "Service category"}
                                          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20"
                                        />
                                        {providerPickerServiceFilter && (
                                          <button type="button" onClick={() => setProviderPickerServiceFilter("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" aria-label="Clear service filter">
                                            <X className="h-4 w-4" />
                                          </button>
                                        )}
                                        {providerPickerFilterOpen === "service" && (
                                          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                            {providerPickerServices.filter((service) => !providerPickerServiceFilter || normalizeSearchValue(service).includes(normalizeSearchValue(providerPickerServiceFilter))).map((service) => (
                                              <button key={service} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setProviderPickerServiceFilter(service); setProviderPickerFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{service}</button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="relative">
                                        <input
                                          value={providerPickerDistrictFilter}
                                          onFocus={() => setProviderPickerFilterOpen("district")}
                                          onChange={(event) => { setProviderPickerDistrictFilter(event.target.value); setProviderPickerThanaFilter(""); setProviderPickerFilterOpen("district"); }}
                                          placeholder={bn ? "জেলা খুঁজুন" : "Search district"}
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20"
                                        />
                                        {providerPickerDistrictFilter && <button type="button" onClick={() => { setProviderPickerDistrictFilter(""); setProviderPickerThanaFilter(""); }} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" aria-label="Clear district filter"><X className="h-4 w-4" /></button>}
                                        {providerPickerFilterOpen === "district" && (
                                          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                            {providerPickerDistricts.filter((district) => !providerPickerDistrictFilter || `${district.name} ${district.nameBn}`.toLowerCase().includes(providerPickerDistrictFilter.toLowerCase())).map((district) => (
                                              <button key={district.nameBn} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setProviderPickerDistrictFilter(district.nameBn); setProviderPickerThanaFilter(""); setProviderPickerFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{bn ? district.nameBn : district.name}</button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="relative">
                                        <input
                                          value={providerPickerThanaFilter}
                                          disabled={!providerPickerDistrictFilter}
                                          onFocus={() => providerPickerDistrictFilter && setProviderPickerFilterOpen("thana")}
                                          onChange={(event) => { setProviderPickerThanaFilter(event.target.value); setProviderPickerFilterOpen("thana"); }}
                                          placeholder={bn ? "থানা/উপজেলা খুঁজুন" : "Search thana/upazila"}
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                        {providerPickerThanaFilter && <button type="button" onClick={() => setProviderPickerThanaFilter("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" aria-label="Clear thana filter"><X className="h-4 w-4" /></button>}
                                        {providerPickerFilterOpen === "thana" && providerPickerDistrictFilter && (
                                          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                            {providerPickerThanas.filter((thana) => {
                                              const englishName = Object.entries(thanaEnMap)
                                                .filter(([, banglaName]) => banglaName === thana)
                                                .map(([english]) => english)
                                                .join(" ");
                                              return !providerPickerThanaFilter || normalizeSearchValue(`${thana} ${englishName}`).includes(normalizeSearchValue(providerPickerThanaFilter));
                                            }).map((thana) => (
                                              <button key={thana} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setProviderPickerThanaFilter(thana); setProviderPickerFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{thana}</button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="max-h-80 space-y-1 overflow-y-auto">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateBookingStatus(b.id, "pending");
                                          await handleAssignProvider(b.id, "");
                                          setProviderPickerBookingId(null);
                                        }}
                                        className="bg-userprimaryshade rounded-lg px-3 py-2 mb-3 mt-1 text-left text-xs text-black hover:bg-red-600 hover:text-white"
                                      >
                                        {bn ? "প্রোভাইডার রিমুভ করুন" : "Remove assigned provider"}
                                      </button>
                                      {getProviderSearchResults().map((provider) => {
                                        const providerName = provider.full_name || provider.name || provider.shop_name || `প্রদানকারী ${provider.id}`;
                                        const providerPhone = provider.phone || provider.mobile;
                                        const areas = getProviderAreas(provider);
                                        const uniqueAreas = [...new Set(areas)];
                                        const categories = getProviderCategories(provider);
                                        return (
                                          <button
                                            type="button"
                                            key={provider.id}
                                            onClick={() => { handleAssignProvider(b.id, String(provider.id)); setProviderPickerBookingId(null); }}
                                            className="flex w-full items-start gap-3 rounded-lg bg-background border shadow p-2 text-left hover:border-slate-200 hover:bg-slate-50"
                                          >
                                            {provider.profile_image || provider.image_url ? (
                                              <img src={getProfileImageUrl(provider.profile_image || provider.image_url)} alt={providerName} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                            ) : (
                                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{providerName.charAt(0)}</div>
                                            )}
                                            <span className="min-w-0 flex-1">
                                              <span className="block truncate text-xs font-semibold text-slate-900">{providerName}</span>
                                              <span className="block truncate text-[14px] text-userprimary">{bn ? "সন্ধান আইডি" : "Shondhaan ID"} : {provider.shondhaan_id || "—"}</span>
                                              <span className="block truncate text-[14px] text-slate-500">{providerPhone || "—"}</span>
                                              <span className="block truncate text-[14px] text-slate-500">{provider.email || "—"}</span>
                                            </span>
                                            <span className="max-w-[300px] shrink-0 text-right text-[10px] text-slate-500">
                                              <span className="flex min-w-0 flex-wrap items-center gap-1" title={uniqueAreas.join(" → ")}>
                                                {uniqueAreas.length ? uniqueAreas.map((area, index) => (
                                                  <span key={`${area}-${index}`} className="inline-flex items-center gap-1">
                                                    <span className="max-w-24 text-black truncate rounded-full bg-userprimaryshade px-2 py-0.5">{area}</span>
                                                    {index < uniqueAreas.length - 1 && <span className="text-slate-400" aria-hidden="true">→</span>}
                                                  </span>
                                                )) : "—"}
                                              </span>
                                              <span className="block truncate font-semibold text-[14px] text-userprimary mt-3" title={categories.join(", ")}>{categories.join(", ") || "—"}</span>
                                              <span className="mt-1 block font-semibold text-amber-600">★ {Number(provider.rating || 0).toFixed(1)} · {Number(provider.total_jobs || 0)} {bn ? "সম্পন্ন" : "completed"}</span>
                                            </span>
                                          </button>
                                        );
                                      })}
                                      {getProviderSearchResults().length === 0 && (
                                        <p className="p-4 text-center text-xs text-slate-500">{bn ? "কোনো প্রদানকারী পাওয়া যায়নি" : "No providers found"}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </motion.div>
                          );
                        })
                      )}
                    </div>
                    {sortedBookings.length > bookingsPerPage && (
                      <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setBookingPage((page) => Math.max(1, page - 1))}
                          disabled={bookingPage === 1}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {bn ? "পূর্ববর্তী" : "Previous"}
                        </button>
                        <span className="text-xs font-medium text-slate-500">
                          {bn ? `পৃষ্ঠা ${bookingPage} / ${bookingPageCount}` : `Page ${bookingPage} of ${bookingPageCount}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingPage((page) => Math.min(bookingPageCount, page + 1))}
                          disabled={bookingPage === bookingPageCount}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {bn ? "পরবর্তী" : "Next"}
                        </button>
                      </div>
                    )}
                  </div>
                );

              /* ─────────────────────────────────────────────
                 TAB: NEW BOOKING
              ───────────────────────────────────────────── */
              if (activeTab === "new-booking")
                return (
                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-slate-900 mb-5">{bn ? "নতুন বুকিং তৈরি করুন" : "Create New Booking"}</h3>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                      <div className="min-w-0">
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
                            className="text-sm font-medium text-userprimary hover:bg-userprimary px-2 py-1 rounded-full hover:text-white transition-colors"
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
                              {searchResults.map((p) => {
                                const profileImageUrl = getProfileImageUrl(p.profile_image);
                                return (
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
                                    className="w-full flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50 transition-colors"
                                  >
                                    {profileImageUrl ? (
                                      <img src={profileImageUrl} alt={p.display_name || "Customer"} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                                    ) : (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <User className="h-4 w-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-slate-900 truncate">{p.display_name || "—"}</p>
                                      <span className="text-[11px] text-slate-900 truncate">{bn ? "সন্ধান আইডি" : "Shondhaan ID"}: {p.shondhaan_id || "—"}</span>
                                      <p className="text-[11px] text-slate-900 truncate">{p.phone || "—"} • {p.email || "—"}</p>
                                      <p className="text-[11px] text-slate-600 truncate">{p.address || "—"}</p>
                                      <p className="text-[11px] text-slate-600 truncate">
                                        {bn ? "তৈরি" : "Created"}: {p.created_at ? new Date(p.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US") : "—"}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
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
                        <div className="relative" data-dropdown-container>
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
                        <div className="relative" data-dropdown-container>
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-userprimary text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
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

                      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-4" data-dropdown-container>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{bn ? "সার্ভিস প্রদানকারী নির্বাচন" : "Select Service Provider"}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{bn ? "বুকিং তৈরির আগে প্রদানকারী বাছাই করুন" : "Choose a provider before creating the booking"}</p>
                          </div>
                          {newBookingProviderId && (
                            <button type="button" onClick={() => setNewBookingProviderId("")} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Clear selected provider">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                          <div className="relative">
                            <input
                              autoComplete="off"
                              value={newBookingProviderServiceFilter}
                              onFocus={() => setNewBookingProviderFilterOpen("service")}
                              onChange={(event) => { setNewBookingProviderServiceFilter(event.target.value); setNewBookingProviderFilterOpen("service"); }}
                              placeholder={bn ? "সিলেক্ট সার্ভিস" : "Select Services"}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                            {newBookingProviderServiceFilter && <button type="button" onClick={() => setNewBookingProviderServiceFilter("")} className="absolute right-2 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
                            {newBookingProviderFilterOpen === "service" && (
                              <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                {newBookingProviderServices.filter((service) => !newBookingProviderServiceFilter || normalizeSearchValue(service).includes(normalizeSearchValue(newBookingProviderServiceFilter))).map((service) => (
                                  <button key={service} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setNewBookingProviderServiceFilter(service); setNewBookingProviderFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{service}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              autoComplete="off"
                              value={newBookingProviderDistrictFilter}
                              onFocus={() => setNewBookingProviderFilterOpen("district")}
                              onChange={(event) => { setNewBookingProviderDistrictFilter(event.target.value); setNewBookingProviderThanaFilter(""); setNewBookingProviderFilterOpen("district"); }}
                              placeholder={bn ? "জেলা" : "District"}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                            {newBookingProviderDistrictFilter && <button type="button" onClick={() => { setNewBookingProviderDistrictFilter(""); setNewBookingProviderThanaFilter(""); }} className="absolute right-2 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
                            {newBookingProviderFilterOpen === "district" && (
                              <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                {providerPickerDistricts.filter((district) => !newBookingProviderDistrictFilter || normalizeSearchValue(`${district.name} ${district.nameBn}`).includes(normalizeSearchValue(newBookingProviderDistrictFilter))).map((district) => (
                                  <button key={district.nameBn} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setNewBookingProviderDistrictFilter(district.nameBn); setNewBookingProviderThanaFilter(""); setNewBookingProviderFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{district.name} <span className="text-slate-400">{district.nameBn}</span></button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              autoComplete="off"
                              disabled={!newBookingProviderDistrictFilter}
                              value={newBookingProviderThanaFilter}
                              onFocus={() => newBookingProviderDistrictFilter && setNewBookingProviderFilterOpen("thana")}
                              onChange={(event) => { setNewBookingProviderThanaFilter(event.target.value); setNewBookingProviderFilterOpen("thana"); }}
                              placeholder={bn ? "থানা / উপজেলা" : "Thana / Upazila"}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-100 disabled:opacity-60"
                            />
                            {newBookingProviderThanaFilter && <button type="button" onClick={() => setNewBookingProviderThanaFilter("")} className="absolute right-2 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
                            {newBookingProviderFilterOpen === "thana" && (
                              <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                {newBookingProviderThanas.filter((thana) => !newBookingProviderThanaFilter || normalizeSearchValue(`${thana} ${Object.entries(thanaEnMap).find(([, banglaName]) => banglaName === thana)?.[0] || ""}`).includes(normalizeSearchValue(newBookingProviderThanaFilter))).map((thana) => (
                                  <button key={thana} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setNewBookingProviderThanaFilter(thana); setNewBookingProviderFilterOpen(null); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{thana}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                          {newBookingProviderResults.map((provider) => {
                            const selected = String(provider.id) === String(newBookingProviderId);
                            const providerName = provider.full_name || provider.name || provider.shop_name || (bn ? "প্রদানকারী" : "Provider");
                            const providerThanas = toProviderValueArray(provider.thana).map(String).filter(Boolean);
                            return (
                              <button key={provider.id} type="button" onClick={() => setNewBookingProviderId(String(provider.id))} className={`w-full rounded-lg border p-2 text-left transition-colors ${selected ? "border-userprimary bg-userprimaryshade" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                <div className="flex gap-2">
                                  {provider.profile_image || provider.image_url ? <img src={getProfileImageUrl(provider.profile_image || provider.image_url)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"><User className="h-5 w-5" /></div>}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-semibold text-slate-900">{providerName}</p>{selected && <CheckCircle className="h-4 w-4 shrink-0 text-userprimary" />}</div>
                                    <span className="truncate text-[12px] font-semibold text-userprimary">{bn ? "সন্ধান আইডি" : "Shondhaan ID"} : {provider.shondhaan_id || "—"}</span>
                                    <p className="truncate text-[10px] text-slate-800">{provider.phone || provider.mobile || "—"}</p>
                                    <p className="truncate text-[10px] text-slate-800">{provider.email || provider.address || "—"}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[12px] font-semibold text-slate-800">
                                        {getProviderCategories(provider).slice(0, 2).join(", ") || "—"}
                                      </span>
                                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[12px] font-semibold text-slate-800">
                                        {providerThanas.join(", ") || "—"}
                                      </span>
                                      <span className="ml-auto text-[9px] text-slate-500">★ {Number(provider.rating || 0).toFixed(1)} · {provider.total_jobs || 0}</span></div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {!newBookingProviderResults.length && <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-500">{bn ? "কোনো প্রদানকারী পাওয়া যায়নি" : "No matching providers found"}</p>}
                        </div>
                      </aside>
                    </div>
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
                                          <FormLabel>{bn ? "সার্ভিস" : "Services"}</FormLabel>
                                          <div className="relative" data-dropdown-container>
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
                                                {field.value.map((serviceId) => {
                                                  const service = services.find((item) => String(item.id) === String(serviceId));
                                                  if (!service) return null;
                                                  return (
                                                    <span key={service.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                                      {bn ? service.title : service.title_en || service.title}
                                                      <button
                                                        type="button"
                                                        aria-label={`Remove ${service.title}`}
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                          field.onChange(field.value.filter((id) => String(id) !== String(service.id)));
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
                                                    {bn ? "সার্ভিস নির্বাচন করুন" : "Select services"}
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
                                                  placeholder={bn ? "সার্ভিস খুঁজুন..." : "Search services..."}
                                                  className="mb-1 h-9"
                                                />
                                                <div className="max-h-52 overflow-y-auto">
                                                {services
                                                  .filter((service) => service.is_active !== false)
                                                  .filter((service) => {
                                                    const query = serviceCategorySearch.trim().toLowerCase();
                                                    return !query
                                                      || String(service.title || "").toLowerCase().includes(query)
                                                      || String(service.title_en || "").toLowerCase().includes(query)
                                                      || String(service.slug || "").toLowerCase().includes(query);
                                                  })
                                                  .map((service) => {
                                                  const selected = field.value.some((id) => String(id) === String(service.id));
                                                  return (
                                                    <label
                                                      key={service.id}
                                                      onClick={(event) => event.stopPropagation()}
                                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-slate-50"
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => field.onChange(
                                                          selected
                                                            ? field.value.filter((id) => String(id) !== String(service.id))
                                                            : [...field.value, String(service.id)]
                                                        )}
                                                        className="h-4 w-4 rounded border-slate-300"
                                                      />
                                                      <span>{bn ? service.title : service.title_en || service.title}</span>
                                                    </label>
                                                  );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          {!services.length && <p className="text-sm text-muted-foreground">{bn ? "সার্ভিস লোড হচ্ছে..." : "Loading services..."}</p>}
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
                                    ? (editingProvider ? (bn ? "আপডেট হচ্ছে..." : "Updating...") : (bn ? "রেজিস্ট্রেশন হচ্ছে..." : "Creating..."))
                                    : (editingProvider ? (bn ? "আপডেট করুন" : "Update Provider") : (bn ? "রেজিস্ট্রেশন করুন" : "Create Provider"))}
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
                const getCategoryName = (serviceId: string) => {
                  const service = services.find((item) => String(item.id) === String(serviceId));
                  return service ? (bn ? service.title : service.title_en || service.title) : serviceId;
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
                                  <th className="sticky right-0 z-10 bg-gray-300 text-black px-4 py-3 font-bold">{bn ? "অ্যাকশন" : "Action"}</th>
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
                                          <p className="truncate text-xs font-semibold text-userprimary">{bn ? "সন্ধান আইডি" : "Shondhaan-ID"} : {provider.shondhaan_id || "—"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="min-w-[210px] px-4 py-3"><div className="flex flex-wrap gap-1">
                                      {provider.service_names?.length ? provider.service_names.map((serviceName) => <span key={serviceName} className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800">{serviceName}</span>) : <span>—</span>}</div></td>
                                    <td className="min-w-[190px] px-4 py-3 text-slate-700">
                                      <p className="font-medium">{provider.raw_provider_district || provider.provider_district || provider.district || "—"}</p>
                                      <div className="flex flex-wrap gap-1">{provider.thana?.length ? provider.thana.map((thana) => <span key={thana} className="text-xs text-slate-500">{thana}</span>) : <span className="text-xs text-slate-500">—</span>}</div>
                                      <p className="text-xs text-slate-500">{provider.area || "—"}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{provider.experience_years ?? 0} {bn ? "বছর" : "years"}</td>
                                   <td>
                                    <span className={`whitespace-nowrap px-2 rounded-full text-[11px] py-0 border ${
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
                                    <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => openProviderEditor(provider, setActiveTab)} className="rounded-lg bg-userprimary px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800">{bn ? "ওপেন" : "Open"}</button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteProvider(provider)}
                                          disabled={submitting}
                                          title={bn ? "মুছে ফেলুন" : "Delete"}
                                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
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
