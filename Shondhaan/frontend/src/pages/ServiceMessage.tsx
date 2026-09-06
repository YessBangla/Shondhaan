import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  Search,
  Loader2,
  Send,
  X,
  Headphones,
  Clock,
  Filter,
  Inbox,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceConversations } from "@/hooks/useServiceInbox";
import {
  listServiceChatMessages,
  sendServiceChatMessage,
  type ServiceChatMessage,
  type ServiceChatPayload,
} from "@/lib/serviceChatApi";
import { emitServiceChatWithAck, getServiceChatSocket } from "@/lib/serviceChatSocket";
import { getServiceChatToken, getServiceChatVisitorId } from "@/lib/serviceChatApi";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const statusConfig = {
  confirmed: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  completed: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  pending: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  cancelled: {
    dot: "bg-rose-500",
    bg: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-500/20",
  },
  in_progress: {
    dot: "bg-blue-500 animate-pulse",
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-500/20",
  },
} as const;

const statusLabel = (status: string, bn: boolean): string => {
  const map: Record<string, string> = {
    pending: bn ? "বাকি" : "Pending",
    confirmed: bn ? "নিশ্চিত" : "Confirmed",
    in_progress: bn ? "চলছে" : "In Progress",
    completed: bn ? "সম্পন্ন" : "Completed",
    cancelled: bn ? "বাতিল" : "Cancelled",
  };
  return map[status] || status;
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

const avatarGradients = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#06b6d4", to: "#0ea5e9" },
  { from: "#10b981", to: "#14b8a6" },
  { from: "#f59e0b", to: "#f97316" },
  { from: "#ec4899", to: "#f43f5e" },
  { from: "#8b5cf6", to: "#a855f7" },
  { from: "#3b82f6", to: "#6366f1" },
];

const getAvatarStyle = (id: string) => {
  const idx = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarGradients.length;
  const g = avatarGradients[idx];
  return { background: `linear-gradient(135deg, ${g.from}, ${g.to})` };
};

type ServiceChatAck = {
  ok: boolean;
  message?: string;
  data?: ServiceChatPayload;
};

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */

const ServiceMessage = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<{
    conversationId: string;
    service_title: string;
    provider_name?: string;
    booking_status?: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ServiceChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data, isLoading } = useServiceConversations();
  const conversations = Array.isArray(data) ? data : [];

  const filtered = conversations.filter((c) => {
    const matchesSearch = `${c.service_title} ${c.provider_name} ${c.package_name}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter = !filterStatus || c.booking_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const uniqueStatuses = [...new Set(conversations.map((c) => c.booking_status))];

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  // Fetch messages
  useEffect(() => {
    if (!chatOpen || !activeConv?.conversationId) return;
    let cancelled = false;
    setChatLoading(true);
    listServiceChatMessages(activeConv.conversationId)
      .then((result) => {
        if (!cancelled) setChatMessages(result.messages || []);
      })
      .catch(() => {
        if (!cancelled) setChatMessages([]);
      })
      .finally(() => !cancelled && setChatLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chatOpen, activeConv?.conversationId]);

  useEffect(() => {
    if (!chatOpen || !activeConv?.conversationId) return;

    const socket = getServiceChatSocket();
    const joinConversation = () => {
      socket.emit("service-chat:join-conversation", {
        conversationId: activeConv.conversationId,
        visitorId: getServiceChatVisitorId(),
        token: getServiceChatToken(),
      });
    };
    const onMessage = (payload: ServiceChatPayload) => {
      if (payload.conversation.id !== activeConv.conversationId) return;
      setChatMessages((previous) => {
        const next = previous.some((message) => message.id === payload.message.id)
          ? previous
          : [...previous, payload.message];
        const automaticReply = payload.automatic_reply;
        if (!automaticReply || next.some((message) => message.id === automaticReply.id)) return next;
        return [...next, automaticReply];
      });
    };

    socket.connect();
    socket.on("connect", joinConversation);
    socket.on("service-chat:message:new", onMessage);
    if (socket.connected) joinConversation();

    return () => {
      socket.off("connect", joinConversation);
      socket.off("service-chat:message:new", onMessage);
    };
  }, [chatOpen, activeConv?.conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 112) + "px";
  }, [chatDraft]);

  const openChat = useCallback(
    (conv: (typeof conversations)[number]) => {
      setActiveConv({
        conversationId: conv.booking_id,
        service_title: conv.service_title,
        provider_name: conv.provider_name,
        booking_status: conv.booking_status,
      });
      setChatOpen(true);
    },
    []
  );

  const closeChat = useCallback(() => {
    setChatOpen(false);
    // Small delay so the exit animation plays before clearing
    setTimeout(() => setActiveConv(null), 300);
  }, []);

  const handleSend = async () => {
    if (!activeConv?.conversationId || !chatDraft.trim() || chatSending) return;
    const text = chatDraft.trim();
    setChatDraft("");
    setChatSending(true);

    try {
      const ack = await emitServiceChatWithAck<Record<string, unknown>, ServiceChatAck>(
        "service-chat:message:send",
        { conversationId: activeConv.conversationId, message: text }
      ).catch(() => null);
      const payload = ack?.ok && ack.data
        ? ack.data
        : await sendServiceChatMessage(activeConv.conversationId, text);
      setChatMessages((prev) => {
        const nextMessages = prev.some((m) => m.id === payload.message.id)
          ? prev
          : [...prev, payload.message];
        const automaticReply = payload.automatic_reply;
        if (!automaticReply || nextMessages.some((m) => m.id === automaticReply.id)) {
          return nextMessages;
        }
        return [...nextMessages, automaticReply];
      });
    } catch (err) {
      setChatDraft(text);
      console.error("Send failed:", err);
    } finally {
      setChatSending(false);
    }
  };

  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);

  /* ─── Login guard ─── */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center">
          <MessageCircle className="h-9 w-9 text-blue-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          {bn ? "আপনার বার্তা দেখতে লগইন করুন" : "Please login to view your messages"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-userprimary shadow-lg shadow-blue-500/25">
              <MessageCircle className="h-5 w-5" />
            </div>
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {bn ? "সার্ভিস ইনবক্স" : "Service Inbox"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {bn
                ? `${conversations.length}টি কথোপকথন • স্টাফদের সাথে চ্যাট করুন`
                : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""} • Chat with support staff`}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search + Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder={bn ? "সার্ভিস বা প্রোভাইডার খুঁজুন..." : "Search service or provider..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {uniqueStatuses.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            <button
              onClick={() => setFilterStatus(null)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                !filterStatus
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >

              {bn ? "সব" : "All"}
            </button>
            {uniqueStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterStatus === s
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                )}
              >
                {statusLabel(s, bn)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Content ─── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-userprimary dark:bg-blue-500/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {bn ? "আপনার কথোপকথন লোড হচ্ছে..." : "Loading your conversations..."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-100/50 dark:bg-blue-500/5 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-100/50 dark:bg-indigo-500/5 blur-2xl" />

          <div className="relative flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="relative mb-5">
              <div className="h-20 w-20 rounded-3xl bg-userprimary dark:from-slate-800 dark:to-slate-850 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/50">
                {search || filterStatus ? (
                  <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                ) : (
                  <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-userprimary flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {search || filterStatus
                ? bn
                  ? "কোনো ফলাফল পাওয়া যায়নি"
                  : "No results found"
                : bn
                ? "আপনার ইনবক্স খালি"
                : "Your inbox is empty"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              {search || filterStatus
                ? bn
                  ? "আপনার অনুসন্ধান বা ফিল্টার পরিবর্তন করুন"
                  : "Try adjusting your search or filter"
                : bn
                ? "একটি সেবা বুক করলে এখানে কথোপকথন দেখা যাবে"
                : "Conversations will appear here once you book a service"}
            </p>

            {(search || filterStatus) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterStatus(null);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                {bn ? "ফিল্টার মুছুন" : "Clear filters"}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((conv, index) => {
            const sc = statusConfig[conv.booking_status as keyof typeof statusConfig] || statusConfig.pending;
            return (
              <motion.div
                key={conv.booking_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openChat(conv)}
                className={cn(
                  "relative flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer group",
                  "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5",
                  "active:translate-y-0 active:shadow-sm",
                  conv.unread_count > 0
                    ? "border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                {/* Unread glow */}
                {conv.unread_count > 0 && (
                  <div className="absolute inset-0 rounded-2xl bg-userprimaryshade border-2 border-green-800 to-transparent pointer-events-none" />
                )}

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={getAvatarStyle(conv.booking_id)}
                  >
                    {getInitials(conv.service_title)}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900",
                      sc.dot
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm sm:text-[15px] truncate transition-colors",
                          conv.unread_count > 0
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        )}
                      >
                        {conv.service_title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.unread_count > 0 && (
                        <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm shadow-blue-600/30">
                          {conv.unread_count}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" />
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-xs sm:text-sm truncate mt-0.5",
                      conv.unread_count > 0
                        ? "text-slate-700 dark:text-slate-300 font-medium"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {conv.last_message || (bn ? "নতুন কথোপকথন শুরু করুন" : "Start a new conversation")}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                        sc.bg,
                        sc.border
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot.replace(" animate-pulse", ""))} />
                      {statusLabel(conv.booking_status, bn)}
                    </span>

                    {conv.provider_name && (
                      <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[160px]">
                        {conv.provider_name}
                      </span>
                    )}

                    {conv.package_name && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px]">
                          {conv.package_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-0.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Chat Modal ─── */}
      <AnimatePresence>
        {activeConv && chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={closeChat}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[100dvh] sm:max-h-[85vh]"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-userprimary shadow-md shadow-blue-500/20">
                      <Headphones className="h-4.5 w-4.5" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeConv.service_title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {activeConv.booking_status && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                            (statusConfig[activeConv.booking_status as keyof typeof statusConfig] || statusConfig.pending).bg,
                            (statusConfig[activeConv.booking_status as keyof typeof statusConfig] || statusConfig.pending).border
                          )}
                        >
                          {statusLabel(activeConv.booking_status, bn)}
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {bn ? "স্টাফ সাপোর্ট" : "Staff Support"}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeChat}
                  className="shrink-0 rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-slate-50/80 dark:bg-slate-950/60 px-4 py-4 space-y-3 scroll-smooth">
                {chatLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <p className="text-xs text-slate-400">{bn ? "লোড হচ্ছে..." : "Loading..."}</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {bn ? "এখনো কোনো মেসেজ নেই" : "No messages yet"}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {bn ? "নিচে একটি মেসেজ পাঠান" : "Send a message below to start"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Date separator if needed */}
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {chatMessages.length > 0 &&
                          new Date(chatMessages[0].created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    </div>

                    {chatMessages.map((message, idx) => {
                      const isStaff = message.sender_role === "staff";
                      const isLast = idx === chatMessages.length - 1;
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2, delay: isLast ? 0.05 : 0 }}
                          className={cn("flex", isStaff ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                              isStaff
                                ? "bg-userprimary text-white rounded-br-md shadow-md shadow-blue-600/15"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-md shadow-sm"
                            )}
                          >
                            <div
                              className={cn(
                                "mb-1 text-[10px] font-semibold",
                                isStaff ? "text-white" : "text-slate-400 dark:text-slate-500"
                              )}
                            >
                              {isStaff ? (bn ? "স্টাফ" : "Staff") : (bn ? "আপনি" : "You")}
                              <span className="ml-1.5 font-normal opacity-70">
                                {new Date(message.created_at).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{message.body}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                )}
                <div ref={endRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={bn ? "বার্তা লিখুন..." : "Type a message..."}
                      className="w-full max-h-28 min-h-[44px] resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!chatDraft.trim() || chatSending}
                    className={cn(
                      "flex h-[44px] w-[44px] items-center justify-center rounded-xl transition-all shrink-0 active:scale-95",
                      chatDraft.trim() && !chatSending
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:from-blue-600 hover:to-blue-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    )}
                  >
                    {chatSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5 text-center">
                  {bn ? "Enter পাঠাতে • Shift+Enter নতুন লাইনে" : "Enter to send • Shift+Enter for new line"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceMessage;