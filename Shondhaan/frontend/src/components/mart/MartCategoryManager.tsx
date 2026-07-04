import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, ImagePlus, X, Loader2, Save, FolderTree, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon_url: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const MartCategoryManager = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [iconUrl, setIconUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mart_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openForm = (cat?: Category) => {
    if (cat) {
      setEditing(cat);
      setName(cat.name);
      setNameEn(cat.name_en || "");
      setSlug(cat.slug);
      setParentId(cat.parent_id || "");
      setSortOrder(String(cat.sort_order || 0));
      setIsActive(cat.is_active ?? true);
      setIconUrl(cat.icon_url || "");
      setImageUrl(cat.image_url || "");
    } else {
      setEditing(null);
      setName(""); setNameEn(""); setSlug(""); setParentId("");
      setSortOrder("0"); setIsActive(true); setIconUrl(""); setImageUrl("");
    }
    setShowForm(true);
  };

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/(^-|-$)/g, "");

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `mart-categories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cms-images").upload(path, file, { upsert: true });
    if (error) { toast.error(bn ? "আপলোড ব্যর্থ" : "Upload failed"); return null; }
    return supabase.storage.from("cms-images").getPublicUrl(path).data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "icon" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) type === "icon" ? setIconUrl(url) : setImageUrl(url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(bn ? "ক্যাটেগরির নাম আবশ্যক" : "Category name required");
      return;
    }
    setSaving(true);
    const catData = {
      name: name.trim(),
      name_en: nameEn.trim() || null,
      slug: slug.trim() || generateSlug(nameEn || name),
      parent_id: parentId || null,
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive,
      icon_url: iconUrl || null,
      image_url: imageUrl || null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("mart_categories").update(catData).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("mart_categories").insert(catData));
    }

    setSaving(false);
    if (error) {
      toast.error(bn ? "সংরক্ষণ ব্যর্থ" : "Save failed");
      console.error(error);
    } else {
      toast.success(bn ? (editing ? "আপডেট হয়েছে" : "ক্যাটেগরি যোগ হয়েছে") : (editing ? "Updated" : "Category added"));
      setShowForm(false);
      fetchCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) {
      toast.error(bn ? "সাব-ক্যাটেগরি আছে, আগে মুছুন" : "Has subcategories, delete them first");
      return;
    }
    const { error } = await supabase.from("mart_categories").delete().eq("id", id);
    if (!error) {
      toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted");
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const filtered = categories.filter(c =>
    c.name.includes(search) || (c.name_en || "").toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
  );

  // Group: parents first, then children
  const grouped = parentCategories
    .filter(p => filtered.some(f => f.id === p.id || f.parent_id === p.id))
    .map(parent => ({
      parent,
      children: filtered.filter(c => c.parent_id === parent.id),
    }));
  const orphans = filtered.filter(c => !c.parent_id && !parentCategories.find(p => p.id === c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={bn ? "ক্যাটেগরি খুঁজুন..." : "Search categories..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button className="gap-1" onClick={() => openForm()}>
          <Plus className="h-4 w-4" />{bn ? "নতুন ক্যাটেগরি" : "Add Category"}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{bn ? "কোনো ক্যাটেগরি নেই" : "No categories"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ parent, children }) => (
            <div key={parent.id}>
              <CategoryRow cat={parent} bn={bn} onEdit={openForm} onDelete={deleteCategory} isParent />
              {children.map(child => (
                <CategoryRow key={child.id} cat={child} bn={bn} onEdit={openForm} onDelete={deleteCategory} isChild />
              ))}
            </div>
          ))}
          {orphans.map(c => (
            <CategoryRow key={c.id} cat={c} bn={bn} onEdit={openForm} onDelete={deleteCategory} isParent />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? (bn ? "✏️ ক্যাটেগরি সম্পাদনা" : "✏️ Edit Category") : (bn ? "➕ নতুন ক্যাটেগরি" : "➕ New Category")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? "নাম (বাংলা) *" : "Name (Bangla) *"}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>{bn ? "নাম (ইংরেজি)" : "Name (English)"}</Label>
                <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder={bn ? "স্বয়ংক্রিয়" : "Auto-generated"} className="mt-1" />
              </div>
              <div>
                <Label>{bn ? "সর্ট অর্ডার" : "Sort Order"}</Label>
                <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>{bn ? "প্যারেন্ট ক্যাটেগরি" : "Parent Category"}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? "কোনটি নয় (মূল)" : "None (Root)"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? "কোনটি নয় (মূল)" : "None (Root)"}</SelectItem>
                  {parentCategories.filter(c => c.id !== editing?.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Images */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{bn ? "আইকন" : "Icon"}</Label>
                <div className="mt-2">
                  {iconUrl ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={iconUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setIconUrl("")} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, "icon")} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>{bn ? "কভার ইমেজ" : "Cover Image"}</Label>
                <div className="mt-2">
                  {imageUrl ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImageUrl("")} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, "image")} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>{bn ? "সক্রিয়" : "Active"}</Label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>{bn ? "বাতিল" : "Cancel"}</Button>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editing ? (bn ? "আপডেট" : "Update") : (bn ? "সংরক্ষণ" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CategoryRow = ({ cat, bn, onEdit, onDelete, isParent, isChild }: {
  cat: Category; bn: boolean; onEdit: (c: Category) => void; onDelete: (id: string) => void; isParent?: boolean; isChild?: boolean;
}) => (
  <Card className={`border-border/50 ${isChild ? "ml-6 border-l-2 border-l-primary/20" : ""}`}>
    <CardContent className="p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {cat.icon_url ? <img src={cat.icon_url} alt="" className="w-full h-full object-cover" /> :
           cat.image_url ? <img src={cat.image_url} alt="" className="w-full h-full object-cover" /> :
           <FolderTree className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{cat.name}</p>
          <div className="flex items-center gap-2">
            {cat.name_en && <span className="text-xs text-muted-foreground">{cat.name_en}</span>}
            <span className="text-[10px] text-muted-foreground">/{cat.slug}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={cat.is_active ? "default" : "secondary"} className="text-[10px]">
          {cat.is_active ? (bn ? "সক্রিয়" : "Active") : (bn ? "নিষ্ক্রিয়" : "Inactive")}
        </Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)}><Edit2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </CardContent>
  </Card>
);

export default MartCategoryManager;
