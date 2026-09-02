import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Edit2, Trash2, Save, X, Upload, Image as ImageIcon, Loader2, Eye, EyeOff, Star, Search, ChevronDown, Tag, CalendarDays, ExternalLink, Copy, Filter, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceOffer {
  id?: number;
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  image_url: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  service_id: number | null;
  service_slug: string;
  category_id: number | null;
  offer_code: string;
  start_date: string | null;
  end_date: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ServiceOption {
  id: string | number;
  slug: string;
  title: string;
  title_en?: string | null;
  price?: number | string;
}

const emptyOffer: ServiceOffer = {
  title: "",
  title_bn: "",
  description: "",
  description_bn: "",
  image_url: "",
  discount_type: "percentage",
  discount_value: 0,
  service_id: null,
  service_slug: "",
  category_id: null,
  offer_code: "",
  start_date: null,
  end_date: null,
  is_featured: false,
  is_active: true,
};

const SERVICE_API = (import.meta.env.VITE_SERVICE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const API_URL = `${SERVICE_API}/api/service-offers`;

const getImageUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${SERVICE_API}${url}`;
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const fmtDateTime = (d: string | null) => {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

/* ── Status filter type ── */
type StatusFilter = "all" | "active" | "inactive" | "featured" | "expired";

const AdminOffers = () => {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceOffer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Search & Filter states ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropRef = useRef<HTMLDivElement>(null);

  /* ── Services for dropdown ── */
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const serviceDropRef = useRef<HTMLDivElement>(null);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch(`${SERVICE_API}/api/services`);
      const json = await res.json().catch(() => ({}));
      const list: any[] = Array.isArray(json) ? json : json?.data || json?.services || [];
      setServices(
        list
          .filter((s: any) => s.is_active !== false && s.is_active !== 0)
          .sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((s: any) => ({
            id: s.id,
            slug: s.slug || "",
            title: s.title || "",
            title_en: s.title_en || null,
            price: s.price || 0,
          }))
      );
    } catch (err) {
      console.error("Failed to fetch services:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (serviceDropRef.current && !serviceDropRef.current.contains(e.target as Node)) {
        setServiceDropdownOpen(false);
      }
      if (filterDropRef.current && !filterDropRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Keyboard shortcut: Ctrl/Cmd + K to focus search ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("admin-offer-search")?.focus();
      }
      if (e.key === "Escape") {
        if (document.activeElement?.id === "admin-offer-search") {
          setSearchQuery("");
          document.getElementById("admin-offer-search")?.blur();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      toast.error("অফার লোড করতে সমস্যা হয়েছে");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchServices();
  }, []);

  /* ── Filtered services for dropdown ── */
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services.slice(0, 50);
    const q = serviceSearch.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.title_en || "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
    );
  }, [services, serviceSearch]);

  const selectedServiceLabel = useMemo(() => {
    if (!editing?.service_id) return "";
    const found = services.find((s) => String(s.id) === String(editing.service_id));
    return found ? (found.title_en || found.title) : `ID: ${editing.service_id}`;
  }, [editing?.service_id, services]);

  /* ── Filtered offers (search + status) ── */
  const filteredOffers = useMemo(() => {
    let result = offers;

    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "active":
          result = result.filter((o) => o.is_active);
          break;
        case "inactive":
          result = result.filter((o) => !o.is_active);
          break;
        case "featured":
          result = result.filter((o) => o.is_featured);
          break;
        case "expired":
          result = result.filter((o) => o.end_date && new Date(o.end_date) < new Date());
          break;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((o) => {
        const fields = [
          o.title,
          o.title_bn,
          o.description,
          o.description_bn,
          o.offer_code,
          o.service_slug,
          `${o.discount_value}`,
          o.discount_type,
        ];
        return fields.some((f) => f?.toLowerCase().includes(q));
      });
    }

    return result;
  }, [offers, searchQuery, statusFilter]);

  const isSearching = searchQuery.trim().length > 0;
  const isFiltering = statusFilter !== "all";
  const hasActiveFilters = isSearching || isFiltering;

  /* ── Status filter options ── */
  const statusFilterOptions: { key: StatusFilter; label: string; count: number; color: string }[] = useMemo(() => [
    { key: "all", label: "সব অফার", count: offers.length, color: "text-foreground" },
    { key: "active", label: "সক্রিয়", count: offers.filter((o) => o.is_active).length, color: "text-green-600" },
    { key: "inactive", label: "নিষ্ক্রিয়", count: offers.filter((o) => !o.is_active).length, color: "text-red-600" },
    { key: "featured", label: "ফিচার্ড", count: offers.filter((o) => o.is_featured).length, color: "text-amber-600" },
    { key: "expired", label: "মেয়াদ উত্তীর্ণ", count: offers.filter((o) => o.end_date && new Date(o.end_date) < new Date()).length, color: "text-orange-600" },
  ], [offers]);

  const activeFilterLabel = useMemo(() => {
    const found = statusFilterOptions.find((f) => f.key === statusFilter);
    return found?.label || "";
  }, [statusFilter, statusFilterOptions]);

  /* ─── Image ─── */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি ফাইল আপলোড করুন"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("ফাইল সাইজ ৫MB এর বেশি হতে পারবে না"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
    toast.success("ছবি নির্বাচিত হয়েছে");
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (editing) setEditing({ ...editing, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ─── Edit ─── */
  const startEditing = (offer: ServiceOffer) => {
    setEditing({
      ...offer,
      start_date: offer.start_date ? new Date(offer.start_date).toISOString() : null,
      end_date: offer.end_date ? new Date(offer.end_date).toISOString() : null,
    });
    setImagePreview(offer.image_url || "");
    setImageFile(null);
    setServiceSearch("");
  };

  const startCreating = () => {
    setEditing({ ...emptyOffer });
    setImagePreview("");
    setImageFile(null);
    setServiceSearch("");
  };

  const cancelEditing = () => {
    setEditing(null);
    setImagePreview("");
    setImageFile(null);
    setServiceSearch("");
    setServiceDropdownOpen(false);
  };

  const selectService = (service: ServiceOption) => {
    setEditing((prev) => prev ? { ...prev, service_id: Number(service.id), service_slug: service.slug } : prev);
    setServiceSearch("");
    setServiceDropdownOpen(false);
  };

  const clearService = () => {
    setEditing((prev) => prev ? { ...prev, service_id: null, service_slug: "" } : prev);
    setServiceSearch("");
  };

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!editing?.title || !editing?.title_bn) { toast.error("টাইটেল (ইংরেজি ও বাংলা) আবশ্যক"); return; }
    setIsSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url = editing.id ? `${API_URL}/${editing.id}` : API_URL;
      const payload: Record<string, any> = {
        title: editing.title, title_bn: editing.title_bn,
        description: editing.description || "", description_bn: editing.description_bn || "",
        discount_type: editing.discount_type, discount_value: editing.discount_value,
        service_id: editing.service_id, service_slug: editing.service_slug || null,
        category_id: editing.category_id, offer_code: editing.offer_code || "",
        start_date: editing.start_date, end_date: editing.end_date,
        is_featured: editing.is_featured ? 1 : 0, is_active: editing.is_active ? 1 : 0,
      };
      if (imageFile && imagePreview) payload.image_base64 = imagePreview;
      else if (editing.image_url) payload.image_url = editing.image_url;
      else payload.image_url = "";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { toast.success(editing.id ? "আপডেট হয়েছে" : "নতুন অফার তৈরি হয়েছে"); cancelEditing(); fetchOffers(); }
      else toast.error(data.message || "সেভ করতে সমস্যা হয়েছে");
    } catch (error: any) { toast.error(error.message || "নেটওয়ার্ক সমস্যা"); }
    finally { setIsSaving(false); }
  };

  /* ─── Delete ─── */
  const handleDelete = async (id: number) => {
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("অফার মুছে ফেলা হয়েছে"); fetchOffers(); }
      else toast.error(data.message || "মুছতে সমস্যা হয়েছে");
    } catch (error: any) { toast.error(error.message || "নেটওয়ার্ক সমস্যা"); }
  };

  /* ─── Toggle ─── */
  const toggleActive = async (offer: ServiceOffer) => {
    try {
      const res = await fetch(`${API_URL}/${offer.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...offer, is_active: !offer.is_active, is_featured: offer.is_featured ? 1 : 0 }),
      });
      const data = await res.json();
      if (data.success) { fetchOffers(); toast.success(offer.is_active ? "নিষ্ক্রিয় করা হয়েছে" : "সক্রিয় করা হয়েছে"); }
    } catch { toast.error("আপডেট ব্যর্থ"); }
  };

  const toggleFeatured = async (offer: ServiceOffer) => {
    try {
      const res = await fetch(`${API_URL}/${offer.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...offer, is_featured: !offer.is_featured, is_active: offer.is_active ? 1 : 0 }),
      });
      const data = await res.json();
      if (data.success) { fetchOffers(); toast.success(offer.is_featured ? "ফিচার্ড থেকে সরানো হয়েছে" : "ফিচার্ড করা হয়েছে"); }
    } catch { toast.error("আপডেট ব্যর্থ"); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`কপি হয়েছে: ${code}`);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">স্পেশাল অফার</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            মোট {offers.length}টি অফার
            {hasActiveFilters && (
              <span className="ml-1.5 text-primary font-medium">
                — {filteredOffers.length}টি দেখাচ্ছে
              </span>
            )}
          </p>
        </div>
        <button onClick={startCreating} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> নতুন অফার
        </button>
      </div>

      {/* ── Search Bar & Filter Row ── */}
      <motion.div
        className="flex items-center gap-2.5 flex-wrap"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <div
            className={`
              flex items-center gap-2 rounded-lg border px-3 py-2 bg-background transition-all duration-200
              ${isSearchFocused
                ? "border-primary/60 ring-2 ring-primary/15 shadow-sm"
                : "border-input hover:border-border"
              }
            `}
          >
            <Search className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isSearchFocused ? "text-primary" : "text-muted-foreground/50"}`} />
            <input
              id="admin-offer-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="টাইটেল, কোড, সার্ভিস দিয়ে খুঁজুন..."
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50 min-w-0"
            />
            <AnimatePresence>
              {isSearching && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSearchQuery("")}
                  className="flex items-center justify-center h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors shrink-0"
                  aria-label="সার্চ ক্লিয়ার করুন"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {/* Shortcut hint */}
          {!isSearching && !isSearchFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block"
            >
              <span className="text-[10px] font-medium text-muted-foreground/30 bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                ⌘K
              </span>
            </motion.div>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterDropRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`
              flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap
              ${isFiltering
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-input bg-background text-muted-foreground hover:border-border hover:text-foreground"
              }
            `}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{activeFilterLabel}</span>
            {isFiltering && (
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold">
                {statusFilterOptions.find((f) => f.key === statusFilter)?.count || 0}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showFilterDropdown ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-40 mt-1.5 w-52 rounded-lg border border-border bg-card shadow-xl overflow-hidden"
              >
                <div className="px-2.5 py-2 border-b border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">স্ট্যাটাস ফিল্টার</p>
                </div>
                <div className="py-1">
                  {statusFilterOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setStatusFilter(opt.key);
                        setShowFilterDropdown(false);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-xs transition-colors
                        ${statusFilter === opt.key
                          ? "bg-primary/8 text-primary font-semibold"
                          : "text-foreground hover:bg-muted/60"
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        {statusFilter === opt.key && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {opt.label}
                      </span>
                      <span className={`text-[11px] tabular-nums ${statusFilter === opt.key ? "text-primary/70" : "text-muted-foreground/60"}`}>
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active filters clear button */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap"
            >
              <X className="h-3 w-3" />
              ফিল্টার মুছুন
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Search result summary bar ── */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-border/60" />
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                <span className="font-mono font-semibold text-foreground">"{searchQuery}"</span>
                দিয়ে {filteredOffers.length > 0
                  ? <span className="text-primary font-medium">{filteredOffers.length}টি ফলাফল</span>
                  : <span className="text-destructive font-medium">কোনো ফলাফল নেই</span>
                } পাওয়া গেছে
              </p>
              <div className="h-px flex-1 bg-border/60" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit/Create Form ── */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">{editing.id ? "অফার এডিট করুন" : "নতুন অফার তৈরুন"}</h4>
                <button onClick={cancelEditing} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">অফারের ছবি</label>
                {imagePreview ? (
                  <div className="relative group rounded-xl overflow-hidden border border-border w-full max-w-xs">
                    <img src={imageFile ? imagePreview : getImageUrl(imagePreview)} alt="Preview" className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white rounded-lg shadow-lg hover:bg-slate-50"><Upload className="h-4 w-4 text-slate-700" /></button>
                      <button type="button" onClick={removeImage} className="p-2 bg-red-500 rounded-lg shadow-lg hover:bg-red-600"><X className="h-4 w-4 text-white" /></button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full max-w-xs h-28 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group">
                    <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20"><ImageIcon className="h-5 w-5 text-primary" /></div>
                    <p className="text-xs font-medium text-muted-foreground">ছবি আপলোড করুন</p>
                    <p className="text-[10px] text-muted-foreground/70">PNG, JPG, WebP • ৫MB</p>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageSelect} className="hidden" />
                {imageFile && <p className="text-[10px] text-muted-foreground mt-1">{imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)</p>}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Title (English) *</label>
                  <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">টাইটেল (বাংলা) *</label>
                  <input value={editing.title_bn || ""} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Description (English)</label>
                  <input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">বিবরণ (বাংলা)</label>
                  <input value={editing.description_bn || ""} onChange={(e) => setEditing({ ...editing, description_bn: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">ডিসকাউন্ট টাইপ</label>
                  <select value={editing.discount_type || "percentage"} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as "percentage" | "fixed" })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">ডিসকাউন্ট মান</label>
                  <input type="number" min="0" value={editing.discount_value || 0} onChange={(e) => setEditing({ ...editing, discount_value: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">অফার কোড</label>
                  <input value={editing.offer_code || ""} onChange={(e) => setEditing({ ...editing, offer_code: e.target.value.toUpperCase() })} placeholder="যেমন: AC20" className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">শুরুর তারিখ</label>
                  <input type="datetime-local" value={fmtDateTime(editing.start_date)} onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">শেষের তারিখ</label>
                  <input type="datetime-local" value={fmtDateTime(editing.end_date)} onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>

              {/* Service Selector */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">লিংকড সার্ভিস <span className="text-muted-foreground/60">(ক্লিকে যেতে এই সার্ভিসে যাবে)</span></label>
                <div className="relative" ref={serviceDropRef}>
                  {editing.service_id && selectedServiceLabel ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{selectedServiceLabel}</p>
                        {editing.service_slug && <p className="text-[10px] text-muted-foreground font-mono truncate">/service/{editing.service_slug}</p>}
                      </div>
                      <button type="button" onClick={clearService} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="সরান"><X className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { setServiceDropdownOpen(!serviceDropdownOpen); setServiceSearch(""); }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="পরিবর্তন"><Edit2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setServiceDropdownOpen(true); }} className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-all cursor-pointer">
                      <Search className="h-4 w-4 shrink-0" /><span>সার্ভিস খুঁজুন ও নির্বাচন করুন…</span>
                    </button>
                  )}
                  <AnimatePresence>
                    {serviceDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 mt-1 w-full max-h-52 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                        <div className="sticky top-0 bg-card border-b z-100 border-border px-2 py-1.5">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input type="text" value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="সার্ভিস খুঁজুন…" className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" autoFocus />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-40">
                          {loadingServices ? (
                            <div className="flex items-center justify-center gap-2 py-5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="text-xs">লোড হচ্ছে…</span></div>
                          ) : filteredServices.length === 0 ? (
                            <div className="py-5 text-center text-xs text-muted-foreground">কোনো সার্ভিস পাওয়া যায়নি</div>
                          ) : (
                            filteredServices.map((s) => (
                              <button key={s.id} type="button" onClick={() => selectService(s)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-primary/5 transition-colors border-b border-border/50 last:border-b-0">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">{s.title}</p>
                                  {s.title_en && s.title_en !== s.title && <p className="text-[10px] text-muted-foreground truncate">{s.title_en}</p>}
                                  <p className="text-[10px] font-mono text-primary/70 truncate">{s.slug}</p>
                                </div>
                                {String(s.id) === String(editing?.service_id) && <span className="shrink-0 text-[10px] font-semibold text-primary">✓</span>}
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Checkboxes + Save */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="h-4 w-4 rounded" />
                    সক্রিয়
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} className="h-4 w-4 rounded" />
                    ফিচার্ড
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                  </button>
                  <button onClick={cancelEditing} disabled={isSaving} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground hover:bg-secondary disabled:opacity-50">
                    <X className="h-3.5 w-3.5" /> বাতিল
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      {filteredOffers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-16 border border-dashed rounded-xl"
        >
          {hasActiveFilters ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                কোনো অফার পাওয়া যায়নি
              </p>
              <p className="text-xs text-muted-foreground/70 mb-5 max-w-xs mx-auto">
                "{searchQuery}" দিয়ে কোনো মিল পাওয়া যায়নি। অনুগ্রহ করে ভিন্ন কিছু লিখে দেখুন অথবা ফিল্টার পরিবর্তন করুন।
              </p>
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                সব ফিল্টার মুছুন
              </button>
            </>
          ) : (
            <>
              <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">কোনো অফার পাওয়া যায়নি</p>
            </>
          )}
        </motion.div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">অফার</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ডিসকাউন্ট</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">সার্ভিস</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">কোড</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">সময়সূচী</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">স্ট্যাটাস</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-20">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((o, idx) => {
                const linkedService = o.service_slug ? services.find((s) => s.slug === o.service_slug) : o.service_id ? services.find((s) => String(s.id) === String(o.service_id)) : null;
                const serviceLabel = linkedService ? (linkedService.title_en || linkedService.title) : o.service_slug || "";
                const isExpired = o.end_date && new Date(o.end_date) < new Date();

                return (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`border-b border-border/60 last:border-b-0 transition-colors hover:bg-muted/30 ${!o.is_active ? "opacity-50" : ""}`}
                  >
                    {/* Offer info */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                          {o.image_url ? (
                            <img src={getImageUrl(o.image_url)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[160px]">{o.title_bn || o.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {o.is_featured && <span className="text-[9px] px-1 py-px bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-0.5"><Star className="h-2 w-2" />ফিচার্ড</span>}
                            {!o.is_active && <span className="text-[9px] px-1 py-px bg-red-50 text-red-600 rounded">নিষ্ক্রিয়</span>}
                            {isExpired && o.is_active && <span className="text-[9px] px-1 py-px bg-orange-50 text-orange-600 rounded">মেয়াদ উত্তীর্ণ</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        <Tag className="h-3 w-3" />
                        {o.discount_value}{o.discount_type === "percentage" ? "%" : "৳"}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="px-3 py-3">
                      {o.service_slug ? (
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-foreground truncate max-w-[130px]" title={serviceLabel}>{serviceLabel || o.service_slug}</p>
                            <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{o.service_slug}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Offer code */}
                    <td className="px-3 py-3 text-center">
                      {o.offer_code ? (
                        <button onClick={() => copyCode(o.offer_code)} className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-foreground bg-muted hover:bg-secondary px-2 py-0.5 rounded cursor-pointer transition-colors" title="কপি করুন">
                          {o.offer_code}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground">
                        {o.start_date && <span className="flex items-center gap-0.5"><span className="text-green-600 font-medium">শুরু:</span> {fmtDate(o.start_date)}</span>}
                        {o.end_date && (
                          <span className="flex items-center gap-0.5">
                            <span className={`${isExpired ? "text-red-500" : "text-orange-600"} font-medium`}>
                              শেষ:
                            </span>
                            {fmtDate(o.end_date)}
                          </span>
                        )}
                        {!o.start_date && !o.end_date && <span>—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleActive(o)} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors" style={{ background: o.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: o.is_active ? "#16a34a" : "#dc2626" }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        {o.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => toggleFeatured(o)} className={`p-1.5 rounded-lg transition-colors ${o.is_featured ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-muted-foreground hover:bg-secondary"}`} title={o.is_featured ? "ফিচার্ড থেকে সরান" : "ফিচার্ড করুন"}>
                          <Star className={`h-3.5 w-3.5 ${o.is_featured ? "fill-current" : ""}`} />
                        </button>
                        <button onClick={() => startEditing(o)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="এডিট করুন">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(o.id!)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="মুছুন">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Table Footer with count ── */}
          {hasActiveFilters && filteredOffers.length > 0 && (
            <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {isSearching && (
                  <span>
                    <span className="font-mono">"{searchQuery}"</span> এর জন্য{" "}
                  </span>
                )}
                <span className="font-semibold text-foreground">{filteredOffers.length}</span>টি দেখাচ্ছে
                {isFiltering && statusFilter !== "all" && (
                  <span className="ml-1.5">
                    (<span className="text-primary">{activeFilterLabel}</span>)
                  </span>
                )}
              </p>
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                ফিল্টার মুছুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-xl border border-border p-6 w-full max-w-sm mx-4 shadow-2xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-3">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-center text-sm font-bold text-foreground mb-1">মুছে ফেলতে চান?</h3>
              <p className="text-center text-xs text-muted-foreground mb-5">এই অফারটি মুছে ফেললে পুনরায় পাওয়া যাবে না।</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">বাতিল</button>
                <button onClick={() => handleDelete(deleteTarget)} className="flex-1 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-white hover:bg-destructive/90 transition-colors">মুছুন</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOffers;