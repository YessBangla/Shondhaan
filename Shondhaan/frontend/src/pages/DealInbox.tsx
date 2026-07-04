import { useState } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDealConversations } from "@/hooks/useDealChat";
import DealChatModal from "@/components/deal/DealChatModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function timeAgo(dateStr: string) {
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
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<{ listingId: string; title: string; otherUserId: string } | null>(null);

  const { data: conversations, isLoading } = useDealConversations();

  const filtered = conversations?.filter(c =>
    c.listing_title.toLowerCase().includes(search.toLowerCase()) ||
    c.other_user_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{bn ? "মেসেজ দেখতে লগইন করুন" : "Login to see messages"}</p>
          <Button onClick={() => navigate("/auth")}>{bn ? "লগইন" : "Login"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-10">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/deal")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {bn ? "ইনবক্স" : "Inbox"}
          </h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={bn ? "কথোপকথন খুঁজুন..." : "Search conversations..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted-foreground">{bn ? "কোনো মেসেজ নেই" : "No messages yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bn ? "বিজ্ঞাপনে চ্যাট বাটনে ক্লিক করে কথোপকথন শুরু করুন" : "Click chat on any ad to start a conversation"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((conv) => (
              <Card
                key={`${conv.listing_id}_${conv.other_user_id}`}
                className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setActiveConv({
                    listingId: conv.listing_id,
                    title: conv.listing_title,
                    otherUserId: conv.other_user_id,
                  });
                  setChatOpen(true);
                }}
              >
                <CardContent className="p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <ListingImage src={conv.listing_image} alt="" fallbackSize="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{conv.other_user_name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.listing_title}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full shrink-0 ml-2">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {activeConv && (
        <DealChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          listingId={activeConv.listingId}
          listingTitle={activeConv.title}
          sellerId={activeConv.otherUserId}
        />
      )}

      <Footer />
    </div>
  );
};

export default DealInbox;
