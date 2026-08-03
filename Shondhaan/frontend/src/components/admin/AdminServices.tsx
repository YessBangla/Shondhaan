import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { useCmsServices, useCmsCategories, useCmsPackages, CmsService, CmsServicePackage } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";

const empty: Partial<CmsService> = {
  slug: "", title: "", title_en: "", image_url: "", description: "",
  rating: 4.5, total_reviews: 0, total_orders: 0,
  features: [], available_cities: [], category_id: null, is_active: true, sort_order: 0,
  platform_fee: 0,
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
  const [citiesText, setCitiesText] = useState("");

  const startEdit = (s?: CmsService) => {
    const item = s || empty;
    setEditing({ ...item });
    setFeaturesText(Array.isArray(item.features) ? (item.features as string[]).join(", ") : "");
    setCitiesText(Array.isArray(item.available_cities) ? (item.available_cities as string[]).join(", ") : "");
  };

  const handleSave = () => {
    if (!editing?.title || !editing?.slug) { toast.error("টাইটেল ও স্লাগ আবশ্যক"); return; }
    const payload = {
      ...editing,
      features: featuresText.split(",").map(s => s.trim()).filter(Boolean),
      available_cities: citiesText.split(",").map(s => s.trim()).filter(Boolean),
    };
    upsert.mutate(payload as any, {
      onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">সেবা ম্যানেজমেন্ট ({services.length})</h3>
        <button onClick={() => startEdit()} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন সেবা
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>টাইটেল (বাংলা) *</label>
              <input value={editing.title || ""} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="যেমন: এসি সার্ভিস" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Title (English)</label>
              <input value={editing.title_en || ""} onChange={e => setEditing({...editing, title_en: e.target.value})} placeholder="e.g. AC Service" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>স্লাগ *</label>
              <input value={editing.slug || ""} onChange={e => setEditing({...editing, slug: e.target.value})} placeholder="e.g. ac-service" className={inputClass} />
              <p className="mt-1 text-[10px] text-muted-foreground">URL এ ব্যবহার হবে। Space দিবেন না। Example: plumbing</p>
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
            <textarea value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="সেবার সংক্ষিপ্ত বিবরণ লিখুন" rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label className={labelClass}>রেটিং</label>
              <input type="number" step="0.1" value={editing.rating || 0} onChange={e => setEditing({...editing, rating: parseFloat(e.target.value)})} placeholder="4.5" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>মোট রিভিউ</label>
              <input type="number" value={editing.total_reviews || 0} onChange={e => setEditing({...editing, total_reviews: parseInt(e.target.value)})} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>মোট অর্ডার</label>
              <input type="number" value={editing.total_orders || 0} onChange={e => setEditing({...editing, total_orders: parseInt(e.target.value)})} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>কমিশন</label>
              <div className="relative">
                <input type="number" step="0.5" min="0" max="100" value={(editing as any).commission_percent ?? 10} onChange={e => setEditing({...editing, commission_percent: parseFloat(e.target.value)} as any)} placeholder="10" className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Platform Fee</label>
              <div className="relative">
                <input type="number" step="1" min="0" value={(editing as any).platform_fee ?? 0} onChange={e => setEditing({...editing, platform_fee: parseFloat(e.target.value) || 0} as any)} placeholder="0" className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>ফিচারসমূহ</label>
            <input value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="কমা দিয়ে লিখুন: দ্রুত সার্ভিস, অভিজ্ঞ টেকনিশিয়ান" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>সেবা পাওয়া যাবে যে শহরে</label>
            <input value={citiesText} onChange={e => setCitiesText(e.target.value)} placeholder="কমা দিয়ে লিখুন: dhaka, chittagong, sylhet" className={inputClass} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({...editing, is_active: e.target.checked})} /> সক্রিয়
            </label>
            <div>
              <label className={labelClass}>ক্রম</label>
              <input type="number" value={editing.sort_order || 0} onChange={e => setEditing({...editing, sort_order: parseInt(e.target.value)})} className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={upsert.isPending} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> সেভ করুন
            </button>
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground">
              <X className="h-3.5 w-3.5" /> বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {s.image_url && (
                    <img
                      src={
                        /^https?:\/\//i.test(s.image_url)
                          ? s.image_url
                          : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${s.image_url}`
                      }
                      alt={s.title}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
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
    const item = p || { service_id: serviceId, name: "", price: 0, original_price: null, features: [], sort_order: 0 };
    setEditing({ ...item });
    setFeatText(Array.isArray(item.features) ? (item.features as string[]).join(", ") : "");
  };

const handleSave = () => {
  if (!editing?.name) { toast.error("প্যাকেজ নাম আবশ্যক"); return; }

  const payload = { ...editing, features: featText.split(",").map(s => s.trim()).filter(Boolean) };

  console.warn("🔥 PACKAGE PAYLOAD:", payload);

  upsert.mutate(payload as any, {
    onSuccess: () => { toast.success("প্যাকেজ সেভ হয়েছে"); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
};
  return (
    <div className="border-t border-border px-3 pb-3 pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">প্যাকেজসমূহ ({packages.length})</p>
        <button onClick={() => startEdit()} className="text-[10px] text-primary font-medium">+ নতুন প্যাকেজ</button>
      </div>
      {editing && (
        <div className="mb-2 rounded-lg border border-primary/20 p-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>প্যাকেজ নাম *</label>
              <input value={editing.name || ""} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="যেমন: Basic" className={smallInputClass} />
            </div>
            <div>
              <label className={labelClass}>দাম *</label>
              <input type="number" value={editing.price || 0} onChange={e => setEditing({...editing, price: parseInt(e.target.value)})} placeholder="500" className={smallInputClass} />
            </div>
            <div>
              <label className={labelClass}>আগের দাম</label>
              <input type="number" value={editing.original_price || ""} onChange={e => setEditing({...editing, original_price: e.target.value ? parseInt(e.target.value) : null})} placeholder="800" className={smallInputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>প্যাকেজ ফিচার</label>
            <input value={featText} onChange={e => setFeatText(e.target.value)} placeholder="কমা দিয়ে লিখুন" className={smallInputClass} />
          </div>
          <div className="flex gap-1">
            <button onClick={handleSave} className="rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">সেভ</button>
            <button onClick={() => setEditing(null)} className="rounded border px-2 py-1 text-[10px]">বাতিল</button>
          </div>
        </div>
      )}
      {packages.map(p => (
        <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-2 py-1.5 mb-1">
          <span className="text-xs text-foreground">{p.name} — ৳{p.price} {p.original_price && <span className="line-through text-muted-foreground">৳{p.original_price}</span>}</span>
          <div className="flex gap-1">
            <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3 w-3" /></button>
            <button onClick={() => remove.mutate(p.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminServices;
