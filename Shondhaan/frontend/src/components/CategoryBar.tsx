import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, MoreHorizontal } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/i18n/translations";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

import catAc from "@/assets/cat-ac.png";
import catAppliance from "@/assets/cat-appliance.png";
import catCleaning from "@/assets/cat-cleaning.png";
import catBeauty from "@/assets/cat-beauty.png";
import catShifting from "@/assets/cat-shifting.png";
import catHealth from "@/assets/cat-health.png";
import catElectrical from "@/assets/cat-electrical.png";
import catPainting from "@/assets/cat-painting.png";
import catDriver from "@/assets/cat-driver.png";

const fallbackCategories: { icon: string; labelKey: TranslationKey; slug: string }[] = [
  { icon: catAc, labelKey: "cat.acService", slug: "ac-service" },
  { icon: catAppliance, labelKey: "cat.applianceRepair", slug: "gas-stove" },
  { icon: catCleaning, labelKey: "cat.cleaning", slug: "cleaning" },
  { icon: catBeauty, labelKey: "cat.beauty", slug: "salon" },
  { icon: catShifting, labelKey: "cat.shifting", slug: "shifting" },
  { icon: catHealth, labelKey: "cat.healthCare", slug: "spa" },
  { icon: catElectrical, labelKey: "cat.electrical", slug: "electrical" },
  { icon: catPainting, labelKey: "cat.painting", slug: "painting" },
  { icon: catDriver, labelKey: "cat.driver", slug: "driver" },
];

const CATEGORIES_API_URL = `${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api/categories`;

type Category = {
  id: string | number;
  name?: string;
  name_en?: string | null;
  title?: string;
  title_en?: string | null;
  slug?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  color_gradient?: string | null;
  sort_order?: number | string | null;
  is_active?: boolean | number | string | null;
};

type CategoryBarProps = {
  categories?: Category[];
  selectedCategoryId?: string;
  onCategorySelect?: (id: string) => void;
};

const extractCategories = (payload: unknown): Category[] => {
  if (Array.isArray(payload)) return payload as Category[];

  const data = payload as {
    data?: Category[];
    categories?: Category[];
    results?: Category[];
    items?: Category[];
  } | null;

  return data?.data || data?.categories || data?.results || data?.items || [];
};

const extractCategory = (payload: unknown): Category | null => {
  const data = payload as { data?: Category; category?: Category; result?: Category } | Category | null;

  if (!data) return null;
  if ("id" in data) return data as Category;

  return data.data || data.category || data.result || null;
};

const isActiveCategory = (category: Category) => {
  return (
    category.is_active === true ||
    category.is_active === 1 ||
    category.is_active === "1" ||
    category.is_active === undefined ||
    category.is_active === null
  );
};

const categoryFallbackImages: Record<string, string> = {
  "ac-repair": catAc,
  "ac-service": catAc,
  "appliance-repair": catAppliance,
  "beauty-salon": catBeauty,
  "car-care": catDriver,
  "car-repair": catDriver,
  "cleaning": catCleaning,
  "computer-repair": catAppliance,
  "electrical": catElectrical,
  "electrical-services": catElectrical,
  "gardening": catCleaning,
  "home-shifting": catShifting,
  "laundry-dry-cleaning": catCleaning,
  "painting": catPainting,
  "pest-control": catCleaning,
  "plumbing": catAppliance,
};

const getCategoryImageUrl = (category: Category) => {
  return category.icon_url || category.image_url || "";
};

const getCategoryFallbackImage = (category: Category) => {
  return category.slug ? categoryFallbackImages[category.slug] : undefined;
};

const CategoryIcon = ({ category, label }: { category: Category; label: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = !imageFailed ? getCategoryImageUrl(category) : "";
  const fallbackImage = getCategoryFallbackImage(category);

  if (imageUrl || fallbackImage) {
    return (
      <img
        src={imageUrl || fallbackImage}
        alt={label}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-full md:p-4 lg:p-4 xl:p-4  w-full object-contain"
      />
    );
  }

  return (
    <div className={`h-full w-full rounded-full bg-gradient-to-br ${category.color_gradient || "from-blue-500 to-emerald-500"} flex items-center justify-center`}>
      <span className="text-base font-bold text-white">{(category.name || category.title || "?")[0]}</span>
    </div>
  );
};

/* ─── Premium Sheba-style Category Card (desktop + tablet) ─── */
const CategoryCard = ({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.95 }}
    className="group flex shrink-0 flex-col items-center gap-2 transition-all md:w-[110px]"
  >
    <motion.div 
      className={`flex h-20 w-20 items-center justify-center rounded-3xl transition-all duration-300 ${
        selected 
          ? "border border-2 border-primary" 
          : ""
      }`}
      animate={selected ? { scale: 1 } : { scale: 1 }}
    >
      <div className={`transition-all ${selected ? "brightness-110" : ""}`}>
        {icon}
      </div>
    </motion.div>
    <span className={`line-clamp-2 text-center text-[11px] font-semibold leading-tight transition-colors duration-300 md:text-xs ${
      selected 
        ? "text-blue-600 font-bold" 
        : "text-slate-600 group-hover:text-blue-600"
    }`}>
      {label}
    </span>
  </motion.button>
);

/* ─── Premium Mobile category tile ─── */
const MOBILE_TILE_BG = [
  "bg-gradient-to-br from-blue-100 to-blue-50",
  "bg-gradient-to-br from-emerald-100 to-emerald-50",
  "bg-gradient-to-br from-cyan-100 to-blue-50",
  "bg-gradient-to-br from-teal-100 to-emerald-50",
  "bg-gradient-to-br from-blue-100 to-cyan-50",
  "bg-gradient-to-br from-emerald-100 to-teal-50",
  "bg-gradient-to-br from-cyan-100 to-emerald-50",
  "bg-gradient-to-br from-teal-100 to-cyan-50",
];

const MobileCategoryTile = ({
  icon,
  label,
  selected,
  onClick,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
  index: number;
}) => (
  <motion.button
    onClick={onClick}
    aria-label={label}
    whileTap={{ scale: 0.92 }}
    className="press flex flex-col items-center gap-2 min-h-[100px] transition-all"
  >
    <motion.div 
      className={`flex h-16 w-16 items-center justify-center p-2.5 transition-all ${
        selected 
          ? "border border-2 border-primary rounded-3xl" 
          : ""
      }`}
      whileHover={!selected ? { y: -2 } : {}}
    >
      <div className={selected ? "brightness-110" : ""}>
        {icon}
      </div>
    </motion.div>
    <span className={`line-clamp-2 text-center text-[11px] font-semibold leading-tight transition-colors duration-300 ${
      selected 
        ? "text-emerald-600 font-bold" 
        : "text-slate-700"
    }`}>
      {label}
    </span>
  </motion.button>
);

/* ─── Main Component (Premium Style) ─── */
const CategoryBar = ({ categories = [], selectedCategoryId = "all", onCategorySelect }: CategoryBarProps) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const bn = language === "bn";
  const [apiCategories, setApiCategories] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    const fetchCategories = async () => {
      try {
        const response = await fetch(CATEGORIES_API_URL);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error((payload as { message?: string })?.message || "Failed to fetch categories");
        }

        if (alive) {
          setApiCategories(extractCategories(payload));
        }
      } catch (error) {
        console.error("CategoryBar category fetch failed:", error);
      }
    };

    fetchCategories();

    return () => {
      alive = false;
    };
  }, []);

  const sourceCategories = apiCategories.length > 0 ? apiCategories : categories;
  const activeCategories = sourceCategories
    .filter(isActiveCategory)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const useCms = activeCategories.length > 0;

  const categoryItems = useCms
    ? activeCategories.map((cat) => ({
        key: String(cat.id),
        label: bn
          ? cat.name || cat.title || ""
          : cat.name_en || cat.title_en || cat.name || cat.title || "",
        selected: String(cat.id) === String(selectedCategoryId),
        onClick: async () => {
          let selectedCategory = cat;

          if (cat.slug) {
            try {
              const response = await fetch(`${CATEGORIES_API_URL}/${encodeURIComponent(cat.slug)}`);
              const payload = await response.json().catch(() => ({}));

              if (response.ok) {
                selectedCategory = extractCategory(payload) || cat;
              } else {
                console.error("CategoryBar single category fetch failed:", payload);
              }
            } catch (error) {
              console.error("CategoryBar single category fetch failed:", error);
            }
          }

          if (onCategorySelect) {
            onCategorySelect(String(selectedCategory.id || cat.id));
            return;
          }

          navigate(`/all-services?category=${selectedCategory.id || cat.id}`);
        },
        icon: (
          <CategoryIcon
            category={cat}
            label={bn ? cat.name || cat.title || "" : cat.name_en || cat.title_en || cat.name || cat.title || ""}
          />
        ),
      }))
    : fallbackCategories.map((cat) => ({
        key: cat.labelKey,
        label: t(cat.labelKey),
        selected: false,
        onClick: () => navigate("/all-services"),
        icon: <img src={cat.icon} alt={t(cat.labelKey)} className="h-full w-full object-contain" />,
      }));

  const showAllCategories = () => {
    if (onCategorySelect) {
      onCategorySelect("all");
      return;
    }
    navigate("/all-services");
  };
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };
  return (
    <>
    {/* Mobile: Premium tiles with header - positioned over banner */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="md:hidden px-4"
      style={{
        marginTop: '-40px',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div className="mx-0 p-4 bg-white/75 backdrop-blur-lg border border-white/30 rounded-2xl shadow-xl mb-0">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            {bn ? "ক্যাটেগরি" : "Categories"}
          </h3>
          <motion.button
            onClick={showAllCategories}
            // whileHover={{ scale: 1.05 }}
            // whileTap={{ scale: 0.95 }}
            className="text-xs font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-3 py-1.5 rounded-full shadow-md hover:shadow-lg"
          >
            {bn ? "সব দেখুন" : "View all"}
          </motion.button>
        </div>
      <div className="grid grid-cols-4 gap-y-4 gap-x-2">
        {categoryItems.slice(0, 7).map((item, i) => (
          <MobileCategoryTile key={item.key} index={i} icon={item.icon} label={item.label} selected={item.selected} onClick={item.onClick} />
        ))}
        <motion.button
          onClick={showAllCategories}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          className="press flex flex-col items-center gap-2 min-h-[100px]"
          aria-label={bn ? "সব ক্যাটেগরি" : "All categories"}
        >
          <div className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 p-2 shadow-md transition-all ${
            selectedCategoryId === "all" 
              ? "ring-2 ring-emerald-400 bg-gradient-to-br from-blue-500 to-emerald-500" 
              : "hover:shadow-lg"
          }`}>
            <MoreHorizontal className={`h-6 w-6 ${selectedCategoryId === "all" ? "text-white" : "text-slate-600"}`} />
          </div>
          <span className={`line-clamp-1 text-center text-[11px] font-semibold leading-tight transition-colors ${
            selectedCategoryId === "all" 
              ? "text-emerald-600 font-bold" 
              : "text-slate-700"
          }`}>
            {bn ? "আরও" : "More"}
          </span>
        </motion.button>
      </div>
      </div>
    </motion.div>

    {/* Desktop / tablet: Premium card style - positioned over banner with glass effect */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="app-container relative z-20 hidden md:block"
      style={{
        marginTop: '-60px',
        position: 'relative',
      }}
    >
      <div className="p-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow hover:shadow-3xl transition-shadow duration-300">
        <div className="relative group">
          {/* Premium Scroll buttons */}
          <motion.button
            onClick={() => scroll("left")}
            // whileHover={{ scale: 1.1, x: -2 }}
            // whileTap={{ scale: 0.95 }}
            className="absolute -left-9 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg hover:shadow-xl md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <motion.button
            onClick={() => scroll("right")}
            // whileHover={{ scale: 1.1, x: 2 }}
            // whileTap={{ scale: 0.95 }}
            className="absolute -right-9 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white shadow-lg hover:shadow-xl md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 md:gap-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categoryItems.map((item) => (
              <CategoryCard key={item.key} icon={item.icon} label={item.label} selected={item.selected} onClick={item.onClick} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};

export default CategoryBar;