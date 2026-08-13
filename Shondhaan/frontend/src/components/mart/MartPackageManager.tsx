import React, { useEffect, useState } from "react";
import {
  Plus, Edit2, Trash2, Loader2, AlertCircle, Check, X,
  TrendingUp, Package, Calendar, Infinity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Package {
  id: number;
  name: string;
  name_bn: string;
  price: number;
  product_limit: number | null;
  duration_days: number | null;
  description: string | null;
  description_bn: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface MartPackageManagerProps {
  bn?: boolean;
  API_BASE_URL?: string;
}

const MartPackageManager: React.FC<MartPackageManagerProps> = ({
  bn = false,
  API_BASE_URL = "http://localhost:8081"
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_bn: "",
    price: "",
    product_limit: "",
    duration_days: "",
    description: "",
    description_bn: "",
    sort_order: "",
    is_active: true,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mart-packages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPackages(json.data || json);
    } catch (error) {
      console.error("Fetch packages error:", error);
      toast.error(bn ? "প্যাকেজ লোড করা যায়নি" : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_bn: "",
      price: "",
      product_limit: "",
      duration_days: "",
      description: "",
      description_bn: "",
      sort_order: "",
      is_active: true,
    });
    setEditingId(null);
  };

  const openDialog = (pkg?: Package) => {
    if (pkg) {
      setFormData({
        name: pkg.name,
        name_bn: pkg.name_bn,
        price: String(pkg.price),
        product_limit: pkg.product_limit !== null ? String(pkg.product_limit) : "",
        duration_days: pkg.duration_days !== null ? String(pkg.duration_days) : "",
        description: pkg.description || "",
        description_bn: pkg.description_bn || "",
        sort_order: String(pkg.sort_order),
        is_active: Boolean(pkg.is_active),
      });
      setEditingId(pkg.id);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.name_bn || !formData.price) {
      toast.error(bn ? "প্রয়োজনীয় ক্ষেত্র পূরণ করুন" : "Please fill required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        name_bn: formData.name_bn,
        price: Number(formData.price),
        product_limit: formData.product_limit ? Number(formData.product_limit) : null,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        description: formData.description || null,
        description_bn: formData.description_bn || null,
        sort_order: Number(formData.sort_order) || 0,
        is_active: formData.is_active,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE_URL}/api/mart-packages/${editingId}`
        : `${API_BASE_URL}/api/mart-packages`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (editingId) {
        setPackages(packages.map(p => p.id === editingId ? data.data : p));
        toast.success(bn ? "প্যাকেজ আপডেট হয়েছে" : "Package updated");
      } else {
        setPackages([...packages, data.data]);
        toast.success(bn ? "প্যাকেজ তৈরি হয়েছে" : "Package created");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || (bn ? "অপারেশন ব্যর্থ" : "Operation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mart-packages/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      setPackages(packages.filter(p => p.id !== id));
      toast.success(bn ? "প্যাকেজ মুছে ফেলা হয়েছে" : "Package deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || (bn ? "মুছতে ব্যর্থ" : "Failed to delete"));
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {bn ? "প্যাকেজ ম্যানেজমেন্ট" : "Package Management"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {bn
              ? "বিক্রেতাদের জন্য প্যাকেজ তৈরি এবং পরিচালনা করুন"
              : "Create and manage packages for sellers"}
          </p>
        </div>
        <Button
          onClick={() => openDialog()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {bn ? "নতুন প্যাকেজ" : "New Package"}
        </Button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-slate-400">
              {bn ? "কোনো প্যাকেজ নেই। একটি নতুন প্যাকেজ তৈরি করুন।" : "No packages yet. Create one to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden transition-all ${
                pkg.is_active ? "border-emerald-200" : "border-slate-200 opacity-60"
              }`}
            >
              {!pkg.is_active && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary">{bn ? "নিষ্ক্রিয়" : "Inactive"}</Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-slate-900">
                      {bn ? pkg.name_bn : pkg.name}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">{pkg.name}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-2xl font-bold text-emerald-600">
                    ৳{Number(pkg.price).toLocaleString()}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Features */}
                <div className="space-y-2">
                  {pkg.product_limit ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>
                        {pkg.product_limit} {bn ? "পণ্য" : "products"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Infinity className="h-4 w-4 text-purple-500" />
                      <span>{bn ? "আনলিমিটেড পণ্য" : "Unlimited products"}</span>
                    </div>
                  )}

                  {pkg.duration_days && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span>
                        {pkg.duration_days} {bn ? "দিন" : "days"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {(pkg.description || pkg.description_bn) && (
                  <p className="text-xs text-slate-500 italic">
                    {bn ? pkg.description_bn || pkg.description : pkg.description || pkg.description_bn}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openDialog(pkg)}
                    disabled={submitting}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {bn ? "সম্পাদনা" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(pkg.id)}
                    disabled={submitting}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {bn ? "মুছুন" : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? bn
                  ? "প্যাকেজ সম্পাদনা"
                  : "Edit Package"
                : bn
                  ? "নতুন প্যাকেজ তৈরি করুন"
                  : "Create Package"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* English Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "প্যাকেজ নাম (ইংরেজি)" : "Package Name (English)"}
              </label>
              <Input
                placeholder={bn ? "যেমন: Starter" : "e.g., Starter"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={submitting}
                required
              />
            </div>

            {/* Bengali Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "প্যাকেজ নাম (বাংলা)" : "Package Name (Bengali)"}
              </label>
              <Input
                placeholder={bn ? "যেমন: স্টার্টার" : "e.g., স্টার্টার"}
                value={formData.name_bn}
                onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                disabled={submitting}
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "মূল্য (টাকা)" : "Price (BDT)"}
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="299.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                disabled={submitting}
                required
              />
            </div>

            {/* Product Limit */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "পণ্য সীমা (খালি রাখলে আনলিমিটেড)" : "Product Limit (leave empty for unlimited)"}
              </label>
              <Input
                type="number"
                placeholder={bn ? "যেমন: 15" : "e.g., 15"}
                value={formData.product_limit}
                onChange={(e) => setFormData({ ...formData, product_limit: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "মেয়াদ (দিনে)" : "Duration (days)"}
              </label>
              <Input
                type="number"
                placeholder={bn ? "যেমন: 30" : "e.g., 30"}
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Description English */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "বর্ণনা (ইংরেজি)" : "Description (English)"}
              </label>
              <Input
                placeholder={bn ? "যেমন: 15 products for 30 days" : "e.g., 15 products for 30 days"}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Description Bengali */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "বর্ণনা (বাংলা)" : "Description (Bengali)"}
              </label>
              <Input
                placeholder={bn ? "যেমন: ৩০ দিনে ১৫টি পণ্য" : "e.g., ৩০ দিনে ১৫টি পণ্য"}
                value={formData.description_bn}
                onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {bn ? "সাজানোর ক্রম" : "Sort Order"}
              </label>
              <Input
                type="number"
                placeholder="1"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                disabled={submitting}
              />
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={submitting}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                {bn ? "সক্রিয় করুন" : "Active"}
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                {bn ? "বাতিল করুন" : "Cancel"}
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {bn ? "প্রক্রিয়াধীন..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {editingId ? (bn ? "আপডেট করুন" : "Update") : bn ? "তৈরি করুন" : "Create"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              {bn ? "প্যাকেজ মুছুন?" : "Delete Package?"}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? "এই প্যাকেজটি মুছে ফেলা হবে। এই অ্যাকশন বাতিল করা যাবে না।"
                : "This package will be permanently deleted. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={submitting}
            >
              {bn ? "বাতিল করুন" : "Cancel"}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {bn ? "মুছছি..." : "Deleting..."}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {bn ? "মুছুন" : "Delete"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MartPackageManager;
