import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationBell from "@/components/NotificationBell";
import { useCmsServices } from "@/hooks/useCmsData";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Users, Clock, DollarSign, AlertTriangle,
  CheckCircle2, XCircle, UserPlus, MessageSquare, Activity,
  BarChart3, Eye, Phone, MapPin
} from "lucide-react";

interface InternalMsg {
  id: string;
  service_slug: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  message_type: string;
  metadata: any;
  created_at: string;
}

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  service_description: string;
  status: string;
  assigned_rep_id: string | null;
  payment_status: string;
  payment_amount: number | null;
  created_at: string;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  package_name: string;
  package_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  provider_id: string | null;
  is_emergency: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const roleColors: Record<string, string> = {
  admin: "text-red-600 dark:text-red-400",
  call_center: "text-blue-600 dark:text-blue-400",
  provider: "text-green-600 dark:text-green-400",
  representative: "text-purple-600 dark:text-purple-400",
  supervisor: "text-orange-600 dark:text-orange-400",
  finance: "text-teal-600 dark:text-teal-400",
  moderator: "text-pink-600 dark:text-pink-400",
};

const roleBadges: Record<string, string> = {
  admin: "অ্যাডমিন",
  call_center: "কল সেন্টার",
  provider: "প্রোভাইডার",
  representative: "প্রতিনিধি",
  supervisor: "সুপারভাইজার",
  finance: "ফিনান্স",
  moderator: "মডারেটর",
};

export default function InternalServiceChat() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<InternalMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: backendServices = [] } = useCmsServices();

  // Fetch user profile & roles
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("display_name, phone").eq("user_id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      setUserProfile(profile);
      setUserRoles((roles || []).map((r: any) => r.role));
    };
    load();
  }, [user]);

  // Fetch service info
  useEffect(() => {
    if (!slug) return;
    setServiceInfo(backendServices.find((service) => service.slug === slug) || null);
  }, [slug, backendServices]);

  // Fetch bookings for this service
  useEffect(() => {
    if (!slug) return;
    supabase.from("bookings")
      .select("*")
      .eq("service_slug", slug)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setBookings(data || []));
  }, [slug]);

  // Fetch service requests (matching by description keyword from slug)
  useEffect(() => {
    if (!slug || !serviceInfo) return;
    supabase.from("service_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRequests(data || []));
  }, [slug, serviceInfo]);

  // Fetch & subscribe to internal messages
  useEffect(() => {
    if (!slug) return;
    supabase.from("internal_messages")
      .select("*")
      .eq("service_slug", slug)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => setMessages((data as InternalMsg[]) || []));

    const channel = supabase
      .channel(`internal-${slug}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "internal_messages",
        filter: `service_slug=eq.${slug}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as InternalMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  // Realtime bookings
  useEffect(() => {
    if (!slug) return;
    const ch = supabase
      .channel(`bookings-${slug}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "bookings",
        filter: `service_slug=eq.${slug}`,
      }, () => {
        supabase.from("bookings").select("*").eq("service_slug", slug)
          .order("created_at", { ascending: false }).limit(50)
          .then(({ data }) => setBookings(data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug]);

  // Presence for online users
  useEffect(() => {
    if (!user || !slug) return;
    const ch = supabase.channel(`presence-${slug}`, { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineUsers(Object.keys(state));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, name: userProfile?.display_name || "User" });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [user, slug, userProfile]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || !slug || sending) return;
    setSending(true);
    const role = userRoles[0] || "user";
    await supabase.from("internal_messages").insert({
      service_slug: slug,
      user_id: user.id,
      user_name: userProfile?.display_name || user.email || "User",
      user_role: role,
      message: newMsg.trim(),
      message_type: "text",
    } as any);
    setNewMsg("");
    setSending(false);
  };

  const unassignedBookings = bookings.filter(b => !b.provider_id && b.status !== "cancelled" && b.status !== "completed");
  const activeBookings = bookings.filter(b => b.status !== "cancelled" && b.status !== "completed");
  const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.package_price, 0);
  const emergencyCount = bookings.filter(b => b.is_emergency && b.status !== "completed" && b.status !== "cancelled").length;

  if (!user) return <div className="flex items-center justify-center min-h-screen"><p>লগইন করুন</p></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {serviceInfo?.title || slug}
              </h1>
              <p className="text-xs text-muted-foreground">ইন্টার্নাল টিম চ্যানেল</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {onlineUsers.length} অনলাইন
            </div>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4 p-0 lg:p-4">
        {/* Left: Live Dashboard */}
        <div className="lg:col-span-1 border-r lg:border-r-0 overflow-auto">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="w-full rounded-none lg:rounded-lg">
              <TabsTrigger value="overview" className="flex-1 text-xs">ওভারভিউ</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1 text-xs">বুকিং</TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 text-xs">রিকোয়েস্ট</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-3 space-y-3">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={<BarChart3 className="h-4 w-4" />} label="মোট বুকিং" value={bookings.length} color="text-primary" />
                <StatCard icon={<Activity className="h-4 w-4" />} label="সক্রিয়" value={activeBookings.length} color="text-blue-600" />
                <StatCard icon={<DollarSign className="h-4 w-4" />} label="রেভিনিউ" value={`৳${totalRevenue.toLocaleString("bn-BD")}`} color="text-green-600" />
                <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="জরুরী" value={emergencyCount} color="text-red-600" />
              </div>

              {/* Unassigned Alert */}
              {unassignedBookings.length > 0 && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                    <UserPlus className="h-4 w-4" />
                    {unassignedBookings.length}টি অ্যাসাইন ছাড়া বুকিং!
                  </div>
                  {unassignedBookings.slice(0, 3).map(b => (
                    <div key={b.id} className="text-xs text-muted-foreground ml-6 mb-1">
                      • {b.customer_name} — {b.package_name} ({b.booking_date})
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Commission Info */}
              {serviceInfo?.commission_percent && (
                <Card className="border-dashed">
                  <CardContent className="p-3 text-sm">
                    <span className="text-muted-foreground">কমিশন হার:</span>
                    <span className="font-bold text-primary ml-2">{serviceInfo.commission_percent}%</span>
                    <span className="text-muted-foreground ml-2">
                      (৳{Math.round(totalRevenue * (serviceInfo.commission_percent / 100)).toLocaleString("bn-BD")})
                    </span>
                  </CardContent>
                </Card>
              )}

              {/* Online Team */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> টিম মেম্বার অনলাইন
                </p>
                <div className="flex flex-wrap gap-1">
                  {onlineUsers.length === 0 && <p className="text-xs text-muted-foreground">কেউ অনলাইন নেই</p>}
                  {onlineUsers.map(uid => (
                    <Badge key={uid} variant="secondary" className="text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                      {uid.substring(0, 6)}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="p-3 space-y-2 max-h-[60vh] overflow-auto">
              {bookings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">কোনো বুকিং নেই</p>}
              {bookings.map(b => (
                <motion.div key={b.id} layout className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.customer_name}</span>
                    <Badge className={`text-[10px] ${statusColors[b.status] || ""}`}>{b.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.customer_phone}</div>
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.booking_date} • {b.booking_time}</div>
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />৳{b.package_price} — {b.package_name}</div>
                    {!b.provider_id && (
                      <div className="flex items-center gap-1 text-destructive font-medium">
                        <UserPlus className="h-3 w-3" />অ্যাসাইন করা হয়নি
                      </div>
                    )}
                    {b.is_emergency && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />জরুরী
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="requests" className="p-3 space-y-2 max-h-[60vh] overflow-auto">
              {requests.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">কোনো রিকোয়েস্ট নেই</p>}
              {requests.map(r => (
                <motion.div key={r.id} layout className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.customer_name}</span>
                    <Badge className={`text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.customer_phone}</div>
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.district}, {r.division}</div>
                    <p className="line-clamp-2">{r.service_description}</p>
                    {!r.assigned_rep_id && (
                      <div className="flex items-center gap-1 text-destructive font-medium">
                        <UserPlus className="h-3 w-3" />প্রতিনিধি অ্যাসাইন হয়নি
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Chat Area */}
        <div className="lg:col-span-2 flex flex-col h-[calc(100vh-65px)] lg:h-[calc(100vh-96px)]">
          {/* Chat header */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">টিম চ্যাট</span>
              <Badge variant="outline" className="text-[10px]">{messages.length} মেসেজ</Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" /> লাইভ
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-1" />
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {messages.map(msg => {
                  const isMe = msg.user_id === user?.id;
                  const isSystem = msg.message_type === "system" || msg.message_type === "alert";

                  if (isSystem) {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center"
                      >
                        <div className={`text-xs px-3 py-1.5 rounded-full ${
                          msg.message_type === "alert"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {msg.message}
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${roleColors[msg.user_role] || ""}`}>
                          {msg.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs font-semibold ${roleColors[msg.user_role] || "text-foreground"}`}>
                            {msg.user_name}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {roleBadges[msg.user_role] || msg.user_role}
                          </Badge>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          {msg.message}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(msg.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {messages.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">এই সেবার জন্য এখনো কোনো মেসেজ নেই</p>
                  <p className="text-xs mt-1">টিমের সাথে আলোচনা শুরু করুন!</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3 bg-card">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="মেসেজ লিখুন..."
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={!newMsg.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 flex items-center gap-2">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
