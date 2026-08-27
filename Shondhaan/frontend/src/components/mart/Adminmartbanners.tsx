import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Loader2,
  X,
  Upload,
  Link as LinkIcon,
  ArrowRight,
  Monitor,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

interface Banner {
  id: number;
  title: string;
  title_en?: string | null;
  subtitle?: string | null;
  subtitle_en?: string | null;
  image_url: string;
  link_url?: string | null;
  button_label?: string | null;
  button_label_en?: string | null;
  button_bg_color?: string | null;
  button_text_color?: string | null;
  is_active: number | boolean;
  sort_order: number;
  created_at?: string;
}

const safeHexColor = (value: unknown, fallback: string) => {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
};

const emptyForm = {
  title: "",
  title_en: "",
  subtitle: "",
  subtitle_en: "",
  link_url: "",
  button_label: "দেখুন",
  button_label_en: "View",
  button_bg_color: "#ffffff",
  button_text_color: "#0f172a",
  is_active: true,
};

const BannerHomePreview = ({
  banner,
  imageUrl,
}: {
  banner: Partial<Banner> & Partial<typeof emptyForm>;
  imageUrl?: string | null;
}) => {
  const title = banner.title || banner.title_en || "Banner title";
  const subtitle = banner.subtitle || banner.subtitle_en || "";
  const buttonLabel = banner.button_label_en || banner.button_label || "View";
  const buttonBg = safeHexColor(banner.button_bg_color, "#ffffff");
  const buttonText = safeHexColor(banner.button_text_color, "#0f172a");

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Monitor className="h-3.5 w-3.5" />
        Homepage preview
      </div>
      <div className="relative h-[170px] overflow-hidden rounded-2xl bg-muted shadow-sm md:h-[220px]">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4 md:p-6">
          <h2 className="mb-1 text-base font-extrabold text-white drop-shadow-sm md:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-white/80 drop-shadow-sm md:text-sm">{subtitle}</p>
          )}
          {banner.link_url && (
            <button
              type="button"
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm md:text-sm"
              style={{ backgroundColor: buttonBg, color: buttonText }}
            >
              {buttonLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminMartBanners = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-mart-banners"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/banners?all=1`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-mart-banners"] });
    queryClient.invalidateQueries({ queryKey: ["mart-banners"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      title_en: b.title_en || "",
      subtitle: b.subtitle || "",
      subtitle_en: b.subtitle_en || "",
      link_url: b.link_url || "",
      button_label: b.button_label || "দেখুন",
      button_label_en: b.button_label_en || "View",
      button_bg_color: safeHexColor(b.button_bg_color, "#ffffff"),
      button_text_color: safeHexColor(b.button_text_color, "#0f172a"),
      is_active: !!b.is_active,
    });
    setImageFile(null);
    setImagePreview(b.image_url);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editing && !imageFile) {
      toast.error("Banner image is required");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("title_en", form.title_en);
      fd.append("subtitle", form.subtitle);
      fd.append("subtitle_en", form.subtitle_en);
      fd.append("link_url", form.link_url);
      fd.append("button_label", form.button_label);
      fd.append("button_label_en", form.button_label_en);
      fd.append("button_bg_color", form.button_bg_color);
      fd.append("button_text_color", form.button_text_color);
      fd.append("is_active", form.is_active ? "1" : "0");
      if (imageFile) fd.append("image", imageFile);

      const url = editing
        ? `${API_BASE}/api/banners/${editing.id}`
        : `${API_BASE}/api/banners`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Save failed");

      toast.success(editing ? "Banner updated" : "Banner added");
      setDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/banners/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Delete failed");
      toast.success("Banner deleted");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete banner");
    }
  };

  const handleToggleActive = async (b: Banner) => {
    try {
      const res = await fetch(`${API_BASE}/api/banners/${b.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: b.is_active ? 0 : 1 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Update failed");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update banner");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const reordered = [...banners];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      const res = await fetch(`${API_BASE}/api/banners/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: reordered.map((b, i) => ({ id: b.id, sort_order: i })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Reorder failed");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reorder banners");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            মার্ট হোম ব্যানার
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            হোমপেজের ক্যারোসেলে দেখানো ব্যানার ছবি পরিচালনা করুন — একাধিক যোগ করা যাবে।
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> নতুন ব্যানার
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">এখনো কোনো ব্যানার যোগ করা হয়নি</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-4 bg-card border border-border/60 rounded-xl p-3"
            >
              <div className="h-16 w-28 shrink-0 rounded-lg overflow-hidden bg-muted">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.title}</p>
                {b.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>
                )}
                {b.link_url && (
                  <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5 truncate">
                    <LinkIcon className="h-3 w-3 shrink-0" /> {b.link_url}
                  </p>
                )}
                {b.link_url && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Button: {b.button_label_en || b.button_label || "View"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewBanner(b)}
                  title="Preview on homepage"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === 0}
                  onClick={() => handleReorder(i, "up")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === banners.length - 1}
                  onClick={() => handleReorder(i, "down")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(b)}
                  title={b.is_active ? "Active — click to hide" : "Hidden — click to show"}
                >
                  {b.is_active ? (
                    <Eye className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "ব্যানার এডিট করুন" : "নতুন ব্যানার যোগ করুন"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block">ব্যানার ছবি *</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative h-36 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden bg-muted/40 flex items-center justify-center"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} className="h-full w-full object-cover" alt="preview" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 h-6 w-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs">ছবি আপলোড করতে ক্লিক করুন</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                প্রস্তাবিত সাইজ: 1200×450px (JPG/PNG/WebP)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>শিরোনাম (বাংলা) *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Title (English)</Label>
                <Input
                  value={form.title_en}
                  onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>সাবটাইটেল (বাংলা)</Label>
                <Textarea
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
              <div>
                <Label>Subtitle (English)</Label>
                <Textarea
                  rows={2}
                  value={form.subtitle_en}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle_en: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>লিংক URL (ঐচ্ছিক)</Label>
              <Input
                placeholder="/mart/category/electronics"
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              />
            </div>

            <div className="rounded-xl border border-border/60 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-primary" />
                Banner button design
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Button text (Bangla)</Label>
                  <Input
                    value={form.button_label}
                    onChange={(e) => setForm((f) => ({ ...f, button_label: e.target.value }))}
                    placeholder="দেখুন"
                  />
                </div>
                <div>
                  <Label>Button text (English)</Label>
                  <Input
                    value={form.button_label_en}
                    onChange={(e) => setForm((f) => ({ ...f, button_label_en: e.target.value }))}
                    placeholder="View"
                  />
                </div>
                <div>
                  <Label>Button background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={safeHexColor(form.button_bg_color, "#ffffff")}
                      onChange={(e) => setForm((f) => ({ ...f, button_bg_color: e.target.value }))}
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      value={form.button_bg_color}
                      onChange={(e) => setForm((f) => ({ ...f, button_bg_color: e.target.value }))}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <Label>Button text color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={safeHexColor(form.button_text_color, "#0f172a")}
                      onChange={(e) => setForm((f) => ({ ...f, button_text_color: e.target.value }))}
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      value={form.button_text_color}
                      onChange={(e) => setForm((f) => ({ ...f, button_text_color: e.target.value }))}
                      placeholder="#0f172a"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                The button is shown on MartHome only when Link URL is filled.
              </p>
            </div>

            <BannerHomePreview banner={form} imageUrl={imagePreview} />

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">সক্রিয় (Active)</p>
                <p className="text-[11px] text-muted-foreground">বন্ধ করলে হোমপেজে দেখাবে না</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewBanner} onOpenChange={(open) => !open && setPreviewBanner(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Homepage banner preview</DialogTitle>
          </DialogHeader>
          {previewBanner && (
            <BannerHomePreview
              banner={{ ...emptyForm, ...previewBanner }}
              imageUrl={previewBanner.image_url}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMartBanners;
