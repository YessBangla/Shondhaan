import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Briefcase, Users, Search, Star, MapPin, Calendar,
  Eye, Plus, FileText, BookmarkPlus, Clock, Video, UserCheck,
  BarChart3, Settings, Bookmark, CalendarCheck, Package, CheckCircle,
  XCircle, ArrowRight, Award, TrendingUp, Lock, Zap, Crown, Pencil
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasStaffRoleAccess } from "@/lib/roleAccess";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { getMySqlAuth } from "@/lib/mysqlAuth";

const YESSJOB_API_BASE = import.meta.env.VITE_YESSJOB_API_URL;

function getAuthHeaders() {
  const auth = getMySqlAuth();
  if (!auth?.token) {
    console.warn("[EmployerPanel] Missing MySQL auth token in localStorage yess_mysql_auth");
    return {};
  }
  return { Authorization: `Bearer ${auth.token}` };
}

async function fetchJobsJson(path: string, init?: RequestInit) {
  const res = await fetch(`${YESSJOB_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (HTTP ${res.status})`);
  }
  // DELETE routes and similar may return no body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_name_bn: string | null;
  company_logo_url: string | null;
  company_type: string;
  industry_type: string | null;
  establishment_year: number | null;
  employee_count: string;
  website_url: string | null;
  description: string | null;
  division: string | null;
  district: string | null;
  thana: string | null;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  trade_license_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  total_jobs_posted: number;
  total_hires: number;
}

// BDJobs-style industry types
const INDUSTRY_TYPES = [
  "তথ্যপ্রযুক্তি (IT)", "সফটওয়্যার/ডাটা", "ই-কমার্স", "এফ-কমার্স",
  "গার্মেন্টস/টেক্সটাইল", "ব্যাংক/আর্থিক প্রতিষ্ঠান", "বীমা", "শিক্ষা প্রতিষ্ঠান",
  "স্বাস্থ্যসেবা/হাসপাতাল", "ডায়াগনস্টিক সেন্টার", "ফার্মাসিউটিক্যালস",
  "টেলিকমিউনিকেশন", "এনজিও/ডেভেলপমেন্ট", "ম্যানুফ্যাকচারিং (ভারী শিল্প)",
  "ম্যানুফ্যাকচারিং (হালকা শিল্প)", "নির্মাণ/রিয়েল এস্টেট", "হোটেল/রেস্তোরাঁ",
  "ট্যুরিজম/এয়ারলাইন", "মিডিয়া/বিজ্ঞাপন", "কৃষি/এগ্রো", "পরিবহন/লজিস্টিকস",
  "ডেলিভারি সার্ভিস", "পাইকারি/খুচরা/রপ্তানি-আমদানি", "অটোমোবাইল",
  "ইলেকট্রনিক্স/হোম অ্যাপ্লায়েন্স", "ইভেন্ট ম্যানেজমেন্ট", "ফায়ার/সেফটি",
  "ফুড এন্ড বেভারেজ", "বিউটি পার্লার/স্যালন", "কনসাল্টিং ফার্ম",
  "অডিট/ট্যাক্স কনসালট্যান্ট", "BPO/কল সেন্টার", "স্টার্টআপ",
  "সরকারি/আধা-সরকারি/স্বায়ত্তশাসিত", "দূতাবাস/বিদেশি কনস্যুলেট", "অন্যান্য"
];

const HIRING_STAGES = [
  { key: "applied", label: "আবেদন", labelEn: "Applied", color: "bg-blue-100 text-blue-800" },
  { key: "shortlisted", label: "শর্টলিস্ট", labelEn: "Shortlisted", color: "bg-indigo-100 text-indigo-800" },
  { key: "interview_scheduled", label: "ইন্টারভিউ শিডিউল", labelEn: "Interview Scheduled", color: "bg-purple-100 text-purple-800" },
  { key: "interviewed", label: "ইন্টারভিউ সম্পন্ন", labelEn: "Interviewed", color: "bg-amber-100 text-amber-800" },
  { key: "scored", label: "স্কোর করা", labelEn: "Scored", color: "bg-orange-100 text-orange-800" },
  { key: "hired", label: "নিয়োগ", labelEn: "Hired", color: "bg-green-100 text-green-800" },
  { key: "rejected", label: "বাতিল", labelEn: "Rejected", color: "bg-red-100 text-red-800" },
];

const sidebarItems = [
  { value: "dashboard", label: "ড্যাশবোর্ড", icon: <BarChart3 />, group: "ওভারভিউ" },
  { value: "profile", label: "কোম্পানি প্রোফাইল", icon: <Building2 />, group: "ওভারভিউ" },
  { value: "my-jobs", label: "আমার চাকরি", icon: <Briefcase />, group: "নিয়োগ" },
  { value: "hiring-pipeline", label: "হায়ারিং পাইপলাইন", icon: <TrendingUp />, group: "নিয়োগ" },
  { value: "applications", label: "আবেদনসমূহ", icon: <FileText />, group: "নিয়োগ" },
  { value: "talent-search", label: "ট্যালেন্ট সার্চ", icon: <Search />, group: "নিয়োগ" },
  { value: "bookmarks", label: "সংরক্ষিত প্রার্থী", icon: <Bookmark />, group: "নিয়োগ" },
  { value: "interviews", label: "ইন্টারভিউ", icon: <CalendarCheck />, group: "নিয়োগ" },
  { value: "packages", label: "প্যাকেজ/প্ল্যান", icon: <Package />, group: "সেটিংস" },
];

const EmployerPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isEmployer, setIsEmployer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "", company_name_bn: "", company_logo_url: "", company_type: "private",
    industry_type: "", establishment_year: new Date().getFullYear(),
    employee_count: "1-25", website_url: "", description: "",
    division: "", district: "", thana: "", address: "",
    contact_person: "", contact_phone: "", contact_email: ""
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkEmployer = useCallback(async () => {
    if (!user) return;
    const canAccess = await hasStaffRoleAccess(user.id, ["employer"]);
    if (canAccess) {
      setIsEmployer(true);
      try {
        const res = await fetch(`${YESSJOB_API_BASE}/api/employer-profile/me`, {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const ep = await res.json();
          setProfile(ep as EmployerProfile);
        } else {
          setShowSetup(true);
        }
      } catch (err) {
        console.error("Failed to load employer profile:", err);
        setShowSetup(true);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { checkEmployer(); }, [checkEmployer]);

  const saveProfile = async () => {
    if (!user || !formData.company_name) {
      toast.error("কোম্পানির নাম আবশ্যক");
      return;
    }
    try {
      const res = await fetch(`${YESSJOB_API_BASE}/api/employer-profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(formData), // user_id is derived server-side from the token
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || `সেভ করতে সমস্যা হয়েছে (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setProfile(data as EmployerProfile);
      setShowSetup(false);
      toast.success("প্রোফাইল সেভ হয়েছে");
    } catch (err) {
      console.error(err);
      toast.error("সেভ করতে সমস্যা হয়েছে");
    }
  };

  // Optional: direct file upload for the logo. Requires a backend endpoint
  // (multipart/form-data) at POST /api/employer-profile/logo that returns
  // { url: string }. If that endpoint doesn't exist yet, this simply shows
  // an error toast and the user can still paste a hosted image URL instead.
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ইমেজ ফাইল আপলোড করুন");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ছবির সাইজ ২MB এর কম হতে হবে");
      return;
    }

    setLogoUploading(true);
    try {
      const auth = getMySqlAuth();
      const fd = new FormData();
      fd.append("logo", file);

      const res = await fetch(`${YESSJOB_API_BASE}/api/employer-profile/logo`, {
        method: "POST",
        credentials: "include",
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (!data?.url) throw new Error("Upload response missing url");

      setFormData(p => ({ ...p, company_logo_url: data.url }));
      toast.success("লোগো আপলোড হয়েছে");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "লোগো আপলোড করতে সমস্যা হয়েছে, তার বদলে ইমেজ লিংক পেস্ট করুন");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  // Data states
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [seekerSearch, setSeekerSearch] = useState("");
  const [interviewForm, setInterviewForm] = useState<any>(null);
  const [pipelineJob, setPipelineJob] = useState<string>("all");
  const [pipelineStage, setPipelineStage] = useState<string>("all");
  const [scoreForm, setScoreForm] = useState<any>(null);
  const [editJobForm, setEditJobForm] = useState<any>(null);

  // ── Applications-tab UI state (BDJobs-style applicant list) ──
  const [applicantsSubTab, setApplicantsSubTab] = useState<"all" | "shortlist" | "final">("all");
  const [applicantsFilter, setApplicantsFilter] = useState<"all" | "not_viewed" | "viewed" | "rejected">("all");
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set());
  // Client-only "viewed" tracking — resets on reload since the backend has no column for it yet.
  const [viewedApplicantIds, setViewedApplicantIds] = useState<Set<string>>(new Set());
  const [applicantSort, setApplicantSort] = useState<"newest" | "oldest" | "score">("newest");
  const [commentDraft, setCommentDraft] = useState<{ id: string; text: string } | null>(null);

  const markViewed = (id: string) => {
    setViewedApplicantIds(prev => new Set(prev).add(id));
  };

  const toggleSelectApplicant = (id: string) => {
    setSelectedApplicantIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllApplicants = (ids: string[]) => {
    setSelectedApplicantIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };

  const downloadApplicantList = (rows: any[]) => {
    const header = ["Name", "Phone", "Email", "Job", "Stage", "Expected Salary", "Age", "Applied On"];
    const lines = rows.map(a => [
      a.jobseeker_name || "", a.jobseeker_phone || "", a.jobseeker_email || "",
      a.job_title || "", a.hiring_stage || "applied", a.expected_salary ?? "",
      a.age_at_application ?? "", a.created_at ? format(new Date(a.created_at), "yyyy-MM-dd") : "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveComment = async (id: string, text: string) => {
    try {
      await fetchJobsJson(`/api/jobseeker/applications/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ interviewer_notes: text }),
      });
      toast.success("মন্তব্য সেভ হয়েছে");
      setCommentDraft(null);
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "মন্তব্য সেভ করতে সমস্যা হয়েছে");
    }
  };

  // Jobs posted via JobPostForm.tsx -> Express/MySQL backend (POST /api/jobs).
  // GET /api/jobs/mine reads from the same table (shows as "pending" until
  // an admin approves it in AdminJobListings).
  const fetchMyJobs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchJobsJson(`/api/jobs/mine`);
      setMyJobs(data || []);
    } catch (err) {
      console.error("Failed to load my jobs:", err);
    }
  }, [user]);

  // Applications now come entirely from MySQL job_applications, joined
  // against jobs/jobseeker_profiles server-side. The backend scopes this
  // to jobs.user_id = the logged-in employer, so ownership is enforced
  // in the query itself, not just in the UI.
  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchJobsJson(`/api/jobseeker/applications/employer/mine`);
      setApplications(data || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    }
  }, [user]);

  const fetchSeekers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchJobsJson(`/api/talent/seekers${seekerSearch ? `?search=${encodeURIComponent(seekerSearch)}` : ""}`);
      setSeekers(data || []);
    } catch (err) {
      console.error("Failed to load seekers:", err);
    }
  }, [user, seekerSearch]);

  const fetchBookmarks = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchJobsJson(`/api/talent/bookmarks`);
      setBookmarks(data || []);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }, [profile]);

  const fetchInterviews = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchJobsJson(`/api/interviews/mine`);
      setInterviews(data || []);
    } catch (err) {
      console.error("Failed to load interviews:", err);
    }
  }, [profile]);

  const fetchPackages = useCallback(async () => {
    try {
      const data = await fetchJobsJson(`/api/packages`);
      setPackages(data || []);
    } catch (err) {
      console.error("Failed to load packages:", err);
    }
  }, []);

  useEffect(() => {
    if (isEmployer && profile) {
      fetchMyJobs(); fetchApplications(); fetchSeekers();
      fetchBookmarks(); fetchInterviews(); fetchPackages();
    }
  }, [isEmployer, profile, fetchMyJobs, fetchApplications, fetchSeekers, fetchBookmarks, fetchInterviews, fetchPackages]);

  // Debounced-ish re-search when the talent search box changes
  useEffect(() => {
    if (!isEmployer || !profile) return;
    const t = setTimeout(() => { fetchSeekers(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekerSearch]);

  const addBookmark = async (seekerId: string) => {
    if (!profile) return;
    try {
      await fetchJobsJson(`/api/talent/bookmarks`, {
        method: "POST",
        body: JSON.stringify({ seeker_id: seekerId }),
      });
      toast.success("প্রার্থী সংরক্ষিত হয়েছে");
      fetchBookmarks();
    } catch (err: any) {
      if (String(err.message || "").includes("সংরক্ষিত")) {
        toast.info(err.message);
      } else {
        toast.error(err.message || "সমস্যা হয়েছে");
      }
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      await fetchJobsJson(`/api/talent/bookmarks/${id}`, { method: "DELETE" });
      fetchBookmarks();
      toast.success("মুছে ফেলা হয়েছে");
    } catch (err: any) {
      toast.error(err.message || "সমস্যা হয়েছে");
    }
  };

  const scheduleInterview = async () => {
    if (!interviewForm || !profile) return;
    try {
      await fetchJobsJson(`/api/interviews`, {
        method: "POST",
        body: JSON.stringify(interviewForm),
      });
      toast.success("ইন্টারভিউ শিডিউল হয়েছে");
      setInterviewForm(null);
      fetchInterviews();
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "সমস্যা হয়েছে");
    }
  };

  const updateHiringStage = async (id: string, stage: string) => {
    try {
      await fetchJobsJson(`/api/jobseeker/applications/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ hiring_stage: stage }),
      });
      fetchApplications();
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } catch (err: any) {
      toast.error(err.message || "সমস্যা হয়েছে");
    }
  };

  const updateScore = async () => {
    if (!scoreForm) return;
    try {
      await fetchJobsJson(`/api/jobseeker/applications/${scoreForm.id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({
          score: scoreForm.score,
          interviewer_notes: scoreForm.notes,
          hiring_stage: "scored",
          attendance: "present",
        }),
      });
      setScoreForm(null);
      fetchApplications();
      toast.success("স্কোর সেভ হয়েছে");
    } catch (err: any) {
      toast.error(err.message || "সমস্যা হয়েছে");
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!window.confirm("আপনি কি নিশ্চিত এই জবটি মুছে ফেলতে চান? এই কাজটি আর ফিরিয়ে নেওয়া যাবে না।")) return;
    try {
      await fetchJobsJson(`/api/jobs/${jobId}`, { method: "DELETE" });
      setMyJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success("জব মুছে ফেলা হয়েছে");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "জব মুছতে সমস্যা হয়েছে");
    }
  };

  const closeJob = async (jobId: string, reason: string) => {
    try {
      await fetchJobsJson(`/api/jobs/${jobId}/close`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      fetchMyJobs();
      toast.success("জব ক্লোজ হয়েছে");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "জব ক্লোজ করতে সমস্যা হয়েছে");
    }
  };

  const reopenJob = async (jobId: string) => {
    try {
      await fetchJobsJson(`/api/jobs/${jobId}/reopen`, { method: "PATCH" });
      fetchMyJobs();
      toast.success("জব রিওপেন হয়েছে");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "জব রিওপেন করতে সমস্যা হয়েছে");
    }
  };

  const updateJob = async () => {
    if (!editJobForm) return;
    try {
      await fetchJobsJson(`/api/jobs/${editJobForm.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editJobForm.title,
          description: editJobForm.description,
          requirements: editJobForm.requirements,
          salary_min: editJobForm.salary_min !== "" ? Number(editJobForm.salary_min) : null,
          salary_max: editJobForm.salary_max !== "" ? Number(editJobForm.salary_max) : null,
          vacancy_count: editJobForm.vacancy_count ? Number(editJobForm.vacancy_count) : 1,
          deadline: editJobForm.deadline || null,
        }),
      });
      toast.success("জব আপডেট হয়েছে");
      setEditJobForm(null);
      fetchMyJobs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "আপডেট করতে সমস্যা হয়েছে");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!isEmployer) {
    return (
      <JobsPageTransition>
        <div className="pt-[44px] md:pt-[68px] bg-card" />
        <JobsMenuBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-heading text-xl font-bold mb-2">এমপ্লয়ার অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">এই প্যানেলটি শুধুমাত্র এমপ্লয়ারদের জন্য। অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          <Button onClick={() => navigate("/")}>হোমে ফিরুন</Button>
        </div>
        <div className="h-16 md:hidden" />
      </JobsPageTransition>
    );
  }

  // Company Profile Setup (bdjobs-style registration form)
  if (showSetup || !profile) {
    return (
      <JobsPageTransition>
        <div className="pt-[44px] md:pt-[68px] bg-blue-700 md:bg-card" />
        <JobsMenuBar />
        <div className="pt-[16px]">
          <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white py-8">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 inline-block mb-3">
                <Building2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-extrabold">Employer Registration Form</h1>
              <p className="text-blue-200 text-sm mt-1">আপনার অ্যাকাউন্ট তৈরি করুন এবং সেরা প্রতিভা খুঁজুন</p>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div className="border rounded-xl p-5 bg-card">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" /> Tell Us About Your Company
              </h2>

              {/* Company Logo */}
              <div className="mb-4">
                <label className="text-xs font-medium mb-1 block">Company Logo</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border border-dashed border-input bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {formData.company_logo_url ? (
                      <img
                        src={formData.company_logo_url}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={formData.company_logo_url}
                      onChange={e => setFormData(p => ({ ...p, company_logo_url: e.target.value }))}
                      placeholder="https://your-logo-url.com/logo.png"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-medium text-primary cursor-pointer hover:underline">
                        {logoUploading ? "আপলোড হচ্ছে..." : "অথবা ফাইল থেকে আপলোড করুন"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={handleLogoFileChange}
                        />
                      </label>
                      {formData.company_logo_url && (
                        <button
                          type="button"
                          className="text-[11px] text-destructive hover:underline"
                          onClick={() => setFormData(p => ({ ...p, company_logo_url: "" }))}
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      লোগোর সরাসরি ইমেজ লিংক দিন (jpg/png/webp), অথবা ২MB পর্যন্ত ফাইল আপলোড করুন
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Company Name *</label>
                  <Input value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} placeholder="Type Company Name" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">কোম্পানির নাম (বাংলায়)</label>
                  <Input value={formData.company_name_bn} onChange={e => setFormData(p => ({ ...p, company_name_bn: e.target.value }))} placeholder="কোম্পানির নাম লিখুন" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Year of Establishment *</label>
                  <Input type="number" value={formData.establishment_year} onChange={e => setFormData(p => ({ ...p, establishment_year: parseInt(e.target.value) }))} placeholder="Type Company's Establishment Year" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Number of Employees *</label>
                  <div className="flex flex-wrap gap-2">
                    {["1-25", "26-50", "51-100", "101-500", "501-1000", "1000+"].map(c => (
                      <button key={c} type="button" onClick={() => setFormData(p => ({ ...p, employee_count: c }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.employee_count === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-card">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Company Address *
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">বিভাগ</label>
                  <Input value={formData.division} onChange={e => setFormData(p => ({ ...p, division: e.target.value }))} placeholder="Select Division" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">জেলা</label>
                  <Input value={formData.district} onChange={e => setFormData(p => ({ ...p, district: e.target.value }))} placeholder="Select District" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">থানা</label>
                  <Input value={formData.thana} onChange={e => setFormData(p => ({ ...p, thana: e.target.value }))} placeholder="Select Thana" />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium mb-1 block">বিস্তারিত ঠিকানা</label>
                <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Write Company Detail Address" />
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-card">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Industry Type *
              </h2>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={formData.industry_type} onChange={e => setFormData(p => ({ ...p, industry_type: e.target.value }))}>
                <option value="">নির্বাচন করুন</option>
                {INDUSTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="mt-3">
                <label className="text-xs font-medium mb-1 block">কোম্পানির ধরন</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={formData.company_type} onChange={e => setFormData(p => ({ ...p, company_type: e.target.value }))}>
                  <option value="private">প্রাইভেট লিমিটেড</option>
                  <option value="government">সরকারি</option>
                  <option value="semi-government">আধা-সরকারি</option>
                  <option value="ngo">এনজিও</option>
                  <option value="multinational">মাল্টিন্যাশনাল</option>
                  <option value="partnership">পার্টনারশিপ</option>
                  <option value="proprietorship">একমালিকানা</option>
                  <option value="startup">স্টার্টআপ</option>
                </select>
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-card">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" /> Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">যোগাযোগকারীর নাম</label>
                  <Input value={formData.contact_person} onChange={e => setFormData(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">ফোন নম্বর</label>
                  <Input value={formData.contact_phone} onChange={e => setFormData(p => ({ ...p, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">ইমেইল</label>
                  <Input value={formData.contact_email} onChange={e => setFormData(p => ({ ...p, contact_email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">ওয়েবসাইট</label>
                  <Input value={formData.website_url} onChange={e => setFormData(p => ({ ...p, website_url: e.target.value }))} placeholder="https://" />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium mb-1 block">কোম্পানি সম্পর্কে</label>
                <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="কোম্পানির সংক্ষিপ্ত বিবরণ লিখুন..." />
              </div>
            </div>

            <Button onClick={saveProfile} className="w-full h-12 text-base font-bold">
              <CheckCircle className="h-5 w-5 mr-2" /> প্রোফাইল সেভ করুন
            </Button>
          </div>
        </div>
      </JobsPageTransition>
    );
  }

  const filteredSeekers = seekers; // filtering now happens server-side via seekerSearch

  const pipelineApps = applications.filter(a => {
    const matchJob = pipelineJob === "all" || a.job_id === pipelineJob;
    const matchStage = pipelineStage === "all" || (a as any).hiring_stage === pipelineStage;
    return matchJob && matchStage;
  });

  const getStageCount = (stage: string) => applications.filter(a => (a as any).hiring_stage === stage || (!((a as any).hiring_stage) && stage === "applied")).length;

  const getPackageIcon = (visibility: string) => {
    switch (visibility) {
      case "hot": return <Zap className="h-5 w-5 text-red-500" />;
      case "premium_plus": return <Crown className="h-5 w-5 text-amber-500" />;
      case "premium": return <Star className="h-5 w-5 text-blue-500" />;
      case "standard": return <Award className="h-5 w-5 text-emerald-500" />;
      default: return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderContent = (tab: string) => {
    switch (tab) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> ড্যাশবোর্ড</h2>
            {!profile.is_verified && (
              <div className="p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-xs dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
                ⏳ আপনার কোম্পানি প্রোফাইল যাচাইয়ের অপেক্ষায় আছে। যাচাই সম্পন্ন হলে আপনি সকল ফিচার ব্যবহার করতে পারবেন।
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "পোস্ট করা চাকরি", value: myJobs.length, icon: <Briefcase className="h-5 w-5 text-primary" />, color: "bg-primary/10" },
                { label: "মোট আবেদন", value: applications.length, icon: <FileText className="h-5 w-5 text-blue-600" />, color: "bg-blue-500/10" },
                { label: "শর্টলিস্টেড", value: applications.filter(a => ["shortlisted", "interview_scheduled", "interviewed", "scored"].includes((a as any).hiring_stage || "")).length, icon: <UserCheck className="h-5 w-5 text-indigo-600" />, color: "bg-indigo-500/10" },
                { label: "নিয়োগ সম্পন্ন", value: applications.filter(a => (a as any).hiring_stage === "hired").length, icon: <Award className="h-5 w-5 text-green-600" />, color: "bg-green-500/10" },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="border rounded-xl p-4 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> হায়ারিং পাইপলাইন সামারি</h3>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {HIRING_STAGES.filter(s => s.key !== "rejected").map(stage => (
                  <div key={stage.key} className="flex flex-col items-center min-w-[70px]">
                    <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stage.color}`}>
                      {getStageCount(stage.key)}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 text-center">{stage.label}</p>
                    {stage.key !== "hired" && <ArrowRight className="h-3 w-3 text-muted-foreground/40 mt-0.5" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-card">
              <h3 className="font-semibold text-sm mb-3">সাম্প্রতিক আবেদন</h3>
              {applications.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0 text-xs">
                  <div>
                    <p className="font-medium">{app.jobseeker_name}</p>
                    <p className="text-muted-foreground">{app.jobseeker_phone}</p>
                  </div>
                  <Badge className={HIRING_STAGES.find(s => s.key === ((app as any).hiring_stage || "applied"))?.color || "bg-muted"}>
                    {HIRING_STAGES.find(s => s.key === ((app as any).hiring_stage || "applied"))?.label || "আবেদন"}
                  </Badge>
                </div>
              ))}
              {applications.length === 0 && <p className="text-xs text-muted-foreground">কোনো আবেদন নেই</p>}
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> কোম্পানি প্রোফাইল</h2>
            <div className="border rounded-xl p-5 bg-card space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profile.company_logo_url ? (
                    <img src={profile.company_logo_url} alt={profile.company_name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{profile.company_name}</h3>
                  {profile.company_name_bn && <p className="text-sm text-muted-foreground">{profile.company_name_bn}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {profile.is_verified ? <Badge className="bg-green-100 text-green-800 text-[10px]">✓ যাচাইকৃত</Badge> : <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">যাচাই অপেক্ষমাণ</Badge>}
                    <Badge variant="outline" className="text-[10px]">{profile.company_type}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mt-4">
                {profile.industry_type && <div><span className="text-muted-foreground">ইন্ডাস্ট্রি:</span> <span className="font-medium">{profile.industry_type}</span></div>}
                {profile.establishment_year && <div><span className="text-muted-foreground">প্রতিষ্ঠা:</span> <span className="font-medium">{profile.establishment_year}</span></div>}
                <div><span className="text-muted-foreground">কর্মী:</span> <span className="font-medium">{profile.employee_count}</span></div>
                {profile.district && <div><span className="text-muted-foreground">অবস্থান:</span> <span className="font-medium">{profile.district}</span></div>}
                {profile.contact_phone && <div><span className="text-muted-foreground">ফোন:</span> <span className="font-medium">{profile.contact_phone}</span></div>}
                {profile.contact_email && <div><span className="text-muted-foreground">ইমেইল:</span> <span className="font-medium">{profile.contact_email}</span></div>}
              </div>
              {profile.description && <p className="text-xs text-muted-foreground mt-3">{profile.description}</p>}
              <Button variant="outline" size="sm" onClick={() => {
                setFormData({
                  company_name: profile.company_name, company_name_bn: profile.company_name_bn || "",
                  company_logo_url: profile.company_logo_url || "",
                  company_type: profile.company_type, industry_type: profile.industry_type || "",
                  establishment_year: profile.establishment_year || new Date().getFullYear(),
                  employee_count: profile.employee_count, website_url: profile.website_url || "",
                  description: profile.description || "", division: profile.division || "",
                  district: profile.district || "", thana: profile.thana || "",
                  address: profile.address || "", contact_person: profile.contact_person || "",
                  contact_phone: profile.contact_phone || "", contact_email: profile.contact_email || ""
                });
                setShowSetup(true);
              }}>
                <Settings className="h-3.5 w-3.5 mr-1" /> সম্পাদনা করুন
              </Button>
            </div>
          </div>
        );

      case "my-jobs":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> আমার চাকরি ({myJobs.length})</h2>
              <Button size="sm" onClick={() => navigate("/jobs/post")}><Plus className="h-3.5 w-3.5 mr-1" /> নতুন পোস্ট</Button>
            </div>
            {myJobs.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">কোনো চাকরি পোস্ট করা হয়নি</p> :
              myJobs.map(job => {
                const jobApps = applications.filter(a => a.job_id === job.id);
                const hiredCount = jobApps.filter(a => (a as any).hiring_stage === "hired").length;
                const isClosed = (job as any).is_closed;
                return (
                  <div key={job.id} className={`border rounded-lg p-3 bg-card ${isClosed ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{job.title}</h3>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                          {job.district && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.district}</span>}
                          <span>{format(new Date(job.created_at), "dd MMM yyyy")}</span>
                          <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{jobApps.length} আবেদন</span>
                          <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{job.views_count || 0} ভিউ</span>
                          {hiredCount > 0 && <span className="flex items-center gap-0.5 text-green-600"><Award className="h-2.5 w-2.5" />{hiredCount} নিয়োগ</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={
                          isClosed ? "bg-muted text-muted-foreground" :
                          job.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          job.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }>
                          {isClosed ? "ক্লোজড" : job.status === "pending" ? "অপেক্ষমাণ" : job.status === "approved" ? "সক্রিয়" : "বাতিল"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => navigate(`/jobs/${job.id}`)}>
                        <Eye className="h-3 w-3 mr-1" /> দেখুন
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setEditJobForm({
                        id: job.id,
                        title: job.title || "",
                        description: job.description || "",
                        requirements: job.requirements || "",
                        salary_min: job.salary_min ?? "",
                        salary_max: job.salary_max ?? "",
                        vacancy_count: job.vacancy_count ?? 1,
                        deadline: job.deadline ? String(job.deadline).slice(0, 10) : "",
                      })}>
                        <Pencil className="h-3 w-3 mr-1" /> সম্পাদনা
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive" onClick={() => deleteJob(job.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> মুছুন
                      </Button>
                      {!isClosed && job.status === "approved" && (
                        <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => closeJob(job.id, "নিয়োগ সম্পন্ন")}>
                          <Lock className="h-3 w-3 mr-1" /> জব ক্লোজ করুন
                        </Button>
                      )}
                      {isClosed && (
                        <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => reopenJob(job.id)}>
                          রিওপেন করুন
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        );

      case "hiring-pipeline":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> হায়ারিং পাইপলাইন</h2>
            <p className="text-xs text-muted-foreground">BDJobs-স্টাইল: আবেদন → শর্টলিস্ট → ইন্টারভিউ → স্কোর → নিয়োগ → জব ক্লোজ</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <select className="h-9 rounded-md border border-input bg-background px-3 text-xs flex-1" value={pipelineJob} onChange={e => setPipelineJob(e.target.value)}>
                <option value="all">সকল চাকরি</option>
                {myJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-xs flex-1" value={pipelineStage} onChange={e => setPipelineStage(e.target.value)}>
                <option value="all">সকল স্টেজ</option>
                {HIRING_STAGES.map(s => <option key={s.key} value={s.key}>{s.label} ({getStageCount(s.key)})</option>)}
              </select>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {HIRING_STAGES.map(stage => (
                <button key={stage.key} onClick={() => setPipelineStage(pipelineStage === stage.key ? "all" : stage.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${pipelineStage === stage.key ? stage.color + " ring-1 ring-offset-1" : "bg-muted text-muted-foreground"}`}>
                  {stage.label} ({getStageCount(stage.key)})
                </button>
              ))}
            </div>

            {pipelineApps.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">এই স্টেজে কোনো আবেদনকারী নেই</p>
            ) : (
              <div className="space-y-2">
                {pipelineApps.map(app => {
                  const currentStage = (app as any).hiring_stage || "applied";
                  const stageInfo = HIRING_STAGES.find(s => s.key === currentStage);
                  const jobTitle = myJobs.find(j => j.id === app.job_id)?.title || app.job_title;
                  return (
                    <div key={app.id} className="border rounded-lg p-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{app.jobseeker_name}</p>
                          <p className="text-[10px] text-muted-foreground">{app.jobseeker_phone} {app.jobseeker_email && `• ${app.jobseeker_email}`}</p>
                          {jobTitle && <p className="text-[10px] text-primary mt-0.5">{jobTitle}</p>}
                          {(app as any).video_cv_url && (
                            <a href={(app as any).video_cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-0.5">
                              <Video className="h-3 w-3" /> ভিডিও সিভি দেখুন
                            </a>
                          )}
                          {(app as any).score != null && (
                            <p className="text-[10px] font-bold text-amber-600 mt-0.5">স্কোর: {(app as any).score}/100</p>
                          )}
                          {(app as any).interviewer_notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">📝 {(app as any).interviewer_notes}</p>
                          )}
                        </div>
                        <Badge className={stageInfo?.color || "bg-muted"}>{stageInfo?.label || "আবেদন"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {currentStage === "applied" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateHiringStage(app.id, "shortlisted")}>
                            <UserCheck className="h-3 w-3 mr-1" /> শর্টলিস্ট
                          </Button>
                        )}
                        {currentStage === "shortlisted" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setInterviewForm({
                            application_id: app.id,
                            interview_type: "in-person", scheduled_at: "", duration_minutes: 30,
                            location: "", meeting_link: "", notes: ""
                          })}>
                            <CalendarCheck className="h-3 w-3 mr-1" /> ইন্টারভিউ শিডিউল
                          </Button>
                        )}
                        {(currentStage === "interview_scheduled" || currentStage === "interviewed") && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setScoreForm({ id: app.id, score: (app as any).score || 0, notes: (app as any).interviewer_notes || "" })}>
                            <Star className="h-3 w-3 mr-1" /> স্কোর দিন
                          </Button>
                        )}
                        {(currentStage === "scored" || currentStage === "interviewed") && (
                          <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700" onClick={() => updateHiringStage(app.id, "hired")}>
                            <Award className="h-3 w-3 mr-1" /> নিয়োগ দিন
                          </Button>
                        )}
                        {currentStage !== "hired" && currentStage !== "rejected" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => updateHiringStage(app.id, "rejected")}>
                            <XCircle className="h-3 w-3 mr-1" /> বাতিল
                          </Button>
                        )}
                        {app.cv_url && (
                          <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-6 px-2 text-[10px] text-primary hover:underline">
                            <FileText className="h-3 w-3 mr-1" /> CV
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "applications": {
        const allApps = applications as any[];

        const scoped = allApps.filter(a => {
          if (applicantsSubTab === "shortlist") {
            return ["shortlisted", "interview_scheduled", "interviewed", "scored"].includes(a.hiring_stage || "");
          }
          if (applicantsSubTab === "final") return a.hiring_stage === "hired";
          return true;
        });

        const withViewFilter = scoped.filter(a => {
          if (applicantsFilter === "rejected") return a.hiring_stage === "rejected";
          if (applicantsFilter === "viewed") return viewedApplicantIds.has(a.id) && a.hiring_stage !== "rejected";
          if (applicantsFilter === "not_viewed") return !viewedApplicantIds.has(a.id) && a.hiring_stage !== "rejected";
          return a.hiring_stage !== "rejected"; // "All" tab hides rejected, matching bdjobs convention
        });

        const sortedApps = [...withViewFilter].sort((a, b) => {
          if (applicantSort === "score") return (b.score || 0) - (a.score || 0);
          const aT = new Date(a.created_at).getTime();
          const bT = new Date(b.created_at).getTime();
          return applicantSort === "oldest" ? aT - bT : bT - aT;
        });

        const shortlistCount = allApps.filter(a => ["shortlisted", "interview_scheduled", "interviewed", "scored"].includes(a.hiring_stage || "")).length;
        const finalCount = allApps.filter(a => a.hiring_stage === "hired").length;
        const rejectedCount = allApps.filter(a => a.hiring_stage === "rejected").length;
        const nonRejected = allApps.filter(a => a.hiring_stage !== "rejected");
        const notViewedCount = nonRejected.filter(a => !viewedApplicantIds.has(a.id)).length;
        const viewedCount = nonRejected.filter(a => viewedApplicantIds.has(a.id)).length;

        const visibleIds = sortedApps.map(a => a.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedApplicantIds.has(id));

        return (
          <div className="space-y-4">
            {/* Top bar: download + tab switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadApplicantList(sortedApps)}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Download Applicant List
              </Button>
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "All Applicants", count: allApps.length },
                  { key: "shortlist", label: "Shortlist", count: shortlistCount },
                  { key: "final", label: "Final Selection", count: finalCount },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setApplicantsSubTab(t.key as any)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      applicantsSubTab === t.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${applicantsSubTab === t.key ? "bg-white/20" : "bg-background"}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Select all + sort */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => toggleSelectAllApplicants(visibleIds)}
                  className="h-4 w-4 rounded border-input"
                />
                Select All ({selectedApplicantIds.size} of {visibleIds.length})
              </label>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={applicantSort}
                onChange={e => setApplicantSort(e.target.value as any)}
              >
                <option value="newest">নতুন আগে</option>
                <option value="oldest">পুরাতন আগে</option>
                <option value="score">স্কোর অনুযায়ী</option>
              </select>
            </div>

            {/* Viewed/not-viewed/rejected filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: "All", count: nonRejected.length },
                { key: "not_viewed", label: "Not Viewed", count: notViewedCount },
                { key: "viewed", label: "Viewed", count: viewedCount },
                { key: "rejected", label: "Rejected", count: rejectedCount },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setApplicantsFilter(f.key as any)}
                  className={`px-3 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
                    applicantsFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.label} {f.count}
                </button>
              ))}
            </div>

            {/* Applicant cards */}
            {sortedApps.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">কোনো আবেদন নেই</p>
            ) : (
              <div className="space-y-3">
                {sortedApps.map((app: any, idx: number) => {
                  const isViewed = viewedApplicantIds.has(app.id);
                  const isRejected = app.hiring_stage === "rejected";
                  const isShortlisted = ["shortlisted", "interview_scheduled", "interviewed", "scored", "hired"].includes(app.hiring_stage || "");
                  const matchPct = app.score != null ? Math.round(app.score) : null;

                  return (
                    <div
                      key={app.id}
                      onMouseEnter={() => markViewed(app.id)}
                      className={`border rounded-lg bg-card overflow-hidden ${isViewed ? "" : "border-l-4 border-l-primary"}`}
                    >
                      <div className="flex flex-col md:flex-row gap-3 p-3">
                        {/* Left: checkbox, avatar, index */}
                        <div className="flex md:flex-col items-center gap-2 md:w-16 shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          <input
                            type="checkbox"
                            checked={selectedApplicantIds.has(app.id)}
                            onChange={() => toggleSelectApplicant(app.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                            {app.jobseeker_photo_url ? (
                              <img src={app.jobseeker_photo_url} alt={app.jobseeker_name} className="h-full w-full object-cover" />
                            ) : (
                              (app.jobseeker_name || "?").charAt(0)
                            )}
                          </div>
                        </div>

                        {/* Middle: identity + meta */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-primary">{app.jobseeker_name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                                {app.jobseeker_phone && <span>📞 {app.jobseeker_phone}</span>}
                                {app.jobseeker_email && <span>✉️ {app.jobseeker_email}</span>}
                              </div>
                            </div>
                            {matchPct != null && (
                              <div className="flex flex-col items-center shrink-0">
                                <div className="h-10 w-10 rounded-full border-2 border-green-500 flex items-center justify-center text-[10px] font-bold text-green-600">
                                  {matchPct}%
                                </div>
                                <span className="text-[8px] text-muted-foreground">Matched</span>
                              </div>
                            )}
                          </div>

                          {app.job_title && (
                            <p className="text-[11px] text-muted-foreground">
                              আবেদিত পদ: <span className="font-medium text-foreground">{app.job_title}</span>
                            </p>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            {app.created_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {format(new Date(app.created_at), "d MMM yyyy")}
                              </span>
                            )}
                            {app.age_at_application != null && <span>বয়স: {app.age_at_application}</span>}
                            {app.expected_salary != null && (
                              <span>প্রত্যাশিত: ৳{Number(app.expected_salary).toLocaleString("bn-BD")}</span>
                            )}
                          </div>

                          {app.cover_letter && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{app.cover_letter}</p>
                          )}

                          {app.interviewer_notes && (
                            <p className="text-[11px] text-muted-foreground">📝 {app.interviewer_notes}</p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {app.cv_url && (
                              <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                                <FileText className="h-3 w-3" /> CV দেখুন
                              </a>
                            )}
                            {app.video_cv_url && (
                              <a href={app.video_cv_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 flex items-center gap-0.5 hover:underline">
                                <Video className="h-3 w-3" /> ভিডিও সিভি
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Right: shortlist/reject + action icons */}
                        <div className="flex flex-row md:flex-col items-center gap-3 md:w-32 shrink-0 md:border-l md:pl-3">
                          {isRejected ? (
                            <Badge className="bg-red-100 text-red-800 text-[10px]">বাতিল</Badge>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                title="Shortlist"
                                onClick={() => updateHiringStage(app.id, "shortlisted")}
                                className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                                  isShortlisted ? "bg-green-500 border-green-500 text-white" : "border-green-500 text-green-600 hover:bg-green-50"
                                }`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                title="Reject"
                                onClick={() => updateHiringStage(app.id, "rejected")}
                                className="h-8 w-8 rounded-full flex items-center justify-center border border-red-500 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5 w-full">
                            <button
                              onClick={() => setInterviewForm({
                                application_id: app.id, interview_type: "online",
                                scheduled_at: "", duration_minutes: 30, location: "", meeting_link: "", notes: "",
                              })}
                              className="text-[9px] border rounded px-1.5 py-1 hover:bg-muted flex items-center gap-1 justify-center"
                            >
                              <Video className="h-3 w-3" /> ভিডিও
                            </button>
                            <button
                              onClick={() => setInterviewForm({
                                application_id: app.id, interview_type: "in-person",
                                scheduled_at: "", duration_minutes: 30, location: "", meeting_link: "", notes: "",
                              })}
                              className="text-[9px] border rounded px-1.5 py-1 hover:bg-muted flex items-center gap-1 justify-center"
                            >
                              <UserCheck className="h-3 w-3" /> সাক্ষাৎ
                            </button>
                            <button
                              onClick={() => setScoreForm({ id: app.id, score: app.score || 0, notes: app.interviewer_notes || "" })}
                              className="text-[9px] border rounded px-1.5 py-1 hover:bg-muted flex items-center gap-1 justify-center col-span-2"
                            >
                              <Star className="h-3 w-3" /> টেস্ট / স্কোর
                            </button>
                          </div>

                          <button
                            onClick={() => setCommentDraft({ id: app.id, text: app.interviewer_notes || "" })}
                            className="text-[9px] text-primary flex items-center gap-1 hover:underline"
                          >
                            <Plus className="h-3 w-3" /> Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case "talent-search":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> ট্যালেন্ট সার্চ</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="নাম বা স্কিল দিয়ে খুঁজুন..." value={seekerSearch} onChange={e => setSeekerSearch(e.target.value)} />
            </div>
            <div className="space-y-2">
              {filteredSeekers.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">কোনো প্রার্থী পাওয়া যায়নি</p> :
                filteredSeekers.map((s: any) => (
                  <div key={s.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{s.full_name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(typeof s.skills === "string" ? JSON.parse(s.skills || "[]") : (s.skills || [])).slice(0, 4).map((sk: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[9px]">{sk}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                          {s.address && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{s.address}</span>}
                          {s.expected_salary && <span>প্রত্যাশিত: ৳{Number(s.expected_salary).toLocaleString("bn-BD")}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addBookmark(s.user_id)}>
                        <BookmarkPlus className="h-4 w-4 text-amber-600" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );

      case "bookmarks":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Bookmark className="h-5 w-5 text-amber-600" /> সংরক্ষিত প্রার্থী ({bookmarks.length})</h2>
            {bookmarks.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">কোনো প্রার্থী সংরক্ষিত নেই</p> :
              bookmarks.map((b: any) => (
                <div key={b.id} className="border rounded-lg p-3 bg-card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{b.full_name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(typeof b.skills === "string" ? JSON.parse(b.skills || "[]") : (b.skills || [])).slice(0, 3).map((sk: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px]">{sk}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeBookmark(b.id)}>মুছুন</Button>
                </div>
              ))}
          </div>
        );

      case "interviews":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-green-600" /> ইন্টারভিউ শিডিউল ({interviews.length})</h2>
            {interviews.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">কোনো ইন্টারভিউ শিডিউল নেই</p> :
              interviews.map((iv: any) => (
                <div key={iv.id} className="border rounded-lg p-3 bg-card space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{iv.applicant_name}</p>
                      <p className="text-xs text-muted-foreground">{iv.job_title}</p>
                    </div>
                    <Badge className={iv.status === "scheduled" ? "bg-blue-100 text-blue-800" : iv.status === "completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {iv.status === "scheduled" ? "আসন্ন" : iv.status === "completed" ? "সম্পন্ন" : "বাতিল"}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{format(new Date(iv.scheduled_at), "dd MMM yyyy, hh:mm a")}</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{iv.duration_minutes} মিনিট</span>
                    <span className="flex items-center gap-0.5">{iv.interview_type === "online" ? <Video className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}{iv.interview_type}</span>
                  </div>
                  {iv.location && <p className="text-[10px] text-muted-foreground">{iv.location}</p>}
                  {iv.meeting_link && <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary">মিটিং লিংক</a>}
                </div>
              ))}
          </div>
        );

      case "packages":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> জব পোস্টিং প্যাকেজ</h2>
            <p className="text-xs text-muted-foreground">আপনার প্রয়োজন অনুযায়ী সঠিক প্ল্যান নির্বাচন করুন</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg: any) => {
                const isRecommended = pkg.is_featured;
                const visLevel = pkg.visibility_level;
                const features = typeof pkg.features === "string" ? JSON.parse(pkg.features || "[]") : (pkg.features || []);
                return (
                  <div key={pkg.id} className={`border rounded-xl p-5 bg-card relative transition-all hover:shadow-lg ${isRecommended ? "border-primary ring-2 ring-primary/20" : ""} ${visLevel === "hot" ? "border-red-400 bg-gradient-to-b from-red-50/50 to-card dark:from-red-950/20" : ""}`}>
                    {isRecommended && <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] px-3">জনপ্রিয়</Badge>}
                    {visLevel === "hot" && <Badge className="absolute -top-2.5 left-3 bg-red-500 text-white text-[10px] px-3">🔥 Special</Badge>}
                    <div className="flex items-center gap-2 mb-3">
                      {getPackageIcon(visLevel)}
                      <h3 className="font-bold text-base">{pkg.name}</h3>
                    </div>
                    <p className="text-3xl font-extrabold text-primary">
                      ৳{Number(pkg.price).toLocaleString("bn-BD")}
                      {pkg.price > 0 && <span className="text-xs font-normal text-muted-foreground">+ভ্যাট/প্রতি জব</span>}
                    </p>
                    <div className="border-t my-3" />
                    <p className="text-xs text-muted-foreground mb-1">{pkg.duration_days} দিন ভিজিবিলিটি</p>
                    <p className="text-xs text-muted-foreground mb-3">{pkg.max_applications ? `সর্বোচ্চ ${pkg.max_applications} আবেদন` : "আনলিমিটেড আবেদন"}</p>
                    <ul className="space-y-1.5 mb-4">
                      {features.map((f: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    {pkg.max_jobs_per_year && (
                      <p className="text-[10px] text-muted-foreground mb-3 border-t pt-2">📌 বছরে সর্বোচ্চ {pkg.max_jobs_per_year}টি জব</p>
                    )}
                    <Button className="w-full" variant={isRecommended ? "default" : "outline"} size="sm">
                      নির্বাচন করুন
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <JobsPageTransition>
      <PanelSidebarTabs
        panelTitle="এমপ্লয়ার প্যানেল"
        panelIcon={<Building2 />}
        hero={{
          title: "নিয়োগ ও ক্যান্ডিডেট ম্যানেজমেন্ট",
          subtitle: "চাকরি পোস্ট, পাইপলাইন ও হায়ারিং অ্যানালিটিক্স — Linear-class রিক্রুটার ওয়ার্কফ্লো।",
          badge: { label: "এমপ্লয়ার প্যানেল" },
          gradient: "from-indigo-500 via-blue-600 to-indigo-700",
        }}
        items={sidebarItems}
        defaultValue="dashboard"
      >
        {(activeTab) => renderContent(activeTab)}
      </PanelSidebarTabs>

      {/* Interview Schedule Modal */}
      <Dialog open={!!interviewForm} onOpenChange={() => setInterviewForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ইন্টারভিউ শিডিউল করুন</DialogTitle></DialogHeader>
          {interviewForm && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">ইন্টারভিউ ধরন</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={interviewForm.interview_type} onChange={e => setInterviewForm((p: any) => ({ ...p, interview_type: e.target.value }))}>
                  <option value="in-person">সশরীর</option>
                  <option value="online">অনলাইন</option>
                  <option value="phone">ফোন</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">তারিখ ও সময়</label>
                <Input type="datetime-local" value={interviewForm.scheduled_at} onChange={e => setInterviewForm((p: any) => ({ ...p, scheduled_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">সময়কাল (মিনিট)</label>
                <Input type="number" value={interviewForm.duration_minutes} onChange={e => setInterviewForm((p: any) => ({ ...p, duration_minutes: parseInt(e.target.value) }))} />
              </div>
              {interviewForm.interview_type === "in-person" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">স্থান</label>
                  <Input value={interviewForm.location} onChange={e => setInterviewForm((p: any) => ({ ...p, location: e.target.value }))} />
                </div>
              )}
              {interviewForm.interview_type === "online" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">মিটিং লিংক</label>
                  <Input value={interviewForm.meeting_link} onChange={e => setInterviewForm((p: any) => ({ ...p, meeting_link: e.target.value }))} placeholder="https://" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block">নোট</label>
                <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={interviewForm.notes} onChange={e => setInterviewForm((p: any) => ({ ...p, notes: e.target.value }))} />
              </div>
              <Button onClick={scheduleInterview} className="w-full">শিডিউল করুন</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Modal */}
      <Dialog open={!!scoreForm} onOpenChange={() => setScoreForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>প্রার্থী স্কোরিং</DialogTitle></DialogHeader>
          {scoreForm && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">স্কোর (০-১০০)</label>
                <Input type="number" min={0} max={100} value={scoreForm.score} onChange={e => setScoreForm((p: any) => ({ ...p, score: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">ইন্টারভিউয়ারের মন্তব্য</label>
                <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={scoreForm.notes} onChange={e => setScoreForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="প্রার্থী সম্পর্কে আপনার পর্যবেক্ষণ..." />
              </div>
              <Button onClick={updateScore} className="w-full">স্কোর সেভ করুন</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Modal */}
      <Dialog open={!!editJobForm} onOpenChange={() => setEditJobForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>জব সম্পাদনা করুন</DialogTitle></DialogHeader>
          {editJobForm && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">পদের নাম</label>
                <Input value={editJobForm.title} onChange={e => setEditJobForm((p: any) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">বিবরণ</label>
                <textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={editJobForm.description} onChange={e => setEditJobForm((p: any) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">প্রয়োজনীয়তা</label>
                <textarea className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={editJobForm.requirements} onChange={e => setEditJobForm((p: any) => ({ ...p, requirements: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">সর্বনিম্ন বেতন</label>
                  <Input type="number" value={editJobForm.salary_min} onChange={e => setEditJobForm((p: any) => ({ ...p, salary_min: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">সর্বোচ্চ বেতন</label>
                  <Input type="number" value={editJobForm.salary_max} onChange={e => setEditJobForm((p: any) => ({ ...p, salary_max: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">পদ সংখ্যা</label>
                  <Input type="number" value={editJobForm.vacancy_count} onChange={e => setEditJobForm((p: any) => ({ ...p, vacancy_count: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">শেষ তারিখ</label>
                  <Input type="date" value={editJobForm.deadline} onChange={e => setEditJobForm((p: any) => ({ ...p, deadline: e.target.value }))} />
                </div>
              </div>
              <Button onClick={updateJob} className="w-full">আপডেট করুন</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comment Modal (applications tab) */}
      <Dialog open={!!commentDraft} onOpenChange={() => setCommentDraft(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>মন্তব্য যোগ করুন</DialogTitle></DialogHeader>
          {commentDraft && (
            <div className="space-y-3">
              <textarea
                className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={commentDraft.text}
                onChange={e => setCommentDraft(p => p ? { ...p, text: e.target.value } : p)}
                placeholder="প্রার্থী সম্পর্কে আপনার মন্তব্য লিখুন..."
              />
              <Button className="w-full" onClick={() => saveComment(commentDraft.id, commentDraft.text)}>
                সেভ করুন
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default EmployerPanel;