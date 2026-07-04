import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Save, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

const API_BASE = `${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api`;

type ServicePackage = {
  id?: string;
  service_id: string;
  slug?: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  price: number | string;
  original_price?: number | string | null;
  duration?: string;
  duration_en?: string;
  features?: string[] | string;
  is_popular?: boolean | number;
  is_active?: boolean | number;
  sort_order?: number | string;
};

const emptyPackage = (serviceId: string): ServicePackage => ({
  service_id: serviceId,
  slug: "",
  name: "",
  name_en: "",
  description: "",
  description_en: "",
  price: "",
  original_price: "",
  duration: "",
  duration_en: "",
  features: [],
  is_popular: false,
  is_active: true,
  sort_order: 0,
});

const parseFeatures = (features: unknown): string[] => {
  if (!features) return [];

  if (Array.isArray(features)) {
    return features.map(String).filter(Boolean);
  }

  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const makeSlug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const FieldLabel = ({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) => {
  return (
    <div className="mb-1">
      <label className="text-[11px] font-semibold text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>

      {hint ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

const PackageManager = ({ serviceId }: { serviceId: string }) => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [featText, setFeatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const packageCount = useMemo(() => packages.length, [packages]);

  const fetchPackages = async () => {
    if (!serviceId) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/packages?service_id=${encodeURIComponent(serviceId)}`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Package load failed");
      }

      const rows = Array.isArray(json) ? json : json?.data || [];
      setPackages(rows);
    } catch (error: any) {
      console.error("Fetch packages error:", error);
      toast.error(error?.message || "প্যাকেজ লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const startEdit = (pkg?: ServicePackage) => {
    const item = pkg || emptyPackage(serviceId);

    setEditing({
      ...item,
      service_id: serviceId,
      price: item.price ?? "",
      original_price: item.original_price ?? "",
      is_popular: !!item.is_popular,
      is_active: item.is_active === false || item.is_active === 0 ? false : true,
      sort_order: item.sort_order ?? 0,
    });

    setFeatText(parseFeatures(item.features).join(", "));
  };

  const closeForm = () => {
    setEditing(null);
    setFeatText("");
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!serviceId) {
      toast.error("Service ID পাওয়া যায়নি");
      return;
    }

    if (!editing.name?.trim()) {
      toast.error("প্যাকেজের বাংলা নাম দিন");
      return;
    }

    if (editing.price === "" || editing.price === null || editing.price === undefined) {
      toast.error("প্যাকেজের দাম দিন");
      return;
    }

    const price = Number(editing.price);

    if (Number.isNaN(price) || price < 0) {
      toast.error("সঠিক দাম দিন");
      return;
    }

    const originalPrice =
      editing.original_price !== "" &&
      editing.original_price !== null &&
      editing.original_price !== undefined
        ? Number(editing.original_price)
        : null;

    if (originalPrice !== null && (Number.isNaN(originalPrice) || originalPrice < 0)) {
      toast.error("সঠিক আগের দাম দিন");
      return;
    }

    const payload = {
      service_id: serviceId,
      slug: editing.slug?.trim() || makeSlug(editing.name_en || editing.name),
      name: editing.name.trim(),
      name_en: editing.name_en?.trim() || "",
      description: editing.description?.trim() || "",
      description_en: editing.description_en?.trim() || "",
      price,
      original_price: originalPrice,
      duration: editing.duration?.trim() || "",
      duration_en: editing.duration_en?.trim() || "",
      features: featText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      is_popular: !!editing.is_popular,
      is_active: editing.is_active === false ? false : true,
      sort_order: Number(editing.sort_order || 0),
    };

    try {
      setSaving(true);

      const isEdit = Boolean(editing.id);

      const res = await fetch(
        isEdit ? `${API_BASE}/packages/${editing.id}` : `${API_BASE}/packages`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Package save failed");
      }

      toast.success(isEdit ? "প্যাকেজ আপডেট হয়েছে" : "নতুন প্যাকেজ যোগ হয়েছে");

      closeForm();
      await fetchPackages();
    } catch (error: any) {
      console.error("Save package error:", error);
      toast.error(error?.message || "প্যাকেজ সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;

    const yes = confirm("এই প্যাকেজ মুছে ফেলবেন?");
    if (!yes) return;

    try {
      setDeletingId(id);

      const res = await fetch(`${API_BASE}/packages/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Package delete failed");
      }

      toast.success("প্যাকেজ মুছে ফেলা হয়েছে");
      await fetchPackages();
    } catch (error: any) {
      console.error("Delete package error:", error);
      toast.error(error?.message || "প্যাকেজ মুছা যায়নি");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-border px-3 pb-3 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            প্যাকেজসমূহ ({packageCount})
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            এই সার্ভিসের Basic, Standard, Premium প্যাকেজ যোগ করুন
          </p>
        </div>

        <button
          type="button"
          onClick={() => startEdit()}
          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" />
          নতুন প্যাকেজ
        </button>
      </div>

      {editing ? (
        <div className="mb-3 rounded-xl border border-primary/20 bg-background p-3">
          <div className="mb-3 flex items-start justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-primary">
                {editing.id ? "প্যাকেজ এডিট করুন" : "নতুন প্যাকেজ যোগ করুন"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Required field গুলো পূরণ করুন। Slug খালি রাখলে auto তৈরি হবে।
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel
                label="প্যাকেজ নাম বাংলা"
                required
                hint="যেমন: বেসিক প্যাকেজ, স্ট্যান্ডার্ড প্যাকেজ"
              />
              <input
                value={editing.name || ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                placeholder="বেসিক প্যাকেজ"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="Package Name English"
                hint="Example: Basic Package, Standard Package"
              />
              <input
                value={editing.name_en || ""}
                onChange={(e) =>
                  setEditing({ ...editing, name_en: e.target.value })
                }
                placeholder="Basic Package"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="Slug"
                hint="URL friendly name. Example: basic-package"
              />
              <input
                value={editing.slug || ""}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
                placeholder="basic-package"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="বর্তমান দাম"
                required
                hint="Customer যে দাম দিবে। Example: 500"
              />
              <input
                type="number"
                min="0"
                value={editing.price ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, price: e.target.value })
                }
                placeholder="500"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="আগের দাম / কাটাছেঁড়া দাম"
                hint="Optional. Discount দেখাতে চাইলে দিন। Example: 700"
              />
              <input
                type="number"
                min="0"
                value={editing.original_price ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    original_price: e.target.value || "",
                  })
                }
                placeholder="700"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="সময় বাংলা"
                hint="যেমন: ২ ঘণ্টা, ৩০ মিনিট"
              />
              <input
                value={editing.duration || ""}
                onChange={(e) =>
                  setEditing({ ...editing, duration: e.target.value })
                }
                placeholder="২ ঘণ্টা"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="Duration English"
                hint="Example: 2 hours, 30 minutes"
              />
              <input
                value={editing.duration_en || ""}
                onChange={(e) =>
                  setEditing({ ...editing, duration_en: e.target.value })
                }
                placeholder="2 hours"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel
                label="Sort Order"
                hint="যেটা আগে দেখাতে চান, তার number কম দিন। Example: 1"
              />
              <input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: e.target.value })
                }
                placeholder="1"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel
              label="প্যাকেজ বিবরণ বাংলা"
              hint="এই প্যাকেজে কী থাকবে, ছোট করে লিখুন"
            />
            <textarea
              value={editing.description || ""}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              placeholder="এই প্যাকেজে বেসিক সার্ভিস অন্তর্ভুক্ত থাকবে।"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="mt-3">
            <FieldLabel
              label="Package Description English"
              hint="English description for this package"
            />
            <textarea
              value={editing.description_en || ""}
              onChange={(e) =>
                setEditing({ ...editing, description_en: e.target.value })
              }
              placeholder="This package includes basic service."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="mt-3">
            <FieldLabel
              label="প্যাকেজ ফিচার"
              hint="কমা দিয়ে আলাদা করুন। Example: AC cleaning, Gas check, Service warranty"
            />
            <input
              value={featText}
              onChange={(e) => setFeatText(e.target.value)}
              placeholder="AC cleaning, Gas check, Service warranty"
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={!!editing.is_popular}
                onChange={(e) =>
                  setEditing({ ...editing, is_popular: e.target.checked })
                }
              />
              Popular package হিসেবে দেখাবো
            </label>

            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_active !== false}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
              />
              প্যাকেজ active থাকবে
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[11px] text-foreground hover:bg-secondary disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              বাতিল
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        {loading ? (
          <p className="rounded-lg bg-secondary/40 px-2 py-2 text-xs text-muted-foreground">
            প্যাকেজ লোড হচ্ছে...
          </p>
        ) : packages.length === 0 ? (
          <p className="rounded-lg bg-secondary/40 px-2 py-2 text-xs text-muted-foreground">
            কোনো প্যাকেজ যোগ করা হয়নি
          </p>
        ) : (
          packages.map((pkg) => {
            const oldPrice =
              pkg.original_price !== undefined &&
              pkg.original_price !== null &&
              pkg.original_price !== ""
                ? Number(pkg.original_price)
                : null;

            return (
              <div
                key={pkg.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {pkg.name}

                    {pkg.is_popular ? (
                      <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                        Popular
                      </span>
                    ) : null}

                    {pkg.is_active === false || pkg.is_active === 0 ? (
                      <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive">
                        Inactive
                      </span>
                    ) : null}
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    ৳{pkg.price}

                    {oldPrice && oldPrice > 0 ? (
                      <span className="ml-1 line-through">৳{oldPrice}</span>
                    ) : null}

                    {pkg.duration ? (
                      <span className="ml-1">• {pkg.duration}</span>
                    ) : null}
                  </p>

                  {parseFeatures(pkg.features).length > 0 ? (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {parseFeatures(pkg.features).join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(pkg)}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    title="Edit package"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(pkg.id)}
                    disabled={deletingId === pkg.id}
                    className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    title="Delete package"
                  >
                    {deletingId === pkg.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PackageManager;
