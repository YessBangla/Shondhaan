import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw, Tag, Percent, DollarSign, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Coupon {
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
  created_at: string;
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (data) setCoupons(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  };

  const handleAdd = async () => {
    if (!code.trim() || !discountValue) {
      toast.error("কোড ও ডিসকাউন্ট মান দিন");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_amount: minOrder ? parseFloat(minOrder) : null,
      max_discount_amount: maxDiscount ? parseFloat(maxDiscount) : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      expires_at: expiresAt || null,
    } as any);

    if (error) {
      if (error.code === "23505") toast.error("এই কোড ইতিমধ্যে আছে");
      else toast.error("যোগ করতে সমস্যা হয়েছে");
    } else {
      toast.success("কুপন যোগ করা হয়েছে");
      setCode(""); setDescription(""); setDiscountValue(""); setMinOrder(""); setMaxDiscount(""); setUsageLimit(""); setExpiresAt("");
      fetchCoupons();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("coupons").update({ is_active: !current } as any).eq("id", id);
    if (!error) setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (!error) {
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success("কুপন মুছে ফেলা হয়েছে");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("কোড কপি হয়েছে");
  };

  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" /> কুপন/প্রোমো কোড ({coupons.length})
        </h3>
        <button onClick={fetchCoupons} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-primary" /> নতুন কুপন তৈরি করুন
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">কুপন কোড</label>
            <div className="flex gap-2">
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SAVE20" className="flex-1" />
              <button onClick={generateCode} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary whitespace-nowrap">
                অটো
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">বিবরণ</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="২০% ছাড়" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ডিসকাউন্ট ধরন</label>
            <select value={discountType} onChange={e => setDiscountType(e.target.value)} className={selectClass}>
              <option value="percentage">শতকরা (%)</option>
              <option value="fixed">নির্দিষ্ট টাকা (৳)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ডিসকাউন্ট মান</label>
            <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === "percentage" ? "20" : "100"} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ন্যূনতম অর্ডার (৳)</label>
            <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">সর্বোচ্চ ছাড় (৳)</label>
            <Input type="number" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="200" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ব্যবহার সীমা</label>
            <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="সীমাহীন" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">মেয়াদ শেষ</label>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <button onClick={handleAdd} disabled={adding} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
          {adding ? "তৈরি হচ্ছে..." : "কুপন তৈরি করুন"}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {coupons.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-xs">কোনো কুপন নেই</p>
        ) : coupons.map(c => {
          const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
          const isLimitReached = c.usage_limit && c.used_count >= c.usage_limit;
          return (
            <div key={c.id} className={`rounded-xl border bg-card p-3 ${!c.is_active || isExpired || isLimitReached ? "border-destructive/30 opacity-60" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  {c.discount_type === "percentage" ? <Percent className="h-5 w-5 text-primary" /> : <DollarSign className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCode(c.code)} className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-sm font-mono font-bold text-foreground hover:bg-secondary/80">
                      {c.code} <Copy className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-semibold text-primary">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${c.discount_value}`} ছাড়
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-muted-foreground">
                    <span>ব্যবহার: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</span>
                    {c.min_order_amount ? <span>• ন্যূনতম: ৳{c.min_order_amount}</span> : null}
                    {c.max_discount_amount ? <span>• সর্বোচ্চ ছাড়: ৳{c.max_discount_amount}</span> : null}
                    {c.expires_at && <span>• মেয়াদ: {new Date(c.expires_at).toLocaleDateString("bn-BD")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isExpired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">মেয়াদোত্তীর্ণ</span>}
                  <button onClick={() => toggleActive(c.id, c.is_active)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-medium ${c.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCoupons;
