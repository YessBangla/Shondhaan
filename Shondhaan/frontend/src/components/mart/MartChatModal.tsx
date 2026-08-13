// src/components/mart/MartChatModal.tsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Send, MessageCircle, Loader2, ShoppingBag, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { emitWithAck, getMartSocket } from "@/lib/martSocket";

const API =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

// ─── Types ────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | number;   // products.id
  productName: string;
  productImage?: string | null;
  productPrice?: number | string | null;
  sellerId: string | number;    // product.vendor_id  →  sellers.user_id
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: "user" | "seller";
  message: string;
  is_read: number;
  created_at: string;
}

interface SocketSendResponse {
  success: boolean;
  message?: ChatMessage | string;
  data?: {
    message_id: number;
    conversation_id: number;
  };
}

// ─── Component ────────────────────────────────────────────────
export default function MartChatModal({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  productPrice,
  sellerId,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [text, setText]                     = useState("");
  const [sending, setSending]               = useState(false);
  const [loading, setLoading]               = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const appendMessage = (nextMessage: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((msg) => Number(msg.id) === Number(nextMessage.id))) return prev;
      return [...prev, nextMessage];
    });
  };

  // ── fetch messages for an existing conversation ──────────────
  const fetchMessages = async (convId: number) => {
    try {
      const res  = await fetch(
        `${API}/api/messages/${convId}?viewer_id=${user?.id}&viewer_role=user`
      );
      const json = await res.json();
      if (json.success) setMessages(json.data.messages ?? []);
    } catch {}
  };

  // ── on open: check if conversation exists already ────────────
  const initConversation = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res  = await fetch(
        `${API}/api/messages/find?product_id=${productId}&user_id=${user.id}&seller_user_id=${sellerId}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setConversationId(json.data.id);
        await fetchMessages(json.data.id);
      }
    } catch {}
    setLoading(false);
  };

  // ── open / close effects ─────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setConversationId(null);
      setText("");
      return;
    }
    initConversation();
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── poll every 4 s when chat is open ─────────────────────────
  useEffect(() => {
    if (!open || !conversationId) return;
    const socket = getMartSocket();

    socket.emit("mart:join", { user_id: user?.id });
    socket.emit("mart:conversation:join", { conversation_id: conversationId });

    const handleNewMessage = (payload: { message?: ChatMessage }) => {
      if (!payload.message) return;
      if (Number(payload.message.conversation_id) !== Number(conversationId)) return;
      appendMessage(payload.message);
    };

    socket.on("mart:message:new", handleNewMessage);

    return () => {
      socket.off("mart:message:new", handleNewMessage);
      socket.emit("mart:conversation:leave", { conversation_id: conversationId });
    };
  }, [open, conversationId, user?.id]);

  // ── auto-scroll to bottom on new message ────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── send ─────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || sending) return;
    setSending(true);
    try {
      getMartSocket().emit("mart:join", { user_id: user.id });
      const json = await emitWithAck<Record<string, unknown>, SocketSendResponse>("mart:message:send", {
        product_id:     productId,
        user_id:        user.id,
        seller_user_id: sellerId,   // vendor_id from product = sellers.user_id
        message:        trimmed,
        user_name:      (user as any).name || (user as any).email || "User",
        product_name:    productName,
        product_image:   productImage || null,
      });
      if (!json.success) throw new Error(typeof json.message === "string" ? json.message : undefined);

      const convId = json.data?.conversation_id as number;
      setConversationId(convId);
      setText("");
      getMartSocket().emit("mart:conversation:join", { conversation_id: convId });

      if (json.message && typeof json.message !== "string") {
        appendMessage(json.message);
      }
    } catch (err: any) {
      toast.error(err.message || (bn ? "বার্তা পাঠানো যায়নি" : "Failed to send"));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!open) return null;

  // ─── render ──────────────────────────────────────────────────
  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* panel — slides up from bottom on mobile, floats on desktop */}
      <div
        className={[
          "fixed z-50 bg-white flex flex-col overflow-hidden shadow-2xl",
          // mobile: full-width sheet from bottom
          "bottom-0 left-0 right-0 rounded-t-2xl",
          // sm+: floating panel bottom-right
          "sm:bottom-6 sm:right-6 sm:left-auto sm:w-[360px] sm:rounded-2xl",
        ].join(" ")}
        style={{ maxHeight: "80dvh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white shrink-0">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">
              {bn ? "বিক্রেতাকে জিজ্ঞেস করুন" : "Chat with Seller"}
            </p>
            <p className="text-[11px] text-white/70 truncate">{productName}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Product chip ── */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="rounded-2xl border border-primary/15 bg-white p-3 shadow-sm flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
            {productImage ? (
              <img src={productImage} alt={productName} className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {bn ? "পণ্যের তথ্য" : "Product details"}
            </p>
            <p className="text-sm font-semibold text-gray-800 truncate">{productName}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
              <span>#{productId}</span>
              {productPrice != null && productPrice !== "" && (
                <span className="font-semibold text-primary">
                  ৳{Number(productPrice).toLocaleString(bn ? "bn-BD" : "en-US")}
                </span>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/60">

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageCircle className="h-10 w-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 font-medium">
                {bn ? "কোনো বার্তা নেই" : "No messages yet"}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {bn ? "বিক্রেতাকে প্রথম বার্তা পাঠান" : "Send your first message to the seller"}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender_role === "user";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[10px] mt-0.5 ${isMe ? "text-white/60 text-right" : "text-gray-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString(
                      bn ? "bn-BD" : "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        {user ? (
        <div className="px-3 py-3 border-t border-gray-100 bg-white shrink-0 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={bn ? "বার্তা লিখুন… (Enter পাঠাতে)" : "Type a message… (Enter to send)"}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors overflow-y-auto"
            style={{ minHeight: 40, maxHeight: 112 }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="h-10 w-10 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            aria-label={bn ? "পাঠান" : "Send"}
          >
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
        ) : (
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <button
              type="button"
              onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
              className="w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              {bn ? "Login to chat" : "Login to start chatting"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
