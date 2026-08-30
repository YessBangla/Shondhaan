import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Save, X, Upload, Image as ImageIcon, Loader2, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceOffer {
  id?: number;
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  image_url: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  service_id: number | null;
  category_id: number | null;
  offer_code: string;
  start_date: string | null;
  end_date: string | null;
  is_featured: boolean;
  is_active: boolean;
}

const emptyOffer: ServiceOffer = {
  title: "",
  title_bn: "",
  description: "",
  description_bn: "",
  image_url: "",
  discount_type: "percentage",
  discount_value: 0,
  service_id: null,
  category_id: null,
  offer_code: "",
  start_date: null,
  end_date: null,
  is_featured: false,
  is_active: true,
};

const SERVICE_API = (import.meta.env.VITE_SERVICE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const API_URL = `${SERVICE_API}/api/service-offers`;

const getImageUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${SERVICE_API}${url}`;
};

const AdminOffers = () => {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceOffer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        setOffers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      toast.error("অফার লোড করতে সমস্যা হয়েছে");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // ─── Image Handlers ───
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি ফাইল আপলোড করুন");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ফাইল সাইজ ৫MB এর বেশি হতে পারবে না");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
    toast.success("ছবি নির্বাচিত হয়েছে");
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (editing) {
      setEditing({ ...editing, image_url: "" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Start Editing ───
  const startEditing = (offer: ServiceOffer) => {
    setEditing({
      ...offer,
      start_date: offer.start_date ? new Date(offer.start_date).toISOString() : null,
      end_date: offer.end_date ? new Date(offer.end_date).toISOString() : null,
    });
    setImagePreview(offer.image_url || "");
    setImageFile(null);
  };

  const startCreating = () => {
    setEditing({ ...emptyOffer });
    setImagePreview("");
    setImageFile(null);
  };

  const cancelEditing = () => {
    setEditing(null);
    setImagePreview("");
    setImageFile(null);
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!editing?.title || !editing?.title_bn) {
      toast.error("টাইটেল (ইংরেজি ও বাংলা) আবশ্যক");
      return;
    }

    setIsSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url = editing.id ? `${API_URL}/${editing.id}` : API_URL;

      const payload: Record<string, any> = {
        title: editing.title,
        title_bn: editing.title_bn,
        description: editing.description || "",
        description_bn: editing.description_bn || "",
        discount_type: editing.discount_type,
        discount_value: editing.discount_value,
        service_id: editing.service_id,
        category_id: editing.category_id,
        offer_code: editing.offer_code || "",
        start_date: editing.start_date,
        end_date: editing.end_date,
        is_featured: editing.is_featured ? 1 : 0,
        is_active: editing.is_active ? 1 : 0,
      };

      // If new image file selected, send as base64
      if (imageFile && imagePreview) {
        payload.image_base64 = imagePreview;
      } else if (editing.image_url) {
        payload.image_url = editing.image_url;
      } else {
        payload.image_url = "";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editing.id ? "আপডেট হয়েছে" : "নতুন অফার তৈরি হয়েছে");
        cancelEditing();
        fetchOffers();
      } else {
        toast.error(data.message || "সেভ করতে সমস্যা হয়েছে");
      }
    } catch (error: any) {
      toast.error(error.message || "নেটওয়ার্ক সমস্যা");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete ───
  const handleDelete = async (id: number) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই অফারটি মুছে ফেলতে চান?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("অফার মুছে ফেলা হয়েছে");
        fetchOffers();
      } else {
        toast.error(data.message || "মুছতে সমস্যা হয়েছে");
      }
    } catch (error: any) {
      toast.error(error.message || "নেটওয়ার্ক সমস্যা");
    }
  };

  // ─── Toggle Active ───
  const toggleActive = async (offer: ServiceOffer) => {
    try {
      const res = await fetch(`${API_URL}/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...offer,
          is_active: !offer.is_active,
          is_featured: offer.is_featured ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOffers();
        toast.success(offer.is_active ? "নিষ্ক্রিয় করা হয়েছে" : "সক্রিয় করা হয়েছে");
      }
    } catch {
      toast.error("আপডেট ব্যর্থ");
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground">
          স্পেশাল অফার ({offers.length})
        </h3>
        <button
          onClick={startCreating}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> নতুন অফার
        </button>
      </div>

      {/* Edit/Create Form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4 shadow-sm">
              {/* Image Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  অফারের ছবি
                </label>
                {imagePreview ? (
                  <div className="relative group rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors w-full max-w-sm">
                    <img
                      src={imageFile ? imagePreview : getImageUrl(imagePreview)}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 bg-white rounded-xl shadow-lg hover:bg-slate-50 transition-colors"
                        title="পরিবর্তন করুন"
                      >
                        <Upload className="h-4 w-4 text-slate-700" />
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-2.5 bg-red-500 rounded-xl shadow-lg hover:bg-red-600 transition-colors"
                        title="মুছুন"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-sm h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">ছবি আপলোড করুন</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        PNG, JPG, WebP • সর্বোচ্চ ৫MB
                      </p>
                    </div>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imageFile && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Title (English) *"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  value={editing.title_bn || ""}
                  onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })}
                  placeholder="টাইটেল (বাংলা) *"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Description (English)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  value={editing.description_bn || ""}
                  onChange={(e) => setEditing({ ...editing, description_bn: e.target.value })}
                  placeholder="বিবরণ (বাংলা)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />

                <div className="flex gap-2">
                  <select
                    value={editing.discount_type || "percentage"}
                    onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as "percentage" | "fixed" })}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={editing.discount_value || 0}
                    onChange={(e) => setEditing({ ...editing, discount_value: parseFloat(e.target.value) || 0 })}
                    placeholder="Discount Value"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <input
                  value={editing.offer_code || ""}
                  onChange={(e) => setEditing({ ...editing, offer_code: e.target.value })}
                  placeholder="Offer Code (Optional)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />

                <input
                  type="datetime-local"
                  value={editing.start_date ? new Date(editing.start_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  placeholder="শুরুর তারিখ"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="datetime-local"
                  value={editing.end_date ? new Date(editing.end_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  placeholder="শেষের তারিখ"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  সক্রিয় (Active)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_featured ?? false}
                    onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  ফিচারড (Featured)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-emerald-600 transition-colors"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSaving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                  <Save className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> বাতিল
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offers List */}
      <div className="space-y-2">
        {offers.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
            কোনো অফার পাওয়া যায়নি।
          </div>
        ) : (
          offers.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow"
            >
              {/* Thumbnail */}
              {o.image_url ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                  <img
                    src={getImageUrl(o.image_url)}
                    alt={o.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border border-dashed border-border shrink-0 bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {o.title_bn || o.title}
                </p>
                <p className="text-xs font-bold text-primary mt-0.5">
                  {o.discount_value}{o.discount_type === "percentage" ? "%" : "৳"} ছাড়
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {o.offer_code && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">
                      {o.offer_code}
                    </span>
                  )}
                  {o.is_featured && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5" /> ফিচার্ড
                    </span>
                  )}
                  <span className={`text-[10px] ${o.is_active ? "text-green-600" : "text-red-500"}`}>
                    {o.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(o)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                  title={o.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                >
                  {o.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEditing(o)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                  title="এডিট করুন"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(o.id!)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  title="মুছুন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminOffers;