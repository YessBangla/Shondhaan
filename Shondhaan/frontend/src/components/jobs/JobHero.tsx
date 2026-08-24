import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Search, MapPin, Plus, FileText, User, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackToHomeButton from "@/components/BackToHomeButton";
import { divisions } from "@/data/locations";
import { JOB_CATEGORIES } from "@/hooks/useJobData";
import yessJobsLogo from "@/assets/yess-jobs-logo.png";
import JobsMenuBar from "./JobsMenuBar";
const heroBackgroundImage = "/job-bg.png";

interface JobHeroProps {
  bn: boolean;
  user: any;
  search: string;
  setSearch: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedDivision: string;
  selectedDistrict: string;
  selectedThana: string;
  handleDivisionChange: (v: string) => void;
  handleDistrictChange: (v: string) => void;
  setSelectedThana: (v: string) => void;
  clearLocation: () => void;
  districtList: any[];
  thanaList: string[];
  stats: any;
  topEmployers: any[];
  featuredJobs: any[];
  jobs: any[];
}

export default function JobHero({
  bn, user, search, setSearch, selectedCategory, setSelectedCategory,
  selectedDivision, selectedDistrict, selectedThana,
  handleDivisionChange, handleDistrictChange, setSelectedThana, clearLocation,
  districtList, thanaList, stats, topEmployers, featuredJobs, jobs,
}: JobHeroProps) {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div
        className="text-white relative overflow-hidden bg-cover bg-center bg-no-repeat mt-[77px] md:mt-[75px]"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(4, 14, 39, 0.62), rgba(0, 30, 114, 0.66)), url('${heroBackgroundImage}')`,
        }}
      >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 pt-3 pb-4 sm:pb-6 md:pt-5 md:pb-10 relative">
        {/* <BackToHomeButton /> */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            {/* Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white rounded-xl px-3 py-2 shadow-md ring-1 ring-black/5 hidden">
                <img src={yessJobsLogo} alt="Jobs" className="h-10 md:h-12 w-auto" />
              </div>
              <div>
                <h1 className="sr-only">Jobs</h1>
                <p className="text-accent-foreground text-xs sm:text-sm md:text-base">{bn ? "বাংলাদেশের বিশ্বস্ত চাকরির পোর্টাল" : "Bangladesh's Trusted Job Portal"}</p>
              </div>
            </div>

            {/* Search Bar */}
           {/* Row 1: Search */}
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />

  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onFocus={() => setSearchFocused(true)}
    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
    placeholder={
      bn
        ? "পদবি, কোম্পানি বা কীওয়ার্ড..."
        : "Title, company or keyword..."
    }
    className="
      pl-9 pr-[82px]
      bg-white text-foreground
      border-0
      h-10
      rounded-lg
      text-xs
      w-full
    "
  />

  {/* Clear search */}
  {search && (
    <button
      onClick={() => setSearch("")}
      className="absolute right-[68px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-20"
    >
      <X className="h-4 w-4" />
    </button>
  )}

  {/* Search button inside input */}
  <Button
  type="button"
  className="
    absolute
    right-1
    top-1/2
    -translate-y-1/2
    h-8
    px-3
    rounded-md
    text-xs
    font-semibold
    z-20
    bg-gradient-to-r
    from-primary
    to-emerald-500
    hover:bg-primary
    hover:from-primary
    hover:to-primary
    transition-all
    duration-200
  "
>
    <Search className="h-3.5 w-3.5 mr-1" />
    {bn ? "খুঁজুন" : "Search"}
  </Button>

  {/* Search suggestions */}
  {searchFocused && search.length >= 1 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border max-h-64 overflow-y-auto z-50">
      {jobs.slice(0, 6).map((job) => (
        <button
          key={job.id}
          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-start gap-3 border-b last:border-0 transition-colors"
          onMouseDown={() => navigate(`/jobs/${job.id}`)}
        >
          <Briefcase className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {job.title}
            </p>

            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {job.company_name}

              {job.district && (
                <>
                  <span className="mx-1">•</span>
                  <MapPin className="h-3 w-3" />
                  {job.district}
                </>
              )}
            </p>
          </div>

          {job.salary_min && (
            <span className="text-xs text-emerald-600 font-medium whitespace-nowrap ml-auto">
              ৳{(job.salary_min / 1000).toFixed(0)}k
            </span>
          )}
        </button>
      ))}

      {jobs.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          {bn ? "কোনো চাকরি পাওয়া যায়নি" : "No jobs found"}
        </div>
      )}
    </div>
  )}
</div>

            {/* Quick links */}
            <div className="hidden sm:flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => navigate("/jobs/post")} className="bg-white/15 hover:bg-white/25 text-white gap-1.5 text-xs border border-white/20">
                <Plus className="h-3.5 w-3.5" /> {bn ? "চাকরি পোস্ট করুন" : "Post a Job"}
              </Button>
              {user && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/jobs/my")} className="text-white/80 hover:text-white hover:bg-white/10 gap-1 text-xs">
                    <FileText className="h-3.5 w-3.5" /> {bn ? "আমার চাকরি" : "My Jobs"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/jobs/profile")} className="text-white/80 hover:text-white hover:bg-white/10 gap-1 text-xs">
                    <User className="h-3.5 w-3.5" /> {bn ? "CV বিল্ডার" : "CV Builder"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats cards - desktop */}
          <div className="hidden md:grid grid-cols-2 gap-3 w-64 shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{stats?.totalJobs || jobs.length}</p>
              <p className="text-blue-200 text-xs">{bn ? "সক্রিয় চাকরি" : "Active Jobs"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{stats?.totalCompanies || topEmployers.length}</p>
              <p className="text-blue-200 text-xs">{bn ? "কোম্পানি" : "Companies"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{JOB_CATEGORIES.length}</p>
              <p className="text-blue-200 text-xs">{bn ? "ক্যাটেগরি" : "Categories"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">{featuredJobs.length}</p>
              <p className="text-blue-200 text-xs">{bn ? "ফিচার্ড" : "Featured"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
