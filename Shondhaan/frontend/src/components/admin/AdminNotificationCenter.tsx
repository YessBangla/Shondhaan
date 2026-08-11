import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Send, Users, User, RefreshCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const ROLES = [
  { value: "all", label: "সব ইউজার" },
  { value: "user", label: "সাধারণ ইউজার" },
  { value: "provider", label: "প্রোভাইডার" },
  { value: "representative", label: "প্রতিনিধি" },
  { value: "call_center", label: "কল সেন্টার" },
  { value: "moderator", label: "মডারেটর" },
];

const TYPES = [
  { value: "info", label: "তথ্য", color: "bg-blue-100 text-blue-800" },
  { value: "success", label: "সফল", color: "bg-green-100 text-green-800" },
  { value: "warning", label: "সতর্কতা", color: "bg-yellow-100 text-yellow-800" },
  { value: "promo", label: "প্রোমো", color: "bg-purple-100 text-purple-800" },
];

const AdminNotificationCenter = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [targetRole, setTargetRole] = useState("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUser, setSearchUser] = useState("");

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setRecentNotifs(data);
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, phone");
    if (data) setUsers(data);
  }, []);

  useEffect(() => { fetchRecent(); fetchUsers(); }, [fetchRecent, fetchUsers]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("শিরোনাম ও মেসেজ লিখুন");
      return;
    }

    setSending(true);

    try {
      let targetUserIds: string[] = [];

      if (targetUserId) {
        targetUserIds = [targetUserId];
      } else if (targetRole === "all") {
        const { data } = await supabase.from("profiles").select("user_id");
        targetUserIds = data?.map(p => p.user_id) || [];
      } else {
        const { data } = await supabase.from("user_roles").select("user_id").eq("role", targetRole as any);
        targetUserIds = data?.map(r => r.user_id) || [];
      }

      if (targetUserIds.length === 0) {
        toast.error("কোনো ইউজার পাওয়া যায়নি");
        setSending(false);
        return;
      }

      const notifications = targetUserIds.map(uid => ({
        user_id: uid,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
      }

      toast.success(`${targetUserIds.length} জন ইউজারকে নোটিফিকেশন পাঠানো হয়েছে`);
      setTitle("");
      setMessage("");
      setTargetUserId("");
      fetchRecent();
    } catch {
      toast.error("নোটিফিকেশন পাঠাতে সমস্যা হয়েছে");
    }

    setSending(false);
  };

  const filteredUsers = searchUser.trim()
    ? users.filter(u => u.display_name?.includes(searchUser) || u.phone?.includes(searchUser))
    : [];

  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> নোটিফিকেশন সেন্টার
        </h3>
        <button onClick={fetchRecent} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* Send form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Send className="h-4 w-4 text-primary" /> নতুন নোটিফিকেশন পাঠান
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">প্রাপক রোল</label>
            <select value={targetRole} onChange={e => { setTargetRole(e.target.value); setTargetUserId(""); }} className={selectClass}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">নোটিফিকেশন ধরন</label>
            <select value={notifType} onChange={e => setNotifType(e.target.value)} className={selectClass}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Individual user selection */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">অথবা নির্দিষ্ট ইউজারকে পাঠান (ঐচ্ছিক)</label>
          <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="নাম বা ফোন দিয়ে খুঁজুন..." className="text-sm" />
          {filteredUsers.length > 0 && searchUser.trim() && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
              {filteredUsers.slice(0, 10).map(u => (
                <button key={u.user_id} onClick={() => { setTargetUserId(u.user_id); setSearchUser(u.display_name || u.phone || ""); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary ${targetUserId === u.user_id ? "bg-primary/10 font-medium" : ""}`}>
                  {u.display_name || "নাম নেই"} — {u.phone || "ফোন নেই"}
                </button>
              ))}
            </div>
          )}
          {targetUserId && (
            <p className="text-[10px] text-primary mt-1">✓ নির্দিষ্ট ইউজার সিলেক্ট করা হয়েছে</p>
          )}
        </div>

        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="শিরোনাম" className="text-sm" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="মেসেজ লিখুন..." rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring resize-none" />

        <button onClick={handleSend} disabled={sending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
          {sending ? "পাঠানো হচ্ছে..." : "নোটিফিকেশন পাঠান"}
        </button>
      </div>

      {/* Recent notifications */}
      <h4 className="text-sm font-semibold text-foreground mb-2">সাম্প্রতিক নোটিফিকেশন</h4>
      {loading ? (
        <p className="text-center py-8 text-muted-foreground text-xs">লোড হচ্ছে...</p>
      ) : recentNotifs.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-xs">কোনো নোটিফিকেশন নেই</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentNotifs.map(n => {
            const typeInfo = TYPES.find(t => t.value === n.type) || TYPES[0];
            return (
              <div key={n.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${n.is_read ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {n.is_read ? "পড়া হয়েছে" : "অপঠিত"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(n.created_at).toLocaleString("bn-BD")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;
