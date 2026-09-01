import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovedJobs, useTopEmployers, useJobStats, useSaveJob, useSavedJobs, useDeadlineSoonJobs, JOB_CATEGORIES, JOB_TYPES } from "@/hooks/useJobData";
import { divisions } from "@/data/locations";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Extracted components
import JobHero from "@/components/jobs/JobHero";
import JobCategoryGrid from "@/components/jobs/JobCategoryGrid";
import JobFilterBar from "@/components/jobs/JobFilterBar";
import JobSidebar from "@/components/jobs/JobSidebar";
import JobCard from "@/components/jobs/JobCard";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import PlatformSwitcher from "@/components/mart/PlatformSwitcher";
import CompanyLogo from "@/components/jobs/CompanyLogo";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSEO } from "@/hooks/useSEO";
import DesktopMegaMenu from "@/components/DesktopMegaMenu";

// job_type values that map 1:1 onto JOB_TYPES in useJobData.ts. Any ?type=
// link using one of these strings passes straight through to selectedType
// with no translation needed. Keep this in sync with JOB_TYPES.
const DIRECT_JOB_TYPE_VALUES = [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "freelance",
  "remote",
  "temporary",
];

const JobHome = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  useSEO({
    title: bn ? "সন্ধান জবস — চাকরি খুঁজুন" : "Shondhaan Jobs — Find Your Next Job",
    description: bn
      ? "বাংলাদেশের সকল ক্যাটাগরির চাকরি এক জায়গায় — ফুল-টাইম, পার্ট-টাইম, রিমোট ও আরও।"
      : "All job categories across Bangladesh in one place — full-time, part-time, remote and more.",
    canonical: "/jobs",
    locale: bn ? "bn_BD" : "en_US",
  });

  const { pull, refreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  // Search & filter state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedThana, setSelectedThana] = useState("");
  const [selectedEducation, setSelectedEducation] = useState("any");
  const [selectedCompanyType, setSelectedCompanyType] = useState("all");
  const [selectedSalary, setSelectedSalary] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Cascading location
  const selectedDivisionObj = divisions.find(d => d.nameBn === selectedDivision || d.name === selectedDivision);
  const districtList = selectedDivisionObj?.districts || [];
  const selectedDistrictObj = districtList.find(d => d.nameBn === selectedDistrict || d.name === selectedDistrict);
  const thanaList = selectedDistrictObj?.thanas || [];

  const handleDivisionChange = (v: string) => { setSelectedDivision(v); setSelectedDistrict(""); setSelectedThana(""); };
  const handleDistrictChange = (v: string) => { setSelectedDistrict(v); setSelectedThana(""); };
  const clearLocation = () => { setSelectedDivision(""); setSelectedDistrict(""); setSelectedThana(""); };

  // ── Sync filters from the JobsMenuBar submenu's ?type= param ───────────
  // JobsMenuBar links (e.g. "Internship" -> /jobs?type=internship) land
  // here since /jobs stays mounted across navigations within itself.
  // Values that match a real job_type (see DIRECT_JOB_TYPE_VALUES) map
  // straight onto selectedType. A handful of menu items aren't job types
  // at all ("government" is a company_type, "fresher" is an experience
  // bucket, "featured"/"deadline" are existing sections we just scroll to,
  // "new" is already the default sort) — those get handled explicitly.
 useEffect(() => {
  const type = searchParams.get("type");
  if (!type) return;

  if (DIRECT_JOB_TYPE_VALUES.includes(type)) {
    setSelectedType(type);
  } else {
    switch (type) {
      case "government":
        setSelectedCompanyType("government");
        break;
      case "fresher":
        setSelectedExperience("0");
        break;
      case "new":
        // already sorted newest-first server-side; nothing to set
        break;
      // "featured" and "deadline" scroll to their own sections below
      // instead of the general results list
    }
  }

  // Scroll to the right section for every type= click
  const scrollTargetId =
    type === "featured" ? "featured-jobs-section" :
    type === "deadline" ? "deadline-soon-section" :
    "latest-jobs-section";

  // Small delay lets the filtered list render first so scrollIntoView
  // measures the post-filter layout, not the stale pre-filter one
  setTimeout(() => {
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

  // Data queries
  const { data: jobs = [], isLoading } = useApprovedJobs({
    category: selectedCategory,
    search: search.length > 0 ? search : undefined,
    jobType: selectedType,
    division: selectedDivision || undefined,
    district: selectedDistrict || undefined,
    thana: selectedThana || undefined,
    education: selectedEducation,
    companyType: selectedCompanyType,
    salaryRange: selectedSalary || undefined,
    experienceRange: selectedExperience || undefined,
  });

  const { data: topEmployers = [] } = useTopEmployers();
  const { data: stats } = useJobStats();
  const { data: savedJobs = [] } = useSavedJobs();
  const { data: deadlineSoonJobs = [] } = useDeadlineSoonJobs();
  const saveJob = useSaveJob();

  const JOB_CATEGORIES_ENDPOINT = `${import.meta.env.VITE_YESSJOB_API_URL}/api/job-categories`;

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
    staleTime: 30_000,           // refetch in the background after 30s if stale
    refetchOnWindowFocus: true,  // catch backend edits when you tab back in
  });

  const categories = fetchedCategories && fetchedCategories.length > 0 ? fetchedCategories : JOB_CATEGORIES;

  const savedJobIds = new Set(savedJobs.map((s: { job_id: string }) => s.job_id));
  const getTypeLabel = (val: string) => JOB_TYPES.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  const getCatLabel = (val: string) => {
    return categories.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;
  };


  const activeFilterCount = [
    selectedType !== "all", selectedDivision !== "", selectedDistrict !== "", selectedThana !== "",
    selectedEducation !== "any", selectedCompanyType !== "all", selectedSalary !== "", selectedExperience !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedType("all"); setSelectedDivision(""); setSelectedDistrict(""); setSelectedThana("");
    setSelectedEducation("any"); setSelectedCompanyType("all"); setSelectedSalary(""); setSelectedExperience("");
  };

  const featuredJobs = jobs.filter(j => j.is_featured);
  const recentJobs = jobs.filter(j => !j.is_featured);

  return (
    <JobsPageTransition>
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar/>
      
      {/* Reserve only the visible fixed header stack; keep the hero flush under JobsMenuBar */}
      {/* <div className="h-[44px] md:h-[76px] lg:h-[82px]" /> */}
      {/* <PlatformSwitcher className="md:hidden" exclude={["jobs"]} /> */}
        <JobsMenuBar flushWithHeader />
      {/* Hero Section */}
      <JobHero
        bn={bn} user={user} search={search} setSearch={setSearch}
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        selectedDivision={selectedDivision} selectedDistrict={selectedDistrict} selectedThana={selectedThana}
        handleDivisionChange={handleDivisionChange} handleDistrictChange={handleDistrictChange}
        setSelectedThana={setSelectedThana} clearLocation={clearLocation}
        districtList={districtList} thanaList={thanaList}
        stats={stats} topEmployers={topEmployers} featuredJobs={featuredJobs} jobs={jobs}
        categories={categories}
      />

      {/* Category Grid */}
      <JobCategoryGrid bn={bn} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} stats={stats} categories={categories} />

      {/* Filter Bar */}
      <JobFilterBar
        bn={bn} showFilters={showFilters} setShowFilters={setShowFilters}
        selectedType={selectedType} setSelectedType={setSelectedType}
        selectedEducation={selectedEducation} setSelectedEducation={setSelectedEducation}
        selectedCompanyType={selectedCompanyType} setSelectedCompanyType={setSelectedCompanyType}
        selectedSalary={selectedSalary} setSelectedSalary={setSelectedSalary}
        selectedExperience={selectedExperience} setSelectedExperience={setSelectedExperience}
        selectedDivision={selectedDivision} selectedDistrict={selectedDistrict} selectedThana={selectedThana}
        handleDivisionChange={handleDivisionChange} handleDistrictChange={handleDistrictChange}
        setSelectedThana={setSelectedThana} clearLocation={clearLocation} clearFilters={clearFilters}
        districtList={districtList} thanaList={thanaList}
        activeFilterCount={activeFilterCount} jobCount={jobs.length}
        categories={categories}
      />

      {/* Main Content */}
      <div className="app-container py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Job List */}
          <div className="flex-1 min-w-0">
            {/* Deadline Soon */}
            {deadlineSoonJobs.length > 0 && selectedCategory === "all" && !search && (
              <div className="mb-8" id="deadline-soon-section">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-red-500" />
                  <h2 className="font-bold text-base">{bn ? "শীঘ্রই শেষ হচ্ছে!" : "Closing Soon!"}</h2>
                  <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px]">{deadlineSoonJobs.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {deadlineSoonJobs.slice(0, 4).map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 p-3.5 rounded-xl border-l-4 border-l-red-500 border border-red-100 bg-gradient-to-r from-red-50/60 to-transparent dark:from-red-950/10 hover:shadow-md transition-all group">
                       <CompanyLogo
                         src={job.company_logo_url}
                         alt={job.company_name}
                         sizeClass="w-11 h-11"
                         padClass="p-1"
                         iconClass="h-5 w-5 text-red-500"
                         fallbackBgClass="bg-red-50 dark:bg-red-950/20"
                       />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">{job.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.company_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-red-600 font-bold">{job.deadline ? format(new Date(job.deadline), "dd MMM") : ""}</p>
                        <p className="text-[10px] text-red-400">{bn ? "শেষ তারিখ" : "Deadline"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Jobs */}
            {featuredJobs.length > 0 && (
              <div className="mb-8" id="featured-jobs-section">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <h2 className="font-bold text-base">{bn ? "ফিচার্ড চাকরি" : "Featured Jobs"}</h2>
                  <Badge className="bg-amber-500/10 text-amber-700 text-[10px]">{featuredJobs.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {featuredJobs.slice(0, 6).map(job => (
                    <JobCard key={job.id} job={job} bn={bn} getTypeLabel={getTypeLabel} getCatLabel={getCatLabel} isSaved={savedJobIds.has(job.id)} onSave={saveJob} user={user} navigate={navigate} featured />
                  ))}
                </div>
              </div>
            )}

            {/* All Jobs */}
            <div className="flex items-center gap-2 mb-4" id="latest-jobs-section">
              <div className="w-1 h-5 rounded-full bg-blue-600"/>
              <h2 className="font-bold  text-base">
                {selectedCategory !== "all" ? getCatLabel(selectedCategory) : bn ? "নতুন চাকরির বিজ্ঞাপন" : "Latest Jobs"}
              </h2>
              <Badge variant="outline" className="text-[10px]">{recentJobs.length}</Badge>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentJobs.length === 0 && featuredJobs.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-blue-400" />
                </div>
                <p className="font-semibold text-base">{bn ? "কোনো চাকরি পাওয়া যায়নি" : "No jobs found"}</p>
                <p className="text-sm text-muted-foreground mt-1">{bn ? "অনুগ্রহ করে ফিল্টার পরিবর্তন করুন" : "Try adjusting your search or filters"}</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">{bn ? "ফিল্টার মুছুন" : "Clear Filters"}</Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map(job => (
                  <JobCard key={job.id} job={job} bn={bn} getTypeLabel={getTypeLabel} getCatLabel={getCatLabel} isSaved={savedJobIds.has(job.id)} onSave={saveJob} user={user} navigate={navigate} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <JobSidebar
            bn={bn} user={user} topEmployers={topEmployers} stats={stats}
            setSearch={setSearch} setSelectedCategory={setSelectedCategory} setSelectedType={setSelectedType}
          />
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default JobHome;