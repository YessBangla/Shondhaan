import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/config/roles";
import { ArrowLeft, Users, ChevronRight, ShieldAlert } from "lucide-react";

const AdminRoles = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "রোল ম্যানেজমেন্ট | Yess";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/main-login");
      return;
    }
    (async () => {
      const { data: myRoles } = await supabase.rpc("get_my_roles");
      const roles = (myRoles as string[] | null) || [];
      const ok = roles.some((r) => ["super_admin", "admin", "moderator"].includes(r));
      setAllowed(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase.from("user_roles").select("role");
      const map: Record<string, number> = {};
      (rows || []).forEach((r: any) => {
        map[r.role] = (map[r.role] || 0) + 1;
      });
      setCounts(map);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        লোড হচ্ছে...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-sm text-muted-foreground">এই পেইজটি দেখতে অ্যাডমিন বা মডারেটর রোল প্রয়োজন।</p>
        <Link to="/" className="text-sm text-primary underline">হোমে ফিরুন</Link>
      </div>
    );
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-3 py-4 md:py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin" className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg md:text-2xl font-bold">রোল ম্যানেজমেন্ট</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {ROLES.length}টি রোল • মোট {total} জন অ্যাসাইনড ইউজার
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const count = counts[role.key] || 0;
            return (
              <Link
                key={role.key}
                to={`/admin/roles/${role.key}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-lg transition-all"
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${role.gradient} opacity-10 group-hover:opacity-20 transition`} />
                <div className="relative flex items-start gap-3">
                  <div className={`shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${role.gradient} text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm md:text-base truncate">{role.labelBn}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {role.descriptionBn}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className={`font-semibold ${role.accent}`}>{count}</span>
                      <span className="text-muted-foreground">জন</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      
    </div>
  );
};

export default AdminRoles;