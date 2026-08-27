import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw,
  Gift, Users, Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

export default function ReferralCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    code: "",
    reward_currency: "CASH",
    reward_amount: "",
    referred_reward_type: "CASH",
    referred_reward_amount: "",
    max_uses: "",
    min_order_amount: "",
    expires_at: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`${API}/codes?${params}`, { headers: authHeaders() });
      const json = await res.json();
      setCodes(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch {
      toast.error("Failed to load referral codes");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    if (!form.user_id || !form.code.trim()) {
      toast.error("User ID and Code are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/codes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          reward_amount: Number(form.reward_amount) || 0,
          referred_reward_amount: Number(form.referred_reward_amount) || 0,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          min_order_amount: form.min_order_amount
            ? Number(form.min_order_amount)
            : null,
          expires_at: form.expires_at || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Referral code created!");
      setDialogOpen(false);
      setForm({
        user_id: "",
        code: "",
        reward_currency: "CASH",
        reward_amount: "",
        referred_reward_type: "CASH",
        referred_reward_amount: "",
        max_uses: "",
        min_order_amount: "",
        expires_at: "",
      });
      fetchCodes();
    } catch (err: any) {
      toast.error(err.message || "Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`${API}/codes/${id}/toggle`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success("Toggled");
      fetchCodes();
    } catch {
      toast.error("Failed to toggle");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete code "${code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/codes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      fetchCodes();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">রেফারেল কোড সমূহ</h2>
          <p className="text-xs text-muted-foreground">কোড তৈরি, পরিচালনা ও নিয়ন্ত্রণ করুন</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> নতুন কোড
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>নতুন রেফারেল কোড তৈরি</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">ইউজার ID *</Label>
                <Input
                  placeholder="রেফারারের ইউজার ID"
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">কোড *</Label>
                <Input
                  placeholder="যেমন: SALEEM50"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  className="uppercase tracking-wider font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">রেফারার পুরস্কার ধরন</Label>
                  <Select
                    value={form.reward_currency}
                    onValueChange={(v) => setForm({ ...form, reward_currency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">ক্যাশ</SelectItem>
                      <SelectItem value="COIN">কয়েন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">রেফারার পরিমাণ</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.reward_amount}
                    onChange={(e) => setForm({ ...form, reward_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">রেফার্ড পুরস্কার ধরন</Label>
                  <Select
                    value={form.referred_reward_type}
                    onValueChange={(v) => setForm({ ...form, referred_reward_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">ক্যাশ</SelectItem>
                      <SelectItem value="COIN">কয়েন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">রেফার্ড পরিমাণ</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.referred_reward_amount}
                    onChange={(e) => setForm({ ...form, referred_reward_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">সর্বোচ্চ ব্যবহার</Label>
                  <Input
                    type="number"
                    placeholder="অসীমিত"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ন্যূনতম অর্ডার</Label>
                  <Input
                    type="number"
                    placeholder="নেই"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">মেয়াদ উত্তীর্ণ</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "তৈরি হচ্ছে..." : "কোড তৈরি করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="কোড বা নাম খুঁজুন..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="active">সক্রিয়</SelectItem>
            <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
            <SelectItem value="expired">মেয়াদোত্তীর্ণ</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchCodes}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">কোড</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">রেফারার</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">পুরস্কার</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">ব্যবহার</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">অবস্থা</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">মেয়াদ</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    কোনো কোড নেই
                  </td>
                </tr>
              ) : (
                codes.map((c) => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="font-mono font-bold text-primary hover:underline text-xs"
                          title="কপি করুন"
                        >
                          {c.code}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium">{c.referrer_name || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">ID: {c.user_id}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11px]">
                          <span className="font-medium">রেফারার:</span>{" "}
                          ৳{Number(c.reward_amount || 0)}{" "}
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                            {c.reward_currency}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          <span>রেফার্ড:</span>{" "}
                          ৳{Number(c.referred_reward_amount || 0)}
                        </div>
                      </td>
                      <td className="text-center px-3 py-2.5 text-xs">
                        <span className="font-semibold">{c.used_count || 0}</span>
                        <span className="text-muted-foreground">
                          /{c.max_uses || "∞"}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5">
                        <Badge
                          variant={c.is_active ? "default" : "secondary"}
                          className={`text-[10px] ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-red-100 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {isExpired ? "মেয়াদোত্তীর্ণ" : c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {c.expires_at
                          ? new Date(c.expires_at).toLocaleDateString("bn-BD")
                          : "কোনো সময়সীমা নেই"}
                      </td>
                      <td className="text-right px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(c.id)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            title={c.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                          >
                            {c.is_active ? (
                              <ToggleRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="মুছুন"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            আগে
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            পরে
          </Button>
        </div>
      )}
    </div>
  );
}
