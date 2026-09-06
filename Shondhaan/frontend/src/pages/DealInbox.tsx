import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ChevronLeft, Search, Loader2, Clock, Inbox, Sparkles, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDealConversations, useDealUserIdentities } from "@/hooks/useDealChatSocket";
import DealChatModal from "@/components/deal/DealChatModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);

  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

const avatarGradients = [
  "linear-gradient(135deg, #2563eb, #4f46e5)",
  "linear-gradient(135deg, #0891b2, #2563eb)",
  "linear-gradient(135deg, #059669, #0d9488)",
  "linear-gradient(135deg, #d97706, #ea580c)",
  "linear-gradient(135deg, #db2777, #e11d48)",
];

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : words[0][0].toUpperCase();
};

const getAvatarStyle = (id: string) => ({
  background: avatarGradients[
    [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % avatarGradients.length
  ],
});

interface DealInboxProps {
  embedded?: boolean;
}

const DealInbox = ({ embedded = false }: DealInboxProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState(null);

  const { data, isLoading } = useDealConversations();
  const conversations = Array.isArray(data) ? data : [];
  const identityIds = conversations.map((conversation) => String(conversation.other_user_id));
  const { data: identities = [] } = useDealUserIdentities(identityIds);
  const identityById = new Map(identities.map((identity) => [String(identity.id), identity]));

  useEffect(() => {
    if (!user?.id) return;

    socket.connect();
    socket.emit("join_user", user.id);

    const handleNewMessage = () => {
      queryClient.invalidateQueries({
        queryKey: ["deal-conversations", user.id],
      });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [user?.id, queryClient]);

  const filtered = conversations.filter((c) =>
    `${c.listing_title || ""} ${identityById.get(String(c.other_user_id))?.name || c.other_user_name || ""} ${identityById.get(String(c.other_user_id))?.shondhaan_id || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((total, conversation) => total + (conversation.unread_count || 0), 0);

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-background"}>
      {!embedded && <Navbar />}
      {!embedded && <div className="pt-[44px] md:pt-[68px]" />}

      <div className={embedded ? "w-full" : "max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10"}>
        <div className="space-y-5">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {!embedded && (
                <button
                  onClick={() => navigate("/deal")}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  aria-label={bn ? "ডিলে ফিরে যান" : "Back to Deal"}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="relative">
                <div className="p-3 rounded-2xl bg-userprimary shadow-lg shadow-blue-500/25 text-white">
                  <MessageCircle className="h-5 w-5" />
                </div>
                {totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {bn ? "ডিল ইনবক্স" : "Deal Inbox"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {bn ? `${conversations.length}টি কথোপকথন • বিক্রেতার সাথে চ্যাট করুন` : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""} • Chat with sellers`}
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder={bn ? "বিজ্ঞাপন বা বিক্রেতা খুঁজুন..." : "Search ad or seller..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {bn ? "আপনার কথোপকথন লোড হচ্ছে..." : "Loading your conversations..."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-100/50 dark:bg-blue-500/5 blur-2xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-100/50 dark:bg-indigo-500/5 blur-2xl" />
              <div className="relative flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="relative mb-5">
                  <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/50">
                    {search ? <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" /> : <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {search ? (bn ? "কোনো ফলাফল পাওয়া যায়নি" : "No results found") : (bn ? "আপনার ইনবক্স খালি" : "Your inbox is empty")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  {search ? (bn ? "অন্য কোনো শব্দ দিয়ে চেষ্টা করুন" : "Try a different search term") : (bn ? "কোনো বিজ্ঞাপনে আগ্রহী হলে এখানে কথোপকথন দেখা যাবে" : "Conversations will appear here when you contact a seller")}
                </p>
                {search && <button onClick={() => setSearch("")} className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">{bn ? "অনুসন্ধান মুছুন" : "Clear search"}</button>}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((conv, index) => {
                const hasUnread = conv.unread_count > 0;
                const identity = identityById.get(String(conv.other_user_id));
                const displayName = identity?.name || conv.other_user_name || (bn ? "ব্যবহারকারী" : "User");
                const displayId = identity?.shondhaan_id || (bn ? "আইডি নেই" : "ID unavailable");
                return (
                  <motion.button
                    key={conv.conversation_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveConv(conv); setChatOpen(true); }}
                    className={cn(
                      "relative w-full flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border text-left transition-all group",
                      "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 active:translate-y-0",
                      hasUnread
                        ? "border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5"
                        : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md" style={getAvatarStyle(String(conv.conversation_id))}>
                        {getInitials(displayName)}
                      </div>
                      {hasUnread && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">{conv.unread_count}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className={cn("text-sm sm:text-[15px] truncate", hasUnread ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400")}>
                          {displayName}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("flex items-center gap-1 text-[11px]", hasUnread ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")}>
                            <Clock className="h-3 w-3" />{timeAgo(conv.last_message_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 mt-0.5">
                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{conv.listing_title}</p>
                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 font-medium">ID: {displayId}</span>
                      </div>
                      <p className={cn("text-xs sm:text-sm truncate mt-1", hasUnread ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-500 dark:text-slate-400")}>
                        {conv.last_message || (bn ? "নতুন কথোপকথন শুরু করুন" : "Start a new conversation")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CHAT MODAL */}
      {activeConv && (
        <DealChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversation_id={activeConv.conversation_id}
          listingTitle={activeConv.listing_title}
          sellerId={activeConv.other_user_id}
          participantName={identityById.get(String(activeConv.other_user_id))?.name || activeConv.other_user_name}
          participantShondhaanId={identityById.get(String(activeConv.other_user_id))?.shondhaan_id}
        />
      )}

      {!embedded && <Footer />}
    </div>
  );
};

export default DealInbox;