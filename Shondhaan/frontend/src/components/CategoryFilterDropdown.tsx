import { useQuery } from "@tanstack/react-query";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { useLanguage } from "@/contexts/LanguageContext";
import { Filter, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CategoryFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CategoryFilterDropdown = ({ value, onChange, className }: CategoryFilterDropdownProps) => {
  const { data: categories = [] } = useCmsCategories();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCategories = categories
    .filter((c) => c.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const filteredCategories = activeCategories.filter((category) =>
    `${category.name} ${category.name_en || ""}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className={`relative flex items-center gap-2 ${className || ""}`}>
      <Filter className="h-3.5 w-3.5 text-userprimary shrink-0" />
      <button type="button" onClick={() => setOpen((current) => !current)} className="min-w-[180px] rounded-lg border border-input bg-background px-2.5 py-1.5 text-left text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
        {value === "all" ? (bn ? "সকল ক্যাটেগরি" : "All Categories") : (activeCategories.find((category) => String(category.id) === String(value))?.[bn ? "name" : "name_en"] || activeCategories.find((category) => String(category.id) === String(value))?.name || (bn ? "ক্যাটেগরি" : "Category"))}
      </button>
      {open && (
        <div className="absolute left-6 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={bn ? "ক্যাটেগরি খুঁজুন" : "Search category"} className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-7 text-xs outline-none focus:ring-1 focus:ring-userprimary" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button type="button" onClick={() => { onChange("all"); setOpen(false); setSearch(""); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50">{bn ? "সকল ক্যাটেগরি" : "All Categories"}</button>
            {filteredCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => { onChange(String(category.id)); setOpen(false); setSearch(""); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50">
                {bn ? category.name : (category.name_en || category.name)}
              </button>
            ))}
            {!filteredCategories.length && <p className="px-2 py-2 text-xs text-slate-500">{bn ? "কোনো ক্যাটেগরি পাওয়া যায়নি" : "No categories found"}</p>}
          </div>
        </div>
      )}
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
