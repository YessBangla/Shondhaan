import { useState } from "react";
import { Image, Search, Save, Loader2 } from "lucide-react";
import { useCmsServices, useCmsCategories, CmsService } from "@/hooks/useCmsData";
import ImageUploader from "./ImageUploader";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
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

const ServiceImageManager = () => {
  const { data: services = [], isLoading, upsert } = useCmsServices();
  const { data: categories = [] } = useCmsCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = services.filter(s => {
    const matchSearch = !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.title_en || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === "all" || s.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const startEdit = (s: CmsService) => {
    setEditingId(s.id);
    setEditingUrl(s.image_url || "");
  };

  const handleSave = (s: CmsService) => {
    setSaving(true);
    upsert.mutate({ ...s, image_url: editingUrl } as any, {
      onSuccess: () => {
        toast.success("ছবি আপডেট হয়েছে");
        setEditingId(null);
        setSaving(false);
      },
      onError: (e: any) => {
        toast.error(e.message);
        setSaving(false);
      },
    });
  };

  const getCatName = (catId: string | null) => {
    const cat = categories.find(c => c.id === catId);
    return cat?.name || "—";
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const withImage = services.filter(s => s.image_url).length;
  const withoutImage = services.length - withImage;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" /> সার্ভিসর ছবি ম্যানেজমেন্ট
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            ✅ ছবি আছে: {withImage} • ❌ ছবি নেই: {withoutImage} • মোট: {services.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="সার্ভিস খুঁজুন..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <CategoryFilterDropdown value={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(s => (
          <div key={s.id} className={`rounded-xl border bg-card overflow-hidden ${!s.image_url ? "border-yellow-300 dark:border-yellow-800" : "border-border"}`}>
            {/* Image Preview */}
            <div className="relative aspect-[4/3] bg-secondary">
              {editingId === s.id ? (
                <div className="p-3 h-full flex flex-col">
                  <ImageUploader
                    value={editingUrl}
                    onChange={setEditingUrl}
                    folder="services"
                    label="নতুন ছবি"
                  />
                  <div className="flex gap-2 mt-auto pt-2">
                    <button
                      onClick={() => handleSave(s)}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      সেভ
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-[10px] text-foreground"
                    >
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {s.image_url ? (
                    // FIXED: Applied getImageSrc here
                    <img src={getImageSrc(s.image_url)} alt={s.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center">
                        <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-1" />
                        <p className="text-[10px] text-muted-foreground">ছবি নেই</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => startEdit(s)}
                    className="absolute inset-0 flex items-center justify-center bg-foreground/0 hover:bg-foreground/40 transition-colors group"
                  >
                    <span className="rounded-lg bg-background/90 px-3 py-1.5 text-[10px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      📷 ছবি পরিবর্তন
                    </span>
                  </button>
                </>
              )}
            </div>
            {/* Info */}
            <div className="p-2.5">
              <p className="text-xs font-semibold text-foreground line-clamp-1">{s.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{getCatName(s.category_id)} • /{s.slug}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Image className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">কোনো সার্ভিস পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
};

export default ServiceImageManager;