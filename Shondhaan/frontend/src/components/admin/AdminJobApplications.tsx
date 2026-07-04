import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, User, Phone, Mail, MapPin, Briefcase, Clock, FileImage } from "lucide-react";

interface JobApplication {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  service_category: string;
  experience_years: number | null;
  nid_front_url: string;
  nid_back_url: string;
  status: string;
  created_at: string;
}

const statusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "reviewed", label: "পর্যালোচিত", className: "bg-blue-100 text-blue-800" },
  { value: "approved", label: "গৃহীত", className: "bg-green-100 text-green-800" },
  { value: "rejected", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

const AdminJobApplications = () => {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("job_applications").select("*").order("created_at", { ascending: false });
    if (data) setApps(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (!error) setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setUpdatingId(null);
  };

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">চাকরির আবেদন ({apps.length})</h3>
        <button onClick={fetch} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {statusOptions.map(s => {
          const count = apps.filter(a => a.status === s.value).length;
          return (
            <button key={s.value} onClick={() => setFilter(filter === s.value ? "all" : s.value)}
              className={`rounded-xl border p-2.5 text-left transition-all ${filter === s.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}>
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="mb-3 text-xs text-primary hover:underline">← সব দেখুন</button>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো আবেদন নেই</p>
        ) : filtered.map(a => {
          const s = statusOptions.find(o => o.value === a.status) || statusOptions[0];
          return (
            <div key={a.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {a.full_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {a.phone}</p>
                  {a.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {a.email}</p>}
                </div>
                <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)} disabled={updatingId === a.id}
                  className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {a.service_category}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> অভিজ্ঞতা: {a.experience_years || 0} বছর</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {a.address}</span>
              </div>
              <div className="flex gap-2">
                <a href={a.nid_front_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <FileImage className="h-3 w-3" /> NID সামনে
                </a>
                <a href={a.nid_back_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <FileImage className="h-3 w-3" /> NID পেছনে
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground/60">{new Date(a.created_at).toLocaleDateString("bn-BD")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminJobApplications;
