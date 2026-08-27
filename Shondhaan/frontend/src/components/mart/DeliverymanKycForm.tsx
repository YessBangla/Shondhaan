import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, RefreshCw, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { divisions, thanaEnMap } from "@/data/locations";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

type KycStatus = "draft" | "submitted" | "approved" | "rejected";

interface DeliverymanKyc {
  id?: number;
  user_id: number | "";
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  present_address: string;
  permanent_address: string;
  nid_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_type: string;
  vehicle_registration_number: string;
  driving_license_number: string;
  service_district: string;
  service_thana: string;
  payout_method: string;
  payout_account_name: string;
  payout_account_number: string;
  bank_name: string;
  bank_branch: string;
  routing_number: string;
  nid_front_url: string;
  nid_back_url: string;
  selfie_url: string;
  driving_license_url: string;
  vehicle_registration_url: string;
  kyc_status?: KycStatus;
  verified?: number;
  kyc_admin_message?: string | null;
  delivery_area_count?: number | null;
  delivery_districts?: string | null;
  delivery_area_summary?: string | null;
  primary_service_district?: string | null;
  primary_service_thana?: string | null;
}

interface DeliveryArea {
  id: number;
  user_id: number;
  district: string;
  thana?: string | null;
  area?: string | null;
}

interface DistrictOption {
  division: string;
  divisionEn: string;
  district: string;
  districtEn: string;
  thanas: string[];
  thanasEn: string[];
}

const emptyForm: DeliverymanKyc = {
  user_id: "",
  full_name: "",
  phone: "",
  email: "",
  date_of_birth: "",
  present_address: "",
  permanent_address: "",
  nid_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  vehicle_type: "motorcycle",
  vehicle_registration_number: "",
  driving_license_number: "",
  service_district: "",
  service_thana: "",
  payout_method: "bkash",
  payout_account_name: "",
  payout_account_number: "",
  bank_name: "",
  bank_branch: "",
  routing_number: "",
  nid_front_url: "",
  nid_back_url: "",
  selfie_url: "",
  driving_license_url: "",
  vehicle_registration_url: "",
  kyc_status: "draft",
};

const statusStyle: Record<KycStatus, string> = {
  draft: "bg-slate-50 text-slate-700 border-slate-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function DeliverymanKycForm() {
  const { user } = useAuth();
  const userId = Number(user?.id);
  const [form, setForm] = useState<DeliverymanKyc>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [savingDeliveryAreas, setSavingDeliveryAreas] = useState(false);
  const [siteDistrict, setSiteDistrict] = useState("");
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [districtFilter, setDistrictFilter] = useState("");
  const [deliverySiteFilter, setDeliverySiteFilter] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const currentStatus = (form.kyc_status || "draft") as KycStatus;
  const statusLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);

  const districtOptions = useMemo<DistrictOption[]>(() => {
    const reverseThanaMap = Object.entries(thanaEnMap).reduce<Record<string, string>>(
      (acc, [en, bn]) => {
        acc[bn] = en;
        return acc;
      },
      {}
    );

    return divisions.flatMap((div) =>
      div.districts.map((dist) => ({
        division: dist.nameBn,
        divisionEn: dist.name,
        district: dist.nameBn,
        districtEn: dist.name,
        thanas: dist.thanas || [],
        thanasEn: (dist.thanas || []).map((thana) => reverseThanaMap[thana] || ""),
      }))
    );
  }, []);

  const selectedSiteDistrict = useMemo(
    () => districtOptions.find((item) => item.districtEn === siteDistrict),
    [districtOptions, siteDistrict]
  );

  const filteredDistrictOptions = useMemo(() => {
    const query = districtFilter.trim().toLowerCase();
    if (!query) return districtOptions;
    return districtOptions.filter((item) =>
      [
        item.district,
        item.districtEn,
        item.division,
        item.divisionEn,
        ...item.thanas,
        ...item.thanasEn,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [districtFilter, districtOptions]);

  const deliverySiteOptions = useMemo(
    () =>
      (selectedSiteDistrict?.thanas || []).map((site, index) => ({
        site,
        siteEn: selectedSiteDistrict?.thanasEn[index] || "",
      })),
    [selectedSiteDistrict]
  );

  const filteredDeliverySiteOptions = useMemo(() => {
    const query = deliverySiteFilter.trim().toLowerCase();
    if (!query) return deliverySiteOptions;
    return deliverySiteOptions.filter(({ site, siteEn }) =>
      [site, siteEn].join(" ").toLowerCase().includes(query)
    );
  }, [deliverySiteFilter, deliverySiteOptions]);

  const selectedDistrictLabel = selectedSiteDistrict?.districtEn || "";

  const requiredMissing = useMemo(() => {
    return !form.full_name || !form.phone || !form.nid_number || !form.present_address || !form.nid_front_url || !form.nid_back_url || !form.selfie_url;
  }, [form]);

  const pendingDeliveryAreas = useMemo<DeliveryArea[]>(() => {
    if (!selectedSiteDistrict || selectedSites.length === 0) return [];
    return selectedSites.map((site, index) => ({
      id: -(index + 1),
      user_id: userId,
      district: selectedSiteDistrict.district,
      thana: site,
      area: site,
    }));
  }, [selectedSiteDistrict, selectedSites, userId]);

  const displayedDeliveryAreas = useMemo(() => {
    if (pendingDeliveryAreas.length === 0) return deliveryAreas;
    const seen = new Set<string>();
    return [...deliveryAreas, ...pendingDeliveryAreas].filter((item) => {
      const key = `${item.district}|${item.thana || item.area || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [deliveryAreas, pendingDeliveryAreas]);

  const deliveryAreaSummary = useMemo(() => {
    if (displayedDeliveryAreas.length) {
      return displayedDeliveryAreas
        .map((item) => `${item.district}: ${item.thana || item.area || ""}`.trim())
        .filter(Boolean)
        .join("; ");
    }
    return form.delivery_area_summary || "";
  }, [displayedDeliveryAreas, form.delivery_area_summary]);

  const deliveryDistricts = useMemo(() => {
    if (displayedDeliveryAreas.length) {
      return [...new Set(displayedDeliveryAreas.map((item) => item.district).filter(Boolean))].join(", ");
    }
    return form.delivery_districts || form.primary_service_district || form.service_district || "";
  }, [displayedDeliveryAreas, form.delivery_districts, form.primary_service_district, form.service_district]);

  const fetchKyc = async () => {
    if (!Number.isFinite(userId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/deliverymen?user_id=${encodeURIComponent(String(userId))}`);
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Failed to load KYC");
      const areasResp = await fetch(`${API_BASE}/api/delivery-areas?user_id=${encodeURIComponent(String(userId))}`);
      const areasResult = await areasResp.json().catch(() => ({}));
      if (areasResp.ok && areasResult.success) setDeliveryAreas(areasResult.data || []);
      const row = result.data?.[0];
      const authUser = user as any;
      setForm(row ? {
        ...emptyForm,
        ...row,
        date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : "",
      } : {
        ...emptyForm,
        user_id: userId,
        full_name: authUser?.name || authUser?.user_metadata?.name || authUser?.user_metadata?.display_name || "",
        phone: authUser?.mobile || authUser?.phone || "",
        email: authUser?.email || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load delivery KYC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, [userId]);

  const setField = (field: keyof DeliverymanKyc, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadFile = async (field: keyof DeliverymanKyc, file?: File) => {
    if (!file) return;
    setUploading(String(field));

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const resp = await fetch(`${API_BASE}/api/deliverymen/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, name: file.name, mime: file.type }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Upload failed");
      setField(field, result.url);
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const toggleDeliverySite = (site: string, checked: boolean) => {
    setSelectedSites((prev) =>
      checked ? [...prev, site] : prev.filter((item) => item !== site)
    );
  };

  const saveSelectedDeliveryAreas = async (silent = false) => {
    if (!Number.isFinite(userId)) {
      toast.error("Login user id not found");
      return false;
    }
    if (!selectedSiteDistrict || selectedSites.length === 0) {
      if (!silent) toast.error("Please select a district and at least one area");
      return false;
    }

    const alreadySaved = new Set(
      deliveryAreas
        .filter((item) => item.district === selectedSiteDistrict.district)
        .map((item) => item.thana || item.area || "")
    );
    const thanasToSave = selectedSites.filter((site) => !alreadySaved.has(site));

    if (thanasToSave.length === 0) {
      if (!silent) toast.info("Selected delivery areas are already saved");
      setSelectedSites([]);
      setDeliverySiteFilter("");
      return true;
    }

    setSavingDeliveryAreas(true);
    try {
      const resp = await fetch(`${API_BASE}/api/delivery-areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          district: selectedSiteDistrict.district,
          district_en: selectedSiteDistrict.districtEn,
          thanas: thanasToSave,
        }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.success === false) {
        throw new Error(result.message || "Failed to add delivery areas");
      }

      const areasResp = await fetch(`${API_BASE}/api/delivery-areas?user_id=${encodeURIComponent(String(userId))}`);
      const areasResult = await areasResp.json().catch(() => ({}));
      if (areasResp.ok && areasResult.success) setDeliveryAreas(areasResult.data || []);
      setSelectedSites([]);
      setDeliverySiteFilter("");
      if (!silent) toast.success("Delivery areas added");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add delivery areas");
      return false;
    } finally {
      setSavingDeliveryAreas(false);
    }
  };

  const submitKyc = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(userId)) {
      toast.error("Login user id not found");
      return;
    }
    if (requiredMissing) {
      toast.error("Please fill required fields and upload NID/selfie documents");
      return;
    }

    setSaving(true);
    try {
      if (selectedSites.length > 0) {
        const areasSaved = await saveSelectedDeliveryAreas(true);
        if (!areasSaved) return;
      }

      const payload = {
        ...form,
        user_id: userId,
        service_district: deliveryDistricts || form.service_district,
        service_thana: deliveryAreaSummary || form.service_thana,
        kyc_status: "submitted",
      };
      const resp = await fetch(form.id ? `${API_BASE}/api/deliverymen/${form.id}` : `${API_BASE}/api/deliverymen`, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) {
        throw new Error(result.error ? `${result.message}: ${result.error}` : result.message || "KYC save failed");
      }
      setForm({ ...emptyForm, ...result.data, date_of_birth: result.data?.date_of_birth ? String(result.data.date_of_birth).slice(0, 10) : "" });
      toast.success("Delivery KYC submitted for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "KYC save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-9 flex min-h-[360px] items-center justify-center rounded-xl border border-slate-100 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <form onSubmit={submitKyc} className="mt-9 max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-800">Delivery KYC Verification</h1>
            <Badge className={`border ${statusStyle[currentStatus]}`}>{statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Submit identity, vehicle, service area, and payout details.</p>
        </div>
        <Button type="button" variant="outline" className="gap-2 rounded-xl border-slate-200" onClick={fetchKyc}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {form.kyc_admin_message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-semibold">Admin message: </span>{form.kyc_admin_message}
        </div>
      )}

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-800">Personal Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" required value={form.full_name} onChange={(value) => setField("full_name", value)} />
          <Field label="Phone" required value={form.phone} onChange={(value) => setField("phone", value)} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => setField("email", value)} />
          <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(value) => setField("date_of_birth", value)} />
          <Field label="NID number" required value={form.nid_number} onChange={(value) => setField("nid_number", value)} />
          <Field label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(value) => setField("emergency_contact_phone", value)} />
          <Field label="Emergency contact name" value={form.emergency_contact_name} onChange={(value) => setField("emergency_contact_name", value)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Present address" required value={form.present_address} onChange={(value) => setField("present_address", value)} />
          <TextField label="Permanent address" value={form.permanent_address} onChange={(value) => setField("permanent_address", value)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-800">Delivery Setup</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Vehicle type" value={form.vehicle_type} onChange={(value) => setField("vehicle_type", value)} options={["bicycle", "motorcycle", "car", "van", "walking", "other"]} />
          <Field label="Vehicle registration number" value={form.vehicle_registration_number} onChange={(value) => setField("vehicle_registration_number", value)} />
          <Field label="Driving license number" value={form.driving_license_number} onChange={(value) => setField("driving_license_number", value)} />
          <ReadOnlyValue label="Service districts" value={deliveryDistricts || "Choose delivery areas below"} />
          <ReadOnlyValue label="Service areas" value={deliveryAreaSummary || "No delivery area saved yet"} />
        </div>
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5 sm:w-72">
              <span className="text-xs font-semibold text-slate-500">Add delivery district</span>
              <Popover open={districtPickerOpen} onOpenChange={setDistrictPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={districtPickerOpen}
                    className="h-10 w-full justify-between rounded-xl border-slate-200 bg-white px-3 text-sm font-normal text-slate-700"
                  >
                    <span className="truncate">{selectedDistrictLabel || "Select district"}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={districtFilter}
                      onValueChange={setDistrictFilter}
                      placeholder="Search district or area..."
                    />
                    <CommandList>
                      <CommandEmpty>No district found</CommandEmpty>
                      <CommandGroup>
                        {filteredDistrictOptions.map((item) => {
                          const selected = siteDistrict === item.districtEn;
                          return (
                            <CommandItem
                              key={`${item.divisionEn}-${item.districtEn}`}
                              value={item.districtEn}
                              onSelect={() => {
                                setSiteDistrict(item.districtEn);
                                setSelectedSites([]);
                                setDeliverySiteFilter("");
                                setDistrictPickerOpen(false);
                                setDistrictFilter("");
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                              <span className="flex-1">{item.districtEn}</span>
                              <span className="text-xs text-slate-400">{item.divisionEn}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              type="button"
              onClick={() => saveSelectedDeliveryAreas(false)}
              disabled={!selectedSiteDistrict || selectedSites.length === 0 || savingDeliveryAreas}
              className="h-10 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {savingDeliveryAreas ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Add Areas
            </Button>
          </div>

          {selectedSiteDistrict ? (
            <div className="space-y-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  value={deliverySiteFilter}
                  onChange={(event) => setDeliverySiteFilter(event.target.value)}
                  placeholder="Search area..."
                  className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm"
                />
              </div>
              {filteredDeliverySiteOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {filteredDeliverySiteOptions.map(({ site, siteEn }) => (
                    <label
                      key={site}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                      title={siteEn || site}
                    >
                      <Checkbox
                        checked={selectedSites.includes(site)}
                        onCheckedChange={(checked) => toggleDeliverySite(site, checked === true)}
                      />
                      <span className="truncate">{site}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                  No area found
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              Select a district to choose delivery areas
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-800">Payout Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Payout method" value={form.payout_method} onChange={(value) => setField("payout_method", value)} options={["bkash", "nagad", "rocket", "bank", "cash", "other"]} />
          <Field label="Account holder name" value={form.payout_account_name} onChange={(value) => setField("payout_account_name", value)} />
          <Field label="Account or wallet number" value={form.payout_account_number} onChange={(value) => setField("payout_account_number", value)} />
          <Field label="Bank name" value={form.bank_name} onChange={(value) => setField("bank_name", value)} />
          <Field label="Bank branch" value={form.bank_branch} onChange={(value) => setField("bank_branch", value)} />
          <Field label="Routing number" value={form.routing_number} onChange={(value) => setField("routing_number", value)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-800">Verification Documents</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <UploadBox label="NID front" required url={form.nid_front_url} uploading={uploading === "nid_front_url"} onChange={(file) => uploadFile("nid_front_url", file)} />
          <UploadBox label="NID back" required url={form.nid_back_url} uploading={uploading === "nid_back_url"} onChange={(file) => uploadFile("nid_back_url", file)} />
          <UploadBox label="Selfie" required url={form.selfie_url} uploading={uploading === "selfie_url"} onChange={(file) => uploadFile("selfie_url", file)} />
          <UploadBox label="Driving license" url={form.driving_license_url} uploading={uploading === "driving_license_url"} onChange={(file) => uploadFile("driving_license_url", file)} />
          <UploadBox label="Vehicle registration" url={form.vehicle_registration_url} uploading={uploading === "vehicle_registration_url"} onChange={(file) => uploadFile("vehicle_registration_url", file)} />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving || uploading !== null} className="gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit KYC
        </Button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}{required ? " *" : ""}</span>
      <Input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} className="rounded-xl border-slate-200" />
    </label>
  );
}

function TextField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}{required ? " *" : ""}</span>
      <Textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={3} className="rounded-xl border-slate-200" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {value}
      </div>
    </div>
  );
}

function UploadBox({ label, url, required, uploading, onChange }: { label: string; url: string; required?: boolean; uploading: boolean; onChange: (file?: File) => void }) {
  return (
    <label className="block rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{label}{required ? " *" : ""}</span>
        {url && <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">Uploaded</Badge>}
      </div>
      <div className="flex min-h-28 items-center justify-center rounded-lg bg-white">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        ) : url ? (
          <img src={url} alt={label} className="h-28 w-full rounded-lg object-cover" />
        ) : (
          <UploadCloud className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <Input type="file" accept="image/*,.pdf" className="mt-3 rounded-xl border-slate-200 bg-white text-xs" onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0])} />
    </label>
  );
}
