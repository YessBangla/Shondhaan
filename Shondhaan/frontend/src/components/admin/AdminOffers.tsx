import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

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

const API_URL = `${import.meta.env.VITE_SERVICE_API_BASE_URL || ""}/api/service-offers`;

const AdminOffers = () => {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceOffer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!editing?.title || !editing?.title_bn) {
      toast.error("টাইটেল (ইংরেজি ও বাংলা) আবশ্যক");
      return;
    }

    setIsSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url = editing.id ? `${API_URL}/${editing.id}` : API_URL;

      // Convert boolean to 1/0 for MySQL TINYINT
      const payload = {
        ...editing,
        is_featured: editing.is_featured ? 1 : 0,
        is_active: editing.is_active ? 1 : 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editing.id ? "আপডেট হয়েছে" : "নতুন অফার তৈরি হয়েছে");
        setEditing(null);
        fetchOffers(); // Refresh list
      } else {
        toast.error(data.message || "সেভ করতে সমস্যা হয়েছে");
      }
    } catch (error: any) {
      toast.error(error.message || "নেটওয়ার্ক সমস্যা");
    } finally {
      setIsSaving(false);
    }
  };

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

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground">স্পেশাল অফার ({offers.length})</h3>
        <button
          onClick={() => setEditing({ ...emptyOffer })}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> নতুন অফার
        </button>
      </div>

      {editing && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Title (English)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              value={editing.title_bn || ""}
              onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })}
              placeholder="টাইটেল (বাংলা)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description (English)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              value={editing.description_bn || ""}
              onChange={(e) => setEditing({ ...editing, description_bn: e.target.value })}
              placeholder="বিবরণ (বাংলা)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
            
            <div className="flex gap-2">
              <select
                value={editing.discount_type || "percentage"}
                onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as "percentage" | "fixed" })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (৳)</option>
              </select>
              <input
                type="number"
                value={editing.discount_value || 0}
                onChange={(e) => setEditing({ ...editing, discount_value: parseFloat(e.target.value) })}
                placeholder="Discount Value"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            <input
              value={editing.offer_code || ""}
              onChange={(e) => setEditing({ ...editing, offer_code: e.target.value })}
              placeholder="Offer Code (Optional)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              value={editing.image_url || ""}
              onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
              placeholder="Image URL (Optional)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
            
            <input
              type="datetime-local"
              value={editing.start_date ? new Date(editing.start_date).toISOString().slice(0, 16) : ""}
              onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              type="datetime-local"
              value={editing.end_date ? new Date(editing.end_date).toISOString().slice(0, 16) : ""}
              onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

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

          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" /> {isSaving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-foreground hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" /> বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {offers.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
            কোনো অফার পাওয়া যায়নি।
          </div>
        ) : (
          offers.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {o.title_bn || o.title} — <span className="text-primary font-bold">{o.discount_value}{o.discount_type === "percentage" ? "%" : "৳"} ছাড়</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {o.offer_code ? `Code: ${o.offer_code} • ` : ""} 
                  {o.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"} 
                  {o.is_featured ? " • ⭐ ফিচারড" : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing({ ...o, start_date: o.start_date ? new Date(o.start_date).toISOString() : null, end_date: o.end_date ? new Date(o.end_date).toISOString() : null })}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(o.id!)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminOffers;
