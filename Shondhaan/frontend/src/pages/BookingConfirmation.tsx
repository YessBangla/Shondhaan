import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Package,
  ChevronLeft,
  Printer,
  Share2,
  FileDown,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { scheduleBookingReminder } from "@/hooks/useBookingReminders";
import SuccessConfetti from "@/components/SuccessConfetti";
import {
  printLetterhead,
  downloadLetterheadPdf,
  letterheadPage,
  letterheadHeader,
} from "@/lib/letterheadPrint";
import {
  generateInvoiceNumber,
  invoiceFilename,
  verifyInvoiceNumber,
} from "@/lib/invoiceNumber";
import InvoiceNumberBadge, {
  invoiceNumberHtml,
} from "@/components/InvoiceNumberBadge";

interface BookingData {
  id?: string;
  serviceTitle: string;
  serviceSlug: string;
  packageName: string;
  packagePrice: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  bookingDate: string;
  bookingTime: string;
  discount?: number;
  couponCode?: string;
  status?: string;
  paymentStatus?: string;
}

const API_BASE_URL = (
  import.meta.env.VITE_SERVICE_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const extractObject = (payload: any) => {
  return payload?.data || payload?.booking || payload?.result || payload;
};

const cleanDate = (value: unknown) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  return text.slice(0, 10);
};

const cleanTime = (value: unknown) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.includes("T")) {
    const timePart = text.split("T")[1] || "";
    return timePart.slice(0, 5);
  }

  return text.slice(0, 5);
};

const normalizeBooking = (raw: any): BookingData | null => {
  if (!raw || typeof raw !== "object") return null;

  const booking = raw.booking || raw.data || raw;

  const serviceTitle =
    booking.serviceTitle ||
    booking.service_title ||
    booking.service_name ||
    booking.title ||
    "";

  const customerName =
    booking.customerName ||
    booking.customer_name ||
    booking.name ||
    "";

  const customerPhone =
    booking.customerPhone ||
    booking.customer_phone ||
    booking.mobile ||
    booking.phone ||
    "";

  const customerAddress =
    booking.customerAddress ||
    booking.customer_address ||
    booking.address ||
    "";

  const bookingDate =
    booking.bookingDate ||
    cleanDate(booking.booking_date) ||
    cleanDate(booking.date);

  const bookingTime =
    booking.bookingTime ||
    cleanTime(booking.booking_time) ||
    cleanTime(booking.time);

  if (!serviceTitle && !customerName && !customerPhone) {
    return null;
  }

  return {
    id: booking.id ? String(booking.id) : undefined,
    serviceTitle,
    serviceSlug:
      booking.serviceSlug ||
      booking.service_slug ||
      booking.slug ||
      "",
    packageName:
      booking.packageName ||
      booking.package_name ||
      booking.package_title ||
      "",
    packagePrice: Number(
      booking.packagePrice ??
        booking.package_price ??
        booking.price ??
        booking.total ??
        0
    ),
    customerName,
    customerPhone,
    customerAddress,
    bookingDate,
    bookingTime,
    discount: Number(booking.discount || 0),
    couponCode: booking.couponCode || booking.coupon_code || "",
    status: booking.status || "confirmed",
    paymentStatus:
      booking.paymentStatus || booking.payment_status || "unpaid",
  };
};

const escapeHtml = (value: unknown) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  const invoiceRef = useRef<HTMLDivElement>(null);
  const invoiceNumber = useRef(generateInvoiceNumber("BKG"));

  const initialBooking = useMemo(() => {
    return normalizeBooking(location.state);
  }, [location.state]);

  const bookingId = useMemo(() => {
    const state: any = location.state || {};
    return (
      state?.id ||
      state?.bookingId ||
      state?.booking_id ||
      state?.booking?.id ||
      searchParams.get("id") ||
      searchParams.get("booking_id") ||
      searchParams.get("bookingId") ||
      ""
    );
  }, [location.state, searchParams]);

  const [booking, setBooking] = useState<BookingData | null>(initialBooking);
  const [loading, setLoading] = useState(!initialBooking && !!bookingId);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const fetchBooking = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/api/bookings/${encodeURIComponent(String(bookingId))}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload?.message || "Booking not found");
        }

        const normalized = normalizeBooking(extractObject(payload));

        if (!normalized) {
          throw new Error("Invalid booking data");
        }

        if (alive) {
          setBooking(normalized);
        }
      } catch (err: any) {
        console.error("Booking confirmation fetch error:", err);

        if (alive) {
          if (!initialBooking) {
            setBooking(null);
          }

          setError(err.message || "Failed to load booking");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchBooking();

    return () => {
      alive = false;
    };
  }, [bookingId, initialBooking]);

  useEffect(() => {
    if (!booking) return;

    try {
      const when = new Date(
        `${booking.bookingDate}T${booking.bookingTime || "09:00"}`
      );

      scheduleBookingReminder({
        bookingId: booking.id || invoiceNumber.current,
        title: booking.serviceTitle,
        scheduledAt: when,
        leadMinutes: 30,
      });
    } catch {
      // silent
    }
  }, [booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {bn ? "বুকিং তথ্য লোড হচ্ছে..." : "Loading booking details..."}
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-1">{t("bc.noData")}</p>
          {error && (
            <p className="text-xs text-destructive mb-4">{error}</p>
          )}
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white"
          >
            {t("bc.goHome")}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const subtotal = booking.packagePrice + Number(booking.discount || 0);
  const discount = Number(booking.discount || 0);
  const total = Number(booking.packagePrice || 0);

  const buildInvoiceHtml = () => {
    const dateStr = new Date().toLocaleDateString(
      bn ? "bn-BD" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const fmt = (n: number) =>
      `৳${Number(n || 0).toLocaleString(bn ? "bn-BD" : "en-US")}`;

    const inner = `
      ${letterheadHeader({
        title: bn ? "বুকিং ইনভয়েস" : "Booking Invoice",
        subtitle: invoiceNumberHtml(
          invoiceNumber.current,
          bn ? "ইনভয়েস নং" : "Invoice No."
        ),
        subtitleIsHtml: true,
        verified: verifyInvoiceNumber(invoiceNumber.current),
        verifiedLabel: {
          ok: bn ? "যাচাইকৃত" : "Verified",
          bad: bn ? "অযাচাই" : "Unverified",
        },
        language,
        left: dateStr,
        right: `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:10px;font-weight:700;font-size:9pt;">${
          bn ? "নিশ্চিত" : "Confirmed"
        }</span>`,
      })}

      <div class="lh-section">
        <div class="lh-section-title">${bn ? "গ্রাহক তথ্য" : "Customer Info"}</div>
        <div class="lh-grid-2">
          <div class="lh-row"><label>${bn ? "নাম" : "Name"}</label><span>${escapeHtml(
            booking.customerName
          )}</span></div>
          <div class="lh-row"><label>${bn ? "ফোন" : "Phone"}</label><span>${escapeHtml(
            booking.customerPhone
          )}</span></div>
          <div class="lh-row" style="grid-column:span 2;"><label>${
            bn ? "ঠিকানা" : "Address"
          }</label><span>${escapeHtml(booking.customerAddress)}</span></div>
        </div>
      </div>

      <div class="lh-section">
        <div class="lh-section-title">${bn ? "বুকিং তথ্য" : "Booking Details"}</div>
        <div class="lh-grid-2">
          <div class="lh-row"><label>${bn ? "তারিখ" : "Date"}</label><span>${escapeHtml(
            booking.bookingDate
          )}</span></div>
          <div class="lh-row"><label>${bn ? "সময়" : "Time"}</label><span>${escapeHtml(
            booking.bookingTime
          )}</span></div>
        </div>
      </div>

      <div class="lh-section">
        <div class="lh-section-title">${bn ? "সার্ভিস বিবরণ" : "Service Details"}</div>
        <table class="lh-table">
          <thead>
            <tr>
              <th>${bn ? "সার্ভিস" : "Service"}</th>
              <th>${bn ? "প্যাকেজ" : "Package"}</th>
              <th style="text-align:end;">${bn ? "মূল্য" : "Price"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(booking.serviceTitle)}</td>
              <td>${escapeHtml(booking.packageName)}</td>
              <td style="text-align:end;">${fmt(subtotal)}</td>
            </tr>

            ${
              discount > 0
                ? `<tr>
                    <td colspan="2" style="color:#dc2626;">
                      ${bn ? "কুপন ছাড়" : "Coupon Discount"}
                      ${
                        booking.couponCode
                          ? `(${escapeHtml(booking.couponCode)})`
                          : ""
                      }
                    </td>
                    <td style="text-align:end;color:#dc2626;">-${fmt(
                      discount
                    )}</td>
                  </tr>`
                : ""
            }

            <tr class="lh-total">
              <td colspan="2">${bn ? "সর্বমোট" : "Total"}</td>
              <td style="text-align:end;">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="text-align:center;margin-top:8mm;color:#64748b;font-size:9.5pt;">
        ${bn ? "ধন্যবাদ! আমাদের সার্ভিস ব্যবহার করার জন্য।" : "Thank you for using our service."}
      </p>
    `;

    return letterheadPage(inner);
  };

  const handlePrint = () => {
    const ok = printLetterhead({
      title: `${bn ? "ইনভয়েস" : "Invoice"} - ${invoiceNumber.current}`,
      bodyHtml: buildInvoiceHtml(),
      language,
    });

    if (!ok) {
      toast.error(bn ? "পপ-আপ ব্লক করা আছে" : "Pop-up blocked");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading(bn ? "PDF তৈরি হচ্ছে..." : "Generating PDF...", {
        id: "pdf-gen",
      });

      await downloadLetterheadPdf({
        title: `Invoice-${invoiceNumber.current}`,
        bodyHtml: buildInvoiceHtml(),
        filename: invoiceFilename(invoiceNumber.current, "booking-invoice"),
        language,
      });

      toast.success(bn ? "PDF ডাউনলোড সম্পন্ন" : "PDF downloaded", {
        id: "pdf-gen",
      });
    } catch {
      toast.error(bn ? "PDF তৈরি ব্যর্থ" : "PDF generation failed", {
        id: "pdf-gen",
      });
    }
  };

  const handleShare = async () => {
    const text = `${bn ? "বুকিং নিশ্চিত" : "Booking Confirmed"}
${invoiceNumber.current}
${booking.serviceTitle}
${booking.packageName} — ৳${total}
${booking.bookingDate} ${booking.bookingTime}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "YessService Booking",
          text,
        });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(bn ? "কপি করা হয়েছে" : "Copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SuccessConfetti trigger={true} />
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-lg px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>

          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {t("bc.success")}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("bc.willContact")}
          </p>

          <div className="mt-3 flex justify-center">
            <InvoiceNumberBadge number={invoiceNumber.current} />
          </div>
        </motion.div>

        <motion.div
          ref={invoiceRef}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 pb-4 border-b border-border">
            <h2 className="font-heading text-base font-semibold text-foreground">
              {booking.serviceTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {booking.packageName}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("bc.date")}
                </span>
                <p className="text-foreground">{booking.bookingDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("bc.time")}
                </span>
                <p className="text-foreground">{booking.bookingTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("bc.mobile")}
                </span>
                <p className="text-foreground">{booking.customerPhone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("bc.address")}
                </span>
                <p className="text-foreground">{booking.customerAddress}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {bn ? "মূল মূল্য" : "Subtotal"}
                  </span>
                  <span className="text-foreground">
                    ৳{subtotal.toLocaleString("bn-BD")}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-green-600">
                    {bn ? "কুপন ছাড়" : "Discount"}{" "}
                    {booking.couponCode ? `(${booking.couponCode})` : ""}
                  </span>
                  <span className="text-green-600">
                    -৳{discount.toLocaleString("bn-BD")}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm font-bold">
              <span className="text-foreground">
                {bn ? "সর্বমোট" : "Total"}
              </span>
              <span className="text-primary text-lg">
                ৳{total.toLocaleString("bn-BD")}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4 flex gap-2"
        >
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Printer className="h-4 w-4 text-primary" />
            {bn ? "প্রিন্ট" : "Print"}
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <FileDown className="h-4 w-4" />
            {bn ? "PDF ডাউনলোড" : "Download PDF"}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Share2 className="h-4 w-4 text-primary" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex flex-col gap-3"
        >
          <button
            onClick={() => navigate("/bookings")}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t("bc.viewBookings")}
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("bc.backHome")}
          </button>
        </motion.div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default BookingConfirmation;