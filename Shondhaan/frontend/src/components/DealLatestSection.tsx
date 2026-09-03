import { useNavigate } from "react-router-dom";
import { Clock, Eye, MapPin, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLatestDeals, DealListing } from "@/hooks/useDealData";
import ListingImage from "@/components/deal/ListingImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "VITE_DEAL_API_BASE_URL"
).replace(/\/+$/, "");

const getDealImageUrl = (url?: string | null) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:\/\/|data:|blob:)/.test(value)) return value;
  return `${DEAL_API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const timeAgo = (dateStr: string, bn: boolean) => {
  const date = new Date(dateStr).getTime();
  if (!date || Number.isNaN(date)) return bn ? "এইমাত্র" : "Just now";
  const minutes = Math.floor((Date.now() - date) / 60000);
  if (minutes < 1) return bn ? "এইমাত্র" : "Just now";
  if (minutes < 60) return bn ? `${minutes} মিনিট আগে` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return bn ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return bn ? `${days} দিন আগে` : `${days}d ago`;
};

const DealCard = ({
  listing,
  bn,
  onClick
}: {
  listing: DealListing;
  bn: boolean;
  onClick: () => void;
}) => (
  <Card
    onClick={onClick}
    className="h-full cursor-pointer overflow-hidden border-blue-100/60 bg-white transition-all hover:border-emerald-400/50 hover:shadow-xl"
  >
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50">
      <ListingImage
        src={getDealImageUrl(listing.images?.[0])}
        alt={listing.title}
        fallbackSize="lg"
      />
      {listing.is_negotiable && (
        <Badge
          variant="outline"
          className="absolute right-2 top-2 bg-white/90 text-[10px] text-blue-700"
        >
          {bn ? "আলোচনা সাপেক্ষে" : "Negotiable"}
        </Badge>
      )}
    </div>
    <CardContent className="p-3">
      <p className="text-lg font-bold text-blue-600">
        ৳
        {listing.price > 0
          ? listing.price.toLocaleString("bn-BD")
          : bn
            ? "আলোচনা সাপেক্ষে"
            : "Negotiable"}
      </p>
      <h3 className="mt-1 line-clamp-2 text-sm font-medium">
        {bn ? listing.title : listing.title_en || listing.title}
      </h3>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 text-blue-500" />
        <span className="truncate">
          {listing.location_area ||
            listing.location_district ||
            listing.location_division ||
            ""}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-blue-50/50 pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-emerald-500" />
          {timeAgo(listing.created_at, bn)}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-blue-500" />
          {listing.views_count || 0}
        </span>
      </div>
    </CardContent>
  </Card>
);

const DealLatestSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: latest = [], isLoading } = useLatestDeals();

  return (
    <section className="mb-1">
        <div className="flex w-full my-8">
            <div className="flex items-center w-full gap-2 mb-2">
                <img src="images/modules_logo/deal.png" alt="Shondhaan Mart" className="w-12 h-12 rounded-full mr-2" />
                <div>
                    <h2 className="text-2xl font-semibold">{bn ? "সন্ধান ডিল" : "Shondhaan Deal"}</h2>
                    <span className="text-[12px] font-semibold">{bn ? "সর্বশেষ বিজ্ঞাপন" : "Latest Ads"}</span>
                </div>
            </div>

            <Button variant="outline" className="rounded-xl bg-primary px-4 text-white hover:bg-emerald-600" onClick={() => navigate("/deal/ads")}>
                {bn ? "সকল বিজ্ঞাপন" : "See More"}
                <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
        </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : latest.length > 0 ? (
        <Carousel
          opts={{ align: "start", dragFree: true }}
          className="px-1"
          tabIndex={0}
        >
          <CarouselContent className="-ml-3">
            {latest.slice(0, 6).map((listing) => (
              <CarouselItem
                key={listing.id}
                className="pl-3 basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)] md:basis-[calc(25%-0.5625rem)] lg:basis-[calc(16.667%-0.625rem)]"
              >
                <DealCard
                  listing={listing}
                  bn={bn}
                  onClick={() => navigate(`/deal/ad/${listing.id}`)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 sm:-left-4" />
          <CarouselNext className="right-0 sm:-right-4" />
        </Carousel>
      ) : null}
    </section>
  );
};

export default DealLatestSection;
