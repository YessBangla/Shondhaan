import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePostJob, JOB_CATEGORIES, JOB_TYPES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES } from "@/hooks/useJobData";
import { divisions } from "@/data/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAITools } from "@/hooks/useAITools";
import { toast } from "sonner";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { Briefcase, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Building2, UserCheck, SlidersHorizontal, Phone, Plus, MapPin, GraduationCap, Wallet, Award, Circle, Users, Bold, Italic, List } from "lucide-react";
const JOB_CATEGORIES_ENDPOINT = `${import.meta.env.VITE_YESSJOB_API_URL}/api/job-categories`;

const YESSJOB_API_BASE = import.meta.env.VITE_YESSJOB_API_URL;
export const EDUCATION_SUBJECTS = {
  ssc: [
    "Science",
    "Business Studies (Commerce)",
    "Humanities (Arts)",
    "Vocational",
    "Madrasah (Dakhil)",
    "Agriculture",
    "Home Economics",
    "Any Group",
    "Others"
  ],

  hsc: [
    "Science",
    "Business Studies (Commerce)",
    "Humanities (Arts)",
    "Vocational",
    "Madrasah (Alim)",
    "Agriculture",
    "Home Economics",
    "Any Group",
    "Others"
  ],

  diploma: [
    "Diploma in Computer Technology",
    "Diploma in Civil Technology",
    "Diploma in Electrical Technology",
    "Diploma in Electronics Technology",
    "Diploma in Mechanical Technology",
    "Diploma in Power Technology",
    "Diploma in Automobile Technology",
    "Diploma in Architecture Technology",
    "Diploma in Construction Technology",
    "Diploma in Textile Technology",
    "Diploma in Garments Technology",
    "Diploma in Refrigeration & Air Conditioning",
    "Diploma in Marine Technology",
    "Diploma in Mining Technology",
    "Diploma in Food Technology",
    "Diploma in Chemical Technology",
    "Diploma in Printing Technology",
    "Diploma in Agriculture Technology",
    "Diploma in Nursing",
    "Diploma in Medical Technology",
    "Diploma in Pharmacy",
    "Any Subject",
    "Others"
  ],

  bachelors: [
    "Bachelor of Accounting",
    "Bachelor of Finance",
    "Bachelor of Management",
    "Bachelor of Marketing",
    "Bachelor of Human Resource Management",
    "Bachelor of Economics",
    "Bachelor of Business Administration (BBA)",

    "Bachelor of Computer Science & Engineering (CSE)",
    "Bachelor of Software Engineering",
    "Bachelor of Information Technology",
    "Bachelor of Information Systems",

    "Bachelor of Electrical & Electronic Engineering (EEE)",
    "Bachelor of Civil Engineering",
    "Bachelor of Mechanical Engineering",
    "Bachelor of Architecture",
    "Bachelor of Chemical Engineering",
    "Bachelor of Textile Engineering",
    "Bachelor of Industrial & Production Engineering",

    "Bachelor of Law (LLB)",
    "Bachelor of English",
    "Bachelor of Bangla",

    "Bachelor of International Relations",
    "Bachelor of Public Administration",
    "Bachelor of Political Science",
    "Bachelor of Sociology",
    "Bachelor of Social Work",
    "Bachelor of Psychology",

    "Bachelor of Mathematics",
    "Bachelor of Statistics",
    "Bachelor of Physics",
    "Bachelor of Chemistry",
    "Bachelor of Biochemistry",

    "Bachelor of Pharmacy (B.Pharm)",
    "Bachelor of Nursing",
    "Bachelor of Microbiology",
    "Bachelor of Biotechnology",
    "Bachelor of Agriculture",

    "Any Subject",
    "Others"
  ],

  masters: [
    "Master of Accounting",
    "Master of Finance",
    "Master of Management",
    "Master of Marketing",
    "Master of Human Resource Management",
    "Master of Economics",

    "Master of Computer Science",
    "Master of Software Engineering",
    "Master of Information Technology",

    "Master of Electrical & Electronic Engineering",
    "Master of Civil Engineering",
    "Master of Mechanical Engineering",
    "Master of Architecture",

    "Master of Law (LLM)",
    "Master of English",
    "Master of Bangla",

    "Master of International Relations",
    "Master of Public Administration",
    "Master of Political Science",

    "Master of Mathematics",
    "Master of Statistics",
    "Master of Physics",
    "Master of Chemistry",

    "Master of Pharmacy (M.Pharm)",
    "Master of Nursing",
    "Master of Agriculture",

    "Any Subject",
    "Others"
  ],

  mba: [
    "MBA in Finance",
    "MBA in Accounting",
    "MBA in Marketing",
    "MBA in Human Resource Management (HRM)",
    "MBA in Management",
    "MBA in Supply Chain Management",
    "MBA in Operations Management",
    "MBA in International Business",
    "MBA in Banking",
    "MBA in Insurance",
    "MBA in Management Information Systems (MIS)",
    "MBA in Business Analytics",
    "MBA in Entrepreneurship",
    "MBA in Project Management",
    "MBA in Hospital Management",
    "MBA in Hotel & Tourism Management",

    "Any Major",
    "Others"
  ]
};
function getAuthHeaders() {
  const auth = getMySqlAuth();
  if (!auth?.token) return {};
  return { Authorization: `Bearer ${auth.token}` };
}
const DESCRIPTION_LIMIT = 5000;

// Curated list of common Bangladeshi job market titles for the Job Title
// autocomplete below. Purely client-side (no backend endpoint yet) — each
// entry has an English and Bangla label so the suggestion shown matches
// whatever language the form is currently in.
const JOB_TITLE_SUGGESTIONS: { en: string; bn: string }[] = [
  { en: "Software Engineer", bn: "সফটওয়্যার ইঞ্জিনিয়ার" },
  { en: "Senior Software Engineer", bn: "সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার" },
  { en: "Frontend Developer", bn: "ফ্রন্টএন্ড ডেভেলপার" },
  { en: "Backend Developer", bn: "ব্যাকএন্ড ডেভেলপার" },
  { en: "Full Stack Developer", bn: "ফুল স্ট্যাক ডেভেলপার" },
  { en: "Web Developer", bn: "ওয়েব ডেভেলপার" },
  { en: "Mobile App Developer", bn: "মোবাইল অ্যাপ ডেভেলপার" },
  { en: "QA Engineer", bn: "কিউএ ইঞ্জিনিয়ার" },
  { en: "DevOps Engineer", bn: "ডেভঅপস ইঞ্জিনিয়ার" },
  { en: "System Administrator", bn: "সিস্টেম অ্যাডমিনিস্ট্রেটর" },
  { en: "Network Engineer", bn: "নেটওয়ার্ক ইঞ্জিনিয়ার" },
  { en: "IT Officer", bn: "আইটি অফিসার" },
  { en: "IT Manager", bn: "আইটি ম্যানেজার" },
  { en: "Data Analyst", bn: "ডাটা অ্যানালিস্ট" },
  { en: "Data Scientist", bn: "ডাটা সায়েন্টিস্ট" },
  { en: "Database Administrator", bn: "ডাটাবেজ অ্যাডমিনিস্ট্রেটর" },
  { en: "UI/UX Designer", bn: "ইউআই/ইউএক্স ডিজাইনার" },
  { en: "Graphic Designer", bn: "গ্রাফিক ডিজাইনার" },
  { en: "Product Manager", bn: "প্রোডাক্ট ম্যানেজার" },
  { en: "Project Manager", bn: "প্রজেক্ট ম্যানেজার" },
  { en: "Business Analyst", bn: "বিজনেস অ্যানালিস্ট" },
  { en: "Digital Marketing Executive", bn: "ডিজিটাল মার্কেটিং এক্সিকিউটিভ" },
  { en: "SEO Executive", bn: "এসইও এক্সিকিউটিভ" },
  { en: "Content Writer", bn: "কন্টেন্ট রাইটার" },
  { en: "Social Media Executive", bn: "সোশ্যাল মিডিয়া এক্সিকিউটিভ" },
  { en: "Marketing Executive", bn: "মার্কেটিং এক্সিকিউটিভ" },
  { en: "Marketing Manager", bn: "মার্কেটিং ম্যানেজার" },
  { en: "Brand Manager", bn: "ব্র্যান্ড ম্যানেজার" },
  { en: "Sales Executive", bn: "সেলস এক্সিকিউটিভ" },
  { en: "Sales Officer", bn: "সেলস অফিসার" },
  { en: "Sales Manager", bn: "সেলস ম্যানেজার" },
  { en: "Business Development Executive", bn: "বিজনেস ডেভেলপমেন্ট এক্সিকিউটিভ" },
  { en: "Business Development Manager", bn: "বিজনেস ডেভেলপমেন্ট ম্যানেজার" },
  { en: "Customer Service Representative", bn: "কাস্টমার সার্ভিস রিপ্রেজেন্টেটিভ" },
  { en: "Call Center Agent", bn: "কল সেন্টার এজেন্ট" },
  { en: "Accountant", bn: "হিসাবরক্ষক" },
  { en: "Senior Accountant", bn: "সিনিয়র হিসাবরক্ষক" },
  { en: "Accounts Officer", bn: "অ্যাকাউন্টস অফিসার" },
  { en: "Finance Manager", bn: "ফিন্যান্স ম্যানেজার" },
  { en: "Finance Officer", bn: "ফিন্যান্স অফিসার" },
  { en: "Audit Officer", bn: "অডিট অফিসার" },
  { en: "Tax Consultant", bn: "ট্যাক্স কনসালট্যান্ট" },
  { en: "HR Executive", bn: "এইচআর এক্সিকিউটিভ" },
  { en: "HR Officer", bn: "এইচআর অফিসার" },
  { en: "HR Manager", bn: "এইচআর ম্যানেজার" },
  { en: "Recruitment Specialist", bn: "রিক্রুটমেন্ট স্পেশালিস্ট" },
  { en: "Admin Officer", bn: "অ্যাডমিন অফিসার" },
  { en: "Office Executive", bn: "অফিস এক্সিকিউটিভ" },
  { en: "Office Assistant", bn: "অফিস সহকারী" },
  { en: "Receptionist", bn: "রিসেপশনিস্ট" },
  { en: "Executive Assistant", bn: "এক্সিকিউটিভ অ্যাসিস্ট্যান্ট" },
  { en: "Personal Assistant", bn: "পার্সোনাল অ্যাসিস্ট্যান্ট" },
  { en: "Store Manager", bn: "স্টোর ম্যানেজার" },
  { en: "Store Keeper", bn: "স্টোর কিপার" },
  { en: "Warehouse Officer", bn: "ওয়্যারহাউজ অফিসার" },
  { en: "Logistics Officer", bn: "লজিস্টিকস অফিসার" },
  { en: "Supply Chain Officer", bn: "সাপ্লাই চেইন অফিসার" },
  { en: "Procurement Officer", bn: "প্রকিউরমেন্ট অফিসার" },
  { en: "Production Manager", bn: "প্রোডাকশন ম্যানেজার" },
  { en: "Production Officer", bn: "প্রোডাকশন অফিসার" },
  { en: "Quality Control Officer", bn: "কোয়ালিটি কন্ট্রোল অফিসার" },
  { en: "Merchandiser", bn: "মার্চেন্ডাইজার" },
  { en: "Garments Merchandiser", bn: "গার্মেন্টস মার্চেন্ডাইজার" },
  { en: "Industrial Engineer", bn: "ইন্ডাস্ট্রিয়াল ইঞ্জিনিয়ার" },
  { en: "Civil Engineer", bn: "সিভিল ইঞ্জিনিয়ার" },
  { en: "Electrical Engineer", bn: "ইলেকট্রিক্যাল ইঞ্জিনিয়ার" },
  { en: "Mechanical Engineer", bn: "মেকানিক্যাল ইঞ্জিনিয়ার" },
  { en: "Site Engineer", bn: "সাইট ইঞ্জিনিয়ার" },
  { en: "Architect", bn: "স্থপতি" },
  { en: "Teacher", bn: "শিক্ষক" },
  { en: "Lecturer", bn: "প্রভাষক" },
  { en: "Trainer", bn: "প্রশিক্ষক" },
  { en: "Doctor", bn: "ডাক্তার" },
  { en: "Nurse", bn: "নার্স" },
  { en: "Pharmacist", bn: "ফার্মাসিস্ট" },
  { en: "Medical Officer", bn: "মেডিকেল অফিসার" },
  { en: "Lab Technician", bn: "ল্যাব টেকনিশিয়ান" },
  { en: "Driver", bn: "ড্রাইভার" },
  { en: "Security Guard", bn: "নিরাপত্তা প্রহরী" },
  { en: "Cleaner", bn: "পরিচ্ছন্নতাকর্মী" },
  { en: "Cook / Chef", bn: "বাবুর্চি / শেফ" },
  { en: "Waiter", bn: "ওয়েটার" },
  { en: "Delivery Man", bn: "ডেলিভারি ম্যান" },
  { en: "Field Officer", bn: "ফিল্ড অফিসার" },
  { en: "Program Officer", bn: "প্রোগ্রাম অফিসার" },
  { en: "Project Coordinator", bn: "প্রজেক্ট কোঅর্ডিনেটর" },
  { en: "Monitoring & Evaluation Officer", bn: "মনিটরিং অ্যান্ড ইভালুয়েশন অফিসার" },
  { en: "Branch Manager", bn: "শাখা ব্যবস্থাপক" },
  { en: "Relationship Manager", bn: "রিলেশনশিপ ম্যানেজার" },
  { en: "Credit Officer", bn: "ক্রেডিট অফিসার" },
  { en: "Loan Officer", bn: "লোন অফিসার" },
  { en: "Cash Officer", bn: "ক্যাশ অফিসার" },
  { en: "Legal Officer", bn: "লিগ্যাল অফিসার" },
  { en: "Company Secretary", bn: "কোম্পানি সেক্রেটারি" },
  { en: "General Manager", bn: "জেনারেল ম্যানেজার" },
  { en: "Assistant Manager", bn: "সহকারী ব্যবস্থাপক" },
  { en: "Deputy Manager", bn: "উপ-ব্যবস্থাপক" },
  { en: "Chief Executive Officer (CEO)", bn: "প্রধান নির্বাহী কর্মকর্তা (সিইও)" },
  { en: "Chief Financial Officer (CFO)", bn: "প্রধান আর্থিক কর্মকর্তা (সিএফও)" },
  { en: "Chief Technology Officer (CTO)", bn: "প্রধান প্রযুক্তি কর্মকর্তা (সিটিও)" },
  { en: "Intern", bn: "ইন্টার্ন" },
  { en: "Trainee", bn: "ট্রেইনি" },
];

function stripHtmlToText(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

// Job Title input with a lightweight, client-side autocomplete dropdown.
// Filters JOB_TITLE_SUGGESTIONS against whatever's typed (matching either
// language, so a Bangla-UI user typing in English still gets hits), shows
// up to 6 results, and fills the field on click. Closes on blur (with a
// short delay so the click on a suggestion registers before the dropdown
// unmounts) and on Escape.
function JobTitleAutocomplete({
  value,
  onChange,
  placeholder,
  bn,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  bn: boolean;
}) {
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const suggestions = query
    ? JOB_TITLE_SUGGESTIONS.filter(
        (s) => s.en.toLowerCase().includes(query) || s.bn.includes(value.trim())
      ).slice(0, 6)
    : [];

  const selectSuggestion = (s: { en: string; bn: string }) => {
    onChange(bn ? s.bn : s.en);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        className="h-9 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim() && setOpen(true)}
        onBlur={() => {
          // Delay so a click on a suggestion fires before we close the list
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.en}
              type="button"
              // onMouseDown (not onClick) fires before the input's onBlur,
              // so the value is set reliably even though blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{bn ? s.bn : s.en}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Uncontrolled-DOM rich text editor. The contentEditable div's innerHTML is
// NOT bound via dangerouslySetInnerHTML on every render — that was the bug:
// each keystroke triggered onChange -> parent re-render -> React re-applies
// dangerouslySetInnerHTML -> the div's content gets reset and the browser
// puts the caret back at position 0, so every next character you typed
// landed *before* the previous one (looked like typing backwards).
//
// Instead we only touch editorRef.current.innerHTML imperatively, and only
// when `value` changed for a reason OTHER than our own onInput handler
// (e.g. the "AI Write" button replacing the whole description, or the
// parent resetting the form after submit). We detect "external" changes by
// comparing the incoming value to what the DOM currently holds — if they
// already match (because onInput just set state to this exact value),
// we skip touching the DOM and the caret stays put.
function RichTextArea({
  value,
  onChange,
  placeholder,
  maxLength = DESCRIPTION_LIMIT,
  bn,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  maxLength?: number;
  bn: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isEmpty, setIsEmpty] = useState(stripHtmlToText(value).length === 0);
  const [charCount, setCharCount] = useState(stripHtmlToText(value).length);
  const overLimit = charCount > maxLength;

  // Sync DOM <- value, but only when the change came from outside (AI Write,
  // form reset, etc). If the DOM already shows this exact HTML — which is
  // the case right after the user's own typing triggered onChange — do
  // nothing, so the caret/selection is left completely alone.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
    setIsEmpty(stripHtmlToText(value).length === 0);
    setCharCount(stripHtmlToText(value).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const updateActiveFormats = () => {
    const next = new Set<string>();
    if (document.queryCommandState("bold")) next.add("bold");
    if (document.queryCommandState("italic")) next.add("italic");
    if (document.queryCommandState("insertUnorderedList")) next.add("list");
    setActiveFormats(next);
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || "";
    setIsEmpty(stripHtmlToText(html).length === 0);
    setCharCount(stripHtmlToText(html).length);
    onChange(html);
  };

  const exec = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleInput();
    updateActiveFormats();
  };

  const toolbarBtn = (command: string, key: string, Icon: typeof Bold, label: string) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor focus/selection intact
      onClick={() => exec(command)}
      title={label}
      className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors ${
        activeFormats.has(key)
          ? "bg-primary border-primary text-white"
          : "bg-background border-transparent text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5 rounded-lg border bg-muted/30 p-1 w-fit">
        {toolbarBtn("bold", "bold", Bold, bn ? "বোল্ড" : "Bold")}
        {toolbarBtn("italic", "italic", Italic, bn ? "ইটালিক" : "Italic")}
        {toolbarBtn("insertUnorderedList", "list", List, bn ? "বুলেট পয়েন্ট" : "Bullet points")}
      </div>

    <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseUp={updateActiveFormats}
          onKeyUp={updateActiveFormats}
          className={`rich-editor-content min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            overLimit ? "border-red-400" : ""
          }`}
        />
      </div>

      <p className={`text-[10px] mt-1 text-right ${overLimit ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
        {charCount} / {maxLength} {bn ? "অক্ষর" : "characters"}
        {overLimit && (bn ? " — সীমা অতিক্রম করেছে" : " — over limit")}
      </p>
    </div>
  );
}
const JobPostForm = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bn = language === "bn";
  const postJob = usePostJob();
  const { generateDescription, loading: aiLoading } = useAITools();

  // Fetch categories from the backend so this dropdown always matches
  // job_categories in the DB (same pattern as JobHome.tsx). Falls back to
  // the static JOB_CATEGORIES only while loading or if the fetch fails.
  const { data: fetchedCategories } = useQuery({
    queryKey: ["job-categories"],
    queryFn: async () => {
      const res = await fetch(JOB_CATEGORIES_ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load job categories (${res.status})`);
      const json = await res.json();
      const rows = json?.categories ?? [];
      return rows.map((r: any) => ({
        value: String(r.value),
        labelBn: String(r.label_bn ?? r.labelBn ?? ""),
        labelEn: String(r.label_en ?? r.labelEn ?? ""),
      }));
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const categories = fetchedCategories && fetchedCategories.length > 0 ? fetchedCategories : JOB_CATEGORIES;

  // Company name now comes from the employer's own employer_profiles row
  // (routes/employerProfile.js -> GET /api/employer-profile/me), the same
  // profile set up in EmployerPanel.tsx, instead of being typed fresh on
  // every job post. This keeps every job posting tied to one verified
  // company name per employer account rather than letting it drift.
  const { data: employerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["employer-profile-me"],
    queryFn: async () => {
      const res = await fetch(`${YESSJOB_API_BASE}/api/employer-profile/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null; // no profile yet — fall back to manual entry below
      return res.json();
    },
    enabled: !!user,
  });

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [applicationInstruction, setApplicationInstruction] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [vacancyNo, setVacancyNo] = useState("1");
  const [category, setCategory] = useState("general");
  const [companyType, setCompanyType] = useState("private");
  const [educationRequired, setEducationRequired] = useState("any");
  const [genderPreference, setGenderPreference] = useState("any");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [vacancy, setVacancy] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Job Information — extra fields matching the bdjobs reference (workplace
  // type, and whether salary is shown publicly on the post)
  const [workFromOffice, setWorkFromOffice] = useState(true);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [salaryHidden, setSalaryHidden] = useState(false);

  // Candidate Requirements — extra fields matching the bdjobs reference
  const [hideGenderAgeSection, setHideGenderAgeSection] = useState(false);
  const [preferredInstitution, setPreferredInstitution] = useState("");
  const [showInstitutionInput, setShowInstitutionInput] = useState(false);
  const [certifications, setCertifications] = useState("");
  const [showCertificationInput, setShowCertificationInput] = useState(false);
  const [experienceRequired, setExperienceRequired] = useState(false);
  const [preferVideoResume, setPreferVideoResume] = useState(false);
  const [additionalRequirements, setAdditionalRequirements] = useState("");

  // Education subject/major — depends on educationRequired (the degree
  // level selected above). Lives here (not inside RichTextArea) since it's
  // rendered in this component's JSX.
  const [educationSubject, setEducationSubject] = useState("");
  const [otherSubject, setOtherSubject] = useState("");
  const subjectOptions =
    EDUCATION_SUBJECTS[educationRequired as keyof typeof EDUCATION_SUBJECTS];

  // Reset subject choice whenever the degree level changes, since subject
  // lists differ per level (e.g. switching bachelor -> ssc shouldn't leave
  // a bachelor-only subject selected).
  useEffect(() => {
    setEducationSubject("");
    setOtherSubject("");
  }, [educationRequired]);

  // Matching & Restrictions (step 3)
  const [industryExperience, setIndustryExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [showIndustryInput, setShowIndustryInput] = useState(false);
  const [showSkillsInput, setShowSkillsInput] = useState(false);
  const [ageRestrict, setAgeRestrict] = useState(false);
  const [genderRestrict, setGenderRestrict] = useState(false);

  // Billing & Contact (step 4)
  const [billingContactName, setBillingContactName] = useState("");
  const [billingDesignation, setBillingDesignation] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingMobile, setBillingMobile] = useState("");
  const [hrContactName, setHrContactName] = useState("");
  const [hrDesignation, setHrDesignation] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrMobile, setHrMobile] = useState("");

  // Once the employer profile loads, fill company name (and company type,
  // since employer_profiles has that too) from it. Also prefill contact
  // info as a convenience — still editable per-posting since a specific
  // job ad might want a different contact person/phone than the company
  // profile default.
  useEffect(() => {
    if (!employerProfile) return;
    setCompanyName(employerProfile.company_name || "");
    if (employerProfile.company_type) setCompanyType(employerProfile.company_type);
    if (!contactPhone && employerProfile.contact_phone) setContactPhone(employerProfile.contact_phone);
    if (!contactEmail && employerProfile.contact_email) setContactEmail(employerProfile.contact_email);
    if (!billingEmail && employerProfile.contact_email) setBillingEmail(employerProfile.contact_email);
    if (!billingMobile && employerProfile.contact_phone) setBillingMobile(employerProfile.contact_phone);
    if (!hrEmail && employerProfile.contact_email) setHrEmail(employerProfile.contact_email);
    if (!hrMobile && employerProfile.contact_phone) setHrMobile(employerProfile.contact_phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerProfile]);

  const hasCompanyProfile = !!employerProfile?.company_name;

  const selectedDivision = divisions.find((d) => d.name === division);
  const districtList = selectedDivision?.districts || [];

  // Step 1 (Job Information) bundles: basic info, description, salary,
  // workplace and contact — everything needed to actually publish a post.
  const step1Done = title.trim() !== "" && companyName.trim() !== "" && description.trim() !== "";
  // Step 2 (Candidate Requirements) is all optional, so it lights up as
  // soon as the employer has specified any preference.
  const step2Done =
    educationRequired !== "any" ||
    genderPreference !== "any" ||
    ageMin !== "" ||
    ageMax !== "" ||
    expMin !== "" ||
    expMax !== "";
  // Step 3 (Matching & Restrictions): done once the employer has engaged
  // with at least one matching criterion or restriction toggle.
  const matchingCriteria = [
    { key: "experience", label: bn ? "মোট অভিজ্ঞতা" : "Total Year of Experience", done: expMin !== "" || expMax !== "", icon: Briefcase, gotoStep: 1 },
    { key: "location", label: bn ? "কর্মস্থল" : "Location", done: division !== "", icon: MapPin, gotoStep: 0 },
    { key: "industryExperience", label: bn ? "শিল্প অভিজ্ঞতা" : "Industry Experience", done: industryExperience.trim() !== "", icon: Users, inline: true },
    { key: "education", label: bn ? "শিক্ষাগত যোগ্যতা" : "Education", done: educationRequired !== "any", icon: GraduationCap, gotoStep: 1 },
    { key: "skills", label: bn ? "দক্ষতা" : "Skills & Expertise", done: skills.trim() !== "", icon: Award, inline: true },
    { key: "salary", label: bn ? "বেতন" : "Salary", done: salaryMin !== "" || salaryMax !== "" || salaryNegotiable, icon: Wallet, gotoStep: 0 },
  ];
  const matchDoneCount = matchingCriteria.filter((c) => c.done).length;
  const matchingStrength = matchDoneCount <= 2 ? "low" : matchDoneCount <= 4 ? "medium" : "high";
  const step3Done = matchDoneCount > 0 || ageRestrict || genderRestrict;

  // Step 4 (Billing & Contact): done once any billing or HR contact field is filled.
  const step4Done =
    billingContactName.trim() !== "" ||
    billingDesignation.trim() !== "" ||
    billingEmail.trim() !== "" ||
    billingMobile.trim() !== "" ||
    hrContactName.trim() !== "" ||
    hrDesignation.trim() !== "" ||
    hrEmail.trim() !== "" ||
    hrMobile.trim() !== "";

  const steps = [
    { label: bn ? "চাকরির তথ্য" : "Job Information", icon: Briefcase, done: step1Done },
    { label: bn ? "প্রার্থীর যোগ্যতা" : "Candidate Requirements", icon: UserCheck, done: step2Done },
    { label: bn ? "ম্যাচিং ও বিধিনিষেধ" : "Matching & Restrictions", icon: SlidersHorizontal, done: step3Done },
    { label: bn ? "বিলিং ও যোগাযোগ" : "Billing & Contact", icon: Phone, done: step4Done },
  ];

  if (!user) { navigate("/login"); return null; }

  const handleAIDescription = async () => {
    if (!title.trim()) { toast.error(bn ? "প্রথমে পদের নাম লিখুন" : "Enter job title first"); return; }
    const result = await generateDescription(title, category, "new");
    if (result) setDescription(result);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !companyName.trim() || !description.trim()) {
      toast.error(bn ? "পদের নাম, প্রতিষ্ঠান ও বিবরণ আবশ্যক" : "Title, company & description required");
      setCurrentStep(0);
      return;
    }

    const resolvedSubject =
      educationSubject === "Others" ? (otherSubject || null) : (educationSubject || null);

    await postJob.mutateAsync({
      title,
      company_name: companyName,
      description,
      requirements: requirements || null,
      benefits: benefits || null,
      application_instruction: applicationInstruction || null,
      job_type: jobType,
      category,
      company_type: companyType,
      education_required: educationRequired !== "any" ? educationRequired : null,
      education_subject: resolvedSubject,
      gender_preference: genderRestrict ? genderPreference : "any",
      gender_restrict: genderRestrict,
      age_min: ageRestrict && ageMin ? parseInt(ageMin) : null,
      age_max: ageRestrict && ageMax ? parseInt(ageMax) : null,
      age_restrict: ageRestrict,
      experience_min: parseInt(expMin) || 0,
      experience_max: expMax ? parseInt(expMax) : null,
      industry_experience: industryExperience || null,
      skills: skills || null,
      salary_min: salaryMin ? parseFloat(salaryMin) : null,
      salary_max: salaryMax ? parseFloat(salaryMax) : null,
      salary_negotiable: salaryNegotiable,
      salary_hidden: salaryHidden,
      work_from_office: workFromOffice,
      work_from_home: workFromHome,
      division: division || null,
      district: district || null,
      address: address || null,
      vacancy_count: parseInt(vacancy) || 1,
      deadline: deadline || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      preferred_institution: preferredInstitution || null,
      certifications: certifications || null,
      experience_required: experienceRequired,
      prefer_video_resume: preferVideoResume,
      additional_requirements: additionalRequirements || null,
      billing_contact_name: billingContactName || null,
      billing_designation: billingDesignation || null,
      billing_email: billingEmail || null,
      billing_mobile: billingMobile || null,
      hr_contact_name: hrContactName || null,
      hr_designation: hrDesignation || null,
      hr_email: hrEmail || null,
      hr_mobile: hrMobile || null,
    } as any);

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <JobsPageTransition>
        <Navbar />
        <JobsMenuBar />

        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{bn ? "বিজ্ঞাপন জমা হয়েছে!" : "Job Posted!"}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {bn ? "আপনার চাকরির বিজ্ঞাপন অ্যাডমিনের অনুমোদনের পর প্রকাশিত হবে।" : "Your job posting will be published after admin approval."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/jobs")}>{bn ? "চাকরি দেখুন" : "Browse Jobs"}</Button>
            <Button onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); setCurrentStep(0); }} className="bg-primary hover:bg-primary">
              {bn ? "আরেকটি দিন" : "Post Another"}
            </Button>
          </div>
        </div>
        <Footer />
      </JobsPageTransition>
    );
  }

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <JobsPageTransition>
      <Navbar />
      {/* <JobsMenuBar /> */}

      <div className="mx-auto max-w-7xl px-1 mt-12 md:mt-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-4 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> {bn ? "সন্ধান জব" : "Shondhaan Jobs"}
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-2.5">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{bn ? "চাকরির বিজ্ঞাপন দিন" : "Post a Job on Shondhaan Jobs"}</h1>
            <p className="text-xs text-muted-foreground">{bn ? "অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে • বিনামূল্যে!" : "Will be published after admin approval • Free!"}</p>
          </div>
        </div>

        {/* Step indicator — click any step to jump to it */}
        <div className="flex items-center justify-between mb-5 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => setCurrentStep(i)}
                className="flex flex-col items-center gap-1.5 min-w-[70px]"
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    step.done ? "bg-green-500" : currentStep === i ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <step.icon className="h-5 w-5 text-white" />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide text-center leading-tight ${
                    step.done ? "text-green-600" : currentStep === i ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-2 shrink-0 self-start mt-5" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {/* STEP 1: Job Information — basic info, description, salary, workplace, contact */}
          {currentStep === 0 && (
            <>
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "মৌলিক তথ্য" : "Basic Information"}</h3>

                <div className="grid grid-row-3 md:grid-cols-3 gap-2 items-start">
                  <JobTitleAutocomplete
                    value={title}
                    onChange={setTitle}
                    placeholder={bn ? "পদের নাম / পদবি *" : "Job Title / Position *"}
                    bn={bn}
                  />

                 
                  {profileLoading ? (
                    <div className="h-10 rounded-lg border bg-muted/40 animate-pulse" />
                  ) : hasCompanyProfile ? (
                    <div>
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 h-9">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{companyName}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {bn
                          ? "কোম্পানি প্রোফাইল থেকে নেওয়া হয়েছে। পরিবর্তন করতে হলে এমপ্লয়ার প্যানেলের \"কোম্পানি প্রোফাইল\" থেকে করুন।"
                          : "Pulled from your company profile. To change it, edit it in Employer Panel → Company Profile."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Input className="h-9 text-sm" placeholder={bn ? "প্রতিষ্ঠানের নাম *" : "Company / Organization Name *"} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {bn
                          ? "আপনার এখনো কোম্পানি প্রোফাইল সেট আপ নেই — এমপ্লয়ার প্যানেলে গিয়ে একবার সেট আপ করলে এই নামটি এখানে স্বয়ংক্রিয়ভাবে আসবে।"
                          : "You haven't set up a company profile yet — set one up in the Employer Panel and this will auto-fill next time."}
                      </p>
                    </div>
                  )}
                  
                  <Input className="h-9 text-sm" placeholder={bn ? "পদ সংখ্যা" : "Vacancy No "} value={vacancyNo} onChange={(e) => setVacancyNo(e.target.value)} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "চাকরির ধরন" : "Job Type"}</label>
                    <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                      {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{bn ? t.labelBn : t.labelEn}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "ক্যাটেগরি" : "Category"}</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                      {categories.map((c) => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "প্রতিষ্ঠানের ধরন" : "Company Type"}</label>
                    <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                      {COMPANY_TYPES.map((c) => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-primary">{bn ? "বিবরণ" : "Job Description"}</h3>
                  <Button variant="outline" size="sm" onClick={handleAIDescription} disabled={aiLoading} className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> {bn ? "AI দিয়ে লিখুন" : "AI Write"}
                  </Button>
                </div>
                <RichTextArea
                  value={description}
                  onChange={setDescription}
                  placeholder={bn ? "চাকরির দায়িত্ব ও বিস্তারিত বিবরণ *" : "Job responsibilities & detailed description *"}
                  maxLength={DESCRIPTION_LIMIT}
                  bn={bn}
                />
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-primary">{bn ? "বেতন" : "Salary"}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{bn ? "প্রকাশ্যে দেখান" : "Show publicly"}</span>
                    <button
                      type="button"
                      onClick={() => setSalaryHidden(!salaryHidden)}
                      className={`h-5 w-9 rounded-full relative transition-colors ${!salaryHidden ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${!salaryHidden ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বনিম্ন বেতন (মাসিক)" : "Min Salary (Monthly)"} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                  <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বোচ্চ বেতন (মাসিক)" : "Max Salary (Monthly)"} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={salaryNegotiable} onChange={(e) => setSalaryNegotiable(e.target.checked)} className="rounded" />
                  {bn ? "বেতন আলোচনা সাপেক্ষে" : "Salary Negotiable"}
                </label>
                {salaryHidden && (
                  <p className="text-[10px] text-muted-foreground">
                    {bn ? "বেতন প্রার্থীদের কাছে দেখানো হবে না, শুধু \"আলোচনা সাপেক্ষে\" দেখাবে।" : "Salary won't be shown to candidates — the post will just say \"negotiable\"."}
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-sm text-primary">{bn ? "কর্মস্থল" : "Workplace"}</h3>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={workFromOffice} onChange={(e) => setWorkFromOffice(e.target.checked)} className="rounded" />
                      {bn ? "অফিস থেকে কাজ" : "Work From Office"}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={workFromHome} onChange={(e) => setWorkFromHome(e.target.checked)} className="rounded" />
                      {bn ? "বাসা থেকে কাজ" : "Work From Home"}
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={division} onChange={(e) => { setDivision(e.target.value); setDistrict(""); }} className="rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                    <option value="">{bn ? "বিভাগ নির্বাচন করুন" : "Select Division"}</option>
                    {divisions.map((d) => <option key={d.name} value={d.name}>{bn ? d.nameBn : d.name}</option>)}
                  </select>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className="rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                    <option value="">{bn ? "জেলা নির্বাচন করুন" : "Select District"}</option>
                    {districtList.map((d) => <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-9 text-sm" placeholder={bn ? "সম্পূর্ণ ঠিকানা (ঐচ্ছিক)" : "Full Address (optional)"} value={address} onChange={(e) => setAddress(e.target.value)} />
                  <Input className="h-9 text-sm" type="number" placeholder={bn ? "পদ সংখ্যা" : "Number of Vacancies"} value={vacancy} onChange={(e) => setVacancy(e.target.value)} />
                  <Input className="h-9 text-sm" type="date" placeholder={bn ? "আবেদনের শেষ তারিখ" : "Application Deadline"} value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "যোগাযোগের তথ্য" : "Contact Information"}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-9 text-sm" placeholder={bn ? "মোবাইল নম্বর" : "Phone Number"} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  <Input className="h-9 text-sm" placeholder={bn ? "ইমেইল ঠিকানা" : "Email Address"} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Candidate Requirements */}
          {currentStep === 1 && (
            <>
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-primary">{bn ? "প্রার্থীর যোগ্যতা" : "Candidate Requirements"}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHideGenderAgeSection(!hideGenderAgeSection)}
                      className={`h-5 w-9 rounded-full relative transition-colors ${!hideGenderAgeSection ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${!hideGenderAgeSection ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-[11px] text-muted-foreground">{bn ? "গোপন করুন" : "Hide"}</span>
                  </div>
                </div>

                {!hideGenderAgeSection && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "পছন্দের লিঙ্গ" : "Preferred Gender"}</label>
                      <select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                        {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{bn ? g.labelBn : g.labelEn}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "বয়স" : "Age"}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বনিম্ন বয়স" : "Minimum age"} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                        <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বোচ্চ বয়স" : "Maximum age"} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "শিক্ষাগত যোগ্যতা" : "Educational Qualification"}</h3>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "ডিগ্রি (সর্বোচ্চ ৫)" : "Degree (Max 5)"}</label>
                  <select value={educationRequired} onChange={(e) => setEducationRequired(e.target.value)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9">
                    {EDUCATION_LEVELS.map((e) => <option key={e.value} value={e.value}>{bn ? e.labelBn : e.labelEn}</option>)}
                  </select>
                </div>

                {subjectOptions && (
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">
                      {bn ? "বিষয় / গ্রুপ / মেজর" : "Subject / Group / Major"}
                    </label>
                    <select
                      value={educationSubject}
                      onChange={(e) => setEducationSubject(e.target.value)}
                      className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm h-9"
                    >
                      <option value="">{bn ? "নির্বাচন করুন" : "Select"}</option>
                      {subjectOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    {educationSubject === "Others" && (
                      <Input
                        className="h-9 text-sm mt-2"
                        placeholder={bn ? "বিষয়ের নাম লিখুন" : "Enter subject name"}
                        value={otherSubject}
                        onChange={(e) => setOtherSubject(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {showInstitutionInput || preferredInstitution ? (
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "পছন্দের শিক্ষা প্রতিষ্ঠান" : "Preferred Educational Institution"}</label>
                    <Input className="h-9 text-sm" placeholder={bn ? "শিক্ষা প্রতিষ্ঠানের নাম" : "e.g. Dhaka University, BUET"} value={preferredInstitution} onChange={(e) => setPreferredInstitution(e.target.value)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowInstitutionInput(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> {bn ? "পছন্দের শিক্ষা প্রতিষ্ঠান যোগ করুন" : "Add Preferred Educational Institution"}
                  </button>
                )}

                {showCertificationInput || certifications ? (
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "পেশাগত সনদ / প্রশিক্ষণ / অন্যান্য" : "Professional Certification / Training / Others"}</label>
                    <Input className="h-9 text-sm" placeholder={bn ? "যেমন: PMP, Six Sigma" : "e.g. PMP, Six Sigma"} value={certifications} onChange={(e) => setCertifications(e.target.value)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCertificationInput(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> {bn ? "পেশাগত সনদ / প্রশিক্ষণ / অন্যান্য যোগ করুন" : "Add Professional Certification / Training / Others"}
                  </button>
                )}
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "অভিজ্ঞতা ও ব্যবসায়িক ক্ষেত্র" : "Experience & Business Area"}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExperienceRequired(false)}
                    className={`h-9 rounded-lg text-sm font-medium border transition-colors ${
                      !experienceRequired ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {bn ? "অভিজ্ঞতা প্রয়োজন নেই" : "No Experience Required"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExperienceRequired(true)}
                    className={`h-9 rounded-lg text-sm font-medium border transition-colors ${
                      experienceRequired ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {bn ? "অভিজ্ঞতা প্রয়োজন" : "Experience Required"}
                  </button>
                </div>
                {experienceRequired && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বনিম্ন অভিজ্ঞতা (বছর)" : "Min Experience (yrs)"} value={expMin} onChange={(e) => setExpMin(e.target.value)} />
                    <Input className="h-9 text-sm" type="number" placeholder={bn ? "সর্বোচ্চ অভিজ্ঞতা (বছর)" : "Max Experience (yrs)"} value={expMax} onChange={(e) => setExpMax(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "দক্ষতা ও বিশেষজ্ঞতা (সর্বোচ্চ ১০)" : "Skills & Area of Expertise (Max 10)"}</h3>
                <Input className="h-9 text-sm" placeholder={bn ? "দক্ষতা ও বিশেষজ্ঞতা যোগ করুন" : "Add Skills and Expertise"} value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-primary">{bn ? "অতিরিক্ত প্রয়োজনীয়তা" : "Additional Requirements"}</h3>
                  <label className="flex items-center gap-2 text-xs">
                    {bn ? "ভিডিও রিজিউম পছন্দ করুন" : "Prefer Video Resume"}
                    <button
                      type="button"
                      onClick={() => setPreferVideoResume(!preferVideoResume)}
                      className={`h-5 w-9 rounded-full relative transition-colors ${preferVideoResume ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${preferVideoResume ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                </div>
                <Textarea
                  placeholder={bn ? "যেমন: এই ক্ষেত্রে অভিজ্ঞদের অগ্রাধিকার দেওয়া হবে। ফ্রেশারদেরও আবেদন করতে উৎসাহিত করা হচ্ছে।" : "e.g. Priority will be given to those experienced in this field. Freshers are also encouraged to apply."}
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* STEP 3: Matching & Restrictions */}
          {currentStep === 2 && (
            <>
              <div className="rounded-xl border bg-card p-3 space-y-3">
                <h3 className="font-semibold text-sm text-primary">{bn ? "আবেদনকারী ম্যাচিং" : "Applicant Matching"}</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="36" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8" fill="none" />
                      <circle
                        cx="44" cy="44" r="36" fill="none" strokeWidth="8" strokeLinecap="round"
                        stroke="currentColor"
                        className={matchingStrength === "high" ? "text-green-500" : matchingStrength === "medium" ? "text-amber-500" : "text-red-400"}
                        strokeDasharray={`${(matchDoneCount / 6) * 226} 226`}
                        transform="rotate(-90 44 44)"
                      />
                      <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="700" className="fill-foreground">{matchDoneCount}/6</text>
                    </svg>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        matchingStrength === "high"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : matchingStrength === "medium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {bn
                        ? matchingStrength === "high" ? "উচ্চ ম্যাচিং" : matchingStrength === "medium" ? "মাঝারি ম্যাচিং" : "কম ম্যাচিং"
                        : `${matchingStrength.charAt(0).toUpperCase()}${matchingStrength.slice(1)} Matching`}
                    </span>
                  </div>

                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingCriteria.map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={`truncate ${c.done ? "" : "text-muted-foreground"}`}>{c.label}</span>
                        </div>
                        {!c.done && (
                          <button
                            type="button"
                            onClick={() => {
                              if (c.key === "industryExperience") setShowIndustryInput(true);
                              else if (c.key === "skills") setShowSkillsInput(true);
                              else if (c.gotoStep !== undefined) setCurrentStep(c.gotoStep);
                            }}
                            className="flex items-center gap-0.5 text-primary font-semibold shrink-0"
                          >
                            <Plus className="h-3 w-3" /> {bn ? "যোগ" : "Add"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(showIndustryInput || industryExperience) && (
                  <Input
                    className="h-9 text-sm"
                    placeholder={bn ? "শিল্প অভিজ্ঞতা (যেমন: ব্যাংকিং, ৩ বছর)" : "Industry experience (e.g. Banking, 3 years)"}
                    value={industryExperience}
                    onChange={(e) => setIndustryExperience(e.target.value)}
                  />
                )}
                {(showSkillsInput || skills) && (
                  <Input
                    className="h-9 text-sm"
                    placeholder={bn ? "দক্ষতা (কমা দিয়ে আলাদা করুন)" : "Skills & expertise (comma separated)"}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                )}
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-3">
                <h3 className="font-semibold text-sm text-primary">{bn ? "আবেদনকারী বিধিনিষেধ" : "Applicant Restriction"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Age restriction */}
                  <div className="rounded-lg border p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{bn ? "বয়স" : "Age"}</span>
                      <button
                        type="button"
                        onClick={() => setAgeRestrict(!ageRestrict)}
                        className={`h-5 w-9 rounded-full relative transition-colors ${ageRestrict ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${ageRestrict ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input className="h-8 text-xs" type="number" placeholder={bn ? "সর্বনিম্ন" : "Min"} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                      <Input className="h-8 text-xs" type="number" placeholder={bn ? "সর্বোচ্চ" : "Max"} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {ageRestrict ? (bn ? "শুধু এই বয়সসীমার প্রার্থী আবেদন করতে পারবে" : "Only this age range can apply") : (bn ? "সকল বয়সের প্রার্থী আবেদন করতে পারবে" : "All ages can apply")}
                    </p>
                  </div>

                  {/* Gender restriction */}
                  <div className="rounded-lg border p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{bn ? "লিঙ্গ" : "Gender"}</span>
                      <button
                        type="button"
                        onClick={() => setGenderRestrict(!genderRestrict)}
                        className={`h-5 w-9 rounded-full relative transition-colors ${genderRestrict ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${genderRestrict ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)} className="w-full rounded-lg border bg-background px-2 py-1 text-xs h-8">
                      {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{bn ? g.labelBn : g.labelEn}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      {genderRestrict ? (bn ? "শুধু নির্বাচিত লিঙ্গ আবেদন করতে পারবে" : "Only selected gender can apply") : (bn ? "সকলে আবেদন করতে পারবে" : "Everyone can apply")}
                    </p>
                  </div>

                  {/* Years of experience */}
                  <div className="rounded-lg border p-2.5 space-y-2">
                    <span className="text-xs font-semibold block">{bn ? "অভিজ্ঞতা (বছর)" : "Years of Experience"}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input className="h-8 text-xs" type="number" placeholder={bn ? "সর্বনিম্ন" : "Min"} value={expMin} onChange={(e) => setExpMin(e.target.value)} />
                      <Input className="h-8 text-xs" type="number" placeholder={bn ? "সর্বোচ্চ" : "Max"} value={expMax} onChange={(e) => setExpMax(e.target.value)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{bn ? "প্রার্থীর ন্যূনতম/সর্বোচ্চ অভিজ্ঞতা" : "Candidate's min/max experience"}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 4: Billing & Contact */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "বিলিংয়ের জন্য যোগাযোগ ব্যক্তি" : "Contact Person for Billing"}</h3>
                <p className="text-[10px] text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-2">
                  {bn
                    ? "এই চাকরির বিলিং সংক্রান্ত যেকোনো জিজ্ঞাসার জন্য আমরা এই ব্যক্তির সাথে যোগাযোগ করব।"
                    : "For any billing-related query about this job, our team will reach out to this person."}
                </p>
                <Input className="h-9 text-sm" placeholder={bn ? "যোগাযোগকারীর নাম *" : "Contact Person Name *"} value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} />
                <Input className="h-9 text-sm" placeholder={bn ? "পদবি *" : "Designation *"} value={billingDesignation} onChange={(e) => setBillingDesignation(e.target.value)} />
                <Input className="h-9 text-sm" type="email" placeholder={bn ? "ইমেইল ঠিকানা *" : "Email Address *"} value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                <Input className="h-9 text-sm" placeholder={bn ? "মোবাইল নম্বর *" : "Mobile Number *"} value={billingMobile} onChange={(e) => setBillingMobile(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setBillingEmail(contactEmail);
                    setBillingMobile(contactPhone);
                  }}
                >
                  {bn ? "পরিবর্তন করুন" : "Change"}
                </Button>
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-sm text-primary">{bn ? "সার্কুলারের এইচআর/রিক্রুটমেন্ট যোগাযোগ" : "Related Recruitment/HR Person"}</h3>
                <p className="text-[10px] text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-2">
                  {bn
                    ? "এই সার্কুলার সম্পর্কে যেকোনো জিজ্ঞাসার জন্য আমরা এই ব্যক্তির সাথে যোগাযোগ করব।"
                    : "For any query about this circular, our team will reach out to this person."}
                </p>
                <Input className="h-9 text-sm" placeholder={bn ? "যোগাযোগকারীর নাম *" : "Contact Person Name *"} value={hrContactName} onChange={(e) => setHrContactName(e.target.value)} />
                <Input className="h-9 text-sm" placeholder={bn ? "পদবি *" : "Designation *"} value={hrDesignation} onChange={(e) => setHrDesignation(e.target.value)} />
                <Input className="h-9 text-sm" type="email" placeholder={bn ? "ইমেইল ঠিকানা *" : "Email Address *"} value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
                <Input className="h-9 text-sm" placeholder={bn ? "মোবাইল নম্বর *" : "Mobile Number *"} value={hrMobile} onChange={(e) => setHrMobile(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {currentStep > 0 ? (
              <Button variant="outline" onClick={goBack} className="flex-1">
                {bn ? "পূর্ববর্তী" : "Back"}
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            {currentStep < steps.length - 1 ? (
              <Button onClick={goNext} className="flex-1 bg-primary hover:bg-primary text-white">
                {bn ? "পরবর্তী" : "Next"}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={postJob.isPending} className="flex-1 bg-primary hover:bg-primary text-white h-12 text-base font-semibold">
                {postJob.isPending ? (bn ? "জমা হচ্ছে..." : "Submitting...") : bn ? "বিজ্ঞাপন জমা দিন" : "Submit Job Posting"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default JobPostForm;