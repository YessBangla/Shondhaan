import { useQuery } from "@tanstack/react-query";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { useLanguage } from "@/contexts/LanguageContext";
import { Filter } from "lucide-react";

interface CategoryFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CategoryFilterDropdown = ({ value, onChange, className }: CategoryFilterDropdownProps) => {
  const { data: categories = [] } = useCmsCategories();
  const { language } = useLanguage();
  const bn = language === "bn";

  const activeCategories = categories
    .filter((c) => c.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Filter className="h-3.5 w-3.5 text-userprimary shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring min-w-[140px]"
      >
        <option value="all">{bn ? "সকল ক্যাটেগরি" : "All Categories"}</option>
        {activeCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {bn ? cat.name : (cat.name_en || cat.name)}
          </option>
        ))}
      </select>
    </div>
  );
};

/** Hook: returns a Map<service_slug, category_id> for filtering bookings by category */
export function useServiceCategoryMap() {
  const { data: services = [] } = useCmsServices();

  return useQuery({
    queryKey: ["service-category-map", services],
    queryFn: () => {
      const map = new Map<string, string>();
      services.forEach((s) => {
        if (s.category_id) map.set(s.slug, s.category_id);
      });
      return map;
    },
    enabled: services.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export default CategoryFilterDropdown;
