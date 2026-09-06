import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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

// Helper to fix relative image URLs coming from the backend
const getStaticBaseUrl = () => {
  try {
    return new URL(INDIVIDUAL_API_BASE_URL).origin;
  } catch {
    return INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  }
};
const STATIC_BASE_URL = getStaticBaseUrl();

const getImageSrc = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${STATIC_BASE_URL}${path}`;
};

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
  const rawUrl = category.icon_url || category.image_url || "";
  return getImageSrc(rawUrl);
};

const getCategoryFallbackImage = (category: Category) => {
  return category.slug ? categoryFallbackImages[category.slug] : undefined;
};

const CategoryIcon = ({ category, label }: { category: Category; label: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const icon_url = getCategoryImageUrl(category);
  const fallbackImage = getCategoryFallbackImage(category);

  const isFullUrl = (url: string | null | undefined) =>
    !!url && /^https?:\/\//i.test(url);

  const imageSrc = imageFailed || !icon_url
    ? fallbackImage
    : isFullUrl(icon_url)
    ? icon_url
    : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${icon_url}`;

  if (!imageSrc) return null;

  return (
    <img
      src={imageSrc}
      alt={label}
      referrerPolicy="no-referrer"
      onError={() => setImageFailed(true)}
      className="h-full md:p-4 lg:p-4 xl:p-4 w-full object-contain"
    />
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
      className={`flex h-10 w-10 md:h-20 md:w-20 items-center justify-center rounded-3xl transition-all duration-300 ${
        selected
          ? "border-primary"
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
        ? "text-emerald-600 font-bold" 
        : "text-slate-600 group-hover:text-emerald-600"
    }`}>
      {label}
    </span>
  </motion.button>
);

/* ─── Premium Mobile category tile ─── */
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
          ? "border-primary rounded-3xl"
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
        onClick: () => {
          navigate(`/all-services?category=${cat.id}`);
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
    navigate("/all-services");
  };

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  return (
    <>

    {/* Desktop / tablet: Premium card style - positioned over banner with glass effect */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="app-container relative z-20 block mt-[30px] sm:-mt-[60px]"
      style={{
        position: 'relative',
      }}>
      <div className="flex md:hidden">
        <h2 className="font-bold m-0 p-0 w-full">{bn ? "ক্যাটাগরি" : "Categories"}</h2>
        <Link to="/all-services" className="text-xs text-nowrap font-semibold text-primary flex">
          {bn ? "সব দেখুন" : "See all"} <ChevronRight className="h-3 w-3 my-auto font-semibold" />
        </Link>
      </div>
      <div className="p-4 bg-transparent md:bg-white/80 backdrop-blur-xl border border-white/40 md:rounded-3xl md:shadow hover:shadow-3xl transition-shadow duration-300">

        {/* group on this div so group-hover controls the button visibility */}
        <div className="relative group">

          {/* Left scroll button — hidden by default, visible on group hover */}
          <motion.button
            onClick={() => scroll("left")}
            className="absolute -left-7 -md:left-9 top-1/2 z-10 h-6 w-6 md:h-10 md:w-10 -translate-y-1/2 items-center justify-center rounded-full md:bg-gradient-to-br from-blue-500 to-emerald-500 text-foreground md:text-white md:shadow-lg hover:shadow-xl md:flex opacity-0 md:opacity-0 lg:group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300"
            aria-label="Scroll left">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>

          {/* Right scroll button — hidden by default, visible on group hover */}
          <motion.button
            onClick={() => scroll("right")}
            className="absolute -right-7 -md:right-9 top-1/2 z-10 h-6 w-6 md:h-10 md:w-10 -translate-y-1/2 items-center justify-center rounded-full md:bg-gradient-to-br from-emerald-500 to-blue-500 text-foreground md:text-white md:shadow-lg hover:shadow-xl md:flex opacity-0 md:opacity-0 lg:group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300"
            aria-label="Scroll right">
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