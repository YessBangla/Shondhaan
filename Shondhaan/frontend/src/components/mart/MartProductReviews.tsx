import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { MessageSquareReply, Star, Trash2, Loader2, Sparkles } from "lucide-react";
import { useAITools } from "@/hooks/useAITools";
import { createMartSellerNotification, isNumericMartUserId } from "@/lib/martSellerNotifications";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  seller_reply?: string | null;
  seller_reply_at?: string | null;
  seller_reply_by?: string | number | null;
  created_at: string;
}

interface MartProductReviewsProps {
  productId: string;
  productName?: string;
  productUrl?: string;
  vendorId?: string | number | null;
  // Kept for API compatibility with callers; reviews are always MySQL-backed now.
  storage?: "mysql";
  onStatsChange?: (stats: { count: number; avgRating: number }) => void;
}

const MART_API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

function normalizeReview(review: any): Review {
  return {
    ...review,
    id: String(review.id),
    product_id: String(review.product_id),
    user_id: String(review.user_id),
    reviewer_name: review.reviewer_name || review.user_name || review.name || "User",
    rating: Number(review.rating ?? review.star_review ?? 0),
    comment: review.comment ?? review.text_review ?? null,
    seller_reply: review.seller_reply ?? review.reply ?? review.vendor_reply ?? null,
    seller_reply_at: review.seller_reply_at ?? review.replied_at ?? null,
    seller_reply_by: review.seller_reply_by ?? review.replied_by ?? null,
    created_at: review.created_at || new Date().toISOString(),
  };
}

const MartProductReviews = ({ productId, productName, productUrl, vendorId, onStatsChange }: MartProductReviewsProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { summarizeReviews, loading: aiSummarizing } = useAITools();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  const reportStats = useCallback((nextReviews: Review[]) => {
    const avgRating = nextReviews.length > 0
      ? nextReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / nextReviews.length
      : 0;
    onStatsChange?.({ count: nextReviews.length, avgRating });
  }, [onStatsChange]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${MART_API_BASE}/api/reviews?product_id=${encodeURIComponent(productId)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Failed to load reviews");
      }
      const nextReviews = (json.data || []).map((review: any) => normalizeReview(review));
      setReviews(nextReviews);
      reportStats(nextReviews);
    } catch (error) {
      console.error(error);
      toast.error(bn ? "রিভিউ লোড করা যায়নি" : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [bn, productId, reportStats]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  const existingReview = user ? reviews.find(r => String(r.user_id) === String(user.id)) : null;
  const canReplyAsSeller = !!user?.id && !!vendorId && String(user.id) === String(vendorId);

  const notifySellerAboutReview = async (reviewerName: string, reviewRating: number, reviewComment: string | null) => {
    if (!vendorId || String(vendorId) === String(user?.id)) return;
    // Seller notifications only support numeric MySQL user ids.
    if (!isNumericMartUserId(vendorId)) return;

    const commentPreview = reviewComment
      ? reviewComment.length > 100
        ? `${reviewComment.slice(0, 97)}...`
        : reviewComment
      : bn
        ? `${reviewRating}/5 রেটিং দিয়েছেন`
        : `Rated ${reviewRating}/5`;
    const title = bn ? "পণ্যে নতুন রিভিউ এসেছে" : "New product review";
    const message = productName
      ? `${productName}: ${reviewerName} - ${commentPreview}`
      : `${reviewerName} - ${commentPreview}`;

    await createMartSellerNotification({
      userId: vendorId,
      title,
      message,
      type: "mart_product_review",
      productId,
      actionUrl: productUrl ? `${productUrl}?tab=reviews#product-reviews` : null,
    });
  };

  const handleSubmit = async () => {
    if (!user) { toast.error(bn ? "রিভিউ দিতে লগইন করুন" : "Login to review"); return; }
    if (rating === 0) { toast.error(bn ? "রেটিং দিন" : "Select a rating"); return; }

    const mysqlUserId = Number(user.id);
    if (!Number.isInteger(mysqlUserId)) {
      toast.error(bn ? "মার্ট রিভিউ দিতে MySQL অ্যাকাউন্ট দিয়ে লগইন করুন" : "Login with a MySQL account to review this product");
      return;
    }

    setSubmitting(true);
    const reviewerName =
      (user as any).name ||
      user.email?.split("@")[0] ||
      "User";

    let error: unknown = null;
    try {
      const res = await fetch(`${MART_API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: mysqlUserId,
          product_id: productId,
          text_review: comment.trim() || null,
          star_review: rating,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Failed to save review");
      }
    } catch (err) {
      error = err;
    }

    setSubmitting(false);
    if (error) {
      toast.error(bn ? "রিভিউ সংরক্ষণ ব্যর্থ" : "Failed to save review");
      console.error(error);
    } else {
      toast.success(bn ? (existingReview ? "রিভিউ আপডেট হয়েছে" : "রিভিউ যোগ হয়েছে") : (existingReview ? "Review updated" : "Review added"));
      if (!existingReview) {
        await notifySellerAboutReview(reviewerName, rating, comment.trim() || null);
      }
      setRating(5); setComment("");
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    let error: unknown = null;
    try {
      const res = await fetch(`${MART_API_BASE}/api/reviews/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(user?.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Failed to delete review");
      }
    } catch (err) {
      error = err;
    }
    if (!error) {
      toast.success(bn ? "রিভিউ মুছে ফেলা হয়েছে" : "Review deleted");
      setReviews(prev => {
        const nextReviews = prev.filter(r => r.id !== id);
        reportStats(nextReviews);
        return nextReviews;
      });
    } else {
      console.error(error);
      toast.error(bn ? "রিভিউ মুছে ফেলা যায়নি" : "Failed to delete review");
    }
  };

  const handleSellerReply = async (review: Review) => {
    if (!canReplyAsSeller) {
      toast.error(bn ? "Only seller can reply" : "Only seller can reply");
      return;
    }

    const cleanReply = (replyDrafts[review.id] ?? review.seller_reply ?? "").trim();
    if (!cleanReply) return;

    setSubmittingReplyId(review.id);
    const replyPatch: Partial<Review> = {
      seller_reply: cleanReply,
      seller_reply_at: new Date().toISOString(),
      seller_reply_by: user?.id,
    };

    try {
      const res = await fetch(`${MART_API_BASE}/api/reviews/${encodeURIComponent(review.id)}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(user?.id),
          seller_id: vendorId,
          product_id: productId,
          seller_reply: cleanReply,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Failed to save seller reply");
      }
    } catch (error) {
      console.error("Seller review reply save failed", error);
      setSubmittingReplyId(null);
      toast.error(error instanceof Error ? error.message : bn ? "Seller reply save failed" : "Seller reply save failed");
      return;
    }

    setReviews(prev => prev.map(item => item.id === review.id ? { ...item, ...replyPatch } : item));
    setReplyDrafts(prev => ({ ...prev, [review.id]: "" }));
    setSubmittingReplyId(null);
    toast.success(bn ? "Seller reply saved" : "Seller reply saved");
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="text-center md:min-w-[140px]">
          <p className="text-4xl font-extrabold text-foreground">{avgRating}</p>
          <div className="flex justify-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{reviews.length} {bn ? "রিভিউ" : "reviews"}</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {ratingDist.map(d => (
            <div key={d.star} className="flex items-center gap-2">
              <span className="text-xs w-3 text-muted-foreground">{d.star}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <Progress value={d.pct} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {reviews.length >= 3 && (
        <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
          {aiSummary ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3" /> {bn ? "Shondhaan AI সারাংশ" : "Shondhaan AI Summary"}
              </p>
              <p className="text-sm text-foreground">{aiSummary}</p>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs w-full"
              disabled={aiSummarizing}
              onClick={async () => {
                const summary = await summarizeReviews(
                  reviews.map(r => ({ rating: r.rating, comment: r.comment })),
                  productName || "Product"
                );
                if (summary) setAiSummary(summary);
              }}
            >
              {aiSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {bn ? "🤖 AI দিয়ে রিভিউ সারাংশ দেখুন" : "🤖 AI Review Summary"}
            </Button>
          )}
        </div>
      )}

      {user && !existingReview && (
        <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-muted/30">
          <p className="font-medium text-sm">{bn ? "আপনার রিভিউ দিন" : "Write a Review"}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
              >
                <Star className={`h-7 w-7 transition-colors ${s <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm text-muted-foreground self-center">{rating}/5</span>}
          </div>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={bn ? "আপনার মতামত লিখুন (ঐচ্ছিক)..." : "Write your thoughts (optional)..."}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {bn ? "আপনার রিভিউ দিন" : "Submit Review"}
          </Button>
        </div>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground text-center py-3">
          {bn ? "রিভিউ দিতে লগইন করুন" : "Login to write a review"}
        </p>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{bn ? "এখনো কোনো রিভিউ নেই" : "No reviews yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="border border-border/30 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {review.reviewer_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{review.reviewer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString("bn-BD")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  {String(user?.id) === String(review.user_id) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(review.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {review.comment && <p className="text-sm text-muted-foreground pl-9">{review.comment}</p>}
              {review.seller_reply && (
                <div className="ml-9 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <MessageSquareReply className="h-3.5 w-3.5" />
                    {bn ? "Seller reply" : "Seller reply"}
                  </p>
                  <p className="text-sm text-foreground">{review.seller_reply}</p>
                  {review.seller_reply_at && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(review.seller_reply_at).toLocaleDateString(bn ? "bn-BD" : "en-US")}
                    </p>
                  )}
                </div>
              )}
              {canReplyAsSeller && (
                <div className="ml-9 space-y-2 rounded-lg border border-border/40 bg-muted/30 p-3">
                  <Textarea
                    value={replyDrafts[review.id] ?? review.seller_reply ?? ""}
                    onChange={(e) => setReplyDrafts(prev => ({ ...prev, [review.id]: e.target.value }))}
                    placeholder={bn ? "Reply to this review..." : "Reply to this review..."}
                    rows={2}
                    className="min-h-[64px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSellerReply(review)}
                    disabled={submittingReplyId === review.id || !(replyDrafts[review.id] ?? review.seller_reply ?? "").trim()}
                    className="gap-1.5"
                  >
                    {submittingReplyId === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareReply className="h-3.5 w-3.5" />}
                    {review.seller_reply ? (bn ? "Update reply" : "Update reply") : (bn ? "Reply" : "Reply")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MartProductReviews;
