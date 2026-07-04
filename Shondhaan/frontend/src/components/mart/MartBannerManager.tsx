import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit, Save, X, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface MartBanner {
  id: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const MartBannerManager = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [banners, setBanners] = useState<MartBanner[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", title_en: "", subtitle: "", subtitle_en: "", image_url: "", link_url: "/mart/category/all" });
  const [adding, setAdding] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("mart_banners").select("*").order("sort_order");
    if (data) setBanners(data as MartBanner[]);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error(bn ? "শিরোনাম দিন" : "Title required"); return; }
    const { error } = await supabase.from("mart_banners").insert({
      title: form.title, title_en: form.title_en || null, subtitle: form.subtitle || null,
      subtitle_en: form.subtitle_en || null, image_url: form.image_url || null, link_url: form.link_url || "/mart/category/all",
      sort_order: banners.length
    });
    if (!error) { toast.success(bn ? "ব্যানার যোগ হয়েছে" : "Banner added"); setAdding(false); resetForm(); fetch(); }
    else toast.error(error.message);
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from("mart_banners").update({
      title: form.title, title_en: form.title_en || null, subtitle: form.subtitle || null,
      subtitle_en: form.subtitle_en || null, image_url: form.image_url || null, link_url: form.link_url || "/mart/category/all",
    }).eq("id", id);
    if (!error) { toast.success(bn ? "আপডেট হয়েছে" : "Updated"); setEditing(null); resetForm(); fetch(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mart_banners").delete().eq("id", id);
    if (!error) { toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted"); fetch(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("mart_banners").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  const moveOrder = async (id: string, dir: number) => {
    const idx = banners.findIndex(b => b.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    await Promise.all([
      supabase.from("mart_banners").update({ sort_order: swapIdx }).eq("id", banners[idx].id),
      supabase.from("mart_banners").update({ sort_order: idx }).eq("id", banners[swapIdx].id),
    ]);
    fetch();
  };

  const resetForm = () => setForm({ title: "", title_en: "", subtitle: "", subtitle_en: "", image_url: "", link_url: "/mart/category/all" });

  const startEdit = (b: MartBanner) => {
    setEditing(b.id);
    setForm({ title: b.title, title_en: b.title_en || "", subtitle: b.subtitle || "", subtitle_en: b.subtitle_en || "", image_url: b.image_url || "", link_url: b.link_url || "/mart/category/all" });
  };

  const FormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label className="text-xs">{bn ? "শিরোনাম (বাংলা)" : "Title (BN)"}</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "শিরোনাম (English)" : "Title (EN)"}</Label><Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "সাবটাইটেল (বাংলা)" : "Subtitle (BN)"}</Label><Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "সাবটাইটেল (English)" : "Subtitle (EN)"}</Label><Input value={form.subtitle_en} onChange={e => setForm(f => ({ ...f, subtitle_en: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "ছবি URL" : "Image URL"}</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "লিংক URL" : "Link URL"}</Label><Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">{bn ? "ব্যানার ম্যানেজমেন্ট" : "Banner Management"} ({banners.length})</h3>
        <Button size="sm" onClick={() => { setAdding(true); resetForm(); }}><Plus className="h-4 w-4 mr-1" />{bn ? "নতুন ব্যানার" : "Add Banner"}</Button>
      </div>

      {adding && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <FormFields />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}><Save className="h-4 w-4 mr-1" />{bn ? "সেভ" : "Save"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="h-4 w-4 mr-1" />{bn ? "বাতিল" : "Cancel"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {banners.map((b, i) => (
        <Card key={b.id} className="border-border/50">
          <CardContent className="p-4">
            {editing === b.id ? (
              <div className="space-y-3">
                <FormFields />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(b.id)}><Save className="h-4 w-4 mr-1" />{bn ? "আপডেট" : "Update"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(null); resetForm(); }}><X className="h-4 w-4 mr-1" />{bn ? "বাতিল" : "Cancel"}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="h-16 w-28 object-cover rounded-lg border" />
                ) : (
                  <div className="h-16 w-28 bg-muted rounded-lg flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>}
                  <p className="text-[10px] text-muted-foreground">{b.link_url}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b.id, b.is_active)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveOrder(b.id, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveOrder(b.id, 1)} disabled={i === banners.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {banners.length === 0 && !adding && (
        <div className="text-center py-8 text-muted-foreground text-sm">{bn ? "কোনো ব্যানার নেই" : "No banners yet"}</div>
      )}
    </div>
  );
};

export default MartBannerManager;
