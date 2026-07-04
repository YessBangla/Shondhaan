import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, MapPin, Phone, User, Plus, Trash2, Search, BarChart3, TrendingUp, Zap, Clock, CheckCircle, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { divisions } from "@/data/locations";
import RepLeaderboard from "@/components/RepLeaderboard";

interface Representative {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  thana: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

interface RepPerformance {
  user_id: string;
  name: string;
  handled: number;
  resolved: number;
  avgResponseMs: number;
  avgResolveMs: number;
  resolutionRate: number;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

const AdminRepresentatives = () => {
  const [reps, setReps] = useState<Representative[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [showPerformance, setShowPerformance] = useState(false);
  const [perfData, setPerfData] = useState<RepPerformance[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  // Form state
  const [selUserId, setSelUserId] = useState("");
  const [selName, setSelName] = useState("");
  const [selPhone, setSelPhone] = useState("");
  const [selDivision, setSelDivision] = useState("");
  const [selDistrict, setSelDistrict] = useState("");
  const [selThana, setSelThana] = useState("");
  const [selCommission, setSelCommission] = useState("");

  const divisionObj = useMemo(() => divisions.find(d => d.nameBn === selDivision), [selDivision]);
  const districtObj = useMemo(() => divisionObj?.districts.find(d => d.nameBn === selDistrict), [divisionObj, selDistrict]);

  const fetchReps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("area_representatives" as any).select("*").order("created_at", { ascending: false });
    if (data) setReps(data as any);
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    // Get users with representative role
    const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "representative");
    if (!roleData) return;
    const userIds = roleData.map(r => r.user_id);
    if (userIds.length === 0) return;
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, phone").in("user_id", userIds);
    if (profiles) setUsers(profiles);
  }, []);

  const fetchPerformance = useCallback(async () => {
    setPerfLoading(true);
    // Get all service requests with tracking data
    const { data: allRequests } = await supabase
      .from("service_requests")
      .select("assigned_rep_id, status, created_at, first_response_at, resolved_at") as any;

    if (!allRequests || !reps.length) { setPerfLoading(false); return; }

    // Group by assigned_rep_id
    const repMap = new Map<string, RepPerformance>();
    for (const rep of reps) {
      repMap.set(rep.user_id, {
        user_id: rep.user_id,
        name: rep.name,
        handled: 0,
        resolved: 0,
        avgResponseMs: 0,
        avgResolveMs: 0,
        resolutionRate: 0,
      });
    }

    for (const req of allRequests) {
      if (!req.assigned_rep_id || !repMap.has(req.assigned_rep_id)) continue;
      const perf = repMap.get(req.assigned_rep_id)!;
      perf.handled++;
      if (req.status === "resolved") perf.resolved++;
    }

    // Calculate averages
    for (const req of allRequests) {
      if (!req.assigned_rep_id || !repMap.has(req.assigned_rep_id)) continue;
      const perf = repMap.get(req.assigned_rep_id)!;
      if (req.first_response_at) {
        perf.avgResponseMs += new Date(req.first_response_at).getTime() - new Date(req.created_at).getTime();
      }
      if (req.resolved_at) {
        perf.avgResolveMs += new Date(req.resolved_at).getTime() - new Date(req.created_at).getTime();
      }
    }

    const result: RepPerformance[] = [];
    repMap.forEach(perf => {
      const responsCount = allRequests.filter((r: any) => r.assigned_rep_id === perf.user_id && r.first_response_at).length;
      const resolveCount = allRequests.filter((r: any) => r.assigned_rep_id === perf.user_id && r.resolved_at).length;
      if (responsCount > 0) perf.avgResponseMs /= responsCount;
      if (resolveCount > 0) perf.avgResolveMs /= resolveCount;
      perf.resolutionRate = perf.handled > 0 ? Math.round((perf.resolved / perf.handled) * 100) : 0;
      result.push(perf);
    });

    // Sort by handled desc
    result.sort((a, b) => b.handled - a.handled);
    setPerfData(result);
    setPerfLoading(false);
  }, [reps]);

  const downloadCSV = useCallback(() => {
    if (!perfData.length) { toast.error("আগে পারফরম্যান্স ডেটা লোড করুন"); return; }
    const now = new Date();
    const monthName = now.toLocaleDateString("bn-BD", { year: "numeric", month: "long" });
    const headers = ["প্রতিনিধি,হ্যান্ডেল,সমাধান,সমাধান হার (%),গড় রেসপন্স,গড় সমাধান সময়"];
    const rows = perfData.map(p =>
      `"${p.name}",${p.handled},${p.resolved},${p.resolutionRate},${formatDuration(p.avgResponseMs)},${formatDuration(p.avgResolveMs)}`
    );
    const bom = "\uFEFF";
    const csv = bom + `পারফরম্যান্স রিপোর্ট - ${monthName}\n\n` + headers.join("\n") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `performance-report-${now.toISOString().slice(0, 7)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হয়েছে");
  }, [perfData]);

  const downloadPDF = useCallback(() => {
    if (!perfData.length) { toast.error("আগে পারফরম্যান্স ডেটা লোড করুন"); return; }
    const now = new Date();
    const monthName = now.toLocaleDateString("bn-BD", { year: "numeric", month: "long" });
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("পপ-আপ ব্লক করা আছে"); return; }
    const tableRows = perfData.map(p => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${p.name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${p.handled}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${p.resolved}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${p.resolutionRate}%</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${formatDuration(p.avgResponseMs)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${formatDuration(p.avgResolveMs)}</td>
      </tr>`).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>পারফরম্যান্স রিপোর্ট</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
      th{background:#f3f4f6;padding:10px;border:1px solid #ddd;text-align:center}h1{font-size:18px}h2{font-size:14px;color:#666}</style></head>
      <body><h1>প্রতিনিধি পারফরম্যান্স রিপোর্ট</h1><h2>${monthName}</h2>
      <table><thead><tr><th>প্রতিনিধি</th><th>হ্যান্ডেল</th><th>সমাধান</th><th>সমাধান হার</th><th>গড় রেসপন্স</th><th>গড় সমাধান</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      <p style="margin-top:20px;font-size:12px;color:#999">তৈরি: ${now.toLocaleString("bn-BD")}</p>
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    printWindow.document.close();
    toast.success("PDF প্রিন্ট উইন্ডো খোলা হয়েছে");
  }, [perfData]);

  useEffect(() => { fetchReps(); fetchUsers(); }, [fetchReps, fetchUsers]);

  const handleAdd = async () => {
    if (!selUserId || !selName.trim() || !selPhone.trim() || !selDivision || !selDistrict) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    setAdding(true);
    const payload: any = {
      user_id: selUserId,
      name: selName,
      phone: selPhone,
      division: selDivision,
      district: selDistrict,
      thana: selThana || null,
    };
    if (selCommission.trim()) payload.commission_percent = parseFloat(selCommission);
    const { error } = await supabase.from("area_representatives" as any).insert(payload);
    if (error) {
      if (error.code === "23505") toast.error("এই ইউজার ইতিমধ্যে এই এলাকায় অ্যাসাইন আছে");
      else toast.error("যোগ করতে সমস্যা হয়েছে");
    } else {
      toast.success("প্রতিনিধি যোগ করা হয়েছে");
      setSelUserId(""); setSelName(""); setSelPhone(""); setSelDivision(""); setSelDistrict(""); setSelThana(""); setSelCommission("");
      fetchReps();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("area_representatives" as any).delete().eq("id", id);
    if (!error) {
      setReps(prev => prev.filter(r => r.id !== id));
      toast.success("মুছে ফেলা হয়েছে");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("area_representatives" as any).update({ is_active: !current }).eq("id", id);
    if (!error) setReps(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
  };

  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  const filteredReps = searchUser.trim()
    ? reps.filter(r => r.name.includes(searchUser) || r.phone.includes(searchUser) || r.division.includes(searchUser) || r.district.includes(searchUser))
    : reps;

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">প্রতিনিধি ম্যানেজমেন্ট ({reps.length})</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowPerformance(!showPerformance); if (!showPerformance) fetchPerformance(); }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
            <BarChart3 className="h-3.5 w-3.5" /> {showPerformance ? "লুকান" : "পারফরম্যান্স"}
          </button>
          <button onClick={fetchReps} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
            <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Performance Dashboard */}
      {showPerformance && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> প্রতিনিধি পারফরম্যান্স রিপোর্ট
            </span>
            {perfData.length > 0 && (
              <span className="flex items-center gap-1.5">
                <button onClick={downloadCSV} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-secondary">
                  <Download className="h-3 w-3" /> CSV
                </button>
                <button onClick={downloadPDF} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-secondary">
                  <FileText className="h-3 w-3" /> PDF
                </button>
              </span>
            )}
          </h4>
          {perfLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">লোড হচ্ছে...</p>
          ) : perfData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">কোনো পারফরম্যান্স ডেটা নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3">প্রতিনিধি</th>
                    <th className="pb-2 pr-3 text-center">হ্যান্ডেল</th>
                    <th className="pb-2 pr-3 text-center">সমাধান</th>
                    <th className="pb-2 pr-3 text-center">সমাধান হার</th>
                    <th className="pb-2 pr-3 text-center">গড় রেসপন্স</th>
                    <th className="pb-2 text-center">গড় সমাধান</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.map(p => (
                    <tr key={p.user_id} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{p.name}</td>
                      <td className="py-2.5 pr-3 text-center font-semibold text-primary">{p.handled}</td>
                      <td className="py-2.5 pr-3 text-center font-semibold text-green-600">{p.resolved}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${
                          p.resolutionRate >= 80 ? "bg-green-100 text-green-800" :
                          p.resolutionRate >= 50 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>{p.resolutionRate}%</span>
                      </td>
                      <td className="py-2.5 pr-3 text-center flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-primary" /> {formatDuration(p.avgResponseMs)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" /> {formatDuration(p.avgResolveMs)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Leaderboard */}
      <div className="mb-4">
        <RepLeaderboard />
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-primary" /> নতুন প্রতিনিধি যোগ করুন
        </p>

        {/* User selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">প্রতিনিধি ইউজার</label>
            <select value={selUserId} onChange={e => {
              setSelUserId(e.target.value);
              const u = users.find(u => u.user_id === e.target.value);
              if (u) { setSelName(u.display_name || ""); setSelPhone(u.phone || ""); }
            }} className={selectClass}>
              <option value="">ইউজার সিলেক্ট করুন</option>
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.display_name || "নাম নেই"} ({u.phone || "ফোন নেই"})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">* ইউজারকে আগে "representative" রোল দিন</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={selName} onChange={e => setSelName(e.target.value)} placeholder="নাম" />
            <Input value={selPhone} onChange={e => setSelPhone(e.target.value)} placeholder="ফোন নম্বর" />
          </div>
        </div>

        {/* Area selection */}
        <div className="grid grid-cols-3 gap-2">
          <select value={selDivision} onChange={e => { setSelDivision(e.target.value); setSelDistrict(""); setSelThana(""); }} className={selectClass}>
            <option value="">বিভাগ</option>
            {divisions.map(d => <option key={d.name} value={d.nameBn}>{d.nameBn}</option>)}
          </select>
          <select value={selDistrict} onChange={e => { setSelDistrict(e.target.value); setSelThana(""); }} disabled={!selDivision} className={selectClass}>
            <option value="">জেলা</option>
            {divisionObj?.districts.map(d => <option key={d.name} value={d.nameBn}>{d.nameBn}</option>)}
          </select>
          <select value={selThana} onChange={e => setSelThana(e.target.value)} disabled={!selDistrict || !districtObj?.thanas?.length} className={selectClass}>
            <option value="">থানা (ঐচ্ছিক)</option>
            {districtObj?.thanas?.map(th => <option key={th} value={th}>{th}</option>)}
          </select>
        </div>

        {/* Commission override */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">কমিশন ওভাররাইড (%):</label>
          <input type="number" step="0.5" min="0" max="100" value={selCommission} onChange={e => setSelCommission(e.target.value)}
            placeholder="ডিফল্ট সার্ভিস কমিশন ব্যবহার হবে"
            className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
          <span className="text-[10px] text-muted-foreground">ফাঁকা রাখলে সার্ভিসের কমিশন % ব্যবহার হবে</span>
        </div>

        <button onClick={handleAdd} disabled={adding} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {adding ? "যোগ হচ্ছে..." : "প্রতিনিধি যোগ করুন"}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="নাম, ফোন, বিভাগ বা জেলা দিয়ে খুঁজুন..." className="pl-9" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredReps.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো প্রতিনিধি নেই</p>
        ) : filteredReps.map(r => (
          <div key={r.id} className={`rounded-xl border bg-card p-3 flex items-center gap-3 ${r.is_active ? "border-border" : "border-destructive/30 opacity-60"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {r.division}, {r.district}{r.thana ? `, ${r.thana}` : " (পুরো জেলা)"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleActive(r.id, r.is_active)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium ${r.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {r.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
              </button>
              <button onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRepresentatives;
