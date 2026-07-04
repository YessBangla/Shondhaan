import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Booking {
  id: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onRebooked: () => void;
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00",
];

const RebookModal = ({ open, onClose, booking, onRebooked }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleRebook = async () => {
    if (!user || !booking || !date || !time) {
      toast.error(bn ? "তারিখ ও সময় দিন" : "Select date and time");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      service_slug: booking.service_slug,
      service_title: booking.service_title,
      package_name: booking.package_name,
      package_price: booking.package_price,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_address: booking.customer_address,
      booking_date: date,
      booking_time: time,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      toast.error(bn ? "রি-বুকিং ব্যর্থ" : "Rebooking failed");
    } else {
      toast.success(bn ? "পুনরায় বুকিং সফল!" : "Rebooked successfully!");
      setDate("");
      setTime("");
      onRebooked();
      onClose();
    }
  };

  if (!open || !booking) return null;

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
            <h3 className="text-sm font-bold text-foreground">{bn ? "পুনরায় বুক করুন" : "Rebook Service"}</h3>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Service Info */}
          <div className="rounded-lg bg-secondary/50 p-3 mb-4">
            <p className="text-sm font-semibold text-foreground">{booking.service_title}</p>
            <p className="text-xs text-muted-foreground">{booking.package_name} — ৳{booking.package_price}</p>
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3 inline mr-1" /> {bn ? "তারিখ নির্বাচন করুন" : "Select Date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" /> {bn ? "সময় নির্বাচন করুন" : "Select Time"}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                    time === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRebook}
            disabled={submitting || !date || !time}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {bn ? "বুকিং হচ্ছে..." : "Booking..."}</>
            ) : (
              <><RotateCcw className="h-4 w-4" /> {bn ? "বুক করুন" : "Confirm Rebook"}</>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RebookModal;
