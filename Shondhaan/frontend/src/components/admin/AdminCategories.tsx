import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useCmsCategories, CmsCategory } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

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

const empty: Partial<CmsCategory> = {
  name: "", name_en: "", icon_url: "", color_gradient: "from-blue-600 to-blue-800",
  color_overlay: "from-blue-900/80 to-blue-700/40", color_chip_bg: "bg-blue-500/15",
  color_chip_text: "text-blue-700", color_accent: "#2563eb", sort_order: 0, is_active: true,
};

const colorPresets = [
  { label: "নীল", gradient: "from-blue-600 to-blue-800", accent: "#2563eb" },
  { label: "সবুজ", gradient: "from-emerald-600 to-emerald-800", accent: "#059669" },
  { label: "কমলা", gradient: "from-orange-600 to-orange-800", accent: "#ea580c" },
  { label: "গোলাপী", gradient: "from-pink-600 to-pink-800", accent: "#db2777" },
  { label: "বেগুনী", gradient: "from-violet-600 to-violet-800", accent: "#7c3aed" },
  { label: "হলুদ", gradient: "from-amber-600 to-amber-800", accent: "#d97706" },
  { label: "লাল", gradient: "from-red-600 to-red-800", accent: "#dc2626" },
  { label: "নীলচে", gradient: "from-teal-600 to-teal-800", accent: "#0d9488" },
];

const AdminCategories = () => {
  const { data: categories = [], isLoading, upsert, remove } = useCmsCategories();
  const [editing, setEditing] = useState<Partial<CmsCategory> | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = editing ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [editing]);

  const handleSave = () => {
    if (!editing?.name) { toast.error("নাম আবশ্যক"); return; }
    
    const payload = {
      ...editing,
      sort_order: editing.sort_order !== undefined && editing.sort_order !== "" ? Number(editing.sort_order) : 0,
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
        <h3 className="font-heading text-lg font-bold text-foreground">ক্যাটেগরি ম্যানেজমেন্ট ({categories.length})</h3>
        <button onClick={() => setEditing({...empty})} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন ক্যাটেগরি
        </button>
      </div>

      {/* Modal Form rendered via Portal to escape parent overflow constraints */}
      {editing && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between bg-card p-4 border-b border-border">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {editing.id ? "ক্যাটেগরি এডিট করুন" : "নতুন ক্যাটেগরি যোগ করুন"}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">নাম (বাংলা) *</label>
                  <input 
                    value={editing.name || ""} 
                    onChange={e => setEditing({...editing, name: e.target.value})} 
                    placeholder="যেমন: এসি সার্ভিস" 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name (English)</label>
                  <input 
                    value={editing.name_en || ""} 
                    onChange={e => setEditing({...editing, name_en: e.target.value})} 
                    placeholder="e.g. AC Service" 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" 
                  />
                </div>
              </div>

              <ImageUploader value={editing.icon_url || ""} onChange={(v) => setEditing({...editing, icon_url: v})} folder="categories" label="ক্যাটেগরি আইকন" />
              
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">কালার প্রিসেট</label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map(p => (
                    <button 
                      key={p.label} 
                      onClick={() => setEditing({...editing, color_gradient: p.gradient, color_accent: p.accent})}
                      className={`rounded-lg px-4 py-2 text-xs font-medium text-white bg-gradient-to-r ${p.gradient} transition-transform hover:scale-105 ${editing.color_gradient === p.gradient ? "ring-2 ring-ring ring-offset-2" : ""}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">ক্রম (Sort Order)</label>
                  <input 
                    type="number" 
                    value={editing.sort_order ?? ""} 
                    onChange={e => setEditing({...editing, sort_order: e.target.value === "" ? "" : parseInt(e.target.value)})} 
                    placeholder="0" 
                    className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" 
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pb-2">
                  <input 
                    type="checkbox" 
                    checked={editing.is_active ?? true} 
                    onChange={e => setEditing({...editing, is_active: e.target.checked})} 
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  /> 
                  সক্রিয় করুন
                </label>
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

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${c.color_gradient} flex items-center justify-center shadow-sm`}>
                {/* FIXED: Applied getImageSrc here */}
                {c.icon_url ? <img src={getImageSrc(c.icon_url)} alt={c.name} className="h-6 w-6 object-contain" /> : <span className="text-white text-sm font-bold">{c.name[0]}</span>}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.name_en || "—"} • ক্রম: {c.sort_order} • {c.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({...c})} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(c.id); }} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;