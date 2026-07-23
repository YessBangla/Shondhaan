import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Loader2, MessageSquare, RefreshCw, Send, User } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Ack = {
  ok: boolean;
  message?: string;
  data?: ServiceChatPayload;
};

const ServiceStaffChatInbox = () => {
  const auth = getMySqlAuth();
  const [conversations, setConversations] = useState<ServiceChatConversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ServiceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || null;
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.last_message_at || b.created_at).getTime() -
          new Date(a.last_message_at || a.created_at).getTime()
      ),
    [conversations]
  );

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  );

  const loadConversations = async () => {
    setLoading(true);
    try {
      const rows = await listServiceChatConversations();
      setConversations(rows);
      setActiveId((current) => current || rows[0]?.id || "");
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
      .catch((error: any) => !cancelled && toast.error(error?.message || "Could not load messages"))
      .finally(() => !cancelled && setThreadLoading(false));

    const socket = getServiceChatSocket();
    socket.emit("service-chat:join-conversation", {
      conversationId: activeId,
      token: auth?.token,
    });

    return () => {
      cancelled = true;
    };
  }, [activeId, auth?.token]);

  useEffect(() => {
    const socket = getServiceChatSocket();
    socket.emit("service-chat:join-staff", { token: auth?.token });

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
      socket.off("service-chat:conversation:updated", onUpdate);
      socket.off("service-chat:message:new", onMessage);
    };
  }, [activeId, auth?.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length, activeId]);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !activeId || sending) return;

    setDraft("");
    setSending(true);

    try {
      const ack = await emitServiceChatWithAck<Record<string, unknown>, Ack>(
        "service-chat:message:send",
        {
          conversationId: activeId,
          message,
          sender_name: auth?.user?.name || "Support",
        }
      ).catch(() => null);

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
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
      <div className="border-b border-border md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Service messages</h2>
          </div>
          <button onClick={loadConversations} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No service messages yet.
            </div>
          ) : (
            sortedConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 p-3 text-left hover:bg-secondary/70",
                  activeId === conversation.id && "bg-primary/10"
                )}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {conversation.user_name || "Anonymous"}
                    </p>
                    {conversation.unread_count ? (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.user_phone || conversation.user_email || "Visitor message"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-foreground/70">{conversation.last_message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-[520px] flex-col">
        {activeConversation ? (
          <>
            <div className="border-b border-border p-4">
              <p className="text-sm font-bold text-foreground">{activeConversation.user_name || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">
                {activeConversation.user_id
                  ? `Logged in user #${activeConversation.user_id}`
                  : `Anonymous visitor ${activeConversation.visitor_id?.slice(0, 8) || ""}`}
              </p>
              {(activeConversation.user_phone || activeConversation.user_email) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[activeConversation.user_phone, activeConversation.user_email].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
              {threadLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedMessages.map((message) => {
                    const staff = message.sender_role === "staff";
                    return (
                      <div key={message.id} className={cn("flex", staff ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            staff
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border border-border bg-card text-foreground"
                          )}
                        >
                          <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                            {message.sender_name || (staff ? "Support" : "Customer")}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
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
                placeholder="Reply to customer..."
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
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
            Select a conversation to reply.
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceStaffChatInbox;
