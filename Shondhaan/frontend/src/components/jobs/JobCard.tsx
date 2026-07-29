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

// Strips HTML tags (description is stored as rich-text HTML from the job
// post form) and truncates to a SHORT preview — kept deliberately small so
// the bubble never needs to scroll. This is the only place job.description
// is ever rendered — never render it raw/unstripped on the card itself.
const POPUP_PREVIEW_LENGTH = 110;

function getDescriptionPreview(html: string | null | undefined) {
  if (!html) return null;
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = (div.textContent || "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length <= POPUP_PREVIEW_LENGTH) return text;
  return `${text.slice(0, POPUP_PREVIEW_LENGTH).trim()}…`;
}

export default function JobCard({
  job,
  bn,
  getTypeLabel,
  getCatLabel,
  isSaved,
  onSave,
  user,
  navigate,
  featured,
}: JobCardProps) {
  const urgency = getDeadlineUrgency(job.deadline);
  const location = job.district || job.thana || job.division;

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

const education = job.education_subject || null;
  const experience = formatExperience();
  const hasQualificationInfo = Boolean(education || experience);
  const descriptionPreview = getDescriptionPreview(job.description);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group relative flex justify-between gap-3 rounded-lg border border-gray-300 bg-[#eef3fb] p-3 transition-all duration-200 hover:border-gray-400 hover:shadow-md"
    >
      {/* Left */}
      <div className="flex-1 min-w-0">
        {/* Job Title */}
        <h3 className="text-base font-bold text-green-700 group-hover:underline line-clamp-1">
          {job.title}
        </h3>

        {/* Company */}
        <p className="mt-0.5 font-semibold text-gray-800 text-sm">
          {job.company_name}
        </p>

        {/* Information — description is never shown here by default */}
        <div className="mt-2 space-y-1">
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {education && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{education}</span>
            </div>
          )}

          {experience && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{experience}</span>
            </div>
          )}

          {!hasQualificationInfo && !descriptionPreview && (
            <span className="text-xs text-gray-400 italic">
              {bn ? "বিস্তারিত তথ্য নেই" : "No details provided"}
            </span>
          )}
        </div>

        {/* Deadline */}
        {job.deadline && (
          <div className="mt-2.5 flex justify-end">
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <span className="font-medium">Deadline:</span>
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {format(new Date(job.deadline), "dd MMM yyyy")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Logo */}
      <CompanyLogo
        src={job.company_logo_url}
        alt={job.company_name}
        sizeClass="w-20 h-20 shrink-0 rounded-md bg-white border"
        iconClass="w-8 h-8 text-gray-400"
        fallbackBgClass="bg-white"
      />

      {/* Description popup — speech-bubble, appears BELOW the card with a
          triangular tail pointing up toward the card edge. Fixed small
          size, short clamped text, no scrollbar. Hidden until hover. */}
      {descriptionPreview && (
        <div className="pointer-events-none absolute left-4 top-1/2 z-20  opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
          {/* Triangular tail, pointing up into the card */}
          <div className="ml-3 h-0 w-0 border-x-8 border-x-transparent border-b-[10px]  border-primary drop-shadow-sm" />

          {/* Bubble body */}
          <div className="w-[300px] border border-primary max-w-[85vw] rounded-xl bg-background p-3 text-[11px] leading-4 text-gray-700 shadow-xl">
            <p className="line-clamp-4">{descriptionPreview}</p>
          </div>
        </div>
      )}
    </Link>
  );
}