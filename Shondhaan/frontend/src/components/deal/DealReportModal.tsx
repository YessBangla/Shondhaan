import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REASONS = [
  { value: "fake", label: "ভুয়া বিজ্ঞাপন", labelEn: "Fake ad" },
  { value: "scam", label: "প্রতারণা/স্ক্যাম", labelEn: "Scam" },
  { value: "inappropriate", label: "অশোভন কনটেন্ট", labelEn: "Inappropriate content" },
  { value: "wrong_category", label: "ভুল ক্যাটেগরি", labelEn: "Wrong category" },
  { value: "duplicate", label: "ডুপ্লিকেট বিজ্ঞাপন", labelEn: "Duplicate ad" },
  { value: "prohibited", label: "নিষিদ্ধ পণ্য/সেবা", labelEn: "Prohibited item" },
  { value: "other", label: "অন্যান্য", labelEn: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  bn?: boolean;
}

const DealReportModal = ({ open, onOpenChange, listingId, listingTitle, bn = true }: Props) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error(bn ? "লগইন করুন" : "Please login"); return; }
    if (!reason) { toast.error(bn ? "কারণ নির্বাচন করুন" : "Select a reason"); return; }

    setSubmitting(true);
    const { error } = await supabase.from("deal_reports" as any).insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    } as any);
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.info(bn ? "আপনি ইতিমধ্যে এই বিজ্ঞাপনটি রিপোর্ট করেছেন" : "You already reported this ad");
      } else {
        toast.error(bn ? "রিপোর্ট করতে ব্যর্থ" : "Failed to report");
      }
      return;
    }

    setSubmitted(true);
    toast.success(bn ? "রিপোর্ট সফলভাবে জমা হয়েছে" : "Report submitted successfully");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setReason(""); setDetails(""); setSubmitted(false); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {bn ? "বিজ্ঞাপন রিপোর্ট করুন" : "Report Ad"}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-foreground">{bn ? "ধন্যবাদ!" : "Thank you!"}</p>
            <p className="text-sm text-muted-foreground">
              {bn ? "আপনার রিপোর্ট পর্যালোচনা করা হবে। আমরা যত দ্রুত সম্ভব ব্যবস্থা নেব।" : "Your report will be reviewed. We'll take action as soon as possible."}
            </p>
            <Button onClick={handleClose} className="mt-2">{bn ? "বন্ধ করুন" : "Close"}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground truncate">
              {bn ? "বিজ্ঞাপন:" : "Ad:"} <span className="font-medium text-foreground">{listingTitle}</span>
            </p>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">{bn ? "রিপোর্টের কারণ" : "Reason"}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      reason === r.value
                        ? "border-destructive bg-destructive/5 text-destructive font-medium"
                        : "border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    {bn ? r.label : r.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">{bn ? "বিস্তারিত (ঐচ্ছিক)" : "Details (optional)"}</p>
              <Textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder={bn ? "আরও তথ্য দিন..." : "Provide more details..."}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {bn ? "বাতিল" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-1.5"
                onClick={handleSubmit}
                disabled={submitting || !reason}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {bn ? "রিপোর্ট করুন" : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DealReportModal;
