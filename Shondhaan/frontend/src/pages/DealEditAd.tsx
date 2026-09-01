import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Save, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDealCategories, useDealListing } from "@/hooks/useDealData";
import Navbar from "@/components/Navbar";
import DealImageUploader from "@/components/deal/DealImageUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { divisions as locationData } from "@/data/locations";

const DEAL_API = (import.meta.env.VITE_DEAL_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

const DealEditAd = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user, loading: authLoading } = useAuth();
  const { data: categories } = useDealCategories();
  const { data: listing, isLoading } = useDealListing(id || "");

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category_id: "",
    condition: "ব্যবহৃত",
    is_negotiable: true,
    location_division: "",
    location_district: "",
    location_area: "",
    phone: "",
    hide_phone: false,
    imageUrls: [] as string[],
    status: "active",
  });
  const [loaded, setLoaded] = useState(false);

  // ─── Get Auth Token from any available source ───
  const getAuthToken = (): string | null => {
    const tryParse = (raw: string | null): string | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.token || parsed?.access_token || parsed?.accessToken || null;
      } catch {
        return null;
      }
    };

    // Check specific auth keys
    const keysToCheck = ["deal_auth", "mysql_auth", "auth", "auth_token", "user_auth"];
    for (const key of keysToCheck) {
      const token = tryParse(localStorage.getItem(key));
      if (token) return token;
    }

    // Check Supabase keys
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const token = tryParse(localStorage.getItem(key));
        if (token) return token;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (listing && !loaded) {
      console.log("[DealEditAd] Listing user_id:", listing.user_id, "Type:", typeof listing.user_id);
      console.log("[DealEditAd] Logged-in user.id:", user?.id, "Type:", typeof user?.id);

      if (user && String(listing.user_id) !== String(user.id)) {
        console.log("[DealEditAd] Ownership check FAILED. Redirecting...");
        toast.error(bn ? "এটি আপনার বিজ্ঞাপন নয়" : "This is not your ad");
        navigate("/deal");
        return;
      }

      console.log("[DealEditAd] Ownership check PASSED. Loading form data.");

      setForm({
        title: listing.title || "",
        description: listing.description || "",
        price: listing.price?.toString() || "0",
        category_id: listing.category_id || "",
        condition: listing.condition || "ব্যবহৃত",
        is_negotiable: listing.is_negotiable ?? true,
        location_division: listing.location_division || "",
        location_district: listing.location_district || "",
        location_area: listing.location_area || "",
        phone: listing.phone || "",
        hide_phone: listing.hide_phone ?? false,
        imageUrls: listing.images || [],
        status: listing.status || "active",
      });
      setLoaded(true);
    }
  }, [listing, loaded, user, bn, navigate]);

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

const handleSubmit = async () => {
  if (!user || !id) return;
  if (!form.title.trim()) { toast.error(bn ? "শিরোনাম দিন" : "Title required"); return; }
  if (!form.category_id) { toast.error(bn ? "ক্যাটাগরি নির্বাচন করুন" : "Select category"); return; }

  setSubmitting(true);
  try {
    const token = getAuthToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${DEAL_API}/api/deal/listings/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        user_id: user.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price) || 0,
        category_id: form.category_id,
        condition: form.condition,
        is_negotiable: form.is_negotiable,
        location_division: form.location_division,
        location_district: form.location_district,
        location_area: form.location_area,
        phone: form.phone,
        hide_phone: form.hide_phone,
        images: form.imageUrls,
        status: form.status,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || (bn ? "আপডেট ব্যর্থ" : "Update failed"));
    }

    toast.success(data.message || (bn ? "বিজ্ঞাপন সফলভাবে আপডেট হয়েছে!" : "Ad updated successfully!"));
    navigate(`/deal/ad/${id}`);
  } catch (err) {
    console.error("Update error:", err);
    toast.error(err instanceof Error ? err.message : (bn ? "আপডেট করতে সমস্যা হয়েছে" : "Failed to update"));
  } finally {
    setSubmitting(false);
  }
};
  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const token = getAuthToken();

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${DEAL_API}/api/deal/listings/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || (bn ? "মুছতে সমস্যা হয়েছে" : "Delete failed"));
      }

      toast.success(data.message || (bn ? "বিজ্ঞাপন মুছে ফেলা হয়েছে" : "Ad deleted"));
      navigate("/deal");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err instanceof Error ? err.message : (bn ? "মুছতে সমস্যা হয়েছে" : "Failed to delete"));
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[68px]" />
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  const selectedDiv = locationData.find(d => d.nameBn === form.location_division);
  const selectedDist = selectedDiv?.districts.find(d => d.nameBn === form.location_district);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-10">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold text-foreground">{bn ? "বিজ্ঞাপন সম্পাদনা" : "Edit Ad"}</h1>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "স্ট্যাটাস" : "Status"}</CardTitle></CardHeader>
            <CardContent>
              <Select value={form.status} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{bn ? "সক্রিয়" : "Active"}</SelectItem>
                  <SelectItem value="sold">{bn ? "বিক্রি হয়েছে" : "Sold"}</SelectItem>
                  <SelectItem value="inactive">{bn ? "নিষ্ক্রিয়" : "Inactive"}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "ক্যাটাগরি" : "Category"}</CardTitle></CardHeader>
            <CardContent>
              <Select value={form.category_id} onValueChange={v => updateField("category_id", v)}>
                <SelectTrigger><SelectValue placeholder={bn ? "ক্যাটাগরি বাছুন" : "Choose category"} /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {bn ? c.name : (c.name_en || c.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Title & Description */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "বিজ্ঞাপনের তথ্য" : "Ad Details"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "শিরোনাম" : "Title"} *</Label>
                <Input value={form.title} onChange={e => updateField("title", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>{bn ? "বিবরণ" : "Description"}</Label>
                <Textarea value={form.description} onChange={e => updateField("description", e.target.value)} rows={5} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Price & Condition */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "মূল্য ও অবস্থা" : "Price & Condition"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "মূল্য (৳)" : "Price (৳)"}</Label>
                <Input type="number" value={form.price} onChange={e => updateField("price", e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <Label>{bn ? "দরদাম যোগ্য" : "Negotiable"}</Label>
                <Switch checked={form.is_negotiable} onCheckedChange={v => updateField("is_negotiable", v)} />
              </div>
              <div>
                <Label>{bn ? "অবস্থা" : "Condition"}</Label>
                <Select value={form.condition} onValueChange={v => updateField("condition", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="নতুন">{bn ? "নতুন" : "New"}</SelectItem>
                    <SelectItem value="ব্যবহৃত">{bn ? "ব্যবহৃত" : "Used"}</SelectItem>
                    <SelectItem value="রিফারবিশড">{bn ? "রিফারবিশড" : "Refurbished"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "ছবি" : "Photos"}</CardTitle></CardHeader>
            <CardContent>
              <DealImageUploader
                images={form.imageUrls}
                onChange={(imgs) => updateField("imageUrls", imgs)}
                maxImages={8}
                labelAdd={bn ? "ছবি" : "Photo"}
                labelMax={bn ? "সর্বোচ্চ ৮টি ছবি আপলোড করতে পারবেন (প্রতিটি সর্বোচ্চ ৫MB)" : "Max 8 photos (5MB each)"}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "লোকেশন" : "Location"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "বিভাগ" : "Division"} *</Label>
                <Select value={form.location_division} onValueChange={v => { updateField("location_division", v); updateField("location_district", ""); updateField("location_area", ""); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select division"} /></SelectTrigger>
                  <SelectContent>
                    {locationData.map(d => <SelectItem key={d.nameBn} value={d.nameBn}>{d.nameBn} ({d.name})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedDiv && (
                <div>
                  <Label>{bn ? "জেলা" : "District"}</Label>
                  <Select value={form.location_district} onValueChange={v => { updateField("location_district", v); updateField("location_area", ""); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? "জেলা নির্বাচন করুন" : "Select district"} /></SelectTrigger>
                    <SelectContent>
                      {selectedDiv.districts.map(d => <SelectItem key={d.nameBn} value={d.nameBn}>{d.nameBn} ({d.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedDist?.thanas && selectedDist.thanas.length > 0 && (
                <div>
                  <Label>{bn ? "থানা / এলাকা" : "Thana / Area"}</Label>
                  <Select value={form.location_area} onValueChange={v => updateField("location_area", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? "থানা নির্বাচন করুন" : "Select thana"} /></SelectTrigger>
                    <SelectContent>
                      {selectedDist.thanas.map((t, i) => (
                        <SelectItem key={t} value={t}>{t}{selectedDist.thanasEn?.[i] ? ` (${selectedDist.thanasEn[i]})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">{bn ? "যোগাযোগ" : "Contact"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "ফোন নম্বর" : "Phone Number"}</Label>
                <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="01XXXXXXXXX" className="mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{bn ? "ফোন নম্বর লুকান" : "Hide Phone"}</Label>
                <Switch checked={form.hide_phone} onCheckedChange={v => updateField("hide_phone", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 text-base font-bold rounded-xl gap-2">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {bn ? "আপডেট করুন" : "Update Ad"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-12 px-4 rounded-xl">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{bn ? "বিজ্ঞাপন মুছে ফেলবেন?" : "Delete this ad?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {bn ? "এই কাজটি আর ফেরানো যাবে না।" : "This action cannot be undone."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{bn ? "বাতিল" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {bn ? "মুছে ফেলুন" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DealEditAd;