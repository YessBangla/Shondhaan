import { useCallback, useEffect, useState } from "react";
import { Search, Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { divisions } from "@/data/locations";

interface MartFeeSettingTabProps {
  userId: string | number;
  bn: boolean;
  apiBase: string;
}

interface FeeSetting {
  user_id?: string | number | null;
  delivery_area?: string | null;
  area_fee?: number | string;
  other_area_fee?: number | string;
  selected_areas?: string[] | string | null;
}

const emptySetting = {
  delivery_area: "Inside Dhaka",
  selected_areas: [] as string[],
  area_fee: "0",
  other_area_fee: "0",
};

const AREA_OPTIONS = [
  { value: "Inside Dhaka", label: "ঢাকার ভিতরে", labelEn: "Inside Dhaka" },
  { value: "Outside Dhaka", label: "ঢাকার বাইরে", labelEn: "Outside Dhaka" },
  { value: "Other Area", label: "অন্যান্য এলাকা", labelEn: "Other Area" },
];

const DISTRICTS = divisions.flatMap((division) => division.districts);

const readSelectedAreas = (value: FeeSetting["selected_areas"]) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const MartFeeSettingTab = ({ userId, bn, apiBase }: MartFeeSettingTabProps) => {
  const [settings, setSettings] = useState<FeeSetting[]>([]);
  const [form, setForm] = useState(emptySetting);
  const [districtSearch, setDistrictSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const normalizedDistrictSearch = districtSearch.trim().toLocaleLowerCase();
  const filteredDistricts = DISTRICTS.filter((district) =>
    district.name.toLocaleLowerCase().includes(normalizedDistrictSearch) ||
    district.nameBn.includes(districtSearch.trim())
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/mart-fee-settings?user_id=${encodeURIComponent(String(userId))}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load fee settings");
      const rows = Array.isArray(result.data) ? result.data : [];
      setSettings(rows.filter((row: FeeSetting) => row.user_id));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || (bn ? "ফি সেটিংস লোড ব্যর্থ" : "Could not load fee settings"));
    } finally {
      setLoading(false);
    }
  }, [apiBase, bn, userId]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const saveSetting = async () => {
    const values = [form.area_fee, form.other_area_fee].map(Number);
    if (form.selected_areas.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error(bn ? "কমপক্ষে একটি জেলা এবং সঠিক ফি লিখুন" : "Select at least one district and enter valid fees");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/mart-fee-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          delivery_area: form.delivery_area.trim(),
          selected_areas: form.selected_areas,
          area_fee: values[0],
          other_area_fee: values[1],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save fee setting");
      toast.success(bn ? "এলাকার ফি সংরক্ষিত হয়েছে" : "Area fee saved");
      setForm(emptySetting);
      setDistrictSearch("");
      await loadSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || (bn ? "ফি সংরক্ষণ ব্যর্থ" : "Could not save fee setting"));
    } finally {
      setSaving(false);
    }
  };

  const editSetting = (setting: FeeSetting) => {
    const area = AREA_OPTIONS.some((option) => option.value === setting.delivery_area)
      ? setting.delivery_area || emptySetting.delivery_area
      : "Other Area";
    setForm({
      delivery_area: area,
      selected_areas: readSelectedAreas(setting.selected_areas),
      area_fee: String(setting.area_fee ?? 0),
      other_area_fee: String(setting.other_area_fee ?? 0),
    });
    setDistrictSearch("");
  };

  return (
    <div className="max-w-4xl space-y-5">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5" />{bn ? "মার্ট ফি সেটিং" : "Mart Fee Setting"}</CardTitle>
          <p className="text-sm text-muted-foreground">{bn ? "নিজের ডেলিভারি এলাকার ফি এবং অন্যান্য এলাকার ফি নির্ধারণ করুন।" : "Set your delivery-area fee and the fee for other areas."}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{bn ? "ডেলিভারি জেলা নির্বাচন করুন" : "Select Delivery Districts"}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={districtSearch}
                onChange={(event) => setDistrictSearch(event.target.value)}
                placeholder={bn ? "জেলা খুঁজুন" : "Search district"}
                className="pl-9"
                aria-label={bn ? "জেলা খুঁজুন" : "Search district"}
              />
            </div>
            <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-3">
              {filteredDistricts.map((district) => (
                <label key={district.name} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted/50">
                  <input checked={form.selected_areas.includes(district.nameBn)} type="checkbox" onChange={(event) => setForm({ ...form, selected_areas: event.target.checked ? [...form.selected_areas, district.nameBn] : form.selected_areas.filter((item) => item !== district.nameBn) })} />
                  <span>{bn ? district.nameBn : district.name}</span>
                </label>
              ))}
              {filteredDistricts.length === 0 && <p className="col-span-full text-sm text-muted-foreground">{bn ? "কোনো জেলা পাওয়া যায়নি" : "No districts found"}</p>}
            </div>
            <p className="text-xs text-muted-foreground">{bn ? `${form.selected_areas.length}টি জেলা নির্বাচিত` : `${form.selected_areas.length} districts selected`}</p>
            {form.selected_areas.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-live="polite">
                {form.selected_areas.map((district) => (
                  <span key={district} className="rounded-md bg-muted px-2 py-1 text-xs">{district}</span>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>{bn ? "নির্বাচিত জেলার ফি (৳)" : "Selected District Fee (BDT)"}</Label><Input type="number" min="0" step="0.01" value={form.area_fee} onChange={(event) => setForm({ ...form, area_fee: event.target.value })} /></div>
          <div className="space-y-2"><Label>{bn ? "অন্যান্য জেলার চার্জ (৳)" : "Other District Charge (BDT)"}</Label><Input type="number" min="0" step="0.01" value={form.other_area_fee} onChange={(event) => setForm({ ...form, other_area_fee: event.target.value })} /></div>
          </div>
          <div><Button onClick={saveSetting} disabled={saving || loading}><Save className="mr-2 h-4 w-4" />{saving ? (bn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (bn ? "ফি সংরক্ষণ করুন" : "Save Fee Setting")}</Button></div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">{bn ? "সংরক্ষিত এলাকার ফি" : "Saved Area Fees"}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">{bn ? "লোড হচ্ছে..." : "Loading..."}</p> : settings.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? "এখনও কোনো এলাকা যোগ করা হয়নি।" : "No area fees added yet."}</p> : (
            <div className="space-y-2">
              {settings.map((setting) => (
                <button key={`${setting.user_id}-${setting.delivery_area}`} type="button" onClick={() => editSetting(setting)} className="grid w-full grid-cols-2 gap-2 rounded-lg border border-border p-3 text-left text-sm hover:bg-muted/50 sm:grid-cols-4">
                  <span className="font-medium">{setting.delivery_area}</span>
                  <span className="col-span-2 truncate sm:col-span-1" title={readSelectedAreas(setting.selected_areas).join(", ")}>
                    {readSelectedAreas(setting.selected_areas).join(", ") || (bn ? "কোনো জেলা নেই" : "No districts")}
                  </span>
                  <span>Area: ৳{Number(setting.area_fee || 0).toLocaleString()}</span>
                  <span>Other: ৳{Number(setting.other_area_fee || 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MartFeeSettingTab;
