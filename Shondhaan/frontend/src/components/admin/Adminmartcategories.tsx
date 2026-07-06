import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, ImageIcon, Loader2, Check } from "lucide-react";

const API_BASE =
  (import.meta as any).env?.VITE_MART_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_BASE ||
  "http://localhost:8081";

interface Category {
  id: number;
  name: string;
  name_en: string | null;
  slug: string | null;
  image_url: string | null;
  icon_url: string | null;
  sort_order: number;
  created_at: string;
}

interface SubCategory {
  id: number;
  category_id: number;
  name: string;
  category_name?: string | null;
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminMartCategories = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [subEditId, setSubEditId] = useState<number | null>(null);
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["mart-categories-admin"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/categories`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: subCategories = [], isLoading: subCategoriesLoading } = useQuery<SubCategory[]>({
    queryKey: ["mart-sub-categories-admin"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sub-categories`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["mart-categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["mart-sub-categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["mart-categories"] });
    queryClient.invalidateQueries({ queryKey: ["mart-sub-categories"] });
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setNameEn("");
    setSlug("");
    setImageUrl("");
    setPreviewUrl("");
    setShowForm(false);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setNameEn(cat.name_en || "");
    setSlug(cat.slug || "");
    setImageUrl(cat.image_url || "");
    setPreviewUrl(cat.image_url || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
      const json = await res.json();
      if (json.success && json.url) {
        setImageUrl(json.url);
        setPreviewUrl(json.url);
      } else {
        alert("Upload failed: " + (json.message || "Unknown error"));
      }
    } catch (err: any) {
      alert("Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Category name is required");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        name_en: nameEn.trim() || name.trim(),
        slug: slug.trim() || slugify(nameEn.trim() || name.trim()),
        image_url: imageUrl || null,
      };

      const url = editId
        ? `${API_BASE}/api/categories/${editId}`
        : `${API_BASE}/api/categories`;

      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        invalidate();
        showSuccess(editId ? "Category updated!" : "Category added!");
        resetForm();
      } else {
        alert("Error: " + (json.message || "Failed to save"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, catName: string) => {
    if (!confirm(`Delete "${catName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        invalidate();
        showSuccess("Category deleted.");
      } else {
        alert("Delete failed: " + json.message);
      }
    } catch (err: any) {
      alert("Delete error: " + err.message);
    }
  };

  const resetSubForm = () => {
    setSubEditId(null);
    setSubCategoryId("");
    setSubCategoryName("");
  };

  const openSubEdit = (sub: SubCategory) => {
    setSubEditId(sub.id);
    setSubCategoryId(String(sub.category_id));
    setSubCategoryName(sub.name);
  };

  const handleSubSave = async () => {
    if (!subCategoryId) return alert("Select a parent category");
    if (!subCategoryName.trim()) return alert("Sub category name is required");

    setSubSaving(true);
    try {
      const res = await fetch(
        subEditId ? `${API_BASE}/api/sub-categories/${subEditId}` : `${API_BASE}/api/sub-categories`,
        {
          method: subEditId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: Number(subCategoryId),
            name: subCategoryName.trim(),
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        invalidate();
        showSuccess(subEditId ? "Sub category updated!" : "Sub category added!");
        resetSubForm();
      } else {
        alert("Error: " + (json.message || "Failed to save sub category"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubSaving(false);
    }
  };

  const handleSubDelete = async (id: number, name: string) => {
    if (!confirm(`Delete sub category "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/sub-categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        invalidate();
        showSuccess("Sub category deleted.");
        if (subEditId === id) resetSubForm();
      } else {
        alert("Delete failed: " + json.message);
      }
    } catch (err: any) {
      alert("Delete error: " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Mart Categories</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Add categories with images — they appear on the Mart homepage grid.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-[13px] font-medium">
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[14px]">
              {editId ? "Edit Category" : "New Category"}
            </h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                  Name (বাংলা) *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. ইলেকট্রনিক্স"
                  className="w-full border border-border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                  Name (English)
                </label>
                <input
                  value={nameEn}
                  onChange={e => {
                    setNameEn(e.target.value);
                    if (!editId) setSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Electronics"
                  className="w-full border border-border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                  Slug
                </label>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="e.g. electronics"
                  className="w-full border border-border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Auto-filled from English name. Used in URLs.
                </p>
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                Category Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer bg-muted/30 overflow-hidden flex items-center justify-center"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[12px] font-semibold">Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <span className="text-[12px]">Click to upload image</span>
                    <span className="text-[11px] opacity-60">JPG, PNG, WEBP · max 5MB</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file));
                    handleImageUpload(file);
                  }
                  e.target.value = "";
                }}
              />

              {imageUrl && (
                <button
                  onClick={() => { setImageUrl(""); setPreviewUrl(""); }}
                  className="mt-2 text-[11px] text-red-500 hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Remove image
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? "Update Category" : "Save Category"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-medium">No categories yet</p>
          <p className="text-[12px] mt-1 opacity-70">Click "Add Category" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group bg-white dark:bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">
                    📦
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    title="Edit"
                    className="h-8 w-8 rounded-lg bg-white text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    title="Delete"
                    className="h-8 w-8 rounded-lg bg-white text-foreground flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {!cat.image_url && (
                  <div className="absolute top-1.5 right-1.5 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    No Image
                  </div>
                )}
              </div>
              <div className="px-2 py-2 text-center">
                <p className="text-[11px] font-semibold text-foreground line-clamp-1">{cat.name}</p>
                {cat.name_en && cat.name_en !== cat.name && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{cat.name_en}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Mart Sub Categories</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Add sub categories under a parent category. They appear on MartHome and product category pages.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-border rounded-2xl p-5 shadow-sm mb-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                Parent Category *
              </label>
              <select
                value={subCategoryId}
                onChange={e => setSubCategoryId(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_en || cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                Sub Category Name *
              </label>
              <input
                value={subCategoryName}
                onChange={e => setSubCategoryName(e.target.value)}
                placeholder="e.g. Smartphones"
                className="w-full border border-border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubSave}
                disabled={subSaving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {subSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {subEditId ? "Update" : "Add"}
              </button>
              {subEditId && (
                <button
                  onClick={resetSubForm}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {subCategoriesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : subCategories.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-2xl">
            <p className="text-[14px] font-medium">No sub categories yet</p>
            <p className="text-[12px] mt-1 opacity-70">Select a parent category and add the first one.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Sub Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Parent Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subCategories.map((sub) => (
                  <tr key={sub.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium text-foreground">{sub.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.category_name || "Unknown"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openSubEdit(sub)}
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          title="Edit sub category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleSubDelete(sub.id, sub.name)}
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete sub category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMartCategories;
