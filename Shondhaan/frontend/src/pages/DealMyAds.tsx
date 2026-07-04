import { useState, useEffect } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Eye, MessageSquare, Heart, Edit, Trash2, Loader2, Package, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackToHomeButton from "@/components/BackToHomeButton";

interface DealListing {
  id: string;
  title: string;
  price: number;
  status: string | null;
  condition: string | null;
  images: any;
  views_count: number | null;
  inquiries_count: number | null;
  location_division: string | null;
  location_district: string | null;
  location_area: string | null;
  created_at: string | null;
  is_featured: boolean | null;
  category: { name: string; icon: string | null } | null;
}

const DealMyAds = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user, loading: authLoading } = useAuth();

  const [listings, setListings] = useState<DealListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchListings();
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_listings")
      .select("id, title, price, status, condition, images, views_count, inquiries_count, location_division, location_district, location_area, created_at, is_featured, category:deal_categories(name, icon)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error(bn ? "বিজ্ঞাপন লোড করতে সমস্যা" : "Failed to load ads");
    } else {
      setListings(data as any || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("deal_listings").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(bn ? "মুছতে সমস্যা হয়েছে" : "Failed to delete");
    } else {
      toast.success(bn ? "বিজ্ঞাপন মুছে ফেলা হয়েছে" : "Ad deleted");
      setListings(prev => prev.filter(l => l.id !== id));
    }
  };

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "active": return { label: bn ? "সক্রিয়" : "Active", icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      case "sold": return { label: bn ? "বিক্রিত" : "Sold", icon: Package, color: "bg-primary/10 text-primary border-primary/20" };
      case "inactive": return { label: bn ? "নিষ্ক্রিয়" : "Inactive", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" };
      case "pending": return { label: bn ? "অপেক্ষমান" : "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" };
      default: return { label: bn ? "সক্রিয়" : "Active", icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    }
  };

  const filteredListings = activeTab === "all" ? listings : listings.filter(l => (l.status || "active") === activeTab);

  const stats = {
    all: listings.length,
    active: listings.filter(l => !l.status || l.status === "active").length,
    sold: listings.filter(l => l.status === "sold").length,
    inactive: listings.filter(l => l.status === "inactive").length,
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  };

  const getFirstImage = (images: any) => {
    if (Array.isArray(images) && images.length > 0) return images[0];
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
      <BackToHomeButton />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-4 py-4 pb-28 md:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/deal")}><ChevronLeft className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold text-foreground">{bn ? "আমার বিজ্ঞাপন" : "My Ads"}</h1>
          </div>
          <Button size="sm" onClick={() => navigate("/deal/post")} className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />
            {bn ? "নতুন বিজ্ঞাপন" : "New Ad"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { key: "all", label: bn ? "সব" : "All", count: stats.all, color: "text-foreground" },
            { key: "active", label: bn ? "সক্রিয়" : "Active", count: stats.active, color: "text-emerald-600" },
            { key: "sold", label: bn ? "বিক্রিত" : "Sold", count: stats.sold, color: "text-primary" },
            { key: "inactive", label: bn ? "নিষ্ক্রিয়" : "Off", count: stats.inactive, color: "text-red-600" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`rounded-xl border p-2.5 text-center transition-all ${activeTab === s.key ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 bg-card hover:bg-muted/50"}`}
            >
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{bn ? "কোনো বিজ্ঞাপন নেই" : "No ads found"}</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">{bn ? "আপনার প্রথম বিজ্ঞাপন পোস্ট করুন" : "Post your first ad"}</p>
            <Button onClick={() => navigate("/deal/post")} className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> {bn ? "বিজ্ঞাপন দিন" : "Post Ad"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredListings.map((listing, i) => {
                const statusConfig = getStatusConfig(listing.status);
                const StatusIcon = statusConfig.icon;
                const img = getFirstImage(listing.images);

                return (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
                      <div className="flex gap-3 p-3">
                        {/* Image */}
                        <div
                          className="w-24 h-24 rounded-lg bg-muted shrink-0 overflow-hidden cursor-pointer"
                          onClick={() => navigate(`/deal/ad/${listing.id}`)}
                        >
                          <ListingImage src={img} alt={listing.title} fallbackSize="sm" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="font-semibold text-sm text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/deal/ad/${listing.id}`)}
                            >
                              {listing.title}
                            </h3>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusConfig.color}`}>
                              <StatusIcon className="h-3 w-3 mr-0.5" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <p className="text-base font-bold text-primary mt-1">৳{listing.price.toLocaleString("bn-BD")}</p>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {listing.views_count || 0}</span>
                            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" /> {listing.inquiries_count || 0}</span>
                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatDate(listing.created_at)}</span>
                          </div>

                          {(listing.location_division || listing.location_district) && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              📍 {[listing.location_area, listing.location_district, listing.location_division].filter(Boolean).join(", ")}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 rounded-lg"
                              onClick={() => navigate(`/deal/edit/${listing.id}`)}
                            >
                              <Edit className="h-3 w-3" /> {bn ? "সম্পাদনা" : "Edit"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 rounded-lg"
                              onClick={() => navigate(`/deal/ad/${listing.id}`)}
                            >
                              <Eye className="h-3 w-3" /> {bn ? "দেখুন" : "View"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg text-destructive hover:text-destructive">
                                  {deletingId === listing.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{bn ? "বিজ্ঞাপন মুছে ফেলবেন?" : "Delete this ad?"}</AlertDialogTitle>
                                  <AlertDialogDescription>{bn ? "এটি স্থায়ীভাবে মুছে যাবে।" : "This action cannot be undone."}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{bn ? "না" : "Cancel"}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(listing.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {bn ? "হ্যাঁ, মুছুন" : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DealMyAds;
