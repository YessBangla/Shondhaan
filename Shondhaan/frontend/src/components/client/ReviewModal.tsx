import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  serviceSlug: string;
  serviceTitle: string;
  onSubmitted: () => void;
}

const ReviewModal = ({ open, onClose, serviceSlug, serviceTitle, onSubmitted }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error(bn ? "রেটিং দিন" : "Please give a rating");
      return;
    }
    setSubmitting(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("service_reviews").insert({
      service_slug: serviceSlug,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      reviewer_name: profile?.display_name || user.email || "User",
    });

    setSubmitting(false);
    if (error) {
      toast.error(bn ? "রিভিউ সাবমিট ব্যর্থ" : "Failed to submit review");
    } else {
      toast.success(bn ? "রিভিউ সফলভাবে দেওয়া হয়েছে!" : "Review submitted!");
      setRating(0);
      setComment("");
      onSubmitted();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">{bn ? "রিভিউ দিন" : "Write a Review"}</h3>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4">{serviceTitle}</p>

          {/* Stars */}
          <div className="flex items-center gap-1 mb-4 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    i <= (hoverRating || rating)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-xs text-muted-foreground mb-3">
              {bn
                ? ["", "খুবই খারাপ", "খারাপ", "ভালো", "অনেক ভালো", "চমৎকার!"][rating]
                : ["", "Very Bad", "Bad", "Good", "Very Good", "Excellent!"][rating]}
            </p>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={bn ? "আপনার মতামত লিখুন (ঐচ্ছিক)..." : "Write your feedback (optional)..."}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none mb-4"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {bn ? "পাঠানো হচ্ছে..." : "Submitting..."}</>
            ) : (
              <><Send className="h-4 w-4" /> {bn ? "রিভিউ পাঠান" : "Submit Review"}</>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReviewModal;
