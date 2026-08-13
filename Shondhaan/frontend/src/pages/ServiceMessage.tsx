import { useState } from "react";
import { MessageCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceConversations } from "@/hooks/useServiceInbox";
import BookingChatModal from "@/components/client/BookingChatModal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const statusDotColor = (status: string) => {
  switch (status) {
    case "confirmed":
    case "completed":
      return "bg-emerald-500";
    case "pending":
      return "bg-amber-500";
    case "cancelled":
      return "bg-rose-500";
    case "in_progress":
      return "bg-blue-500 animate-pulse";
    default:
      return "bg-slate-400";
  }
};

const statusLabel = (status: string, bn: boolean): string => {
  const map: Record<string, string> = {
    pending: bn ? "বাকি" : "Pending",
    confirmed: bn ? "নিশ্চিত" : "Confirmed",
    in_progress: bn ? "চলছে" : "In Progress",
    completed: bn ? "সম্পন্ন" : "Completed",
    cancelled: bn ? "বাতিল" : "Cancelled",
  };
  return map[status] || status;
};

const getInitials = (name: string) => {
  if (!name) return "S";
  return name.charAt(0).toUpperCase();
};

const getAvatarGradient = (id: string) => {
  const gradients = [
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-purple-500 to-pink-500",
    "from-cyan-500 to-blue-500",
  ];
  const index = id.charCodeAt(0) % gradients.length;
  return gradients[index];
};

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */

const ServiceMessage = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<{
    booking_id: string;
    service_title: string;
  } | null>(null);

  // 🔥 fetch conversations
  const { data, isLoading } = useServiceConversations();
  const conversations = Array.isArray(data) ? data : [];

  const filtered = conversations.filter((c) =>
    `${c.service_title} ${c.provider_name} ${c.package_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">{bn ? "লগইন করুন" : "Please login"}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {bn ? "সার্ভিস ইনবক্স" : "Service Inbox"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {bn ? "আপনার সার্ভিস প্রোভাইডারদের সাথে চ্যাট করুন" : "Chat with your service providers"}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={bn ? "কথোপকথন খুঁজুন..." : "Search conversations..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-all shadow-sm"
        />
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
          <p className="text-sm text-slate-500">{bn ? "লোড হচ্ছে..." : "Loading..."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-4">
            <MessageCircle className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {bn ? "কোনো বার্তা নেই" : "No messages"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {bn
              ? "আপনার বুকিং সম্পর্কে সরবরাহকারীর সাথে কথা বলুন"
              : "Start a conversation with your provider about a booking"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv, index) => (
            <motion.div
              key={conv.booking_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setActiveConv({
                  booking_id: conv.booking_id,
                  service_title: conv.service_title,
                });
                setChatOpen(true);
              }}
              className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
            >
              {/* Avatar */}
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm bg-gradient-to-br",
                getAvatarGradient(conv.booking_id)
              )}>
                {getInitials(conv.service_title)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Top row: title + time */}
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {conv.service_title}
                  </p>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2 shrink-0">
                    {timeAgo(conv.last_message_at)}
                  </span>
                </div>

                {/* Last message */}
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {conv.last_message || (bn ? "নতুন কথোপকথন শুরু করুন" : "Start a new conversation")}
                </p>

                {/* Bottom row: provider + badges */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", statusDotColor(conv.booking_status))} />
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {conv.provider_name
                        ? bn
                          ? `${conv.provider_name} (প্রোভাইডার)`
                          : `${conv.provider_name} (Provider)`
                        : conv.package_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {statusLabel(conv.booking_status, bn)}
                    </span>

                    {conv.unread_count > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm shadow-blue-500/30">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CHAT MODAL */}
      {activeConv && (
        <BookingChatModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          bookingId={activeConv.booking_id}
          serviceTitle={activeConv.service_title}
        />
      )}
    </div>
  );
};

export default ServiceMessage;