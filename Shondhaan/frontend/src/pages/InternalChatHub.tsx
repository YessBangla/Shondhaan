import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationBell from "@/components/NotificationBell";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, MessageSquare, Grid3X3, List,
  Users, Clock, AlertTriangle, ChevronRight, Filter, LayoutGrid
} from "lucide-react";

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  category_id: string | null;
  image_url: string | null;
  rating: number | null;
  total_orders: number | null;
  is_active: boolean | null;
}

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  icon_url: string | null;
  color_accent: string | null;
}

interface MessageCount {
  service_slug: string;
  count: number;
  latest: string;
}

export default function InternalChatHub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [msgCounts, setMsgCounts] = useState<MessageCount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "messages" | "orders">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const { data: backendServices = [], isLoading: servicesLoading } = useCmsServices();
  const { data: backendCategories = [], isLoading: categoriesLoading } = useCmsCategories();

  const isAdmin = userRoles.includes("admin");

  useEffect(() => {
    setServices(backendServices.filter((service) => service.is_active !== false));
    setCategories(backendCategories);
  }, [backendServices, backendCategories]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: roles }, { data: msgs }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("internal_messages").select("service_slug, created_at").order("created_at", { ascending: false }),
      ]);

      setUserRoles((roles || []).map((r: any) => r.role));

      // Aggregate message counts per service
      const countMap: Record<string, { count: number; latest: string }> = {};
      (msgs || []).forEach((m: any) => {
        if (!countMap[m.service_slug]) {
          countMap[m.service_slug] = { count: 0, latest: m.created_at };
        }
        countMap[m.service_slug].count++;
      });
      setMsgCounts(Object.entries(countMap).map(([slug, v]) => ({
        service_slug: slug, count: v.count, latest: v.latest,
      })));

      setLoading(false);
    };
    load();
  }, [user]);

  const filteredServices = useMemo(() => {
    let result = services;

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(s => s.category_id === selectedCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.title_en || "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === "messages") {
      result = [...result].sort((a, b) => {
        const ca = msgCounts.find(m => m.service_slug === a.slug)?.count || 0;
        const cb = msgCounts.find(m => m.service_slug === b.slug)?.count || 0;
        return cb - ca;
      });
    } else if (sortBy === "orders") {
      result = [...result].sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));
    } else {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, "bn"));
    }

    return result;
  }, [services, selectedCategory, searchQuery, sortBy, msgCounts]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, { category: Category | null; services: ServiceItem[] }> = {};
    filteredServices.forEach(s => {
      const catId = s.category_id || "uncategorized";
      if (!groups[catId]) {
        const cat = categories.find(c => c.id === catId) || null;
        groups[catId] = { category: cat, services: [] };
      }
      groups[catId].services.push(s);
    });
    return Object.values(groups).filter(g => g.services.length > 0);
  }, [filteredServices, categories]);

  const getMsgCount = (slug: string) => msgCounts.find(m => m.service_slug === slug)?.count || 0;

  if (authLoading || loading || servicesLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const staffRoles = ["admin", "call_center", "provider", "representative", "supervisor", "finance", "moderator"];
  const hasAccess = userRoles.some(r => staffRoles.includes(r));
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="font-medium">আপনার এই পেজে প্রবেশাধিকার নেই</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                ইন্টার্নাল চ্যাট হাব
              </h1>
              <p className="text-xs text-muted-foreground">সার্ভিস অনুযায়ী টিম চ্যানেল</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="সার্ভিস খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="ক্যাটেগরি" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল ক্যাটেগরি</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Admin-only sorting */}
          {isAdmin && (
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="সর্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">নাম অনুযায়ী</SelectItem>
                <SelectItem value="messages">মেসেজ সংখ্যা</SelectItem>
                <SelectItem value="orders">অর্ডার সংখ্যা</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats for admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="মোট সার্ভিস" value={services.length} />
            <StatMini label="ক্যাটেগরি" value={categories.length} />
            <StatMini label="সক্রিয় চ্যাট" value={msgCounts.filter(m => m.count > 0).length} />
            <StatMini label="মোট মেসেজ" value={msgCounts.reduce((s, m) => s + m.count, 0)} />
          </div>
        )}

        {/* Category-grouped view */}
        {selectedCategory === "all" ? (
          <div className="space-y-6">
            {groupedByCategory.map(({ category, services: catServices }) => (
              <div key={category?.id || "uncategorized"}>
                <div className="flex items-center gap-2 mb-3">
                  {category?.icon_url && (
                    <img src={category.icon_url} className="h-6 w-6 rounded" alt="" />
                  )}
                  <h2 className="text-base font-bold text-foreground">
                    {category?.name || "অন্যান্য"}
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">{catServices.length}</Badge>
                </div>
                <ServiceGrid services={catServices} viewMode={viewMode} getMsgCount={getMsgCount} navigate={navigate} />
              </div>
            ))}
          </div>
        ) : (
          <ServiceGrid services={filteredServices} viewMode={viewMode} getMsgCount={getMsgCount} navigate={navigate} />
        )}

        {filteredServices.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>কোনো সার্ভিস পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceGrid({
  services, viewMode, getMsgCount, navigate,
}: {
  services: ServiceItem[];
  viewMode: "grid" | "list";
  getMsgCount: (slug: string) => number;
  navigate: (path: string) => void;
}) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {services.map((s, i) => {
          const count = getMsgCount(s.slug);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(`/internal/${s.slug}`)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {s.image_url ? (
                    <img src={s.image_url} className="h-10 w-10 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ⭐ {s.rating || 0} • {s.total_orders || 0} অর্ডার
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <Badge className="bg-primary/10 text-primary text-[10px]">
                        {count} মেসেজ
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {services.map((s, i) => {
        const count = getMsgCount(s.slug);
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group overflow-hidden"
              onClick={() => navigate(`/internal/${s.slug}`)}
            >
              <div className="relative">
                {s.image_url ? (
                  <img src={s.image_url} className="w-full h-24 object-cover" alt="" />
                ) : (
                  <div className="w-full h-24 bg-muted flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                {count > 0 && (
                  <Badge className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] h-5">
                    {count}
                  </Badge>
                )}
              </div>
              <CardContent className="p-2.5">
                <p className="font-medium text-xs truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ⭐ {s.rating || 0} • {s.total_orders || 0} অর্ডার
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 text-center">
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
