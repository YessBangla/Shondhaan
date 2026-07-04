import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Clock } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCmsServices } from "@/hooks/useCmsData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { getServiceImage } from "@/data/serviceImages";
import { allServices as localServices } from "@/data/services";

/**
 * Personalized "For You" section. Combines recently-viewed services with
 * AI-style category-affinity ranking: services in the same category as
 * the user's most recent views surface first, falling back to popular
 * city-available services. Hidden when there is no signal yet.
 */
const ForYouSection = () => {
  const { items: recent } = useRecentlyViewed();
  const { data: cmsServices = [] } = useCmsServices();
  const { language, t } = useLanguage();
  const { selectedCity } = useLocation();
  const bn = language === "bn";

  const localMap = useMemo(() => new Map(localServices.map((s) => [s.slug, s])), []);
  const cmsMap = useMemo(() => new Map(cmsServices.map((s) => [s.slug, s])), [cmsServices]);

  const ranked = useMemo(() => {
    if (recent.length === 0 || cmsServices.length === 0) return [];

    // Build category affinity score from recent views (newer = heavier)
    const catScore = new Map<string, number>();
    recent.forEach((r, idx) => {
      const s = cmsMap.get(r.slug);
      if (s?.category_id) {
        const w = recent.length - idx;
        catScore.set(s.category_id, (catScore.get(s.category_id) ?? 0) + w);
      }
    });

    const recentSlugs = new Set(recent.map((r) => r.slug));

    const scored = cmsServices
      .filter((s) => s.is_active && !recentSlugs.has(s.slug))
      .filter((s) => {
        const cities = Array.isArray(s.available_cities) ? (s.available_cities as string[]) : [];
        return cities.length === 0 || cities.includes(selectedCity);
      })
      .map((s) => {
        const affinity = s.category_id ? (catScore.get(s.category_id) ?? 0) : 0;
        const popularity = (s.total_orders ?? 0) / 100 + (s.rating ?? 0);
        return { s, score: affinity * 3 + popularity };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return scored.map(({ s }) => s);
  }, [recent, cmsServices, cmsMap, selectedCity]);

  if (recent.length < 2 || ranked.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="font-heading text-sm font-bold text-foreground md:text-base">
            {bn ? "আপনার জন্য" : "For You"}
          </h2>
        </div>
        <Link to="/all-services" className="text-xs font-semibold text-primary">
          {bn ? "সব দেখুন" : "See all"}
        </Link>
      </div>

      {/* Recent strip */}
      {recent.length > 0 && (
        <div className="mb-3 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {recent.slice(0, 8).map((r) => (
              <Link
                key={r.slug}
                to={`/service/${r.slug}`}
                className="group flex w-[120px] flex-shrink-0 flex-col gap-1.5"
              >
                <div className="aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted">
                  <img
                    src={r.image || getServiceImage(r.slug)}
                    alt={r.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  <span className="truncate">{bn ? "সম্প্রতি দেখা" : "Recently viewed"}</span>
                </div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">
                  {r.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations grid */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {ranked.map((s) => {
          const local = localMap.get(s.slug);
          const price = local?.packages?.[0]?.price;
          return (
            <Link
              key={s.id}
              to={`/service/${s.slug}`}
              className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={getServiceImage(s.slug, s.image_url)}
                  alt={bn ? s.title : (s.title_en || s.title)}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-2 md:p-3">
                <p className="line-clamp-2 text-xs font-semibold text-foreground md:text-sm">
                  {bn ? s.title : (s.title_en || s.title)}
                </p>
                {price ? (
                  <p className="mt-1 text-[11px] font-bold text-primary md:text-xs">
                    {bn ? `৳${price} থেকে` : `From ৳${price}`}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default ForYouSection;