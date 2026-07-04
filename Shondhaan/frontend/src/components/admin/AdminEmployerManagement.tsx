import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, CheckCircle2, XCircle, Eye, Search, MapPin, Users, Globe, Phone, Mail, Calendar, Package } from "lucide-react";
import { toast } from "sonner";

const AdminEmployerManagement = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [packageForm, setPackageForm] = useState<any>(null);

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

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-job-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("job_packages").select("*").order("sort_order");
      return data || [];
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

  const savePackage = useMutation({
    mutationFn: async (pkg: any) => {
      if (pkg.id) {
        const { error } = await supabase.from("job_packages").update(pkg).eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_packages").insert(pkg);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-job-packages"] });
      setPackageForm(null);
      toast.success("প্যাকেজ সেভ হয়েছে");
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-job-packages"] });
      toast.success("মুছে ফেলা হয়েছে");
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

      {/* Job Packages Management */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> জব পোস্টিং প্যাকেজ</h2>
          <Button size="sm" onClick={() => setPackageForm({ name: "", name_bn: "", price: 0, duration_days: 30, max_applications: null, is_featured: false, visibility_level: "standard", features: [], sort_order: 0 })}>
            নতুন প্যাকেজ
          </Button>
        </div>
        <div className="space-y-2">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className="border rounded-lg p-3 bg-card flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{pkg.name}</h3>
                <p className="text-xs text-muted-foreground">৳{pkg.price} • {pkg.duration_days} দিন{pkg.is_featured ? " • ফিচার্ড" : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPackageForm(pkg)}>সম্পাদনা</Button>
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deletePackage.mutate(pkg.id)}>মুছুন</Button>
              </div>
            </div>
          ))}
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
      <Dialog open={!!packageForm} onOpenChange={() => setPackageForm(null)}>
        <DialogContent className="max-w-md">
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
                  <Input type="number" value={packageForm.price} onChange={e => setPackageForm((p: any) => ({ ...p, price: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">সময়কাল (দিন)</label>
                  <Input type="number" value={packageForm.duration_days} onChange={e => setPackageForm((p: any) => ({ ...p, duration_days: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">সর্বোচ্চ আবেদন</label>
                  <Input type="number" value={packageForm.max_applications || ""} onChange={e => setPackageForm((p: any) => ({ ...p, max_applications: e.target.value ? parseInt(e.target.value) : null }))} placeholder="আনলিমিটেড" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pkg-featured" checked={packageForm.is_featured} onChange={e => setPackageForm((p: any) => ({ ...p, is_featured: e.target.checked }))} />
                <label htmlFor="pkg-featured" className="text-xs">ফিচার্ড প্যাকেজ</label>
              </div>
              <Button onClick={() => savePackage.mutate(packageForm)} className="w-full">সেভ করুন</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployerManagement;
