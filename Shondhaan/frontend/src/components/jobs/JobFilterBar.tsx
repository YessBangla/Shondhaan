import { MapPin, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { divisions } from "@/data/locations";
import { JOB_TYPES, EDUCATION_LEVELS, COMPANY_TYPES, SALARY_RANGES, EXPERIENCE_RANGES } from "@/hooks/useJobData";

interface JobFilterBarProps {
  bn: boolean;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  selectedEducation: string;
  setSelectedEducation: (v: string) => void;
  selectedCompanyType: string;
  setSelectedCompanyType: (v: string) => void;
  selectedSalary: string;
  setSelectedSalary: (v: string) => void;
  selectedExperience: string;
  setSelectedExperience: (v: string) => void;
  selectedDivision: string;
  selectedDistrict: string;
  selectedThana: string;
  handleDivisionChange: (v: string) => void;
  handleDistrictChange: (v: string) => void;
  setSelectedThana: (v: string) => void;
  clearLocation: () => void;
  clearFilters: () => void;
  districtList: any[];
  thanaList: string[];
  activeFilterCount: number;
  jobCount: number;
}

export default function JobFilterBar({
  bn, showFilters, setShowFilters,
  selectedType, setSelectedType,
  selectedEducation, setSelectedEducation,
  selectedCompanyType, setSelectedCompanyType,
  selectedSalary, setSelectedSalary,
  selectedExperience, setSelectedExperience,
  selectedDivision, selectedDistrict, selectedThana,
  handleDivisionChange, handleDistrictChange, setSelectedThana,
  clearLocation, clearFilters,
  districtList, thanaList,
  activeFilterCount, jobCount,
}: JobFilterBarProps) {
  return (
    <>
      {/* Sticky filter bar */}
      <div className="border-b bg-muted/30 sticky top-[44px] md:top-[52px] z-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border hover:bg-muted"}`}
            >
              <Filter className="h-3 w-3" />
              {bn ? "ফিল্টার" : "Filters"}
              {activeFilterCount > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px] ml-0.5">{activeFilterCount}</span>}
            </button>

            {JOB_TYPES.map(t => (
              <button key={t.value} onClick={() => setSelectedType(selectedType === t.value ? "all" : t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${selectedType === t.value ? "bg-blue-600 text-white" : "bg-background border border-border hover:bg-muted"}`}>
                {bn ? t.labelBn : t.labelEn}
              </button>
            ))}

            <span className="text-xs text-muted-foreground shrink-0 ml-auto font-medium">{jobCount} {bn ? "টি চাকরি পাওয়া গেছে" : "jobs found"}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b bg-card overflow-hidden">
            <div className="mx-auto max-w-6xl px-4 md:px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="all">{bn ? "চাকরির ধরন" : "Job Type"}</option>
                  {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{bn ? t.labelBn : t.labelEn}</option>)}
                </select>
                <select value={selectedEducation} onChange={e => setSelectedEducation(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                  {EDUCATION_LEVELS.map(e => <option key={e.value} value={e.value}>{bn ? e.labelBn : e.labelEn}</option>)}
                </select>
                <select value={selectedSalary} onChange={e => setSelectedSalary(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="">{bn ? "বেতন পরিসীমা" : "Salary Range"}</option>
                  {SALARY_RANGES.map(s => <option key={s.value} value={s.value}>{bn ? s.labelBn : s.labelEn}</option>)}
                </select>
                <select value={selectedExperience} onChange={e => setSelectedExperience(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="">{bn ? "অভিজ্ঞতা" : "Experience"}</option>
                  {EXPERIENCE_RANGES.map(e => <option key={e.value} value={e.value}>{bn ? e.labelBn : e.labelEn}</option>)}
                </select>
                <select value={selectedCompanyType} onChange={e => setSelectedCompanyType(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="all">{bn ? "প্রতিষ্ঠানের ধরন" : "Company Type"}</option>
                  {COMPANY_TYPES.map(c => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
                </select>
              </div>
              {/* Location Filter */}
              <div className="mt-3 p-3 rounded-xl border bg-muted/30">
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {bn ? "স্থান অনুযায়ী ফিল্টার" : "Filter by Location"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={selectedDivision} onChange={e => handleDivisionChange(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs">
                    <option value="">{bn ? "বিভাগ" : "Division"}</option>
                    {divisions.map(d => <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>)}
                  </select>
                  <select value={selectedDistrict} onChange={e => handleDistrictChange(e.target.value)} disabled={!selectedDivision} className="rounded-lg border bg-background px-3 py-2 text-xs disabled:opacity-40">
                    <option value="">{bn ? "জেলা" : "District"}</option>
                    {districtList.map(d => <option key={d.name} value={bn ? d.nameBn : d.name}>{bn ? d.nameBn : d.name}</option>)}
                  </select>
                  <select value={selectedThana} onChange={e => setSelectedThana(e.target.value)} disabled={!selectedDistrict || thanaList.length === 0} className="rounded-lg border bg-background px-3 py-2 text-xs disabled:opacity-40">
                    <option value="">{bn ? "উপজেলা/থানা" : "Upazila/Thana"}</option>
                    {thanaList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {selectedDivision && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">📍 {selectedDivision}</span>
                      {selectedDistrict && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">🏙️ {selectedDistrict}</span>}
                      {selectedThana && <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">📌 {selectedThana}</span>}
                    </div>
                    <button onClick={clearLocation} className="text-[10px] text-red-500 hover:underline ml-auto">{bn ? "মুছুন" : "Clear"}</button>
                  </div>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline mt-2 flex items-center gap-1">
                  <X className="h-3 w-3" /> {bn ? "সব ফিল্টার মুছুন" : "Clear All Filters"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
