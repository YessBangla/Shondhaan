import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Send, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitWithAck, getMartSocket } from "@/lib/martSocket";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

interface SocketReplyResponse {
  success: boolean;
  message?: any;
  data?: {
    message_id: number;
    conversation_id: number;
  };
}

export default function VendorMessageDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const productPrice = conversation?.product_price;
  const productOriginalPrice = conversation?.product_original_price;
  const productStock = conversation?.product_stock;

  const appendMessage = (nextMessage: any) => {
    setMessages((prev) => {
      if (prev.some((msg) => Number(msg.id) === Number(nextMessage.id))) return prev;
      return [...prev, nextMessage];
    });
  };

  const loadMessages = async () => {
    if (!conversationId || !user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${conversationId}?viewer_id=${user.id}&viewer_role=seller`
      );
      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Failed to load messages");
      }

      setConversation(json.data.conversation);
      setMessages(json.data.messages || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const socket = getMartSocket();

    socket.emit("mart:join", { seller_user_id: user.id });
    socket.emit("mart:conversation:join", { conversation_id: Number(conversationId) });

    const handleNewMessage = (payload: { message?: any; conversation?: any }) => {
      if (!payload.message) return;
      if (Number(payload.message.conversation_id) !== Number(conversationId)) return;
      appendMessage(payload.message);
      if (payload.conversation) setConversation(payload.conversation);
    };

    socket.on("mart:message:new", handleNewMessage);

    return () => {
      socket.off("mart:message:new", handleNewMessage);
      socket.emit("mart:conversation:leave", { conversation_id: Number(conversationId) });
    };
  }, [conversationId, user?.id]);

  const sendReply = async () => {
    if (!text.trim() || !conversationId || !user?.id) return;

    setSending(true);
    try {
      getMartSocket().emit("mart:join", { seller_user_id: user.id });
      const json = await emitWithAck<Record<string, unknown>, SocketReplyResponse>("mart:message:reply", {
        conversation_id: Number(conversationId),
        seller_user_id: Number(user.id),
        message: text.trim(),
      });

      if (json.success === false) {
        throw new Error(json.message || "Failed to send reply");
      }

      setText("");
      if (json.message) appendMessage(json.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="border-b">
          <div className="p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h2 className="font-bold text-slate-800">
                {conversation?.user_name || "Customer"}
              </h2>
              <p className="text-xs text-slate-500">
                {conversation?.product_name || "Product message"}
              </p>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
              {conversation?.product_image ? (
                <img
                  src={conversation.product_image}
                  alt={conversation?.product_name || "Product"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ShoppingBag className="h-6 w-6 text-emerald-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Product box
              </p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {conversation?.product_name || "Product"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Product #{conversation?.product_id}</span>
                {productPrice != null && productPrice !== "" && (
                  <span className="font-bold text-emerald-600">
                    ৳{Number(productPrice).toLocaleString("en-US")}
                  </span>
                )}
                {productOriginalPrice != null && productOriginalPrice !== "" && Number(productOriginalPrice) > Number(productPrice || 0) && (
                  <span className="line-through text-slate-400">
                    ৳{Number(productOriginalPrice).toLocaleString("en-US")}
                  </span>
                )}
                {productStock != null && productStock !== "" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Stock {productStock}
                  </span>
                )}
              </div>
            </div>

            {conversation?.product_id && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl gap-1.5 shrink-0"
                onClick={() => navigate(`/mart/product/mysql-product-${conversation.product_id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3 min-h-[400px]">
          {messages.map((msg) => {
            const isSeller = msg.sender_role === "seller";

            return (
              <div
                key={msg.id}
                className={`flex ${isSeller ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isSeller
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p>{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isSeller ? "text-white/70" : "text-slate-400"}`}>
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write reply..."
            className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendReply();
            }}
          />

          <Button
            onClick={sendReply}
            disabled={sending || !text.trim()}
            className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
