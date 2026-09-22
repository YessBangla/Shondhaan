import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import {
  createServiceChatConversation,
  getServiceChatToken,
  getServiceChatVisitorId,
  listServiceChatMessages,
  sendServiceChatMessage,
  type ServiceChatMessage,
  type ServiceChatPayload,
} from "@/lib/serviceChatApi";
import { emitServiceChatWithAck, getServiceChatSocket } from "@/lib/serviceChatSocket";
import { CENTRAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth, saveMySqlAuth, type MySqlAuthUser } from "@/lib/mysqlAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const CONVERSATION_KEY = "yess_service_chat_conversation_id";
export const SERVICE_CHAT_OPEN_EVENT = "shondhaan:open-service-chat";

const CHAT_TOPIC_OPTIONS: { value: string; label: { en: string; bn: string } }[] = [
  { value: "Shondhaan service", label: { en: "Shondhaan service", bn: "সন্ধান সার্ভিস" } },
  { value: "Shondhaan mart", label: { en: "Shondhaan mart", bn: "সন্ধান মার্ট" } },
  { value: "Shondhaan deal", label: { en: "Shondhaan deal", bn: "সন্ধান ডিল" } },
  { value: "Shondhaan job", label: { en: "Shondhaan job", bn: "সন্ধান জব" } },
] as const;

const TAGGED_MESSAGE_PATTERN = /^"([^"]+)"\s*\n([\s\S]*)$/;

const formatTaggedMessage = (topic: string, message: string) => `"${topic}"\n${message}`;

const parseTaggedMessage = (body: string) => {
  const match = body.match(TAGGED_MESSAGE_PATTERN);
  if (!match) return { topic: "", text: body };
  return { topic: match[1], text: match[2] };
};

type Ack = {
  ok: boolean;
  message?: string;
  data?: ServiceChatPayload;
};

const ServiceChatFloatingButton = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const auth = getMySqlAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      return localStorage.getItem(CONVERSATION_KEY) || "";
    } catch {
      return "";
    }
  });
  const [messages, setMessages] = useState<ServiceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [profileUser, setProfileUser] = useState<MySqlAuthUser | null>(auth?.user || null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const currentUser = profileUser || auth?.user || null;
  const userName = currentUser?.name || "Anonymous";
  const userAvatar = currentUser?.profile_image || currentUser?.avatar_url || "";

  useEffect(() => {
    if (!auth?.token || !CENTRAL_API_BASE_URL) {
      setProfileUser(auth?.user || null);
      return;
    }

    let cancelled = false;
    fetch(`${CENTRAL_API_BASE_URL.replace(/\/+$/, "")}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (cancelled || !user) return;
        const mergedUser = { ...auth.user, ...user };
        setProfileUser(mergedUser);
        saveMySqlAuth({ ...auth, user: mergedUser });
      })
      .catch(() => {
        if (!cancelled) setProfileUser(auth?.user || null);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.token, auth?.user?.id]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length, open]);

  useEffect(() => {
    if (!open || !conversationId) return;

    let cancelled = false;
    setLoading(true);
    listServiceChatMessages(conversationId)
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch(() => {
        if (!cancelled) {
          setConversationId("");
          try {
            localStorage.removeItem(CONVERSATION_KEY);
          } catch {}
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getServiceChatSocket();
    const joinConversation = () => {
      socket.emit("service-chat:join-conversation", {
        conversationId,
        visitorId: getServiceChatVisitorId(),
        token: getServiceChatToken(),
      });
    };

    socket.connect();
    socket.on("connect", joinConversation);
    if (socket.connected) joinConversation();

    const onMessage = (payload: ServiceChatPayload) => {
      if (payload.conversation.id !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((message) => message.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    };

    socket.on("service-chat:message:new", onMessage);
    return () => {
      socket.off("connect", joinConversation);
      socket.off("service-chat:message:new", onMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(SERVICE_CHAT_OPEN_EVENT, openChat);
    return () => window.removeEventListener(SERVICE_CHAT_OPEN_EVENT, openChat);
  }, []);

  const rememberConversation = (id: string) => {
    setConversationId(id);
    try {
      localStorage.setItem(CONVERSATION_KEY, id);
    } catch {}
  };

  const appendPayload = (payload?: ServiceChatPayload) => {
    if (!payload) return;
    rememberConversation(payload.conversation.id);
    setMessages((prev) => {
      const nextMessages = prev.some((message) => message.id === payload.message.id)
        ? prev
        : [...prev, payload.message];
      const automaticReply = payload.automatic_reply;
      if (!automaticReply || nextMessages.some((message) => message.id === automaticReply.id)) {
        return nextMessages;
      }
      return [...nextMessages, automaticReply];
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    if (!selectedTopic) {
      toast.error(bn ? "আগে একটি অপশন বেছে নিন" : "Please choose an option first");
      return;
    }

    const taggedMessage = formatTaggedMessage(selectedTopic, message);

    setDraft("");
    setSending(true);

    try {
      if (!conversationId) {
        const ack = await emitServiceChatWithAck<Record<string, unknown>, Ack>(
          "service-chat:conversation:create",
          {
            message: taggedMessage,
            user_name: currentUser?.name,
            user_email: currentUser?.email,
            user_phone: currentUser?.mobile,
            user_avatar: userAvatar,
            profile_image: userAvatar,
            user_profile_image: userAvatar,
            subject: selectedTopic,
          }
        ).catch(() => null);

        if (ack?.ok) appendPayload(ack.data);
        else appendPayload(await createServiceChatConversation(taggedMessage));
      } else {
        const ack = await emitServiceChatWithAck<Record<string, unknown>, Ack>(
          "service-chat:message:send",
          {
            conversationId,
            message: taggedMessage,
            sender_name: userName,
            user_name: currentUser?.name,
            user_email: currentUser?.email,
            user_phone: currentUser?.mobile,
            user_avatar: userAvatar,
            profile_image: userAvatar,
            user_profile_image: userAvatar,
          }
        ).catch(() => null);

        if (ack?.ok) appendPayload(ack.data);
        else appendPayload(await sendServiceChatMessage(conversationId, taggedMessage));
      }
    } catch (error: any) {
      setDraft(message);
      toast.error(error?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[80px] right-3 z-[100]">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-xs overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-white" />
              <div>
                <p className="text-sm font-bold leading-tight text-white">Shondhaan Support</p>
                <p className="text-[11px] opacity-85 text-white">{auth?.user ? userName : "Anonymous visitor"}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-primary-foreground/15">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="h-72 overflow-y-auto bg-muted/30 p-3">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <MessageCircle className="mb-2 h-9 w-9 opacity-40" />
                Send a message to the service team.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedMessages.map((message) => {
                  const own = message.sender_role === "customer";
                  const parsedMessage = parseTaggedMessage(message.body);
                  return (
                    <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          own
                            ? "rounded-br-md bg-primary text-white"
                            : "rounded-bl-md border border-border bg-card text-foreground"
                        )}
                      >
                        {!own && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{message.sender_name || "Support"}</p>}
                        {parsedMessage.topic && (
                          <span
                            className={cn(
                              "mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              own ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                            )}
                          >
                            {parsedMessage.topic}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{parsedMessage.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 border-t border-border bg-card p-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {bn ? "আপনি কোন বিষয়ে জানতে চান?" : "What do you want to know about?"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CHAT_TOPIC_OPTIONS.map((topic) => (
                  <button
                    key={topic.value}
                    type="button"
                    onClick={() => setSelectedTopic(topic.value)}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-xs font-semibold transition",
                      selectedTopic === topic.value
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-foreground hover:border-primary/60"
                    )}
                  >
                    {topic.label[bn ? "bn" : "en"]}
                  </button>
                ))}
              </div>
            </div>
            {selectedTopic && (
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {CHAT_TOPIC_OPTIONS.find((topic) => topic.value === selectedTopic)?.label[bn ? "bn" : "en"] || selectedTopic}
              </span>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                rows={1}
                placeholder={bn ? "আপনার মেসেজ লিখুন..." : "Type your message..."}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim() || !selectedTopic}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-green-600 text-white shadow-xl ring-4 ring-primary/15 transition hover:scale-105"
          title="Message support">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default ServiceChatFloatingButton;
