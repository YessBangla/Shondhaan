import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES, getRoleConfig } from "@/config/roles";
import { ArrowLeft, ExternalLink, Phone, Trash2, ShieldAlert, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffAssignmentManager from "@/components/admin/StaffAssignmentManager";

interface RoleUser {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

interface PermRow {
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const AdminRoleDetail = () => {
  const { role } = useParams<{ role: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = role ? getRoleConfig(role) : undefined;

  const [users, setUsers] = useState<RoleUser[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${config?.labelBn || "রোল"} | Yess`;
  }, [config]);

  const load = async () => {
    if (!role) return;
    const { data: rows } = await supabase
      .from("user_roles")
      .select("id, user_id")
      .eq("role", role as any);
    const ids = (rows || []).map((r) => r.user_id);
    let profiles: any[] = [];
    if (ids.length) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", ids);
      profiles = pData || [];
    }
    const merged: RoleUser[] = (rows || []).map((r) => {
      const p = profiles.find((x) => x.user_id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        display_name: p?.display_name || null,
        phone: p?.phone || null,
      };
    });
    setUsers(merged);

    const { data: permData } = await supabase
      .from("role_permissions")
      .select("resource, can_create, can_read, can_update, can_delete")
      .eq("role", role as any);
    setPerms((permData as PermRow[]) || []);
  };

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
      setIsAdmin(roles.some((r) => ["super_admin", "admin"].includes(r)));
      if (!ok) {
        setLoading(false);
        return;
      }
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, role, navigate]);

  const removeAssignment = async (id: string) => {
    if (!confirm("এই ইউজারের রোল সরাবেন?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "রোল সরানো হয়েছে।" });
      await load();
    }
  };

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
        <Link to="/" className="text-sm text-primary underline">হোমে ফিরুন</Link>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <h1 className="text-xl font-bold">রোল পাওয়া যায়নি</h1>
        <Link to="/admin/roles" className="text-sm text-primary underline">রোল তালিকায় ফিরুন</Link>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-3 py-4 md:py-8 max-w-5xl">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin/roles" className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link to="/admin/roles" className="text-xs text-muted-foreground hover:text-foreground">
            রোল তালিকা
          </Link>
        </div>

        {/* Hero */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-5 md:p-7 text-white shadow-lg mb-5`}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold">{config.labelBn}</h1>
              <p className="text-xs md:text-sm text-white/80">{config.labelEn}</p>
              <p className="text-sm mt-2 text-white/90">{config.descriptionBn}</p>
              <Link
                to={config.panelPath}
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-white text-foreground text-xs font-semibold hover:bg-white/90"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {config.labelBn} প্যানেল খুলুন
              </Link>
            </div>
          </div>
        </div>

        {/* Users */}
        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-5">
          <h2 className="text-base md:text-lg font-bold mb-3">
            অ্যাসাইনড ইউজার ({users.length})
          </h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              এই রোলে এখনো কোনো ইউজার নেই।
            </p>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.display_name || "নামহীন"}
                    </p>
                    {u.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {u.phone}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAssignFor(assignFor === u.user_id ? null : u.user_id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                          assignFor === u.user_id
                            ? "bg-primary text-white border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        সার্ভিস অ্যাসাইন
                      </button>
                      <button
                        onClick={() => removeAssignment(u.id)}
                        className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                        aria-label="Remove role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Per-user assignment panel */}
        {assignFor && isAdmin && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-base font-bold">
                {users.find(u => u.user_id === assignFor)?.display_name || "ইউজার"} — অ্যাসাইনমেন্ট
              </h3>
              <button
                onClick={() => setAssignFor(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                বন্ধ করুন
              </button>
            </div>
            <StaffAssignmentManager mode="admin" lockedUserId={assignFor} />
          </section>
        )}

        {/* Permissions */}
        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-bold mb-3">
            পারমিশন ({perms.length})
          </h2>
          {perms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              এই রোলের জন্য কোনো পারমিশন কনফিগার করা নেই।
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-xs md:text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-3 font-medium">রিসোর্স</th>
                    <th className="py-2 px-2 text-center font-medium">তৈরি</th>
                    <th className="py-2 px-2 text-center font-medium">পড়া</th>
                    <th className="py-2 px-2 text-center font-medium">আপডেট</th>
                    <th className="py-2 px-2 text-center font-medium">মুছা</th>
                  </tr>
                </thead>
                <tbody>
                  {perms.map((p) => (
                    <tr key={p.resource} className="border-b border-border/50">
                      <td className="py-2 px-3 font-medium">{p.resource}</td>
                      {[p.can_create, p.can_read, p.can_update, p.can_delete].map((v, i) => (
                        <td key={i} className="py-2 px-2 text-center">
                          {v ? (
                            <Check className="h-4 w-4 text-green-600 inline" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 inline" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* All roles quick switch */}
        <div className="mt-5 flex flex-wrap gap-2">
          {ROLES.filter((r) => r.key !== role).map((r) => (
            <Link
              key={r.key}
              to={`/admin/roles/${r.key}`}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted"
            >
              {r.labelBn}
            </Link>
          ))}
        </div>
      </main>
      
    </div>
  );
};

export default AdminRoleDetail;