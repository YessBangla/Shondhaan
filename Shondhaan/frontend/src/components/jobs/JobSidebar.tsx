import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Plus, FileText, User, Clock, GraduationCap, Globe, Laptop, Zap, CalendarClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JOB_CATEGORIES } from "@/hooks/useJobData";

const CATEGORY_ICONS: Record<string, string> = {
  it: "💻", marketing: "📢", sales: "📊", accounting: "🧮", engineering: "⚙️",
  healthcare: "🏥", education: "📚", garments: "👔", banking: "🏦", ngo: "🤝",
  government: "🏛️", driving: "🚗", construction: "🏗️", hospitality: "🏨",
  overseas: "✈️", parttime: "⏰", freelance: "💡", media: "📰", telecom: "📱",
  logistics: "🚚", pharma: "💊", retail: "🛍️", realestate: "🏠", general: "📋", other: "📁",
};

interface JobSidebarProps {
  bn: boolean;
  user: any;
  topEmployers: any[];
  stats: any;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedType: (v: string) => void;
}

export default function JobSidebar({ bn, user, topEmployers, stats, setSearch, setSelectedCategory, setSelectedType }: JobSidebarProps) {
  const navigate = useNavigate();
  const getCatLabel = (val: string) => JOB_CATEGORIES.find((j) => j.value === val)?.[bn ? "labelBn" : "labelEn"] || val;

  const quickLinks = [
    { label: bn ? "নিয়োগদাতা তালিকা" : "Employer List", icon: <Building2 className="h-3.5 w-3.5 text-blue-600" />, action: () => navigate("/jobs/employers") },
    { label: bn ? "নতুন চাকরি" : "New Jobs", icon: <Sparkles className="h-3.5 w-3.5 text-green-600" />, action: () => {} },
    { label: bn ? "আগামীকাল শেষ" : "Deadline Tomorrow", icon: <CalendarClock className="h-3.5 w-3.5 text-red-600" />, action: () => {} },
    { label: bn ? "ইন্টার্নশিপ" : "Internship", icon: <GraduationCap className="h-3.5 w-3.5 text-purple-600" />, action: () => { setSelectedType("internship"); window.scrollTo({ top: 500, behavior: "smooth" }); } },
    { label: bn ? "চুক্তিভিত্তিক" : "Contractual Jobs", icon: <FileText className="h-3.5 w-3.5 text-orange-600" />, action: () => { setSelectedType("contract"); window.scrollTo({ top: 500, behavior: "smooth" }); } },
    { label: bn ? "পার্ট-টাইম" : "Part-time Jobs", icon: <Clock className="h-3.5 w-3.5 text-teal-600" />, action: () => { setSelectedType("part-time"); window.scrollTo({ top: 500, behavior: "smooth" }); } },
    { label: bn ? "বিদেশের চাকরি" : "Overseas Jobs", icon: <Globe className="h-3.5 w-3.5 text-cyan-600" />, action: () => { setSelectedCategory("overseas"); window.scrollTo({ top: 500, behavior: "smooth" }); } },
    { label: bn ? "রিমোট / ওয়ার্ক ফ্রম হোম" : "Remote / Work From Home", icon: <Laptop className="h-3.5 w-3.5 text-indigo-600" />, action: () => { setSelectedType("remote"); window.scrollTo({ top: 500, behavior: "smooth" }); } },
    { label: bn ? "ফ্রেশার চাকরি" : "Fresher Jobs", icon: <Zap className="h-3.5 w-3.5 text-amber-600" />, action: () => {} },
  ];

  return (
    <div className="hidden lg:block w-72 shrink-0 space-y-5">
      <div className="rounded-2xl border bg-card overflow-hidden sticky top-24 shadow-sm">
        {/* Top Employers */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-950/20">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            {bn ? "শীর্ষ নিয়োগদাতা" : "Top Employers"}
          </h3>
        </div>
        <div className="p-3">
          {topEmployers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{bn ? "কোনো তথ্য নেই" : "No data yet"}</p>
          ) : (
            <div className="space-y-1">
              {topEmployers.slice(0, 8).map((emp, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-colors cursor-pointer group" onClick={() => { setSearch(emp.name); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm overflow-hidden ${
                    emp.logo ? "bg-white p-1" : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20"
                  }`}>
                    {emp.logo ? (
                      <img src={emp.logo} alt={emp.name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate group-hover:text-blue-600 transition-colors">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.count} {bn ? "টি পদ" : "openings"}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-600 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Stats */}
        {stats?.topCategories && stats.topCategories.length > 0 && (
          <div className="p-3 pt-0">
            <div className="border-t pt-3">
              <h4 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">{bn ? "জনপ্রিয় ক্যাটেগরি" : "Popular Categories"}</h4>
              <div className="space-y-0.5">
                {stats.topCategories.slice(0, 5).map(([cat, count]: [string, number]) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex items-center justify-between w-full text-xs p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[cat] || "📋"}</span>
                      <span className="group-hover:text-blue-600 transition-colors">{getCatLabel(cat)}</span>
                    </span>
                    <Badge variant="outline" className="text-[9px] h-5 font-semibold">{count}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="p-3 pt-0">
          <div className="border-t pt-3">
            <h4 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">{bn ? "কুইক লিংক" : "Quick Links"}</h4>
            <div className="space-y-0.5">
              {quickLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={link.action}
                  className="flex items-center gap-2 w-full text-xs p-2 rounded-lg hover:bg-muted/50 transition-colors group text-left"
                >
                  {link.icon}
                  <span className="group-hover:text-blue-600 transition-colors flex-1">{link.label}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Links */}
        <div className="p-3 pt-0">
          <div className="border-t pt-3 space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9 rounded-lg" onClick={() => navigate("/jobs/post")}>
              <Plus className="h-3.5 w-3.5 text-blue-600" /> {bn ? "চাকরির বিজ্ঞাপন দিন" : "Post a Job (Free)"}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9 rounded-lg" onClick={() => navigate("/jobs/employers")}>
              <Building2 className="h-3.5 w-3.5 text-blue-600" /> {bn ? "নিয়োগদাতা তালিকা" : "Employer Directory"}
            </Button>
            {user && (
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9 rounded-lg" onClick={() => navigate("/jobs/profile")}>
                <FileText className="h-3.5 w-3.5 text-blue-600" /> {bn ? "অনলাইন CV তৈরি করুন" : "Build Your CV Online"}
              </Button>
            )}
            {!user && (
              <Button size="sm" className="w-full justify-start gap-2 text-xs h-9 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/login")}>
                <User className="h-3.5 w-3.5" /> {bn ? "রেজিস্ট্রেশন করুন" : "Register Now"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
