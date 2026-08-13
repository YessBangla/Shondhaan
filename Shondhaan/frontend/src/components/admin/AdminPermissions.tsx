import { Shield } from "lucide-react";
import { ADMIN_ACCESS_BY_ROLE } from "@/config/adminAccess";
import { ROLES } from "@/config/roles";

const AdminPermissions = () => {
  const roleRows = ROLES.filter((role) => ADMIN_ACCESS_BY_ROLE[role.key]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5" /> MySQL role access
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin access is controlled by the backend user type. No Supabase permission table is used here.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {roleRows.map((role) => {
          const access = ADMIN_ACCESS_BY_ROLE[role.key];
          const paths = access === "*" ? ["All admin sections"] : access || [];

          return (
            <section key={role.key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground">{role.labelEn}</h4>
                  <p className="text-xs text-muted-foreground">{role.key}</p>
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                  {access === "*" ? "Full access" : `${paths.length} sections`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {paths.map((path) => (
                  <span key={path} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                    {path}
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPermissions;
