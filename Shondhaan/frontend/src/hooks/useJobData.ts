import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const JOB_CATEGORIES = [
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

export { JOB_CATEGORIES, JOB_TYPES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES, SALARY_RANGES, EXPERIENCE_RANGES };

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
      let q = supabase
        .from("jobs")
        .select("*")
        .eq("status", "approved")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters?.division) q = q.eq("division", filters.division);
      if (filters?.district) q = q.eq("district", filters.district);
      if (filters?.thana) q = q.eq("thana", filters.thana);
      if (filters?.jobType && filters.jobType !== "all") q = q.eq("job_type", filters.jobType);
      if (filters?.education && filters.education !== "any") q = q.eq("education_required", filters.education);
      if (filters?.companyType && filters.companyType !== "all") q = q.eq("company_type", filters.companyType);
      if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      if (filters?.salaryRange) {
        const range = SALARY_RANGES.find(r => r.value === filters.salaryRange);
        if (range) {
          q = q.gte("salary_min", range.min).lte("salary_min", range.max);
        }
      }
      if (filters?.experienceRange) {
        if (filters.experienceRange === "0") q = q.eq("experience_min", 0);
        else if (filters.experienceRange === "10+") q = q.gte("experience_min", 10);
        else {
          const [min, max] = filters.experienceRange.split("-").map(Number);
          q = q.gte("experience_min", min).lte("experience_min", max);
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Job[];
    },
  });
}

export function useJobDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Job;
    },
    enabled: !!id,
  });
}

export function useMyJobs() {
  return useQuery({
    queryKey: ["jobs", "mine"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Job[];
    },
  });
}

export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Partial<Job>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const { data, error } = await supabase.from("jobs").insert({ ...job, user_id: user.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("চাকরির বিজ্ঞাপন জমা দেওয়া হয়েছে! অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

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

export function useTopEmployers() {
  return useQuery({
    queryKey: ["jobs", "top-employers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("company_name, company_logo_url")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { name: string; logo: string | null; count: number }>();
      (data || []).forEach((j: any) => {
        const existing = map.get(j.company_name);
        if (existing) existing.count++;
        else map.set(j.company_name, { name: j.company_name, logo: j.company_logo_url, count: 1 });
      });
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 12);
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
        // Fallback: direct update if RPC doesn't exist
        await supabase.from("jobs").update({ views_count: supabase.rpc ? undefined : 0 } as any).eq("id", jobId);
      }
    },
  });
}

export function useRelatedJobs(category: string | undefined, currentJobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "related", category, currentJobId],
    queryFn: async () => {
      if (!category) return [];
      let q = supabase.from("jobs").select("*").eq("status", "approved").eq("category", category).limit(6);
      if (currentJobId) q = q.neq("id", currentJobId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Job[];
    },
    enabled: !!category,
  });
}

export function useDeadlineSoonJobs() {
  return useQuery({
    queryKey: ["jobs", "deadline-soon"],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const today = new Date().toISOString().split("T")[0];
      const threeDays = tomorrow.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "approved")
        .gte("deadline", today)
        .lte("deadline", threeDays)
        .order("deadline", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []) as Job[];
    },
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ["jobs", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("category, company_name, job_type, district, division")
        .eq("status", "approved");
      if (error) throw error;
      const jobs = data || [];
      const categoryCounts = new Map<string, number>();
      const companyCounts = new Map<string, number>();
      const divisionCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();
      let newJobsCount = 0;
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      jobs.forEach(j => {
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

export function useAllEmployers() {
  return useQuery({
    queryKey: ["jobs", "all-employers"],
    queryFn: async () => {
      // Fetch from employer_profiles first
      const { data: profiles, error: profileErr } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("is_active", true);
      
      // Also fetch from jobs for companies without employer profiles
      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("company_name, company_logo_url, company_type, division, district, category, user_id")
        .eq("status", "approved");
      
      if (profileErr) throw profileErr;
      if (jobErr) throw jobErr;

      const result: { id: string | null; name: string; logo: string | null; count: number; type: string | null; division: string | null; district: string | null; categories: string[]; isVerified: boolean; userId: string | null }[] = [];
      const seen = new Set<string>();

      // Add employer_profiles entries  
      (profiles || []).forEach((p: any) => {
        const jobCount = (jobData || []).filter((j: any) => j.user_id === p.user_id).length;
        const cats = new Set<string>();
        (jobData || []).filter((j: any) => j.user_id === p.user_id).forEach((j: any) => { if (j.category) cats.add(j.category); });
        result.push({
          id: p.id,
          name: p.company_name,
          logo: p.company_logo_url,
          count: jobCount,
          type: p.company_type,
          division: p.division,
          district: p.district,
          categories: Array.from(cats),
          isVerified: p.is_verified,
          userId: p.user_id,
        });
        seen.add(p.company_name);
      });

      // Add companies from jobs that don't have employer profiles
      const map = new Map<string, any>();
      (jobData || []).forEach((j: any) => {
        if (seen.has(j.company_name)) return;
        const existing = map.get(j.company_name);
        if (existing) {
          existing.count++;
          if (j.category) existing.categories.add(j.category);
        } else {
          const cats = new Set<string>();
          if (j.category) cats.add(j.category);
          map.set(j.company_name, { id: null, name: j.company_name, logo: j.company_logo_url, count: 1, type: j.company_type, division: j.division, district: j.district, categories: cats, isVerified: false, userId: null });
        }
      });
      map.forEach(e => result.push({ ...e, categories: Array.from(e.categories) }));

      return result.sort((a, b) => b.count - a.count);
    },
  });
}

export function useQuickFilterJobs(filterType: string) {
  return useQuery({
    queryKey: ["jobs", "quick-filter", filterType],
    queryFn: async () => {
      let q = supabase.from("jobs").select("id").eq("status", "approved");
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      switch (filterType) {
        case "new": {
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          q = q.gte("created_at", twoDaysAgo.toISOString());
          break;
        }
        case "deadline":
          q = q.eq("deadline", tomorrowStr);
          break;
        case "internship":
          q = q.eq("job_type", "internship");
          break;
        case "parttime":
          q = q.eq("job_type", "part-time");
          break;
        case "contract":
          q = q.eq("job_type", "contract");
          break;
        case "overseas":
          q = q.eq("category", "overseas");
          break;
        case "remote":
          q = q.eq("job_type", "remote");
          break;
        case "fresher":
          q = q.eq("experience_min", 0);
          break;
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).length;
    },
  });
}
