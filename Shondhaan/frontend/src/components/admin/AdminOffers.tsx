import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useCmsOffers, CmsSpecialOffer } from "@/hooks/useCmsData";
import { toast } from "sonner";

const empty: Partial<CmsSpecialOffer> = {
  title_bn: "", title_en: "", discount_bn: "", discount_en: "", description_bn: "", description_en: "",
  service_slug: "", badge: "🔥", gradient: "from-orange-500/15 to-red-500/10",
  border_color: "border-orange-500/20", accent_color: "text-orange-600", bg_accent: "bg-orange-500/10",
  is_active: true, expires_at: null, sort_order: 0,
};

const AdminOffers = () => {
  const { data: offers = [], isLoading, upsert, remove } = useCmsOffers();
  const [editing, setEditing] = useState<Partial<CmsSpecialOffer> | null>(null);

  const handleSave = () => {
    if (!editing?.title_bn || !editing?.discount_bn) { toast.error("টাইটেল ও ডিসকাউন্ট আবশ্যক"); return; }
    upsert.mutate(editing as any, {
      onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">স্পেশাল অফার ({offers.length})</h3>
        <button onClick={() => setEditing({...empty})} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন অফার
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.title_bn || ""} onChange={e => setEditing({...editing, title_bn: e.target.value})} placeholder="টাইটেল (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={editing.title_en || ""} onChange={e => setEditing({...editing, title_en: e.target.value})} placeholder="Title (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={editing.discount_bn || ""} onChange={e => setEditing({...editing, discount_bn: e.target.value})} placeholder="ডিসকাউন্ট (বাংলা, যেমন: ২০% ছাড়)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.discount_en || ""} onChange={e => setEditing({...editing, discount_en: e.target.value})} placeholder="Discount (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.description_bn || ""} onChange={e => setEditing({...editing, description_bn: e.target.value})} placeholder="বিবরণ (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.description_en || ""} onChange={e => setEditing({...editing, description_en: e.target.value})} placeholder="Description (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.service_slug || ""} onChange={e => setEditing({...editing, service_slug: e.target.value})} placeholder="সার্ভিস স্লাগ (e.g. ac-service)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.badge || ""} onChange={e => setEditing({...editing, badge: e.target.value})} placeholder="ব্যাজ ইমোজি" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          </div>
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
        {offers.map(o => (
          <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{o.badge} {o.title_bn} — <span className="text-primary font-bold">{o.discount_bn}</span></p>
              <p className="text-[10px] text-muted-foreground">{o.service_slug || "কোনো সার্ভিস নেই"} • {o.is_active ? "✅" : "❌"}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({...o})} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(o.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOffers;
