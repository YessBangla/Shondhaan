import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

type CmsHeroBanner = {
  id?: string | number;
  title_bn: string;
  title_en: string;
  subtitle_bn: string;
  subtitle_en: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

const API_BASE_URL = (
  INDIVIDUAL_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const empty: Partial<CmsHeroBanner> = {
  title_bn: "",
  title_en: "",
  subtitle_bn: "",
  subtitle_en: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

const getAuthHeaders = () => {
  const auth = getMySqlAuth();

  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const extractArray = (payload: any): CmsHeroBanner[] => {
  const data =
    payload?.data ??
    payload?.banners ??
    payload?.hero_banners ??
    payload?.items ??
    payload?.rows ??
    payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeBanner = (banner: any): CmsHeroBanner => ({
  id: banner.id,
  title_bn: banner.title_bn ?? "",
  title_en: banner.title_en ?? "",
  subtitle_bn: banner.subtitle_bn ?? "",
  subtitle_en: banner.subtitle_en ?? "",
  image_url: banner.image_url ?? "",
  is_active:
    banner.is_active === true ||
    banner.is_active === 1 ||
    banner.is_active === "1",
  sort_order: Number(banner.sort_order ?? 0),
  created_at: banner.created_at,
  updated_at: banner.updated_at,
});

const AdminBanners = () => {
  const [banners, setBanners] = useState<CmsHeroBanner[]>([]);
  const [editing, setEditing] = useState<Partial<CmsHeroBanner> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const fetchBanners = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/hero-banners`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Hero banners load failed"
        );
      }

      const rows = extractArray(payload)
        .map(normalizeBanner)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      setBanners(rows);
    } catch (error: any) {
      console.error("Hero banners load error:", error);
      toast.error(error.message || "Hero banners load failed");
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSave = async () => {
    if (!editing?.title_bn?.trim()) {
      toast.error("টাইটেল আবশ্যক");
      return;
    }

    setSaving(true);

    try {
      const isEdit = !!editing.id;

      const url = isEdit
        ? `${API_BASE_URL}/api/hero-banners/${editing.id}`
        : `${API_BASE_URL}/api/hero-banners`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title_bn: editing.title_bn?.trim() || "",
          title_en: editing.title_en?.trim() || "",
          subtitle_bn: editing.subtitle_bn?.trim() || "",
          subtitle_en: editing.subtitle_en?.trim() || "",
          image_url: editing.image_url || "",
          is_active: editing.is_active ?? true,
          sort_order: Number(editing.sort_order || 0),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Save failed");
      }

      toast.success("সেভ হয়েছে");
      setEditing(null);
      fetchBanners();
    } catch (error: any) {
      console.error("Hero banner save error:", error);
      toast.error(error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string | number) => {
    if (!id) return;

    const ok = window.confirm("মুছে ফেলবেন?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/hero-banners/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Delete failed");
      }

      setBanners((prev) => prev.filter((banner) => banner.id !== id));
      toast.success("ডিলিট হয়েছে");
    } catch (error: any) {
      console.error("Hero banner delete error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (banner: CmsHeroBanner) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hero-banners/${banner.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...banner,
          is_active: !banner.is_active,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Update failed");
      }

      setBanners((prev) =>
        prev.map((item) =>
          item.id === banner.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Hero banner status error:", error);
      toast.error(error.message || "Update failed");
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            হিরো ব্যানার ({banners.length})
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            API: {API_BASE_URL}/api/hero-banners
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBanners}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            রিফ্রেশ
          </button>

          <button
            onClick={() => setEditing({ ...empty })}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            নতুন ব্যানার
          </button>
        </div>
      </div>

      {editing && (
        <div className="mb-6 space-y-3 rounded-xl border border-primary/30 bg-card p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {editing.id ? "ব্যানার এডিট করুন" : "নতুন ব্যানার যোগ করুন"}
            </h4>

            <button
              onClick={() => setEditing(null)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={editing.title_bn || ""}
              onChange={(e) =>
                setEditing({ ...editing, title_bn: e.target.value })
              }
              placeholder="টাইটেল (বাংলা)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <input
              value={editing.title_en || ""}
              onChange={(e) =>
                setEditing({ ...editing, title_en: e.target.value })
              }
              placeholder="Title (English)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <input
              value={editing.subtitle_bn || ""}
              onChange={(e) =>
                setEditing({ ...editing, subtitle_bn: e.target.value })
              }
              placeholder="সাবটাইটেল (বাংলা)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <input
              value={editing.subtitle_en || ""}
              onChange={(e) =>
                setEditing({ ...editing, subtitle_en: e.target.value })
              }
              placeholder="Subtitle (English)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <ImageUploader
            value={editing.image_url || ""}
            onChange={(value) => setEditing({ ...editing, image_url: value })}
            folder="banners"
            label="ব্যানার ছবি"
          />

          {editing.image_url && (
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={editing.image_url}
                alt="Banner preview"
                className="h-40 w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
              />
              সক্রিয়
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ক্রম</span>
              <input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    sort_order: Number(e.target.value || 0),
                  })
                }
                className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                placeholder="ক্রম"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              সেভ
            </button>

            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
              বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              এখনো কোনো ব্যানার নেই
            </p>
            <button
              onClick={() => setEditing({ ...empty })}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              প্রথম ব্যানার যোগ করুন
            </button>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title_bn}
                    className="h-12 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-secondary text-[10px] text-muted-foreground">
                    No image
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {banner.title_bn || "Untitled"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {banner.subtitle_bn || "No subtitle"} • ক্রম:{" "}
                    {banner.sort_order ?? 0} •{" "}
                    {banner.is_active ? "✅ Active" : "❌ Inactive"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => toggleActive(banner)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                  title={banner.is_active ? "Deactivate" : "Activate"}
                >
                  {banner.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => setEditing({ ...banner })}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDelete(banner.id)}
                  disabled={deletingId === banner.id}
                  className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === banner.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminBanners;