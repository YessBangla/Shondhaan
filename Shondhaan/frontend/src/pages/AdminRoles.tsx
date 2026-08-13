import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLES } from "@/config/roles";
import { isGlobalAdminRole } from "@/config/adminAccess";
import { getMySqlAuth, listMySqlUsers } from "@/lib/mysqlAuth";
import type { RoleKey } from "@/config/roles";
import { ArrowLeft, Users, ChevronRight, ShieldAlert } from "lucide-react";

const AdminRoles = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Role Management | Yess";
  }, []);

  useEffect(() => {
    const auth = getMySqlAuth();
    if (!auth) {
      navigate("/main-login", { replace: true });
      return;
    }

    const ok = isGlobalAdminRole(auth.user.type);
    setAllowed(ok);
    if (!ok) {
      setLoading(false);
      return;
    }

    listMySqlUsers()
      .then(({ users }) => {
        const map: Record<string, number> = {};
        users.forEach((user) => {
          map[user.type] = (map[user.type] || 0) + 1;
        });
        setCounts(map);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="text-sm text-muted-foreground">Only Admin and Super Admin can manage role types.</p>
        <Link to="/" className="text-sm text-primary underline">Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-3 py-4 md:py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin" className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg md:text-2xl font-bold">Role Management</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {ROLES.length} role types · {total} MySQL users
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const count = counts[role.key as RoleKey] || 0;
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
                      <h3 className="font-semibold text-sm md:text-base truncate">{role.labelEn}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {role.key}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className={`font-semibold ${role.accent}`}>{count}</span>
                      <span className="text-muted-foreground">users</span>
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
