import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollText, Search } from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
};

const actionColor: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-700",
  UPDATE: "bg-blue-500/15 text-blue-700",
  DELETE: "bg-rose-500/15 text-rose-700",
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data as AuditLog[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.entity_type.toLowerCase().includes(q) ||
      (l.user_email ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">অডিট লগ</h1>
        <span className="ml-auto text-xs text-muted-foreground">সর্বশেষ ২০০ এন্ট্রি</span>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="খুঁজুন: টেবিল, ইমেইল, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">কোনো লগ পাওয়া যায়নি</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge className={actionColor[log.action] ?? "bg-muted"}>{log.action}</Badge>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{log.entity_type}</span>
                  <span className="text-muted-foreground text-xs">{log.entity_id?.slice(0, 8)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("bn-BD")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {log.user_email ?? "সিস্টেম"}
                </div>
                {log.action === "UPDATE" && log.old_value && log.new_value && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-primary">পরিবর্তন দেখুন</summary>
                    <pre className="mt-2 bg-muted/50 p-2 rounded overflow-x-auto text-[11px]">
                      {JSON.stringify(diffObjects(log.old_value, log.new_value), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

function diffObjects(oldV: any, newV: any) {
  const diff: Record<string, { from: any; to: any }> = {};
  const keys = new Set([...Object.keys(oldV ?? {}), ...Object.keys(newV ?? {})]);
  keys.forEach((k) => {
    if (JSON.stringify(oldV?.[k]) !== JSON.stringify(newV?.[k])) {
      diff[k] = { from: oldV?.[k], to: newV?.[k] };
    }
  });
  return diff;
}

export default AdminAuditLogs;