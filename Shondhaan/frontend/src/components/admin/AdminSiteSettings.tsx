import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { useSiteSettings, SiteSettings } from "@/hooks/useSiteSettings";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";

const AdminSiteSettings = () => {
  const { settings, isLoading, updateMultiple } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);

  useEffect(() => {
    if (!isLoading) setForm(settings);
  }, [settings, isLoading]);

  const set = (key: keyof SiteSettings, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    const items = Object.entries(form).map(([key, value]) => ({ key, value: value || "" }));
    updateMultiple.mutate(items, {
      onSuccess: () => toast.success("সেটিংস সেভ হয়েছে"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-foreground">🏷️ লোগো সেটিংস</h4>
        <ImageUploader value={form.logo_url} onChange={(v) => set("logo_url", v)} folder="logo" label="লোগো ছবি (ঐচ্ছিক — ছবি না থাকলে টেক্সট লোগো দেখাবে)" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">লোগো টেক্সট</label>
            <input value={form.logo_text} onChange={(e) => set("logo_text", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">অ্যাকসেন্ট টেক্সট</label>
            <input value={form.logo_accent} onChange={(e) => set("logo_accent", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-foreground">⭐ ফেভিকন</h4>
        <ImageUploader value={form.favicon_url} onChange={(v) => set("favicon_url", v)} folder="favicon" label="ফেভিকন ছবি (32x32 বা 64x64 পিক্সেল প্রস্তাবিত)" />
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-foreground">📋 ফুটার সেটিংস</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">ট্যাগলাইন (বাংলা)</label>
            <input value={form.footer_tagline_bn} onChange={(e) => set("footer_tagline_bn", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tagline (English)</label>
            <input value={form.footer_tagline_en} onChange={(e) => set("footer_tagline_en", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ফোন নম্বর</label>
            <input value={form.footer_phone} onChange={(e) => set("footer_phone", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ইমেইল</label>
            <input value={form.footer_email} onChange={(e) => set("footer_email", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Facebook URL</label>
            <input value={form.footer_facebook} onChange={(e) => set("footer_facebook", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Instagram URL</label>
            <input value={form.footer_instagram} onChange={(e) => set("footer_instagram", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ঠিকানা (বাংলা)</label>
            <input value={form.footer_address_bn} onChange={(e) => set("footer_address_bn", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Address (English)</label>
            <input value={form.footer_address_en} onChange={(e) => set("footer_address_en", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">কপিরাইট (বাংলা)</label>
            <input value={form.footer_copyright_bn} onChange={(e) => set("footer_copyright_bn", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Copyright (English)</label>
            <input value={form.footer_copyright_en} onChange={(e) => set("footer_copyright_en", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={updateMultiple.isPending}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {updateMultiple.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        সব সেটিংস সেভ করুন
      </button>
    </div>
  );
};

export default AdminSiteSettings;
