import { useEffect, useState, useCallback } from "react";
import { Loader2, Briefcase, Wallet, CheckCircle2, XCircle, Hourglass, Undo2, CalendarClock, MapPin, Video, Phone } from "lucide-react";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";

const JOB_API_BASE = import.meta.env.VITE_JOB_API_BASE || import.meta.env.VITE_YESSJOB_API_URL || "";

interface JobApplication {
  id: number;
  job_id: number;
  jobseeker_id: number;
  expected_salary: number | null;
  cover_letter: string | null;
  status: "pending" | "shortlisted" | "rejected" | "hired" | "withdrawn";
  hiring_stage: string;
  score: number | null;
  interviewer_notes: string | null;
  attendance: "present" | "absent" | "no_show" | null;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_company_name: string;
  job_owner_id: number;
}

interface Interview {
  id: number;
  application_id: number;
  interview_type: "in-person" | "online" | "phone";
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  notes: string | null;
  status: "scheduled" | "completed" | "cancelled" | "declined";
}

const STATUS_STYLES: Record<string, { label: string; labelBn: string; icon: JSX.Element; className: string }> = {
  pending:     { label: "Pending",     labelBn: "অপেক্ষমাণ",     icon: <Hourglass className="h-3.5 w-3.5" />,    className: "bg-amber-50 text-amber-600 border-amber-200" },
  shortlisted: { label: "Shortlisted", labelBn: "শর্টলিস্টেড",   icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-blue-50 text-blue-600 border-blue-200" },
  hired:       { label: "Hired",       labelBn: "নিয়োগপ্রাপ্ত",  icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  rejected:    { label: "Rejected",    labelBn: "প্রত্যাখ্যাত",  icon: <XCircle className="h-3.5 w-3.5" />,      className: "bg-rose-50 text-rose-600 border-rose-200" },
  withdrawn:   { label: "Withdrawn",   labelBn: "প্রত্যাহৃত",    icon: <Undo2 className="h-3.5 w-3.5" />,        className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const INTERVIEW_TYPE_ICON: Record<string, JSX.Element> = {
  "in-person": <MapPin className="h-3.5 w-3.5" />,
  online: <Video className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
};

const JobApplicationsTab = ({ bn }: { bn: boolean }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [interviewsByApp, setInterviewsByApp] = useState<Record<number, Interview>>({});
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const mysqlAuth = getMySqlAuth();
    if (!mysqlAuth?.token) {
      setApplications([]);
      setInterviewsByApp({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const authHeader = { Authorization: `Bearer ${mysqlAuth.token}` };
    try {
      const [appsRes, interviewsRes] = await Promise.all([
        fetch(`${JOB_API_BASE}/api/jobseeker/applications/mine`, { headers: authHeader }),
        fetch(`${JOB_API_BASE}/api/interviews/jobseeker/mine`, { headers: authHeader }),
      ]);

      const appsData = await appsRes.json().catch(() => null);
      if (!appsRes.ok) throw new Error((appsData && appsData.message) || "Failed to load applications");
      setApplications(Array.isArray(appsData) ? appsData : []);

      const interviewsData = await interviewsRes.json().catch(() => null);
      if (interviewsRes.ok && Array.isArray(interviewsData)) {
        const map: Record<number, Interview> = {};
        // Only keep the interview if it's still live (scheduled); a
        // declined/cancelled one shouldn't surface as "upcoming".
        for (const iv of interviewsData) {
          if (iv.status === "scheduled") map[iv.application_id] = iv;
        }
        setInterviewsByApp(map);
      }
    } catch (err) {
      console.error("fetchApplications error:", err);
      toast.error(bn ? "আবেদন লোড ব্যর্থ" : "Failed to load applications");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [bn]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleWithdraw = async (id: number) => {
    if (!confirm(bn ? "আবেদন প্রত্যাহার করবেন?" : "Withdraw this application?")) return;
    const mysqlAuth = getMySqlAuth();
    if (!mysqlAuth?.token) return;

    setWithdrawingId(id);
    try {
      const res = await fetch(`${JOB_API_BASE}/api/jobseeker/applications/${id}/withdraw`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${mysqlAuth.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Withdraw failed");

      // Update in place — card stays, just switches to the withdrawn state.
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: "withdrawn" } : a)));
      setInterviewsByApp((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(bn ? "আবেদন প্রত্যাহার হয়েছে" : "Application withdrawn");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (bn ? "ব্যর্থ" : "Failed"));
    } finally {
      setWithdrawingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-base text-muted-foreground">{bn ? "কোনো আবেদন নেই" : "No job applications yet"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-primary" />
        {bn ? "আমার আবেদনসমূহ" : "My Applications"}
        <span className="text-xs text-muted-foreground font-normal">({applications.length})</span>
      </h2>
      {applications.map((app) => {
        const statusInfo = STATUS_STYLES[app.status] || STATUS_STYLES.pending;
        const isWithdrawn = app.status === "withdrawn";
        const canWithdraw = !isWithdrawn && !["hired", "rejected"].includes(app.status);
        const interview = interviewsByApp[app.id];

        return (
          <div
            key={app.id}
            className={`rounded-xl border border-border bg-card p-4 space-y-2 transition-opacity ${isWithdrawn ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-foreground">{app.job_title}</p>
                <p className="text-sm text-muted-foreground">{app.job_company_name}</p>
              </div>
              <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusInfo.className}`}>
                {statusInfo.icon}
                {bn ? statusInfo.labelBn : statusInfo.label}
              </span>
            </div>

            {app.expected_salary != null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                {bn ? "প্রত্যাশিত বেতন" : "Expected salary"}: ৳{app.expected_salary}
              </div>
            )}

            {app.score != null && (
              <p className="text-xs text-muted-foreground">
                {bn ? "স্কোর" : "Score"}: {app.score}/100
              </p>
            )}

            {interview && !isWithdrawn && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {bn ? "ইন্টারভিউ নির্ধারিত" : "Interview scheduled"}
                </div>
                <p className="text-xs text-foreground">
                  {new Date(interview.scheduled_at).toLocaleString(bn ? "bn-BD" : "en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · "}{interview.duration_minutes} {bn ? "মিনিট" : "min"}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {INTERVIEW_TYPE_ICON[interview.interview_type]}
                  {interview.interview_type === "in-person" && interview.location}
                  {interview.interview_type === "online" && (interview.meeting_link || (bn ? "অনলাইন" : "Online"))}
                  {interview.interview_type === "phone" && (bn ? "ফোন ইন্টারভিউ" : "Phone interview")}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {bn ? "আবেদনের তারিখ" : "Applied on"}: {new Date(app.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US")}
              </p>
              {canWithdraw && (
                <button
                  onClick={() => handleWithdraw(app.id)}
                  disabled={withdrawingId === app.id}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  {withdrawingId === app.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  {bn ? "প্রত্যাহার" : "Withdraw"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobApplicationsTab;
