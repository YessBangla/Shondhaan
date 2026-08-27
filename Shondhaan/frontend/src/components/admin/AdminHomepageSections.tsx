import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  Search,
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
  INDIVIDUAL_API_BASE_URL || ""
).replace(/\/+$/, "");

const empty: Partial<CmsHomepageSection> = {
  section_key: "",
  title_bn: "",
  title_en: "",
  service_slugs: [],
  sort_order: 0,
  is_active: true,
};

// Helper function to generate slug/section_key from string
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")       // Replace spaces with _ for section keys
    .replace(/[^\w\-]+/g, "")    // Remove all non-word chars
    .replace(/\-\-+/g, "-");     // Replace multiple - with single -
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
    return value.split(",").map((item) => item.trim()).filter(Boolean);
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
  const [editing, setEditing] = useState<Partial<CmsHomepageSection> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // State for Service Slug Suggestions
  const [allServices, setAllServices] = useState<{ slug: string; title: string }[]>([]);
  const [showSlugsDropdown, setShowSlugsDropdown] = useState(false);
  const [slugSearch, setSlugSearch] = useState("");
  const slugDropdownRef = useRef<HTMLDivElement>(null);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/homepage-sections`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Homepage sections load failed");
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

  const fetchAllServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      
      // Extract array safely
      const data = Array.isArray(payload) ? payload : (payload?.data || []);
      
      const mapped = data.map((s: any) => ({ 
        slug: String(s.slug || ""), 
        title: String(s.title || s.title_en || s.slug || "") 
      })).filter((s: any) => s.slug);
      
      setAllServices(mapped);
    } catch (error) {
      console.error("Failed to fetch services for suggestions:", error);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // Fetch services only when modal opens
  useEffect(() => {
    if (editing) {
      fetchAllServices();
    }
  }, [editing]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = editing ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [editing]);

  // Close slug dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slugDropdownRef.current && !slugDropdownRef.current.contains(e.target as Node)) {
        setShowSlugsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const startEdit = (section?: CmsHomepageSection) => {
    const item = section || empty;
    setEditing({ ...item });
    setSlugSearch("");
    setShowSlugsDropdown(false);
  };

  const toggleSlug = (slug: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const currentSlugs = prev.service_slugs || [];
      const newSlugs = currentSlugs.includes(slug)
        ? currentSlugs.filter(s => s !== slug)
        : [...currentSlugs, slug];
      return { ...prev, service_slugs: newSlugs };
    });
  };

  const handleSave = async () => {
    if (!editing?.section_key?.trim() || !editing?.title_bn?.trim()) {
      toast.error("কী ও টাইটেল আবশ্যক");
      return;
    }

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
          service_slugs: editing.service_slugs || [],
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
      const response = await fetch(`${API_BASE_URL}/api/homepage-sections/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

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
      const response = await fetch(`${API_BASE_URL}/api/homepage-sections/${section.id}`, {
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
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Update failed");
      }

      setSections((prev) =>
        prev.map((item) =>
          item.id === section.id ? { ...item, is_active: !item.is_active } : item
        )
      );

      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Homepage section status error:", error);
      toast.error(error.message || "Update failed");
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="relative">
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
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            নতুন সেকশন
          </button>
        </div>
      </div>

      {/* Modal Form rendered via Portal to escape parent overflow constraints */}
      {editing && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between bg-card p-4 border-b border-border">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {editing.id ? "সেকশন এডিট করুন" : "নতুন সেকশন যোগ করুন"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">টাইটেল (বাংলা) *</label>
                  <input
                    value={editing.title_bn || ""}
                    onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })}
                    placeholder="যেমন: জনপ্রিয় সার্ভিস"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title (English)</label>
                  <input
                    value={editing.title_en || ""}
                    onChange={(e) => {
                      const newTitleEn = e.target.value;
                      setEditing(prev => prev ? ({ ...prev, title_en: newTitleEn, section_key: slugify(newTitleEn) }) : prev);
                    }}
                    placeholder="e.g. Popular Services"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">সেকশন কী (Section Key) *</label>
                  <input
                    value={editing.section_key || ""}
                    onChange={(e) => setEditing({ ...editing, section_key: e.target.value })}
                    placeholder="auto-generated-from-english-title"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">English নাম লিখলে অটোমেটিক কী তৈরি হবে।</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">ক্রম (Sort Order)</label>
                  <input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value || 0) })}
                    placeholder="0"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Multi-select Services Dropdown */}
              <div className="relative" ref={slugDropdownRef}>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  সার্ভিস সমূহ ({editing.service_slugs?.length || 0} টি নির্বাচিত)
                </label>
                <button
                  type="button"
                  onClick={() => setShowSlugsDropdown(!showSlugsDropdown)}
                  className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={`truncate ${editing.service_slugs?.length ? "text-foreground" : "text-muted-foreground"}`}>
                    {editing.service_slugs?.length 
                      ? `${editing.service_slugs.length} টি সার্ভিস নির্বাচিত`
                      : "সার্ভিস নির্বাচন করতে ক্লিক করুন"}
                  </span>
                  <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${showSlugsDropdown ? "rotate-180" : ""}`} />
                </button>
                
                {showSlugsDropdown && (
                  <div className="absolute z-30 mt-1 w-full max-h-60 flex flex-col rounded-lg border border-border bg-popover shadow-lg">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="সার্ভিস খুঁজুন..."
                          value={slugSearch}
                          onChange={(e) => setSlugSearch(e.target.value)}
                          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                      {allServices
                        .filter(s => 
                          s.title.toLowerCase().includes(slugSearch.toLowerCase()) || 
                          s.slug.toLowerCase().includes(slugSearch.toLowerCase())
                        )
                        .map(service => (
                          <label
                            key={service.slug}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={editing.service_slugs?.includes(service.slug) || false}
                              onChange={() => toggleSlug(service.slug)}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <div className="flex flex-col">
                              <span>{service.title}</span>
                              <span className="text-[10px] text-muted-foreground">/{service.slug}</span>
                            </div>
                          </label>
                        ))}
                      {allServices.filter(s => 
                        s.title.toLowerCase().includes(slugSearch.toLowerCase()) || 
                        s.slug.toLowerCase().includes(slugSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4">কোনো সার্ভিস পাওয়া যায়নি</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  সক্রিয় করুন
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 bg-card p-4 border-t border-border">
              <button
                onClick={() => setEditing(null)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-2">
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">এখনো কোনো হোমপেজ সেকশন নেই</p>
            <button
              onClick={() => startEdit()}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white"
            >
              প্রথম সেকশন যোগ করুন
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {section.title_bn || "Untitled"}{" "}
                  <span className="text-[10px] text-muted-foreground">({section.section_key})</span>
                </p>

                <p className="truncate text-[10px] text-muted-foreground">
                  {section.service_slugs.length} সার্ভিস • ক্রম: {section.sort_order ?? 0} •{" "}
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
                  {section.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
