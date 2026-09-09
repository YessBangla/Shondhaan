import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

interface CrumbOverride {
  segment: string;
  label: string;
}

interface Props {
  overrides?: CrumbOverride[];
  className?: string;
}

const STATIC_LABELS: Record<string, { bn: string; en: string }> = {
  "all-services": { bn: "সকল সার্ভিস", en: "All Services" },
  service: { bn: "সার্ভিস", en: "Service" },
  bookings: { bn: "বুকিং", en: "Bookings" },
  profile: { bn: "প্রোফাইল", en: "Profile" },
  checkout: { bn: "চেকআউট", en: "Checkout" },
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  mart: { bn: "মার্ট", en: "Mart" },
  home: { bn: "হোম", en: "Home" },
  category: { bn: "ক্যাটেগরি", en: "Category" },
  product: { bn: "পণ্য", en: "Product" },
  wishlist: { bn: "উইশলিস্ট", en: "Wishlist" },
  orders: { bn: "অর্ডার", en: "Orders" },
  compare: { bn: "তুলনা", en: "Compare" },
  deal: { bn: "ডিল", en: "Deal" },
  jobs: { bn: "চাকরি", en: "Jobs" },
  faq: { bn: "FAQ", en: "FAQ" },
  about: { bn: "আমাদের সম্পর্কে", en: "About Us" },
  contact: { bn: "যোগাযোগ", en: "Contact" },
};

/**
 * Auto-generates breadcrumb trail from the current pathname with friendly,
 * bilingual labels. Pass `overrides` to inject dynamic titles (e.g. service name).
 */
export default function SmartBreadcrumb({ overrides = [], className }: Props) {
  const location = useLocation();
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  const crumbs = useMemo(() => {
    const segs = location.pathname.split("/").filter(Boolean);
    const overrideMap = new Map(overrides.map((o) => [o.segment, o.label]));
    return segs.map((seg, i) => {
      const path = "/" + segs.slice(0, i + 1).join("/");
      let label = overrideMap.get(seg) || STATIC_LABELS[seg]?.[bn ? "bn" : "en"];
      if (!label) {
        label = decodeURIComponent(seg)
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return { path, label, isLast: i === segs.length - 1 };
    });
  }, [location.pathname, overrides, bn]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-xs ${className || ""}`}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <li>
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3 w-3" />
            <span className="sr-only">{bn ? "হোম" : "Home"}</span>
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.path} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-60" />
            {c.isLast ? (
              <span className="line-clamp-1 max-w-[180px] font-medium text-foreground">
                {c.label}
              </span>
            ) : (
              <Link to={c.path} className="line-clamp-1 max-w-[140px] hover:text-foreground">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
