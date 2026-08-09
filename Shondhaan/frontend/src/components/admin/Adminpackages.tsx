import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Save, Trash2, X, Loader2, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { YESSJOB_API_BASE_URL } from "@/lib/api";

const API_BASE = `${YESSJOB_API_BASE_URL.replace(/\/+$/, "")}/api`;

const VISIBILITY_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "premium_plus", label: "Premium Plus" },
  { value: "hot", label: "Hot" },
];

type JobPackage = {
  id?: number;
  name: string;
  price: number | string;
  duration_days: number | string;
  visibility_level: string;
  max_applications: number | string | null;
  max_jobs_per_year: number | string | null;
  features: string[] | string;
  is_featured?: boolean | number;
  is_active?: boolean | number;
  sort_order?: number | string;
};

const emptyPackage = (): JobPackage => ({
  name: "",
  price: "",
  duration_days: 30,
  visibility_level: "basic",
  max_applications: "",
  max_jobs_per_year: "",
  features: [],
  is_featured: false,
  is_active: true,
  sort_order: 0,
});

const parseFeatures = (features: unknown): string[] => {
  if (!features) return [];
  if (Array.isArray(features)) return features.map(String).filter(Boolean);
  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return features.split(",").map((f) => f.trim()).filter(Boolean);
    }
  }
  return [];
};

const FieldLabel = ({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) => (
  <div className="mb-1">
    <label className="text-[11px] font-semibold text-foreground">
      {label}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </label>
    {hint ? <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
  </div>
);

const AdminPackages = () => {
  const [packages, setPackages] = useState<JobPackage[]>([]);
  const [editing, setEditing] = useState<JobPackage | null>(null);
  const [featText, setFeatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const packageCount = useMemo(() => packages.length, [packages]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/packages/admin/all`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Package load failed");
      setPackages(Array.isArray(json) ? json : json?.data || []);
    } catch (error: any) {
      console.error("Fetch packages error:", error);
      toast.error(error?.message || "প্যাকেজ লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const startEdit = (pkg?: JobPackage) => {
    const item = pkg || emptyPackage();
    setEditing({
      ...item,
      price: item.price ?? "",
      duration_days: item.duration_days ?? 30,
      max_applications: item.max_applications ?? "",
      max_jobs_per_year: item.max_jobs_per_year ?? "",
      is_featured: !!item.is_featured,
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

    if (!editing.name?.trim()) {
      toast.error("প্যাকেজের নাম দিন");
      return;
    }

    const price = Number(editing.price);
    if (editing.price === "" || Number.isNaN(price) || price < 0) {
      toast.error("সঠিক দাম দিন");
      return;
    }

    if (!VISIBILITY_OPTIONS.some((v) => v.value === editing.visibility_level)) {
      toast.error("ভিজিবিলিটি লেভেল সিলেক্ট করুন");
      return;
    }

    const durationDays =
      editing.duration_days !== "" && editing.duration_days !== null
        ? Number(editing.duration_days)
        : 30;
    if (Number.isNaN(durationDays) || durationDays <= 0) {
      toast.error("সঠিক ডিউরেশন (দিন) দিন");
      return;
    }

    const maxApplications =
      editing.max_applications !== "" &&
      editing.max_applications !== null &&
      editing.max_applications !== undefined
        ? Number(editing.max_applications)
        : null;
    if (maxApplications !== null && (Number.isNaN(maxApplications) || maxApplications < 0)) {
      toast.error("সঠিক Max Applications দিন");
      return;
    }

    const maxJobsPerYear =
      editing.max_jobs_per_year !== "" &&
      editing.max_jobs_per_year !== null &&
      editing.max_jobs_per_year !== undefined
        ? Number(editing.max_jobs_per_year)
        : null;
    if (maxJobsPerYear !== null && (Number.isNaN(maxJobsPerYear) || maxJobsPerYear < 0)) {
      toast.error("সঠিক Max Jobs Per Year দিন");
      return;
    }

    const features = featText.split(",").map((f) => f.trim()).filter(Boolean);
    if (features.length === 0) {
      toast.error("অন্তত একটি ফিচার দিন");
      return;
    }

    const payload = {
      name: editing.name.trim(),
      price,
      duration_days: durationDays,
      visibility_level: editing.visibility_level,
      max_applications: maxApplications,
      max_jobs_per_year: maxJobsPerYear,
      features,
      is_featured: !!editing.is_featured,
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || (json?.errors || []).join(", ") || "Package save failed");

      toast.success(isEdit ? "প্যাকেজ আপডেট হয়েছে" : "নতুন প্যাকেজ যোগ হয়েছে");
      closeForm();
      await fetchPackages();
    } catch (error: any) {
      console.error("Save package error:", error);
      toast.error(error?.message || "প্যাকেজ সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    const yes = confirm("এই প্যাকেজ মুছে ফেলবেন? (যদি কোনো জব এই প্যাকেজ ব্যবহার করে থাকে, তাহলে মুছা যাবে না — এক্ষেত্রে Inactive করুন)");
    if (!yes) return;

    try {
      setDeletingId(id);
      const res = await fetch(`${API_BASE}/packages/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Package delete failed");
      toast.success("প্যাকেজ মুছে ফেলা হয়েছে");
      await fetchPackages();
    } catch (error: any) {
      console.error("Delete package error:", error);
      toast.error(error?.message || "প্যাকেজ মুছা যায়নি");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (pkg: JobPackage) => {
    if (!pkg.id) return;
    const nextActive = !(pkg.is_active !== false && pkg.is_active !== 0);
    try {
      const res = await fetch(`${API_BASE}/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Update failed");
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, is_active: nextActive } : p)));
      toast.success(nextActive ? "প্যাকেজ Active করা হয়েছে" : "প্যাকেজ Inactive করা হয়েছে");
    } catch (error: any) {
      toast.error(error?.message || "স্ট্যাটাস পরিবর্তন করা যায়নি");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div>
          <p className="text-xs font-semibold text-foreground">জব প্যাকেজসমূহ ({packageCount})</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            এমপ্লয়ার জব পোস্ট করার সময় যে প্যাকেজগুলো বেছে নিতে পারবে, সেগুলো এখান থেকে তৈরি ও নিয়ন্ত্রণ করুন
          </p>
        </div>
        <button
          type="button"
          onClick={() => startEdit()}
          className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          নতুন প্যাকেজ
        </button>
      </div>

      {editing ? (
        <div className="m-3 rounded-xl border border-primary/20 bg-background p-3">
          <div className="mb-3 flex items-start justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-primary">
                {editing.id ? "প্যাকেজ এডিট করুন" : "নতুন প্যাকেজ যোগ করুন"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Required field গুলো পূরণ করুন।</p>
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
              <FieldLabel label="প্যাকেজ নাম" required hint="যেমন: বেসিক, স্ট্যান্ডার্ড, প্রিমিয়াম" />
              <input
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="বেসিক প্যাকেজ"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel label="দাম (৳)" required hint="Example: 500" />
              <input
                type="number"
                min="0"
                value={editing.price ?? ""}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                placeholder="500"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel label="ভিজিবিলিটি লেভেল" required hint="EmployerPanel-এ আইকন ও কার্ড স্টাইল নির্ধারণ করে" />
              <select
                value={editing.visibility_level}
                onChange={(e) => setEditing({ ...editing, visibility_level: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel label="মেয়াদ (দিন)" required hint="জব কতদিন visible থাকবে। Example: 30" />
              <input
                type="number"
                min="1"
                value={editing.duration_days ?? 30}
                onChange={(e) => setEditing({ ...editing, duration_days: e.target.value })}
                placeholder="30"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel label="Max Applications" hint="খালি রাখলে Unlimited" />
              <input
                type="number"
                min="0"
                value={editing.max_applications ?? ""}
                onChange={(e) => setEditing({ ...editing, max_applications: e.target.value })}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel label="Max Jobs Per Year" hint="খালি রাখলে কোনো লিমিট নেই" />
              <input
                type="number"
                min="0"
                value={editing.max_jobs_per_year ?? ""}
                onChange={(e) => setEditing({ ...editing, max_jobs_per_year: e.target.value })}
                placeholder="No limit"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <FieldLabel label="Sort Order" hint="যেটা আগে দেখাতে চান তার number কম দিন" />
              <input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                placeholder="1"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel label="ফিচার লিস্ট" required hint="কমা দিয়ে আলাদা করুন। Example: ৩০ দিন ভিজিবিলিটি, ফিচার্ড ব্যাজ, অগ্রাধিকার সাপোর্ট" />
            <input
              value={featText}
              onChange={(e) => setFeatText(e.target.value)}
              placeholder="৩০ দিন ভিজিবিলিটি, ফিচার্ড ব্যাজ, অগ্রাধিকার সাপোর্ট"
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={!!editing.is_featured}
                onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
              />
              Featured প্যাকেজ হিসেবে দেখাবো
            </label>
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_active !== false}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              প্যাকেজ active থাকবে
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
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

      <div className="space-y-1.5 p-3">
        {loading ? (
          <p className="rounded-lg bg-secondary/40 px-2 py-2 text-xs text-muted-foreground">প্যাকেজ লোড হচ্ছে...</p>
        ) : packages.length === 0 ? (
          <p className="rounded-lg bg-secondary/40 px-2 py-2 text-xs text-muted-foreground">কোনো প্যাকেজ যোগ করা হয়নি</p>
        ) : (
          packages.map((pkg) => {
            const isActive = pkg.is_active !== false && pkg.is_active !== 0;
            return (
              <div key={pkg.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1 truncate text-xs font-medium text-foreground">
                    {pkg.name}
                    <span className="rounded-full bg-background px-1.5 py-0.5 text-[9px] capitalize text-muted-foreground">
                      {pkg.visibility_level}
                    </span>
                    {pkg.is_featured ? (
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                        <Star className="h-2.5 w-2.5" /> Featured
                      </span>
                    ) : null}
                    {!isActive ? (
                      <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive">Inactive</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ৳{pkg.price} • {pkg.duration_days} দিন
                    {pkg.max_applications ? ` • Max ${pkg.max_applications} apps` : " • Unlimited apps"}
                  </p>
                  {parseFeatures(pkg.features).length > 0 ? (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {parseFeatures(pkg.features).join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(pkg)}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    title={isActive ? "Deactivate" : "Activate"}
                  >
                    <ShieldCheck className={`h-3.5 w-3.5 ${isActive ? "text-green-600" : ""}`} />
                  </button>
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

export default AdminPackages;