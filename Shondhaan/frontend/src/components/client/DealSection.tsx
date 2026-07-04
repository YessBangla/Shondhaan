import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Megaphone, Heart, MessageSquare, Eye, MapPin, Clock, Tag, Trash2, Edit, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import MartFavoritesTab from "@/components/client/MartFavoritesTab";

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
  listing?: DealListing;
}

interface DealMessage {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean | null;
  created_at: string | null;
}

type DealTab = "my-ads" | "favorites" | "messages";

interface Props {
  activeTab: DealTab;
}

const DealSection = ({ activeTab }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();

  const [myAds, setMyAds] = useState<DealListing[]>([]);
  const [favorites, setFavorites] = useState<DealFavorite[]>([]);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      if (activeTab === "my-ads") {
        const { data } = await supabase
          .from("deal_listings")
          .select("*, deal_categories(name, name_en)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setMyAds((data || []).map((d: any) => ({ ...d, images: Array.isArray(d.images) ? d.images : [] })));
      } else if (activeTab === "favorites") {
        const { data: favs } = await supabase
          .from("deal_favorites")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (favs && favs.length > 0) {
          const listingIds = favs.map(f => f.listing_id);
          const { data: listings } = await supabase
            .from("deal_listings")
            .select("*, deal_categories(name, name_en)")
            .in("id", listingIds);
          const listingMap = new Map((listings || []).map((l: any) => [l.id, { ...l, images: Array.isArray(l.images) ? l.images : [] }]));
          setFavorites(favs.map(f => ({ ...f, listing: listingMap.get(f.listing_id) })));
        } else {
          setFavorites([]);
        }
      } else if (activeTab === "messages") {
        const { data } = await supabase
          .from("deal_messages")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });
        setMessages(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, activeTab]);

  const removeFavorite = async (favId: string) => {
    const { error } = await supabase.from("deal_favorites").delete().eq("id", favId);
    if (!error) {
      setFavorites(prev => prev.filter(f => f.id !== favId));
      toast.success(bn ? "ফেভারিট সরানো হয়েছে" : "Removed from favorites");
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
                {img ? (
                  <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Tag className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
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

  // Favorites Tab (repurposed to Mart favorites)
  if (activeTab === "favorites") {
    return <MartFavoritesTab />;
  }

  // Messages Tab
  if (activeTab === "messages") {
    // Group messages by listing_id + other user
    const grouped = messages.reduce((acc, msg) => {
      const otherUser = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
      const key = `${msg.listing_id}_${otherUser}`;
      if (!acc[key]) acc[key] = { listing_id: msg.listing_id, other_user_id: otherUser, messages: [], unread: 0 };
      acc[key].messages.push(msg);
      if (!msg.is_read && msg.receiver_id === user?.id) acc[key].unread++;
      return acc;
    }, {} as Record<string, { listing_id: string; other_user_id: string; messages: DealMessage[]; unread: number }>);

    const conversations = Object.values(grouped);

    if (conversations.length === 0) {
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

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          {conversations.length} {bn ? "টি কথোপকথন" : "conversations"}
          {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
            <span className="ml-2 text-primary font-semibold">
              ({conversations.reduce((s, c) => s + c.unread, 0)} {bn ? "টি অপঠিত" : "unread"})
            </span>
          )}
        </p>
        {conversations.map((conv, i) => {
          const lastMsg = conv.messages[0];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-xl border bg-card p-4 cursor-pointer transition-all ${conv.unread > 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}
              onClick={() => navigate(`/deal/inbox`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={`rounded-full p-2 shrink-0 ${conv.unread > 0 ? "bg-primary/10" : "bg-muted"}`}>
                    <MessageSquare className={`h-4 w-4 ${conv.unread > 0 ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lastMsg.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lastMsg.sender_id === user?.id ? (bn ? "আপনি: " : "You: ") : ""}
                      {lastMsg.created_at ? new Date(lastMsg.created_at).toLocaleDateString("bn-BD") : ""}
                    </p>
                  </div>
                </div>
                {conv.unread > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full text-xs font-bold h-5 w-5 flex items-center justify-center shrink-0">
                    {conv.unread}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return null;
};

export default DealSection;
