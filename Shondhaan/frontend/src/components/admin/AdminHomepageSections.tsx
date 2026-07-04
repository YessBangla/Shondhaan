import { useState } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useCmsHomepageSections, CmsHomepageSection } from "@/hooks/useCmsData";
import { toast } from "sonner";

const empty: Partial<CmsHomepageSection> = {
  section_key: "", title_bn: "", title_en: "", service_slugs: [], sort_order: 0, is_active: true,
};

const AdminHomepageSections = () => {
  const { data: sections = [], isLoading, upsert, remove } = useCmsHomepageSections();
  const [editing, setEditing] = useState<Partial<CmsHomepageSection> | null>(null);
  const [slugsText, setSlugsText] = useState("");

  const startEdit = (s?: CmsHomepageSection) => {
    const item = s || empty;
    setEditing({...item});
    setSlugsText(Array.isArray(item.service_slugs) ? (item.service_slugs as string[]).join(", ") : "");
  };

  const handleSave = () => {
    if (!editing?.section_key || !editing?.title_bn) { toast.error("কী ও টাইটেল আবশ্যক"); return; }
    upsert.mutate({
      ...editing,
      service_slugs: slugsText.split(",").map(s => s.trim()).filter(Boolean),
    } as any, {
      onSuccess: () => { toast.success("সেভ হয়েছে"); setEditing(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">হোমপেজ সেকশন ({sections.length})</h3>
        <button onClick={() => startEdit()} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> নতুন সেকশন
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.section_key || ""} onChange={e => setEditing({...editing, section_key: e.target.value})} placeholder="সেকশন কী (e.g. home, recommended, trending)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input type="number" value={editing.sort_order || 0} onChange={e => setEditing({...editing, sort_order: parseInt(e.target.value)})} placeholder="ক্রম" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.title_bn || ""} onChange={e => setEditing({...editing, title_bn: e.target.value})} placeholder="টাইটেল (বাংলা)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
            <input value={editing.title_en || ""} onChange={e => setEditing({...editing, title_en: e.target.value})} placeholder="Title (English)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <input value={slugsText} onChange={e => setSlugsText(e.target.value)} placeholder="সার্ভিস স্লাগসমূহ (কমা দিয়ে, e.g. plumbing, cleaning, ac-service)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({...editing, is_active: e.target.checked})} /> সক্রিয়
            </label>
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
        {sections.map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{s.title_bn} <span className="text-[10px] text-muted-foreground">({s.section_key})</span></p>
              <p className="text-[10px] text-muted-foreground">{(s.service_slugs as string[]).length} সেবা • ক্রম: {s.sort_order} • {s.is_active ? "✅" : "❌"}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("মুছে ফেলবেন?")) remove.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHomepageSections;
