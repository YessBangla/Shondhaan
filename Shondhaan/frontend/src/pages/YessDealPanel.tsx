import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Plus, Edit2, Trash2,
  Search, Eye, BarChart3, Loader2, Tag,
  MessageCircle, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasStaffRoleAccess } from "@/lib/roleAccess";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// Same base URL / helper convention as the other Deal admin components
const API_BASE = `${import.meta.env.VITE_DEAL_API_BASE_URL || ""}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

interface MyListing {
  id: string; title: string; price: number; condition: string | null; status: string | null;
  is_featured: boolean | null; location_division: string | null; views_count: number | null;
  inquiries_count: number | null; images: any; created_at: string | null; category_id: string | null;
  user_id?: string;
  deal_categories?: { id: string; name: string } | null;
}

interface DealCat { id: string; name: string; is_active?: boolean | null; }

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "সক্রিয়", color: "bg-green-100 text-green-800" },
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  sold: { label: "বিক্রিত", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "প্রত্যাখ্যাত", color: "bg-red-100 text-red-800" },
  expired: { label: "মেয়াদোত্তীর্ণ", color: "bg-gray-100 text-gray-800" },
};

const COLORS = ["#ca8a04", "#d97706", "#ea580c", "#dc2626", "#9333ea"];

const YessDealPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [categories, setCategories] = useState<DealCat[]>([]);
  const [searchListing, setSearchListing] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    setHasAccess(await hasStaffRoleAccess(user.id, ["yessdeal_seller"]));
    setLoading(false);
  }, [user]);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch(`/deal/listings`);
      const all: MyListing[] = data.data || data;
      // Filter to this seller's own listings client-side, since we're not
      // relying on the API to support a user_id query filter
      const mine = all
        .filter(l => String(l.user_id) === String(user.id))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setListings(mine);
    } catch (err: any) {
      toast.error(err.message || (bn ? "বিজ্ঞাপন লোড ব্যর্থ" : "Failed to load listings"));
    }
  }, [user, bn]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiFetch(`/deal-categories`);
      const all: DealCat[] = data.data || data;
      setCategories(all.filter(c => c.is_active !== false));
    } catch (err: any) {
      toast.error(err.message || (bn ? "ক্যাটেগরি লোড ব্যর্থ" : "Failed to load categories"));
    }
  }, [bn]);

  const fetchMsgCounts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch(`/deal/messages`);
      const all: any[] = data.data || data;
      const counts: Record<string, number> = {};
      all
        .filter(m => String(m.receiver_id) === String(user.id) && !m.is_read)
        .forEach(m => { counts[m.listing_id] = (counts[m.listing_id] || 0) + 1; });
      setMsgCounts(counts);
    } catch (err) {
      // Non-critical — unread counts just won't show if this endpoint isn't available
      console.error(err);
    }
  }, [user]);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (hasAccess) { fetchListings(); fetchCategories(); fetchMsgCounts(); } }, [hasAccess, fetchListings, fetchCategories, fetchMsgCounts]);

  const deleteListing = async (id: string) => {
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "DELETE" });
      toast.success(bn ? "বিজ্ঞাপন মুছে ফেলা হয়েছে" : "Listing deleted");
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || (bn ? "মুছতে ব্যর্থ" : "Delete failed"));
    }
  };

  const markAsSold = async (id: string) => {
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ status: "sold" }) });
      toast.success(bn ? "বিক্রিত হিসেবে চিহ্নিত" : "Marked as sold");
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "sold" } : l));
    } catch (err: any) {
      toast.error(err.message || (bn ? "আপডেট ব্যর্থ" : "Update failed"));
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Tag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold text-foreground">{bn ? "অ্যাক্সেস নেই" : "Access Denied"}</h2>
        <p className="text-muted-foreground text-center">{bn ? "আপনার সন্ধান ডিল সেলার অ্যাক্সেস নেই।" : "You don't have Yess Deal seller access."}</p>
        <Button onClick={() => navigate("/")}>{bn ? "হোমে যান" : "Go Home"}</Button>
      </div>
    );
  }

  const getCatName = (catId: string | null, embedded?: MyListing["deal_categories"]) => {
    if (embedded?.name) return embedded.name;
    return catId ? categories.find(c => c.id === catId)?.name || "—" : "—";
  };
  const usedCategories = [...new Set(listings.map(l => l.category_id).filter(Boolean))];

  const filteredListings = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(searchListing.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchCat = filterCat === "all" || l.category_id === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);
  const totalInquiries = listings.reduce((s, l) => s + (l.inquiries_count || 0), 0);
  const activeCount = listings.filter(l => l.status === "active").length;

  const statusData = Object.entries(statusMap).map(([k, v]) => ({ name: v.label, value: listings.filter(l => l.status === k).length })).filter(d => d.value > 0);
  const catData = usedCategories.map(catId => ({ name: getCatName(catId!), value: listings.filter(l => l.category_id === catId).length }));

  const sidebarItems = [
    { value: "listings", label: bn ? "আমার বিজ্ঞাপন" : "My Listings", icon: <Tag />, group: bn ? "বিজ্ঞাপন" : "Listings" },
    { value: "analytics", label: bn ? "পরিসংখ্যান" : "Analytics", icon: <BarChart3 />, group: bn ? "রিপোর্ট" : "Reports" },
  ];

  return (
    <div className="min-h-screen bg-background">
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              🤝 {bn ? "সন্ধান ডিল প্যানেল" : "Yess Deal Panel"}
            </h1>
            <p className="text-sm text-muted-foreground">{bn ? "আপনার বিজ্ঞাপন ম্যানেজ করুন" : "Manage your listings"}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/deal/inbox")}>
              <MessageCircle className="h-4 w-4 mr-1" />{bn ? "ইনবক্স" : "Inbox"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/internal")}>
              <MessageCircle className="h-4 w-4 mr-1" />{bn ? "চ্যাট" : "Chat"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Package, label: bn ? "মোট বিজ্ঞাপন" : "Total Listings", value: listings.length, color: "text-yellow-600", bg: "bg-yellow-50" },
            { icon: CheckCircle, label: bn ? "সক্রিয়" : "Active", value: activeCount, color: "text-green-600", bg: "bg-green-50" },
            { icon: Eye, label: bn ? "মোট ভিউ" : "Total Views", value: totalViews, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: MessageCircle, label: bn ? "মোট মেসেজ" : "Inquiries", value: totalInquiries, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${stat.bg} p-2 rounded-lg`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 overflow-hidden">
          <PanelSidebarTabs
            items={sidebarItems}
            defaultValue="listings"
            panelTitle={bn ? "সন্ধান ডিল" : "Yess Deal"}
            panelIcon={<Tag className="h-5 w-5" />}
          >
            {(activeTab) => (
              <div className="p-4 md:p-6">
                {/* Listings */}
                {activeTab === "listings" && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={bn ? "বিজ্ঞাপন খুঁজুন..." : "Search..."} value={searchListing} onChange={e => setSearchListing(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={filterCat} onValueChange={setFilterCat}>
                        <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{bn ? "সকল ক্যাটেগরি" : "All"}</SelectItem>
                          {categories.filter(c => usedCategories.includes(c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{bn ? "সকল স্ট্যাটাস" : "All"}</SelectItem>
                          {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button className="gap-1" onClick={() => navigate("/deal/post")}><Plus className="h-4 w-4" />{bn ? "বিজ্ঞাপন দিন" : "Post Ad"}</Button>
                    </div>
                    {filteredListings.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{bn ? "কোনো বিজ্ঞাপন পাওয়া যায়নি" : "No listings found"}</p>
                        <Button variant="outline" className="mt-3" onClick={() => navigate("/deal/post")}>
                          <Plus className="h-4 w-4 mr-1" />{bn ? "প্রথম বিজ্ঞাপন দিন" : "Post your first ad"}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredListings.map(listing => {
                          const img = Array.isArray(listing.images) ? listing.images[0] : null;
                          const unread = msgCounts[listing.id] || 0;
                          const sc = statusMap[listing.status || "pending"];
                          return (
                            <Card key={listing.id} className="border-border/50 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex gap-3">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className="font-bold text-foreground text-sm truncate">{listing.title}</h3>
                                      <Badge className={`${sc?.color} text-[10px] shrink-0`}>{sc?.label}</Badge>
                                    </div>
                                    <p className="text-lg font-bold text-primary mt-1">৳{listing.price.toLocaleString("bn-BD")}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span>{listing.condition || "—"}</span><span>•</span>
                                      <span>{listing.location_division || "—"}</span><span>•</span>
                                      <span>{getCatName(listing.category_id, listing.deal_categories)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count || 0}</span>
                                      <span className="flex items-center gap-1">
                                        <MessageCircle className="h-3 w-3" />{listing.inquiries_count || 0}
                                        {unread > 0 && <Badge className="bg-red-500 text-white text-[9px] px-1 ml-1">{unread}</Badge>}
                                      </span>
                                      {listing.is_featured && <Badge className="bg-amber-100 text-amber-800 text-[9px]">⭐ ফিচার্ড</Badge>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-border/30">
                                  {listing.status === "active" && (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAsSold(listing.id)}>
                                      <CheckCircle className="h-3 w-3 mr-1" />{bn ? "বিক্রিত" : "Sold"}
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/deal/edit/${listing.id}`)}>
                                    <Edit2 className="h-3 w-3 mr-1" />{bn ? "সম্পাদনা" : "Edit"}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/deal/ad/${listing.id}`)}>
                                    <Eye className="h-3 w-3 mr-1" />{bn ? "দেখুন" : "View"}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteListing(listing.id)}>
                                    <Trash2 className="h-3 w-3 mr-1" />{bn ? "মুছুন" : "Delete"}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Analytics */}
                {activeTab === "analytics" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-border/50">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-foreground mb-4">{bn ? "স্ট্যাটাস অনুযায়ী বিজ্ঞাপন" : "Listings by Status"}</h3>
                        {statusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <p className="text-center py-8 text-muted-foreground">{bn ? "ডেটা নেই" : "No data"}</p>}
                      </CardContent>
                    </Card>
                    <Card className="border-border/50">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-foreground mb-4">{bn ? "ক্যাটেগরি অনুযায়ী বিজ্ঞাপন" : "Listings by Category"}</h3>
                        {catData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={catData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <p className="text-center py-8 text-muted-foreground">{bn ? "ডেটা নেই" : "No data"}</p>}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </PanelSidebarTabs>
        </Card>
      </motion.div>
      
    </div>
  );
};

export default YessDealPanel;
