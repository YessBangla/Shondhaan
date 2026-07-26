import { Link } from "react-router-dom";
import { Building2, MapPin, Briefcase, Calendar } from "lucide-react";
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
  const location = job.district || job.thana || job.division;

  // Field names unconfirmed — adjust to whatever useApprovedJobs actually
  // returns. Tries a pre-formatted range string first, then falls back to
  // composing one from min/max numbers.
  const formatExperience = () => {
    if (job.experience_range) return job.experience_range;
    if (job.experience_min != null && job.experience_max != null) {
      return bn
        ? `${job.experience_min} - ${job.experience_max} বছর`
        : `${job.experience_min} to ${job.experience_max} years`;
    }
    if (job.experience_min != null) {
      return bn ? `নূন্যতম ${job.experience_min} বছর` : `${job.experience_min}+ years`;
    }
    return null;
  };
  const experience = formatExperience();

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={`group flex items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border bg-gradient-to-br from-white to-blue-50/40 dark:from-card dark:to-blue-950/10 hover:shadow-lg transition-all duration-300 ${
        featured ? "border-amber-200/80 ring-1 ring-amber-100 dark:ring-amber-900/30" : "border-border hover:border-blue-200 dark:hover:border-blue-800"
      } ${urgency === "expired" ? "opacity-50 grayscale" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-green-700 dark:text-green-400 line-clamp-1 group-hover:underline">
          {job.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground line-clamp-1 mt-1">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {job.company_name}
        </p>

        {location && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {location}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-3 mt-3 border-t border-border/60">
          {experience ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 shrink-0" /> {experience}
            </span>
          ) : <span />}

          {job.deadline && (
            <span
              className={`flex items-center gap-1.5 text-xs whitespace-nowrap ${
                urgency === "urgent" ? "text-red-600" : urgency === "soon" ? "text-orange-600" : "text-muted-foreground"
              }`}
            >
              {bn ? "শেষ তারিখ" : "Deadline"}:
              <span className="inline-flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5" /> {format(new Date(job.deadline), "dd MMM yyyy")}
              </span>
            </span>
          )}
        </div>
      </div>

      <CompanyLogo
        src={job.company_logo_url}
        alt={job.company_name}
        sizeClass="w-16 h-16 shrink-0"
        iconClass={`h-8 w-8 ${featured ? "text-amber-600" : "text-blue-600"}`}
        fallbackBgClass={
          featured
            ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
            : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
        }
      />
    </Link>
  );
}