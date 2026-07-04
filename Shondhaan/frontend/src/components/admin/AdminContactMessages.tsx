import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Mail, Phone, User, MessageSquare, Clock } from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">যোগাযোগ মেসেজ ({messages.length})</h3>
        <button onClick={fetch} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো মেসেজ নেই</p>
        ) : messages.map(m => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {m.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {m.email}</p>
                {m.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {m.phone}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(m.created_at).toLocaleDateString("bn-BD")}</span>
            </div>
            <p className="text-xs text-foreground flex items-start gap-1.5 bg-secondary/50 rounded-lg p-2">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {m.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminContactMessages;
