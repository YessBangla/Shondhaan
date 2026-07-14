import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useDealConversations } from "@/hooks/useDealChatSocket";

import { useLanguage } from "@/contexts/LanguageContext";
import { Megaphone, MessageSquare, Eye, MapPin, Clock, Tag, Edit, ArrowRight, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ListingImage from "@/components/deal/ListingImage";
import {
  getDealAuthUserId,
  listDealFavorites,
  removeDealFavorite,
} from "@/lib/dealFavoriteApi";

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

interface DealListing {
  id: string;
  title: string;
  title_en: string | null;
  price: number;
  images: any;
  status: string | null;
  views_count: number | null;
  inquiries_count: number | null;
  location_division: string | null;
  location_district: string | null;
  condition: string | null;
  is_featured: boolean | null;
  created_at: string | null;
  deal_categories?: { name: string; name_en: string | null } | null;
}



interface DealFavorite {
  id: string;
  listing_id: string;
  created_at: string | null;
  listing: DealListing;
}

type DealTab = "my-ads" | "favorites" | "messages";

interface Props {
  activeTab: DealTab;
}

const extractListings = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.listings)) return payload.listings;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const normalizeImages = (images: any): string[] => {
  if (Array.isArray(images)) return images.filter(Boolean).map(String);

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeDealListing = (listing: any): DealListing => ({
  id: String(listing.id),
  title: listing.title || "",
  title_en: listing.title_en ?? null,
  price: Number(listing.price || 0),
  images: normalizeImages(listing.images),
  status: listing.status || "active",
  views_count: Number(listing.views_count || 0),
  inquiries_count: Number(listing.inquiries_count || 0),
  location_division: listing.location_division ?? null,
  location_district: listing.location_district ?? null,
  condition: listing.condition || listing.product_condition || null,
  is_featured:
    listing.is_featured === true ||
    listing.is_featured === 1 ||
    listing.is_featured === "1" ||
    listing.is_featured === "true",
  created_at: listing.created_at ?? null,
  deal_categories: listing.deal_categories
    ? {
        name: listing.deal_categories.name || "",
        name_en: listing.deal_categories.name_en ?? null,
      }
    : listing.category
      ? {
          name: listing.category.name || "",
          name_en: listing.category.name_en ?? null,
        }
      : listing.category_name
        ? {
            name: listing.category_name,
            name_en: listing.category_name_en ?? null,
          }
        : null,
});

const DealSection = ({ activeTab }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();

  const [myAds, setMyAds] = useState<DealListing[]>([]);
  const [dealFavorites, setDealFavorites] = useState<DealFavorite[]>([]);
  const { data: conversations = [], isLoading: conversationsLoading } = useDealConversations();

  const [loading, setLoading] = useState(true);


  const getLoggedInUserId = () => {
    const authUser = user as any;

    return String(
      authUser?.id ||
        authUser?.user_id ||
        authUser?.user?.id ||
        authUser?.user?.user_id ||
        ""
    );
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      if (activeTab === "my-ads" || activeTab === "favorites") setLoading(true);
      else setLoading(false);

      if (activeTab === "my-ads") {

        const userId = getLoggedInUserId();

        if (!userId) {
          setMyAds([]);
          setLoading(false);
          return;
        }

        try {
          const params = new URLSearchParams({ user_id: userId, mine: "1" });
          const response = await fetch(
            `${DEAL_API_BASE_URL}/api/deal/listings?${params.toString()}`,
            {
              method: "GET",
              credentials: "include",
            }
          );

          const payload = await response.json().catch(() => null);

          if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || payload?.error || "Failed to load ads");
          }

          const rows = extractListings(payload);
          const hasUserIds = rows.some((listing) => listing.user_id !== undefined && listing.user_id !== null);
          setMyAds(
            rows
              .filter((listing) => !hasUserIds || String(listing.user_id) === userId)
              .map(normalizeDealListing)
          );
        } catch (error: any) {
          console.error("Fetch dashboard deal ads error:", error);
          setMyAds([]);
          toast.error(error?.message || (bn ? "বিজ্ঞাপন লোড করতে সমস্যা" : "Failed to load ads"));
        }
      } else if (activeTab === "favorites") {
        const userId = getDealAuthUserId(user);

        if (!userId) {
          setDealFavorites([]);
          setLoading(false);
          return;
        }

        try {
          const favorites = await listDealFavorites(userId);
          setDealFavorites(
            favorites
              .filter((item: any) => item?.listing)
              .map((item: any) => ({
                id: String(item.id),
                listing_id: String(item.listing_id),
                created_at: item.created_at ?? null,
                listing: normalizeDealListing(item.listing),
              }))
          );
        } catch (error: any) {
          console.error("Fetch deal favorites error:", error);
          setDealFavorites([]);
          toast.error(error?.message || (bn ? "ফেভারিট লোড করতে সমস্যা" : "Failed to load favorites"));
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [user, activeTab]);


  const handleRemoveFavorite = async (listingId: string) => {
    const userId = getDealAuthUserId(user);

    if (!userId) return;

    try {
      await removeDealFavorite(userId, listingId);
      setDealFavorites((prev) =>
        prev.filter((item) => String(item.listing_id) !== String(listingId))
      );
      toast.success(bn ? "Removed from favorites" : "Removed from favorites");
    } catch (error: any) {
      toast.error(error?.message || "Could not remove favorite");
    }
  };


  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    sold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusLabels: Record<string, string> = {
    active: bn ? "সক্রিয়" : "Active",
    pending: bn ? "অপেক্ষমাণ" : "Pending",
    sold: bn ? "বিক্রিত" : "Sold",
    expired: bn ? "মেয়াদোত্তীর্ণ" : "Expired",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // My Ads Tab
  if (activeTab === "my-ads") {
    if (myAds.length === 0) {
      return (
        <div className="text-center py-12">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-base text-muted-foreground">{bn ? "কোনো বিজ্ঞাপন পোস্ট করেননি" : "No ads posted yet"}</p>
          <button onClick={() => navigate("/deal/post")} className="mt-3 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "বিজ্ঞাপন দিন" : "Post an Ad"}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Prominent Post Ad Button */}
        <motion.button
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/deal/post")}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <Megaphone className="h-5 w-5" />
          {bn ? "নতুন বিজ্ঞাপন পোস্ট করুন" : "Post a New Ad"}
          <ArrowRight className="h-4 w-4" />
        </motion.button>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{myAds.length} {bn ? "টি বিজ্ঞাপন" : "ads"}</p>
        </div>
        {myAds.map((ad, i) => {
          const img = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : null;
          return (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/deal/ad/${ad.id}`)}
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden">
                  <ListingImage src={img} alt={ad.title} fallbackSize="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{bn ? ad.title : (ad.title_en || ad.title)}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusStyles[ad.status || "active"] || "bg-muted text-muted-foreground"}`}>
                      {statusLabels[ad.status || "active"] || ad.status}
                    </span>
                  </div>
                  <p className="text-base font-bold text-primary mt-0.5">৳{ad.price.toLocaleString("bn-BD")}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {ad.deal_categories && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {bn ? ad.deal_categories.name : (ad.deal_categories.name_en || ad.deal_categories.name)}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.views_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {ad.inquiries_count || 0}</span>
                  </div>
                  {(ad.location_division || ad.location_district) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {ad.location_district || ad.location_division}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/deal/edit/${ad.id}`); }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Edit className="h-3 w-3" /> {bn ? "সম্পাদনা" : "Edit"}
                </button>
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {ad.created_at ? new Date(ad.created_at).toLocaleDateString("bn-BD") : ""}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Favorites Tab
  if (activeTab === "favorites") {
    if (dealFavorites.length === 0) {
      return (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-base text-muted-foreground">{bn ? "No favorites yet" : "No favorites yet"}</p>
          <button onClick={() => navigate("/deal/ads")} className="mt-3 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "Browse Ads" : "Browse Ads"}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {dealFavorites.length} {bn ? "favorites" : "favorites"}
        </p>

        {dealFavorites.map((favorite, i) => {
          const ad = favorite.listing;
          const img = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : null;

          return (
            <motion.div
              key={favorite.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/deal/ad/${ad.id}`)}
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden">
                  <ListingImage src={img} alt={ad.title} fallbackSize="sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {bn ? ad.title : (ad.title_en || ad.title)}
                    </h3>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveFavorite(ad.id);
                      }}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="remove favorite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-base font-bold text-primary mt-0.5">৳{ad.price.toLocaleString("bn-BD")}</p>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {ad.deal_categories && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {bn ? ad.deal_categories.name : (ad.deal_categories.name_en || ad.deal_categories.name)}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.views_count || 0}</span>
                  </div>

                  {(ad.location_division || ad.location_district) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {ad.location_district || ad.location_division}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Messages Tab
  if (activeTab === "messages") {
    const filteredConversations = conversations;

    if (conversationsLoading || loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (!filteredConversations || filteredConversations.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-base text-muted-foreground">{bn ? "কোনো মেসেজ নেই" : "No messages"}</p>
          <button onClick={() => navigate("/deal")} className="mt-3 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "ইয়েস ডিল দেখুন" : "Browse Deals"}
          </button>
        </div>
      );
    }

    const totalUnread = filteredConversations.reduce((s, c) => s + (c.unread_count || 0), 0);

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          {filteredConversations.length} {bn ? "টি কথোপকথন" : "conversations"}
          {totalUnread > 0 && (
            <span className="ml-2 text-primary font-semibold">
              ({totalUnread} {bn ? "টি অপঠিত" : "unread"})
            </span>
          )}
        </p>
        {filteredConversations.map((conv, i) => (
          <motion.div
            key={`${conv.listing_id}_${conv.other_user_id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-xl border bg-card p-4 cursor-pointer transition-all ${conv.unread_count > 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}
            onClick={() => navigate(`/deal/inbox`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className={`rounded-full p-2 shrink-0 ${conv.unread_count > 0 ? "bg-primary/10" : "bg-muted"}`}>
                  <MessageSquare className={`h-4 w-4 ${conv.unread_count > 0 ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conv.last_message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("bn-BD") : ""}
                  </p>
                </div>
              </div>
              {conv.unread_count > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-xs font-bold h-5 w-5 flex items-center justify-center shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }


  return null;
};

export default DealSection;
