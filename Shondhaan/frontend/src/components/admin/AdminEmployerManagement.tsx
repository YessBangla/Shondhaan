import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { YESSJOB_API_BASE_URL } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, CheckCircle2, XCircle, Eye, Search, MapPin, Users, Globe, Phone, Mail, Package } from "lucide-react";
import { toast } from "sonner";

const API_BASE = `${YESSJOB_API_BASE_URL.replace(/\/+$/, "")}/api`;

const VISIBILITY_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "premium_plus", label: "Premium Plus" },
  { value: "hot", label: "Hot" },
];

const emptyPackageForm = () => ({
  name: "",
  price: 0,
  duration_days: 30,
  visibility_level: "standard",
  max_applications: null as number | null,
  max_jobs_per_year: null as number | null,
  is_featured: false,
  is_active: true,
  sort_order: 0,
  featuresText: "",
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

const AdminEmployerManagement = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [packageForm, setPackageForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ["admin-employers", filter, searchTerm],
    queryFn: async () => {
      let q = supabase.from("employer_profiles").select("*").order("created_at", { ascending: false });
      if (filter === "verified") q = q.eq("is_verified", true);
      if (filter === "pending") q = q.eq("is_verified", false);
      if (searchTerm.length > 1) q = q.ilike("company_name", `%${searchTerm}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Job packages now come from the Express/MySQL backend (packages.js),
  // not Supabase.
  const { data: packages = [] } = useQuery({
    queryKey: ["admin-job-packages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/packages/admin/all`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Package load failed");
      return Array.isArray(json) ? json : json?.data || [];
    },
  });

  const toggleVerify = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("employer_profiles").update({ is_verified: verified } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employers"] });
      toast.success("আপডেট হয়েছে");
    },
  });

  const openNewPackageForm = () => setPackageForm(emptyPackageForm());

  const openEditPackageForm = (pkg: any) => {
    setPackageForm({
      id: pkg.id,
      name: pkg.name || "",
      price: pkg.price ?? 0,
      duration_days: pkg.duration_days ?? 30,
      visibility_level: pkg.visibility_level || "standard",
      max_applications: pkg.max_applications ?? null,
      max_jobs_per_year: pkg.max_jobs_per_year ?? null,
      is_featured: !!pkg.is_featured,
      is_active: pkg.is_active === false || pkg.is_active === 0 ? false : true,
      sort_order: pkg.sort_order ?? 0,
      featuresText: parseFeatures(pkg.features).join(", "),
    });
  };

  const closePackageForm = () => setPackageForm(null);

  const handleSavePackage = async () => {
    if (!packageForm) return;

    if (!packageForm.name?.trim()) {
      toast.error("প্যাকেজের নাম দিন");
      return;
    }
    if (packageForm.price === "" || Number.isNaN(Number(packageForm.price)) || Number(packageForm.price) < 0) {
      toast.error("সঠিক দাম দিন");
      return;
    }
    const features = String(packageForm.featuresText || "")
      .split(",")
      .map((f: string) => f.trim())
      .filter(Boolean);
    if (features.length === 0) {
      toast.error("অন্তত একটি ফিচার দিন");
      return;
    }

    const payload = {
      name: packageForm.name.trim(),
      price: Number(packageForm.price),
      duration_days: Number(packageForm.duration_days || 30),
      visibility_level: packageForm.visibility_level,
      max_applications:
        packageForm.max_applications === "" || packageForm.max_applications === null
          ? null
          : Number(packageForm.max_applications),
      max_jobs_per_year:
        packageForm.max_jobs_per_year === "" || packageForm.max_jobs_per_year === null
          ? null
          : Number(packageForm.max_jobs_per_year),
      features,
      is_featured: !!packageForm.is_featured,
      is_active: packageForm.is_active !== false,
      sort_order: Number(packageForm.sort_order || 0),
    };

    try {
      setSaving(true);
      const isEdit = Boolean(packageForm.id);
      const res = await fetch(
        isEdit ? `${API_BASE}/packages/${packageForm.id}` : `${API_BASE}/packages`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || (json?.errors || []).join(", ") || "Package save failed");
      }
      qc.invalidateQueries({ queryKey: ["admin-job-packages"] });
      toast.success(isEdit ? "প্যাকেজ আপডেট হয়েছে" : "প্যাকেজ সেভ হয়েছে");
      closePackageForm();
    } catch (error: any) {
      console.error("Save package error:", error);
      toast.error(error?.message || "প্যাকেজ সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/packages/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Package delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-job-packages"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
    onError: (error: any) => {
      toast.error(error?.message || "প্যাকেজ মুছা যায়নি");
    },
  });

  const pendingCount = employers.filter((e: any) => !e.is_verified).length;

  return (
    <div className="space-y-6">
      {/* Employer Profiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold">এমপ্লয়ার ম্যানেজমেন্ট</h2>
            {pendingCount > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-xs">{pendingCount} যাচাই অপেক্ষমাণ</Badge>}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="কোম্পানি খুঁজুন..." className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "সকল" },
            { key: "pending", label: "যাচাই অপেক্ষমাণ" },
            { key: "verified", label: "যাচাইকৃত" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f.key ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : employers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">কোনো এমপ্লয়ার নেই</p>
        ) : (
          <div className="space-y-2">
            {employers.map((emp: any) => (
              <div key={emp.id} className="border rounded-lg p-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{emp.company_name}</h3>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                        {emp.industry_type && <span>{emp.industry_type}</span>}
                        {emp.district && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{emp.district}</span>}
                        <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{emp.employee_count} জন</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[10px] ${emp.is_verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {emp.is_verified ? "যাচাইকৃত" : "অপেক্ষমাণ"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(emp)}><Eye className="h-3.5 w-3.5" /></Button>
                    {!emp.is_verified ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => toggleVerify.mutate({ id: emp.id, verified: true })}><CheckCircle2 className="h-4 w-4" /></Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => toggleVerify.mutate({ id: emp.id, verified: false })}><XCircle className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Packages Management (backed by Express /api/packages) */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> জব পোস্টিং প্যাকেজ</h2>
          <Button size="sm" onClick={openNewPackageForm}>নতুন প্যাকেজ</Button>
        </div>
        <div className="space-y-2">
          {packages.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-xs">কোনো প্যাকেজ নেই</p>
          ) : (
            packages.map((pkg: any) => (
              <div key={pkg.id} className="border rounded-lg p-3 bg-card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">
                    {pkg.name}
                    {pkg.is_active === false || pkg.is_active === 0 ? (
                      <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive">Inactive</span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-muted-foreground">৳{pkg.price} • {pkg.duration_days} দিন{pkg.is_featured ? " • ফিচার্ড" : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEditPackageForm(pkg)}>সম্পাদনা</Button>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deletePackage.mutate(pkg.id)}>মুছুন</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Employer Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.company_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                {selected.company_name_bn && <div><span className="text-muted-foreground">বাংলা নাম:</span> <span className="font-medium">{selected.company_name_bn}</span></div>}
                <div><span className="text-muted-foreground">ধরন:</span> <span className="font-medium">{selected.company_type}</span></div>
                {selected.industry_type && <div><span className="text-muted-foreground">ইন্ডাস্ট্রি:</span> <span className="font-medium">{selected.industry_type}</span></div>}
                {selected.establishment_year && <div><span className="text-muted-foreground">প্রতিষ্ঠা:</span> <span className="font-medium">{selected.establishment_year}</span></div>}
                <div><span className="text-muted-foreground">কর্মী:</span> <span className="font-medium">{selected.employee_count}</span></div>
                {selected.district && <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{selected.district}{selected.thana ? `, ${selected.thana}` : ""}</span></div>}
                {selected.contact_phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{selected.contact_phone}</span></div>}
                {selected.contact_email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{selected.contact_email}</span></div>}
                {selected.website_url && <div className="flex items-center gap-1"><Globe className="h-3 w-3 text-muted-foreground" /><a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="text-primary">{selected.website_url}</a></div>}
              </div>
              {selected.description && <p className="text-muted-foreground">{selected.description}</p>}
              <div className="flex gap-2 pt-2">
                <p className="text-muted-foreground">মোট পোস্ট: {selected.total_jobs_posted} | মোট নিয়োগ: {selected.total_hires}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Package Form Modal */}
      <Dialog open={!!packageForm} onOpenChange={(open) => !open && closePackageForm()}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{packageForm?.id ? "প্যাকেজ সম্পাদনা" : "নতুন প্যাকেজ"}</DialogTitle></DialogHeader>
          {packageForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">নাম</label>
                  <Input value={packageForm.name} onChange={e => setPackageForm((p: any) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">মূল্য (৳)</label>
                  <Input type="number" value={packageForm.price} onChange={e => setPackageForm((p: any) => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">সময়কাল (দিন)</label>
                  <Input type="number" value={packageForm.duration_days} onChange={e => setPackageForm((p: any) => ({ ...p, duration_days: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">সর্বোচ্চ আবেদন</label>
                  <Input type="number" value={packageForm.max_applications ?? ""} onChange={e => setPackageForm((p: any) => ({ ...p, max_applications: e.target.value ? e.target.value : null }))} placeholder="আনলিমিটেড" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">ভিজিবিলিটি লেভেল</label>
                  <select
                    value={packageForm.visibility_level}
                    onChange={e => setPackageForm((p: any) => ({ ...p, visibility_level: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-ring h-9"
                  >
                    {VISIBILITY_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">বছরে সর্বোচ্চ জব</label>
                  <Input type="number" value={packageForm.max_jobs_per_year ?? ""} onChange={e => setPackageForm((p: any) => ({ ...p, max_jobs_per_year: e.target.value ? e.target.value : null }))} placeholder="No limit" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">ফিচার (কমা দিয়ে আলাদা করুন)</label>
                <Input
                  value={packageForm.featuresText}
                  onChange={e => setPackageForm((p: any) => ({ ...p, featuresText: e.target.value }))}
                  placeholder="৩০ দিন ভিজিবিলিটি, ফিচার্ড ব্যাজ"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pkg-featured" checked={packageForm.is_featured} onChange={e => setPackageForm((p: any) => ({ ...p, is_featured: e.target.checked }))} />
                  <label htmlFor="pkg-featured" className="text-xs">ফিচার্ড প্যাকেজ</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pkg-active" checked={packageForm.is_active !== false} onChange={e => setPackageForm((p: any) => ({ ...p, is_active: e.target.checked }))} />
                  <label htmlFor="pkg-active" className="text-xs">Active</label>
                </div>
              </div>
              <Button onClick={handleSavePackage} disabled={saving} className="w-full">
                {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployerManagement;