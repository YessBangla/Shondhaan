import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useCmsServices, useCmsCategories, useCmsPackages, CmsService, CmsServicePackage } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

// Helper function to generate slug from string
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")       // Replace spaces with -
    .replace(/[^\w\-]+/g, "")   // Remove all non-word chars
    .replace(/\-\-+/g, "-");    // Replace multiple - with single -
};

// Predefined list of cities for the dropdown
const CITY_OPTIONS = [
  "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barishal", 
  "Rangpur", "Mymensingh", "Comilla", "Gazipur", "Narayanganj", "Bogura"
];

// Helper to fix relative image URLs coming from the backend
const getStaticBaseUrl = () => {
  try {
    return new URL(INDIVIDUAL_API_BASE_URL).origin;
  } catch {
    return INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  }
};
const STATIC_BASE_URL = getStaticBaseUrl();

const getImageSrc = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${STATIC_BASE_URL}${path}`;
};

// Set numbers to undefined so inputs start empty instead of showing 0
const empty: any = {
  slug: "", title: "", title_en: "", image_url: "", description: "",
  rating: undefined, total_reviews: undefined, total_orders: undefined, price: undefined,
  features: [], available_cities: [], category_id: null, is_active: true, sort_order: undefined,
  platform_fee: undefined, commission_percent: undefined,
};

const labelClass = "mb-1 block text-xs font-semibold text-muted-foreground";
const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";
const smallInputClass = "w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring";

const AdminServices = () => {
  const { data: services = [], isLoading, upsert, remove } = useCmsServices();
  const { data: categories = [] } = useCmsCategories();
  const [editing, setEditing] = useState<Partial<CmsService> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [showCitiesDropdown, setShowCitiesDropdown] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = editing ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [editing]);

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCitiesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const startEdit = (s?: CmsService) => {
    const item: any = s ? { ...s } : { ...empty };
    
    // Convert 0 to undefined so inputs don't start with 0, making it easier to type a new number
    ["price", "total_reviews", "total_orders", "sort_order", "platform_fee"].forEach(key => {
      if (item[key] === 0) item[key] = undefined;
    });
    
    setEditing({ ...item });
    setFeaturesText(Array.isArray(item.features) ? (item.features as string[]).join(", ") : "");
    setShowCitiesDropdown(false);
  };

  const toggleCity = (city: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const currentCities = prev.available_cities || [];
      const newCities = currentCities.includes(city)
        ? currentCities.filter(c => c !== city)
        : [...currentCities, city];
      return { ...prev, available_cities: newCities };
    });
  };

  const handleSave = () => {
    if (!editing?.title || !editing?.slug) { toast.error("টাইটেল ও স্লাগ আবশ্যক"); return; }
    
    // Convert string inputs to numbers on save
    const payload = {
      ...editing,
      price: editing.price !== undefined && editing.price !== "" ? Number(editing.price) : 0,
      platform_fee: (editing as any).platform_fee !== undefined && (editing as any).platform_fee !== "" ? Number((editing as any).platform_fee) : 0,
      commission_percent: (editing as any).commission_percent !== undefined && (editing as any).commission_percent !== "" ? Number((editing as any).commission_percent) : 10,
      rating: editing.rating !== undefined && editing.rating !== "" ? Number(editing.rating) : 4.5,
      total_reviews: editing.total_reviews !== undefined && editing.total_reviews !== "" ? Number(editing.total_reviews) : 0,
      total_orders: editing.total_orders !== undefined && editing.total_orders !== "" ? Number(editing.total_orders) : 0,
      sort_order: editing.sort_order !== undefined && editing.sort_order !== "" ? Number(editing.sort_order) : 0,
      features: featuresText.split(",").map(s => s.trim()).filter(Boolean),
      available_cities: editing.available_cities || [],
    };
    
    upsert.mutate(payload as any, {
      onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">সেবা ম্যানেজমেন্ট ({services.length})</h3>
        <button onClick={() => startEdit()} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন সেবা
        </button>
      </div>

      {/* Modal Form rendered via Portal to escape parent overflow constraints */}
      {editing && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between bg-card p-4 border-b border-border">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {editing.id ? "সেবা এডিট করুন" : "নতুন সেবা যোগ করুন"}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>টাইটেল (বাংলা) *</label>
                  <input value={editing.title || ""} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="যেমন: এসি সার্ভিস" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title (English)</label>
                  <input 
                    value={editing.title_en || ""} 
                    onChange={e => {
                      const newTitleEn = e.target.value;
                      setEditing(prev => prev ? ({ ...prev, title_en: newTitleEn, slug: slugify(newTitleEn) }) : prev);
                    }} 
                    placeholder="e.g. AC Service" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>স্লাগ *</label>
                  <input 
                    value={editing.slug || ""} 
                    onChange={e => setEditing({...editing, slug: e.target.value})} 
                    placeholder="auto-generated-from-english-title" 
                    className={inputClass} 
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">English নাম লিখলে অটোমেটিক স্লাগ তৈরি হবে। প্রয়োজনে এডিট করতে পারবেন।</p>
                </div>
                <div>
                  <label className={labelClass}>ক্যাটেগরি</label>
                  <select value={editing.category_id || ""} onChange={e => setEditing({...editing, category_id: e.target.value || null})} className={inputClass}>
                    <option value="">ক্যাটেগরি নির্বাচন</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <ImageUploader value={editing.image_url || ""} onChange={(v) => setEditing({...editing, image_url: v})} folder="services" label="সেবার ছবি" />
              
              <div>
                <label className={labelClass}>বিবরণ</label>
                <textarea value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="সেবার সংক্ষিপ্ত বিবরণ লিখুন" rows={3} className={inputClass} />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <label className={labelClass}>বেস প্রাইস</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      value={(editing as any).price ?? ""} 
                      onChange={e => setEditing({...editing, price: e.target.value} as any)} 
                      placeholder="0" 
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>রেটিং</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={editing.rating ?? ""} 
                    onChange={e => setEditing({...editing, rating: e.target.value} as any)} 
                    placeholder="4.5" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>মোট রিভিউ</label>
                  <input 
                    type="number" 
                    value={editing.total_reviews ?? ""} 
                    onChange={e => setEditing({...editing, total_reviews: e.target.value} as any)} 
                    placeholder="0" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>মোট অর্ডার</label>
                  <input 
                    type="number" 
                    value={editing.total_orders ?? ""} 
                    onChange={e => setEditing({...editing, total_orders: e.target.value} as any)} 
                    placeholder="0" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>কমিশন</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0" 
                      max="100" 
                      value={(editing as any).commission_percent ?? ""} 
                      onChange={e => setEditing({...editing, commission_percent: e.target.value} as any)} 
                      placeholder="10" 
                      className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Platform Fee</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="1" 
                      min="0" 
                      value={(editing as any).platform_fee ?? ""} 
                      onChange={e => setEditing({...editing, platform_fee: e.target.value} as any)} 
                      placeholder="0" 
                      className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>ফিচারসমূহ</label>
                <input value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="কমা দিয়ে লিখুন: দ্রুত সার্ভিস, অভিজ্ঞ টেকনিশিয়ান" className={inputClass} />
              </div>
              
              {/* Multi-select Cities Dropdown */}
              <div className="relative" ref={cityDropdownRef}>
                <label className={labelClass}>সেবা পাওয়া যাবে যে শহরে</label>
                <button
                  type="button"
                  onClick={() => setShowCitiesDropdown(!showCitiesDropdown)}
                  className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={`truncate ${editing.available_cities?.length ? "text-foreground" : "text-muted-foreground"}`}>
                    {editing.available_cities?.length 
                      ? editing.available_cities.join(", ") 
                      : "শহর নির্বাচন করুন"}
                  </span>
                  <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${showCitiesDropdown ? "rotate-180" : ""}`} />
                </button>
                {showCitiesDropdown && (
                  <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg p-1">
                    {CITY_OPTIONS.map(city => (
                      <label
                        key={city}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={editing.available_cities?.includes(city) || false}
                          onChange={() => toggleCity(city)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span>{city}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pb-2">
                  <input 
                    type="checkbox" 
                    checked={editing.is_active ?? true} 
                    onChange={e => setEditing({...editing, is_active: e.target.checked})} 
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  /> 
                  সক্রিয় করুন
                </label>
                <div className="flex-1 min-w-[100px]">
                  <label className={labelClass}>ক্রম (Sort Order)</label>
                  <input 
                    type="number" 
                    value={editing.sort_order ?? ""} 
                    onChange={e => setEditing({...editing, sort_order: e.target.value} as any)} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 bg-card p-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                বাতিল
              </button>
              <button onClick={handleSave} disabled={upsert.isPending} className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {upsert.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Services List */}
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {s.image_url && <img src={getImageSrc(s.image_url)} alt={s.title} className="h-10 w-10 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">/{s.slug} • {s.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                  {expandedId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {expandedId === s.id && <PackageManager serviceId={s.id} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const PackageManager = ({ serviceId }: { serviceId: string }) => {
  const { data: packages = [], upsert, remove } = useCmsPackages(serviceId);
  const [editing, setEditing] = useState<Partial<CmsServicePackage> | null>(null);
  const [featText, setFeatText] = useState("");

  const startEdit = (p?: CmsServicePackage) => {
    const item: any = p ? { ...p } : { service_id: serviceId, name: "", price: undefined, original_price: null, features: [], sort_order: 0 };
    
    // Convert 0 to undefined so inputs don't start with 0
    if (item.price === 0) item.price = undefined;
    if (item.original_price === 0) item.original_price = null;
    
    setEditing({ ...item });
    setFeatText(Array.isArray(item.features) ? (item.features as string[]).join(", ") : "");
  };
  
  const handleSave = () => {
    if (!editing?.name) return;
    upsert.mutate({ 
      ...editing, 
      price: editing.price !== undefined && editing.price !== "" ? Number(editing.price) : 0,
      original_price: editing.original_price !== undefined && editing.original_price !== "" ? Number(editing.original_price) : null,
      features: featText.split(",").map(s => s.trim()).filter(Boolean) 
    } as any, {
      onSuccess: () => { toast.success("প্যাকেজ সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="border-t border-border bg-secondary/20 px-3 pb-3 pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">প্যাকেজসমূহ ({packages.length})</p>
        <button onClick={() => startEdit()} className="text-[10px] text-primary font-medium flex items-center gap-1">
          <Plus className="h-3 w-3" /> নতুন প্যাকেজ
        </button>
      </div>
      {editing && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-card p-3 space-y-2 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>প্যাকেজ নাম *</label>
              <input value={editing.name || ""} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="যেমন: Basic" className={smallInputClass} />
            </div>
            <div>
              <label className={labelClass}>দাম *</label>
              <input 
                type="number" 
                value={editing.price ?? ""} 
                onChange={e => setEditing({...editing, price: e.target.value} as any)} 
                placeholder="500" 
                className={smallInputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>আগের দাম</label>
              <input 
                type="number" 
                value={editing.original_price ?? ""} 
                onChange={e => setEditing({...editing, original_price: e.target.value === "" ? null : e.target.value} as any)} 
                placeholder="800" 
                className={smallInputClass} 
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>প্যাকেজ ফিচার</label>
            <input value={featText} onChange={e => setFeatText(e.target.value)} placeholder="কমা দিয়ে লিখুন" className={smallInputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-[11px] text-primary-foreground"><Save className="h-3 w-3" /> সেভ</button>
            <button onClick={() => setEditing(null)} className="flex items-center gap-1 rounded border px-3 py-1.5 text-[11px]"><X className="h-3 w-3" /> বাতিল</button>
          </div>
        </div>
      )}
      {packages.length === 0 && !editing && (
        <p className="text-[11px] text-muted-foreground text-center py-2">কোনো প্যাকেজ নেই। নতুন প্যাকেজ যোগ করুন।</p>
      )}
      {packages.map(p => (
        <div key={p.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 mb-1.5">
          <span className="text-xs text-foreground font-medium">{p.name} — ৳{p.price} {p.original_price && <span className="line-through text-muted-foreground ml-1">৳{p.original_price}</span>}</span>
          <div className="flex gap-1">
            <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-secondary"><Edit2 className="h-3 w-3" /></button>
            <button onClick={() => remove.mutate(p.id)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminServices;