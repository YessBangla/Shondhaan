import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Eye, Building2, MapPin, FileText, Users, Search, Star, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Job, JobApplication } from "@/hooks/useJobData";
import { JOB_CATEGORIES, COMPANY_TYPES } from "@/hooks/useJobData";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  closed: "bg-gray-100 text-gray-800",
};

const AdminJobListings = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["admin-jobs", filter, searchTerm],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      if (searchTerm.length > 2) q = q.or(`title.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Job[];
    },
  });

  const { data: apps = [] } = useQuery({
    queryKey: ["admin-job-apps", selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob) return [];
      const { data, error } = await supabase.from("job_portal_applications").select("*").eq("job_id", selectedJob.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as JobApplication[];
    },
    enabled: !!selectedJob,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("jobs").update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("আপডেট হয়েছে");
    },
  });

  const pendingCount = jobs.filter((j) => j.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Yess Jobs ম্যানেজমেন্ট</h2>
          {pendingCount > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-xs">{pendingCount} অপেক্ষমাণ</Badge>}
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="খুঁজুন..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {[
          { key: "pending", label: "অপেক্ষমাণ" },
          { key: "approved", label: "অনুমোদিত" },
          { key: "rejected", label: "বাতিল" },
          { key: "all", label: "সকল" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f.key ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : jobs.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">কোনো বিজ্ঞাপন নেই</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                      {job.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{job.company_name}</p>
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      {job.district && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.district}</span>}
                      <span>{format(new Date(job.created_at), "dd MMM yyyy")}</span>
                      <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{job.applications_count} আবেদন</span>
                      {job.category && <Badge variant="outline" className="text-[9px] h-4">{job.category}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className={`text-[10px] ${statusColors[job.status]}`}>
                    {job.status === "pending" ? "অপেক্ষমাণ" : job.status === "approved" ? "অনুমোদিত" : "বাতিল"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleFeatured.mutate({ id: job.id, featured: !job.is_featured })}
                    title="Toggle Featured"
                  >
                    <Star className={`h-3.5 w-3.5 ${job.is_featured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedJob(job)}><Eye className="h-3.5 w-3.5" /></Button>
                  {job.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => updateStatus.mutate({ id: job.id, status: "approved" })}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => updateStatus.mutate({ id: job.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                    </>
                  )}
                  {job.status === "approved" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => updateStatus.mutate({ id: job.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                  )}
                  {job.status === "rejected" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => updateStatus.mutate({ id: job.id, status: "approved" })}><CheckCircle2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg text-xs">
                <div><span className="text-muted-foreground">প্রতিষ্ঠান:</span> <span className="font-medium">{selectedJob.company_name}</span></div>
                <div><span className="text-muted-foreground">ক্যাটেগরি:</span> <span className="font-medium">{selectedJob.category}</span></div>
                <div><span className="text-muted-foreground">ধরন:</span> <span className="font-medium">{selectedJob.job_type}</span></div>
                <div><span className="text-muted-foreground">প্রতিষ্ঠানের ধরন:</span> <span className="font-medium">{selectedJob.company_type || "—"}</span></div>
                {selectedJob.district && <div><span className="text-muted-foreground">অবস্থান:</span> <span className="font-medium">{selectedJob.district}{selectedJob.thana ? `, ${selectedJob.thana}` : ""}</span></div>}
                {(selectedJob.salary_min || selectedJob.salary_max) && (
                  <div><span className="text-muted-foreground">বেতন:</span> <span className="font-medium">৳{selectedJob.salary_min.toLocaleString("bn-BD")} - ৳{selectedJob.salary_max.toLocaleString("bn-BD")}</span></div>
                )}
                <div><span className="text-muted-foreground">পদ সংখ্যা:</span> <span className="font-medium">{selectedJob.vacancy_count}</span></div>
                {selectedJob.education_required && <div><span className="text-muted-foreground">শিক্ষা:</span> <span className="font-medium">{selectedJob.education_required}</span></div>}
                {selectedJob.gender_preference && selectedJob.gender_preference !== "any" && <div><span className="text-muted-foreground">লিঙ্গ:</span> <span className="font-medium">{selectedJob.gender_preference}</span></div>}
              </div>

              <div>
                <strong>বিবরণ:</strong>
                <p className="whitespace-pre-wrap text-muted-foreground mt-1 text-xs">{selectedJob.description}</p>
              </div>
              {selectedJob.requirements && (
                <div>
                  <strong>যোগ্যতা:</strong>
                  <p className="whitespace-pre-wrap text-muted-foreground mt-1 text-xs">{selectedJob.requirements}</p>
                </div>
              )}
              {selectedJob.contact_phone && <div className="text-xs"><strong>ফোন:</strong> {selectedJob.contact_phone}</div>}
              {selectedJob.contact_email && <div className="text-xs"><strong>ইমেইল:</strong> {selectedJob.contact_email}</div>}

              {/* Applications */}
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2">আবেদনসমূহ ({apps.length})</h3>
                {apps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">কোনো আবেদন নেই</p>
                ) : apps.map((app) => (
                  <div key={app.id} className="border rounded p-2 mb-2">
                    <p className="font-medium text-xs">{app.applicant_name} — {app.applicant_phone}</p>
                    {app.applicant_email && <p className="text-[10px] text-muted-foreground">{app.applicant_email}</p>}
                    {app.cover_letter && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{app.cover_letter}</p>}
                    {app.cv_url && <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1"><FileText className="h-3 w-3" /> CV দেখুন</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobListings;
