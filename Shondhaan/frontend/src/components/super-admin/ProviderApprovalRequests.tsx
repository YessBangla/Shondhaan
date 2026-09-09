import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface ProviderApplication {
  user_id: number | string;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  service_category?: string | null;
  experience_years?: number | string | null;
  nid_front?: string | null;
  nid_back?: string | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  status?: ApplicationStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const SERVICE_API_BASE_URL = import.meta.env.VITE_SERVICE_API_BASE_URL || "";

function getDisplayName(application: ProviderApplication) {
  return application.full_name || application.name || application.business_name || "Unnamed provider";
}

function getFileUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVICE_API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

function statusBadge(status?: string | null) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "rejected") return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

const ProviderApprovalRequests = () => {
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => applications.filter((application) => (application.status || "pending") === "pending").length,
    [applications]
  );

  const fetchApplications = useCallback(async () => {
    const auth = getMySqlAuth();
    if (!auth?.token) {
      toast.error("Super admin login is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SERVICE_API_BASE_URL}/api/providers/applications?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not load provider requests");
      setApplications(data.applications || []);
    } catch (error: any) {
      toast.error(error.message || "Could not load provider requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateApplicationStatus = async (userId: number | string, status: ApplicationStatus) => {
    const auth = getMySqlAuth();
    if (!auth?.token) throw new Error("Super admin login is required");

    const response = await fetch(`${SERVICE_API_BASE_URL}/api/providers/applications/${userId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not update provider request");
    return data.application as ProviderApplication;
  };

  const handleDecision = async (application: ProviderApplication, status: ApplicationStatus) => {
    const userId = application.user_id;
    if (!userId) {
      toast.error("This request is missing a central user id");
      return;
    }

    setActingUserId(String(userId));
    try {
      const updated = await updateApplicationStatus(userId, status);
      setApplications((current) =>
        current
          .map((item) => (String(item.user_id) === String(userId) ? updated : item))
          .filter((item) => statusFilter === "all" || (item.status || "pending") === statusFilter)
      );
      toast.success(status === "approved" ? "Provider approved" : "Provider request rejected");
    } catch (error: any) {
      toast.error(error.message || "Could not update provider request");
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Provider Requests</h2>
            <Badge variant="outline" className={statusBadge("pending")}>{pendingCount} pending</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review Join Us applications and grant provider access after verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button type="button" variant="outline" onClick={fetchApplications} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>NID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading provider requests...
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No provider requests found.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => {
                const userId = String(application.user_id);
                const disabled = actingUserId === userId;
                const frontUrl = getFileUrl(application.nid_front_url || application.nid_front);
                const backUrl = getFileUrl(application.nid_back_url || application.nid_back);
                const status = application.status || "pending";

                return (
                  <TableRow key={userId}>
                    <TableCell>
                      <div className="font-medium text-foreground">{getDisplayName(application)}</div>
                      <div className="text-xs text-muted-foreground">{application.email || "No email"}</div>
                      <div className="text-xs text-muted-foreground">{application.phone || application.mobile || "No phone"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{application.service_category || "Not selected"}</div>
                      <div className="text-xs text-muted-foreground">
                        {application.experience_years ?? 0} years experience
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {frontUrl && (
                          <a
                            href={frontUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Front <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {backUrl && (
                          <a
                            href={backUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Back <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(status)}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleDecision(application, "approved")}
                          disabled={disabled || status === "approved"}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(application, "rejected")}
                          disabled={disabled || status === "rejected"}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProviderApprovalRequests;
