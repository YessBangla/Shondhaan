import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit, Save, X, Tag, Percent, DollarSign, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface MartCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
}

const empty = { code: "", description: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", usage_limit: "", expires_at: "" };

const MartCouponManager = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [coupons, setCoupons] = useState<MartCoupon[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);

  const fetchCoupons = useCallback(async () => {
    const { data } = await supabase.from("mart_coupons").select("*").order("created_at", { ascending: false });
    if (data) setCoupons(data as MartCoupon[]);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSave = async (isEdit: boolean, id?: string) => {
    if (!form.code.trim()) { toast.error(bn ? "কুপন কোড দিন" : "Enter coupon code"); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast.error(bn ? "ডিসকাউন্ট মান দিন" : "Enter discount value"); return; }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at || null,
    };

    const { error } = isEdit
      ? await supabase.from("mart_coupons").update(payload).eq("id", id!)
      : await supabase.from("mart_coupons").insert(payload);

    if (!error) {
      toast.success(bn ? (isEdit ? "আপডেট হয়েছে" : "কুপন যোগ হয়েছে") : (isEdit ? "Updated" : "Coupon added"));
      setAdding(false); setEditing(null); setForm(empty); fetchCoupons();
    } else toast.error(error.message);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("mart_coupons").delete().eq("id", id);
    toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted");
    fetchCoupons();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("mart_coupons").update({ is_active: !current }).eq("id", id);
    fetchCoupons();
  };

  const startEdit = (c: MartCoupon) => {
    setEditing(c.id);
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      max_discount_amount: c.max_discount_amount ? String(c.max_discount_amount) : "",
      usage_limit: c.usage_limit ? String(c.usage_limit) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
  };

  const FormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label className="text-xs">{bn ? "কুপন কোড" : "Coupon Code"}</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MART20" /></div>
      <div><Label className="text-xs">{bn ? "বিবরণ" : "Description"}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div>
        <Label className="text-xs">{bn ? "ডিসকাউন্ট ধরন" : "Discount Type"}</Label>
        <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">{bn ? "শতাংশ (%)" : "Percentage (%)"}</SelectItem>
            <SelectItem value="fixed">{bn ? "নির্দিষ্ট পরিমাণ (৳)" : "Fixed Amount (৳)"}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">{bn ? "ডিসকাউন্ট মান" : "Discount Value"}</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "ন্যূনতম অর্ডার (৳)" : "Min Order (৳)"}</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "সর্বোচ্চ ছাড় (৳)" : "Max Discount (৳)"}</Label><Input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "ব্যবহার সীমা" : "Usage Limit"}</Label><Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} /></div>
      <div><Label className="text-xs">{bn ? "মেয়াদ শেষ" : "Expires At"}</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">{bn ? "মার্ট কুপন ম্যানেজমেন্ট" : "Mart Coupons"} ({coupons.length})</h3>
        <Button size="sm" onClick={() => { setAdding(true); setForm(empty); }}><Plus className="h-4 w-4 mr-1" />{bn ? "নতুন কুপন" : "Add Coupon"}</Button>
      </div>

      {adding && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <FormFields />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSave(false)}><Save className="h-4 w-4 mr-1" />{bn ? "সেভ" : "Save"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="h-4 w-4 mr-1" />{bn ? "বাতিল" : "Cancel"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {coupons.map((c) => (
        <Card key={c.id} className="border-border/50">
          <CardContent className="p-4">
            {editing === c.id ? (
              <div className="space-y-3">
                <FormFields />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(true, c.id)}><Save className="h-4 w-4 mr-1" />{bn ? "আপডেট" : "Update"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setForm(empty); }}><X className="h-4 w-4 mr-1" />{bn ? "বাতিল" : "Cancel"}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground font-mono">{c.code}</span>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                      {c.is_active ? (bn ? "সক্রিয়" : "Active") : (bn ? "নিষ্ক্রিয়" : "Inactive")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${c.discount_value}`}
                    </Badge>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {c.min_order_amount ? <span>Min: ৳{c.min_order_amount}</span> : null}
                    {c.usage_limit ? <span>{c.used_count}/{c.usage_limit} ব্যবহৃত</span> : <span>{c.used_count} ব্যবহৃত</span>}
                    {c.expires_at && <span>{new Date(c.expires_at).toLocaleDateString("bn-BD")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {coupons.length === 0 && !adding && (
        <div className="text-center py-8 text-muted-foreground text-sm">{bn ? "কোনো কুপন নেই" : "No coupons yet"}</div>
      )}
    </div>
  );
};

export default MartCouponManager;
