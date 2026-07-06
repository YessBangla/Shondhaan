import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

type CmsHomepageSection = {
  id?: string | number;
  section_key: string;
  title_bn: string;
  title_en: string;
  service_slugs: string[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const API_BASE_URL = (
  INDIVIDUAL_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const empty: Partial<CmsHomepageSection> = {
  section_key: "",
  title_bn: "",
  title_en: "",
  service_slugs: [],
  sort_order: 0,
  is_active: true,
};

const getAuthHeaders = () => {
  const auth = getMySqlAuth();

  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const parseServiceSlugs = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      // fallback comma separated
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const extractArray = (payload: any): CmsHomepageSection[] => {
  const data =
    payload?.data ??
    payload?.sections ??
    payload?.homepage_sections ??
    payload?.items ??
    payload?.rows ??
    payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeSection = (section: any): CmsHomepageSection => ({
  id: section.id,
  section_key: section.section_key ?? "",
  title_bn: section.title_bn ?? "",
  title_en: section.title_en ?? "",
  service_slugs: parseServiceSlugs(section.service_slugs),
  sort_order: Number(section.sort_order ?? 0),
  is_active:
    section.is_active === true ||
    section.is_active === 1 ||
    section.is_active === "1",
  created_at: section.created_at,
  updated_at: section.updated_at,
});

const AdminHomepageSections = () => {
  const [sections, setSections] = useState<CmsHomepageSection[]>([]);
  const [editing, setEditing] = useState<Partial<CmsHomepageSection> | null>(
    null
  );
  const [slugsText, setSlugsText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const fetchSections = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/homepage-sections`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Homepage sections load failed"
        );
      }

      const rows = extractArray(payload)
        .map(normalizeSection)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      setSections(rows);
    } catch (error: any) {
      console.error("Homepage sections load error:", error);
      toast.error(error.message || "Homepage sections load failed");
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const startEdit = (section?: CmsHomepageSection) => {
    const item = section || empty;

    setEditing({ ...item });
    setSlugsText(
      Array.isArray(item.service_slugs) ? item.service_slugs.join(", ") : ""
    );
  };

  const handleSave = async () => {
    if (!editing?.section_key?.trim() || !editing?.title_bn?.trim()) {
      toast.error("কী ও টাইটেল আবশ্যক");
      return;
    }

    const serviceSlugs = slugsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);

    try {
      const isEdit = !!editing.id;

      const url = isEdit
        ? `${API_BASE_URL}/api/homepage-sections/${editing.id}`
        : `${API_BASE_URL}/api/homepage-sections`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          section_key: editing.section_key.trim(),
          title_bn: editing.title_bn.trim(),
          title_en: editing.title_en?.trim() || "",
          service_slugs: serviceSlugs,
          sort_order: Number(editing.sort_order || 0),
          is_active: editing.is_active ?? true,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Save failed");
      }

      toast.success("সেভ হয়েছে");
      setEditing(null);
      setSlugsText("");
      fetchSections();
    } catch (error: any) {
      console.error("Homepage section save error:", error);
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
      const response = await fetch(
        `${API_BASE_URL}/api/homepage-sections/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Delete failed");
      }

      setSections((prev) => prev.filter((section) => section.id !== id));
      toast.success("ডিলিট হয়েছে");
    } catch (error: any) {
      console.error("Homepage section delete error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (section: CmsHomepageSection) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/homepage-sections/${section.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            section_key: section.section_key,
            title_bn: section.title_bn,
            title_en: section.title_en,
            service_slugs: section.service_slugs,
            sort_order: section.sort_order,
            is_active: !section.is_active,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Update failed");
      }

      setSections((prev) =>
        prev.map((item) =>
          item.id === section.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Homepage section status error:", error);
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
            হোমপেজ সেকশন ({sections.length})
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            API: {API_BASE_URL}/api/homepage-sections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSections}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            রিফ্রেশ
          </button>

          <button
            onClick={() => startEdit()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            নতুন সেকশন
          </button>
        </div>
      </div>

      {editing && (
        <div className="mb-6 space-y-3 rounded-xl border border-primary/30 bg-card p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {editing.id ? "সেকশন এডিট করুন" : "নতুন সেকশন যোগ করুন"}
            </h4>

            <button
              onClick={() => {
                setEditing(null);
                setSlugsText("");
              }}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={editing.section_key || ""}
              onChange={(e) =>
                setEditing({ ...editing, section_key: e.target.value })
              }
              placeholder="সেকশন কী (e.g. recommended, trending)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <input
              type="number"
              value={editing.sort_order ?? 0}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  sort_order: Number(e.target.value || 0),
                })
              }
              placeholder="ক্রম"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

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
          </div>

          <div>
            <input
              value={slugsText}
              onChange={(e) => setSlugsText(e.target.value)}
              placeholder="সার্ভিস স্লাগসমূহ, e.g. plumbing, cleaning, ac-service"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <p className="mt-1 text-[10px] text-muted-foreground">
              কমা দিয়ে আলাদা করুন। Example: plumbing, cleaning, ac-service
            </p>
          </div>

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

            {slugsText.trim() && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                {
                  slugsText
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean).length
                }{" "}
                সেবা
              </span>
            )}
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
              onClick={() => {
                setEditing(null);
                setSlugsText("");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
              বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              এখনো কোনো হোমপেজ সেকশন নেই
            </p>

            <button
              onClick={() => startEdit()}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              প্রথম সেকশন যোগ করুন
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {section.title_bn || "Untitled"}{" "}
                  <span className="text-[10px] text-muted-foreground">
                    ({section.section_key})
                  </span>
                </p>

                <p className="truncate text-[10px] text-muted-foreground">
                  {section.service_slugs.length} সেবা • ক্রম:{" "}
                  {section.sort_order ?? 0} •{" "}
                  {section.is_active ? "✅ Active" : "❌ Inactive"}
                </p>

                {section.service_slugs.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {section.service_slugs.slice(0, 6).map((slug) => (
                      <span
                        key={slug}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
                      >
                        {slug}
                      </span>
                    ))}

                    {section.service_slugs.length > 6 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{section.service_slugs.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => toggleActive(section)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                  title={section.is_active ? "Deactivate" : "Activate"}
                >
                  {section.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => startEdit(section)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDelete(section.id)}
                  disabled={deletingId === section.id}
                  className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === section.id ? (
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

export default AdminHomepageSections;