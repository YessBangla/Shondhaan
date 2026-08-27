import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

const API = `${CENTRAL_API_BASE_URL}/api/referral/admin`;

const authHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const defaultSettings = {
  is_enabled: 0,
  max_uses: 50,
  code_valid_days: 90,
  qualification_window_days: 30,
  reward_valid_days: 60,
  referrer_reward_currency: "CASH",
  referrer_reward_amount: 0,
  referred_reward_currency: "CASH",
  referred_reward_amount: 0,
  min_order_amount: null,
};

export default function ReferralSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/settings`, { headers: authHeaders() });
      const json = await res.json();
      if (json.data) setSettings(json.data);
    } catch {
      toast.error("সেটিংস লোড করতে সমস্যা");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("সেটিংস সেভ হয়েছে!");
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "সেভ করতে সমস্যা");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: any) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5" /> রেফারেল সেটিংস
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          রেফারেল প্রোগ্রামের গ্লোবাল সেটিংস কনফিগার করুন
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-5">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              রেফারেল প্রোগ্রাম
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              বন্ধ থাকলে নতুন রেফারেল গ্রহণ ও পুরস্কার বন্ধ থাকবে
            </p>
          </div>
          <Switch
            checked={!!settings.is_enabled}
            onCheckedChange={(v) => update("is_enabled", v ? 1 : 0)}
          />
        </div>

        {/* Code limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">সর্বোচ্চ ব্যবহার (প্রতি কোডে)</Label>
            <Input
              type="number"
              value={settings.max_uses}
              onChange={(e) => update("max_uses", Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">
              একটি কোড কতবার ব্যবহার হতে পারবে
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">কোড মেয়াদ (দিন)</Label>
            <Input
              type="number"
              value={settings.code_valid_days}
              onChange={(e) => update("code_valid_days", Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">
              কোড তৈরির পর কত দিন পর্যন্ত বৈধ
            </p>
          </div>
        </div>

        {/* Time windows */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">যোগ্যতা উইন্ডো (দিন)</Label>
            <Input
              type="number"
              value={settings.qualification_window_days}
              onChange={(e) => update("qualification_window_days", Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">
              রেফারেল কত দিন পর্যন্ত যোগ্য থাকবে
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">পুরস্কার বৈধতা (দিন)</Label>
            <Input
              type="number"
              value={settings.reward_valid_days}
              onChange={(e) => update("reward_valid_days", Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">
              পুরস্কার কত দিন পর্যন্ত দাবি করা যাবে
            </p>
          </div>
        </div>

        {/* Referrer reward */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-foreground mb-3">
            রেফারারের পুরস্কার (কোড শেয়ারকারী)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ধরন</Label>
              <Select
                value={settings.referrer_reward_currency}
                onValueChange={(v) => update("referrer_reward_currency", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">ক্যাশ (৳)</SelectItem>
                  <SelectItem value="COIN">কয়েন</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">পরিমাণ</Label>
              <Input
                type="number"
                value={settings.referrer_reward_amount}
                onChange={(e) => update("referrer_reward_amount", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Referred reward */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-foreground mb-3">
            রেফার্ডের পুরস্কার (কোড ব্যবহারকারী)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ধরন</Label>
              <Select
                value={settings.referred_reward_currency}
                onValueChange={(v) => update("referred_reward_currency", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">ক্যাশ (৳)</SelectItem>
                  <SelectItem value="COIN">কয়েন</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">পরিমাণ</Label>
              <Input
                type="number"
                value={settings.referred_reward_amount}
                onChange={(e) => update("referred_reward_amount", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Min order */}
        <div className="border-t pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">ন্যূনতম অর্ডার পরিমাণ (৳)</Label>
            <Input
              type="number"
              placeholder="না দিলে ন্যূনতম থাকবে না"
              value={settings.min_order_amount ?? ""}
              onChange={(e) =>
                update("min_order_amount", e.target.value ? Number(e.target.value) : null)
              }
            />
            <p className="text-[10px] text-muted-foreground">
              এই পরিমাণের নিচে অর্ডার হলে রেফারেল কাউন্ট হবে না
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সেটিংস সেভ করুন"}
        </Button>
      </div>
    </div>
  );
}
