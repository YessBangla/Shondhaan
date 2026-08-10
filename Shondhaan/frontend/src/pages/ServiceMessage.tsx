import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceConversations } from "@/hooks/useServiceInbox";
import BookingChatModal from "@/components/client/BookingChatModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "confirmed":
    case "completed":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    case "in_progress":
      return "default" as const;
    default:
      return "outline" as const;
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

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */

const ServiceMessage = () => {
  const navigate = useNavigate();
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

  // realtime: we rely on the hook's own subscription

  const filtered = conversations.filter((c) =>
    `${c.service_title} ${c.provider_name} ${c.package_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{bn ? "লগইন করুন" : "Please login"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] " />

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-10">
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {bn ? "সার্ভিস ইনবক্স" : "Service Inbox"}
          </h1>
        </div>

        {/* SEARCH */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={bn ? "কথোপকথন খুঁজুন..." : "Search conversations..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {bn ? "কোনো বার্তা নেই" : "No messages"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {bn
                ? "আপনার বুকিং সম্পর্কে সরবরাহকারীর সাথে কথা বলুন"
                : "Start a conversation with your provider about a booking"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <Card
              key={conv.booking_id}
              onClick={() => {
                setActiveConv({
                  booking_id: conv.booking_id,
                  service_title: conv.service_title,
                });
                setChatOpen(true);
              }}
              className="cursor-pointer mb-2 hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row: title + time */}
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm truncate">
                        {conv.service_title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>

                    {/* Provider name */}
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.provider_name
                        ? bn
                          ? `${conv.provider_name} (প্রদানকারী)`
                          : `${conv.provider_name} (Provider)`
                        : conv.package_name}
                    </p>

                    {/* Bottom row: last message + badges */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs truncate max-w-[160px] text-muted-foreground">
                        {conv.last_message}
                      </p>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={statusBadgeVariant(conv.booking_status)} className="text-[10px] px-1.5 py-0">
                          {statusLabel(conv.booking_status, bn)}
                        </Badge>

                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

