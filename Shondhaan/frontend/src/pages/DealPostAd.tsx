import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Loader2,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const selectedCategoryName =
    categories?.find((c) => String(c.id) === String(form.category_id))?.name || "";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
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
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Failed to post ad"
        );
      }

      toast.success(
        bn ? "বিজ্ঞাপন সফলভাবে পোস্ট করা হয়েছে!" : "Ad posted successfully!"
      );

      navigate("/deal");
    } catch (error: any) {
      console.error("Post deal ad error:", error);

      toast.error(
        error?.message ||
          (bn ? "বিজ্ঞাপন পোস্ট করতে সমস্যা হয়েছে" : "Failed to post ad")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-foreground px-4 md:px-0 mt-6 md:mt-0">
      <Navbar />

      <div className="pt-[44px] md:pt-[68px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-4 pb-28 md:pb-10 border shadow bg-card rounded-xl"
        >
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-bold text-foreground">
            {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
          </h1>
        </div>

        <div className="space-y-4">
          <div className="border-border/50">
            <div className="">
              <CardHeader className="text-base">
                {bn ? "ক্যাটাগরি নির্বাচন" : "Select Category"}
              </CardHeader>
            </div>

            <CardContent>
              <Select
                value={form.category_id}
                onValueChange={(v) => updateField("category_id", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={bn ? "ক্যাটাগরি বাছুন" : "Choose category"}
                  />
                </SelectTrigger>

                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.icon} {bn ? c.name : c.name_en || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </div>

          <div className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {bn ? "বিজ্ঞাপনের তথ্য" : "Ad Details"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "শিরোনাম" : "Title"} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder={bn ? "কী বিক্রি করতে চান?" : "What are you selling?"}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? "বিবরণ" : "Description"}</Label>

                  {form.title.trim().length >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      disabled={aiLoading}
                      onClick={async () => {
                        const desc = await generateDescription(
                          form.title,
                          selectedCategoryName,
                          form.condition
                        );

                        if (desc) updateField("description", desc);
                      }}
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {bn ? "AI বিবরণ" : "AI Write"}
                    </Button>
                  )}
                </div>

                <Textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder={bn ? "বিস্তারিত লিখুন..." : "Write details..."}
                  rows={5}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </div>

          <div className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {bn ? "মূল্য ও অবস্থা" : "Price & Condition"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? "মূল্য (৳)" : "Price (৳)"}</Label>

                  {form.title.trim().length >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      disabled={aiLoading}
                      onClick={async () => {
                        const result = await suggestPrice(
                          form.title,
                          selectedCategoryName,
                          form.condition
                        );

                        if (result) {
                          if (result.min && result.max) {
                            const avg = Math.round((result.min + result.max) / 2);

                            updateField("price", String(avg));

                            toast.info(
                              `💡 ${
                                bn ? "সাজেস্টেড মূল্য পরিসীমা" : "Suggested range"
                              }: ৳${result.min} - ৳${result.max}`,
                              { duration: 5000 }
                            );
                          }

                          if (result.suggestion) {
                            toast.info(`🤖 ${result.suggestion}`, {
                              duration: 6000,
                            });
                          }
                        }
                      }}
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {bn ? "AI মূল্য" : "AI Price"}
                    </Button>
                  )}
                </div>

                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{bn ? "দরদাম যোগ্য" : "Negotiable"}</Label>
                <Switch
                  checked={form.is_negotiable}
                  onCheckedChange={(v) => updateField("is_negotiable", v)}
                />
              </div>

              <div>
                <Label>{bn ? "অবস্থা" : "Condition"}</Label>

                <Select
                  value={form.condition}
                  onValueChange={(v) => updateField("condition", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="new">
                      {bn ? "নতুন" : "New"}
                    </SelectItem>
                    <SelectItem value="used">
                      {bn ? "ব্যবহৃত" : "Used"}
                    </SelectItem>
                    <SelectItem value="reconditioned">
                      {bn ? "রিকন্ডিশনড" : "Reconditioned"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </div>

          <div className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {bn ? "ছবি যোগ করুন" : "Add Photos"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <DealImageUploader
                images={form.imageUrls}
                onChange={(imgs) => updateField("imageUrls", imgs)}
                maxImages={8}
                labelAdd={bn ? "ছবি" : "Photo"}
                labelMax={
                  bn
                    ? "সর্বোচ্চ ৮টি ছবি আপলোড করতে পারবেন (প্রতিটি সর্বোচ্চ ৫MB)"
                    : "Max 8 photos (5MB each)"
                }
              />
            </CardContent>
          </div>

          <div className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {bn ? "লোকেশন" : "Location"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "বিভাগ" : "Division"} *</Label>

                <Select
                  value={form.location_division}
                  onValueChange={(v) => {
                    updateField("location_division", v);
                    updateField("location_district", "");
                    updateField("location_area", "");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select division"}
                    />
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
                  const selectedDiv = locationData.find(
                    (d) => d.nameBn === form.location_division
                  );

                  if (!selectedDiv) return null;

                  return (
                    <div>
                      <Label>{bn ? "জেলা" : "District"}</Label>

                      <Select
                        value={form.location_district}
                        onValueChange={(v) => {
                          updateField("location_district", v);
                          updateField("location_area", "");
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue
                            placeholder={
                              bn ? "জেলা নির্বাচন করুন" : "Select district"
                            }
                          />
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
                  const selectedDiv = locationData.find(
                    (d) => d.nameBn === form.location_division
                  );

                  const selectedDist = selectedDiv?.districts.find(
                    (d) => d.nameBn === form.location_district
                  );

                  if (!selectedDist?.thanas || selectedDist.thanas.length === 0) {
                    return null;
                  }

                  return (
                    <div>
                      <Label>{bn ? "থানা / এলাকা" : "Thana / Area"}</Label>

                      <Select
                        value={form.location_area}
                        onValueChange={(v) => updateField("location_area", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue
                            placeholder={
                              bn ? "থানা নির্বাচন করুন" : "Select thana"
                            }
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {selectedDist.thanas.map((t, i) => (
                            <SelectItem key={t} value={t}>
                              {t}
                              {selectedDist.thanasEn?.[i]
                                ? ` (${selectedDist.thanasEn[i]})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
            </CardContent>
          </div>

          <div className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {bn ? "যোগাযোগ" : "Contact"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <Label>{bn ? "ফোন নম্বর" : "Phone Number"}</Label>

                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  {bn ? "ফোন নম্বর লুকান" : "Hide Phone"}
                </Label>

                <Switch
                  checked={form.hide_phone}
                  onCheckedChange={(v) => updateField("hide_phone", v)}
                />
              </div>
            </CardContent>
          </div>

          <div className="px-4 md:px-6">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 text-base font-bold rounded-xl gap-2 hover:bg-emerald-600"
              >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}

              {bn ? "বিজ্ঞাপন পোস্ট করুন" : "Post Ad"}
            </Button>
          </div>
        
        </div>
      </motion.div>
    </div>
  );
};

export default DealPostAd;