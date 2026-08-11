import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Users, CreditCard, Check, X, Settings, Key, Globe,
  Webhook, Activity, BarChart3, Shield, Clock, Zap, Eye, EyeOff, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: "monthly" | "yearly";
  features: string[];
  activeUsers: number;
  maxUsers: number;
  isActive: boolean;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  isActive: boolean;
}

const initialPlans: Plan[] = [
  { id: "1", name: "স্টার্টার", price: 999, period: "monthly", features: ["৫ জন ইউজার", "বেসিক CMS", "ইমেইল সাপোর্ট"], activeUsers: 12, maxUsers: 5, isActive: true },
  { id: "2", name: "প্রফেশনাল", price: 2999, period: "monthly", features: ["২৫ জন ইউজার", "সম্পূর্ণ CMS", "POS সিস্টেম", "অগ্রাধিকার সাপোর্ট"], activeUsers: 45, maxUsers: 25, isActive: true },
  { id: "3", name: "এন্টারপ্রাইজ", price: 9999, period: "monthly", features: ["আনলিমিটেড ইউজার", "সকল ফিচার", "ডেডিকেটেড সাপোর্ট", "কাস্টম ইন্টিগ্রেশন", "SLA গ্যারান্টি"], activeUsers: 8, maxUsers: 999, isActive: true },
];

const initialAPIKeys: APIKey[] = [
  { id: "1", name: "প্রোডাকশন API", key: "ys_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456", created: "২০২৬-০১-১৫", lastUsed: "২০২৬-০৩-২৬", isActive: true },
  { id: "2", name: "টেস্ট API", key: "ys_test_xYzAbCdEfGhIjKlMnOpQrStUvWx789012", created: "২০২৬-০২-২০", lastUsed: "২০২৬-০৩-২৫", isActive: true },
  { id: "3", name: "ওয়েবহুক সিক্রেট", key: "whsec_AbCdEfGhIjKlMnOpQrStUvWxYz345678", created: "২০২৬-০৩-০১", lastUsed: "২০২৬-০৩-২৬", isActive: false },
];

const SaaSManagement = () => {
  const [plans, setPlans] = useState(initialPlans);
  const [apiKeys, setApiKeys] = useState(initialAPIKeys);
  const [activeView, setActiveView] = useState<"plans" | "api" | "webhooks" | "monitoring">("plans");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [webhookUrl, setWebhookUrl] = useState("https://");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["booking.created"]);

  const toggleKeyVisibility = (id: string) => setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  const copyKey = (key: string) => { navigator.clipboard.writeText(key); toast.success("কপি করা হয়েছে!"); };
  const toggleAPIKey = (id: string) => setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k));

  const availableEvents = [
    "booking.created", "booking.updated", "booking.cancelled",
    "payment.received", "payment.refunded",
    "order.placed", "order.shipped", "order.delivered",
    "user.registered", "user.role_changed",
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Sub Nav */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "plans" as const, icon: <Crown className="h-4 w-4" />, label: "সাবস্ক্রিপশন" },
          { value: "api" as const, icon: <Key className="h-4 w-4" />, label: "API কী" },
          { value: "webhooks" as const, icon: <Webhook className="h-4 w-4" />, label: "ওয়েবহুক" },
          { value: "monitoring" as const, icon: <Activity className="h-4 w-4" />, label: "মনিটরিং" },
        ].map(tab => (
          <button key={tab.value} onClick={() => setActiveView(tab.value)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeView === tab.value ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeView === "plans" && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> সাবস্ক্রিপশন প্ল্যান ম্যানেজমেন্ট
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-xl border bg-card p-5 shadow-sm ${i === 1 ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                {i === 1 && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full mb-3 inline-block">সবচেয়ে জনপ্রিয়</span>}
                <h4 className="font-heading text-lg font-bold text-foreground">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-primary">৳{plan.price.toLocaleString("bn-BD")}</span>
                  <span className="text-xs text-muted-foreground">/মাস</span>
                </div>
                <div className="mt-3 space-y-2">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>সক্রিয় ইউজার</span>
                    <span className="font-semibold text-foreground">{plan.activeUsers}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${Math.min(100, (plan.activeUsers / plan.maxUsers) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 text-xs"><Settings className="h-3.5 w-3.5 mr-1" /> এডিট</Button>
                  <Button variant={plan.isActive ? "destructive" : "default"} size="sm" className="flex-1 text-xs"
                    onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p))}>
                    {plan.isActive ? "নিষ্ক্রিয়" : "সক্রিয়"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Revenue Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> সাবস্ক্রিপশন রেভিনিউ সামারি
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-lg font-bold text-foreground">৳৮৯,৫০০</p><p className="text-xs text-muted-foreground">মাসিক রেভিনিউ</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-lg font-bold text-foreground">৬৫</p><p className="text-xs text-muted-foreground">সক্রিয় সাবস্ক্রিপশন</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-lg font-bold text-green-600">+১২%</p><p className="text-xs text-muted-foreground">গত মাসের তুলনায়</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-lg font-bold text-foreground">৩.২%</p><p className="text-xs text-muted-foreground">চার্ন রেট</p></div>
            </div>
          </div>
        </div>
      )}

      {activeView === "api" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> API কী ম্যানেজমেন্ট</h3>
            <Button size="sm" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" /> নতুন কী</Button>
          </div>
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${key.isActive ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm font-semibold text-foreground">{key.name}</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toggleAPIKey(key.id)}>
                    {key.isActive ? "নিষ্ক্রিয়" : "সক্রিয়"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 text-xs bg-secondary/50 rounded-lg px-3 py-2 font-mono text-foreground overflow-hidden">
                    {showKeys[key.id] ? key.key : key.key.slice(0, 12) + "••••••••••••••••"}
                  </code>
                  <button onClick={() => toggleKeyVisibility(key.id)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                    {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => copyKey(key.key)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>তৈরি: {key.created}</span>
                  <span>শেষ ব্যবহার: {key.lastUsed}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> API ব্যবহারের পরিসংখ্যান</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-card p-3"><p className="text-lg font-bold text-foreground">১২,৪৫৬</p><p className="text-xs text-muted-foreground">আজকের রিকোয়েস্ট</p></div>
              <div className="rounded-lg bg-card p-3"><p className="text-lg font-bold text-foreground">৯৯.৮%</p><p className="text-xs text-muted-foreground">আপটাইম</p></div>
              <div className="rounded-lg bg-card p-3"><p className="text-lg font-bold text-foreground">১৪৫ms</p><p className="text-xs text-muted-foreground">গড় রেসপন্স</p></div>
            </div>
          </div>
        </div>
      )}

      {activeView === "webhooks" && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /> ওয়েবহুক সেটআপ</h3>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">এন্ডপয়েন্ট URL</label>
              <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-app.com/webhook" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">ইভেন্ট সিলেক্ট করুন</label>
              <div className="grid grid-cols-2 gap-2">
                {availableEvents.map(event => (
                  <button key={event} onClick={() => setWebhookEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event])}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      webhookEvents.includes(event) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}>
                    {webhookEvents.includes(event) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    <code className="font-mono">{event}</code>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full gap-2"><Globe className="h-4 w-4" /> ওয়েবহুক সেভ করুন</Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> সাম্প্রতিক ওয়েবহুক ডেলিভারি</h4>
            <div className="space-y-2">
              {["booking.created — 200 OK — ১৪৫ms", "payment.received — 200 OK — ৮৯ms", "order.placed — 500 Error — ২৩৪ms"].map((log, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 text-xs font-mono ${log.includes("Error") ? "bg-destructive/10 text-destructive" : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"}`}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === "monitoring" && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> সিস্টেম মনিটরিং</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "CPU ব্যবহার", value: "২৩%", color: "text-green-600" },
              { label: "মেমোরি", value: "৫৬%", color: "text-yellow-600" },
              { label: "স্টোরেজ", value: "৩৪%", color: "text-blue-600" },
              { label: "ব্যান্ডউইথ", value: "১.২ GB/h", color: "text-purple-600" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">সার্ভিস হেলথ</h4>
            <div className="space-y-2">
              {[
                { name: "ওয়েব অ্যাপ", status: "operational", uptime: "৯৯.৯৯%" },
                { name: "API সার্ভার", status: "operational", uptime: "৯৯.৯৮%" },
                { name: "ডাটাবেস", status: "operational", uptime: "৯৯.৯৯%" },
                { name: "স্টোরেজ", status: "operational", uptime: "১০০%" },
                { name: "পেমেন্ট গেটওয়ে", status: "degraded", uptime: "৯৮.৫%" },
              ].map((service, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${service.status === "operational" ? "bg-green-500" : "bg-yellow-500"}`} />
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{service.uptime}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${service.status === "operational" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {service.status === "operational" ? "চালু" : "সমস্যা"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSManagement;
