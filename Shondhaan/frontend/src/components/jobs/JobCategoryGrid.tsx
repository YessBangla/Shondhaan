import { useState } from "react";
import { TrendingUp, ChevronDown, X } from "lucide-react";
import { JOB_CATEGORIES, JobCategory } from "@/hooks/useJobData";


const CATEGORY_ICONS: Record<string, string> = {
  it: "💻", marketing: "📢", sales: "📊", accounting: "🧮", engineering: "⚙️",
  healthcare: "🏥", education: "📚", garments: "👔", banking: "🏦", ngo: "🤝",
  government: "🏛️", driving: "🚗", construction: "🏗️", hospitality: "🏨",
  overseas: "✈️", parttime: "⏰", freelance: "💡", media: "📰", telecom: "📱",
  logistics: "🚚", pharma: "💊", retail: "🛍️", realestate: "🏠", general: "📋", other: "📁",
};

interface JobCategoryGridProps {
  bn: boolean;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  stats: any;
  // Live categories fetched from the backend (job_categories table), passed
  // down from JobHome. Falls back to the static JOB_CATEGORIES list only
  // if the parent hasn't fetched yet or the fetch failed — so this grid
  // shows whatever an admin has actually added/edited/reordered, not a
  // hardcoded list.
  categories?: JobCategory[];
}

export default function JobCategoryGrid({ bn, selectedCategory, setSelectedCategory, stats, categories }: JobCategoryGridProps) {
  const [showAll, setShowAll] = useState(false);
  const categoryList = categories && categories.length > 0 ? categories : JOB_CATEGORIES;
  const visible = showAll ? categoryList : categoryList.slice(0, 16);

  return (
    <div className="bg-card border-b">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-5">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          {bn ? "ক্যাটেগরি অনুযায়ী চাকরি খুঁজুন" : "Browse Jobs by Category"}
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
          {visible.map((cat) => {
            const count = stats?.categoryCounts?.[cat.value] || 0;
            return (
              <button
                key={cat.value}
                onClick={() => { setSelectedCategory(selectedCategory === cat.value ? "all" : cat.value); window.scrollTo({ top: 500, behavior: "smooth" }); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all hover:shadow-sm ${
                  selectedCategory === cat.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm" : "border-border hover:border-blue-300"
                }`}
              >
                <span className="text-xl">{CATEGORY_ICONS[cat.value] || "📋"}</span>
                <span className="text-[10px] font-medium line-clamp-1 leading-tight">{bn ? cat.labelBn : cat.labelEn}</span>
                {count > 0 && <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950/30 px-1.5 rounded-full">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {!showAll && categoryList.length > 16 && (
            <button onClick={() => setShowAll(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <ChevronDown className="h-3 w-3" /> {bn ? "সব ক্যাটেগরি দেখুন" : "Show All Categories"}
            </button>
          )}
          {selectedCategory !== "all" && (
            <button onClick={() => setSelectedCategory("all")} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> {bn ? "ফিল্টার মুছুন" : "Clear Filter"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}