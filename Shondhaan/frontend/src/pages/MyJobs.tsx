import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMyJobs, useMyApplications, useJobApplications, useSavedJobs, useUpdateApplicationStatus } from "@/hooks/useJobData";
import { Briefcase, ArrowLeft, Clock, CheckCircle2, XCircle, Eye, Users, FileText, Plus, Bookmark, Star, Download, UserCheck, UserX, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  closed: "bg-gray-100 text-gray-800",
  shortlisted: "bg-blue-100 text-blue-800",
};

const MyJobs = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bn = language === "bn";

  const { data: myJobs = [] } = useMyJobs();
  const { data: myApps = [] } = useMyApplications();
  const { data: savedJobs = [] } = useSavedJobs();
  const [viewAppsJobId, setViewAppsJobId] = useState<string | null>(null);
  const { data: jobApps = [] } = useJobApplications(viewAppsJobId || undefined);
  const [appFilter, setAppFilter] = useState("all");
  const updateAppStatus = useUpdateApplicationStatus();

  if (!user) { navigate("/auth"); return null; }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = bn
      ? { pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "বাতিল", closed: "বন্ধ", shortlisted: "শর্টলিস্টেড" }
      : { pending: "Pending", approved: "Approved", rejected: "Rejected", closed: "Closed", shortlisted: "Shortlisted" };
    return map[s] || s;
  };

  const filteredApps = appFilter === "all" ? jobApps : jobApps.filter(a => a.status === appFilter);

  const handleStatusUpdate = (appId: string, status: string) => {
    updateAppStatus.mutate({ applicationId: appId, status });
  };

  const totalViews = myJobs.reduce((sum, j) => sum + (j.views_count || 0), 0);
  const totalApps = myJobs.reduce((sum, j) => sum + (j.applications_count || 0), 0);

  return (
    <JobsPageTransition>
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />
      <JobsMenuBar />

      <div className="app-container py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="-ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Shondhaan Jobs
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/jobs/profile")} className="gap-1 text-xs">
              <FileText className="h-3.5 w-3.5" /> {bn ? "আমার CV" : "My CV"}
            </Button>
            <Button size="sm" onClick={() => navigate("/jobs/post")} className="bg-primary hover:bg-emerald-800 gap-1">
              <Plus className="h-3.5 w-3.5" /> {bn ? "নতুন বিজ্ঞাপন" : "New Post"}
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          {bn ? "আমার চাকরি ড্যাশবোর্ড" : "My Jobs Dashboard"}
        </h1>

        {/* Stats Cards - Employer Dashboard */}
        {myJobs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{myJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">{bn ? "মোট পোস্ট" : "Total Posts"}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{myJobs.filter(j => j.status === "approved").length}</p>
              <p className="text-[10px] text-muted-foreground">{bn ? "সক্রিয়" : "Active"}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-lg font-bold text-purple-600">{totalViews}</p>
              <p className="text-[10px] text-muted-foreground">{bn ? "মোট ভিউ" : "Total Views"}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{totalApps}</p>
              <p className="text-[10px] text-muted-foreground">{bn ? "মোট আবেদন" : "Total Apps"}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="posted">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="posted" className="gap-1 text-xs"><Briefcase className="h-3 w-3" />{bn ? `বিজ্ঞাপন (${myJobs.length})` : `Posts (${myJobs.length})`}</TabsTrigger>
            <TabsTrigger value="applications" className="gap-1 text-xs"><FileText className="h-3 w-3" />{bn ? `আবেদন (${myApps.length})` : `Applied (${myApps.length})`}</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1 text-xs"><Bookmark className="h-3 w-3" />{bn ? `সংরক্ষিত (${savedJobs.length})` : `Saved (${savedJobs.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="posted" className="space-y-3 mt-4">
            {myJobs.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">{bn ? "আপনি এখনো কোনো চাকরির বিজ্ঞাপন দেননি" : "You haven't posted any jobs yet"}</p>
                <Button onClick={() => navigate("/jobs/post")} className="bg-primary border border-primary hover:bg-background hover:text-foreground gap-1">
                  <Plus className="h-4 w-4" /> {bn ? "বিজ্ঞাপন দিন" : "Post a Job"}
                </Button>
              </div>
            ) : myJobs.map((job) => (
              <div key={job.id} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{job.title}</h3>
                    <p className="text-xs text-muted-foreground">{job.company_name}</p>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[job.status] || ""}`}>{statusLabel(job.status)}</Badge>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {job.views_count} {bn ? "ভিউ" : "views"}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applications_count} {bn ? "আবেদন" : "apps"}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(job.created_at), "dd MMM yyyy")}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {job.status === "approved" && (
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Eye className="h-3 w-3" /> {bn ? "দেখুন" : "View"}
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setViewAppsJobId(job.id)} className="gap-1 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
                    <Users className="h-3 w-3" /> {bn ? `আবেদন (${job.applications_count})` : `Applications (${job.applications_count})`}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="applications" className="space-y-3 mt-4">
            {myApps.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">{bn ? "আপনি এখনো কোনো চাকরিতে আবেদন করেননি" : "You haven't applied to any jobs yet"}</p>
                <Button onClick={() => navigate("/jobs")} className="bg-blue-600 hover:bg-blue-700 gap-1">
                  <Briefcase className="h-4 w-4" /> {bn ? "চাকরি খুঁজুন" : "Browse Jobs"}
                </Button>
              </div>
            ) : myApps.map((app: any) => (
              <div key={app.id} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/jobs/${app.job_id}`} className="font-semibold text-sm hover:text-blue-600 transition-colors">{app.jobs?.title || "—"}</Link>
                    <p className="text-xs text-muted-foreground">{app.jobs?.company_name || "—"}</p>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[app.status] || ""}`}>{statusLabel(app.status)}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(app.created_at), "dd MMM yyyy")}</span>
                  {app.cv_url && (
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {bn ? "CV" : "CV"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="saved" className="space-y-3 mt-4">
            {savedJobs.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">{bn ? "আপনি এখনো কোনো চাকরি সংরক্ষণ করেননি" : "No saved jobs yet"}</p>
                <Button onClick={() => navigate("/jobs")} className="bg-blue-600 hover:bg-blue-700 gap-1">
                  <Briefcase className="h-4 w-4" /> {bn ? "চাকরি খুঁজুন" : "Browse Jobs"}
                </Button>
              </div>
            ) : savedJobs.map((saved: any) => (
              <Link key={saved.id} to={`/jobs/${saved.jobs?.id}`} className="block rounded-xl border bg-card p-4 hover:shadow-sm transition-all group">
                <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{saved.jobs?.title || "—"}</h3>
                <p className="text-xs text-muted-foreground">{saved.jobs?.company_name || "—"}</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">{bn ? "সংরক্ষিত:" : "Saved:"} {format(new Date(saved.created_at), "dd MMM yyyy")}</span>
              </Link>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Applications Modal - Employer Dashboard with status management */}
      <Dialog open={!!viewAppsJobId} onOpenChange={() => setViewAppsJobId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {bn ? "আবেদনকারীদের তালিকা" : "Applicant Management"}
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <p className="text-sm font-bold text-yellow-700">{jobApps.filter(a => a.status === "pending").length}</p>
              <p className="text-[10px] text-yellow-600">{bn ? "নতুন" : "New"}</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-sm font-bold text-blue-700">{jobApps.filter(a => a.status === "shortlisted").length}</p>
              <p className="text-[10px] text-blue-600">{bn ? "শর্টলিস্ট" : "Shortlisted"}</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <p className="text-sm font-bold text-red-700">{jobApps.filter(a => a.status === "rejected").length}</p>
              <p className="text-[10px] text-red-600">{bn ? "বাতিল" : "Rejected"}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {["all", "pending", "shortlisted", "rejected"].map(f => (
              <button key={f} onClick={() => setAppFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${appFilter === f ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                {f === "all" ? (bn ? "সব" : "All") : statusLabel(f)} ({f === "all" ? jobApps.length : jobApps.filter(a => a.status === f).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{bn ? "কোনো আবেদন পাওয়া যায়নি" : "No applications found"}</p>
            ) : filteredApps.map((app) => (
              <div key={app.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{app.applicant_name}</p>
                    <p className="text-xs text-muted-foreground">{app.applicant_phone} {app.applicant_email && `• ${app.applicant_email}`}</p>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[app.status] || ""}`}>{statusLabel(app.status)}</Badge>
                </div>
                {app.cover_letter && <p className="text-xs mt-2 text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded">{app.cover_letter}</p>}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {app.cv_url && (
                      <a href={app.cv_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                          <Download className="h-3 w-3" /> CV
                        </Button>
                      </a>
                    )}
                    <span className="text-[10px] text-muted-foreground">{format(new Date(app.created_at), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex gap-1">
                    {app.status !== "shortlisted" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleStatusUpdate(app.id, "shortlisted")}>
                        <UserCheck className="h-3 w-3" /> {bn ? "শর্টলিস্ট" : "Shortlist"}
                      </Button>
                    )}
                    {app.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatusUpdate(app.id, "rejected")}>
                        <UserX className="h-3 w-3" /> {bn ? "বাতিল" : "Reject"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default MyJobs;
