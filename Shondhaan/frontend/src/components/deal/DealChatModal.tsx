import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useDealMessages } from "@/hooks/useDealChatSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAITools } from "@/hooks/useAITools";
import { cn } from "@/lib/utils";

import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";

interface DealChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation_id: string;
  listingTitle: string;
  sellerId: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "আজ";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "গতকাল";
  return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

export default function DealChatModal({
  open,
  onOpenChange,
  conversation_id,
  listingTitle,
  sellerId,
}: DealChatModalProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [msg, setMsg] = useState("");
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { autoReply, loading: aiLoading } = useAITools();
  const [showAiSuggestion, setShowAiSuggestion] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // History still loads over REST — only the live send/receive loop moves to the socket
  const { data: messages, isLoading } = useDealMessages(conversation_id, sellerId);

  // ✅ Sync API messages → local state
  useEffect(() => {
    if (messages) {
      setLiveMessages(messages);
    }
  }, [messages]);

  // ✅ Scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }, [liveMessages]);

  // ✅ SOCKET REALTIME (both receiving replies and the echo of our own sends)
  useEffect(() => {
    if (!user || !open) return;

    // `socket` has autoConnect disabled — something has to actually call
    // .connect() or join_user below goes nowhere. Safe to call even if
    // already connected (no-op).
    socket.connect();
    socket.emit("join_user", user.id);

    const handleNewMessage = (data: any) => {
      console.log("📩 incoming:", data);

      const belongsToThisChat = String(data.conversation_id) === String(conversation_id);

      if (!belongsToThisChat) return;

      setLiveMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) =>
            typeof m.id === "string" &&
            m.id.startsWith("temp_") &&
            m.message === data.message &&
            m.sender_id === data.sender_id
        );

        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = data;
          return updated;
        }

        if (prev.find((m) => m.id === data.id)) return prev;

        return [...prev, data];
      });

      queryClient.invalidateQueries({
        queryKey: ["deal-messages", conversation_id, sellerId],
      });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [user, open, conversation_id, sellerId, queryClient]);

  // ✅ SEND MESSAGE over the socket (optimistic UI, reconciled by handleNewMessage above)
  const handleSend = () => {
    const text = msg.trim();
    if (!text || !user) return;

    const tempId = "temp_" + Date.now();

    const tempMsg = {
      id: tempId,
      message: text,
      sender_id: user.id,
      receiver_id: sellerId,
      conversation_id,
      created_at: new Date().toISOString(),
      is_read: false,
      pending: true,
    };

    setLiveMessages((prev) => [...prev, tempMsg]);
    setMsg("");

    socket.emit(
      "send_message",
      {
        conversationId: conversation_id,
        receiverId: sellerId,
        message: text,
      },
      (ack: any) => {
        console.log("📩 ACK:", ack);

        if (!ack || ack.success === false) {
          setLiveMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))
          );
          return;
        }

        if (ack.data) {
          setLiveMessages((prev) => prev.map((m) => (m.id === tempId ? ack.data : m)));
        }
      }
    );

    // fallback: stop showing "Sending..." forever even if neither the ack
    // nor the new_message broadcast resolves this within 4s
    setTimeout(() => {
      setLiveMessages((prev) =>
        prev.map((m) => (m.id === tempId && m.pending ? { ...m, pending: false } : m))
      );
    }, 4000);
  };

  // GROUP BY DATE
  const grouped = liveMessages.reduce<Record<string, any[]>>((acc, m) => {
    const dateKey = new Date(m.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(m);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 h-[80vh] max-h-[600px] flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-sm font-medium truncate">
            💬 {listingTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : liveMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm text-muted-foreground">
                {bn ? "কথোপকথন শুরু করুন" : "Start a conversation"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div className="flex justify-center mb-3">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {formatDate(msgs[0].created_at)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {msgs.map((m) => {
                      const isMine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                              isMine
                                ? "bg-primary text-white rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md",
                              m.pending && "opacity-60",
                              m.failed && "opacity-60 ring-1 ring-destructive"
                            )}
                          >
                            <p className="break-words">{m.message}</p>

                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isMine
                                  ? "text-white/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {m.failed
                                ? bn
                                  ? "পাঠাতে ব্যর্থ"
                                  : "Failed to send"
                                : m.pending
                                ? bn
                                  ? "পাঠানো হচ্ছে..."
                                  : "Sending..."
                                : formatTime(m.created_at)}
                              {isMine && !m.pending && !m.failed && m.is_read && " ✓✓"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* AI Suggestion */}
        {showAiSuggestion && (
          <div className="px-3 py-2 border-t bg-muted/30 shrink-0">
            <p className="text-[10px] flex items-center gap-1 mb-1 text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {bn ? "AI সাজেস্টেড রিপ্লাই" : "AI Suggested Reply"}
            </p>

            <p className="text-xs mb-1.5">{showAiSuggestion}</p>

            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => {
                  setMsg(showAiSuggestion);
                  setShowAiSuggestion(null);
                }}
              >
                {bn ? "ব্যবহার করুন" : "Use"}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px]"
                onClick={() => setShowAiSuggestion(null)}
              >
                {bn ? "বাতিল" : "Dismiss"}
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 border-t shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder={bn ? "মেসেজ লিখুন..." : "Type a message..."}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="flex-1"
              autoFocus
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={aiLoading || !liveMessages.length}
              onClick={async () => {
                const lastMsg = [...liveMessages]
                  .reverse()
                  .find((m) => m.sender_id !== user?.id);

                if (lastMsg) {
                  const reply = await autoReply(lastMsg.message, listingTitle);
                  if (reply) setShowAiSuggestion(reply);
                }
              }}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>

            <Button type="submit" size="icon" disabled={!msg.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}