import { useEffect, useState } from "react";
import { Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const MartFeeSettings = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const apiBase = import.meta.env.VITE_MART_API_BASE_URL || import.meta.env.VITE_API_BASE || "";
  const [fee, setFee] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/api/mart-fee-settings`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error(result.message);
        setFee(String(result.data?.delivery_fee ?? 10));
      })
      .catch((error) => toast.error(error.message || "Failed to load fee settings"))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const save = async () => {
    const value = Number(fee);
    if (!Number.isFinite(value) || value < 0) {
      toast.error(bn ? "সঠিক ফি লিখুন" : "Enter a valid non-negative fee");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/mart-fee-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_fee: value }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setFee(String(result.data.delivery_fee));
      toast.success(bn ? "ডেলিভারি/COD ফি সংরক্ষিত" : "Delivery/COD fee saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save fee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/50 max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5" />{bn ? "ডেলিভারি / COD ফি" : "Delivery / COD Fee"}</CardTitle>
        <p className="text-sm text-muted-foreground">{bn ? "শিপিং, কুরিয়ার ও COD-এর জন্য অর্ডারে একবার এই ফি যোগ হবে।" : "This single fee is added once per order for shipping, courier, and COD."}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mart-delivery-fee">{bn ? "ফি (৳)" : "Fee (BDT)"}</Label>
          <Input id="mart-delivery-fee" type="number" min="0" step="0.01" value={fee} disabled={loading || saving} onChange={(event) => setFee(event.target.value)} />
        </div>
        <Button onClick={save} disabled={loading || saving}><Save className="mr-2 h-4 w-4" />{saving ? (bn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (bn ? "সংরক্ষণ করুন" : "Save fee")}</Button>
      </CardContent>
    </Card>
  );
};

export default MartFeeSettings;