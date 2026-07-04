import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, MapPin, Phone, User, FileText, Clock, Download, CreditCard, ExternalLink, CheckCircle, XCircle, Trash2 } from "lucide-react";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { toast } from "sonner";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, { BulkActionTone, BulkImpactRow } from "@/components/admin/BulkConfirmDialog";

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  service_description: string;
  status: string;
  payment_status: string;
  payment_amount: number;
  tracking_token: string;
  created_at: string;
  assigned_rep_id: string | null;
  commission_percent: number;
  commission_amount: number;
  rep_earning: number;
}

const statusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "contacted", label: "যোগাযোগ হয়েছে", className: "bg-blue-100 text-blue-800" },
  { value: "resolved", label: "সমাধান হয়েছে", className: "bg-green-100 text-green-800" },
  { value: "rejected", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const AdminServiceRequests = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [thanaFilter, setThanaFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: categories = [] } = useCmsCategories();
  const { data: cmsServices = [] } = useCmsServices();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const updateData: any = { status };
    if (status === "resolved") updateData.service_completed_at = new Date().toISOString();
    const { error } = await supabase.from("service_requests").update(updateData).eq("id", id);
    if (!error) setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
    setUpdatingId(null);
  };

  const updatePayment = async (id: string, payment_status: string) => {
    const req = requests.find(r => r.id === id);
    const updateData: any = { payment_status };
    if (payment_status === "paid") {
      updateData.payment_confirmed_at = new Date().toISOString();

      // Calculate commission if there's an assigned rep and payment amount
      if (req && req.assigned_rep_id && req.payment_amount > 0) {
        // Get commission percent: check rep override first, then service default
        let commPercent = req.commission_percent;
        if (!commPercent || commPercent <= 0) {
          // Try to get rep's override commission
          const { data: repData } = await (supabase as any)
            .from("area_representatives")
            .select("commission_percent")
            .eq("user_id", req.assigned_rep_id)
            .single();
          if (repData?.commission_percent) {
            commPercent = repData.commission_percent;
          } else {
            commPercent = 10; // Default 10%
          }
        }

        const commAmount = Math.round((req.payment_amount * commPercent) / 100);
        const repEarning = req.payment_amount - commAmount;

        updateData.commission_percent = commPercent;
        updateData.commission_amount = commAmount;
        updateData.rep_earning = repEarning;

        // Create earning record
        await (supabase as any).from("rep_earnings").insert({
          rep_id: req.assigned_rep_id,
          service_request_id: id,
          total_amount: req.payment_amount,
          commission_percent: commPercent,
          commission_amount: commAmount,
          rep_earning: repEarning,
        });
      }
    }
    const { error } = await supabase.from("service_requests").update(updateData).eq("id", id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
      toast.success("পেমেন্ট স্ট্যাটাস আপডেট হয়েছে");
      if (payment_status === "paid" && req?.assigned_rep_id) {
        toast.success("প্রতিনিধির আয় ও রশিদ তৈরি হয়েছে");
      }
    }
  };

  const updateAmount = async (id: string, amount: number) => {
    const { error } = await supabase.from("service_requests").update({ payment_amount: amount }).eq("id", id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, payment_amount: amount } : r));
      toast.success("মূল্য আপডেট হয়েছে");
    }
  };

  const divisions = [...new Set(requests.map(r => r.division))].sort();
  const districts = [...new Set(
    requests.filter(r => divisionFilter === "all" || r.division === divisionFilter).map(r => r.district)
  )].sort();
  const thanas = [...new Set(
    requests.filter(r => (divisionFilter === "all" || r.division === divisionFilter) && (districtFilter === "all" || r.district === districtFilter) && r.thana).map(r => r.thana!)
  )].sort();

  // Build a set of service titles/slugs belonging to the selected category
  const categoryServiceKeywords = (() => {
    if (categoryFilter === "all") return null;
    const slugs = cmsServices
      .filter(s => s.category_id === categoryFilter)
      .flatMap(s => [s.title.toLowerCase(), (s.title_en || "").toLowerCase(), s.slug.toLowerCase()])
      .filter(Boolean);
    const cat = categories.find(c => c.id === categoryFilter);
    if (cat) {
      slugs.push(cat.name.toLowerCase(), (cat.name_en || "").toLowerCase());
    }
    return slugs;
  })();

  // Location-filtered base (before status filter)
  const locationFiltered = requests.filter(r => {
    if (divisionFilter !== "all" && r.division !== divisionFilter) return false;
    if (districtFilter !== "all" && r.district !== districtFilter) return false;
    if (thanaFilter !== "all" && r.thana !== thanaFilter) return false;
    if (categoryServiceKeywords) {
      const desc = r.service_description.toLowerCase();
      if (!categoryServiceKeywords.some(kw => kw && desc.includes(kw))) return false;
    }
    return true;
  });

  const filtered = filter === "all" ? locationFiltered : locationFiltered.filter(r => r.status === filter);

  const getStatusLabel = (status: string) => statusOptions.find(s => s.value === status)?.label || status;

  const sel = useBulkSelection(filtered, [filter, divisionFilter, districtFilter, thanaFilter, categoryFilter]);
  const perms = useBulkPermissions("service_requests");

  const [pendingBulk, setPendingBulk] = useState<{
    tone: BulkActionTone; title: string; description?: string;
    impacts?: BulkImpactRow[]; confirmLabel?: string; warning?: string;
    run: () => Promise<void> | void;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const runBulk = async () => {
    if (!pendingBulk) return;
    setBulkLoading(true);
    try { await pendingBulk.run(); } finally { setBulkLoading(false); setPendingBulk(null); }
  };

  const bulkSetStatus = async (status: string) => {
    if (sel.selectedIds.length === 0) return;
    const updateData: any = { status };
    if (status === "resolved") updateData.service_completed_at = new Date().toISOString();
    const { error } = await supabase.from("service_requests").update(updateData).in("id", sel.selectedIds);
    if (error) { toast.error("আপডেট ব্যর্থ"); return; }
    setRequests(prev => prev.map(r => sel.selected.has(r.id) ? { ...r, ...updateData } : r));
    toast.success(`${sel.selectedIds.length}টি রিকোয়েস্টের স্ট্যাটাস আপডেট হয়েছে`);
    sel.clear();
  };

  const bulkDelete = async () => {
    if (sel.selectedIds.length === 0) return;
    const { error } = await supabase.from("service_requests").delete().in("id", sel.selectedIds);
    if (error) { toast.error("মুছতে ব্যর্থ"); return; }
    setRequests(prev => prev.filter(r => !sel.selected.has(r.id)));
    toast.success(`${sel.selectedIds.length}টি রিকোয়েস্ট মুছে ফেলা হয়েছে`);
    sel.clear();
  };

  const downloadCSV = () => {
    const header = "আইডি,নাম,ফোন,বিভাগ,জেলা,থানা,বিস্তারিত এলাকা,সেবার বিবরণ,স্ট্যাটাস,তারিখ";
    const rows = filtered.map(r =>
      [r.id.slice(0, 8), r.customer_name, r.customer_phone, r.division, r.district, r.thana || "", r.detail_area || "", `"${r.service_description.replace(/"/g, '""')}"`, getStatusLabel(r.status), new Date(r.created_at).toLocaleDateString("bn-BD")].join(",")
    );
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>সেবা রিকোয়েস্ট রিপোর্ট</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1a1a2e; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #1a1a2e; color: #fff; padding: 8px 6px; text-align: left; }
      td { padding: 6px; border-bottom: 1px solid #e5e5e5; }
      tr:nth-child(even) { background: #f8f9fa; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
      .pending { background: #fef3c7; color: #92400e; }
      .contacted { background: #dbeafe; color: #1e40af; }
      .resolved { background: #d1fae5; color: #065f46; }
      .rejected { background: #fee2e2; color: #991b1b; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>📋 সেবা রিকোয়েস্ট রিপোর্ট</h1>
    <p class="meta">মোট: ${filtered.length}টি রিকোয়েস্ট • তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
    <table><thead><tr><th>নাম</th><th>ফোন</th><th>অবস্থান</th><th>সেবার বিবরণ</th><th>স্ট্যাটাস</th><th>তারিখ</th></tr></thead><tbody>`);
    filtered.forEach(r => {
      const loc = [r.division, r.district, r.thana].filter(Boolean).join(" › ");
      w.document.write(`<tr>
        <td>${r.customer_name}</td>
        <td>${r.customer_phone}</td>
        <td>${loc}${r.detail_area ? `<br><small style="color:#888">${r.detail_area}</small>` : ""}</td>
        <td>${r.service_description}</td>
        <td><span class="badge ${r.status}">${getStatusLabel(r.status)}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString("bn-BD")}</td>
      </tr>`);
    });
    w.document.write(`</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">সেবা রিকোয়েস্ট ({locationFiltered.length}{locationFiltered.length !== requests.length ? `/${requests.length}` : ""})</h3>
        <div className="flex items-center gap-1.5">
          {filtered.length > 0 && (
            <BulkSelectToggle
              allSelected={sel.allSelected}
              someSelected={sel.someSelected}
              selectedCount={sel.selectedCount}
              totalCount={filtered.length}
              onToggle={sel.toggleAll}
            />
          )}
          {filtered.length > 0 && (
            <>
              <button onClick={downloadCSV} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors">
                <Download className="h-3 w-3" /> CSV
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors">
                <FileText className="h-3 w-3" /> PDF
              </button>
            </>
          )}
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {statusOptions.map(s => {
          const count = locationFiltered.filter(r => r.status === s.value).length;
          return (
            <button key={s.value} onClick={() => setFilter(filter === s.value ? "all" : s.value)}
              className={`rounded-xl border p-2.5 text-left transition-all ${filter === s.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}>
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Location & Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <CategoryFilterDropdown value={categoryFilter} onChange={setCategoryFilter} />
        <select
          value={divisionFilter}
          onChange={e => { setDivisionFilter(e.target.value); setDistrictFilter("all"); setThanaFilter("all"); }}
          className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">সব বিভাগ</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={districtFilter}
          onChange={e => { setDistrictFilter(e.target.value); setThanaFilter("all"); }}
          className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">সব জেলা</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {thanas.length > 0 && (
          <select
            value={thanaFilter}
            onChange={e => setThanaFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">সব থানা</option>
            {thanas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {(divisionFilter !== "all" || districtFilter !== "all" || thanaFilter !== "all" || categoryFilter !== "all") && (
          <button onClick={() => { setDivisionFilter("all"); setDistrictFilter("all"); setThanaFilter("all"); setCategoryFilter("all"); }} className="text-xs text-primary hover:underline">
            ✕ ফিল্টার মুছুন
          </button>
        )}
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="mb-3 text-xs text-primary hover:underline">← সব দেখুন</button>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো রিকোয়েস্ট নেই</p>
        ) : filtered.map(r => {
          const s = statusOptions.find(o => o.value === r.status) || statusOptions[0];
          const checked = sel.isSelected(r.id);
          return (
            <div key={r.id} className={`rounded-xl border ${checked ? "border-primary ring-1 ring-primary/40" : "border-border"} bg-card p-3 space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <BulkSelectCheckbox
                    checked={checked}
                    onChange={() => sel.toggle(r.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {r.customer_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {r.customer_phone}</p>
                  </div>
                </div>
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} disabled={updatingId === r.id}
                  className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-foreground flex items-start gap-1.5"><FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {r.service_description}</p>

              {/* Payment controls */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="number"
                  defaultValue={r.payment_amount || 0}
                  onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v !== r.payment_amount) updateAmount(r.id, v); }}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  placeholder="৳ মূল্য"
                />
                <select
                  value={r.payment_status || "unpaid"}
                  onChange={e => updatePayment(r.id, e.target.value)}
                  className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${
                    r.payment_status === "paid" ? "bg-green-100 text-green-800" :
                    r.payment_status === "partial" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}
                >
                  <option value="unpaid">পেমেন্ট বাকি</option>
                  <option value="partial">আংশিক পেমেন্ট</option>
                  <option value="paid">পেমেন্ট সম্পন্ন</option>
                </select>
                {r.tracking_token && (
                  <a href={`/track/${r.tracking_token}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-primary hover:bg-secondary ml-auto">
                    <ExternalLink className="h-3 w-3" /> ট্র্যাকিং
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                  📍 {r.division}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 font-medium">
                  🏙️ {r.district}
                </span>
                {r.thana && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 font-medium">
                    📌 {r.thana}
                  </span>
                )}
                {r.detail_area && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 font-medium max-w-[180px] truncate" title={r.detail_area}>
                    🏠 {r.detail_area}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-muted-foreground ml-auto">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString("bn-BD")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          { key: "contacted", label: "যোগাযোগ", icon: <Phone className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "neutral", title: "নির্বাচিত রিকোয়েস্টগুলো 'যোগাযোগ হয়েছে' হিসেবে চিহ্নিত করবেন?",
              description: "ব্যবহারকারীর সাথে যোগাযোগের রেকর্ড সংরক্ষিত হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "যোগাযোগ হয়েছে (contacted)" },
                { label: "যোগাযোগের সময়", value: "এখন" },
              ],
              confirmLabel: "হ্যাঁ, আপডেট", run: () => bulkSetStatus("contacted"),
            })},
          { key: "resolved", label: "সমাধান", icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "primary",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "approve", title: "নির্বাচিত রিকোয়েস্ট সমাধান হিসেবে চিহ্নিত করবেন?",
              description: "রিকোয়েস্টগুলো সম্পন্ন হিসেবে আর্কাইভ হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "সমাধান হয়েছে (resolved)" },
                { label: "সম্পন্নের সময়", value: "এখন" },
              ],
              confirmLabel: "হ্যাঁ, সমাধান", run: () => bulkSetStatus("resolved"),
            })},
          { key: "rejected", label: "বাতিল", icon: <XCircle className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "reject", title: "নির্বাচিত রিকোয়েস্টগুলো বাতিল করবেন?",
              description: "রিকোয়েস্ট আর্কাইভ হবে এবং সেবা প্রদান বন্ধ থাকবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "বাতিল (rejected)" },
                { label: "সেবা প্রদান", value: "বন্ধ" },
              ],
              warning: "বাতিলকৃত রিকোয়েস্টে আর কোনো সেবা প্রদান হবে না।",
              confirmLabel: "হ্যাঁ, বাতিল", run: () => bulkSetStatus("rejected"),
            })},
          { key: "delete", label: "মুছুন", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive",
            disabled: !perms.canDelete, disabledReason: perms.reasonFor("can_delete"),
            onClick: () => setPendingBulk({
              tone: "delete", title: "নির্বাচিত রিকোয়েস্ট স্থায়ীভাবে মুছবেন?",
              description: "ডেটাবেস থেকে রিকোয়েস্টগুলো সম্পূর্ণ অপসারিত হবে।",
              impacts: [
                { label: "অ্যাকশন", value: "স্থায়ী মুছে ফেলা" },
                { label: "পুনরুদ্ধার", value: "সম্ভব নয়" },
              ],
              warning: "এটি অপরিবর্তনীয়। মুছে ফেলার পর ডেটা পুনরুদ্ধার করা যাবে না।",
              confirmLabel: "হ্যাঁ, মুছুন", run: bulkDelete,
            })},
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(o) => { if (!o) setPendingBulk(null); }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="রিকোয়েস্ট"
        tone={pendingBulk?.tone || "neutral"}
        title={pendingBulk?.title}
        description={pendingBulk?.description}
        impacts={pendingBulk?.impacts}
        warning={pendingBulk?.warning}
        confirmLabel={pendingBulk?.confirmLabel}
        disabledReason={pendingBulk?.tone === "delete" ? perms.reasonFor("can_delete") : perms.reasonFor("can_update")}
        loading={bulkLoading}
      />
    </div>
  );
};

export default AdminServiceRequests;
