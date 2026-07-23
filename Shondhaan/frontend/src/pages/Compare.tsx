import { useNavigate } from "react-router-dom";
import { getServiceImage } from "@/data/serviceImages";
import { ChevronLeft, Star, ShoppingBag, X, GitCompareArrows, Plus } from "lucide-react";
import { useCompare } from "@/contexts/CompareContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CmsServicePackage } from "@/hooks/useCmsData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import type { CmsService } from "@/hooks/useCmsData";
import type { NavigateFunction } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

interface MobileSideBySideProps {
  compareList: CmsService[];
  allPackages: CmsServicePackage[];
  allFeatures: string[];
  features: (s: CmsService) => string[];
  getTitle: (s: CmsService) => string;
  removeFromCompare: (slug: string) => void;
  navigate: NavigateFunction;
  bn: boolean;
}

const COL_W = 132; // px per service column on mobile

const MobileSideBySide = ({
  compareList,
  allPackages,
  allFeatures,
  features,
  getTitle,
  removeFromCompare,
  navigate,
  bn,
}: MobileSideBySideProps) => {
  const minPriceFor = (s: CmsService) => {
    const pkgs = allPackages.filter((p) => p.service_id === s.id);
    return pkgs.length > 0 ? Math.min(...pkgs.map((p) => p.price)) : null;
  };

  const rows: { label: string; render: (s: CmsService) => React.ReactNode; alt?: boolean }[] = [
    {
      label: bn ? "রেটিং" : "Rating",
      render: (s) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {(s.rating ?? 4.5).toFixed(1)}
        </span>
      ),
    },
    {
      label: bn ? "রিভিউ" : "Reviews",
      render: (s) => <span className="text-sm text-foreground">{s.total_reviews ?? 0}+</span>,
      alt: true,
    },
    {
      label: bn ? "অর্ডার" : "Orders",
      render: (s) => <span className="text-sm text-foreground">{s.total_orders ?? 0}+</span>,
    },
    {
      label: bn ? "শুরু মূল্য" : "Starting Price",
      render: (s) => {
        const m = minPriceFor(s);
        return <span className="text-sm font-bold text-primary">{m ? `৳${m}` : "—"}</span>;
      },
      alt: true,
    },
  ];

  return (
    <div className="flex border-y border-border bg-card">
      {/* Sticky labels column */}
      <div className="shrink-0 w-[112px] border-r border-border bg-card sticky left-0 z-10">
        {/* spacer for header (image + title + remove) */}
        <div className="h-[168px] border-b border-border" />
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`h-[52px] flex items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border ${
              r.alt ? "bg-secondary/40" : ""
            }`}
          >
            {r.label}
          </div>
        ))}
        {allFeatures.map((f, i) => (
          <div
            key={f}
            className={`min-h-[44px] flex items-center px-3 text-[11px] font-medium text-muted-foreground border-b border-border ${
              i % 2 === 0 ? "" : "bg-secondary/40"
            }`}
          >
            <span className="line-clamp-2">{f}</span>
          </div>
        ))}
        <div className="h-[60px] border-b border-border" />
      </div>

      {/* Horizontally scrollable service columns */}
      <div
        className="flex-1 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex" style={{ width: `${compareList.length * COL_W}px` }}>
          {compareList.map((s) => (
            <div
              key={s.slug}
              className="border-r border-border last:border-r-0"
              style={{ width: `${COL_W}px`, flex: `0 0 ${COL_W}px` }}
            >
              {/* Header cell — image, title, remove */}
              <div className="h-[168px] border-b border-border p-2 flex flex-col items-center text-center relative">
                <button
                  onClick={() => removeFromCompare(s.slug)}
                  aria-label={bn ? "সরান" : "Remove"}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  onClick={() => navigate(`/service/${s.slug}`)}
                  className="yess-wm h-16 w-16 overflow-hidden rounded-xl border border-border mt-1"
                >
                  <img src={getServiceImage(s.slug, s.image_url)} alt={getTitle(s)} className="h-full w-full object-cover" />
                </button>
                <button
                  onClick={() => navigate(`/service/${s.slug}`)}
                  className="mt-2 text-[11px] font-bold text-foreground hover:text-primary line-clamp-2 leading-tight"
                >
                  {getTitle(s)}
                </button>
              </div>

              {/* Data rows */}
              {rows.map((r) => (
                <div
                  key={r.label}
                  className={`h-[52px] flex items-center justify-center px-2 border-b border-border ${
                    r.alt ? "bg-secondary/40" : ""
                  }`}
                >
                  {r.render(s)}
                </div>
              ))}

              {/* Feature checkmarks */}
              {allFeatures.map((f, i) => (
                <div
                  key={f}
                  className={`min-h-[44px] flex items-center justify-center px-2 border-b border-border ${
                    i % 2 === 0 ? "" : "bg-secondary/40"
                  }`}
                >
                  {features(s).includes(f) ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-sm">—</span>
                  )}
                </div>
              ))}

              {/* Action */}
              <div className="h-[60px] flex items-center justify-center px-2 border-b border-border">
                <button
                  onClick={() => navigate(`/service/${s.slug}`)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  <ShoppingBag className="h-3 w-3" />
                  {bn ? "অর্ডার" : "Order"}
                </button>
              </div>
            </div>
          ))}

          {/* Add slot */}
          {compareList.length < 3 && (
            <button
              onClick={() => navigate("/all-services")}
              className="border-r border-border last:border-r-0 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors"
              style={{ width: `${COL_W}px`, flex: `0 0 ${COL_W}px` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{bn ? "যোগ করুন" : "Add"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


const Compare = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare } = useCompare();
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "সার্ভিস তুলনা" : "Compare Services",
    description: bn
      ? "একসাথে ৩টি পর্যন্ত সার্ভিস তুলনা করুন — মূল্য, রেটিং এবং বৈশিষ্ট্য দেখে সেরাটি বেছে নিন।"
      : "Compare up to 3 services side by side — pick the best by price, rating and features.",
    canonical: "/compare",
    noindex: true,
    locale: bn ? "bn_BD" : "en_US",
  });

  const serviceIds = compareList.map((s) => s.id);
  const { data: allPackages = [] } = useQuery({
    queryKey: ["compare-packages", serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("cms_service_packages")
        .select("*")
        .in("service_id", serviceIds)
        .order("sort_order");
      if (error) throw error;
      return data as CmsServicePackage[];
    },
    enabled: serviceIds.length > 0,
  });

  if (compareList.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitCompareArrows className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-1">
            {bn ? "সেবা তুলনা" : "Compare Services"}
          </h2>
          <p className="text-muted-foreground text-sm mb-5 max-w-xs">
            {bn ? "যেকোনো সেবা কার্ডে তুলনা আইকনে ট্যাপ করে ২-৩টি সেবা যোগ করুন" : "Tap the compare icon on any service card to add 2-3 services"}
          </p>
          <button onClick={() => navigate("/all-services")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "সেবা দেখুন" : "Browse Services"}
          </button>
        </div>
      </div>
    );
  }

  const getTitle = (s: typeof compareList[0]) => bn ? s.title : s.title_en || s.title;
  const features = (s: typeof compareList[0]) => Array.isArray(s.features) ? (s.features as string[]) : [];

  // Collect all unique features
  const allFeatures = [...new Set(compareList.flatMap((s) => features(s)))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="app-container py-5 md:py-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            {bn ? "সেবা তুলনা" : "Service Comparison"}
          </h1>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {compareList.length}/3
          </span>
        </div>

        {/* Mobile: side-by-side cards (sticky labels + horizontal scroll for service cells) */}
        <div className="md:hidden -mx-4">
          <MobileSideBySide
            compareList={compareList}
            allPackages={allPackages}
            allFeatures={allFeatures}
            features={features}
            getTitle={getTitle}
            removeFromCompare={removeFromCompare}
            navigate={navigate}
            bn={bn}
          />
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse min-w-[500px]">
            {/* Header - service images & names */}
            <thead>
              <tr>
                <th className="w-[120px] md:w-[160px] p-2 text-left text-xs font-medium text-muted-foreground align-bottom">
                  {bn ? "বৈশিষ্ট্য" : "Feature"}
                </th>
                {compareList.map((s) => (
                  <th key={s.slug} className="p-2 text-center align-bottom">
                    <div className="relative inline-block">
                      <button
                        onClick={() => removeFromCompare(s.slug)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="yess-wm mx-auto h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-xl border border-border">
                        <img
                          src={getServiceImage(s.slug, s.image_url)}
                          alt={getTitle(s)}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/service/${s.slug}`)}
                      className="mt-2 text-xs md:text-sm font-semibold text-foreground hover:text-primary block mx-auto"
                    >
                      {getTitle(s)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Rating */}
              <tr className="border-t border-border">
                <td className="p-3 text-xs font-medium text-muted-foreground">{bn ? "রেটিং" : "Rating"}</td>
                {compareList.map((s) => (
                  <td key={s.slug} className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {s.rating ?? 4.5}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Reviews */}
              <tr className="border-t border-border bg-secondary/30">
                <td className="p-3 text-xs font-medium text-muted-foreground">{bn ? "রিভিউ" : "Reviews"}</td>
                {compareList.map((s) => (
                  <td key={s.slug} className="p-3 text-center text-sm text-foreground">
                    {s.total_reviews ?? 0}+
                  </td>
                ))}
              </tr>

              {/* Orders */}
              <tr className="border-t border-border">
                <td className="p-3 text-xs font-medium text-muted-foreground">{bn ? "অর্ডার" : "Orders"}</td>
                {compareList.map((s) => (
                  <td key={s.slug} className="p-3 text-center text-sm text-foreground">
                    {s.total_orders ?? 0}+
                  </td>
                ))}
              </tr>

              {/* Starting Price */}
              <tr className="border-t border-border bg-secondary/30">
                <td className="p-3 text-xs font-medium text-muted-foreground">{bn ? "শুরু মূল্য" : "Starting Price"}</td>
                {compareList.map((s) => {
                  const pkgs = allPackages.filter((p) => p.service_id === s.id);
                  const minPrice = pkgs.length > 0 ? Math.min(...pkgs.map((p) => p.price)) : null;
                  return (
                    <td key={s.slug} className="p-3 text-center text-sm font-bold text-primary">
                      {minPrice ? `৳${minPrice}` : "—"}
                    </td>
                  );
                })}
              </tr>

              {/* Features */}
              {allFeatures.map((feat, i) => (
                <tr key={feat} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/30"}`}>
                  <td className="p-3 text-xs font-medium text-muted-foreground">{feat}</td>
                  {compareList.map((s) => (
                    <td key={s.slug} className="p-3 text-center">
                      {features(s).includes(feat) ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">✓</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Action row */}
              <tr className="border-t border-border">
                <td className="p-3"></td>
                {compareList.map((s) => (
                  <td key={s.slug} className="p-3 text-center">
                    <button
                      onClick={() => navigate(`/service/${s.slug}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {bn ? "অর্ডার করুন" : "Order Now"}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Compare;
