import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import BackToHomeButton from "@/components/BackToHomeButton";
import { Building2, MapPin, Globe, Phone, Mail, Users, Calendar, Briefcase, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { JOB_CATEGORIES, JOB_TYPES, COMPANY_TYPES } from "@/hooks/useJobData";
import { useState } from "react";

const EmployerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [logoErr, setLogoErr] = useState(false);

  const { data: employer, isLoading } = useQuery({
    queryKey: ["employer-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["employer-jobs", employer?.user_id],
    queryFn: async () => {
      if (!employer?.user_id) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", employer.user_id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employer?.user_id,
  });

  const getLabel = (list: { value: string; labelBn: string; labelEn: string }[], val: string) =>
    list.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  if (isLoading) {
    return (
      <JobsPageTransition>
        <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" /><JobsMenuBar />
        <div className="app-container py-12"><div className="h-48 rounded-xl bg-muted animate-pulse" /></div>
      </JobsPageTransition>
    );
  }

  if (!employer) {
    return (
      <JobsPageTransition>
        <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" /><JobsMenuBar />
        <div className="app-container py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold">{bn ? "কোম্পানি পাওয়া যায়নি" : "Company not found"}</h2>
        </div>
      </JobsPageTransition>
    );
  }

  return (
    <JobsPageTransition>
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-blue-700 md:bg-card" />
      <JobsMenuBar />

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
        <div className="app-container py-8">
          <BackToHomeButton />
          <div className="flex items-start gap-4 mt-3">
            {employer.company_logo_url && !logoErr ? (
              <img
                src={employer.company_logo_url}
                alt={employer.company_name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setLogoErr(true)}
                className="w-20 h-20 rounded-xl object-contain bg-white p-2 border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/15 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-white/70" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-extrabold truncate">{employer.company_name}</h1>
                {employer.is_verified && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
              </div>
              {employer.company_name_bn && <p className="text-blue-200 text-sm">{employer.company_name_bn}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {employer.industry_type && <Badge className="bg-white/15 text-white text-[10px]">{employer.industry_type}</Badge>}
                {employer.company_type && <Badge className="bg-white/15 text-white text-[10px]">{COMPANY_TYPES.find(t => t.value === employer.company_type)?.[bn ? "labelBn" : "labelEn"] || employer.company_type}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="app-container py-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Company Info Card */}
          <div className="md:col-span-1 space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">{bn ? "কোম্পানির তথ্য" : "Company Info"}</h3>
              {employer.establishment_year && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{bn ? `প্রতিষ্ঠিত: ${employer.establishment_year}` : `Est: ${employer.establishment_year}`}</span>
                </div>
              )}
              {employer.employee_count && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{bn ? `কর্মী: ${employer.employee_count} জন` : `Employees: ${employer.employee_count}`}</span>
                </div>
              )}
              {(employer.district || employer.division) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{[employer.district, employer.division].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {employer.website_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{employer.website_url}</a>
                </div>
              )}
              {employer.contact_email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{employer.contact_email}</span>
                </div>
              )}
              {employer.contact_phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{employer.contact_phone}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="rounded-xl border bg-card p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-xl font-bold text-blue-600">{employer.total_jobs_posted || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{bn ? "মোট পোস্ট" : "Jobs Posted"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <p className="text-xl font-bold text-green-600">{employer.total_hires || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{bn ? "মোট নিয়োগ" : "Total Hires"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs & Description */}
          <div className="md:col-span-2 space-y-4">
            {employer.description && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-2">{bn ? "কোম্পানি সম্পর্কে" : "About Company"}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{employer.description}</p>
              </div>
            )}

            {/* Active Jobs */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {bn ? `চলমান চাকরি (${jobs.length})` : `Active Jobs (${jobs.length})`}
              </h3>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{bn ? "বর্তমানে কোনো চাকরি নেই" : "No active jobs"}</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job: any) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{job.title}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[10px]">{getLabel(JOB_TYPES, job.job_type)}</Badge>
                            {job.category && <Badge variant="outline" className="text-[10px]">{getLabel(JOB_CATEGORIES, job.category)}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            {job.district && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.district}</span>}
                            {job.deadline && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{format(new Date(job.deadline), "dd MMM yyyy")}</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default EmployerProfile;
