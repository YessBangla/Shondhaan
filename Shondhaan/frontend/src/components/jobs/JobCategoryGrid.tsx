import { useState } from "react";
import { TrendingUp, ChevronDown, X } from "lucide-react";
import { JOB_CATEGORIES, JobCategory } from "@/hooks/useJobData";

const CATEGORY_ICONS: Record<string, string> = {
  it: "💻",
  marketing: "📢",
  sales: "📊",
  accounting: "🧮",
  engineering: "⚙️",
  healthcare: "🏥",
  education: "📚",
  garments: "👔",
  banking: "🏦",
  ngo: "🤝",
  government: "🏛️",
  driving: "🚗",
  construction: "🏗️",
  hospitality: "🏨",
  overseas: "✈️",
  parttime: "⏰",
  freelance: "💡",
  media: "📰",
  telecom: "📱",
  logistics: "🚚",
  pharma: "💊",
  retail: "🛍️",
  realestate: "🏠",
  general: "📋",
  other: "📁",
};

interface JobCategoryGridProps {
  bn: boolean;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  stats: any;
  categories?: JobCategory[];
}

export default function JobCategoryGrid({
  bn,
  selectedCategory,
  setSelectedCategory,
  stats,
  categories,
}: JobCategoryGridProps) {
  const [showAll, setShowAll] = useState(false);

  const categoryList =
    categories && categories.length > 0 ? categories : JOB_CATEGORIES;

  // Mobile: 8 initially
  // Desktop: 16 initially
  const mobileLimit = 4;
  const desktopLimit = 16;

  const visible = showAll
    ? categoryList
    : categoryList.slice(0, desktopLimit);

  const handleCategoryClick = (value: string) => {
    setSelectedCategory(selectedCategory === value ? "all" : value);

    window.scrollTo({
      top: 500,
      behavior: "smooth",
    });
  };

  return (
    <div className="bg-card border-b">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 md:py-5">

        {/* Heading */}
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />

          <span>
            {bn
              ? "ক্যাটেগরি অনুযায়ী চাকরি খুঁজুন"
              : "Browse Jobs by Category"}
          </span>
        </h2>

        {/* Mobile categories */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {categoryList
            .slice(0, showAll ? categoryList.length : mobileLimit)
            .map((cat) => {
              const count = stats?.categoryCounts?.[cat.value] || 0;
              const active = selectedCategory === cat.value;

              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  className={`
                    min-w-0 flex items-center gap-2
                    rounded-xl border px-3 py-2.5
                    text-left transition-all
                    active:scale-[0.98]
                    ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "border-border hover:border-blue-300"
                    }
                  `}
                >
                  {/* Icon */}
                  <span className="text-lg shrink-0">
                    {CATEGORY_ICONS[cat.value] || "📋"}
                  </span>

                  {/* Text */}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium truncate">
                      {bn ? cat.labelBn : cat.labelEn}
                    </span>

                    {count > 0 && (
                      <span className="text-[9px] text-blue-600 font-semibold">
                        {count} {bn ? "টি চাকরি" : "jobs"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>

        {/* Tablet + Desktop categories */}
        <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {visible.map((cat) => {
            const count = stats?.categoryCounts?.[cat.value] || 0;
            const active = selectedCategory === cat.value;

            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={`
                  min-w-0 flex flex-col items-center gap-1
                  p-2.5 rounded-xl border text-center
                  transition-all hover:shadow-sm
                  ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
                      : "border-border hover:border-blue-300"
                  }
                `}
              >
                <span className="text-xl">
                  {CATEGORY_ICONS[cat.value] || "📋"}
                </span>

                <span className="text-[10px] font-medium line-clamp-1 leading-tight">
                  {bn ? cat.labelBn : cat.labelEn}
                </span>

                {count > 0 && (
                  <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950/30 px-1.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-4 mt-3">

          {/* Show all */}
          {categoryList.length > mobileLimit && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ChevronDown className="h-3 w-3" />

              {bn ? "সব ক্যাটেগরি দেখুন" : "Show All Categories"}
            </button>
          )}

          {/* Clear filter */}
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-red-500 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />

              {bn ? "ফিল্টার মুছুন" : "Clear Filter"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}