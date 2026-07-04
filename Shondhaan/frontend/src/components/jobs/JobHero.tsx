import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Search, MapPin, Plus, FileText, User, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackToHomeButton from "@/components/BackToHomeButton";
import { divisions } from "@/data/locations";
import { JOB_CATEGORIES } from "@/hooks/useJobData";
import yessJobsLogo from "@/assets/yess-jobs-logo.png";

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
    <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-4 pb-8 md:pt-5 md:pb-10 relative">
        <BackToHomeButton />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            {/* Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white rounded-xl px-3 py-2 shadow-md ring-1 ring-black/5">
                <img src={yessJobsLogo} alt="Yess Jobs" className="h-10 md:h-12 w-auto" />
              </div>
              <div>
                <h1 className="sr-only">Yess Jobs</h1>
                <p className="text-blue-200 text-xs">{bn ? "বাংলাদেশের বিশ্বস্ত চাকরির পোর্টাল" : "Bangladesh's Trusted Job Portal"}</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 mt-4 max-w-3xl">
              {/* Row 1: Keyword + category + button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    placeholder={bn ? "পদবি, কোম্পানি বা কীওয়ার্ড..." : "Title, company or keyword..."}
                    className="pl-9 pr-8 bg-white text-foreground border-0 h-10 rounded-lg text-xs"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {searchFocused && search.length >= 1 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border max-h-64 overflow-y-auto z-50">
                      {jobs.slice(0, 6).map(job => (
                        <button
                          key={job.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-start gap-3 border-b last:border-0 transition-colors"
                          onMouseDown={() => navigate(`/jobs/${job.id}`)}
                        >
                          <Briefcase className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {job.company_name}
                              {job.district && <><span className="mx-1">•</span><MapPin className="h-3 w-3" /> {job.district}</>}
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
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 rounded-lg bg-white text-foreground px-3 text-xs border-0 hidden sm:block w-40"
                >
                  <option value="all">{bn ? "সকল ক্যাটেগরি" : "All Categories"}</option>
                  {JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
                </select>
                <Button className="bg-emerald-500 hover:bg-emerald-600 h-10 px-5 font-semibold shrink-0 rounded-lg text-xs">
                  <Search className="h-4 w-4 mr-1" />
                  {bn ? "খুঁজুন" : "Search"}
                </Button>
              </div>

              {/* Row 2: Location Selects */}
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 items-center">
                <select
                  value={selectedDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="h-9 w-full rounded-lg bg-white/90 text-foreground px-2 text-[11px] sm:text-xs border-0 font-medium truncate"
                >
                  <option value="">{bn ? "📍 বিভাগ" : "📍 Division"}</option>
                  {divisions.map(d => (
                    <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>
                  ))}
                </select>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!selectedDivision}
                  className="h-9 w-full rounded-lg bg-white/90 text-foreground px-2 text-[11px] sm:text-xs border-0 font-medium truncate disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{bn ? "🏙️ জেলা" : "🏙️ District"}</option>
                  {districtList.map(d => (
                    <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <select
                    value={selectedThana}
                    onChange={(e) => setSelectedThana(e.target.value)}
                    disabled={!selectedDistrict || thanaList.length === 0}
                    className="h-9 w-full rounded-lg bg-white/90 text-foreground px-2 text-[11px] sm:text-xs border-0 font-medium truncate disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">{bn ? "📌 উপজেলা" : "📌 Upazila"}</option>
                    {thanaList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {selectedDivision && (
                    <button onClick={clearLocation} className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location chips */}
              {selectedDivision && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">📍 {selectedDivision}</span>
                  {selectedDistrict && <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">🏙️ {selectedDistrict}</span>}
                  {selectedThana && <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">📌 {selectedThana}</span>}
                </div>
              )}

              {/* Popular tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-blue-200 text-xs">{bn ? "জনপ্রিয়:" : "Popular:"}</span>
                {[
                  { q: "Software Engineer", bn: "সফটওয়্যার ইঞ্জিনিয়ার" },
                  { q: "Marketing", bn: "মার্কেটিং" },
                  { q: "Accountant", bn: "একাউন্ট্যান্ট" },
                  { q: "Bank", bn: "ব্যাংক" },
                  { q: "Nurse", bn: "নার্স" },
                  { q: "Driver", bn: "ড্রাইভার" },
                ].map(tag => (
                  <button
                    key={tag.q}
                    onClick={() => setSearch(bn ? tag.bn : tag.q)}
                    className="text-xs bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-full transition-colors border border-white/10"
                  >
                    {bn ? tag.bn : tag.q}
                  </button>
                ))}
              </div>

              {/* Division chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { key: "ঢাকা", en: "Dhaka" },
                  { key: "চট্টগ্রাম", en: "Chattogram" },
                  { key: "রাজশাহী", en: "Rajshahi" },
                  { key: "খুলনা", en: "Khulna" },
                  { key: "সিলেট", en: "Sylhet" },
                  { key: "বরিশাল", en: "Barishal" },
                  { key: "রংপুর", en: "Rangpur" },
                  { key: "ময়মনসিংহ", en: "Mymensingh" },
                ].map(div => {
                  const count = (stats?.divisionCounts?.[div.key] || 0) + (stats?.divisionCounts?.[div.en] || 0);
                  return (
                    <button
                      key={div.key}
                      onClick={() => { handleDivisionChange(bn ? div.key : div.en); }}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors border ${
                        selectedDivision === div.key || selectedDivision === div.en
                          ? "bg-white text-blue-700 border-white shadow-sm"
                          : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      {bn ? div.key : div.en} {count > 0 && <span className="font-bold">({count})</span>}
                    </button>
                  );
                })}
                {selectedDivision && (
                  <button onClick={clearLocation} className="text-[11px] px-2 py-1 text-red-300 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-2 mt-4">
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
