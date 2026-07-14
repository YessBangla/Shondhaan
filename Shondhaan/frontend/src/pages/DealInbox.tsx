import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDealConversations } from "@/hooks/useDealChatSocket";
import DealChatModal from "@/components/deal/DealChatModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);

  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

const DealInbox = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState(null);

  // 🔥 FIXED: get full response, then extract array
  const { data, isLoading } = useDealConversations();
  const conversations = Array.isArray(data) ? data : [];

  console.log("🔥 RAW QUERY DATA:", data);
  console.log("🔥 FINAL conversations:", conversations);

  useEffect(() => {
    if (!user?.id) return;

    socket.connect();
    socket.emit("join_user", user.id);

    const handleNewMessage = (msg) => {
      console.log("📩 New message:", msg);

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
    `${c.listing_title || ""} ${c.other_user_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-10">

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/deal")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Inbox
          </h1>
        </div>

        {/* SEARCH */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">No messages</p>
        ) : (
          filtered.map((conv) => (
            <Card
              key={conv.conversation_id}
              onClick={() => {
                setActiveConv(conv);
                setChatOpen(true);
              }}
              className="cursor-pointer mb-2"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    👤
                  </div>

                  <div className="flex-1">
                    
                    <div className="flex justify-between">
                      <p className="font-medium">
                        {conv.other_user_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {conv.listing_title}
                    </p>

                    <div className="flex justify-between items-center">
                      <p className="text-xs truncate max-w-[180px]">
                        {conv.last_message}
                      </p>

                      {conv.unread_count > 0 && (
                        <Badge>{conv.unread_count}</Badge>
                      )}
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
        <DealChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversation_id={activeConv.conversation_id}
          listingTitle={activeConv.listing_title}
          sellerId={activeConv.other_user_id}
        />
      )}

      <Footer />
    </div>
  );
};

export default DealInbox;