import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useCmsHeroBanners, CmsHeroBanner } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";

const empty: Partial<CmsHeroBanner> = {
  title_bn: "", title_en: "", subtitle_bn: "", subtitle_en: "", image_url: "", is_active: true, sort_order: 0,
};

const AdminBanners = () => {
  const { data: banners = [], isLoading, upsert, remove } = useCmsHeroBanners();
  const [editing, setEditing] = useState<Partial<CmsHeroBanner> | null>(null);

  const handleSave = () => {
    if (!editing?.title_bn) { toast.error("টাইটেল আবশ্যক"); return; }
    upsert.mutate(editing as any, {
      onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">হিরো ব্যানার ({banners.length})</h3>
        <button onClick={() => setEditing({...empty})} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন ব্যানার
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.title_bn || ""} onChange={e => setEditing({...editing, title_bn: e.target.value})} placeholder="টাইটেল (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={editing.title_en || ""} onChange={e => setEditing({...editing, title_en: e.target.value})} placeholder="Title (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={editing.subtitle_bn || ""} onChange={e => setEditing({...editing, subtitle_bn: e.target.value})} placeholder="সাবটাইটেল (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.subtitle_en || ""} onChange={e => setEditing({...editing, subtitle_en: e.target.value})} placeholder="Subtitle (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <ImageUploader value={editing.image_url || ""} onChange={(v) => setEditing({...editing, image_url: v})} folder="banners" label="ব্যানার ছবি" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({...editing, is_active: e.target.checked})} /> সক্রিয়
            </label>
            <input type="number" value={editing.sort_order || 0} onChange={e => setEditing({...editing, sort_order: parseInt(e.target.value)})} className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs" placeholder="ক্রম" />
          </div>
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
        {banners.map(b => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {b.image_url && <img src={b.image_url} alt={b.title_bn} className="h-12 w-20 rounded-lg object-cover" />}
              <div>
                <p className="text-sm font-medium text-foreground">{b.title_bn}</p>
                <p className="text-[10px] text-muted-foreground">{b.subtitle_bn} • {b.is_active ? "✅" : "❌"}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({...b})} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(b.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBanners;
