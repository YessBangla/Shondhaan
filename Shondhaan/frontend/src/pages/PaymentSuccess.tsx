import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ReceiptText, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  clearStoredBookingPaymentRef,
  getBooking,
  getStoredBookingPaymentRef,
  verifyBookingPayment,
  type BookingPaymentVerification,
} from "@/lib/bookingApi";

const pickParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
};

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BookingPaymentVerification | null>(null);
  const [error, setError] = useState("");

  const refs = useMemo(
    () => {
      const storedRef = getStoredBookingPaymentRef();

      return {
        booking_id: pickParam(params, ["booking_id", "bookingId", "value1"]) || storedRef?.booking_id || null,
        order_id:
          pickParam(params, ["order_id", "orderId", "sp_order_id", "invoice_no"]) ||
          storedRef?.order_id ||
          storedRef?.customer_order_id ||
          null,
        verified: pickParam(params, ["verified"]),
      };
    },
    [params]
  );

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const data = refs.verified === "1" && refs.booking_id
          ? {
              paid: true,
              booking: await getBooking(refs.booking_id),
            }
          : await verifyBookingPayment(refs);
        if (!cancelled) setResult(data);
        if (!cancelled && data?.paid) clearStoredBookingPaymentRef();
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Payment verification failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [refs]);

  const paid = result?.paid;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        {loading ? (
          <>
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {bn ? "পেমেন্ট যাচাই হচ্ছে" : "Verifying payment"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {bn ? "একটু অপেক্ষা করুন।" : "Please wait a moment."}
            </p>
          </>
        ) : paid ? (
          <>
            <CheckCircle2 className="mb-4 h-14 w-14 text-primary" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {bn ? "পেমেন্ট সফল" : "Payment successful"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {bn
                ? "আপনার বুকিং নিশ্চিত হয়েছে। আমরা দ্রুত যোগাযোগ করব।"
                : "Your booking is confirmed. We will contact you shortly."}
            </p>
          </>
        ) : (
          <>
            <XCircle className="mb-4 h-14 w-14 text-destructive" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {bn ? "পেমেন্ট যাচাই হয়নি" : "Payment not verified"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || (bn ? "লেনদেন সম্পন্ন হয়নি।" : "The transaction was not completed.")}
            </p>
          </>
        )}

        {result?.booking && (
          <div className="mt-5 w-full rounded-xl border border-border bg-card p-4 text-left text-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <ReceiptText className="h-4 w-4 text-primary" />
              {result.booking.service_title}
            </div>
            <p className="text-muted-foreground">{result.booking.package_name}</p>
            <p className="mt-2 font-medium text-primary">
              {bn ? "অগ্রিম পেমেন্ট" : "Advance paid"}: ৳{Number(result.booking.payment_amount || 0).toLocaleString(bn ? "bn-BD" : "en-US")}
            </p>
          </div>
        )}

        <div className="mt-6 flex w-full gap-2">
          <Link to="/bookings" className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "বুকিং দেখুন" : "View bookings"}
          </Link>
          <Link to="/" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            {bn ? "হোম" : "Home"}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
