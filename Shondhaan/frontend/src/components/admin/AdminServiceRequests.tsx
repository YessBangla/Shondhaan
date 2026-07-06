import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  MapPin,
  Phone,
  User,
  FileText,
  Clock,
  Download,
  CreditCard,
  CheckCircle,
  XCircle,
  Trash2,
  CalendarDays,
  PackageCheck,
  BadgeDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

interface BookingRequest {
  id: string;
  user_id?: string | number | null;
  service_id?: string | null;
  package_id?: string | null;
  service_slug?: string | null;
  service_title?: string | null;
  package_name?: string | null;
  package_price?: number;
  payment_amount?: number;
  due_amount?: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  status?: string | null;
  payment_status?: string | null;
  note?: string | null;
  provider_id?: string | number | null;
  assigned_to?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const API_BASE_URL = (INDIVIDUAL_API_BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const statusOptions = [
  {
    value: "pending",
    label: "অপেক্ষমাণ",
    className: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "confirmed",
    label: "কনফার্ম",
    className: "bg-blue-100 text-blue-800",
  },
  {
    value: "processing",
    label: "প্রসেসিং",
    className: "bg-indigo-100 text-indigo-800",
  },
  {
    value: "assigned",
    label: "অ্যাসাইনড",
    className: "bg-purple-100 text-purple-800",
  },
  {
    value: "completed",
    label: "সম্পন্ন",
    className: "bg-green-100 text-green-800",
  },
  {
    value: "cancelled",
    label: "বাতিল",
    className: "bg-red-100 text-red-800",
  },
];

const paymentOptions = [
  {
    value: "unpaid",
    label: "পেমেন্ট বাকি",
    className: "bg-red-100 text-red-800",
  },
  {
    value: "paid",
    label: "পেমেন্ট সম্পন্ন",
    className: "bg-green-100 text-green-800",
  },
  {
    value: "refunded",
    label: "রিফান্ডেড",
    className: "bg-gray-100 text-gray-800",
  },
];

const getAuthHeaders = () => {
  const auth = getMySqlAuth();

  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const extractArray = (payload: any): BookingRequest[] => {
  const data =
    payload?.data ??
    payload?.bookings ??
    payload?.items ??
    payload?.result ??
    payload;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const getStatusLabel = (status?: string | null) =>
  statusOptions.find((s) => s.value === status)?.label || status || "unknown";

const getPaymentLabel = (status?: string | null) =>
  paymentOptions.find((s) => s.value === status)?.label || status || "unpaid";

const getStatusClass = (status?: string | null) =>
  statusOptions.find((s) => s.value === status)?.className ||
  "bg-gray-100 text-gray-800";

const getPaymentClass = (status?: string | null) =>
  paymentOptions.find((s) => s.value === status)?.className ||
  "bg-gray-100 text-gray-800";

const formatMoney = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("bn-BD")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("bn-BD");
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("bn-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminServiceRequests = () => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Booking requests load failed"
        );
      }

      setBookings(extractArray(payload));
    } catch (error: any) {
      console.error("Fetch bookings error:", error);
      toast.error(error.message || "Booking requests load failed");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Status update failed");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, status } : booking
        )
      );

      toast.success("Booking status updated");
    } catch (error: any) {
      console.error("Update booking status error:", error);
      toast.error(error.message || "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    setUpdatingId(id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bookings/${id}/payment-status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ payment_status }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Payment status update failed"
        );
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, payment_status } : booking
        )
      );

      toast.success("Payment status updated");
    } catch (error: any) {
      console.error("Update payment status error:", error);
      toast.error(error.message || "Payment status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteBooking = async (id: string) => {
    const ok = window.confirm("এই booking request delete করবেন?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Delete failed");
      }

      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      toast.success("Booking deleted");
    } catch (error: any) {
      console.error("Delete booking error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = bookings.filter((booking) => {
    if (statusFilter !== "all" && booking.status !== statusFilter) return false;
    if (paymentFilter !== "all" && booking.payment_status !== paymentFilter) {
      return false;
    }

    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const haystack = [
      booking.id,
      booking.customer_name,
      booking.customer_phone,
      booking.customer_address,
      booking.service_title,
      booking.service_slug,
      booking.package_name,
      booking.status,
      booking.payment_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  const statusCounts = statusOptions.map((option) => ({
    ...option,
    count: bookings.filter((booking) => booking.status === option.value).length,
  }));

  const totalRevenue = filtered.reduce(
    (sum, booking) => sum + Number(booking.package_price || 0),
    0
  );

  const totalAdvance = filtered.reduce(
    (sum, booking) => sum + Number(booking.payment_amount || 0),
    0
  );

  const downloadCSV = () => {
    const header =
      "ID,Customer Name,Phone,Service,Package,Package Price,Advance Payment,Due Amount,Booking Date,Booking Time,Status,Payment Status,Address,Created At";

    const rows = filtered.map((booking) => {
      const due =
        Number(booking.due_amount ?? 0) ||
        Math.max(
          Number(booking.package_price || 0) - Number(booking.payment_amount || 0),
          0
        );

      return [
        booking.id,
        booking.customer_name || "",
        booking.customer_phone || "",
        booking.service_title || booking.service_slug || "",
        booking.package_name || "",
        booking.package_price || 0,
        booking.payment_amount || 0,
        due,
        booking.booking_date || "",
        booking.booking_time || "",
        booking.status || "",
        booking.payment_status || "",
        `"${String(booking.customer_address || "").replace(/"/g, '""')}"`,
        booking.created_at || "",
      ].join(",");
    });

    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Requests Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      padding: 24px;
      color: #111827;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 4px;
    }
    .meta {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #111827;
      color: #fff;
      padding: 8px 6px;
      text-align: left;
    }
    td {
      padding: 6px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      background: #f3f4f6;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <h1>Booking Requests Report</h1>
  <p class="meta">
    Total: ${filtered.length} bookings • Date: ${new Date().toLocaleDateString(
      "bn-BD"
    )}
  </p>
  <table>
    <thead>
      <tr>
        <th>Customer</th>
        <th>Service</th>
        <th>Booking</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
`);

    filtered.forEach((booking) => {
      const due =
        Number(booking.due_amount ?? 0) ||
        Math.max(
          Number(booking.package_price || 0) - Number(booking.payment_amount || 0),
          0
        );

      w.document.write(`
      <tr>
        <td>
          <strong>${booking.customer_name || "-"}</strong><br/>
          ${booking.customer_phone || "-"}<br/>
          <small>${booking.customer_address || ""}</small>
        </td>
        <td>
          <strong>${booking.service_title || booking.service_slug || "-"}</strong><br/>
          <small>${booking.package_name || ""}</small>
        </td>
        <td>
          ${booking.booking_date || "-"}<br/>
          <small>${booking.booking_time || ""}</small>
        </td>
        <td>
          Total: ${formatMoney(booking.package_price)}<br/>
          Advance: ${formatMoney(booking.payment_amount)}<br/>
          Due: ${formatMoney(due)}
        </td>
        <td>
          <span class="badge">${getStatusLabel(booking.status)}</span><br/>
          <small>${getPaymentLabel(booking.payment_status)}</small>
        </td>
        <td>${formatDate(booking.created_at)}</td>
      </tr>
`);
    });

    w.document.write(`
    </tbody>
  </table>
</body>
</html>`);

    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Booking requests loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            Booking Requests ({filtered.length}
            {filtered.length !== bookings.length ? `/${bookings.length}` : ""})
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            MySQL bookings from {API_BASE_URL}/api/bookings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filtered.length > 0 && (
            <>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Download className="h-3 w-3" /> CSV
              </button>

              <button
                onClick={downloadPDF}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <FileText className="h-3 w-3" /> PDF
              </button>
            </>
          )}

          <button
            onClick={fetchBookings}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {statusCounts.map((status) => (
          <button
            key={status.value}
            onClick={() =>
              setStatusFilter(
                statusFilter === status.value ? "all" : status.value
              )
            }
            className={`rounded-xl border p-2.5 text-left transition-all ${
              statusFilter === status.value
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/40"
            }`}
          >
            <p className="text-xl font-bold text-foreground">{status.count}</p>
            <p
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
            >
              {status.label}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, service..."
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring md:col-span-2"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All status</option>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All payment</option>
          {paymentOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total package amount</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {formatMoney(totalRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total advance/payment</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {formatMoney(totalAdvance)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Filtered bookings</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {filtered.length}
          </p>
        </div>
      </div>

      {(statusFilter !== "all" || paymentFilter !== "all" || search.trim()) && (
        <button
          onClick={() => {
            setStatusFilter("all");
            setPaymentFilter("all");
            setSearch("");
          }}
          className="mb-3 text-xs text-primary hover:underline"
        >
          ✕ Clear filters
        </button>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            কোনো booking request নেই
          </p>
        ) : (
          filtered.map((booking) => {
            const due =
              Number(booking.due_amount ?? 0) ||
              Math.max(
                Number(booking.package_price || 0) -
                  Number(booking.payment_amount || 0),
                0
              );

            return (
              <div
                key={booking.id}
                className="space-y-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <User className="h-3.5 w-3.5" />
                      {booking.customer_name || "Unknown Customer"}
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {booking.customer_phone || "-"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusClass(
                        booking.status
                      )}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentClass(
                        booking.payment_status
                      )}`}
                    >
                      {getPaymentLabel(booking.payment_status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="flex items-start gap-1.5 text-xs text-foreground">
                      <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>
                        <strong>
                          {booking.service_title ||
                            booking.service_slug ||
                            "Service"}
                        </strong>
                        <br />
                        <span className="text-muted-foreground">
                          {booking.package_name || "Package"}
                        </span>
                      </span>
                    </p>
                  </div>

                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="flex items-start gap-1.5 text-xs text-foreground">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>
                        <strong>{formatDate(booking.booking_date)}</strong>
                        <br />
                        <span className="text-muted-foreground">
                          Time: {booking.booking_time || "-"}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>

                {booking.customer_address && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {booking.customer_address}
                  </p>
                )}

                {booking.note && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {booking.note}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatMoney(booking.package_price)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-2">
                    <p className="text-[10px] text-muted-foreground">Advance</p>
                    <p className="text-sm font-bold text-primary">
                      {formatMoney(booking.payment_amount)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-2">
                    <p className="text-[10px] text-muted-foreground">Due</p>
                    <p className="text-sm font-bold text-destructive">
                      {formatMoney(due)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <select
                    value={booking.status || "pending"}
                    onChange={(e) => updateStatus(booking.id, e.target.value)}
                    disabled={updatingId === booking.id}
                    className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none disabled:opacity-50 ${getStatusClass(
                      booking.status
                    )}`}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={booking.payment_status || "unpaid"}
                    onChange={(e) =>
                      updatePaymentStatus(booking.id, e.target.value)
                    }
                    disabled={updatingId === booking.id}
                    className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none disabled:opacity-50 ${getPaymentClass(
                      booking.payment_status
                    )}`}
                  >
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(booking.created_at)}
                  </span>

                  <button
                    onClick={() => deleteBooking(booking.id)}
                    disabled={deletingId === booking.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    ID: {booking.id.slice(0, 8)}
                  </span>

                  {booking.provider_id && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      Provider: {booking.provider_id}
                    </span>
                  )}

                  {booking.assigned_to && (
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      Assigned: {booking.assigned_to}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminServiceRequests;