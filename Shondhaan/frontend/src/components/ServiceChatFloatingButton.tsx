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
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { cn } from "@/lib/utils";

const CONVERSATION_KEY = "yess_service_chat_conversation_id";

type Ack = {
  ok: boolean;
  message?: string;
  data?: ServiceChatPayload;
};

const ServiceChatFloatingButton = () => {
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const auth = getMySqlAuth();
  const userName = auth?.user?.name || "Anonymous";

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
    socket.emit("service-chat:join-conversation", {
      conversationId,
      visitorId: getServiceChatVisitorId(),
      token: getServiceChatToken(),
    });

    const onMessage = (payload: ServiceChatPayload) => {
      if (payload.conversation.id !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((message) => message.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    };

    socket.on("service-chat:message:new", onMessage);
    return () => {
      socket.off("service-chat:message:new", onMessage);
    };
  }, [conversationId]);

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
      if (prev.some((message) => message.id === payload.message.id)) return prev;
      return [...prev, payload.message];
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    setDraft("");
    setSending(true);

    try {
      if (!conversationId) {
        const ack = await emitServiceChatWithAck<Record<string, unknown>, Ack>(
          "service-chat:conversation:create",
          {
            message,
            user_name: auth?.user?.name,
            user_email: auth?.user?.email,
            user_phone: auth?.user?.mobile,
            subject: "Service support",
          }
        ).catch(() => null);

        if (ack?.ok) appendPayload(ack.data);
        else appendPayload(await createServiceChatConversation(message));
      } else {
        const ack = await emitServiceChatWithAck<Record<string, unknown>, Ack>(
          "service-chat:message:send",
          { conversationId, message, sender_name: userName }
        ).catch(() => null);

        if (ack?.ok) appendPayload(ack.data);
        else appendPayload(await sendServiceChatMessage(conversationId, message));
      }
    } catch (error: any) {
      setDraft(message);
      toast.error(error?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-2 z-[80]">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-xs overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              <div>
                <p className="text-sm font-bold leading-tight">Service support</p>
                <p className="text-[11px] opacity-85">{auth?.user ? userName : "Anonymous visitor"}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-primary-foreground/15">
              <X className="h-4 w-4" />
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
                  return (
                    <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          own
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border bg-card text-foreground"
                        )}
                      >
                        {!own && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{message.sender_name || "Support"}</p>}
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border bg-card p-3">
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
              placeholder="Type your message..."
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-green-500 text-primary-foreground shadow-xl ring-4 ring-primary/15 transition hover:scale-105"
          title="Message support"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default ServiceChatFloatingButton;