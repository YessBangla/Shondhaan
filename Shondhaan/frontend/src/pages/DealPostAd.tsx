import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Loader2,
  Sparkles,
  DollarSign,
  Tag,
  FileText,
  MapPin,
  Phone,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDealCategories } from "@/hooks/useDealData";
import { useAITools } from "@/hooks/useAITools";
import { toast } from "sonner";
import { divisions as locationData } from "@/data/locations";
import Navbar from "@/components/Navbar";
import DealImageUploader from "@/components/deal/DealImageUploader";

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "VITE_DEAL_API_BASE_URL"
).replace(/\/+$/, "");

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const DealPostAd = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const { user, loading: authLoading } = useAuth();
  const { data: categories } = useDealCategories();
  const { generateDescription, suggestPrice, loading: aiLoading } = useAITools();

  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    parent_category_id: "",
    subcategory_id: "",
    category_id: "",
    condition: "used",
    is_negotiable: true,
    location_division: "",
    location_district: "",
    location_area: "",
    phone: "",
    hide_phone: false,
    imageUrls: [] as string[],
  });

  const parentCategories = useMemo(
    () => (categories || []).filter((category) => !category.parent_id),
    [categories]
  );

  const subcategories = useMemo(
    () =>
      (categories || []).filter(
        (category) =>
          category.parent_id &&
          String(category.parent_id) === String(form.parent_category_id)
      ),
    [categories, form.parent_category_id]
  );

  const selectedCategory = categories?.find(
    (category) => String(category.id) === String(form.category_id)
  );
  const selectedCategoryName = selectedCategory?.name || "";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleSubmit = async () => {
    const userId = getLoggedInUserId();

    if (!userId) {
      toast.error(bn ? "লগইন তথ্য পাওয়া যায়নি" : "Login user not found");
      return;
    }
    if (!form.title.trim()) {
      toast.error(bn ? "শিরোনাম দিন" : "Title required");
      return;
    }
    if (!form.category_id) {
      toast.error(bn ? "ক্যাটাগরি নির্বাচন করুন" : "Select category");
      return;
    }
    if (!form.location_division) {
      toast.error(bn ? "বিভাগ নির্বাচন করুন" : "Select division");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${DEAL_API_BASE_URL}/api/deal/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price || 0),
          category_id: form.category_id,
          condition: form.condition,
          is_negotiable: form.is_negotiable,
          location_division: form.location_division,
          location_district: form.location_district,
          location_area: form.location_area,
          phone: form.phone,
          hide_phone: form.hide_phone,
          images: form.imageUrls,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to post ad");
      }

      toast.success(bn ? "বিজ্ঞাপন সফলভাবে পোস্ট করা হয়েছে!" : "Ad posted successfully!");
      navigate("/deal");
    } catch (error: any) {
      console.error("Post deal ad error:", error);
      toast.error(error?.message || (bn ? "বিজ্ঞাপন পোস্ট করতে সমস্যা হয়েছে" : "Failed to post ad"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24 md:pb-0">
      <Navbar />
      <div className="pt-[64px] md:pt-[72px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        {/* Header Card */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-3 p-4 md:p-5 mb-4 bg-card border border-border/60 shadow-sm rounded-2xl sticky top-[64px] md:top-[72px] z-20 backdrop-blur-md bg-card/90"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
              {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {bn ? "আপনার পণ্য সহজে এবং দ্রুত বিক্রি করুন" : "Sell your item easily and quickly"}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Tag className="h-5 w-5" />
          </div>
        </motion.div>

        <div className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden divide-y divide-border/60">
          
          {/* Section 1: Category */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "ক্যাটাগরি নির্বাচন" : "Select Category"}</h3>
            </div>
            <Select
              value={form.parent_category_id}
              onValueChange={(v) => {
                updateField("parent_category_id", v);
                updateField("subcategory_id", "");
                updateField("category_id", v);
              }}
            >
              <SelectTrigger className="bg-background rounded-lg focus-visible:ring-primary/40">
                <SelectValue placeholder={bn ? "ক্যাটাগরি বাছুন" : "Choose category"} />
              </SelectTrigger>
              <SelectContent>
                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {bn ? c.name : c.name_en || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.parent_category_id && subcategories.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="mt-3 overflow-hidden"
              >
                <Select
                  value={form.subcategory_id}
                  onValueChange={(v) => {
                    updateField("subcategory_id", v);
                    updateField("category_id", v);
                  }}
                >
                  <SelectTrigger className="bg-background rounded-lg focus-visible:ring-primary/40">
                    <SelectValue placeholder={bn ? "সাবক্যাটাগরি বাছুন" : "Choose subcategory"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                        {bn ? subcategory.name : subcategory.name_en || subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </motion.div>

          {/* Section 2: Ad Details */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "বিজ্ঞাপনের তথ্য" : "Ad Details"}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">{bn ? "শিরোনাম" : "Title"} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder={bn ? "কী বিক্রি করতে চান?" : "What are you selling?"}
                  className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">{bn ? "বিবরণ" : "Description"}</Label>
                  {form.title.trim().length >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary rounded-full"
                      disabled={aiLoading}
                      onClick={async () => {
                        const desc = await generateDescription(form.title, selectedCategoryName, form.condition);
                        if (desc) updateField("description", desc);
                      }}
                    >
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {bn ? "AI বিবরণ" : "AI Write"}
                    </Button>
                  )}
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder={bn ? "বিস্তারিত লিখুন..." : "Write details..."}
                  rows={5}
                  className="bg-background rounded-lg focus-visible:ring-primary/40 resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Section 3: Price & Condition */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "মূল্য ও অবস্থা" : "Price & Condition"}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">{bn ? "মূল্য (৳)" : "Price (৳)"}</Label>
                  {form.title.trim().length >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary rounded-full"
                      disabled={aiLoading}
                      onClick={async () => {
                        const result = await suggestPrice(form.title, selectedCategoryName, form.condition);
                        if (result) {
                          if (result.min && result.max) {
                            const avg = Math.round((result.min + result.max) / 2);
                            updateField("price", String(avg));
                            toast.info(`💡 ${bn ? "সাজেস্টেড মূল্য পরিসীমা" : "Suggested range"}: ৳${result.min} - ৳${result.max}`, { duration: 5000 });
                          }
                          if (result.suggestion) {
                            toast.info(`🤖 ${result.suggestion}`, { duration: 6000 });
                          }
                        }
                      }}
                    >
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                      {bn ? "AI মূল্য" : "AI Price"}
                    </Button>
                  )}
                </div>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="0"
                  className="bg-background rounded-lg focus-visible:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                <Label className="text-sm font-medium">{bn ? "দরদাম যোগ্য" : "Negotiable"}</Label>
                <Switch
                  checked={form.is_negotiable}
                  onCheckedChange={(v) => updateField("is_negotiable", v)}
                />
              </div>

              <div>
                <Label className="text-xs font-medium">{bn ? "অবস্থা" : "Condition"}</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => updateField("condition", v)}
                >
                  <SelectTrigger className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{bn ? "নতুন" : "New"}</SelectItem>
                    <SelectItem value="used">{bn ? "ব্যবহৃত" : "Used"}</SelectItem>
                    <SelectItem value="reconditioned">{bn ? "রিকন্ডিশনড" : "Reconditioned"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Section 4: Photos */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "ছবি যোগ করুন" : "Add Photos"}</h3>
            </div>
            <DealImageUploader
              images={form.imageUrls}
              onChange={(imgs) => updateField("imageUrls", imgs)}
              maxImages={8}
              labelAdd={bn ? "ছবি" : "Photo"}
              labelMax={bn ? "সর্বোচ্চ ৮টি ছবি আপলোড করতে পারবেন (প্রতিটি সর্বোচ্চ ৫MB)" : "Max 8 photos (5MB each)"}
            />
          </motion.div>

          {/* Section 5: Location */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "লোকেশন" : "Location"}</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">{bn ? "বিভাগ" : "Division"} *</Label>
                <Select
                  value={form.location_division}
                  onValueChange={(v) => {
                    updateField("location_division", v);
                    updateField("location_district", "");
                    updateField("location_area", "");
                  }}
                >
                  <SelectTrigger className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40">
                    <SelectValue placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select division"} />
                  </SelectTrigger>
                  <SelectContent>
                    {locationData.map((d) => (
                      <SelectItem key={d.nameBn} value={d.nameBn}>
                        {d.nameBn} ({d.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.location_division &&
                (() => {
                  const selectedDiv = locationData.find((d) => d.nameBn === form.location_division);
                  if (!selectedDiv) return null;
                  return (
                    <div>
                      <Label className="text-xs font-medium">{bn ? "জেলা" : "District"}</Label>
                      <Select
                        value={form.location_district}
                        onValueChange={(v) => {
                          updateField("location_district", v);
                          updateField("location_area", "");
                        }}
                      >
                        <SelectTrigger className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40">
                          <SelectValue placeholder={bn ? "জেলা নির্বাচন করুন" : "Select district"} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDiv.districts.map((d) => (
                            <SelectItem key={d.nameBn} value={d.nameBn}>
                              {d.nameBn} ({d.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

              {form.location_district &&
                (() => {
                  const selectedDiv = locationData.find((d) => d.nameBn === form.location_division);
                  const selectedDist = selectedDiv?.districts.find((d) => d.nameBn === form.location_district);
                  if (!selectedDist?.thanas || selectedDist.thanas.length === 0) return null;
                  return (
                    <div>
                      <Label className="text-xs font-medium">{bn ? "থানা / এলাকা" : "Thana / Area"}</Label>
                      <Select
                        value={form.location_area}
                        onValueChange={(v) => updateField("location_area", v)}
                      >
                        <SelectTrigger className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40">
                          <SelectValue placeholder={bn ? "থানা নির্বাচন করুন" : "Select thana"} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDist.thanas.map((t, i) => (
                            <SelectItem key={t} value={t}>
                              {t}
                              {selectedDist.thanasEn?.[i] ? ` (${selectedDist.thanasEn[i]})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
            </div>
          </motion.div>

          {/* Section 6: Contact */}
          <motion.div variants={itemVariants} className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{bn ? "যোগাযোগ" : "Contact"}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">{bn ? "ফোন নম্বর" : "Phone Number"}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="mt-1.5 bg-background rounded-lg focus-visible:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                <Label className="text-sm font-medium">{bn ? "ফোন নম্বর লুকান" : "Hide Phone"}</Label>
                <Switch
                  checked={form.hide_phone}
                  onCheckedChange={(v) => updateField("hide_phone", v)}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Desktop Submit Button */}
        <motion.div 
          variants={itemVariants} 
          className="mt-6 hidden md:block"
        >
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 text-base font-bold rounded-xl gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            {bn ? "বিজ্ঞাপন পোস্ট করুন" : "Post Ad"}
          </Button>
        </motion.div>
      </motion.div>

      {/* Mobile Sticky Submit Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/90 backdrop-blur-md border-t border-border z-30 md:hidden">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 text-base font-bold rounded-xl gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-primary/20"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {bn ? "বিজ্ঞাপন পোস্ট করুন" : "Post Ad"}
        </Button>
      </div>

    </div>
  );
};

export default DealPostAd;