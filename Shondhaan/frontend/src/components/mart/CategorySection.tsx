import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface Category {
  id: number;
  name: string;
  name_en?: string;
  slug?: string;
  icon_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  children?: Category[];
}

interface CategoryStripProps {
  categories: Category[];
}

const CategoryStrip = ({ categories }: CategoryStripProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  if (!categories || categories.length === 0) return null;

  const getCatImage = (cat: Category): string | null =>
    cat.image_url || cat.thumbnail_url || null;

  const getFallbackEmoji = (name: string): string => {
    const n = (name || "").toLowerCase();
    if (n.includes("grocery") || n.includes("মুদি") || n.includes("food")) return "🛒";
    if (n.includes("electronic") || n.includes("gadget")) return "📱";
    if (n.includes("fashion") || n.includes("cloth") || n.includes("পোশাক")) return "👗";
    if (n.includes("beauty") || n.includes("cosmetic")) return "💄";
    if (n.includes("home") || n.includes("furniture")) return "🏠";
    if (n.includes("toy") || n.includes("খেলনা")) return "🧸";
    if (n.includes("sport") || n.includes("fitness")) return "🏃";
    if (n.includes("book") || n.includes("বই")) return "📚";
    if (n.includes("computer") || n.includes("laptop")) return "💻";
    if (n.includes("health") || n.includes("medicine")) return "🧴";
    if (n.includes("vegetable") || n.includes("fruit")) return "🥦";
    if (n.includes("meat") || n.includes("fish")) return "🍖";
    if (n.includes("dairy") || n.includes("milk")) return "🥛";
    if (n.includes("shoe") || n.includes("footwear")) return "👟";
    if (n.includes("watch") || n.includes("jewel")) return "⌚";
    if (n.includes("kitchen") || n.includes("cook")) return "🍳";
    if (n.includes("baby") || n.includes("infant")) return "🍼";
    if (n.includes("pet") || n.includes("animal")) return "🐾";
    if (n.includes("car") || n.includes("vehicle")) return "🚗";
    if (n.includes("tool") || n.includes("hardware")) return "🔧";
    if (n.includes("game") || n.includes("gaming")) return "🎮";
    if (n.includes("garden") || n.includes("plant")) return "🌱";
    if (n.includes("travel") || n.includes("luggage")) return "🧳";
    if (n.includes("photo") || n.includes("camera")) return "📷";
    return "📦";
  };

  const getFallbackBg = (index: number): string => {
    const colors = ["#EEF2FF","#FFF7ED","#F0FDF4","#FDF4FF","#FFF1F2","#F0FDFA","#FEFCE8","#EFF6FF"];
    return colors[index % colors.length];
  };

  const displayCategories = categories.slice(0, 16);

  return (
    <section className="mb-7">
      <h2 className="text-[15px] md:text-[17px] font-bold text-foreground mb-4">
        {bn ? "ক্যাটাগরি" : "Categories"}
      </h2>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {displayCategories.map((cat, index) => {
          const image = getCatImage(cat);
          const label = bn ? cat.name : cat.name_en || cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/mart/category/${cat.slug ?? cat.id}`)}
              className="group flex flex-col items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden hover:border-orange-300 hover:shadow-md transition-all duration-150 focus:outline-none"
            >
              {/* Image */}
              <div className="w-full aspect-square relative overflow-hidden bg-gray-50 dark:bg-zinc-800">
                {image ? (
                  <img
                    src={image}
                    alt={label}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.style.background = getFallbackBg(index);
                        const span = document.createElement("span");
                        span.style.cssText =
                          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.75rem;";
                        span.textContent = getFallbackEmoji(cat.name);
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl md:text-3xl"
                    style={{ background: getFallbackBg(index) }}
                  >
                    {getFallbackEmoji(cat.name)}
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="w-full px-1.5 py-2 text-center">
                <span className="block text-[10px] md:text-[11px] leading-tight font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryStrip;