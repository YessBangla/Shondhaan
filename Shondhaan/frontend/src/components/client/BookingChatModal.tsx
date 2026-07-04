import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Loader2, User, Wrench, Paperclip, Image, FileText, Download, Play, Pause } from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import VoiceRecorder from "@/components/VoiceRecorder";
import SmartReplyChips from "@/components/client/SmartReplyChips";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  serviceTitle: string;
  providerName?: string;
  senderRole?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];

const BookingChatModal = ({ open, onClose, bookingId, serviceTitle, providerName, senderRole = "client" }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    const { data } = await supabase
      .from("booking_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    if (open) fetchMessages();
  }, [open, fetchMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!open || !bookingId) return;
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "booking_messages",
        filter: `booking_id=eq.${bookingId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, bookingId]);

  // Cleanup preview URL
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(bn ? "ফাইল সাইজ ১০MB এর বেশি হতে পারবে না" : "File size must be under 10MB");
      return;
    }
    setPreviewFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    // Reset input
    e.target.value = "";
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    const ext = file.name.split(".").pop() || "file";
    const path = `${bookingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) {
      toast.error(bn ? "ফাইল আপলোড ব্যর্থ" : "File upload failed");
      return null;
    }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, type: file.type };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !previewFile) || !user || sending) return;
    setSending(true);

    let fileData: { url: string; name: string; type: string } | null = null;
    if (previewFile) {
      setUploading(true);
      fileData = await uploadFile(previewFile);
      setUploading(false);
      if (!fileData && !newMessage.trim()) { setSending(false); return; }
    }

    const { error } = await supabase.from("booking_messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      sender_role: senderRole,
      message: newMessage.trim() || (fileData ? `📎 ${fileData.name}` : ""),
      file_url: fileData?.url || null,
      file_name: fileData?.name || null,
      file_type: fileData?.type || null,
    });
    if (!error) {
      setNewMessage("");
      clearPreview();
    }
    setSending(false);
  };

  const isImage = (type: string | null) => type && IMAGE_TYPES.includes(type);
  const isAudio = (type: string | null) => type && AUDIO_TYPES.includes(type);

  const getStorageUrl = (url: string | null) => url || "";

  const handleVoiceRecording = async (file: File) => {
    if (!user || sending) return;
    setSending(true);
    setUploading(true);
    const fileData = await uploadFile(file);
    setUploading(false);
    if (!fileData) { setSending(false); return; }
    await supabase.from("booking_messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      sender_role: senderRole,
      message: "🎤 " + (bn ? "ভয়েস মেসেজ" : "Voice message"),
      file_url: fileData.url,
      file_name: fileData.name,
      file_type: fileData.type,
    });
    setSending(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 rounded-t-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {bn ? "লাইভ চ্যাট" : "Live Chat"}
                </h3>
                <p className="text-[10px] text-muted-foreground truncate">
                  {serviceTitle} {providerName ? `• ${providerName}` : ""}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {bn ? "এখনো কোনো মেসেজ নেই" : "No messages yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {bn ? "সেবা প্রদানকারীর সাথে কথা বলুন" : "Start a conversation with the provider"}
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-end gap-1.5 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                        isMe ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {isMe ? <User className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                      </div>
                      <div className={`rounded-2xl px-3 py-2 ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}>
                        {/* File attachment */}
                        {msg.file_url && (
                          <div className="mb-1.5">
                            {isAudio(msg.file_type) ? (
                              <audio
                                controls
                                preload="metadata"
                                className="max-w-[220px] h-10"
                                src={getStorageUrl(msg.file_url)}
                              />
                            ) : isImage(msg.file_type) ? (
                              <a href={getStorageUrl(msg.file_url)} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={getStorageUrl(msg.file_url)}
                                  alt={msg.file_name || "image"}
                                  className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ) : (
                              <a
                                href={getStorageUrl(msg.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
                                  isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background/50 hover:bg-background/80"
                                }`}
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="text-[11px] truncate flex-1">{msg.file_name || "file"}</span>
                                <Download className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        )}
                        {/* Text message (skip if it's just the auto-generated file label) */}
                        {msg.message && !(msg.file_url && (msg.message.startsWith("📎") || msg.message.startsWith("🎤"))) && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        )}
                        <p className={`text-[9px] mt-1 ${
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString("bn-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* File preview */}
          {previewFile && (
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary border border-border">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{previewFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(previewFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button onClick={clearPreview} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <SmartReplyChips
            lastMessage={messages[messages.length - 1]?.message}
            isFromOther={!!messages.length && messages[messages.length - 1].sender_id !== user?.id}
            disabled={sending || uploading}
            onPick={(text) => setNewMessage((prev) => (prev ? prev + " " + text : text))}
          />
          <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card rounded-b-2xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <EmojiPicker
              onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
              disabled={sending}
            />
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecording}
              disabled={sending}
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={bn ? "মেসেজ লিখুন..." : "Type a message..."}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && !previewFile) || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:opacity-90 shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingChatModal;
