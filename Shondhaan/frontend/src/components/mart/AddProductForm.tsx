import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { createMartProduct, updateMartProduct, type MartProductVariant } from "@/lib/martApi";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlus, X, Loader2, Save, Sparkles } from "lucide-react";
import { useAITools } from "@/hooks/useAITools";
import { useQuery } from "@tanstack/react-query";
import { getFullImageUrl } from "@/lib/imageUrl";
const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL || "";
const MAX_GALLERY_IMAGES = 4;

type UnitPriceRow = {
  unit: string;
  sale_price: string;
  original_price: string;
  stock: string;
};

interface AddProductFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onLimitReached?: () => void;
  editProduct?: Record<string, unknown>;
  sellerId?: number | null;
}

const AddProductForm = ({
  open,
  onClose,
  onSuccess,
  onLimitReached,
  editProduct,
  sellerId,
}: AddProductFormProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { generateMartDescription, loading: aiLoading } = useAITools();

  // Add these:
  const { data: categories = [] } = useQuery({
    queryKey: ["mart-categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/categories`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch categories");
      return json.data as {
        id: number;
        name: string;
        name_en?: string | null;
      }[];
    },
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: ["mart-sub-categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sub-categories`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch sub-categories");
      return json.data as { id: number; name: string; category_id: number }[];
    },
  });
  const [subCategoryId, setSubCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("piece");
  const [unitPrices, setUnitPrices] = useState<UnitPriceRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  const parseGalleryUrls = (value: unknown) => {
    if (Array.isArray(value)) {
      return value
        .map((url) => String(url || "").trim())
        .filter(Boolean)
        .slice(0, MAX_GALLERY_IMAGES);
    }
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed
              .map((url) => String(url || "").trim())
              .filter(Boolean)
              .slice(0, MAX_GALLERY_IMAGES)
          : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (open) {
      if (editProduct) {
        setName(editProduct.name || "");
        setNameEn(editProduct.name_en || "");
        setDescription(editProduct.description || "");
        setUnit(editProduct.unit || "piece");
        setUnitPrices(
          Array.isArray(editProduct.unit_prices)
            ? editProduct.unit_prices.map((entry: any) => ({
                unit: String(entry?.unit || ""),
                sale_price: String(entry?.sale_price ?? entry?.price ?? ""),
                original_price: String(entry?.original_price ?? ""),
                stock: String(entry?.stock ?? ""),
              }))
            : [],
        );
        setCategoryId(String(editProduct.category_id || ""));
        setSubCategoryId(String(editProduct.sub_category_id || ""));
        setIsActive(editProduct.is_active ?? true);
        setIsFeatured(editProduct.is_featured ?? false);
        setImageUrl(editProduct.image_url || "");
        setGalleryUrls(parseGalleryUrls(editProduct.gallery_urls));
      } else {
        resetForm();
      }
    }
  }, [open, editProduct]);

  const resetForm = () => {
    setName("");
    setNameEn("");
    setDescription("");
    setUnit("piece");
    setUnitPrices([]);
    setCategoryId("");
    setSubCategoryId("");
    setIsActive(true);
    setIsFeatured(false);
    setImageUrl("");
    setGalleryUrls([]);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("[Upload] Uploading to backend...", {
        name: file.name,
        size: file.size,
      });

      const apiUrl =
        import.meta.env.VITE_MART_API_BASE_URL || "";
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { success: false, message: await res.text() };

      if (!res.ok || !data.success) {
        console.error("[Upload] Failed:", data.message || res.statusText);
        toast.error(bn ? "ছবি আপলোড ব্যর্থ" : "Image upload failed");
        return null;
      }

      console.log("[Upload] Success:", data.url);
      return data.url;
    } catch (err) {
      console.error("[Upload] Exception:", err);
      toast.error(bn ? "ছবি আপলোড ব্যর্থ" : "Image upload failed");
      return null;
    }
  };

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setImageUrl(url);
    setUploading(false);
  };

  const handleGalleryImages = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = MAX_GALLERY_IMAGES - galleryUrls.length;
    if (remainingSlots <= 0) {
      toast.error(
        bn
          ? "à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à§ªà¦Ÿà¦¿ à¦—à§à¦¯à¦¾à¦²à¦¾à¦°à¦¿ à¦›à¦¬à¦¿ à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à¦¾ à¦¯à¦¾à¦¬à§‡"
          : "You can upload up to 4 gallery images",
      );
      e.target.value = "";
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(
        bn
          ? "à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à§ªà¦Ÿà¦¿ à¦—à§à¦¯à¦¾à¦²à¦¾à¦°à¦¿ à¦›à¦¬à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡"
          : "Only 4 gallery images are allowed",
      );
    }
    setUploading(true);
    const urls: string[] = [];
    for (const file of selectedFiles) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
    setGalleryUrls((prev) => [...prev, ...urls].slice(0, MAX_GALLERY_IMAGES));
    setUploading(false);
    e.target.value = "";
  };

  const removeGalleryImage = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addUnitPrice = () => {
    setUnitPrices((prev) => [...prev, { unit: "", sale_price: "", original_price: "", stock: "" }]);
  };

  const updateUnitPrice = (index: number, field: keyof UnitPriceRow, value: string) => {
    setUnitPrices((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const removeUnitPrice = (index: number) => {
    setUnitPrices((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  // Add these:
  const filteredSubCategories = categoryId
    ? subCategories.filter(
        (subCategory) => String(subCategory.category_id) === String(categoryId),
      )
    : [];

  const handleSubmit = async () => {
    if (!name.trim() || unitPrices.length === 0) {
      toast.error(bn ? "পণ্যের নাম ও অন্তত একটি ভ্যারিয়েন্ট আবশ্যক" : "Name and at least one variant are required");
      return;
    }
    if (!user) return;
    if (!sellerId) {
      toast.error(bn ? "Seller not found" : "Seller was not found");
      return;
    }

    setSaving(true);
    const normalizedUnitPrices: MartProductVariant[] = unitPrices.map((row) => ({
      unit: row.unit.trim(),
      sale_price: Number(row.sale_price),
      original_price: row.original_price ? Number(row.original_price) : null,
      stock: Number(row.stock),
    }));

    if (normalizedUnitPrices.some((row) => !row.unit || !Number.isFinite(row.sale_price) || row.sale_price < 0 || !Number.isInteger(row.stock) || row.stock < 0)) {
      toast.error(bn ? "প্রতিটি ভ্যারিয়েন্টের নাম, মূল্য ও স্টক দিন" : "Enter a name, price, and stock for every variant");
      setSaving(false);
      return;
    }

    // DEBUG: verify payload fields that affect listing visibility
    console.log("[Mart AddProductForm] submit payload:", {
      seller_id: sellerId,
      category_id: categoryId ? Number(categoryId) : null,
      sub_category_id: subCategoryId ? Number(subCategoryId) : null,
      name_bn: name.trim(),
      status: isActive ? "active" : "inactive",
      unit_prices: normalizedUnitPrices,
      unit,
      featured: isFeatured ? 1 : 0,
    });

    const productData = {
      seller_id: sellerId,
      category_id: categoryId ? Number(categoryId) : null,
      sub_category_id: subCategoryId ? Number(subCategoryId) : null,
      image: imageUrl || null,
      gallery_urls: galleryUrls.slice(0, MAX_GALLERY_IMAGES),
      name_bn: name.trim(),
      name_en: nameEn.trim() || null,
      description: description.trim() || null,
      unit_prices: normalizedUnitPrices,
      status: isActive ? "active" : "inactive",
      unit,
      featured: isFeatured ? 1 : 0,
      sold_qty: editProduct?.sold_qty ?? editProduct?.total_sold ?? 0,
      discount: 0,
      is_freedelivery: editProduct?.is_freedelivery ? 1 : 0,
    };

    let error;
    try {
      if (editProduct) {
        await updateMartProduct(editProduct.id, productData);
      } else {
        await createMartProduct(productData);
      }
    } catch (caughtError) {
      error = caughtError;
    }

    setSaving(false);
    if (error) {
      const err = error as Error & { code?: string };
      if (err.code === "PRODUCT_LIMIT_REACHED") {
        // Free/paid product limit reached — show the package message and open the modal.
        toast.error(
          bn
            ? "আপনি প্যাকেজ না কিনে আর পণ্য যোগ করতে পারবেন না। নতুন পণ্য যোগ করতে একটি প্যাকেজ কিনুন।"
            : "You cannot add more products without buying a package. Buy a package to add more products.",
        );
        onLimitReached?.();
        onClose();
      } else {
        toast.error(bn ? "সংরক্ষণ ব্যর্থ" : "Save failed");
      }
      console.error(error);
    } else {
      toast.success(
        bn
          ? editProduct
            ? "পণ্য আপডেট হয়েছে"
            : "পণ্য যোগ হয়েছে"
          : editProduct
            ? "Product updated"
            : "Product added",
      );
      onSuccess();
      onClose();
    }
  };

  const units = [
    { value: "piece", label: bn ? "পিস" : "Piece" },
    { value: "kg", label: bn ? "কেজি" : "KG" },
    { value: "gram", label: bn ? "গ্রাম" : "Gram" },
    { value: "liter", label: bn ? "লিটার" : "Liter" },
    { value: "dozen", label: bn ? "ডজন" : "Dozen" },
    { value: "pack", label: bn ? "প্যাক" : "Pack" },
    { value: "box", label: bn ? "বক্স" : "Box" },
    { value: "pair", label: bn ? "জোড়া" : "Pair" },
    { value: "set", label: bn ? "সেট" : "Set" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editProduct
              ? bn
                ? "✏️ পণ্য সম্পাদনা"
                : "✏️ Edit Product"
              : bn
                ? "➕ নতুন পণ্য যোগ করুন"
                : "➕ Add New Product"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Main Image */}
          <div>
            <Label className="text-sm font-medium">
              {bn ? "মূল ছবি" : "Main Image"}
            </Label>
            <div className="mt-2 flex items-start gap-3">
              {imageUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img
                    src={getFullImageUrl(imageUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {bn ? "আপলোড" : "Upload"}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImage}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {bn ? "গ্যালারি ছবি" : "Gallery Images"}
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {galleryUrls.length}/{MAX_GALLERY_IMAGES}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {galleryUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-border"
                >
                  <img
                    src={getFullImageUrl(url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeGalleryImage(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {galleryUrls.length < MAX_GALLERY_IMAGES && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryImages}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                {bn ? "পণ্যের নাম (বাংলা) *" : "Product Name (Bangla) *"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={bn ? "যেমন: বাসমতি চাল" : "e.g. Basmati Rice"}
                className="mt-1"
              />
            </div>
            <div>
              <Label>
                {bn ? "পণ্যের নাম (ইংরেজি)" : "Product Name (English)"}
              </Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Basmati Rice"
                className="mt-1"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between">
              <Label>{bn ? "বিবরণ" : "Description"}</Label>
              {name.trim().length >= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  disabled={aiLoading}
                  onClick={async () => {
                    const categoryName =
                      categories.find(
                        (c) => String(c.id) === String(categoryId),
                      )?.name || "";
                    const desc = await generateMartDescription(
                      name,
                      categoryName,
                      "",
                    );
                    if (desc) setDescription(desc);
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                bn ? "পণ্যের বিস্তারিত বিবরণ..." : "Product description..."
              }
              className="mt-1"
              rows={3}
            />
          </div>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">{bn ? "বিভিন্ন এককের মূল্য" : "Multiple unit prices"}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addUnitPrice}>
                + {bn ? "একক যোগ করুন" : "Add unit"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {unitPrices.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {bn ? "যেমন: 100 gm, 300 gm এবং প্রতিটির মূল্য ও স্টক লিখুন" : "Add entries such as 100 gm or 300 gm with their price and stock."}
                </p>
              )}
              {unitPrices.map((row, index) => {
                const unitLabel = row.unit.trim();
                return (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">{bn ? "এককের পরিমাণ" : "Unit amount"}</Label>
                    <Input value={row.unit} onChange={(e) => updateUnitPrice(index, "unit", e.target.value)} placeholder="100 gm" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? "বিক্রয় মূল্য" : "Sale price"}</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        value={row.sale_price}
                        onChange={(e) => updateUnitPrice(index, "sale_price", e.target.value)}
                        placeholder="0"
                        className={unitLabel ? "pr-16" : ""}
                      />
                      {unitLabel && (
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 max-w-[60px] truncate text-[11px] text-muted-foreground">
                          /{unitLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? "আসল মূল্য" : "Original price"}</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        value={row.original_price}
                        onChange={(e) => updateUnitPrice(index, "original_price", e.target.value)}
                        placeholder="Optional"
                        className={unitLabel ? "pr-16" : ""}
                      />
                      {unitLabel && (
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 max-w-[60px] truncate text-[11px] text-muted-foreground">
                          /{unitLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? "স্টক" : "Stock"}</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateUnitPrice(index, "stock", e.target.value)}
                        placeholder="0"
                        className={unitLabel ? "pr-16" : ""}
                      />
                      {unitLabel && (
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 max-w-[60px] truncate text-[11px] text-muted-foreground">
                          {unitLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeUnitPrice(index)} aria-label={bn ? "একক মুছুন" : "Remove unit"}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Category & Sub Category & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{bn ? "ক্যাটেগরি" : "Category"}</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setSubCategoryId("");
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={bn ? "ক্যাটেগরি নির্বাচন" : "Select category"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{bn ? "একক" : "Unit"}</Label>
              <Select
                value={unit}
                onValueChange={(value) => {
                  setUnit(value);
                  if (value === "gram" && unitPrices.length === 0) {
                    setUnitPrices([{ unit: "100 gm", sale_price: "", original_price: "", stock: "" }]);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {categoryId && filteredSubCategories.length > 0 && (
            <div>
              <Label>{bn ? "সাব ক্যাটেগরি" : "Sub Category"}</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      bn ? "সাব ক্যাটেগরি নির্বাচন" : "Select sub category"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubCategories.map((sc) => (
                    <SelectItem key={sc.id} value={String(sc.id)}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm">{bn ? "সক্রিয়" : "Active"}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label className="text-sm">{bn ? "ফিচার্ড" : "Featured"}</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              {bn ? "বাতিল" : "Cancel"}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {editProduct
                ? bn
                  ? "আপডেট করুন"
                  : "Update"
                : bn
                  ? "সংরক্ষণ করুন"
                  : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductForm;