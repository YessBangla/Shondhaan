import { useState } from "react"; // (kept only if other files re-export from here; safe to remove if unused)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Backend base URL ────────────────────────────────────────────────────
// All job data now comes from your Express + MySQL backend, NOT Supabase.
// Only applications, saved jobs, and job-seeker profiles still use
// Supabase below (see notes near those hooks) — there's no MySQL route
// for those yet.
const YESSJOB_API_BASE = import.meta.env.VITE_YESSJOB_API_URL || "http://localhost:5050";

function getAuthHeaders() {
  const authRaw = localStorage.getItem("yess_mysql_auth");
  if (!authRaw) return {};
  try {
    const auth = JSON.parse(authRaw);
    if (!auth?.token) return {};
    return { Authorization: `Bearer ${auth.token}` };
  } catch {
    return {};
  }
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${YESSJOB_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  title_en: string | null;
  company_name: string;
  company_logo_url: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  job_type: string;
  experience_min: number;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
  division: string | null;
  district: string | null;
  thana: string | null;
  address: string | null;
  vacancy_count: number;
  deadline: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  category: string;
  status: string;
  is_featured: boolean;
  views_count: number;
  applications_count: number;
  education_required: string | null;
  gender_preference: string | null;
  age_min: number | null;
  age_max: number | null;
  company_type: string | null;
  application_instruction: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  user_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  cv_url: string | null;
  cover_letter: string | null;
  status: string;
  created_at: string;
}

export interface JobSeekerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string;
  marital_status: string;
  nationality: string;
  about_me: string | null;
  career_objective: string | null;
  present_salary: number | null;
  expected_salary: number | null;
  skills: string[];
  education: any[];
  experience: any[];
  training: any[];
  languages: any[];
  reference_persons: any[];
  preferred_job_categories: string[];
  preferred_districts: string[];
  is_available: boolean;
  profile_completeness: number;
  video_cv_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCategory {
  value: string;
  labelBn: string;
  labelEn: string;
}

const FALLBACK_JOB_CATEGORIES: JobCategory[] = [
  { value: "general", labelBn: "সাধারণ", labelEn: "General" },
  { value: "it", labelBn: "আইটি ও টেকনোলজি", labelEn: "IT & Technology" },
  { value: "marketing", labelBn: "মার্কেটিং", labelEn: "Marketing" },
  { value: "sales", labelBn: "সেলস", labelEn: "Sales" },
  { value: "accounting", labelBn: "একাউন্টিং", labelEn: "Accounting" },
  { value: "engineering", labelBn: "ইঞ্জিনিয়ারিং", labelEn: "Engineering" },
  { value: "healthcare", labelBn: "স্বাস্থ্যসেবা", labelEn: "Healthcare" },
  { value: "education", labelBn: "শিক্ষা", labelEn: "Education" },
  { value: "garments", labelBn: "গার্মেন্টস", labelEn: "Garments" },
  { value: "banking", labelBn: "ব্যাংকিং", labelEn: "Banking" },
  { value: "ngo", labelBn: "এনজিও", labelEn: "NGO" },
  { value: "government", labelBn: "সরকারি", labelEn: "Government" },
  { value: "driving", labelBn: "ড্রাইভিং", labelEn: "Driving" },
  { value: "construction", labelBn: "নির্মাণ", labelEn: "Construction" },
  { value: "hospitality", labelBn: "হোটেল ও রেস্তোরাঁ", labelEn: "Hospitality" },
  { value: "overseas", labelBn: "বিদেশে চাকরি", labelEn: "Overseas Jobs" },
  { value: "parttime", labelBn: "পার্ট-টাইম", labelEn: "Part-time" },
  { value: "freelance", labelBn: "ফ্রিল্যান্স", labelEn: "Freelance" },
  { value: "media", labelBn: "মিডিয়া ও সংবাদ", labelEn: "Media & Journalism" },
  { value: "telecom", labelBn: "টেলিকম", labelEn: "Telecom" },
  { value: "logistics", labelBn: "লজিস্টিকস ও ট্রান্সপোর্ট", labelEn: "Logistics & Transport" },
  { value: "pharma", labelBn: "ফার্মাসিউটিক্যালস", labelEn: "Pharmaceuticals" },
  { value: "retail", labelBn: "রিটেইল", labelEn: "Retail" },
  { value: "realestate", labelBn: "রিয়েল এস্টেট", labelEn: "Real Estate" },
  { value: "other", labelBn: "অন্যান্য", labelEn: "Other" },
];

const JOB_CATEGORIES_ENDPOINT =
  import.meta.env.VITE_JOB_CATEGORIES_URL || "https://backend-central.shondhaan.com/api/job-categories";

const JOB_TYPES = [
  { value: "full-time", labelBn: "ফুল-টাইম", labelEn: "Full-time" },
  { value: "part-time", labelBn: "পার্ট-টাইম", labelEn: "Part-time" },
  { value: "contract", labelBn: "চুক্তিভিত্তিক", labelEn: "Contract" },
  { value: "internship", labelBn: "ইন্টার্নশিপ", labelEn: "Internship" },
  { value: "freelance", labelBn: "ফ্রিল্যান্স", labelEn: "Freelance" },
  { value: "remote", labelBn: "রিমোট", labelEn: "Remote" },
  { value: "temporary", labelBn: "অস্থায়ী", labelEn: "Temporary" },
];

const EDUCATION_LEVELS = [
  { value: "any", labelBn: "যেকোনো", labelEn: "Any" },
  { value: "below_ssc", labelBn: "এসএসসির নিচে", labelEn: "Below SSC" },
  { value: "ssc", labelBn: "এসএসসি", labelEn: "SSC/Equivalent" },
  { value: "hsc", labelBn: "এইচএসসি", labelEn: "HSC/Equivalent" },
  { value: "diploma", labelBn: "ডিপ্লোমা", labelEn: "Diploma" },
  { value: "bachelors", labelBn: "স্নাতক (ব্যাচেলর)", labelEn: "Bachelor's Degree" },
  { value: "masters", labelBn: "স্নাতকোত্তর (মাস্টার্স)", labelEn: "Master's Degree" },
  { value: "phd", labelBn: "পিএইচডি", labelEn: "PhD/Doctorate" },
];

const GENDER_OPTIONS = [
  { value: "any", labelBn: "যেকোনো", labelEn: "Any" },
  { value: "male", labelBn: "পুরুষ", labelEn: "Male" },
  { value: "female", labelBn: "মহিলা", labelEn: "Female" },
  { value: "other", labelBn: "অন্যান্য", labelEn: "Other" },
];

const COMPANY_TYPES = [
  { value: "private", labelBn: "বেসরকারি", labelEn: "Private" },
  { value: "government", labelBn: "সরকারি", labelEn: "Government" },
  { value: "semi_govt", labelBn: "আধা-সরকারি", labelEn: "Semi-Government" },
  { value: "ngo", labelBn: "এনজিও", labelEn: "NGO" },
  { value: "multinational", labelBn: "বহুজাতিক", labelEn: "Multinational" },
  { value: "startup", labelBn: "স্টার্টআপ", labelEn: "Startup" },
  { value: "other", labelBn: "অন্যান্য", labelEn: "Other" },
];

// NOTE: the "+/" ranges below (e.g. "80000+", "10+") won't filter correctly
// against the backend's `salaryRange`/`experienceRange` query params, since
// routes/jobs.js does `salaryRange.split('-').map(Number)` — "80000+".split("-")
// stays ["80000+"], and Number("80000+") is NaN, so that condition is silently
// skipped server-side. Not something this rewrite fixes; flagging it so it
// doesn't look like a new bug if "80000+" / "10+" filters seem to do nothing.
const SALARY_RANGES = [
  { value: "0-10000", labelBn: "১০,০০০ এর নিচে", labelEn: "Below 10,000", min: 0, max: 10000 },
  { value: "10000-20000", labelBn: "১০,০০০ - ২০,০০০", labelEn: "10,000 - 20,000", min: 10000, max: 20000 },
  { value: "20000-35000", labelBn: "২০,০০০ - ৩৫,০০০", labelEn: "20,000 - 35,000", min: 20000, max: 35000 },
  { value: "35000-50000", labelBn: "৩৫,০০০ - ৫০,০০০", labelEn: "35,000 - 50,000", min: 35000, max: 50000 },
  { value: "50000-80000", labelBn: "৫০,০০০ - ৮০,০০০", labelEn: "50,000 - 80,000", min: 50000, max: 80000 },
  { value: "80000+", labelBn: "৮০,০০০+", labelEn: "80,000+", min: 80000, max: 999999 },
];

const EXPERIENCE_RANGES = [
  { value: "0", labelBn: "ফ্রেশার", labelEn: "Fresher" },
  { value: "1-2", labelBn: "১-২ বছর", labelEn: "1-2 years" },
  { value: "3-5", labelBn: "৩-৫ বছর", labelEn: "3-5 years" },
  { value: "5-10", labelBn: "৫-১০ বছর", labelEn: "5-10 years" },
  { value: "10+", labelBn: "১০+ বছর", labelEn: "10+ years" },
];

export const JOB_CATEGORIES = FALLBACK_JOB_CATEGORIES;

export function useJobCategories() {
  return useQuery({
    queryKey: ["job-categories"],
    queryFn: async () => {
      try {
        const res = await fetch(JOB_CATEGORIES_ENDPOINT);
        if (!res.ok) throw new Error(`Failed to load job categories (${res.status})`);
        const json = await res.json();
        const rows = json?.categories ?? [];
        const mapped: JobCategory[] = rows.map((r: any) => ({
          value: String(r.value),
          labelBn: String(r.label_bn ?? r.labelBn ?? ""),
          labelEn: String(r.label_en ?? r.labelEn ?? ""),
        }));
        return mapped.length ? mapped : FALLBACK_JOB_CATEGORIES;
      } catch {
        return FALLBACK_JOB_CATEGORIES;
      }
    },
    staleTime: 60_000,
  });
}

export { JOB_TYPES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES, SALARY_RANGES, EXPERIENCE_RANGES };

// ── Jobs: now backed by Express + MySQL (routes/jobs.js), not Supabase ──

export function useApprovedJobs(filters?: {
  category?: string;
  division?: string;
  district?: string;
  thana?: string;
  search?: string;
  jobType?: string;
  education?: string;
  companyType?: string;
  salaryRange?: string;
  experienceRange?: string;
}) {
  return useQuery({
    queryKey: ["jobs", "approved", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== "all") params.set("category", filters.category);
      if (filters?.division) params.set("division", filters.division);
      if (filters?.district) params.set("district", filters.district);
      if (filters?.thana) params.set("thana", filters.thana);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.jobType && filters.jobType !== "all") params.set("jobType", filters.jobType);
      if (filters?.education && filters.education !== "any") params.set("education", filters.education);
      if (filters?.companyType && filters.companyType !== "all") params.set("companyType", filters.companyType);
      if (filters?.salaryRange) params.set("salaryRange", filters.salaryRange);
      if (filters?.experienceRange) params.set("experienceRange", filters.experienceRange);

      const qs = params.toString();
      const rows = await fetchJson(`/api/jobs${qs ? `?${qs}` : ""}`, { cache: "no-store" as any });
      return (rows || []) as Job[];
    },
  });
}

export function useJobDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) return null;
      return (await fetchJson(`/api/jobs/${id}`)) as Job;
    },
    enabled: !!id,
  });
}

export function useMyJobs() {
  return useQuery({
    queryKey: ["jobs", "mine"],
    queryFn: async () => {
      return (await fetchJson(`/api/jobs/mine`)) as Job[];
    },
  });
}

export function usePostJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (job: Partial<Job>) => {
      return (await fetchJson(`/api/jobs`, {
        method: "POST",
        body: JSON.stringify(job),
      })) as Job;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("চাকরির বিজ্ঞাপন প্রকাশিত হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Edit an existing job (owner-only, enforced server-side by routes/jobs.js's
// PATCH /:id — checks jobs.user_id against the token, not just role). Used
// by JobPostForm.tsx when opened in edit mode from EmployerPanel's "সম্পাদনা"
// button.
export function useUpdateJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...job }: Partial<Job> & { id: string }) => {
      return (await fetchJson(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(job),
      })) as Job;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", variables.id] });
      toast.success("চাকরির বিজ্ঞাপন আপডেট হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRelatedJobs(category: string | undefined, currentJobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "related", category, currentJobId],
    queryFn: async () => {
      if (!category) return [];
      const rows = (await fetchJson(`/api/jobs?category=${encodeURIComponent(category)}`)) as Job[];
      return rows.filter((j) => j.id !== currentJobId).slice(0, 6);
    },
    enabled: !!category,
  });
}

export function useDeadlineSoonJobs() {
  return useQuery({
    queryKey: ["jobs", "deadline-soon"],
    queryFn: async () => {
      const rows = (await fetchJson(`/api/jobs`)) as Job[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysOut = new Date(today);
      threeDaysOut.setDate(threeDaysOut.getDate() + 3);

      return rows
        .filter((j) => {
          if (!j.deadline) return false;
          const d = new Date(j.deadline);
          return d >= today && d <= threeDaysOut;
        })
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
        .slice(0, 10);
    },
  });
}

export function useTopEmployers() {
  return useQuery({
    queryKey: ["jobs", "top-employers"],
    queryFn: async () => {
      const rows = (await fetchJson(`/api/jobs`)) as Job[];
      const map = new Map<string, { name: string; logo: string | null; count: number }>();
      rows.forEach((j) => {
        const existing = map.get(j.company_name);
        if (existing) existing.count++;
        else map.set(j.company_name, { name: j.company_name, logo: j.company_logo_url, count: 1 });
      });
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 12);
    },
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ["jobs", "stats"],
    queryFn: async () => {
      const jobs = (await fetchJson(`/api/jobs`)) as Job[];
      const categoryCounts = new Map<string, number>();
      const companyCounts = new Map<string, number>();
      const divisionCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();

      jobs.forEach((j) => {
        categoryCounts.set(j.category || "general", (categoryCounts.get(j.category || "general") || 0) + 1);
        companyCounts.set(j.company_name, (companyCounts.get(j.company_name) || 0) + 1);
        if (j.division) divisionCounts.set(j.division, (divisionCounts.get(j.division) || 0) + 1);
        if (j.job_type) typeCounts.set(j.job_type, (typeCounts.get(j.job_type) || 0) + 1);
      });

      return {
        totalJobs: jobs.length,
        totalCompanies: companyCounts.size,
        categoryCounts: Object.fromEntries(categoryCounts),
        topCategories: Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
        divisionCounts: Object.fromEntries(divisionCounts),
        typeCounts: Object.fromEntries(typeCounts),
      };
    },
  });
}

export function useQuickFilterJobs(filterType: string) {
  return useQuery({
    queryKey: ["jobs", "quick-filter", filterType],
    queryFn: async () => {
      const jobs = (await fetchJson(`/api/jobs`)) as Job[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filterType) {
        case "new": {
          const twoDaysAgo = new Date(today);
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          return jobs.filter((j) => new Date(j.created_at) >= twoDaysAgo).length;
        }
        case "deadline": {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];
          return jobs.filter((j) => j.deadline === tomorrowStr).length;
        }
        case "internship":
          return jobs.filter((j) => j.job_type === "internship").length;
        case "parttime":
          return jobs.filter((j) => j.job_type === "part-time").length;
        case "contract":
          return jobs.filter((j) => j.job_type === "contract").length;
        case "overseas":
          return jobs.filter((j) => j.category === "overseas").length;
        case "remote":
          return jobs.filter((j) => j.job_type === "remote").length;
        case "fresher":
          return jobs.filter((j) => j.experience_min === 0).length;
        default:
          return jobs.length;
      }
    },
  });
}

// ── Employers ─────────────────────────────────────────────────────────
// This previously merged Supabase's employer_profiles table with jobs.
// There's no MySQL employer_profiles route in what's been shared, so
// this version only derives employer info from the jobs list itself
// (no `isVerified`, no separate employer_profiles data). If you have a
// MySQL employer profiles endpoint, tell me and I'll wire it back in.
export function useAllEmployers() {
  return useQuery({
    queryKey: ["jobs", "all-employers"],
    queryFn: async () => {
      const jobs = (await fetchJson(`/api/jobs`)) as Job[];
      const map = new Map<string, any>();
      jobs.forEach((j) => {
        const existing = map.get(j.company_name);
        if (existing) {
          existing.count++;
          if (j.category) existing.categories.add(j.category);
        } else {
          const cats = new Set<string>();
          if (j.category) cats.add(j.category);
          map.set(j.company_name, {
            id: null,
            name: j.company_name,
            logo: j.company_logo_url,
            count: 1,
            type: j.company_type,
            division: j.division,
            district: j.district,
            categories: cats,
            isVerified: false,
            userId: j.user_id ?? null,
          });
        }
      });
      return Array.from(map.values())
        .map((e) => ({ ...e, categories: Array.from(e.categories) }))
        .sort((a, b) => b.count - a.count);
    },
  });
}

// ── Everything below this line still uses Supabase ──────────────────────
// No MySQL routes exist yet for applications, saved jobs, job-seeker
// profiles, or view counting. Left as-is on purpose — say the word if you
// want these moved to the Express backend too (each needs its own route).

export function useApplyJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (app: Partial<JobApplication>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const { data, error } = await supabase.from("job_portal_applications").insert({ ...app, user_id: user.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("আবেদন সফলভাবে জমা হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-applications", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase.from("job_portal_applications").select("*").eq("job_id", jobId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as JobApplication[];
    },
    enabled: !!jobId,
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["job-applications", "mine"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("job_portal_applications").select("*, jobs(title, company_name, status)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ["saved-jobs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("saved_jobs").select("*, jobs(*)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: "save" | "unsave" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      if (action === "save") {
        const { error } = await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: jobId } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", jobId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-jobs"] }),
  });
}

export function useJobSeekerProfile() {
  return useQuery({
    queryKey: ["job-seeker-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from("job_seeker_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data as JobSeekerProfile | null;
    },
  });
}

export function useUpsertJobSeekerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<JobSeekerProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const { data, error } = await supabase
        .from("job_seeker_profiles")
        .upsert({ ...profile, user_id: user.id } as any, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-seeker-profile"] });
      toast.success("প্রোফাইল সংরক্ষিত হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      const { error } = await supabase.from("job_portal_applications").update({ status } as any).eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useIncrementJobView() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.rpc("increment_job_views" as any, { job_id: jobId });
      if (error) {
        await supabase.from("jobs").update({ views_count: supabase.rpc ? undefined : 0 } as any).eq("id", jobId);
      }
    },
  });
}