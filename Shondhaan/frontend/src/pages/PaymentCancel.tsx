import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  clearStoredBookingPaymentRef,
  getStoredBookingPaymentRef,
  startBookingPayment,
  verifyBookingPayment,
} from "@/lib/bookingApi";

interface PaymentCancelProps {
  failed?: boolean;
}

const PaymentCancel = ({ failed = false }: PaymentCancelProps) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const storedRef = getStoredBookingPaymentRef();
  const bookingId = params.get("booking_id") || params.get("bookingId") || storedRef?.booking_id || "";
  const orderId =
    params.get("order_id") ||
    params.get("orderId") ||
    params.get("sp_order_id") ||
    storedRef?.order_id ||
    storedRef?.customer_order_id ||
    "";
  const [retrying, setRetrying] = useState(false);
  const [checking, setChecking] = useState(failed && !!bookingId);

  useEffect(() => {
    if (!failed || !bookingId) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const result = await verifyBookingPayment({
          booking_id: bookingId,
          order_id: orderId,
        });

        if (!cancelled && result.paid) {
          clearStoredBookingPaymentRef();
          navigate(`/payment-success?booking_id=${encodeURIComponent(bookingId)}&verified=1`, { replace: true });
        }
      } catch {
        // Keep the failed screen visible; the retry button remains available.
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [bookingId, failed, navigate, orderId]);

  const handleRetry = async () => {
    if (!bookingId) return;

    try {
      setRetrying(true);
      const payment = await startBookingPayment(bookingId);
      if (!payment.checkout_url) throw new Error("Payment link was not returned");
      window.location.href = payment.checkout_url;
    } catch (error: any) {
      setRetrying(false);
      toast.error(error?.message || (bn ? "পেমেন্ট আবার শুরু করা যায়নি" : "Could not retry payment"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <XCircle className="mb-4 h-14 w-14 text-amber-500" />
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {failed
            ? bn
              ? "পেমেন্ট ব্যর্থ হয়েছে"
              : "Payment failed"
            : bn
              ? "পেমেন্ট বাতিল হয়েছে"
              : "Payment cancelled"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {checking
            ? bn
              ? "পেমেন্ট স্ট্যাটাস আবার যাচাই হচ্ছে..."
              : "Checking payment status again..."
            : bn
            ? "বুকিং নিশ্চিত করতে ২০% অগ্রিম পেমেন্ট প্রয়োজন।"
            : "A 20% advance payment is required to confirm your booking."}
        </p>

        <div className="mt-6 flex w-full gap-2">
          {bookingId && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {bn ? "আবার পে করুন" : "Retry payment"}
            </button>
          )}
          <Link to="/bookings" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            {bn ? "বুকিং দেখুন" : "View bookings"}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCancel;
