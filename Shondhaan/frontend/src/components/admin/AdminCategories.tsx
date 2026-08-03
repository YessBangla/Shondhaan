import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useCmsCategories, CmsCategory } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";

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

const handleSave = () => {
  if (!editing?.name) { toast.error("নাম আবশ্যক"); return; }

  console.log("Submitting category payload:", editing);
  console.log("JSON payload:", JSON.stringify(editing, null, 2));

  upsert.mutate(editing as any, {
    onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
    onError: (e: any) => {
      console.error("Category save failed:", e);
      toast.error(e.message);
    },
  });
};

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">ক্যাটেগরি ম্যানেজমেন্ট ({categories.length})</h3>
        <button onClick={() => setEditing({...empty})} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন ক্যাটেগরি
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.name || ""} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="নাম (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={editing.name_en || ""} onChange={e => setEditing({...editing, name_en: e.target.value})} placeholder="Name (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <ImageUploader value={editing.icon_url || ""} onChange={(v) => setEditing({...editing, icon_url: v})} folder="categories" label="ক্যাটেগরি আইকন" />
          <input type="number" value={editing.sort_order || 0} onChange={e => setEditing({...editing, sort_order: parseInt(e.target.value)})} placeholder="ক্রম" className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          <div>
            <p className="text-xs font-medium text-foreground mb-2">কালার প্রিসেট:</p>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map(p => (
                <button key={p.label} onClick={() => setEditing({...editing, color_gradient: p.gradient, color_accent: p.accent})}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r ${p.gradient} ${editing.color_gradient === p.gradient ? "ring-2 ring-ring ring-offset-2" : ""}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({...editing, is_active: e.target.checked})} /> সক্রিয়
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={upsert.isPending} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> সেভ
            </button>
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground">
              <X className="h-3.5 w-3.5" /> বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {/* <div className={`h-8 w-8 rounded-lg bg-gradient-to-r ${c.color_gradient} flex items-center justify-center`}> */}
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center`}>
                {c.icon_url ? (
                  <img
                    src={
                      /^https?:\/\//i.test(c.icon_url)
                        ? c.icon_url
                        : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${c.icon_url}`
                    }
                    alt={c.name}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <span className="text-white text-xs font-bold">{c.name[0]}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.name_en} • ক্রম: {c.sort_order} • {c.is_active ? "✅" : "❌"}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({...c})} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(c.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;
