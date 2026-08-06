import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useJobDetail, useApplyJob, useRelatedJobs, useIncrementJobView, useSaveJob, useSavedJobs, useJobSeekerProfile, JOB_TYPES, JOB_CATEGORIES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES } from "@/hooks/useJobData";
import { Briefcase, MapPin, Clock, Building2, Banknote, Users, Calendar, Phone, Mail, ArrowLeft, Send, Eye, GraduationCap, User2, Building, AlertCircle, Share2, Bookmark, BookmarkCheck, Printer, CheckCircle2, ChevronRight, Video, Facebook, Linkedin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, isPast } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { toast } from "sonner";
import CompanyLogo from "@/components/jobs/CompanyLogo";

// ── Tab config ──────────────────────────────────────────────────────
type TabKey = "all" | "requirements" | "responsibilities" | "salary" | "company";

const TABS: { key: TabKey; labelEn: string; labelBn: string }[] = [
  { key: "all", labelEn: "All", labelBn: "সব" },
  { key: "requirements", labelEn: "Requirements", labelBn: "যোগ্যতা" },
  { key: "responsibilities", labelEn: "Responsibilities", labelBn: "দায়িত্ব" },
  { key: "salary", labelEn: "Salary & Benefits", labelBn: "বেতন ও সুবিধা" },
  { key: "company", labelEn: "Company Information", labelBn: "প্রতিষ্ঠানের তথ্য" },
];

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

  const allRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);
  const responsibilitiesRef = useRef<HTMLDivElement>(null);
  const salaryRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const isSaved = savedJobs.some((s: any) => s.job_id === id);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (dir: "left" | "right") => {
    tabsScrollRef.current?.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  };

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The action bar starts inline (inside the header card, normal position
  // at the top). Once it scrolls out of the viewport, we switch to showing
  // a second copy fixed to the bottom of the screen instead.
  const inlineActionBarRef = useRef<HTMLDivElement>(null);
  const [showStickyBottomBar, setShowStickyBottomBar] = useState(false);

  // NOTE: this effect used to run once on mount with `[]` as its
  // dependency array. That meant it could fire BEFORE `job` finished
  // loading (while the component is still rendering the loading
  // skeleton / "not found" branch, which don't contain
  // `inlineActionBarRef` in the DOM at all). When that happened,
  // `inlineActionBarRef.current` was null, the observer was never
  // attached, and `showStickyBottomBar` stayed false forever — so the
  // bottom bar never appeared no matter how far you scrolled.
  //
  // Depending on `job` makes the effect re-run once the real header
  // card (containing the ref) actually mounts, so the observer gets
  // attached to the real DOM node.
  useEffect(() => {
    const el = inlineActionBarRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBottomBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [job]);

  // The only two fields the modal actually collects. Everything else
  // (name, phone, email, cv, video cv) comes straight from the
  // jobseeker's profile at submit time.
  const [applicantAge, setApplicantAge] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");

  // Pre-fill Age / Expected Salary from the profile once it loads, so the
  // user only has to touch these if the profile value is missing or stale.
  useEffect(() => {
    if (seekerProfile) {
      if (seekerProfile.date_of_birth) {
        const dob = new Date(seekerProfile.date_of_birth);
        const ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        setApplicantAge(String(ageYears));
      }
      if (seekerProfile.expected_salary) {
        setExpectedSalary(String(seekerProfile.expected_salary));
      }
    }
  }, [seekerProfile]);

  // Allowlist-based sanitizer for rich-text job fields. Strips every
  // attribute (data-*, class, style, etc.) and any tag not produced by
  // RichTextArea's toolbar, so old/junk HTML (e.g. leftover
  // data-section-id / PDq2pG_selectionAnchor spans from before AI Write
  // was removed) renders as clean text instead of literal tags.
  const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "UL", "LI", "BR", "P"]);

  function sanitizeDescriptionHtml(html: string): string {
    if (!html) return "";
    const container = document.createElement("div");
    container.innerHTML = html;

    const walk = (node: Node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          walk(el);
          if (!ALLOWED_TAGS.has(el.tagName)) {
            while (el.firstChild) node.insertBefore(el.firstChild, el);
            node.removeChild(el);
          } else {
            Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
          }
        } else if (child.nodeType !== Node.TEXT_NODE) {
          node.removeChild(child);
        }
      });
    };

    walk(container);
    return container.innerHTML;
  }

  // Increment views on page load
  useEffect(() => {
    if (id) incrementView.mutate(id);
  }, [id]);

  const getLabel = (list: { value: string; labelBn: string; labelEn: string }[], val: string) =>
    list.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  const handleApply = async () => {
    if (!user) { navigate("/auth"); return; }

    setSubmitting(true);

    // The backend only accepts job_id, expected_salary, and cover_letter.
    // Name/phone/email come from jobseeker_profiles server-side, and age
    // is computed server-side from date_of_birth (age_at_application) —
    // sending applicantAge here would just be ignored, so it's left out.
    try {
      await applyMutation.mutateAsync({
        job_id: id!,
        expected_salary: expectedSalary ? Number(expectedSalary) : null,
        cover_letter: null,
      });

      setShowApplyModal(false);
    } finally {
      // A failed request must not leave the Apply button permanently busy.
      setSubmitting(false);
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: job?.title, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(bn ? "লিঙ্ক কপি হয়েছে" : "Link copied!");
    }
  };

  const scrollToSection = (key: TabKey) => {
    setActiveTab(key);

    const refs = {
      all: allRef,
      requirements: requirementsRef,
      responsibilities: responsibilitiesRef,
      salary: salaryRef,
      company: companyRef,
    };

    refs[key]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const shareTo = (platform: "facebook" | "linkedin" | "whatsapp") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(job?.title || "");
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleSave = () => {
    if (!user) { navigate("/auth"); return; }
    saveJob.mutate({ jobId: id!, action: isSaved ? "unsave" : "save" });
  };

  if (isLoading) {
    return (
      <JobsPageTransition>
        <Navbar />
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

  // ── Section building blocks (reused across tabs) ────────────────────
  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2 pb-1 border-b border-rose-100 dark:border-rose-900/40">
      {children}
    </h2>
  );

  const SubHeading = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-foreground mt-3 mb-1">{children}</h3>
  );
  const DescriptionBlock = () => (
    <div
      className="job-description-content text-sm text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(job.description) }}
    />
  );

  const RequirementsBlock = () => (
    job.requirements ? (
      <div>
        <SectionHeading>{bn ? "যোগ্যতা ও শর্তাবলী" : "Requirements"}</SectionHeading>
        {job.education_required && job.education_required !== "any" && (
          <>
            <SubHeading>{bn ? "শিক্ষাগত যোগ্যতা" : "Education"}</SubHeading>
            <p className="text-sm text-muted-foreground">• {getLabel(EDUCATION_LEVELS, job.education_required)}</p>
          </>
        )}
        <SubHeading>{bn ? "অতিরিক্ত শর্তাবলী" : "Additional Requirements"}</SubHeading>
        <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.requirements}</div>
      </div>
    ) : null
  );

  const ResponsibilitiesBlock = () => (
    <div>
      <SectionHeading>{bn ? "দায়িত্ব ও কাজের পরিধি" : "Responsibilities & Context"}</SectionHeading>
      <DescriptionBlock />
    </div>
  );

  const SalaryBlock = () => (
    <div>
      <SectionHeading>{bn ? "বেতন ও সুযোগ-সুবিধা" : "Salary & Benefits"}</SectionHeading>
      <p className="text-sm mb-2">
        <span className="font-medium">{bn ? "বেতন: " : "Salary: "}</span>
        <span className="text-emerald-600 font-semibold">
          {job.salary_negotiable
            ? (bn ? "আলোচনা সাপেক্ষে" : "Negotiable")
            : (job.salary_min || job.salary_max)
              ? `৳${(job.salary_min || 0).toLocaleString("bn-BD")}${job.salary_max ? ` - ৳${job.salary_max.toLocaleString("bn-BD")}` : ""}`
              : (bn ? "উল্লেখ নেই" : "Not specified")}
        </span>
      </p>
      {job.benefits ? (
        <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.benefits}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{bn ? "সুযোগ-সুবিধার বিস্তারিত উল্লেখ নেই" : "No additional benefits listed"}</p>
      )}
    </div>
  );

  const CompanyBlock = () => (
    <div>
      <SectionHeading>{bn ? "প্রতিষ্ঠানের তথ্য" : "Company Information"}</SectionHeading>
      <div className="flex items-center gap-3 mb-3">
        <CompanyLogo
          src={job.company_logo_url}
          alt={job.company_name}
          sizeClass="w-14 h-14"
          iconClass="h-7 w-7 text-blue-600"
          fallbackBgClass="bg-blue-50 dark:bg-blue-900/30"
        />
        <div>
          <p className="font-semibold text-sm">{job.company_name}</p>
          {job.company_type && (
            <p className="text-xs text-muted-foreground">{getLabel(COMPANY_TYPES, job.company_type)}</p>
          )}
        </div>
      </div>
      {job.website_url && (
        <p className="flex items-center gap-2 text-sm mb-2">
          <Globe className="h-4 w-4 text-blue-600 shrink-0" />
          <a
            href={job.website_url.startsWith("http") ? job.website_url : `https://${job.website_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-blue-600 truncate"
          >
            {job.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </p>
      )}
      {user && (job.contact_phone || job.contact_email) ? (
        <div className="space-y-2 text-sm mt-3">
          {job.contact_phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-600" /> <a href={`tel:${job.contact_phone}`} className="hover:underline">{job.contact_phone}</a></p>}
          {job.contact_email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /> <a href={`mailto:${job.contact_email}`} className="hover:underline">{job.contact_email}</a></p>}
        </div>
      ) : !user && (job.contact_phone || job.contact_email) ? (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-center mt-3">
          <p className="text-xs text-muted-foreground mb-2">{bn ? "যোগাযোগের তথ্য দেখতে লগইন করুন" : "Login to see contact details"}</p>
          <Button size="sm" onClick={() => navigate("/auth")} className="bg-blue-600 hover:bg-blue-700">{bn ? "লগইন" : "Login"}</Button>
        </div>
      ) : null}
    </div>
  );

  const ApplicationInstructionBlock = () => (
    job.application_instruction ? (
      <div>
        <SectionHeading>{bn ? "আবেদনের নির্দেশনা" : "Application Instructions"}</SectionHeading>
        <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.application_instruction}</div>
      </div>
    ) : null
  );

  return (
    <JobsPageTransition>
      <Navbar />
      <JobsMenuBar />

      <div className="mx-auto max-w-7xl px-2 md:px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="-ml-2 mb-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Yess Jobs
            </Button>

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

            {/* ── Header Card (bdjobs style) ─────────────────────────── */}
            <div className="rounded-xl border border-gray-300 bg-card p-5 mb-3">
              <div className="flex items-start gap-4">
                <CompanyLogo
                  src={job.company_logo_url}
                  alt={job.company_name}
                  sizeClass="w-16 h-16"
                  iconClass="h-8 w-8 text-blue-600"
                  fallbackBgClass="bg-blue-50 dark:bg-blue-900/30"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{job.company_name}</p>
                  <h1 className="text-lg md:text-xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{job.title}</h1>
                  {job.deadline && (
                    <p className="text-xs mt-2">
                      <span className="text-muted-foreground">{bn ? "আবেদনের শেষ তারিখ: " : "Application Deadline: "}</span>
                      <span className={`font-bold ${isExpired ? "text-red-500 line-through" : "text-red-600"}`}>
                        {format(new Date(job.deadline), "dd MMM yyyy", { locale: bn ? bnLocale : undefined })}
                      </span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200"><Clock className="h-3 w-3 mr-1" />{getLabel(JOB_TYPES, job.job_type)}</Badge>
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200">{getLabel(JOB_CATEGORIES, job.category)}</Badge>
                    {job.is_featured && <Badge className="bg-amber-100 text-amber-700">⭐ Featured</Badge>}
                  </div>
                </div>
              </div>

              {/* ── Action bar (inline, normal position at top) ────────
                  Once this scrolls out of view, the fixed bottom bar
                  below takes over. */}
              {!isExpired && (
                <div ref={inlineActionBarRef} className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    onClick={() => user ? setShowApplyModal(true) : navigate("/auth")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1 sm:flex-none"
                  >
                    <Send className="h-4 w-4" /> {bn ? "আবেদন করুন" : "Apply Now"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4" />}
                    {bn ? "সংরক্ষণ" : "Save"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Share2 className="h-4 w-4" /> {bn ? "শেয়ার" : "Share"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => shareTo("facebook")} className="gap-2">
                        <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("linkedin")} className="gap-2">
                        <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("whatsapp")} className="gap-2">
                        <Send className="h-4 w-4 text-green-600" /> WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
                        <Share2 className="h-4 w-4" /> {bn ? "লিঙ্ক কপি" : "Copy Link"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="icon" onClick={() => window.print()} className="h-9 w-9 hidden md:flex">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* ── Tabs (bdjobs style) ─────────────────────────────── */}
            <div className="sticky  top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-2 bg-background/95 backdrop-blur-sm mb-4">
              <div className="flex border-gray-300 items-stretch rounded-full border bg-card overflow-hidden shadow-sm">
                <button
                  onClick={() => scrollTabs("left")}
                  className="shrink-0 w-9 flex items-center justify-center text-muted-foreground hover:bg-muted/50 border-r"
                  aria-label={bn ? "বামে স্ক্রল" : "Scroll left"}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <div ref={tabsScrollRef} className="flex-1 flex  scrollbar-none scroll-smooth">
                  {TABS.map((tab, i) => (
                    <button
                      key={tab.key}
                      onClick={() => scrollToSection(tab.key)}
                      className={`shrink-0 px-4 md:px-5 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                        i !== 0 ? "border-l" : ""
                      } ${
                        activeTab === tab.key
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full my-1 mx-0.5 border-l-0"
                          : "text-teal-700 dark:text-teal-400 hover:bg-muted/50"
                      }`}
                    >
                      {bn ? tab.labelBn : tab.labelEn}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => scrollTabs("right")}
                  className="shrink-0 w-9 flex items-center justify-center text-muted-foreground hover:bg-muted/50 border-l"
                  aria-label={bn ? "ডানে স্ক্রল" : "Scroll right"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Summary Grid ──────────────────────────────────────── */}
            <div className="grid border-gray-300 grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-xl border  dark:border-blue-900/30 mb-4">
              <div className="flex  items-start gap-2 text-xs">
                <Users className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground font-medium">{bn ? "পদ সংখ্যা" : "Vacancy"}</p>
                  <p className="font-semibold">{job.vacancy_count || "--"}</p>
                </div>
              </div>
              {(job.age_min || job.age_max) && (
                <div className="flex items-start gap-2 text-xs">
                  <User2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground font-medium">{bn ? "বয়স" : "Age"}</p>
                    <p className="font-semibold">
                      {job.age_min && job.age_max ? `${job.age_min} to ${job.age_max}` : job.age_min ? `${job.age_min}+` : `${bn ? "সর্বোচ্চ" : "Max"} ${job.age_max}`} {bn ? "বছর" : "years"}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground font-medium">{bn ? "কর্মস্থল" : "Location"}</p>
                  <p className="font-semibold">{job.district ? `${job.district}${job.thana ? `, ${job.thana}` : ""}` : (bn ? "যেকোনো স্থান" : "Anywhere in Bangladesh")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Banknote className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground font-medium">{bn ? "বেতন" : "Salary"}</p>
                  <p className="font-semibold text-emerald-600">
                    {job.salary_negotiable
                      ? (bn ? "আলোচনা সাপেক্ষে" : "Negotiable")
                      : (job.salary_min || job.salary_max)
                        ? `৳${(job.salary_min || 0).toLocaleString("bn-BD")}${job.salary_max ? ` - ৳${job.salary_max.toLocaleString("bn-BD")}` : ""}`
                        : (bn ? "আলোচনা সাপেক্ষে" : "Negotiable")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground font-medium">{bn ? "প্রকাশিত" : "Published"}</p>
                  <p className="font-semibold">{format(new Date(job.created_at), "dd MMM yyyy", { locale: bn ? bnLocale : undefined })}</p>
                </div>
              </div>
              {(job.experience_min > 0 || job.experience_max) && (
                <div className="flex items-start gap-2 text-xs">
                  <Briefcase className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground font-medium">{bn ? "অভিজ্ঞতা" : "Experience"}</p>
                    <p className="font-semibold">{job.experience_min}{job.experience_max ? `-${job.experience_max}` : "+"} {bn ? "বছর" : "years"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Video CV encouragement banner ────────────────────── */}
            {seekerProfile !== undefined && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                <Video className="h-4 w-4 shrink-0" />
                {bn ? <>প্রার্থীদের <strong>ভিডিও সিভি</strong> জমা দিতে উৎসাহিত করা হচ্ছে।</> : <>Applicants are encouraged to submit a <strong>Video CV</strong>.</>}
              </div>
            )}

            {/* ── Tab content ───────────────────────────────────────── */}
            <div className="rounded-xl border-gray-300 border bg-card p-5 mb-4 space-y-5">
              <div ref={allRef} className="scroll-mt-28">
                <SectionHeading>
                  {bn ? "চাকরির বিবরণ" : "Job Description"}
                </SectionHeading>
                <DescriptionBlock />
              </div>

              <div ref={requirementsRef} className="scroll-mt-28 mt-8">
                <RequirementsBlock />
              </div>

              <div ref={responsibilitiesRef} className="scroll-mt-28 mt-8">
                <ResponsibilitiesBlock />
              </div>

              <div ref={salaryRef} className="scroll-mt-28 mt-8">
                <SalaryBlock />
              </div>

              <div ref={companyRef} className="scroll-mt-28 mt-8">
                <CompanyBlock />
              </div>

              <div className="mt-8">
                <ApplicationInstructionBlock />
              </div>

              {activeTab === "requirements" && (job.requirements ? <RequirementsBlock /> : (
                <p className="text-sm text-muted-foreground">{bn ? "কোনো নির্দিষ্ট যোগ্যতা উল্লেখ নেই" : "No specific requirements listed"}</p>
              ))}
              {activeTab === "responsibilities" && <ResponsibilitiesBlock />}
              {activeTab === "salary" && <SalaryBlock />}
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {job.views_count} {bn ? "বার দেখা হয়েছে" : "views"}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applications_count} {bn ? "জন আবেদন করেছেন" : "applications"}</span>
            </div>
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

      {/* ── Fixed bottom action bar ────────────────────────────────────
          Hidden by default. Slides up into view only once the inline
          action bar above has scrolled out of the viewport, then stays
          pinned to the bottom of the screen for the rest of the scroll.
          Scrolling back up hides it again automatically. */}
      {!isExpired && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-gray-300 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
            showStickyBottomBar ? "translate-y-0" : "translate-y-full pointer-events-none"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => user ? setShowApplyModal(true) : navigate("/auth")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1 sm:flex-none h-11 sm:h-9"
              >
                <Send className="h-4 w-4" /> {bn ? "আবেদন করুন" : "Apply Now"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
                {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4" />}
                {bn ? "সংরক্ষণ" : "Save"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="h-4 w-4" /> {bn ? "শেয়ার" : "Share"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => shareTo("facebook")} className="gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareTo("linkedin")} className="gap-2">
                    <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareTo("whatsapp")} className="gap-2">
                    <Send className="h-4 w-4 text-green-600" /> WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
                    <Share2 className="h-4 w-4" /> {bn ? "লিঙ্ক কপি" : "Copy Link"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="icon" onClick={() => window.print()} className="h-9 w-9 hidden md:flex">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal — only Age & Expected Salary are collected here.
          Name, phone, email, CV, and video CV all come from the
          jobseeker's profile automatically at submit time. */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{bn ? "চাকরিতে আবেদন করুন" : "Apply for this Job"}</DialogTitle>
            <DialogDescription>
              {bn
                ? "আপনার প্রোফাইলের তথ্য ব্যবহার করে আবেদন জমা দেওয়া হবে। শুধু বয়স ও প্রত্যাশিত বেতন লিখুন।"
                : "Your application will be submitted using your profile details. Just fill in your age and expected salary."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-1">{job?.title} — {job?.company_name}</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">
                  {bn ? "বয়স (প্রোফাইল থেকে)" : "Age (from profile)"}
                </label>
                <Input
                  type="number"
                  placeholder={bn ? "বয়স" : "Age"}
                  value={applicantAge}
                  disabled
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{bn ? "প্রত্যাশিত বেতন" : "Expected Salary"}</label>
                <Input
                  type="number"
                  placeholder={bn ? "প্রত্যাশিত বেতন" : "Expected Salary"}
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleApply}
              disabled={submitting || applyMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (bn ? "জমা হচ্ছে..." : "Submitting...") : bn ? "আবেদন জমা দিন" : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
      {/* Reserves space so the fixed bottom bar never covers Footer content */}
      {/* <div className={showStickyBottomBar ? "" : "h-16 md:hidden"} /> */}
    </JobsPageTransition>
  );
};

export default JobDetail;