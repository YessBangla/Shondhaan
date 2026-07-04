import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePostJob, JOB_CATEGORIES, JOB_TYPES, EDUCATION_LEVELS, GENDER_OPTIONS, COMPANY_TYPES } from "@/hooks/useJobData";
import { divisions } from "@/data/locations";
import { Briefcase, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAITools } from "@/hooks/useAITools";
import { toast } from "sonner";

const JobPostForm = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bn = language === "bn";
  const postJob = usePostJob();
  const { generateDescription, loading: aiLoading } = useAITools();

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [applicationInstruction, setApplicationInstruction] = useState("");
  const [jobType, setJobType] = useState("full-time");
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

  const selectedDivision = divisions.find((d) => d.name === division);
  const districtList = selectedDivision?.districts || [];

  if (!user) { navigate("/auth"); return null; }

  const handleAIDescription = async () => {
    if (!title.trim()) { toast.error(bn ? "প্রথমে পদের নাম লিখুন" : "Enter job title first"); return; }
    const result = await generateDescription(title, category, "new");
    if (result) setDescription(result);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !companyName.trim() || !description.trim()) {
      toast.error(bn ? "পদের নাম, প্রতিষ্ঠান ও বিবরণ আবশ্যক" : "Title, company & description required");
      return;
    }

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
      gender_preference: genderPreference,
      age_min: ageMin ? parseInt(ageMin) : null,
      age_max: ageMax ? parseInt(ageMax) : null,
      experience_min: parseInt(expMin) || 0,
      experience_max: expMax ? parseInt(expMax) : null,
      salary_min: salaryMin ? parseFloat(salaryMin) : null,
      salary_max: salaryMax ? parseFloat(salaryMax) : null,
      salary_negotiable: salaryNegotiable,
      division: division || null,
      district: district || null,
      address: address || null,
      vacancy_count: parseInt(vacancy) || 1,
      deadline: deadline || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
    } as any);

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <JobsPageTransition>
        <Navbar />
      <JobsMenuBar />
        <div className="pt-[44px] md:pt-[68px] bg-card" />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{bn ? "বিজ্ঞাপন জমা হয়েছে!" : "Job Posted!"}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {bn ? "আপনার চাকরির বিজ্ঞাপন অ্যাডমিনের অনুমোদনের পর প্রকাশিত হবে।" : "Your job posting will be published after admin approval."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/jobs")}>{bn ? "চাকরি দেখুন" : "Browse Jobs"}</Button>
            <Button onClick={() => { setSubmitted(false); setTitle(""); setCompanyName(""); setDescription(""); }} className="bg-blue-600 hover:bg-blue-700">
              {bn ? "আরেকটি দিন" : "Post Another"}
            </Button>
          </div>
        </div>
        <Footer />
      </JobsPageTransition>
    );
  }

  return (
    <JobsPageTransition>
      <Navbar />
      <JobsMenuBar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />

      <div className="mx-auto max-w-2xl px-4 md:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-4 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> {bn ? "Yess Jobs" : "Yess Jobs"}
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-2.5">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{bn ? "চাকরির বিজ্ঞাপন দিন" : "Post a Job on Yess Jobs"}</h1>
            <p className="text-xs text-muted-foreground">{bn ? "অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে • বিনামূল্যে!" : "Will be published after admin approval • Free!"}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-700">{bn ? "মৌলিক তথ্য" : "Basic Information"}</h3>
            <Input placeholder={bn ? "পদের নাম / পদবি *" : "Job Title / Position *"} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder={bn ? "প্রতিষ্ঠানের নাম *" : "Company / Organization Name *"} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "চাকরির ধরন" : "Job Type"}</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{bn ? t.labelBn : t.labelEn}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "ক্যাটেগরি" : "Category"}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  {JOB_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "প্রতিষ্ঠানের ধরন" : "Company Type"}</label>
              <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {COMPANY_TYPES.map((c) => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-blue-700">{bn ? "বিবরণ" : "Job Description"}</h3>
              <Button variant="outline" size="sm" onClick={handleAIDescription} disabled={aiLoading} className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> {bn ? "AI দিয়ে লিখুন" : "AI Write"}
              </Button>
            </div>
            <Textarea placeholder={bn ? "চাকরির দায়িত্ব ও বিস্তারিত বিবরণ *" : "Job responsibilities & detailed description *"} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
            <Textarea placeholder={bn ? "শিক্ষাগত যোগ্যতা ও অভিজ্ঞতা" : "Educational qualification & experience"} value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} />
            <Textarea placeholder={bn ? "সুযোগ-সুবিধা (বেতন, বোনাস, ছুটি ইত্যাদি)" : "Compensation & Benefits (salary, bonus, leave etc.)"} value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={2} />
            <Textarea placeholder={bn ? "আবেদনের বিশেষ নির্দেশনা (ঐচ্ছিক)" : "Special application instructions (optional)"} value={applicationInstruction} onChange={(e) => setApplicationInstruction(e.target.value)} rows={2} />
          </div>

          {/* Eligibility */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-700">{bn ? "প্রার্থীর যোগ্যতা" : "Candidate Requirements"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "শিক্ষাগত যোগ্যতা" : "Education Level"}</label>
                <select value={educationRequired} onChange={(e) => setEducationRequired(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  {EDUCATION_LEVELS.map((e) => <option key={e.value} value={e.value}>{bn ? e.labelBn : e.labelEn}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">{bn ? "লিঙ্গ" : "Gender"}</label>
                <select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{bn ? g.labelBn : g.labelEn}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder={bn ? "সর্বনিম্ন বয়স" : "Min Age"} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
              <Input type="number" placeholder={bn ? "সর্বোচ্চ বয়স" : "Max Age"} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder={bn ? "সর্বনিম্ন অভিজ্ঞতা (বছর)" : "Min Experience (yrs)"} value={expMin} onChange={(e) => setExpMin(e.target.value)} />
              <Input type="number" placeholder={bn ? "সর্বোচ্চ অভিজ্ঞতা (বছর)" : "Max Experience (yrs)"} value={expMax} onChange={(e) => setExpMax(e.target.value)} />
            </div>
          </div>

          {/* Salary */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-700">{bn ? "বেতন" : "Salary"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder={bn ? "সর্বনিম্ন বেতন (মাসিক)" : "Min Salary (Monthly)"} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              <Input type="number" placeholder={bn ? "সর্বোচ্চ বেতন (মাসিক)" : "Max Salary (Monthly)"} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={salaryNegotiable} onChange={(e) => setSalaryNegotiable(e.target.checked)} className="rounded" />
              {bn ? "বেতন আলোচনা সাপেক্ষে" : "Salary Negotiable"}
            </label>
          </div>

          {/* Location */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-700">{bn ? "কর্মস্থল" : "Workplace"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <select value={division} onChange={(e) => { setDivision(e.target.value); setDistrict(""); }} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">{bn ? "বিভাগ নির্বাচন করুন" : "Select Division"}</option>
                {divisions.map((d) => <option key={d.name} value={d.name}>{bn ? d.nameBn : d.name}</option>)}
              </select>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">{bn ? "জেলা নির্বাচন করুন" : "Select District"}</option>
                {districtList.map((d) => <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>)}
              </select>
            </div>
            <Input placeholder={bn ? "সম্পূর্ণ ঠিকানা (ঐচ্ছিক)" : "Full Address (optional)"} value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder={bn ? "পদ সংখ্যা" : "Number of Vacancies"} value={vacancy} onChange={(e) => setVacancy(e.target.value)} />
              <div>
                <Input type="date" placeholder={bn ? "আবেদনের শেষ তারিখ" : "Application Deadline"} value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-700">{bn ? "যোগাযোগের তথ্য" : "Contact Information"}</h3>
            <Input placeholder={bn ? "মোবাইল নম্বর" : "Phone Number"} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <Input placeholder={bn ? "ইমেইল ঠিকানা" : "Email Address"} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>

          <Button onClick={handleSubmit} disabled={postJob.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold">
            {postJob.isPending ? (bn ? "জমা হচ্ছে..." : "Submitting...") : bn ? "বিজ্ঞাপন জমা দিন" : "Submit Job Posting"}
          </Button>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default JobPostForm;
