import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";

const MART_API_BASE_URL = (
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

const emptyForm = { id: null, label: "", min_purchase_amount: "", reward_type: "FIXED", reward_value: "", is_active: true };

const authHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const MartRewardsPanel = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${MART_API_BASE_URL}/api/mart-reward-rules`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setRules(data.data);
      else toast.error(data.message || "Failed to load reward rules");
    } catch {
      toast.error("Failed to load reward rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const openCreate = () => { setForm(emptyForm); setFormOpen(true); };
  const openEdit = (rule) => {
    setForm({
      id: rule.id,
      label: rule.label || "",
      min_purchase_amount: rule.min_purchase_amount,
      reward_type: "FIXED",
      reward_value: rule.reward_value,
      is_active: Boolean(rule.is_active),
    });
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = form.id != null;
    const url = `${MART_API_BASE_URL}/api/mart-reward-rules${isEdit ? `/${form.id}` : ""}`;
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? "Reward rule updated" : "Reward rule created");
        setFormOpen(false);
        fetchRules();
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule) => {
    try {
      const res = await fetch(`${MART_API_BASE_URL}/api/mart-reward-rules/${rule.id}/toggle`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, is_active: data.is_active ? 1 : 0 } : r)));
      }
    } catch {
      toast.error("Toggle failed");
    }
  };

  const deleteRule = async (rule) => {
    if (!confirm(`Delete reward rule "${rule.label || rule.id}"?`)) return;
    try {
      const res = await fetch(`${MART_API_BASE_URL}/api/mart-reward-rules/${rule.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Reward rule deleted");
        setRules((rs) => rs.filter((r) => r.id !== rule.id));
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Mart Reward Rules</h2>
          <p className="text-xs text-muted-foreground">Set minimum purchase amounts and the coins customers earn.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left px-3 py-2">Label</th>
              <th className="text-left px-3 py-2">Min Purchase (৳)</th>
              <th className="text-left px-3 py-2">Reward</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No reward rules yet.</td></tr>
            ) : rules.map((rule) => (
              <tr key={rule.id} className="border-t border-border">
                <td className="px-3 py-2">{rule.label || "—"}</td>
                <td className="px-3 py-2">৳{Number(rule.min_purchase_amount).toLocaleString()}+</td>
                <td className="px-3 py-2">
                  {rule.reward_value} coins
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleActive(rule)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      rule.is_active ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Power className="h-3 w-3" /> {rule.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(rule)} className="p-1.5 rounded-md hover:bg-secondary mr-1">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteRule(rule)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setFormOpen(false)}>
          <form
            onSubmit={submitForm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-5 space-y-3 shadow-2xl"
          >
            <h3 className="font-bold text-sm">{form.id ? "Edit Reward Rule" : "New Reward Rule"}</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Standard Mart Reward"
                className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Minimum Purchase Amount (৳)</label>
              <input
                type="number" min="0" step="0.01" required
                value={form.min_purchase_amount}
                onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
                className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                  <label className="text-xs font-medium text-muted-foreground">Reward</label>
                  <div className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm bg-background">Fixed coins</div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Coins
                </label>
                <input
                  type="number" min="0" step="0.01" required
                  value={form.reward_value}
                  onChange={(e) => setForm({ ...form, reward_value: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active immediately
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-2 text-sm rounded-lg hover:bg-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-semibold disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MartRewardsPanel;
