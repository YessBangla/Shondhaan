import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, RefreshCw, Store, Search, Eye, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

interface Seller {
  id: number;
  user_id: number | null;
  shop_name: string | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_mobile: string | null;
  seller_address: string | null;
  seller_verified: number;
  profile_image_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  routing_number: string | null;
  mobile_banking_provider: string | null;
  mobile_banking_number: string | null;
  kyc_admin_message: string | null;
  nid_front_url: string | null;
  nid_back_url: string | null;
  trade_license_url: string | null;
  tin_certificate_url: string | null;
  created_at: string;
}

export default function AdminMartKyc() {
  const [sellers, setSellers]     = useState<Seller[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [updating, setUpdating]   = useState<Record<number, boolean>>({});
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const resp   = await fetch(`${API_BASE}/api/sellers`);
      const result = await resp.json();
      if (result.success) setSellers(result.data ?? []);
      else toast.error("Could not load sellers");
    } catch {
      toast.error("Failed to fetch sellers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSellers(); }, []);

  const toggleVerify = async (seller: Seller) => {
    const newVal = !seller.seller_verified;
    setUpdating(prev => ({ ...prev, [seller.id]: true }));
    try {
      const resp   = await fetch(`${API_BASE}/api/sellers/${seller.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: newVal }),
      });
      const result = await resp.json();
      if (result.success) {
        setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, ...(result.data || {}), seller_verified: newVal ? 1 : 0 } : s));
        setSelectedSeller(prev => prev?.id === seller.id ? { ...prev, ...(result.data || {}), seller_verified: newVal ? 1 : 0 } : prev);
        toast.success(newVal ? "সেলার ভেরিফাইড করা হয়েছে" : "ভেরিফিকেশন বাতিল করা হয়েছে");
      } else {
        toast.error(result.message || "Update failed");
      }
    } catch {
      toast.error("Failed to update verification");
    } finally {
      setUpdating(prev => ({ ...prev, [seller.id]: false }));
    }
  };

  const filtered = sellers.filter(s =>
    (s.shop_name   || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.seller_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.seller_email|| "").toLowerCase().includes(search.toLowerCase()) ||
    (s.seller_mobile || "").includes(search)
  );

  const verified   = filtered.filter(s => s.seller_verified);
  const unverified = filtered.filter(s => !s.seller_verified);

  return (
    <div className="p-4 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">KYC ভেরিফিকেশন</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {sellers.length} জন সেলার · {sellers.filter(s => s.seller_verified).length} জন ভেরিফাইড
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="নাম / ইমেইল / মোবাইল..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 shrink-0 gap-1.5"
            onClick={fetchSellers} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <p className="text-sm text-slate-400">লোড হচ্ছে...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Store className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">কোনো সেলার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Pending / Unverified */}
          {unverified.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  পেন্ডিং ({unverified.length})
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {unverified.map(s => (
                  <SellerCard
                    key={s.id}
                    seller={s}
                    updating={!!updating[s.id]}
                    onOpen={() => setSelectedSeller(s)}
                    onToggle={toggleVerify}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Verified */}
          {verified.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  ভেরিফাইড ({verified.length})
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {verified.map(s => (
                  <SellerCard
                    key={s.id}
                    seller={s}
                    updating={!!updating[s.id]}
                    onOpen={() => setSelectedSeller(s)}
                    onToggle={toggleVerify}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      <KycDetailsDialog
        seller={selectedSeller}
        onSellerUpdated={(updatedSeller) => {
          setSellers(prev => prev.map(s => s.id === updatedSeller.id ? { ...s, ...updatedSeller } : s));
          setSelectedSeller(updatedSeller);
        }}
        onOpenChange={(open) => {
          if (!open) setSelectedSeller(null);
        }}
      />
    </div>
  );
}

// ── Seller card ───────────────────────────────────────────────────────────────
function SellerCard({
  seller, updating, onOpen, onToggle,
}: {
  seller: Seller;
  updating: boolean;
  onOpen: () => void;
  onToggle: (s: Seller) => void;
}) {
  const isVerified = !!seller.seller_verified;
  const docs = [
    { label: "NID সামনে",      url: seller.nid_front_url },
    { label: "NID পেছনে",      url: seller.nid_back_url },
    { label: "ট্রেড লাইসেন্স", url: seller.trade_license_url },
    { label: "TIN সার্টিফিকেট", url: seller.tin_certificate_url },
  ].filter(d => d.url);

  return (
    <div className={`rounded-2xl border bg-white transition-all ${
      isVerified ? "border-emerald-100" : "border-amber-100"
    }`}>

      {/* Top */}
      <button type="button" onClick={onOpen} className="w-full p-4 flex items-start gap-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {seller.profile_image_url
            ? <img src={seller.profile_image_url} alt="" className="w-full h-full object-cover" />
            : <Store className="h-5 w-5 text-slate-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {seller.shop_name || seller.seller_name || `Seller #${seller.id}`}
              </p>
              {seller.seller_name && seller.shop_name && (
                <p className="text-[11px] text-slate-400 truncate">{seller.seller_name}</p>
              )}
            </div>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isVerified
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isVerified ? "ভেরিফাইড" : "পেন্ডিং"}
            </span>
          </div>

          {/* Info rows */}
          <div className="mt-2 space-y-0.5">
            {seller.seller_email && (
              <p className="text-[11px] text-slate-500 truncate">{seller.seller_email}</p>
            )}
            {seller.seller_mobile && (
              <p className="text-[11px] text-slate-500">{seller.seller_mobile}</p>
            )}
            {seller.seller_address && (
              <p className="text-[11px] text-slate-400 truncate">{seller.seller_address}</p>
            )}
            <p className="text-[10px] text-slate-300">
              যোগ: {new Date(seller.created_at).toLocaleDateString("bn-BD")}
            </p>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <Eye className="h-3.5 w-3.5" />
            View KYC details
          </div>
        </div>
      </button>

      {/* Documents */}
      {docs.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">ডকুমেন্ট</p>
          <div className="flex flex-wrap gap-1.5">
            {docs.map(d => (
              <button key={d.label} type="button" onClick={onOpen}
                className="text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                {d.label} ↗
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onToggle(seller)}
          disabled={updating}
          className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isVerified
              ? "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {updating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isVerified ? (
            <><ShieldOff className="h-3.5 w-3.5" /> ভেরিফিকেশন বাতিল</>
          ) : (
            <><ShieldCheck className="h-3.5 w-3.5" /> ভেরিফাই করুন</>
          )}
        </button>
      </div>
    </div>
  );
}

function KycDetailsDialog({
  seller,
  onSellerUpdated,
  onOpenChange,
}: {
  seller: Seller | null;
  onSellerUpdated: (seller: Seller) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [messageSaving, setMessageSaving] = useState(false);

  useEffect(() => {
    setMessage(seller?.kyc_admin_message || "");
  }, [seller]);

  if (!seller) return null;

  const saveMessage = async () => {
    setMessageSaving(true);
    try {
      const resp = await fetch(`${API_BASE}/api/sellers/${seller.id}/kyc-message`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Failed to save message");
      onSellerUpdated(result.data);
      toast.success("KYC message saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save message");
    } finally {
      setMessageSaving(false);
    }
  };

  const bankRows = [
    { label: "Bank Name", value: seller.bank_name },
    { label: "Account Holder Name", value: seller.bank_account_name },
    { label: "Account Number", value: seller.bank_account_number },
    { label: "Branch Name", value: seller.bank_branch },
    { label: "Routing Number", value: seller.routing_number },
  ];

  const mobileRows = [
    { label: "Provider", value: seller.mobile_banking_provider },
    { label: "Mobile Number", value: seller.mobile_banking_number },
  ];

  const documents = [
    { label: "NID Front Side", url: seller.nid_front_url },
    { label: "NID Back Side", url: seller.nid_back_url },
    { label: "Trade License", url: seller.trade_license_url },
    { label: "TIN Certificate", url: seller.tin_certificate_url },
  ];

  return (
    <Dialog open={!!seller} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            KYC Verification Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                {seller.profile_image_url ? (
                  <img src={seller.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    {seller.shop_name || seller.seller_name || `Seller #${seller.id}`}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    seller.seller_verified
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {seller.seller_verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <p>{seller.seller_name || "Seller name not uploaded"}</p>
                  <p>{seller.seller_email || "Email not uploaded"}</p>
                  <p>{seller.seller_mobile || "Mobile not uploaded"}</p>
                  <p>{seller.seller_address || "Address not uploaded"}</p>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-amber-900">Message to Vendor</h3>
                <p className="text-xs text-amber-700">This alert appears on the vendor KYC page until the seller is verified.</p>
              </div>
              {seller.kyc_admin_message && (
                <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Active alert
                </span>
              )}
            </div>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Write what the vendor needs to fix or upload..."
              className="border-amber-200 bg-white text-sm"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={saveMessage} disabled={messageSaving} size="sm" className="gap-2 bg-amber-600 text-white hover:bg-amber-700">
                {messageSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Message
              </Button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-700">Bank Information</h3>
              <div className="space-y-2">
                {bankRows.map(row => <InfoRow key={row.label} label={row.label} value={row.value} />)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-700">Mobile Banking</h3>
              <div className="space-y-2">
                {mobileRows.map(row => <InfoRow key={row.label} label={row.label} value={row.value} />)}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Verification Documents</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map(document => (
                <DocumentPreview key={document.label} label={document.label} url={document.url} />
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  const hasValue = !!String(value || "").trim();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={`text-right text-xs font-medium ${hasValue ? "text-slate-800" : "text-rose-500"}`}>
        {hasValue ? value : "Not uploaded"}
      </span>
    </div>
  );
}

function DocumentPreview({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-white">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="text-[11px] font-medium text-rose-500">Not uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
    >
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
