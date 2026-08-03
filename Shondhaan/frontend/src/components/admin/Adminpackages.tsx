import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Package, Plus, Pencil, Trash2, X, Check, Star, StarOff,
  Eye, EyeOff, Loader2, GripVertical,
} from "lucide-react";
import { getMySqlAuth } from "@/lib/mysqlAuth";

// Use the same yessjob backend base URL as AdminJobListings / AdminEmployerManagement.
const API_BASE = import.meta.env.VITE_YESSJOB_API_URL || "";

function getAuthHeaders() {
  const auth = getMySqlAuth();
  if (!auth?.token) {
    console.warn("[AdminPackages] Missing MySQL auth token in localStorage yess_mysql_auth");
    return {};
  }
  return { Authorization: `Bearer ${auth.token}` };
}

interface PackageItem {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  visibility_level: "basic" | "standard" | "premium" | "premium_plus" | "hot";
  max_applications: number | null;
  max_jobs_per_year: number | null;
  features: string[];
  is_featured: 0 | 1;
  is_active: 0 | 1;
  sort_order: number;
}

const visibilityOptions: { value: PackageItem["visibility_level"]; label: string }[] = [
  { value: "basic", label: "বেসিক" },
  { value: "standard", label: "স্ট্যান্ডার্ড" },
  { value: "premium", label: "প্রিমিয়াম" },
  { value: "premium_plus", label: "প্রিমিয়াম প্লাস" },
  { value: "hot", label: "হট" },
];

const emptyForm = {
  name: "",
  price: "",
  duration_days: "30",
  visibility_level: "basic" as PackageItem["visibility_level"],
  max_applications: "",
  max_jobs_per_year: "",
  features: [] as string[],
  is_featured: false,
  is_active: true,
  sort_order: "0",
};

type FormState = typeof emptyForm;

const AdminPackages = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchPackages = useCallback(async () => {
setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/packages/admin/all`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setPackages(data);
    } catch (err) {
      console.error(err);
      setError("প্যাকেজ লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const resetForm = () => {
    setForm(emptyForm);
    setFeatureInput("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (pkg: PackageItem) => {
    setForm({
      name: pkg.name,
      price: String(pkg.price),
      duration_days: String(pkg.duration_days),
      visibility_level: pkg.visibility_level,
      max_applications: pkg.max_applications === null ? "" : String(pkg.max_applications),
      max_jobs_per_year: pkg.max_jobs_per_year === null ? "" : String(pkg.max_jobs_per_year),
      features: pkg.features,
      is_featured: !!pkg.is_featured,
      is_active: !!pkg.is_active,
      sort_order: String(pkg.sort_order),
    });
    setEditingId(pkg.id);
    setShowForm(true);
  };

  const addFeature = () => {
    const val = featureInput.trim();
    if (!val) return;
    setForm(f => ({ ...f, features: [...f.features, val] }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    console.log("handleSubmit fired", { API_BASE, form });
    if (!form.name.trim() || form.price === "" || form.features.length === 0) {
      console.log("blocked by validation", { name: form.name, price: form.price, features: form.features });
      setError("নাম, মূল্য এবং অন্তত একটি ফিচার আবশ্যক");
      return;
    }
    setSaving(true);
    setError(null);
    console.log("about to fetch", editingId ? "PUT" : "POST");

    const body = {
      name: form.name.trim(),
      price: Number(form.price),
      duration_days: Number(form.duration_days) || 30,
      visibility_level: form.visibility_level,
      max_applications: form.max_applications === "" ? null : Number(form.max_applications),
      max_jobs_per_year: form.max_jobs_per_year === "" ? null : Number(form.max_jobs_per_year),
      features: form.features,
      is_featured: form.is_featured,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      const url = editingId ? `${API_BASE}/api/packages/${editingId}` : `${API_BASE}/api/packages`;
      const method = editingId ? "PUT" : "POST";
console.log("fetching url:", url);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      console.log("response status:", res.status);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.log("error body:", errData);
        throw new Error(errData.message || "সেভ করতে সমস্যা হয়েছে");
      }
      await fetchPackages();
      resetForm();
    } catch (err: any) {
      console.error("save failed:", err);
      setError(err.message || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("এই প্যাকেজটি মুছে ফেলতে চান?")) return;
setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "মুছে ফেলতে সমস্যা হয়েছে");
      }
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleField = async (pkg: PackageItem, field: "is_active" | "is_featured") => {
setTogglingId(pkg.id);
    const newValue = pkg[field] ? 0 : 1;
    try {
      const res = await fetch(`${API_BASE}/api/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) throw new Error("failed");
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, [field]: newValue } : p));
    } catch (err) {
      console.error(err);
      setError("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> চাকরি প্যাকেজ
        </h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> নতুন প্যাকেজ
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {editingId ? "প্যাকেজ সম্পাদনা করুন" : "নতুন প্যাকেজ তৈরি করুন"}
            </p>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">প্যাকেজের নাম</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="যেমনঃ প্রিমিয়াম প্যাকেজ"
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">মূল্য (৳)</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">মেয়াদ (দিন)</label>
              <input type="number" min="1" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ভিজিবিলিটি লেভেল</label>
              <select value={form.visibility_level} onChange={e => setForm(f => ({ ...f, visibility_level: e.target.value as FormState["visibility_level"] }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
                {visibilityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">সর্বোচ্চ আবেদন (ফাঁকা = সীমাহীন)</label>
              <input type="number" min="0" value={form.max_applications} onChange={e => setForm(f => ({ ...f, max_applications: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">বছরে সর্বোচ্চ জব পোস্ট (ফাঁকা = সীমাহীন)</label>
              <input type="number" min="0" value={form.max_jobs_per_year} onChange={e => setForm(f => ({ ...f, max_jobs_per_year: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">সর্ট অর্ডার</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                ফিচার্ড
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                সক্রিয়
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">ফিচার তালিকা</label>
            <div className="mt-1 flex gap-2">
              <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                placeholder="যেমনঃ ৩০ দিন ভিজিবিলিটি"
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
              <button onClick={addFeature} type="button"
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary">যোগ করুন</button>
            </div>
            {form.features.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.features.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-1.5"><GripVertical className="h-3 w-3 text-muted-foreground" /> {f}</span>
                    <button onClick={() => removeFeature(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-secondary">
              বাতিল
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editingId ? "আপডেট করুন" : "তৈরি করুন"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {packages.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">কোনো প্যাকেজ পাওয়া যায়নি</div>
        ) : packages.map((pkg, i) => (
          <motion.div key={pkg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={`rounded-xl border p-4 shadow-sm ${pkg.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-sm font-semibold text-foreground">{pkg.name}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {visibilityOptions.find(v => v.value === pkg.visibility_level)?.label}
                  </span>
                  {!pkg.is_active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">নিষ্ক্রিয়</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ৳{pkg.price} — {pkg.duration_days} দিন
                  {pkg.max_applications !== null && ` • সর্বোচ্চ ${pkg.max_applications} আবেদন`}
                  {pkg.max_jobs_per_year !== null && ` • বছরে ${pkg.max_jobs_per_year} জব`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleField(pkg, "is_featured")} disabled={togglingId === pkg.id}
                  title={pkg.is_featured ? "ফিচার্ড বাদ দিন" : "ফিচার্ড করুন"}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-50">
                  {pkg.is_featured ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" /> : <StarOff className="h-4 w-4" />}
                </button>
                <button onClick={() => toggleField(pkg, "is_active")} disabled={togglingId === pkg.id}
                  title={pkg.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-50">
                  {pkg.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => startEdit(pkg)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(pkg.id)} disabled={deletingId === pkg.id}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
                  {deletingId === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {pkg.features?.length > 0 && (
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-border/50">
                {pkg.features.map((f, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminPackages;