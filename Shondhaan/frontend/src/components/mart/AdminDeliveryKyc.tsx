import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Loader2, RefreshCw, Search, ShieldCheck, ShieldOff, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

interface Deliveryman {
  id: number;
  user_id: number;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  display_name?: string | null;
  display_phone?: string | null;
  display_email?: string | null;
  date_of_birth: string | null;
  present_address: string | null;
  permanent_address: string | null;
  nid_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  vehicle_type: string | null;
  vehicle_registration_number: string | null;
  driving_license_number: string | null;
  service_district: string | null;
  service_thana: string | null;
  delivery_area_count?: number | null;
  delivery_districts?: string | null;
  delivery_area_summary?: string | null;
  primary_service_district?: string | null;
  primary_service_thana?: string | null;
  payout_method: string | null;
  payout_account_name: string | null;
  payout_account_number: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  routing_number: string | null;
  nid_front_url: string | null;
  nid_back_url: string | null;
  selfie_url: string | null;
  driving_license_url: string | null;
  vehicle_registration_url: string | null;
  kyc_status: "draft" | "submitted" | "approved" | "rejected";
  verified: number;
  kyc_admin_message: string | null;
  created_at: string;
}

const statusClasses: Record<string, string> = {
  draft: "bg-slate-50 text-slate-700 border-slate-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminDeliveryKyc() {
  const [deliverymen, setDeliverymen] = useState<Deliveryman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Deliveryman | null>(null);
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  const fetchDeliverymen = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/deliverymen`);
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Could not load delivery KYC");
      setDeliverymen(result.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load delivery KYC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliverymen();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return deliverymen.filter((item) => {
      if (!q) return true;
      return (
        (item.display_name || item.full_name || "").toLowerCase().includes(q) ||
        (item.display_phone || item.phone || "").includes(q) ||
        (item.display_email || item.email || "").toLowerCase().includes(q) ||
        (item.nid_number || "").toLowerCase().includes(q)
      );
    });
  }, [deliverymen, search]);

  const updateVerification = async (item: Deliveryman, verified: boolean, message?: string) => {
    setUpdating((prev) => ({ ...prev, [item.id]: true }));
    try {
      const resp = await fetch(`${API_BASE}/api/deliverymen/${item.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified, kyc_admin_message: message }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Verification update failed");
      setDeliverymen((prev) => prev.map((row) => row.id === item.id ? result.data : row));
      setSelected((prev) => prev?.id === item.id ? result.data : prev);
      toast.success(verified ? "Delivery KYC approved" : "Delivery KYC rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification update failed");
    } finally {
      setUpdating((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const pending = filtered.filter((item) => item.kyc_status !== "approved");
  const approved = filtered.filter((item) => item.kyc_status === "approved");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Delivery KYC Verification</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {deliverymen.length} deliverymen, {approved.length} approved
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, email, NID..." className="h-9 rounded-xl border-slate-200 pl-9 text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200" onClick={fetchDeliverymen} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-slate-100 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Truck className="mx-auto mb-2 h-9 w-9 text-slate-300" />
          <p className="text-sm text-slate-500">No delivery KYC data found</p>
        </div>
      ) : (
        <div className="space-y-6">
          <KycSection title="Pending / Needs Review" items={pending} updating={updating} onOpen={setSelected} onVerify={updateVerification} />
          <KycSection title="Approved" items={approved} updating={updating} onOpen={setSelected} onVerify={updateVerification} />
        </div>
      )}

      <DeliveryKycDialog
        item={selected}
        updating={selected ? !!updating[selected.id] : false}
        onOpenChange={(open) => !open && setSelected(null)}
        onVerify={updateVerification}
        onUpdated={(updated) => {
          setDeliverymen((prev) => prev.map((row) => row.id === updated.id ? updated : row));
          setSelected(updated);
        }}
      />
    </div>
  );
}

function KycSection({ title, items, updating, onOpen, onVerify }: { title: string; items: Deliveryman[]; updating: Record<number, boolean>; onOpen: (item: Deliveryman) => void; onVerify: (item: Deliveryman, verified: boolean, message?: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title} ({items.length})</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <button type="button" onClick={() => onOpen(item)} className="w-full text-left">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{item.display_name || item.full_name || `Deliveryman #${item.id}`}</p>
                  <p className="truncate text-xs text-slate-500">{item.display_phone || item.phone || "No phone"}</p>
                </div>
                <Badge className={`border ${statusClasses[item.kyc_status] || statusClasses.draft}`}>{item.kyc_status}</Badge>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <p>NID: {item.nid_number || "Not uploaded"}</p>
                <p>Vehicle: {item.vehicle_type || "Not selected"}</p>
                <p>Area: {item.delivery_area_summary || [item.service_district, item.service_thana].filter(Boolean).join(", ") || "Not set"}</p>
              </div>
            </button>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={updating[item.id]} onClick={() => onVerify(item, true)}>
                {updating[item.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50" disabled={updating[item.id]} onClick={() => onVerify(item, false, item.kyc_admin_message || "Please update your delivery KYC documents.")}>
                <ShieldOff className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeliveryKycDialog({ item, updating, onOpenChange, onVerify, onUpdated }: { item: Deliveryman | null; updating: boolean; onOpenChange: (open: boolean) => void; onVerify: (item: Deliveryman, verified: boolean, message?: string) => void; onUpdated: (item: Deliveryman) => void }) {
  const [message, setMessage] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);

  useEffect(() => {
    setMessage(item?.kyc_admin_message || "");
  }, [item]);

  if (!item) return null;

  const saveMessage = async () => {
    setSavingMessage(true);
    try {
      const resp = await fetch(`${API_BASE}/api/deliverymen/${item.id}/kyc-message`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Message save failed");
      onUpdated(result.data);
      toast.success("KYC message saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message save failed");
    } finally {
      setSavingMessage(false);
    }
  };

  const personalRows = [
    ["User ID", item.user_id],
    ["Name", item.display_name || item.full_name],
    ["Phone", item.display_phone || item.phone],
    ["Email", item.display_email || item.email],
    ["Date of birth", item.date_of_birth ? String(item.date_of_birth).slice(0, 10) : null],
    ["NID number", item.nid_number],
    ["Present address", item.present_address],
    ["Permanent address", item.permanent_address],
    ["Emergency contact", [item.emergency_contact_name, item.emergency_contact_phone].filter(Boolean).join(" - ")],
  ];

  const deliveryRows = [
    ["Vehicle type", item.vehicle_type],
    ["Vehicle registration", item.vehicle_registration_number],
    ["Driving license", item.driving_license_number],
    ["Service districts", item.delivery_districts || item.primary_service_district || item.service_district],
    ["Service areas", item.delivery_area_summary || [item.service_district, item.service_thana].filter(Boolean).join(", ")],
    ["Payout method", item.payout_method],
    ["Payout account", [item.payout_account_name, item.payout_account_number].filter(Boolean).join(" - ")],
    ["Bank", [item.bank_name, item.bank_branch, item.routing_number].filter(Boolean).join(" - ")],
  ];

  const documents = [
    ["NID front", item.nid_front_url],
    ["NID back", item.nid_back_url],
    ["Selfie", item.selfie_url],
    ["Driving license", item.driving_license_url],
    ["Vehicle registration", item.vehicle_registration_url],
  ];

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Delivery KYC Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{item.display_name || item.full_name || `Deliveryman #${item.id}`}</p>
                <p className="text-xs text-slate-500">{item.display_phone || item.phone || "No phone"}</p>
              </div>
              <Badge className={`border ${statusClasses[item.kyc_status] || statusClasses.draft}`}>{item.kyc_status}</Badge>
            </div>
          </div>

          <section className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-amber-900">Message to deliveryman</h3>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Write what needs to be fixed..." className="mt-2 border-amber-200 bg-white text-sm" />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" className="gap-2 border-amber-200 bg-white text-amber-700" disabled={savingMessage} onClick={saveMessage}>
                {savingMessage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Message
              </Button>
              <Button size="sm" variant="outline" className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50" disabled={updating} onClick={() => onVerify(item, false, message || "Please update your delivery KYC documents.")}>
                <ShieldOff className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button size="sm" className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700" disabled={updating} onClick={() => onVerify(item, true)}>
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Approve
              </Button>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoPanel title="Personal Information" rows={personalRows} />
            <InfoPanel title="Delivery and Payout" rows={deliveryRows} />
          </div>

          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Documents</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map(([label, url]) => <DocumentPreview key={String(label)} label={String(label)} url={url ? String(url) : null} />)}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, unknown]> }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-700">{title}</h3>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <span className={`text-right text-xs font-medium ${String(value || "").trim() ? "text-slate-800" : "text-rose-500"}`}>
              {String(value || "").trim() || "Not uploaded"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DocumentPreview({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-white">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[11px] font-medium text-rose-500">Not uploaded</p>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
      <div className="aspect-[4/3] bg-white">
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="text-[11px] font-medium text-emerald-600">Uploaded</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-600" />
      </div>
    </a>
  );
}
