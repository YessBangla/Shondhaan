import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Grid3X3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MartCategory } from "@/hooks/useMartData";

interface Props {
  categories: MartCategory[];
}

const MartMegaMenu = ({ categories }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = categories.find((c) => c.id === hoveredId);

  return (
    <div className="hidden md:block bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden">
      <div className="flex">
        {/* Left: parent categories */}
        <div className="w-60 border-r border-border/50 max-h-[400px] overflow-y-auto">
          <div className="p-2 border-b border-border/50">
            <h3 className="text-xs font-bold text-muted-foreground px-2 py-1 flex items-center gap-1">
              <Grid3X3 className="h-3 w-3" /> {bn ? "সকল ক্যাটাগরি" : "ALL CATEGORIES"}
            </h3>
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onMouseEnter={() => setHoveredId(cat.id)}
              onClick={() => navigate(`/mart/category/${cat.slug}`)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors ${hoveredId === cat.id ? "bg-primary/5 text-primary" : ""}`}
            >
              <span className="flex items-center gap-2">
                {cat.icon_url ? <img src={cat.icon_url} className="h-5 w-5 object-contain" /> : null}
                {bn ? cat.name : (cat.name_en || cat.name)}
              </span>
              {cat.children && cat.children.length > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>

        {/* Right: subcategories */}
        {hovered?.children && hovered.children.length > 0 && (
          <div className="flex-1 p-4 max-h-[400px] overflow-y-auto">
            <h4 className="font-bold text-sm mb-3">{bn ? hovered.name : (hovered.name_en || hovered.name)}</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {hovered.children.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => navigate(`/mart/category/${sub.slug}`)}
                  className="text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  {bn ? sub.name : (sub.name_en || sub.name)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MartMegaMenu;
