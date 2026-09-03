import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Mail, Phone, User, MessageSquare, Clock, Loader2 } from "lucide-react";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");

const getAuthHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

// Reusing the exact same safe array extraction logic from CallCenterPanel
const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const data = payload?.data ?? payload?.items ?? payload?.rows ?? payload?.result ?? payload?.messages;
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.rows)) return data.rows as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  if (data && typeof data === "object") {
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key] as T[];
    }
  }
  return [];
};

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact-messages`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to fetch contact messages");
      }

      const data = extractArray<ContactMessage>(payload);
      setMessages(data);
    } catch (error: any) {
      console.error("AdminContactMessages fetch error:", error);
      toast.error(error?.message || "মেসেজ লোড ব্যর্থ হয়েছে");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-4xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">যোগাযোগ মেসেজ ({messages.length})</h3>
          <button
            onClick={fetchMessages}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="রিফ্রেশ"
          >
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Messages List */}
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">কোনো মেসেজ নেই</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-600 truncate">{m.email}</p>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-600">{m.phone}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(m.created_at).toLocaleString("bn-BD")}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                    {m.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminContactMessages;