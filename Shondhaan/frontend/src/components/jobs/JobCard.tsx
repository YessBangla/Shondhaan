import { Link } from "react-router-dom";
import { Building2, MapPin, Clock, Banknote, Users, Bookmark, BookmarkCheck, AlertCircle, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast } from "date-fns";
import CompanyLogo from "@/components/jobs/CompanyLogo";

interface JobCardProps {
  job: any;
  bn: boolean;
  getTypeLabel: (val: string) => string;
  getCatLabel: (val: string) => string;
  isSaved: boolean;
  onSave: any;
  user: any;
  navigate: (path: string) => void;
  featured?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  it: "💻", marketing: "📢", sales: "📊", accounting: "🧮", engineering: "⚙️",
  healthcare: "🏥", education: "📚", garments: "👔", banking: "🏦", ngo: "🤝",
  government: "🏛️", driving: "🚗", construction: "🏗️", hospitality: "🏨",
  overseas: "✈️", parttime: "⏰", freelance: "💡", media: "📰", telecom: "📱",
  logistics: "🚚", pharma: "💊", retail: "🛍️", realestate: "🏠", general: "📋", other: "📁",
};

function getDeadlineUrgency(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isPast(d)) return "expired";
  const days = differenceInDays(d, new Date());
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return null;
}

export default function JobCard({ job, bn, getTypeLabel, getCatLabel, isSaved, onSave, user, navigate, featured }: JobCardProps) {
  const urgency = getDeadlineUrgency(job.deadline);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    onSave.mutate({ jobId: job.id, action: isSaved ? "unsave" : "save" });
  };

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={`group block rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 relative overflow-hidden ${
        featured ? "border-amber-200/80 ring-1 ring-amber-100 dark:ring-amber-900/30" : "hover:border-blue-200 dark:hover:border-blue-800"
      } ${urgency === "expired" ? "opacity-50 grayscale" : ""}`}
    >
      {featured && <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />}

      {urgency === "urgent" && (
        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-semibold animate-pulse flex items-center gap-1 shadow-lg shadow-red-500/20">
          <AlertCircle className="h-3 w-3" /> {bn ? "জরুরি!" : "Urgent!"}
        </div>
      )}
      {urgency === "soon" && (
        <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
          <Timer className="h-3 w-3" /> {bn ? "শীঘ্রই শেষ" : "Closing Soon"}
        </div>
      )}

      <div className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          <CompanyLogo
            src={job.company_logo_url}
            alt={job.company_name}
            iconClass={`h-6 w-6 ${featured ? "text-amber-600" : "text-blue-600"}`}
            fallbackBgClass={featured
              ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
              : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-sm md:text-[15px] group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">{job.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{job.company_name}</span>
                </p>
              </div>
              <button onClick={handleSave} className={`shrink-0 p-2 rounded-xl transition-all ${isSaved ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted"}`}>
                {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {(job.division || job.district) && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50/80 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-medium">
                  <MapPin className="h-3 w-3" />
                  {[job.division, job.district, job.thana].filter(Boolean).join(" › ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-medium">
                <Clock className="h-3 w-3" />
                {getTypeLabel(job.job_type)}
              </span>
              {job.salary_min && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg font-medium">
                  <Banknote className="h-3 w-3" />
                  ৳{(job.salary_min / 1000).toFixed(0)}k{job.salary_max ? `–${(job.salary_max / 1000).toFixed(0)}k` : "+"}
                </span>
              )}
              {job.vacancy_count > 1 && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50/80 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg font-medium">
                  <Users className="h-3 w-3" />
                  {job.vacancy_count} {bn ? "টি পদ" : "positions"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] h-5 font-medium rounded-md">
                  {CATEGORY_ICONS[job.category] || "📋"} {getCatLabel(job.category)}
                </Badge>
                {featured && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] h-5 border-0">
                    ⭐ {bn ? "ফিচার্ড" : "Featured"}
                  </Badge>
                )}
              </div>
              {job.deadline && (
                <span className={`text-[10px] font-medium ${urgency === "urgent" ? "text-red-600" : urgency === "soon" ? "text-orange-600" : "text-muted-foreground"}`}>
                  {bn ? "শেষ:" : "Deadline:"} {format(new Date(job.deadline), "dd MMM yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
