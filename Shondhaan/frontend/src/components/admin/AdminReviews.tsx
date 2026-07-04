import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Star, User, MessageSquare, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  service_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  user_id: string;
  created_at: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("service_reviews").select("*").order("created_at", { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm("এই রিভিউ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("service_reviews").delete().eq("id", id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("রিভিউ মুছে ফেলা হয়েছে");
    } else {
      toast.error("মুছতে পারা যায়নি");
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">রিভিউ ({reviews.length})</h3>
          <p className="text-xs text-muted-foreground">গড় রেটিং: ⭐ {avgRating}</p>
        </div>
        <button onClick={fetch} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      <div className="space-y-2">
        {reviews.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো রিভিউ নেই</p>
        ) : reviews.map(r => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {r.reviewer_name}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">({r.rating}/5)</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString("bn-BD")}</span>
                <button onClick={() => handleDelete(r.id)} className="p-1 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {r.comment && (
              <p className="text-xs text-foreground flex items-start gap-1.5 bg-secondary/50 rounded-lg p-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {r.comment}
              </p>
            )}
            <p className="text-[10px] text-primary">সার্ভিস: {r.service_slug}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviews;
