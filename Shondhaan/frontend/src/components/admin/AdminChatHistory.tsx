import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, MessageCircle, ChevronDown, ChevronUp, Bot, User as UserIcon, 
  Phone, Mail, Clock, PhoneCall, FileText, Filter, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_interest: string | null;
  is_active: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

type FilterType = "all" | "with-summary" | "with-call" | "active";

const isSummaryMessage = (content: string) =>
  content.includes("📋 কলের সারসংক্ষেপ") || content.includes("📋 Call Summary");

const isCallTranscript = (content: string) =>
  content.includes("🔴") || content.includes("কল শুরু") || content.includes("Call started");

const isAutoServiceRequest = (content: string) =>
  content.includes("✅ সার্ভিস রিকোয়েস্ট") || content.includes("✅ Service request");

const AdminChatHistory = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setConversations((data as Conversation[]) || []);
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    if (messages[convId]) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(prev => ({ ...prev, [convId]: (data as ChatMessage[]) || [] }));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadMessages(id);
    }
  };

  const getConversationMeta = (convId: string) => {
    const msgs = messages[convId];
    if (!msgs) return { hasSummary: false, hasCall: false, hasServiceReq: false, summary: null as string | null, messageCount: 0 };
    
    const summary = msgs.find(m => isSummaryMessage(m.content));
    const hasCall = msgs.some(m => isCallTranscript(m.content));
    const hasServiceReq = msgs.some(m => isAutoServiceRequest(m.content));
    
    return {
      hasSummary: !!summary,
      hasCall,
      hasServiceReq,
      summary: summary?.content || null,
      messageCount: msgs.length,
    };
  };

  const filtered = useMemo(() => {
    let list = conversations.filter(c =>
      !search ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone.includes(search) ||
      (c.customer_email || "").toLowerCase().includes(search.toLowerCase())
    );

    if (filter === "active") {
      list = list.filter(c => c.is_active);
    }
    // For summary/call filters, we need loaded messages - show all if not loaded
    if (filter === "with-summary") {
      list = list.filter(c => {
        const msgs = messages[c.id];
        if (!msgs) return true; // show until loaded
        return msgs.some(m => isSummaryMessage(m.content));
      });
    }
    if (filter === "with-call") {
      list = list.filter(c => {
        const msgs = messages[c.id];
        if (!msgs) return true;
        return msgs.some(m => isCallTranscript(m.content));
      });
    }

    return list;
  }, [conversations, search, filter, messages]);

  const renderMessage = (msg: ChatMessage) => {
    const isSummary = isSummaryMessage(msg.content);
    const isServiceReq = isAutoServiceRequest(msg.content);

    if (isSummary) {
      return (
        <div key={msg.id} className="rounded-lg border-2 border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-semibold">কল সারসংক্ষেপ</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {format(new Date(msg.created_at), "HH:mm")}
            </span>
          </div>
          <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {msg.content.replace(/📋 কলের সারসংক্ষেপ:?\s*\n?/g, "").replace(/📋 Call Summary:?\s*\n?/g, "").trim()}
          </div>
        </div>
      );
    }

    if (isServiceReq) {
      return (
        <div key={msg.id} className="rounded-lg border-2 border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs font-semibold">অটো সার্ভিস রিকোয়েস্ট</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {format(new Date(msg.created_at), "HH:mm")}
            </span>
          </div>
          <div className="text-xs leading-relaxed text-foreground">
            {msg.content}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
        {msg.role === "assistant" && (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
            <Bot className="h-3 w-3 text-primary" />
          </div>
        )}
        <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
          msg.role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-background text-foreground rounded-bl-sm border border-border"
        }`}>
          {msg.content}
        </div>
        {msg.role === "user" && (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
            <UserIcon className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">চ্যাট হিস্ট্রি ({conversations.length})</h3>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব চ্যাট</SelectItem>
              <SelectItem value="active">সক্রিয়</SelectItem>
              <SelectItem value="with-summary">কল সামারিসহ</SelectItem>
              <SelectItem value="with-call">ভয়েস কলসহ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">কোনো চ্যাট পাওয়া যায়নি</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv) => {
            const meta = getConversationMeta(conv.id);
            const isExpanded = expandedId === conv.id;
            
            return (
              <div key={conv.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(conv.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground truncate">{conv.customer_name}</p>
                        {conv.is_active && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {conv.customer_phone}
                        </span>
                        {conv.customer_email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {conv.customer_email}
                          </span>
                        )}
                      </div>
                      {/* Tags row */}
                      {(meta.hasSummary || meta.hasCall || meta.hasServiceReq) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {meta.hasCall && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-600 dark:text-blue-400 gap-0.5">
                              <PhoneCall className="h-2.5 w-2.5" />
                              কল
                            </Badge>
                          )}
                          {meta.hasSummary && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400 gap-0.5">
                              <FileText className="h-2.5 w-2.5" />
                              সামারি
                            </Badge>
                          )}
                          {meta.hasServiceReq && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-0.5">
                              <ClipboardList className="h-2.5 w-2.5" />
                              রিকোয়েস্ট
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {conv.service_interest && (
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {conv.service_interest}
                        </span>
                      )}
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(new Date(conv.created_at), "dd/MM/yy HH:mm")}
                      </p>
                      {meta.messageCount > 0 && (
                        <p className="text-[10px] text-muted-foreground">{meta.messageCount} মেসেজ</p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Summary preview when collapsed */}
                {!isExpanded && meta.hasSummary && meta.summary && (
                  <div className="border-t border-border bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2">
                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                      <FileText className="h-3 w-3" />
                      সামারি:
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {meta.summary.replace(/📋 কলের সারসংক্ষেপ:?\s*\n?/g, "").replace(/📋 Call Summary:?\s*\n?/g, "").trim().substring(0, 150)}...
                    </p>
                  </div>
                )}

                {/* Messages */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-3 space-y-2 max-h-96 overflow-y-auto">
                    {!messages[conv.id] ? (
                      <p className="text-xs text-muted-foreground text-center py-4">মেসেজ লোড হচ্ছে...</p>
                    ) : messages[conv.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">কোনো মেসেজ নেই</p>
                    ) : (
                      messages[conv.id].map(renderMessage)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminChatHistory;
