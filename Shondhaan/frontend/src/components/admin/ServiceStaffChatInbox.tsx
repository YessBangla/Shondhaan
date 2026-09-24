import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  User,
  Search,
  X,
  ChevronLeft,
  Phone,
  Mail,
  Clock,
  Inbox,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  listServiceChatConversations,
  listServiceChatMessages,
  sendServiceChatMessage,
  type ServiceChatConversation,
  type ServiceChatMessage,
  type ServiceChatPayload,
} from "@/lib/serviceChatApi";
import { emitServiceChatWithAck, getServiceChatSocket } from "@/lib/serviceChatSocket";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { CENTRAL_API_BASE_URL, INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

type Ack = {
  ok: boolean;
  message?: string;
  data?: ServiceChatPayload;
};

/* ── Helpers ── */

const avatarGradients = [
  ["#6366f1", "#8b5cf6"],
  ["#06b6d4", "#0ea5e9"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#a855f7"],
  ["#3b82f6", "#6366f1"],
  ["#14b8a6", "#06b6d4"],
];

const getAvatarStyle = (id: string) => {
  const idx = String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarGradients.length;
  const [from, to] = avatarGradients[idx];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
};

const getInitial = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatMessageTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatMessageDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const shouldShowDateSeparator = (current: string, previous?: string) => {
  if (!previous) return true;
  return new Date(current).toDateString() !== new Date(previous).toDateString();
};

const resolveAvatarUrl = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const base = (CENTRAL_API_BASE_URL || INDIVIDUAL_API_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${url.startsWith("/") ? "" : "/"}${url}` : url;
};

const getConversationAvatar = (conversation?: ServiceChatConversation | null) =>
  resolveAvatarUrl(
    (conversation as ServiceChatConversation & {
      user_avatar?: string | null;
      user_profile_image?: string | null;
      profile_image?: string | null;
      avatar_url?: string | null;
    } | null)?.user_avatar ||
      (conversation as ServiceChatConversation & { user_profile_image?: string | null } | null)?.user_profile_image ||
      (conversation as ServiceChatConversation & { profile_image?: string | null } | null)?.profile_image ||
      (conversation as ServiceChatConversation & { avatar_url?: string | null } | null)?.avatar_url
  );

const TAGGED_MESSAGE_PATTERN = /^"([^"]+)"\s*\n([\s\S]*)$/;

const parseTaggedMessage = (body?: string | null) => {
  const text = body || "";
  const match = text.match(TAGGED_MESSAGE_PATTERN);
  if (!match) return { topic: "", text };
  return { topic: match[1], text: match[2] };
};

/* ── Component ── */

const ServiceStaffChatInbox = () => {
  const auth = getMySqlAuth();
  const [conversations, setConversations] = useState<ServiceChatConversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ServiceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || null;

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.user_name || "").toLowerCase().includes(q) ||
        (c.user_phone || "").includes(q) ||
        (c.user_email || "").toLowerCase().includes(q) ||
        (c.last_message || "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const sortedConversations = useMemo(
    () =>
      [...filteredConversations].sort((a, b) => {
        const ua = a.unread_count || 0;
        const ub = b.unread_count || 0;
        if (ua !== ub) return ub - ua;
        return (
          new Date(b.last_message_at || b.created_at).getTime() -
          new Date(a.last_message_at || a.created_at).getTime()
        );
      }),
    [filteredConversations]
  );

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [messages]
  );

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
    [conversations]
  );

  const loadConversations = async () => {
    setLoading(true);
    try {
      const rows = await listServiceChatConversations();
      setConversations(rows);
      if (!activeId) setActiveId(rows[0]?.id || "");
    } catch (error: any) {
      toast.error(error?.message || "Could not load service chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setThreadLoading(true);
    listServiceChatMessages(activeId)
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch((error: any) =>
        !cancelled && toast.error(error?.message || "Could not load messages")
      )
      .finally(() => !cancelled && setThreadLoading(false));

    const socket = getServiceChatSocket();
    const joinConversation = () => {
      socket.emit("service-chat:join-conversation", {
        conversationId: activeId,
        token: auth?.token,
      });
    };

    socket.connect();
    socket.on("connect", joinConversation);
    if (socket.connected) joinConversation();

    return () => {
      cancelled = true;
      socket.off("connect", joinConversation);
    };
  }, [activeId, auth?.token]);

  useEffect(() => {
    const socket = getServiceChatSocket();
    const joinStaff = () => {
      socket.emit("service-chat:join-staff", { token: auth?.token });
    };

    socket.connect();
    socket.on("connect", joinStaff);
    if (socket.connected) joinStaff();

    const onUpdate = (payload: ServiceChatPayload) => {
      setConversations((prev) => {
        const without = prev.filter((item) => item.id !== payload.conversation.id);
        return [payload.conversation, ...without];
      });
      if (!activeId) setActiveId(payload.conversation.id);
    };

    const onMessage = (payload: ServiceChatPayload) => {
      if (payload.conversation.id !== activeId) return;
      setMessages((prev) => {
        if (prev.some((message) => message.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    };

    socket.on("service-chat:conversation:updated", onUpdate);
    socket.on("service-chat:message:new", onMessage);
    return () => {
      socket.off("connect", joinStaff);
      socket.off("service-chat:conversation:updated", onUpdate);
      socket.off("service-chat:message:new", onMessage);
    };
  }, [activeId, auth?.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length, activeId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);

  const appendPayload = (payload?: ServiceChatPayload) => {
    if (!payload) return;
    setConversations((prev) => {
      const without = prev.filter((item) => item.id !== payload.conversation.id);
      return [payload.conversation, ...without];
    });
    setMessages((prev) => {
      if (prev.some((message) => message.id === payload.message.id)) return prev;
      return [...prev, payload.message];
    });
  };

  const openConversation = (id: string) => {
    setActiveId(id);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || !activeId || sending) return;

    setDraft("");
    setSending(true);

    try {
      const ack = await emitServiceChatWithAck<
        Record<string, unknown>,
        Ack
      >("service-chat:message:send", {
        conversationId: activeId,
        message,
        sender_name: auth?.user?.name || "Support",
      }).catch(() => null);

      if (ack?.ok) appendPayload(ack.data);
      else appendPayload(await sendServiceChatMessage(activeId, message));
    } catch (error: any) {
      setDraft(message);
      toast.error(error?.message || "Could not send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* ═══════════════════════════════════════
          Conversation List
      ═══════════════════════════════════════ */}
      <div
        className={cn(
          "w-full md:w-[340px] md:min-w-[300px] md:max-w-[380px] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 bg-slate-50/60 dark:bg-slate-950/40",
          showChat ? "hidden md:flex" : "flex"
        )}
      >
        {/* List header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <Headphones className="h-4 w-4" />
                </div>
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Service Inbox
                </h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {conversations.length} conversation
                  {conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={loadConversations}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or message..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-8 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <p className="text-xs text-slate-400 font-medium">
                Loading conversations...
              </p>
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2.5 px-6 text-center">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  {search ? "No results found" : "No messages yet"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {search
                    ? "Try a different search term"
                    : "Customer messages will appear here"}
                </p>
              </div>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {sortedConversations.map((conv, idx) => {
                const isActive = conv.id === activeId;
                const hasUnread = (conv.unread_count || 0) > 0;
                const avatarUrl = getConversationAvatar(conv);
                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.15) }}
                    onClick={() => openConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 group",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm shadow-blue-500/5"
                        : hasUnread
                        ? "bg-white dark:bg-slate-900 border border-transparent hover:bg-blue-50/40 dark:hover:bg-blue-500/5 hover:border-blue-100 dark:hover:border-blue-500/10"
                        : "bg-transparent border border-transparent hover:bg-white dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={conv.user_name || "Customer"}
                          className="h-11 w-11 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div
                          className="h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                          style={getAvatarStyle(conv.id)}
                        >
                          {getInitial(conv.user_name || "Visitor")}
                        </div>
                      )}
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white border-2 border-slate-50 dark:border-slate-900 shadow-sm shadow-blue-600/30">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className={cn(
                            "text-[13px] truncate leading-tight",
                            hasUnread
                              ? "font-bold text-slate-900 dark:text-white"
                              : "font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                          )}
                        >
                          {conv.user_name || "Anonymous Visitor"}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] font-medium shrink-0 whitespace-nowrap",
                            hasUnread
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-400 dark:text-slate-500"
                          )}
                        >
                          {timeAgo(conv.last_message_at || conv.created_at)}
                        </span>
                      </div>

                      {(conv.user_phone || conv.user_email) && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          {conv.user_phone ? (
                            <Phone className="h-2.5 w-2.5 shrink-0" />
                          ) : (
                            <Mail className="h-2.5 w-2.5 shrink-0" />
                          )}
                          {conv.user_phone || conv.user_email}
                        </p>
                      )}

                      <p
                        className={cn(
                          "text-[11px] truncate mt-1 leading-relaxed",
                          hasUnread
                            ? "text-slate-700 dark:text-slate-300 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {parseTaggedMessage(conv.last_message).text || "No messages yet"}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          Chat Panel
      ═══════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {showChat && activeConversation ? (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={closeChat}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {getConversationAvatar(activeConversation) ? (
                  <img
                    src={getConversationAvatar(activeConversation)}
                    alt={activeConversation.user_name || "Customer"}
                    className="h-10 w-10 rounded-xl object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0"
                    style={getAvatarStyle(activeConversation.id)}
                  >
                    {getInitial(activeConversation.user_name || "Visitor")}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeConversation.user_name || "Anonymous Visitor"}
                    </p>
                    {!activeConversation.user_id && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                        <User className="h-2.5 w-2.5" />
                        Visitor
                      </span>
                    )}
                    {activeConversation.user_id && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activeConversation.user_phone && (
                      <a
                        href={`tel:${activeConversation.user_phone}`}
                        className="text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5 truncate max-w-[140px]"
                      >
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        {activeConversation.user_phone}
                      </a>
                    )}
                    {activeConversation.user_phone && activeConversation.user_email && (
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                    )}
                    {activeConversation.user_email && (
                      <a
                        href={`mailto:${activeConversation.user_email}`}
                        className="text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5 truncate max-w-[160px]"
                      >
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        {activeConversation.user_email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {activeConversation.user_phone && (
                  <a
                    href={`tel:${activeConversation.user_phone}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10 transition-all active:scale-95"
                    title="Call customer"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-slate-100/60 dark:from-slate-950/60 dark:via-slate-950/40 dark:to-slate-900/60 px-4 py-4">
              {threadLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Loading messages...
                  </p>
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                      <MessageSquare className="h-7 w-7 text-slate-200 dark:text-slate-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Send className="h-3 w-3 text-white -rotate-12" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Start the conversation
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-[220px]">
                      Send a message below to begin helping this customer
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {sortedMessages.map((msg, idx) => {
                    const isStaff = msg.sender_role === "staff";
                    const parsedMessage = parseTaggedMessage(msg.body);
                    const prevMsg = sortedMessages[idx - 1];
                    const showDate = shouldShowDateSeparator(
                      msg.created_at,
                      prevMsg?.created_at
                    );
                    const showSenderAvatar =
                      idx === 0 ||
                      sortedMessages[idx - 1]?.sender_role !== msg.sender_role;
                    const isLast =
                      idx === sortedMessages.length - 1;

                    return (
                      <div key={msg.id}>
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                              {formatMessageDate(msg.created_at)}
                            </span>
                            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
                          </div>
                        )}

                        {/* Message */}
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.12,
                            delay: isLast ? 0.04 : 0,
                          }}
                          className={cn(
                            "flex gap-2",
                            isStaff ? "justify-end" : "justify-start"
                          )}
                        >
                          {/* Customer avatar */}
                          {!isStaff && (
                            <div className="w-7 shrink-0 flex flex-col items-center">
                              {showSenderAvatar ? (
                                getConversationAvatar(activeConversation) ? (
                                  <img
                                    src={getConversationAvatar(activeConversation)}
                                    alt={activeConversation.user_name || "Customer"}
                                    className="h-7 w-7 rounded-lg object-cover shadow-sm"
                                  />
                                ) : (
                                  <div
                                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                    style={getAvatarStyle(activeConversation.id)}
                                  >
                                    {getInitial(
                                      activeConversation.user_name ||
                                        "Visitor"
                                    )}
                                  </div>
                                )
                              ) : (
                                <div className="w-7" />
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[78%] sm:max-w-[70%] flex flex-col",
                              isStaff ? "items-end" : "items-start"
                            )}
                          >
                            {/* Sender name */}
                            {showSenderAvatar && (
                              <span
                                className={cn(
                                  "text-[10px] font-semibold mb-1 px-1",
                                  isStaff
                                    ? "text-blue-500 dark:text-blue-400"
                                    : "text-slate-400 dark:text-slate-500"
                                )}
                              >
                                {isStaff
                                  ? msg.sender_name || "You (Staff)"
                                  : msg.sender_name ||
                                    activeConversation.user_name ||
                                    "Customer"}
                              </span>
                            )}

                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                                isStaff
                                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md shadow-blue-600/10"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-md"
                              )}
                            >
                              {parsedMessage.topic && (
                                <span
                                  className={cn(
                                    "mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    isStaff
                                      ? "bg-white/20 text-white"
                                      : "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                                  )}
                                >
                                  {parsedMessage.topic}
                                </span>
                              )}
                              <div className="whitespace-pre-wrap break-words">
                                {parsedMessage.text}
                              </div>
                            </div>

                            <span
                              className={cn(
                                "text-[9px] mt-1 px-1 font-medium flex items-center gap-1",
                                isStaff
                                  ? "text-blue-400 dark:text-blue-500"
                                  : "text-slate-400 dark:text-slate-500"
                              )}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>

                          {/* Staff avatar */}
                          {isStaff && (
                            <div className="w-7 shrink-0 flex flex-col items-center">
                              {showSenderAvatar ? (
                                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                  <Headphones className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="w-7" />
                              )}
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 shrink-0">
              <div className="flex items-end gap-2 max-w-2xl mx-auto">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    rows={1}
                    placeholder="Type your reply..."
                    className="w-full max-h-28 min-h-[44px] resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => handleSubmit()}
                  disabled={sending || !draft.trim()}
                  className={cn(
                    "flex h-[44px] w-[44px] items-center justify-center rounded-xl transition-all shrink-0 active:scale-95",
                    draft.trim() && !sending
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden md:flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50/80 to-slate-100/60 dark:from-slate-950/60 dark:to-slate-900/60 text-center px-6"
          >
            <div className="relative mb-5">
              <div className="h-20 w-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                <Headphones className="h-9 w-9 text-slate-200 dark:text-slate-600" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              Select a conversation
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Choose a conversation from the list to view and reply to customer
              messages
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceStaffChatInbox;
