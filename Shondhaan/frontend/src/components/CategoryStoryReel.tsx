import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCmsCategories } from "@/hooks/useCmsData";
import { haptic } from "@/lib/haptics";

/**
 * Mobile-only horizontally scrollable "story-reel" of categories.
 * Sits below the main category grid for fast access — Instagram-style.
 */
const CategoryStoryReel = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: cmsCategories = [] } = useCmsCategories();
  const cats = cmsCategories.filter((c) => c.is_active);

  if (cats.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="md:hidden mt-2 px-4"
    >
      <div
        className="flex gap-3 overflow-x-auto pb-1.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cats.slice(0, 12).map((cat) => {
          const label = bn ? cat.name : (cat.name_en || cat.name);
          return (
            <button
              key={cat.id}
              onClick={() => { haptic("selection"); navigate(`/all-services?category=${cat.id}`); }}
              className="flex w-[64px] shrink-0 flex-col items-center gap-1 active:scale-95 transition-transform"
            >
              <span className="relative inline-flex h-[58px] w-[58px] items-center justify-center rounded-full p-[2px] bg-gradient-to-tr from-primary via-emerald-400 to-teal-300">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-card overflow-hidden">
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt={label} className="h-9 w-9 object-contain" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{label.slice(0, 2)}</span>
                  )}
                </span>
              </span>
              <span className="line-clamp-1 w-full text-center text-[10px] font-medium text-foreground/80">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CategoryStoryReel;