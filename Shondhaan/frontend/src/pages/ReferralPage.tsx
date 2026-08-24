import { useEffect, useState } from "react";
import { Copy, Gift, Loader2, Users, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/contexts/ReferalContext";

const ReferralPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stats, loading, generateCode, claimReward } = useReferral();
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, navigate, user]);

  const handleGenerate = async () => {
    setGenerating(true);
    await generateCode();
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!stats?.code?.link) return;
    await navigator.clipboard.writeText(stats.code.link);
    toast.success("Referral link copied");
  };

  const handleClaim = async (rewardId: number) => {
    setClaiming(rewardId);
    await claimReward(rewardId);
    setClaiming(null);
  };

  if (authLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const summary = stats?.summary;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="app-container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Share the good work</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-foreground">Referral rewards</h1>
          <p className="mt-2 text-sm text-muted-foreground">Invite friends and earn rewards when they complete their first booking.</p>
        </div>

        <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Gift className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold text-foreground">Your referral link</h2>
              <p className="text-sm text-muted-foreground">One active link can be shared with your friends.</p>
            </div>
          </div>
          {stats?.code ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input readOnly value={stats.code.link} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
              <Button onClick={handleCopy}><Copy /> Copy link</Button>
            </div>
          ) : (
            <Button className="mt-5" onClick={handleGenerate} disabled={generating || loading}>
              {generating && <Loader2 className="animate-spin" />}
              Generate referral link
            </Button>
          )}
          {stats?.code && <p className="mt-3 text-xs text-muted-foreground">{stats.code.used_count} of {stats.code.max_uses} uses completed</p>}
        </section>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Users />} label="People referred" value={summary?.total_referred ?? 0} />
          <Stat icon={<Wallet />} label="Total earned" value={`৳${summary?.total_earned ?? 0}`} />
          <Stat icon={<Gift />} label="Available rewards" value={`৳${summary?.pending_rewards ?? 0}`} />
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <ListSection title="Your referrals">
            {stats?.referrals.length ? stats.referrals.map((referral, index) => (
              <div key={`${referral.created_at}-${index}`} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div><p className="text-sm font-medium text-foreground">{referral.referred_name}</p><p className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</p></div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">{referral.status}</span>
              </div>
            )) : <p className="py-6 text-sm text-muted-foreground">No referrals yet.</p>}
          </ListSection>

          <ListSection title="Rewards">
            {stats?.rewards.length ? stats.rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div><p className="text-sm font-medium text-foreground">{reward.role} reward</p><p className="text-xs capitalize text-muted-foreground">{reward.status}</p></div>
                <div className="flex items-center gap-3"><span className="text-sm font-semibold text-foreground">৳{reward.reward_amount}</span>{reward.status === "available" && <Button size="sm" onClick={() => handleClaim(reward.id)} disabled={claiming === reward.id}>{claiming === reward.id ? <Loader2 className="animate-spin" /> : "Claim"}</Button>}</div>
              </div>
            )) : <p className="py-6 text-sm text-muted-foreground">No rewards yet.</p>}
          </ListSection>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-primary">{icon}<span className="text-xs font-medium text-muted-foreground">{label}</span></div><p className="font-heading text-xl font-bold text-foreground">{value}</p></div>;
}

function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card px-4 shadow-sm"><h2 className="border-b border-border py-4 font-semibold text-foreground">{title}</h2>{children}</section>;
}

export default ReferralPage;
