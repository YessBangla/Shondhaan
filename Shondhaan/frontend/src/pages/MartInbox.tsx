import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMartConversations } from "@/hooks/useMartChat";
import MartChatModal from "@/components/mart/MartChatModal";
import Navbar from "@/components/Navbar";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const MartInbox = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<{
    productId: string;
    name: string;
    image: string | null;
    price: number;
    otherUserId: string;
  } | null>(null);

  const { data: conversations, isLoading } = useMartConversations();

  const filtered = conversations?.filter(c =>
    c.product_name.toLowerCase().includes(search.toLowerCase()) ||
    c.other_user_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        
      <div className="pt-[44px] md:pt-[104px]" />
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
      <div className="px-4 md:px-0 mt-[100px] md:mt-[20px]" />
      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-10 border shadow rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mart")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {bn ? "মার্ট ইনবক্স" : "Mart Inbox"}
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
                {bn ? "পণ্যের পেজে চ্যাট বাটনে ক্লিক করে কথোপকথন শুরু করুন" : "Click chat on any product to start a conversation"}
              </p>
            </div>
          ) : (
          <div className="space-y-2">
            {filtered.map((conv) => (
              <Card
                key={`${conv.product_id}_${conv.other_user_id}`}
                className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setActiveConv({
                    productId: conv.product_id,
                    name: conv.product_name,
                    image: conv.product_image,
                    price: conv.product_price,
                    otherUserId: conv.other_user_id,
                  });
                  setChatOpen(true);
                }}
              >
                <CardContent className="p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {conv.product_image ? (
                      <img src={conv.product_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🛒</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{conv.other_user_name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.product_name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full shrink-0 ml-2">
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
        <MartChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          productId={activeConv.productId}
          productName={activeConv.name}
          productImage={activeConv.image}
          productPrice={activeConv.price}
          sellerId={activeConv.otherUserId}
        />
      )}

      
    </div>
  );
};

export default MartInbox;
