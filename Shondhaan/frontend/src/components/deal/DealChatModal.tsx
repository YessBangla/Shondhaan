import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useDealMessages, useSendDealMessage } from "@/hooks/useDealChat";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAITools } from "@/hooks/useAITools";
import { cn } from "@/lib/utils";

interface DealChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
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

export default function DealChatModal({ open, onOpenChange, listingId, listingTitle, sellerId }: DealChatModalProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { autoReply, loading: aiLoading } = useAITools();
  const [showAiSuggestion, setShowAiSuggestion] = useState<string | null>(null);

  const { data: messages, isLoading } = useDealMessages(listingId, sellerId);
  const sendMutation = useSendDealMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!msg.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ listingId, receiverId: sellerId, message: msg.trim() });
    setMsg("");
  };

  // Group messages by date
  const grouped = (messages || []).reduce<Record<string, typeof messages>>((acc, m) => {
    const dateKey = new Date(m.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey]!.push(m);
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
          ) : messages?.length === 0 ? (
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
                      {formatDate(msgs![0].created_at)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {msgs!.map((m) => {
                      const isMine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}>
                            <p className="break-words">{m.message}</p>
                            <p className={cn(
                              "text-[10px] mt-1",
                              isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatTime(m.created_at)}
                              {isMine && m.is_read && " ✓✓"}
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
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
              <Sparkles className="h-3 w-3" /> {bn ? "AI সাজেস্টেড রিপ্লাই" : "AI Suggested Reply"}
            </p>
            <p className="text-xs text-foreground mb-1.5">{showAiSuggestion}</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={() => { setMsg(showAiSuggestion); setShowAiSuggestion(null); }}>
                {bn ? "ব্যবহার করুন" : "Use"}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAiSuggestion(null)}>
                {bn ? "বাতিল" : "Dismiss"}
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 border-t shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
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
              disabled={aiLoading || !messages?.length}
              onClick={async () => {
                const lastBuyerMsg = [...(messages || [])].reverse().find(m => m.sender_id !== user?.id);
                if (lastBuyerMsg) {
                  const reply = await autoReply(lastBuyerMsg.message, listingTitle);
                  if (reply) setShowAiSuggestion(reply);
                }
              }}
              title={bn ? "AI রিপ্লাই" : "AI Reply"}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
            <Button type="submit" size="icon" disabled={!msg.trim() || sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
