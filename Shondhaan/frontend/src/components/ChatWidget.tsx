import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, ChevronDown, Bot, User as UserIcon, Mail, Phone as PhoneIcon, Wrench } from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import LocationPicker from "@/components/LocationPicker";
import { serviceCategories } from "@/data/categories";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";
import { socket } from "@/lib/socket";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

// Same REST convention as the Deal admin components
const API_BASE = `${CENTRAL_API_BASE_URL}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

type Msg = { role: "user" | "assistant"; content: string };

const categoryEmojis: Record<string, string> = {
  "ac-service": "❄️", "home-repair": "🔌", "appliance-repair": "🔧", "cleaning": "🧹",
  "beauty": "💄", "mens-care": "💈", "shifting": "🚚", "health": "🏥",
  "pest-control": "🐜", "electronics": "💻", "car-care": "🚗", "driver": "🚕",
  "painting": "🎨", "yes-mart": "🏪", "yes-deal": "🛒",
  "home-service": "🏠", "vehicle-rental": "🚐", "it-web": "💻", "event-management": "🎉",
  "media-production": "🎬", "education": "📚", "employment": "💼", "legal": "⚖️",
  "security": "🛡️", "construction": "🏗️", "solar": "☀️", "agriculture": "🌾",
  "travel": "✈️", "tailoring": "✂️", "courier": "📦",
};

const priorityIds = ["yes-deal", "yes-mart"];
const allServiceOptions = [
  ...serviceCategories.filter(c => priorityIds.includes(c.id)),
  ...serviceCategories.filter(c => !priorityIds.includes(c.id)),
].map(cat => ({
  value: cat.serviceSlugs[0] || cat.id,
  labelBn: `${categoryEmojis[cat.id] || "📋"} ${cat.name}`,
  labelEn: `${categoryEmojis[cat.id] || "📋"} ${cat.nameEn || cat.name}`,
}));
const topServiceOptions = allServiceOptions.filter(s => 
  s.value === "yes-mart" || s.value === "yes-deal" || 
  priorityIds.some(pid => allServiceOptions.find(o => o.value === s.value && serviceCategories.find(c => c.id === pid)?.serviceSlugs.includes(s.value)))
).slice(0, 2);
const moreServiceOptions = allServiceOptions.filter(s => !topServiceOptions.includes(s));

// ---------------------------------------------------------------------------
// Socket-based AI chat protocol.
//
// ASSUMED event names — adjust these to whatever your backend actually
// speaks. Each request carries a `requestId` so concurrent/overlapping
// calls (e.g. a normal chat message and the auto-extract call below) don't
// get their responses crossed on the shared socket.
//
//   emit "ai_chat"              { requestId, messages, userInfo }
//   on   "ai_chat_delta"        { requestId, content }   (repeated)
//   on   "ai_chat_done"         { requestId }
//   on   "ai_chat_error"        { requestId, error }
// ---------------------------------------------------------------------------

function streamChat({
  messages,
  userInfo,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  userInfo: { name: string; email: string; phone: string; service: string };
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let settled = false;

  const handleDelta = (payload: any) => {
    if (payload?.requestId !== requestId) return;
    if (payload.content) onDelta(payload.content);
  };
  const handleDone = (payload: any) => {
    if (payload?.requestId !== requestId || settled) return;
    settled = true;
    cleanup();
    onDone();
  };
  const handleErrorEvt = (payload: any) => {
    if (payload?.requestId !== requestId || settled) return;
    settled = true;
    cleanup();
    onError(payload?.error || "সমস্যা হয়েছে, আবার চেষ্টা করুন।");
  };

  function cleanup() {
    clearTimeout(timeoutTimer);
    socket.off("ai_chat_delta", handleDelta);
    socket.off("ai_chat_done", handleDone);
    socket.off("ai_chat_error", handleErrorEvt);
  }

  const timeoutTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    cleanup();
    onError("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।");
  }, 30000);

  socket.on("ai_chat_delta", handleDelta);
  socket.on("ai_chat_done", handleDone);
  socket.on("ai_chat_error", handleErrorEvt);

  if (!socket.connected) socket.connect();
  socket.emit("ai_chat", { requestId, messages, userInfo });

  return cleanup; // exposed in case the caller unmounts mid-stream
}

// One-off request/response over the socket (used for the silent
// "extract service request info" call — no streaming needed there).
function socketRequest<T = any>(
  emitEvent: string,
  payload: any,
  { timeoutMs = 20000 }: { timeoutMs?: number } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `${emitEvent}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let settled = false;

    const handleResult = (res: any) => {
      if (res?.requestId !== requestId || settled) return;
      settled = true;
      cleanup();
      if (res.error) reject(new Error(res.error));
      else resolve((res.data ?? res) as T);
    };

    function cleanup() {
      clearTimeout(timer);
      socket.off(`${emitEvent}_result`, handleResult);
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Request timed out"));
    }, timeoutMs);

    socket.on(`${emitEvent}_result`, handleResult);
    if (!socket.connected) socket.connect();
    socket.emit(emitEvent, { requestId, ...payload });
  });
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "chat">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [showMoreCats, setShowMoreCats] = useState(false);
  const [locDivision, setLocDivision] = useState("");
  const [locDistrict, setLocDistrict] = useState("");
  const [locThana, setLocThana] = useState("");
  const [locDetail, setLocDetail] = useState("");
  const [locating, setLocating] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [promptLang, setPromptLang] = useState<"bn" | "en">(language === "en" ? "en" : "bn");
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const bn = language === "bn";

  // Save a message to DB
  const saveMessage = useCallback(async (convId: string, role: "user" | "assistant", content: string) => {
    try {
      await apiFetch(`/chat/messages`, {
        method: "POST",
        body: JSON.stringify({ conversation_id: convId, role, content }),
      });
    } catch (err) {
      console.error("saveMessage error:", err);
    }
  }, []);

  const createAutoServiceRequest = useCallback(async (transcript: Msg[]) => {
    const extractPrompt = `Based on the conversation above, extract the following info as JSON (no markdown, just raw JSON):
{"service_description": "brief description of what service they need", "division": "division if mentioned or empty", "district": "district/city if mentioned or empty", "thana": "thana/area if mentioned or empty", "detail_area": "detailed address if mentioned or empty", "needs_service": true/false}
If the customer didn't ask for any specific service, set needs_service to false. Always respond with valid JSON only.`;

    try {
      const result = await socketRequest<{ content?: string }>("ai_extract", {
        messages: [...transcript, { role: "user", content: extractPrompt }],
        userInfo: { name, email, phone, service },
      });

      const raw = result?.content || "";

      // Parse JSON from response (handle markdown code blocks)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const extracted = JSON.parse(jsonMatch[0]);
      if (!extracted.needs_service || !extracted.service_description) return;

      const serviceLabel = allServiceOptions.find(s => s.value === service);
      const description = extracted.service_description + (serviceLabel ? ` (${bn ? serviceLabel.labelBn : serviceLabel.labelEn})` : "");

      await apiFetch(`/service-requests`, {
        method: "POST",
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          division: extracted.division || locDivision || "ঢাকা",
          district: extracted.district || locDistrict || "ঢাকা",
          thana: extracted.thana || locThana || null,
          detail_area: extracted.detail_area || locDetail || null,
          service_description: `[AI কল] ${description}`,
          status: "pending",
        }),
      });

      const confirmMsg = bn
        ? "✅ আপনার কলের ভিত্তিতে একটি **সার্ভিস রিকোয়েস্ট** স্বয়ংক্রিয়ভাবে তৈরি হয়েছে। আমাদের টিম শীঘ্রই যোগাযোগ করবে।"
        : "✅ A **service request** has been automatically created based on your call. Our team will contact you soon.";

      setMessages(prev => [...prev, { role: "assistant", content: confirmMsg }]);
      if (conversationId) {
        saveMessage(conversationId, "assistant", confirmMsg);
      }
    } catch (err) {
      console.error("Auto service request error:", err);
    }
  }, [name, phone, service, locDivision, locDistrict, locThana, locDetail, bn, conversationId, saveMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);



  const startChat = useCallback(async () => {
    if (!name.trim() || !phone.trim()) return;

    // Create conversation via API
    let convId: string | null = null;
    try {
      const conv = await apiFetch(`/chat/conversations`, {
        method: "POST",
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || null,
          service_interest: service || null,
          user_id: user?.id || null,
        }),
      });
      convId = (conv.data || conv)?.id || null;
    } catch (err) {
      console.error("startChat conversation create error:", err);
    }

    setConversationId(convId);
    setStep("chat");

    const greetingContent = bn
      ? `আসসালামু আলাইকুম ${name}! 👋 আমি Shondhaan এর নিজস্ব সহকারী। আপনাকে কীভাবে সাহায্য করতে পারি?`
      : `Hello ${name}! 👋 I'm the official assistant of Shondhaan. How can I help you today?`;

    const greeting: Msg = { role: "assistant", content: greetingContent };
    setMessages([greeting]);

    if (convId) {
      saveMessage(convId, "assistant", greetingContent);
    }
  }, [name, phone, email, service, bn, user, saveMessage]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Save user message
    if (conversationId) {
      saveMessage(conversationId, "user", userMsg.content);
    }

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    streamChat({
      messages: newMessages,
      userInfo: { name, email, phone, service },
      onDelta: upsertAssistant,
      onDone: () => {
        setIsLoading(false);
        // Save full assistant response
        if (conversationId && assistantSoFar) {
          saveMessage(conversationId, "assistant", assistantSoFar);
        }
      },
      onError: (err) => {
        const errMsg = `⚠️ ${err}`;
        setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
        setIsLoading(false);
        if (conversationId) {
          saveMessage(conversationId, "assistant", errMsg);
        }
      },
    });
  }, [input, isLoading, messages, name, email, phone, service, conversationId, saveMessage]);

  // Allow external triggers (e.g. unified mobile FAB hub) to open the chat.
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("yess:open-chat", handler as EventListener);
    return () => window.removeEventListener("yess:open-chat", handler as EventListener);
  }, []);


  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
              className="fixed right-3 z-[51] hidden md:flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow md:!bottom-[92px] md:right-4"
              style={{ bottom: getMobileFloatingBottom(168), boxShadow: "0 4px 24px hsl(var(--primary) / 0.35)" }}
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[76px] right-3 left-3 z-[51] flex flex-col rounded-2xl border border-border bg-background shadow-2xl md:bottom-6 md:right-6 md:left-auto md:w-[400px] md:max-h-[600px]"
            style={{ maxHeight: "calc(100dvh - 140px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Shondhaan</p>
                  <p className="text-[10px] text-white/70">{bn ? "অনলাইনে আছি" : "Online"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-primary-foreground/10"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            {step === "form" ? (
              <div className="flex flex-col gap-4 p-4 overflow-y-auto">
                {/* Section: Personal Info */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" />
                    {bn ? "ব্যক্তিগত তথ্য" : "Personal Info"}
                  </p>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-0.5 border-b border-border/50">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder={bn ? "আপনার নাম *" : "Your Name *"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-0 shadow-none px-0 h-9 text-xs focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-0.5 border-b border-border/50">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder={bn ? "ফোন নম্বর *" : "Phone *"}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="border-0 shadow-none px-0 h-9 text-xs focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-0.5">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder={bn ? "ইমেইল (অপশনাল)" : "Email (optional)"}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-0 shadow-none px-0 h-9 text-xs focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Service */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    {bn ? "সার্ভিস নির্বাচন" : "Select Service"}
                  </p>
                  <div className="rounded-xl border border-border bg-card p-1.5">
                    <div className="grid grid-cols-2 gap-1">
                      {topServiceOptions.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setService(s.value)}
                          className={`rounded-lg px-2 py-1.5 text-[10px] font-medium text-left transition-all active:scale-[0.97] truncate ${
                            service === s.value
                              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {bn ? s.labelBn : s.labelEn}
                        </button>
                      ))}
                      {moreServiceOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowMoreCats(true)}
                          className="rounded-lg px-2 py-1.5 text-[10px] font-medium text-left transition-all active:scale-[0.97] text-primary hover:bg-primary/10 flex items-center gap-1 col-span-2 justify-center border border-dashed border-primary/30"
                        >
                          📋 {bn ? "সকল সার্ভিস দেখুন..." : "All Services..."}
                        </button>
                      )}
                    </div>
                    {/* Selected from "more" indicator */}
                    {moreServiceOptions.some(s => s.value === service) && (
                      <div className="mt-1 px-2 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-medium truncate">
                        ✅ {bn
                          ? allServiceOptions.find(s => s.value === service)?.labelBn
                          : allServiceOptions.find(s => s.value === service)?.labelEn}
                      </div>
                    )}
                  </div>

                  {/* More Categories Popup */}
                  <AnimatePresence>
                    {showMoreCats && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-x-2 bottom-16 top-16 z-50 rounded-2xl border border-border bg-card shadow-xl flex flex-col overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <p className="text-xs font-bold text-foreground">
                            {bn ? "সকল সার্ভিস" : "All Services"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowMoreCats(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                          <div className="grid grid-cols-2 gap-1">
                            {allServiceOptions.map((s) => (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => {
                                  setService(s.value);
                                  setShowMoreCats(false);
                                }}
                                className={`rounded-lg px-2.5 py-2 text-[11px] font-medium text-left transition-all active:scale-[0.97] truncate ${
                                  service === s.value
                                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                {bn ? s.labelBn : s.labelEn}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Section: Location */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    📍 {bn ? "আপনার অবস্থান" : "Your Location"}
                  </p>
                  <LocationPicker
                    division={locDivision}
                    district={locDistrict}
                    thana={locThana}
                    detailArea={locDetail}
                    onDivisionChange={setLocDivision}
                    onDistrictChange={setLocDistrict}
                    onThanaChange={setLocThana}
                    onDetailAreaChange={setLocDetail}
                    bn={bn}
                    compact
                  />
                </div>

                <button
                  onClick={startChat}
                  disabled={!name.trim() || !phone.trim()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  {bn ? "চ্যাট শুরু করুন" : "Start Chat"}
                </button>
              </div>
            ) : (
              <>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 200 }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <UserIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-2.5 rounded-bl-md">
                        <span className="text-[11px] font-medium text-muted-foreground mr-1">
                          {bn ? "টাইপ করছে" : "Typing"}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Quick Reply Buttons */}
                {messages.length <= 1 && !isLoading && (
                  <div className="px-3 pb-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {promptLang === "bn" ? "দ্রুত প্রশ্ন করুন:" : "Quick questions:"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPromptLang((l) => (l === "bn" ? "en" : "bn"))}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground transition-colors hover:bg-secondary hover:border-primary/40 active:scale-95"
                        aria-label="Toggle prompt language"
                      >
                        {promptLang === "bn" ? "EN" : "বাং"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(promptLang === "bn"
                        ? [
                            "আপনাদের সার্ভিসর মূল্য কত?",
                            "আমার বুকিংয়ের স্ট্যাটাস জানতে চাই",
                            "একটি সার্ভিস বুকিং করতে চাই",
                            "সার্ভিস রিকোয়েস্ট করতে চাই",
                            "কোন কোন এলাকায় সার্ভিস পাওয়া যায়?",
                          ]
                        : [
                            "What are your service prices?",
                            "Check my booking status",
                            "I want to book a service",
                            "Submit a service request",
                            "Which areas do you cover?",
                          ]
                      ).map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); setTimeout(() => { const form = document.querySelector('[data-chat-form]') as HTMLFormElement; form?.requestSubmit(); }, 50); }}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary hover:border-primary/30 active:scale-95"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-border p-3">
                  <form
                    data-chat-form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative">
                      <EmojiPicker
                        onEmojiSelect={(emoji) => setInput(prev => prev + emoji)}
                        disabled={isLoading}
                        buttonClassName="flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40"
                      />
                    </div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={bn ? "মেসেজ লিখুন..." : "Type a message..."}
                      className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
