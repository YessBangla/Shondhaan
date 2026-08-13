import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROLES, getRoleConfig, type RoleKey } from "@/config/roles";
import {
  ADMIN_ACCESS_BY_ROLE,
  canAccessAdminPath,
  isGlobalAdminRole,
} from "@/config/adminAccess";
import { getMySqlAuth, listMySqlUsers, updateMySqlUserType } from "@/lib/mysqlAuth";
import { ArrowLeft, ExternalLink, Phone, ShieldAlert, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffAssignmentManager from "@/components/admin/StaffAssignmentManager";

interface RoleUser {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  type: RoleKey;
}

const AdminRoleDetail = () => {
  const { role } = useParams<{ role: RoleKey }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = role ? getRoleConfig(role) : undefined;

  const [users, setUsers] = useState<RoleUser[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  const auth = getMySqlAuth();
  const isAdmin = isGlobalAdminRole(auth?.user.type);

  useEffect(() => {
    document.title = `${config?.labelEn || "Role"} | Yess`;
  }, [config]);

  const load = async () => {
    if (!role) return;
    const { users: rows } = await listMySqlUsers();
    setUsers(
      rows
        .filter((user) => user.type === role)
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          type: user.type,
        })),
    );
  };

  useEffect(() => {
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

    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, navigate]);

  const removeAssignment = async (userId: number) => {
    if (!confirm("Change this user's type back to user?")) return;
    try {
      await updateMySqlUserType(userId, "user");
      toast({ title: "Updated", description: "User type changed to user." });
      await load();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  };

  const accessRows = useMemo(() => {
    if (!role) return [];
    const access = ADMIN_ACCESS_BY_ROLE[role];
    if (!access) return [];
    if (access === "*") return ["All admin pages"];
    return access;
  }, [role]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Access denied</h1>
        <Link to="/" className="text-sm text-primary underline">Back home</Link>
      </div>
    );
  }

  if (!config || !role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <h1 className="text-xl font-bold">Role not found</h1>
        <Link to="/admin/roles" className="text-sm text-primary underline">Back to roles</Link>
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
            Role list
          </Link>
        </div>

        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-5 md:p-7 text-white shadow-lg mb-5`}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold">{config.labelEn}</h1>
              <p className="text-xs md:text-sm text-white/80">{role}</p>
              <p className="text-sm mt-2 text-white/90">{config.descriptionBn}</p>
              {canAccessAdminPath(role, config.panelPath) && (
                <Link
                  to={config.panelPath}
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-white text-foreground text-xs font-semibold hover:bg-white/90"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open panel
                </Link>
              )}
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-5">
          <h2 className="text-base md:text-lg font-bold mb-3">
            MySQL users with this type ({users.length})
          </h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No users currently have this type.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.mobile && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {user.mobile}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAssignFor(assignFor === String(user.id) ? null : String(user.id))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                          assignFor === String(user.id)
                            ? "bg-primary text-white border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        Assign service
                      </button>
                      <button
                        onClick={() => removeAssignment(user.id)}
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

        {assignFor && isAdmin && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-base font-bold">
                {users.find((user) => String(user.id) === assignFor)?.name || "User"} assignment
              </h3>
              <button
                onClick={() => setAssignFor(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <StaffAssignmentManager mode="admin" lockedUserId={assignFor} />
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-bold mb-3">Allowed admin pages</h2>
          {accessRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No admin pages are configured for this role.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accessRows.map((path) => (
                <span key={path} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  {path}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          {ROLES.filter((item) => item.key !== role).map((item) => (
            <Link
              key={item.key}
              to={`/admin/roles/${item.key}`}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted"
            >
              {item.labelEn}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminRoleDetail;
