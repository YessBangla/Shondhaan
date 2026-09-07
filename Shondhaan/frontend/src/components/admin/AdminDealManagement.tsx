import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, Search, Eye, CheckCircle, XCircle, Clock, Star, Trash2, Tag, Shield, BarChart3, Users, Package, AlertTriangle, MessageSquare, Plus, Pencil, Save, ImageOff, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ImageUploader from "@/components/admin/ImageUploader";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, { BulkActionTone, BulkImpactRow } from "@/components/admin/BulkConfirmDialog";

// Single source of truth for the backend base URL. Swap this (or read from
// an environment variable if the API ever moves.
const API_BASE = `${import.meta.env.VITE_DEAL_API_BASE_URL || ""}/api`;
const DEAL_API_BASE_URL = (import.meta.env.VITE_DEAL_API_BASE_URL || "").replace(/\/+$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

interface DealListing {
  id: string;
  user_id: string;
  title: string;
  price: number;
  condition: string | null;
  status: string | null;
  is_featured: boolean | null;
  location_division: string | null;
  location_district: string | null;
  views_count: number | null;
  inquiries_count: number | null;
  images: any;
  created_at: string | null;
  category_id: string | null;
  phone: string | null;
  deal_categories?: { id: string; name: string; name_en?: string | null; slug?: string; icon?: string | null } | null;
}

interface DealCat {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface DealReport {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  listing_title?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "সক্রিয়", color: "bg-green-100 text-green-800", icon: CheckCircle },
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  sold: { label: "বিক্রিত", color: "bg-blue-100 text-blue-800", icon: Tag },
  rejected: { label: "প্রত্যাখ্যাত", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "মেয়াদোত্তীর্ণ", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

const DealCategoryManager = ({ categories, onRefresh }: { categories: DealCat[]; onRefresh: () => void }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", name_en: "", slug: "", icon: "", parent_id: "", sort_order: 0, is_active: true });

  const resetForm = () => setForm({ name: "", name_en: "", slug: "", icon: "", parent_id: "", sort_order: 0, is_active: true });

  const startEdit = (cat: DealCat) => {
    setEditing(cat.id);
    setAdding(false);
    setForm({ name: cat.name, name_en: cat.name_en || "", slug: cat.slug, icon: cat.icon || "", parent_id: cat.parent_id || "", sort_order: cat.sort_order || 0, is_active: cat.is_active !== false });
  };

  const saveCategory = async () => {
    if (!form.name || !form.slug) {
      toast.error("নাম ও স্লাগ আবশ্যক");
      return;
    }

    const payload = {
      name: form.name,
      name_en: form.name_en || null,
      slug: form.slug,
      icon: form.icon || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await apiFetch(`/deal-categories/${editing}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/deal-categories`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      toast.success(editing ? "ক্যাটেগরি আপডেট হয়েছে" : "নতুন ক্যাটেগরি যোগ হয়েছে");

      setEditing(null);
      setAdding(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "কিছু সমস্যা হয়েছে");
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiFetch(`/deal-categories/${id}`, { method: "DELETE" });
      toast.success("ক্যাটেগরি মুছে ফেলা হয়েছে");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "মুছতে ব্যর্থ");
    }
  };

  const rootCats = categories.filter(c => !c.parent_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-foreground">ডিল ক্যাটেগরি ({categories.length})</h4>
        <Button size="sm" onClick={() => { setAdding(true); setEditing(null); resetForm(); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> নতুন ক্যাটেগরি
        </Button>
      </div>

      {(adding || editing) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm">{editing ? "ক্যাটেগরি সম্পাদনা" : "নতুন ক্যাটেগরি যোগ"}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input placeholder="বাংলা নাম *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="English Name" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
              <Input placeholder="slug *" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              <ImageUploader
                value={form.icon}
                onChange={icon => setForm(f => ({ ...f, icon }))}
                folder="deal-categories"
                label="ক্যাটেগরি ছবি"
                apiBaseUrl={DEAL_API_BASE_URL}
              />
              <Select value={form.parent_id || "root"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "root" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="প্যারেন্ট ক্যাটেগরি" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">রুট (কোনো প্যারেন্ট নেই)</SelectItem>
                  {rootCats.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="সর্ট অর্ডার" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveCategory}><Save className="h-3.5 w-3.5 mr-1" /> {editing ? "আপডেট" : "যোগ করুন"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setEditing(null); resetForm(); }}>বাতিল</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">আইকন</th>
              <th className="text-left p-3 font-medium">নাম</th>
              <th className="text-left p-3 font-medium">ইংরেজি নাম</th>
              <th className="text-left p-3 font-medium">স্লাগ</th>
              <th className="text-center p-3 font-medium">প্যারেন্ট</th>
              <th className="text-center p-3 font-medium">স্ট্যাটাস</th>
              <th className="text-center p-3 font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} className="border-t border-border/30 hover:bg-muted/30">
                <td className="p-3 text-lg">
                  {cat.icon ? (
                    cat.icon.startsWith("http") || cat.icon.startsWith("/") ? (
                      <img
                        src={cat.icon.startsWith("http") ? cat.icon : `${DEAL_API_BASE_URL}${cat.icon}`}
                        alt={cat.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : cat.icon
                  ) : "📁"}
                </td>
                <td className="p-3 font-medium text-foreground">{cat.name}</td>
                <td className="p-3 text-muted-foreground">{cat.name_en || "—"}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                <td className="p-3 text-center text-muted-foreground text-xs">
                  {cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name || "—" : "রুট"}
                </td>
                <td className="p-3 text-center">
                  <Badge className={cat.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {cat.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ক্যাটেগরি মুছে ফেলবেন?</AlertDialogTitle>
                          <AlertDialogDescription>"{cat.name}" ক্যাটেগরিটি স্থায়ীভাবে মুছে ফেলা হবে।</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCategory(cat.id)} className="bg-destructive text-destructive-foreground">মুছুন</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDealManagement = () => {
  const [listings, setListings] = useState<DealListing[]>([]);
  const [categories, setCategories] = useState<DealCat[]>([]);
  const [reports, setReports] = useState<DealReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/deal/listings`);
      const list: DealListing[] = data.data || data;
      // Sort and cap client-side since we're not relying on the API to support these params
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setListings(list.slice(0, 500));
    } catch (err: any) {
      toast.error(err.message || "বিজ্ঞাপন লোড ব্যর্থ");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiFetch(`/deal-categories`);
      setCategories(data.data || data);
    } catch (err: any) {
      toast.error(err.message || "ক্যাটেগরি লোড ব্যর্থ");
    }
  }, []);

  // FIX: fetchReports no longer depends on `listings`. Previously this callback
  // was recreated every time `listings` changed (because it was in the
  // useCallback dependency array), which made the mount `useEffect` below
  // re-run every time `listings` changed, which called `fetchListings` again,
  // which changed `listings` again, forming an infinite render/fetch loop —
  // this is what caused the page to appear permanently "buffering".
  //
  // Now fetchReports is stable (empty deps) and simply stores raw reports.
  // Title enrichment from `listings` happens in a separate effect below that
  // only touches local state and never re-triggers network fetches.
  const fetchReports = useCallback(async () => {
    try {
      const data = await apiFetch(`/deal/reports`);
      const rawReports: any[] = data.data || data;
      setReports(rawReports.map((r: any) => ({
        ...r,
        listing_title: r.deal_listings?.title || "—",
      })));
    } catch (err: any) {
      toast.error(err.message || "রিপোর্ট লোড ব্যর্থ");
    }
  }, []);

  // Backfill report titles once listings are available/updated, without
  // re-fetching reports from the network. Safe to depend on `listings` here
  // because this effect never calls fetchListings/fetchCategories/fetchReports.
  useEffect(() => {
    if (listings.length === 0) return;
    setReports(prev => {
      let changed = false;
      const next = prev.map(r => {
        if (r.listing_title && r.listing_title !== "—") return r;
        const match = listings.find(l => l.id === r.listing_id);
        if (match) {
          changed = true;
          return { ...r, listing_title: match.title };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [listings]);

  // Mount effect: now runs exactly once, since fetchListings, fetchCategories,
  // and fetchReports are all stable (empty-deps) callbacks.
  useEffect(() => {
    fetchListings();
    fetchCategories();
    fetchReports();
  }, [fetchListings, fetchCategories, fetchReports]);

  const updateListingStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      toast.success(`স্ট্যাটাস "${statusConfig[status]?.label}" এ পরিবর্তিত`);
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (err: any) {
      toast.error(err.message || "আপডেট ব্যর্থ");
    } finally {
      setUpdating(null);
    }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ is_featured: !current }) });
      toast.success(!current ? "ফিচার্ড করা হয়েছে" : "ফিচার্ড সরানো হয়েছে");
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_featured: !current } : l));
    } catch (err: any) {
      toast.error(err.message || "আপডেট ব্যর্থ");
    }
  };

  const updateListingImage = async (id: string, url: string) => {
    const images = url ? [url] : [];
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ images }) });
      toast.success("ছবি আপডেট হয়েছে");
      setListings(prev => prev.map(l => l.id === id ? { ...l, images } : l));
      return true;
    } catch (err: any) {
      toast.error("ছবি আপডেট ব্যর্থ: " + (err.message || ""));
      return false;
    }
  };

  const deleteListing = async (id: string) => {
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "DELETE" });
      toast.success("বিজ্ঞাপন মুছে ফেলা হয়েছে");
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || "মুছতে ব্যর্থ");
    }
  };

  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = listings.filter(l => l.status === "pending").length;
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalCount = listings.length;
  const featuredCount = listings.filter(l => l.is_featured).length;
  const pendingReportsCount = reports.filter(r => r.status === "pending").length;

  const getCategoryName = (catId: string | null, embedded?: DealListing["deal_categories"]) => {
    if (embedded?.name) return embedded.name;
    if (!catId) return "—";
    return categories.find(c => c.id === catId)?.name || "—";
  };

  // Bulk selection over the currently-filtered listings tab
  const sel = useBulkSelection(filtered, [search, filterStatus]);

  const perms = useBulkPermissions("deals");
  const updateReason = perms.reasonFor("can_update");
  const deleteReason = perms.reasonFor("can_delete");

  const [pendingBulk, setPendingBulk] = useState<{
    tone: BulkActionTone; title: string; description?: string;
    impacts?: BulkImpactRow[]; confirmLabel?: string; warning?: string;
    run: () => Promise<void> | void;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const runBulk = async () => {
    if (!pendingBulk) return;
    setBulkLoading(true);
    try { await pendingBulk.run(); } finally { setBulkLoading(false); setPendingBulk(null); }
  };

  const bulkSetStatus = async (status: string) => {
    if (sel.selectedIds.length === 0) return;
    try {
      await Promise.all(sel.selectedIds.map(id =>
        apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ status }) })
      ));
      setListings(prev => prev.map(l => sel.selected.has(l.id) ? { ...l, status } : l));
      toast.success(`${sel.selectedIds.length}টি বিজ্ঞাপন আপডেট হয়েছে`);
      sel.clear();
    } catch (err: any) {
      toast.error(err.message || "আপডেট ব্যর্থ");
    }
  };

  const bulkSetFeatured = async (featured: boolean) => {
    if (sel.selectedIds.length === 0) return;
    try {
      await Promise.all(sel.selectedIds.map(id =>
        apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ is_featured: featured }) })
      ));
      setListings(prev => prev.map(l => sel.selected.has(l.id) ? { ...l, is_featured: featured } : l));
      toast.success(featured ? "ফিচার্ড করা হয়েছে" : "ফিচার্ড সরানো হয়েছে");
      sel.clear();
    } catch (err: any) {
      toast.error(err.message || "আপডেট ব্যর্থ");
    }
  };

  const bulkDelete = async () => {
    if (sel.selectedIds.length === 0) return;
    const ids = sel.selectedIds;
    try {
      await Promise.all(ids.map(id => apiFetch(`/deal/listings/${id}`, { method: "DELETE" })));
      setListings(prev => prev.filter(l => !sel.selected.has(l.id)));
      toast.success(`${ids.length}টি বিজ্ঞাপন মুছে ফেলা হয়েছে`);
      sel.clear();
    } catch (err: any) {
      toast.error(err.message || "আপডেট ব্যর্থ");
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          🤝 সন্ধান ডিল ম্যানেজমেন্ট
        </h3>
        <Button variant="outline" size="sm" onClick={() => { fetchListings(); fetchCategories(); fetchReports(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> রিফ্রেশ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "মোট বিজ্ঞাপন", value: totalCount, icon: Package, color: "text-blue-600 bg-blue-50" },
          { label: "সক্রিয়", value: activeCount, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "অপেক্ষমাণ", value: pendingCount, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "ফিচার্ড", value: featuredCount, icon: Star, color: "text-amber-600 bg-amber-50" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color.split(" ")[1]}`}>
                <s.icon className={`h-4 w-4 ${s.color.split(" ")[0]}`} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings" className="text-xs">
            <Tag className="h-3.5 w-3.5 mr-1" /> বিজ্ঞাপন ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="featured" className="text-xs">
            <Star className="h-3.5 w-3.5 mr-1" /> ফিচার্ড ({featuredCount})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            <Shield className="h-3.5 w-3.5 mr-1" /> মডারেশন ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> ক্যাটেগরি ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs relative">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> রিপোর্ট
            {pendingReportsCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{pendingReportsCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Listings */}
        <TabsContent value="listings" className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="বিজ্ঞাপন খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtered.length > 0 && (
              <BulkSelectToggle
                allSelected={sel.allSelected}
                someSelected={sel.someSelected}
                selectedCount={sel.selectedCount}
                totalCount={filtered.length}
                onToggle={sel.toggleAll}
                className="shrink-0"
              />
            )}
          </div>

          <ListingTable
            listings={filtered}
            getCategoryName={getCategoryName}
            updating={updating}
            onStatusChange={updateListingStatus}
            onToggleFeatured={toggleFeatured}
            onDelete={deleteListing}
            onImageUpdate={updateListingImage}
            isSelected={sel.isSelected}
            onToggleSelect={sel.toggle}
          />
        </TabsContent>

        {/* Featured Management */}
        <TabsContent value="featured" className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <h4 className="font-bold text-foreground">ফিচার্ড বিজ্ঞাপন প্রমোশন</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              ফিচার্ড বিজ্ঞাপনগুলো হোমপেজে আলাদাভাবে হাইলাইটেড থাকে এবং সর্বপ্রথম প্রদর্শিত হয়। 
              যেকোনো বিজ্ঞাপনের ⭐ বাটনে ক্লিক করে ফিচার্ড করুন বা সরিয়ে দিন।
            </p>
          </div>
          {featuredCount === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>কোনো ফিচার্ড বিজ্ঞাপন নেই</p>
              <p className="text-xs mt-1">বিজ্ঞাপন ট্যাবে গিয়ে ⭐ বাটনে ক্লিক করে ফিচার্ড করুন</p>
            </div>
          ) : (
            <ListingTable
              listings={listings.filter(l => l.is_featured)}
              getCategoryName={getCategoryName}
              updating={updating}
              onStatusChange={updateListingStatus}
              onToggleFeatured={toggleFeatured}
              onDelete={deleteListing}
              onImageUpdate={updateListingImage}
            />
          )}
        </TabsContent>

        {/* Moderation Queue */}
        <TabsContent value="pending" className="space-y-3">
          {pendingCount === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>কোনো অপেক্ষমাণ বিজ্ঞাপন নেই</p>
            </div>
          ) : (
            <ListingTable
              listings={listings.filter(l => l.status === "pending")}
              getCategoryName={getCategoryName}
              updating={updating}
              onStatusChange={updateListingStatus}
              onToggleFeatured={toggleFeatured}
              onDelete={deleteListing}
              onImageUpdate={updateListingImage}
            />
          )}
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="space-y-3">
          <DealCategoryManager categories={categories} onRefresh={fetchCategories} />
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>কোনো রিপোর্ট নেই</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(report => {
                const reasonLabels: Record<string, string> = {
                  fake: "ভুয়া বিজ্ঞাপন", scam: "প্রতারণা/স্ক্যাম", inappropriate: "অশোভন কনটেন্ট",
                  wrong_category: "ভুল ক্যাটেগরি", duplicate: "ডুপ্লিকেট", prohibited: "নিষিদ্ধ পণ্য", other: "অন্যান্য",
                };
                return (
                  <Card key={report.id} className={`border-border/50 ${report.status === "pending" ? "border-l-2 border-l-destructive" : ""}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground truncate">{report.listing_title}</p>
                          <Badge className={report.status === "pending" ? "bg-yellow-100 text-yellow-800 mt-1" : report.status === "resolved" ? "bg-green-100 text-green-800 mt-1" : "bg-muted text-muted-foreground mt-1"}>
                            {report.status === "pending" ? "অপেক্ষমাণ" : report.status === "resolved" ? "সমাধান" : "বাতিল"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{new Date(report.created_at).toLocaleDateString("bn-BD")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{reasonLabels[report.reason] || report.reason}</Badge>
                      </div>
                      {report.details && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{report.details}</p>}
                      {report.status === "pending" && (
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300"
                            onClick={async () => {
                              try {
                                await apiFetch(`/deal/reports/${report.id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
                                });
                                setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "resolved" } : r));
                                toast.success("রিপোর্ট সমাধান হয়েছে");
                              } catch (err: any) {
                                toast.error(err.message || "আপডেট ব্যর্থ");
                              }
                            }}>
                            <CheckCircle className="h-3 w-3 mr-1" /> সমাধান
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground"
                            onClick={async () => {
                              try {
                                await apiFetch(`/deal/reports/${report.id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "dismissed" }),
                                });
                                setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "dismissed" } : r));
                                toast.success("রিপোর্ট বাতিল করা হয়েছে");
                              } catch (err: any) {
                                toast.error(err.message || "আপডেট ব্যর্থ");
                              }
                            }}>
                            <XCircle className="h-3 w-3 mr-1" /> বাতিল
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          { key: "approve", label: "অনুমোদন", icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "primary",
            disabled: !perms.canUpdate, disabledReason: updateReason,
            onClick: () => setPendingBulk({
              tone: "approve", title: "নির্বাচিত বিজ্ঞাপন অনুমোদন করবেন?",
              description: "বিজ্ঞাপনগুলো সক্রিয় হয়ে পাবলিক ফিডে দৃশ্যমান হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "সক্রিয় (active)" },
                { label: "দৃশ্যমানতা", value: "পাবলিক ফিড" },
              ],
              confirmLabel: "হ্যাঁ, অনুমোদন", run: () => bulkSetStatus("active"),
            })},
          { key: "reject", label: "প্রত্যাখ্যান", icon: <XCircle className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: updateReason,
            onClick: () => setPendingBulk({
              tone: "reject", title: "নির্বাচিত বিজ্ঞাপন প্রত্যাখ্যান করবেন?",
              description: "বিজ্ঞাপন পাবলিক ফিড থেকে সরে যাবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "প্রত্যাখ্যাত (rejected)" },
                { label: "দৃশ্যমানতা", value: "লুকানো" },
              ],
              warning: "প্রত্যাখ্যাত বিজ্ঞাপন পাবলিক ফিড থেকে সরে যাবে।",
              confirmLabel: "হ্যাঁ, প্রত্যাখ্যান", run: () => bulkSetStatus("rejected"),
            })},
          { key: "feature", label: "ফিচার্ড", icon: <Star className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: updateReason,
            onClick: () => setPendingBulk({
              tone: "feature", title: "নির্বাচিত বিজ্ঞাপন ফিচার্ড করবেন?",
              description: "বিজ্ঞাপনগুলো হোমপেজে হাইলাইট হিসেবে দেখাবে।",
              impacts: [
                { label: "ফিচার্ড", value: "✓ চালু" },
                { label: "অবস্থান", value: "হোমপেজ হাইলাইট" },
              ],
              confirmLabel: "হ্যাঁ, ফিচার্ড", run: () => bulkSetFeatured(true),
            })},
          { key: "unfeature", label: "আনফিচার", icon: <Star className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: updateReason,
            onClick: () => setPendingBulk({
              tone: "unfeature", title: "নির্বাচিত বিজ্ঞাপন থেকে ফিচার্ড সরাবেন?",
              description: "বিজ্ঞাপনগুলো হোমপেজ হাইলাইট থেকে সরে যাবে।",
              impacts: [
                { label: "ফিচার্ড", value: "✗ বন্ধ" },
                { label: "অবস্থান", value: "সাধারণ ফিড" },
              ],
              confirmLabel: "হ্যাঁ, সরান", run: () => bulkSetFeatured(false),
            })},
          { key: "delete", label: "মুছুন", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive",
            disabled: !perms.canDelete, disabledReason: deleteReason,
            onClick: () => setPendingBulk({
              tone: "delete", title: "নির্বাচিত বিজ্ঞাপন স্থায়ীভাবে মুছবেন?",
              description: "ডেটাবেস থেকে বিজ্ঞাপন ও সংশ্লিষ্ট ছবি/তথ্য সম্পূর্ণ অপসারিত হবে।",
              impacts: [
                { label: "অ্যাকশন", value: "স্থায়ী মুছে ফেলা" },
                { label: "পুনরুদ্ধার", value: "সম্ভব নয়" },
              ],
              warning: "এটি অপরিবর্তনীয়। বিজ্ঞাপন এবং সংশ্লিষ্ট তথ্য পুনরুদ্ধার করা যাবে না।",
              confirmLabel: "হ্যাঁ, মুছুন", run: bulkDelete,
            })},
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(o) => { if (!o) setPendingBulk(null); }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="বিজ্ঞাপন"
        tone={pendingBulk?.tone || "neutral"}
        title={pendingBulk?.title}
        description={pendingBulk?.description}
        impacts={pendingBulk?.impacts}
        warning={pendingBulk?.warning}
        confirmLabel={pendingBulk?.confirmLabel}
        disabledReason={pendingBulk?.tone === "delete" ? perms.reasonFor("can_delete") : perms.reasonFor("can_update")}
        loading={bulkLoading}
      />
    </div>
  );
};

// Reusable listing table
function ListingTable({
  listings, getCategoryName, updating, onStatusChange, onToggleFeatured, onDelete, onImageUpdate,
  isSelected, onToggleSelect,
}: {
  listings: DealListing[];
  getCategoryName: (id: string | null, embedded?: DealListing["deal_categories"]) => string;
  updating: string | null;
  onStatusChange: (id: string, status: string) => void;
  onToggleFeatured: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onImageUpdate: (id: string, url: string) => Promise<boolean>;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  const openImageEditor = (id: string, currentUrl: string) => {
    setEditingImageId(id);
    setNewImageUrl(currentUrl || "");
  };

  const saveImage = async () => {
    if (!editingImageId) return;
    setSavingImage(true);
    const ok = await onImageUpdate(editingImageId, newImageUrl);
    setSavingImage(false);
    if (ok) setEditingImageId(null);
  };

  if (listings.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">কোনো বিজ্ঞাপন পাওয়া যায়নি</div>;
  }

  return (
    <div className="space-y-2">
      {listings.map(listing => {
        const img = Array.isArray(listing.images) ? listing.images[0] : null;
        const noImage = !img;
        const sc = statusConfig[listing.status || "pending"];
        const checked = isSelected ? isSelected(listing.id) : false;
        return (
          <Card key={listing.id} className={`border-border/50 ${checked ? "ring-1 ring-primary border-primary" : ""}`}>
            <CardContent className="p-3">
              <div className="flex gap-3">
                {onToggleSelect && (
                  <BulkSelectCheckbox
                    checked={checked}
                    onChange={() => onToggleSelect(listing.id)}
                    className="mt-1 self-start"
                  />
                )}
                <div className={`w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 relative ${noImage ? "ring-2 ring-yellow-400" : ""}`}>
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-yellow-600 bg-yellow-50">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground text-sm truncate">{listing.title}</h4>
                    <Badge className={`${sc?.color} text-[10px] shrink-0`}>{sc?.label}</Badge>
                  </div>
                  <p className="text-sm font-bold text-primary">৳{listing.price.toLocaleString("bn-BD")}</p>
                  {noImage && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className="bg-yellow-100 text-yellow-800 text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" /> ছবি নেই
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] text-yellow-800 border-yellow-400 hover:bg-yellow-50"
                        onClick={() => openImageEditor(listing.id, "")}
                      >
                        <ImagePlus className="h-3 w-3 mr-1" /> ছবি যোগ করুন
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span>{getCategoryName(listing.category_id, listing.deal_categories)}</span>
                    <span>•</span>
                    <span>{listing.location_division || "—"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{listing.views_count || 0}</span>
                    {listing.is_featured && <Badge className="bg-amber-100 text-amber-800 text-[9px]">⭐ ফিচার্ড</Badge>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/30">
                {listing.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                      disabled={updating === listing.id} onClick={() => onStatusChange(listing.id, "active")}>
                      <CheckCircle className="h-3 w-3 mr-1" /> অনুমোদন
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                      disabled={updating === listing.id} onClick={() => onStatusChange(listing.id, "rejected")}>
                      <XCircle className="h-3 w-3 mr-1" /> প্রত্যাখ্যান
                    </Button>
                  </>
                )}
                {listing.status === "active" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    disabled={updating === listing.id} onClick={() => onStatusChange(listing.id, "pending")}>
                    <Clock className="h-3 w-3 mr-1" /> সাসপেন্ড
                  </Button>
                )}
                {listing.status === "rejected" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-700"
                    disabled={updating === listing.id} onClick={() => onStatusChange(listing.id, "active")}>
                    <CheckCircle className="h-3 w-3 mr-1" /> পুনরায় অনুমোদন
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => onToggleFeatured(listing.id, !!listing.is_featured)}>
                  <Star className={`h-3 w-3 mr-1 ${listing.is_featured ? "fill-amber-500 text-amber-500" : ""}`} />
                  {listing.is_featured ? "আনফিচার" : "ফিচার্ড"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => openImageEditor(listing.id, Array.isArray(listing.images) ? listing.images[0] || "" : "")}>
                  <ImagePlus className="h-3 w-3 mr-1" /> ছবি এডিট
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30">
                      <Trash2 className="h-3 w-3 mr-1" /> মুছুন
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>বিজ্ঞাপন মুছে ফেলবেন?</AlertDialogTitle>
                      <AlertDialogDescription>এই বিজ্ঞাপনটি স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>না</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(listing.id)}>হ্যাঁ, মুছুন</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!editingImageId} onOpenChange={(o) => !o && setEditingImageId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>বিজ্ঞাপনের ছবি আপডেট</DialogTitle>
          </DialogHeader>
          <ImageUploader
            value={newImageUrl}
            onChange={setNewImageUrl}
            folder="deal-listings"
            label="প্রধান ছবি"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImageId(null)}>বাতিল</Button>
            <Button onClick={saveImage} disabled={savingImage}>
              <Save className="h-3.5 w-3.5 mr-1" /> {savingImage ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDealManagement;