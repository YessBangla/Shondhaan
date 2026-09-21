import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { userId: string | number; bn: boolean; apiBase: string; }

const MartRefundSettingTab = ({ userId, bn, apiBase }: Props) => {
  const [days, setDays] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/mart-refunds/policy?user_id=${encodeURIComponent(String(userId))}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load refund policy");
      setDays(String(result.data?.refund_window_days ?? 0));
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Could not load refund policy"); }
    finally { setLoading(false); }
  }, [apiBase, userId]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    const value = Number(days);
    if (!Number.isInteger(value) || value < 0 || value > 365) { toast.error(bn ? "Enter a value from 0 to 365" : "Refund days must be a whole number from 0 to 365"); return; }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/mart-refunds/policy`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, refund_window_days: value }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save refund policy");
      toast.success(bn ? "Refund policy saved" : "Refund policy saved");
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Could not save refund policy"); }
    finally { setSaving(false); }
  };
  return <div className="mt-9 max-w-2xl"><Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><RotateCcw className="h-5 w-5" />{bn ? "Refund CMS" : "Refund CMS"}</CardTitle><p className="text-sm text-muted-foreground">{bn ? "Set how many days after delivery a customer can request a refund. Set 0 to disable refunds." : "Set how many days after delivery a customer can request a refund. Set 0 to disable refunds."}</p></CardHeader><CardContent className="space-y-4"><div className="max-w-xs space-y-2"><Label htmlFor="refund-window-days">{bn ? "Refund window (days)" : "Refund window (days)"}</Label><Input id="refund-window-days" type="number" min="0" max="365" step="1" value={days} disabled={loading} onChange={(event) => setDays(event.target.value)} /></div><Button onClick={save} disabled={loading || saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save refund policy"}</Button></CardContent></Card></div>;
};
export default MartRefundSettingTab;
