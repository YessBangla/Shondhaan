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
        className="h-full w-full object-contain"
      />
    );
  }

  return (
    <div className={`h-full w-full rounded-full bg-gradient-to-br ${category.color_gradient || "from-primary to-primary/70"} flex items-center justify-center`}>
      <span className="text-base font-bold text-white">{(category.name || category.title || "?")[0]}</span>
    </div>
  );
};

/* ─── Sheba-style Category Card (desktop + tablet) ─── */
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
  <button
    onClick={onClick}
    className="group flex w-[88px] shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform md:w-[110px] md:gap-2"
  >
    <div className={`flex h-16 w-16 items-center justify-center rounded-full p-2 transition-all duration-300 group-hover:bg-primary/10 group-hover:shadow-md md:h-20 md:w-20 md:p-3 ${selected ? "bg-primary/15 ring-2 ring-primary/30" : "bg-primary/5"}`}>
      {icon}
    </div>
    <span className={`line-clamp-2 text-center text-[11px] font-semibold leading-tight transition-colors group-hover:text-primary md:text-xs ${selected ? "text-primary" : "text-foreground/80"}`}>
      {label}
    </span>
  </button>
);

/* ─── Mobile category pill (per mockup): rounded soft tile + label below ─── */
const MOBILE_TILE_BG = [
  "bg-amber-100",
  "bg-emerald-100",
  "bg-sky-100",
  "bg-violet-100",
  "bg-rose-100",
  "bg-orange-100",
  "bg-teal-100",
  "bg-fuchsia-100",
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
  <button
    onClick={onClick}
    aria-label={label}
    className="press flex flex-col items-center gap-1.5 min-h-[88px] focus-visible:ring-2 focus-visible:ring-mobile-accent/50 focus-visible:rounded-2xl"
  >
    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl p-2.5 shadow-sm ${selected ? "ring-2 ring-mobile-accent/60" : ""} ${MOBILE_TILE_BG[index % MOBILE_TILE_BG.length]}`}>
      {icon}
    </div>
    <span className={`line-clamp-2 text-center text-[11px] font-semibold leading-tight ${selected ? "text-mobile-accent" : "text-foreground/85"}`}>
      {label}
    </span>
  </button>
);

/* ─── Main Component (Sheba-style) ─── */
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
    {/* Mobile: clean tiles with header (per mockup) */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="md:hidden mt-3 px-4"
    >
      <div className="mb-2.5 flex items-center justify-between pr-14">
        <h3 className="text-[15px] font-bold text-foreground">
          {bn ? "ক্যাটেগরি" : "Categories"}
        </h3>
        <button
          onClick={showAllCategories}
          className="press text-xs font-semibold text-mobile-accent"
        >
          {bn ? "সব দেখুন" : "View all"}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-y-3 gap-x-2">
        {categoryItems.slice(0, 7).map((item, i) => (
          <MobileCategoryTile key={item.key} index={i} icon={item.icon} label={item.label} selected={item.selected} onClick={item.onClick} />
        ))}
        <button
          onClick={showAllCategories}
          className="press flex flex-col items-center gap-1.5 min-h-[88px]"
          aria-label={bn ? "সব ক্যাটেগরি" : "All categories"}
        >
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary p-2 shadow-sm ${selectedCategoryId === "all" ? "ring-2 ring-mobile-accent/60" : ""}`}>
            <MoreHorizontal className="h-6 w-6 text-foreground/70" />
          </div>
          <span className={`line-clamp-1 text-center text-[11px] font-semibold leading-tight ${selectedCategoryId === "all" ? "text-mobile-accent" : "text-foreground/85"}`}>
            {bn ? "আরও" : "More"}
          </span>
        </button>
      </div>
    </motion.div>

    {/* Desktop / tablet: existing card style */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="app-container relative -mt-10 z-20 hidden md:-mt-12 md:block"
    >
      <div className="rounded-2xl border border-border/40 bg-card p-3 shadow-xl sm:p-4 md:p-6">
        <div className="relative group">
          {/* Scroll buttons (desktop) */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 md:gap-3"
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
