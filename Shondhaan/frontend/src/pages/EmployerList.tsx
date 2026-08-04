import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAllEmployers, JOB_CATEGORIES, COMPANY_TYPES } from "@/hooks/useJobData";
import { Building2, Search, MapPin, Briefcase, ArrowLeft, ChevronRight, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BackToHomeButton from "@/components/BackToHomeButton";
import CompanyLogo from "@/components/jobs/CompanyLogo";

const EmployerList = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const { data: employers = [], isLoading } = useAllEmployers();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filtered = employers.filter(emp => {
    const matchSearch = !search || emp.name.toLowerCase().includes(search.toLowerCase());
    const matchType = selectedType === "all" || emp.type === selectedType;
    return matchSearch && matchType;
  });

  const getCatLabel = (val: string) => JOB_CATEGORIES.find(j => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  return (
    <JobsPageTransition>
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-blue-700 md:bg-card" />
      <JobsMenuBar />

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
        <div className="app-container py-8">
          {/* <BackToHomeButton /> */}
          <div className="flex items-center gap-3 mt-2 mb-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">{bn ? "নিয়োগদাতা তালিকা" : "Employer Directory"}</h1>
              <p className="text-blue-200 text-xs">{bn ? `মোট ${filtered.length} টি কোম্পানি` : `${filtered.length} companies listed`}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={bn ? "কোম্পানি খুঁজুন..." : "Search company..."}
                className="pl-9 bg-white text-foreground border-0 h-11 rounded-lg"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
            </div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="h-11 rounded-lg bg-white text-foreground px-3 text-sm border-0"
            >
              <option value="all">{bn ? "সকল ধরন" : "All Types"}</option>
              {COMPANY_TYPES.map(c => <option key={c.value} value={c.value}>{bn ? c.labelBn : c.labelEn}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b bg-card">
        <div className="app-container py-3 flex items-center gap-4 overflow-x-auto scrollbar-none">
          <span className="text-xs font-medium text-muted-foreground shrink-0">{bn ? "ফলাফল:" : "Results:"} {filtered.length}</span>
          {COMPANY_TYPES.map(t => {
            const count = employers.filter(e => e.type === t.value).length;
            if (!count) return null;
            return (
              <button
                key={t.value}
                onClick={() => setSelectedType(selectedType === t.value ? "all" : t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${selectedType === t.value ? "bg-blue-600 text-white" : "bg-muted hover:bg-muted/80"}`}
              >
                {bn ? t.labelBn : t.labelEn} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Employer Grid */}
      <div className="app-container py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold">{bn ? "কোনো কোম্পানি পাওয়া যায়নি" : "No companies found"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((emp, i) => (
              <div
                key={i}
                onClick={() => emp.id ? navigate(`/jobs/employer/${emp.id}`) : navigate(`/jobs?company=${encodeURIComponent(emp.name)}`)}
                className="rounded-xl border bg-card hover:shadow-lg transition-all cursor-pointer group p-5"
              >
                <div className="flex items-start gap-4">
                  <CompanyLogo src={emp.logo} alt={emp.name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm group-hover:text-blue-600 transition-colors line-clamp-1 flex items-center gap-1">
                      {emp.name}
                      {(emp as any).isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    </h3>
                    {emp.type && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {COMPANY_TYPES.find(c => c.value === emp.type)?.[bn ? "labelBn" : "labelEn"] || emp.type}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 text-[10px] font-semibold">
                        <Briefcase className="h-2.5 w-2.5 mr-1" />{emp.count} {bn ? "টি পদ" : "openings"}
                      </Badge>
                    </div>
                    {emp.district && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{emp.district}{emp.division ? `, ${emp.division}` : ""}
                      </p>
                    )}
                    {emp.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {emp.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-md">{getCatLabel(cat)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-blue-600 transition-colors shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default EmployerList;
