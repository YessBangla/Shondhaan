import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useJobDetail, useApplyJob, useRelatedJobs, useIncrementJobView, useSaveJob, useSavedJobs, useJobSeekerProfile, JOB_TYPES, JOB_CATEGORIES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES } from "@/hooks/useJobData";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, Clock, Building2, Banknote, Users, Calendar, Phone, Mail, ArrowLeft, Send, Eye, GraduationCap, User2, Building, AlertCircle, Share2, Bookmark, BookmarkCheck, Printer, CheckCircle2, ChevronRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, differenceInDays, isPast } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { toast } from "sonner";
import CompanyLogo from "@/components/jobs/CompanyLogo";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bn = language === "bn";

  const { data: job, isLoading } = useJobDetail(id);
  const applyMutation = useApplyJob();
  const { data: relatedJobs = [] } = useRelatedJobs(job?.category, id);
  const incrementView = useIncrementJobView();
  const { data: savedJobs = [] } = useSavedJobs();
  const saveJob = useSaveJob();
  const { data: seekerProfile } = useJobSeekerProfile();

  const isSaved = savedJobs.some((s: any) => s.job_id === id);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Increment views on page load
  useEffect(() => {
    if (id) incrementView.mutate(id);
  }, [id]);

  const getLabel = (list: { value: string; labelBn: string; labelEn: string }[], val: string) =>
    list.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  const handleApply = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!applicantName.trim() || !applicantPhone.trim()) {
      toast.error(bn ? "নাম ও ফোন নম্বর দিন" : "Name and phone required");
      return;
    }

    setUploading(true);
    let cvUrl: string | null = null;

    if (cvFile) {
      const ext = cvFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("job-cvs").upload(path, cvFile);
      if (upErr) { toast.error("CV upload failed"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("job-cvs").getPublicUrl(path);
      cvUrl = urlData.publicUrl;
    }

    await applyMutation.mutateAsync({
      job_id: id,
      applicant_name: applicantName,
      applicant_phone: applicantPhone,
      applicant_email: applicantEmail || null,
      cv_url: cvUrl,
      cover_letter: coverLetter || null,
      video_cv_url: seekerProfile?.video_cv_url || null,
    } as any);

    setUploading(false);
    setShowApplyModal(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: job?.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(bn ? "লিঙ্ক কপি হয়েছে" : "Link copied!");
    }
  };

  const handleSave = () => {
    if (!user) { navigate("/auth"); return; }
    saveJob.mutate({ jobId: id!, action: isSaved ? "unsave" : "save" });
  };

  if (isLoading) {
    return (
      <JobsPageTransition>
        <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />
        <JobsMenuBar />
        <div className="app-container py-12">
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse mt-4" />
        </div>
      </JobsPageTransition>
    );
  }

  if (!job) {
    return (
      <JobsPageTransition>
        <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />
        <JobsMenuBar />
        <div className="text-center py-20">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{bn ? "চাকরি খুঁজে পাওয়া যায়নি" : "Job not found"}</p>
          <Button variant="outline" onClick={() => navigate("/jobs")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> {bn ? "ফিরে যান" : "Go back"}
          </Button>
        </div>
      </JobsPageTransition>
    );
  }

  const deadlineDays = job.deadline ? differenceInDays(new Date(job.deadline), new Date()) : null;
  const isExpired = job.deadline ? isPast(new Date(job.deadline)) : false;

  return (
    <JobsPageTransition>
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />
      <JobsMenuBar />

      <div className="app-container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Back + actions */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="-ml-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Yess Jobs
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-8 w-8 hidden md:flex">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Deadline Warning */}
            {deadlineDays !== null && deadlineDays <= 3 && !isExpired && (
              <div className="mb-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {bn ? `আবেদনের শেষ তারিখ মাত্র ${deadlineDays} দিন বাকি!` : `Only ${deadlineDays} days left to apply!`}
              </div>
            )}
            {isExpired && (
              <div className="mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {bn ? "আবেদনের সময়সীমা শেষ হয়ে গেছে" : "Application deadline has passed"}
              </div>
            )}

            {/* Header Card - bdjobs style */}
            <div className="rounded-xl border bg-card p-5 mb-4">
              <div className="flex items-start gap-4">
                <CompanyLogo
                  src={job.company_logo_url}
                  alt={job.company_name}
                  sizeClass="w-16 h-16"
                  iconClass="h-8 w-8 text-blue-600"
                  fallbackBgClass="bg-blue-50 dark:bg-blue-900/30"
                />
                <div className="flex-1">
                  <h1 className="text-lg md:text-xl font-bold">{job.title}</h1>
                  <p className="text-muted-foreground text-sm mt-0.5 font-medium">{job.company_name}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200"><Clock className="h-3 w-3 mr-1" />{getLabel(JOB_TYPES, job.job_type)}</Badge>
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200">{getLabel(JOB_CATEGORIES, job.category)}</Badge>
                    {job.company_type && <Badge variant="outline"><Building className="h-3 w-3 mr-1" />{getLabel(COMPANY_TYPES, job.company_type)}</Badge>}
                    {job.is_featured && <Badge className="bg-amber-100 text-amber-700">⭐ Featured</Badge>}
                  </div>
                </div>
              </div>

              {/* Summary Grid - bdjobs style */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                {job.district && (
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "কর্মস্থল" : "Location"}</p>
                      <p className="font-semibold">{job.district}{job.thana ? `, ${job.thana}` : ""}</p>
                    </div>
                  </div>
                )}
                {(job.salary_min || job.salary_max || job.salary_negotiable) && (
                  <div className="flex items-start gap-2 text-xs">
                    <Banknote className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "বেতন (মাসিক)" : "Salary (Monthly)"}</p>
                      <p className="font-semibold text-emerald-600">
                        {job.salary_negotiable
                          ? (bn ? "আলোচনা সাপেক্ষে" : "Negotiable")
                          : `৳${(job.salary_min || 0).toLocaleString("bn-BD")}${job.salary_max ? ` - ৳${job.salary_max.toLocaleString("bn-BD")}` : ""}`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-xs">
                  <Users className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground font-medium">{bn ? "পদ সংখ্যা" : "Vacancy"}</p>
                    <p className="font-semibold">{job.vacancy_count} {bn ? "জন" : "positions"}</p>
                  </div>
                </div>
                {job.deadline && (
                  <div className="flex items-start gap-2 text-xs">
                    <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "আবেদনের শেষ তারিখ" : "Deadline"}</p>
                      <p className={`font-semibold ${isExpired ? "text-red-500 line-through" : deadlineDays !== null && deadlineDays <= 3 ? "text-red-600" : ""}`}>
                        {format(new Date(job.deadline), "dd MMM yyyy", { locale: bn ? bnLocale : undefined })}
                      </p>
                    </div>
                  </div>
                )}
                {(job.experience_min > 0 || job.experience_max) && (
                  <div className="flex items-start gap-2 text-xs">
                    <Briefcase className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "অভিজ্ঞতা" : "Experience"}</p>
                      <p className="font-semibold">{job.experience_min}{job.experience_max ? `-${job.experience_max}` : "+"} {bn ? "বছর" : "years"}</p>
                    </div>
                  </div>
                )}
                {job.education_required && job.education_required !== "any" && (
                  <div className="flex items-start gap-2 text-xs">
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "শিক্ষাগত যোগ্যতা" : "Education"}</p>
                      <p className="font-semibold">{getLabel(EDUCATION_LEVELS, job.education_required)}</p>
                    </div>
                  </div>
                )}
                {job.gender_preference && job.gender_preference !== "any" && (
                  <div className="flex items-start gap-2 text-xs">
                    <User2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "লিঙ্গ" : "Gender"}</p>
                      <p className="font-semibold">{getLabel(GENDER_OPTIONS, job.gender_preference)}</p>
                    </div>
                  </div>
                )}
                {(job.age_min || job.age_max) && (
                  <div className="flex items-start gap-2 text-xs">
                    <User2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium">{bn ? "বয়স" : "Age"}</p>
                      <p className="font-semibold">
                        {job.age_min && job.age_max ? `${job.age_min} - ${job.age_max}` : job.age_min ? `${job.age_min}+` : `${bn ? "সর্বোচ্চ" : "Max"} ${job.age_max}`} {bn ? "বছর" : "years"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border bg-card p-5 mb-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
                <Briefcase className="h-4 w-4" /> {bn ? "চাকরির বিবরণ" : "Job Description"}
              </h2>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.description}</div>
            </div>

            {job.requirements && (
              <div className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
                  <CheckCircle2 className="h-4 w-4" /> {bn ? "যোগ্যতা ও শর্তাবলী" : "Requirements"}
                </h2>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.requirements}</div>
              </div>
            )}

            {job.benefits && (
              <div className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
                  <GraduationCap className="h-4 w-4" /> {bn ? "সুযোগ-সুবিধা" : "Compensation & Benefits"}
                </h2>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.benefits}</div>
              </div>
            )}

            {job.application_instruction && (
              <div className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
                  <Send className="h-4 w-4" /> {bn ? "আবেদনের নির্দেশনা" : "Application Instructions"}
                </h2>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.application_instruction}</div>
              </div>
            )}

            {/* Contact Info */}
            {user && (job.contact_phone || job.contact_email) && (
              <div className="rounded-xl border bg-card p-5 mb-4">
                <h2 className="font-semibold mb-3">{bn ? "যোগাযোগ" : "Contact Information"}</h2>
                <div className="space-y-2 text-sm">
                  {job.contact_phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-600" /> <a href={`tel:${job.contact_phone}`} className="hover:underline">{job.contact_phone}</a></p>}
                  {job.contact_email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /> <a href={`mailto:${job.contact_email}`} className="hover:underline">{job.contact_email}</a></p>}
                </div>
              </div>
            )}

            {!user && (job.contact_phone || job.contact_email) && (
              <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 p-4 mb-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">{bn ? "যোগাযোগের তথ্য দেখতে লগইন করুন" : "Login to see contact details"}</p>
                <Button size="sm" onClick={() => navigate("/auth")} className="bg-blue-600 hover:bg-blue-700">{bn ? "লগইন" : "Login"}</Button>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {job.views_count} {bn ? "বার দেখা হয়েছে" : "views"}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applications_count} {bn ? "জন আবেদন করেছেন" : "applications"}</span>
              <span className="text-[10px]">{bn ? "প্রকাশিত:" : "Published:"} {format(new Date(job.created_at), "dd MMM yyyy", { locale: bn ? bnLocale : undefined })}</span>
            </div>

            {/* Apply Button */}
            {!isExpired && (
              <div className="sticky bottom-16 md:bottom-0 bg-background/80 backdrop-blur-sm border-t py-3">
                <Button
                  onClick={() => user ? setShowApplyModal(true) : navigate("/auth")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold gap-2"
                >
                  <Send className="h-5 w-5" /> {bn ? "এখনই আবেদন করুন" : "Apply Now"}
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Related Jobs */}
          <div className="lg:w-72 shrink-0">
            {relatedJobs.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sticky top-24">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  {bn ? "সম্পর্কিত চাকরি" : "Related Jobs"}
                </h3>
                <div className="space-y-2">
                  {relatedJobs.slice(0, 6).map(rj => (
                    <Link key={rj.id} to={`/jobs/${rj.id}`} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                      <CompanyLogo
                        src={rj.company_logo_url}
                        alt={rj.company_name}
                        sizeClass="w-9 h-9"
                        rounded="rounded-lg"
                        padClass="p-0.5"
                        iconClass="h-4 w-4 text-blue-600"
                        fallbackBgClass="bg-blue-50 dark:bg-blue-900/30"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">{rj.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{rj.company_name}</p>
                        {rj.salary_min && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">৳{rj.salary_min.toLocaleString("bn-BD")}{rj.salary_max ? ` - ৳${rj.salary_max.toLocaleString("bn-BD")}` : "+"}</p>}
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                    </Link>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate("/jobs")}>
                  {bn ? "আরো চাকরি দেখুন" : "View More Jobs"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{bn ? "চাকরিতে আবেদন করুন" : "Apply for this Job"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-1">{job?.title} — {job?.company_name}</p>
          <div className="space-y-3">
            <Input placeholder={bn ? "আপনার পূর্ণ নাম *" : "Full Name *"} value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
            <Input placeholder={bn ? "মোবাইল নম্বর *" : "Mobile Number *"} value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} />
            <Input placeholder={bn ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"} value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} />
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? "CV/Resume আপলোড করুন (PDF/DOC)" : "Upload CV/Resume (PDF/DOC)"}</label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
            </div>
            <Textarea placeholder={bn ? "কভার লেটার (ঐচ্ছিক)" : "Cover Letter (optional)"} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={3} />
            {seekerProfile?.video_cv_url && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Video className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{bn ? "ভিডিও সিভি স্বয়ংক্রিয়ভাবে যুক্ত হবে" : "Video CV will be auto-attached"}</p>
                  <p className="text-[10px] text-blue-500">{bn ? "আপনার প্রোফাইলের ভিডিও সিভি নিয়োগদাতা দেখতে পারবেন" : "Employer can view your video CV"}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              </div>
            )}
            <Button onClick={handleApply} disabled={uploading || applyMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
              {uploading ? (bn ? "আপলোড হচ্ছে..." : "Uploading...") : bn ? "আবেদন জমা দিন" : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default JobDetail;
