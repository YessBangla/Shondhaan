import { useParams, useNavigate, Link } from "react-router-dom";
import ListingImage from "@/components/deal/ListingImage";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, User, CalendarDays, Package, MapPin, Tag, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { type DealListing } from "@/hooks/useDealData";

const DEAL_API_BASE_URL = (import.meta.env.VITE_DEAL_API_BASE_URL || "").replace(/\/+$/, "");

type SellerProfile = {
  name: string;
  address: string;
  createdAt: string;
  phoneAvailable: boolean;
};

type DealListingRow = Partial<DealListing> & {
  id: string | number;
  user_id: string | number;
  seller_name?: string | null;
  address?: string | null;
  category_name?: string | null;
  category_name_en?: string | null;
  category_slug?: string | null;
  category_icon?: string | null;
  category_parent_id?: string | number | null;
  product_condition?: string | null;
};

const normalizeImages = (images: unknown): string[] => {
  if (Array.isArray(images)) return images.filter(Boolean).map(String);
  if (typeof images !== "string") return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return images.split(",").map((image) => image.trim()).filter(Boolean);
  }
};

const normalizeListing = (listing: DealListingRow): DealListingRow => ({
  ...listing,
  id: String(listing.id),
  user_id: String(listing.user_id),
  category_id: listing.category_id ? String(listing.category_id) : null,
  price: Number(listing.price || 0),
  images: normalizeImages(listing.images),
  is_negotiable: Boolean(listing.is_negotiable),
  hide_phone: Boolean(listing.hide_phone),
  is_featured: Boolean(listing.is_featured),
  views_count: Number(listing.views_count || 0),
  inquiries_count: Number(listing.inquiries_count || 0),
  condition: listing.condition || listing.product_condition || "used",
  deal_categories: listing.category_name
    ? {
        id: String(listing.category_id || ""),
        name: listing.category_name,
        name_en: listing.category_name_en || null,
        slug: listing.category_slug || "",
        icon: listing.category_icon || null,
        parent_id: listing.category_parent_id ? String(listing.category_parent_id) : null,
        sort_order: 0,
        is_active: true,
      }
    : null,
});

const DealSellerProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const { data: seller, isLoading: sellerLoading } = useQuery<SellerProfile>({
    queryKey: ["deal-seller-full", userId],
    queryFn: async () => {
      const response = await fetch(`${DEAL_API_BASE_URL}/api/deal/listings?user_id=${encodeURIComponent(userId!)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Failed to load seller profile");
      const listings = (Array.isArray(payload.data) ? payload.data as DealListingRow[] : []).map(normalizeListing);
      const firstListing = listings[0];
      return {
        name: firstListing?.seller_name || (bn ? "ব্যবহারকারী" : "User"),
        address: firstListing?.address || firstListing?.location_district || firstListing?.location_division || "",
        createdAt: firstListing?.created_at || "",
        phoneAvailable: listings.some((listing) => Boolean(listing.phone)),
      };
    },
    enabled: !!userId,
  });
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["deal-seller-listings", userId],
    queryFn: async () => {
      const response = await fetch(`${DEAL_API_BASE_URL}/api/deal/listings?user_id=${encodeURIComponent(userId!)}&status=active`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Failed to load seller listings");
      return (Array.isArray(payload.data) ? payload.data as DealListingRow[] : []).map(normalizeListing);
    },
    enabled: !!userId,
  });

  const memberSince = seller?.createdAt
    ? new Date(seller.createdAt).toLocaleDateString("bn-BD", { year: "numeric", month: "long" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
      <div className="app-container py-6 pb-24">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
          <ChevronLeft className="h-4 w-4" />
          {bn ? "পেছনে যান" : "Go Back"}
        </Button>

        {/* Seller Info Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="relative pt-0 -mt-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 pb-6">
            {sellerLoading ? (
              <Skeleton className="h-20 w-20 rounded-full" />
            ) : (
              <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="text-center sm:text-left flex-1">
              {sellerLoading ? (
                <Skeleton className="h-6 w-40 mb-2" />
              ) : (
                <h1 className="text-xl font-bold text-foreground">
                  {seller?.name || (bn ? "ব্যবহারকারী" : "User")}
                </h1>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {bn ? "সদস্য" : "Member since"} {memberSince}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {listings?.length ?? 0} {bn ? "টি সক্রিয় বিজ্ঞাপন" : "active ads"}
                </span>
                {seller?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {seller.address}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings */}
        <h2 className="text-lg font-semibold mb-4">
          {bn ? "সকল বিজ্ঞাপন" : "All Listings"}
        </h2>

        {listingsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : !listings?.length ? (
          <p className="text-center text-muted-foreground py-12">
            {bn ? "কোনো সক্রিয় বিজ্ঞাপন নেই" : "No active listings"}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {listings.map((ad, i) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/deal/ad/${ad.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                    <div className="aspect-[4/3] bg-muted relative">
                      <ListingImage src={ad.images?.[0]} alt={ad.title} fallbackSize="md" />
                      {ad.is_featured && (
                        <Badge className="absolute top-1.5 left-1.5 text-[10px] py-0">
                          ⭐ {bn ? "ফিচার্ড" : "Featured"}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5 truncate">
                        {ad.deal_categories?.name || ""}
                      </p>
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">
                        {bn ? ad.title : ad.title_en || ad.title}
                      </h3>
                      <p className="text-primary font-bold text-sm mt-1">
                        ৳ {ad.price.toLocaleString("bn-BD")}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {ad.location_district && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {ad.location_district}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {ad.views_count}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DealSellerProfile;
