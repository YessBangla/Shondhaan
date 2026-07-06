import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  UserCheck,
  Zap,
  CheckCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import CategoryFilterDropdown, {
  useServiceCategoryMap,
} from "@/components/CategoryFilterDropdown";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, {
  BulkActionTone,
  BulkImpactRow,
} from "@/components/admin/BulkConfirmDialog";
import SavedFiltersMenu from "@/components/admin/SavedFiltersMenu";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

interface Booking {
  id: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status?: string | null;
  payment_amount?: number | null;
  platform_fee_amount?: number | null;
  created_at: string;
  is_emergency: boolean;
  provider_id: string | number | null;
  assigned_to?: string | number | null;
}

interface Provider {
  id: string | number;
  user_id?: string | number | null;
  full_name: string;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
  service_category?: string | null;
  status?: string | null;
}

const API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");

const statusOptions = [
  {
    value: "pending",
    label: "অপেক্ষমাণ",
    className: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "confirmed",
    label: "নিশ্চিত",
    className: "bg-blue-100 text-blue-800",
  },
  {
    value: "assigned",
    label: "অ্যাসাইনড",
    className: "bg-indigo-100 text-indigo-800",
  },
  {
    value: "processing",
    label: "চলমান",
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

const getAuthHeaders = () => {
  const token = getMySqlAuth()?.token;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const extractArray = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.providers)) return payload.providers;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const normalizeBooking = (item: any): Booking => ({
  id: String(item.id),
  service_title: item.service_title || item.serviceTitle || "",
  service_slug: item.service_slug || item.serviceSlug || "",
  package_name: item.package_name || item.packageName || "",
  package_price: Number(item.package_price || item.packagePrice || 0),
  customer_name: item.customer_name || item.customerName || "",
  customer_phone: item.customer_phone || item.customerPhone || "",
  customer_address: item.customer_address || item.customerAddress || "",
  booking_date: item.booking_date
    ? String(item.booking_date).slice(0, 10)
    : item.bookingDate || "",
  booking_time: item.booking_time
    ? String(item.booking_time).slice(0, 5)
    : item.bookingTime || "",
  status: item.status || "pending",
  payment_status: item.payment_status ?? item.paymentStatus ?? null,
  payment_amount:
    item.payment_amount === undefined || item.payment_amount === null
      ? null
      : Number(item.payment_amount),
  platform_fee_amount:
    item.platform_fee_amount === undefined || item.platform_fee_amount === null
      ? item.payment_amount === undefined || item.payment_amount === null
        ? null
        : Number(item.payment_amount)
      : Number(item.platform_fee_amount),
  created_at: item.created_at || item.createdAt || new Date().toISOString(),
  is_emergency: Boolean(item.is_emergency || item.isEmergency),
  provider_id: item.provider_id ?? item.providerId ?? null,
  assigned_to: item.assigned_to ?? item.assignedTo ?? null,
});

const normalizeProvider = (item: any): Provider => ({
  id: item.id,
  user_id: item.user_id ?? null,
  full_name: item.full_name || item.display_name || item.name || "নাম নেই",
  display_name: item.display_name || item.full_name || item.name || "নাম নেই",
  phone: item.phone || item.mobile || "",
  email: item.email || "",
  service_category: item.service_category || "",
  status: item.status || "",
});

const AdminBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { data: serviceCategoryMap } = useServiceCategoryMap();

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to fetch bookings");
      }

      const rows = extractArray(payload).map(normalizeBooking);
      setBookings(rows);
    } catch (error: any) {
      console.error("Fetch bookings error:", error);
      toast.error(error.message || "বুকিং লোড করা যায়নি");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/providers?status=approved`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to fetch providers");
      }

      const rows = extractArray(payload).map(normalizeProvider);
      setProviders(rows);
    } catch (error: any) {
      console.error("Fetch providers error:", error);
      toast.error(error.message || "প্রোভাইডার লোড করা যায়নি");
      setProviders([]);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchProviders();
  }, [fetchBookings, fetchProviders]);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);

    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Status update failed");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, status } : booking
        )
      );

      toast.success("বুকিং স্ট্যাটাস আপডেট হয়েছে");
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error(error.message || "স্ট্যাটাস আপডেট ব্যর্থ");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignProvider = async (
    id: string,
    providerId: string | number | null
  ) => {
    setAssigningId(id);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/bookings/${id}/assign-provider`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            provider_id: providerId || null,
          }),
        }
      );

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Provider assign failed");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                provider_id: providerId || null,
                assigned_to: providerId || null,
                status:
                  booking.status === "pending" ||
                  booking.status === "confirmed" ||
                  booking.status === "processing"
                    ? "assigned"
                    : booking.status,
              }
            : booking
        )
      );

      toast.success("প্রোভাইডার অ্যাসাইন হয়েছে");
    } catch (error: any) {
      console.error("Assign provider error:", error);
      toast.error(error.message || "প্রোভাইডার অ্যাসাইন ব্যর্থ");
    } finally {
      setAssigningId(null);
    }
  };

  const statusFiltered =
    filterStatus === "all"
      ? bookings
      : filterStatus === "emergency"
      ? bookings.filter((booking) => booking.is_emergency)
      : bookings.filter((booking) => booking.status === filterStatus);

  const filtered =
    filterCategory === "all"
      ? statusFiltered
      : statusFiltered.filter(
          (booking) =>
            serviceCategoryMap?.get(booking.service_slug) === filterCategory
        );

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const sel = useBulkSelection(sorted, [filterStatus, filterCategory]);
  const perms = useBulkPermissions("bookings");

  const [pendingBulk, setPendingBulk] = useState<{
    tone: BulkActionTone;
    title: string;
    description?: string;
    impacts?: BulkImpactRow[];
    confirmLabel?: string;
    warning?: string;
    run: () => Promise<void> | void;
  } | null>(null);

  const [bulkLoading, setBulkLoading] = useState(false);

  const runBulk = async () => {
    if (!pendingBulk) return;

    setBulkLoading(true);

    try {
      await pendingBulk.run();
    } finally {
      setBulkLoading(false);
      setPendingBulk(null);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (sel.selectedIds.length === 0) return;

    try {
      await Promise.all(
        sel.selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ status }),
          }).then(async (res) => {
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(payload.message || "Bulk update failed");
            }
            return payload;
          })
        )
      );

      setBookings((prev) =>
        prev.map((booking) =>
          sel.selected.has(booking.id) ? { ...booking, status } : booking
        )
      );

      toast.success(`${sel.selectedIds.length}টি বুকিং আপডেট হয়েছে`);
      sel.clear();
    } catch (error: any) {
      console.error("Bulk status update error:", error);
      toast.error(error.message || "Bulk update failed");
    }
  };

  const bulkAssignProvider = async () => {
    if (sel.selectedIds.length === 0 || providers.length === 0) return;

    const opts = providers
      .map(
        (provider, index) =>
          `${index + 1}. ${
            provider.display_name || provider.full_name || "নাম নেই"
          }${provider.phone ? ` (${provider.phone})` : ""}`
      )
      .join("\n");

    const pick = window.prompt(
      `প্রোভাইডার বেছে নিন:\n${opts}\n\nনম্বর লিখুন:`
    );

    const idx = Number(pick) - 1;

    if (Number.isNaN(idx) || idx < 0 || idx >= providers.length) return;

    const providerId = providers[idx].id;

    try {
      await Promise.all(
        sel.selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/api/bookings/${id}/assign-provider`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ provider_id: providerId }),
          }).then(async (res) => {
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(payload.message || "Bulk assign failed");
            }
            return payload;
          })
        )
      );

      setBookings((prev) =>
        prev.map((booking) =>
          sel.selected.has(booking.id)
            ? {
                ...booking,
                provider_id: providerId,
                assigned_to: providerId,
                status:
                  booking.status === "pending" ||
                  booking.status === "confirmed" ||
                  booking.status === "processing"
                    ? "assigned"
                    : booking.status,
              }
            : booking
        )
      );

      toast.success(`${sel.selectedIds.length}টি বুকিং অ্যাসাইন হয়েছে`);
      sel.clear();
    } catch (error: any) {
      console.error("Bulk provider assign error:", error);
      toast.error(error.message || "Bulk assign failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            বুকিং ম্যানেজমেন্ট
          </h2>
          <p className="text-xs text-muted-foreground">
            সকল বুকিং, স্ট্যাটাস এবং প্রোভাইডার অ্যাসাইনমেন্ট
          </p>
        </div>

        <button
          onClick={() => {
            fetchBookings();
            fetchProviders();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          রিফ্রেশ
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{bookings.length}</p>
            <p className="text-xs text-muted-foreground">মোট বুকিং</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {bookings.filter((booking) => booking.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">অপেক্ষমাণ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {
                bookings.filter((booking) => booking.status === "completed")
                  .length
              }
            </p>
            <p className="text-xs text-muted-foreground">সম্পন্ন</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Zap className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {bookings.filter((booking) => booking.is_emergency).length}
            </p>
            <p className="text-xs text-muted-foreground">জরুরী</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        {statusOptions.map((status) => {
          const count = bookings.filter(
            (booking) => booking.status === status.value
          ).length;

          return (
            <button
              key={status.value}
              onClick={() =>
                setFilterStatus(
                  filterStatus === status.value ? "all" : status.value
                )
              }
              className={`rounded-xl border p-3 text-left transition-all ${
                filterStatus === status.value
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CategoryFilterDropdown
          value={filterCategory}
          onChange={setFilterCategory}
        />

        {(filterStatus !== "all" || filterCategory !== "all") && (
          <button
            onClick={() => {
              setFilterStatus("all");
              setFilterCategory("all");
            }}
            className="text-xs text-primary hover:underline"
          >
            ← সব দেখুন
          </button>
        )}

        <SavedFiltersMenu<{ status: string; category: string }>
          scope="admin_bookings"
          currentState={{ status: filterStatus, category: filterCategory }}
          onApply={(state) => {
            if (typeof state?.status === "string") {
              setFilterStatus(state.status);
            }

            if (typeof state?.category === "string") {
              setFilterCategory(state.category);
            }
          }}
          hasActiveFilters={filterStatus !== "all" || filterCategory !== "all"}
        />

        {sorted.length > 0 && (
          <div className="ml-auto">
            <BulkSelectToggle
              allSelected={sel.allSelected}
              someSelected={sel.someSelected}
              selectedCount={sel.selectedCount}
              totalCount={sorted.length}
              onToggle={sel.toggleAll}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">কোনো বুকিং পাওয়া যায়নি</p>
          </div>
        ) : (
          sorted.map((booking, index) => {
            const status =
              statusOptions.find((item) => item.value === booking.status) ||
              statusOptions[0];

            const checked = sel.isSelected(booking.id);

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-xl border p-4 shadow-sm transition ${
                  checked
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-2">
                    <BulkSelectCheckbox
                      checked={checked}
                      onChange={() => sel.toggle(booking.id)}
                      className="mt-1"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/service/${booking.service_slug}`)}
                          className="font-heading text-sm font-semibold hover:text-primary"
                        >
                          {booking.service_title}
                        </button>

                        {booking.is_emergency && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            <Zap className="h-3 w-3" />
                            জরুরী
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {booking.package_name} — ৳{booking.package_price}
                      </p>
                    </div>
                  </div>

                  <select
                    value={booking.status}
                    onChange={(event) =>
                      handleStatusChange(booking.id, event.target.value)
                    }
                    disabled={updatingId === booking.id}
                    className={`rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring ${status.className} disabled:opacity-50`}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {booking.customer_name}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {booking.customer_phone}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {booking.booking_date}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {booking.booking_time}
                  </span>

                  <span className="col-span-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {booking.customer_address}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2">
                  <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    প্রোভাইডার:
                  </span>

                  <select
                    value={booking.provider_id || ""}
                    onChange={(event) =>
                      handleAssignProvider(
                        booking.id,
                        event.target.value || null
                      )
                    }
                    disabled={assigningId === booking.id}
                    className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">অ্যাসাইন করুন</option>

                    {providers.map((provider) => (
                      <option key={String(provider.id)} value={String(provider.id)}>
                        {provider.display_name || provider.full_name || "নাম নেই"}
                        {provider.phone ? ` (${provider.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-2 text-[10px] text-muted-foreground/60">
                  আইডি: {booking.id.slice(0, 8)} •{" "}
                  {new Date(booking.created_at).toLocaleDateString("bn-BD")}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          {
            key: "confirm",
            label: "নিশ্চিত",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            variant: "primary",
            disabled: !perms.canUpdate,
            disabledReason: perms.reasonFor("can_update"),
            onClick: () =>
              setPendingBulk({
                tone: "approve",
                title: "নির্বাচিত বুকিংগুলো নিশ্চিত করবেন?",
                description:
                  "বুকিং কনফার্ম হবে এবং প্রোভাইডারের কাছে পাঠানো হবে।",
                impacts: [
                  { label: "স্ট্যাটাস", value: "নিশ্চিত (confirmed)" },
                  {
                    label: "নোটিফিকেশন",
                    value: "ক্লায়েন্ট ও প্রোভাইডারকে পাঠানো হবে",
                  },
                ],
                confirmLabel: "হ্যাঁ, নিশ্চিত করুন",
                run: () => bulkUpdateStatus("confirmed"),
              }),
          },
          {
            key: "complete",
            label: "সম্পন্ন",
            icon: <CheckCircle className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate,
            disabledReason: perms.reasonFor("can_update"),
            onClick: () =>
              setPendingBulk({
                tone: "approve",
                title: "নির্বাচিত বুকিংগুলো সম্পন্ন হিসেবে চিহ্নিত করবেন?",
                description:
                  "সার্ভিস সম্পন্ন হিসেবে রেকর্ড হবে এবং পেমেন্ট ফাইনালাইজ হবে।",
                impacts: [
                  { label: "স্ট্যাটাস", value: "সম্পন্ন (completed)" },
                  { label: "সম্পন্নের সময়", value: "এখন" },
                ],
                confirmLabel: "হ্যাঁ, সম্পন্ন",
                run: () => bulkUpdateStatus("completed"),
              }),
          },
          {
            key: "cancel",
            label: "বাতিল",
            icon: <XCircle className="h-3.5 w-3.5" />,
            variant: "destructive",
            disabled: !perms.canUpdate,
            disabledReason: perms.reasonFor("can_update"),
            onClick: () =>
              setPendingBulk({
                tone: "reject",
                title: "নির্বাচিত বুকিংগুলো বাতিল করবেন?",
                description: "বুকিংগুলোর স্ট্যাটাস বাতিলে পরিবর্তিত হবে।",
                impacts: [
                  { label: "স্ট্যাটাস", value: "বাতিল (cancelled)" },
                  { label: "নোটিফিকেশন", value: "ক্লায়েন্টকে পাঠানো হবে" },
                ],
                warning: "বাতিলকৃত বুকিং পুনরুদ্ধার করা যাবে না।",
                confirmLabel: "হ্যাঁ, বাতিল করুন",
                run: () => bulkUpdateStatus("cancelled"),
              }),
          },
          {
            key: "assign",
            label: "প্রোভাইডার",
            icon: <UserPlus className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate,
            disabledReason: perms.reasonFor("can_update"),
            onClick: bulkAssignProvider,
          },
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(open) => {
          if (!open) setPendingBulk(null);
        }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="বুকিং"
        tone={pendingBulk?.tone || "neutral"}
        title={pendingBulk?.title}
        description={pendingBulk?.description}
        impacts={pendingBulk?.impacts}
        warning={pendingBulk?.warning}
        confirmLabel={pendingBulk?.confirmLabel}
        disabledReason={
          pendingBulk?.tone === "delete"
            ? perms.reasonFor("can_delete")
            : perms.reasonFor("can_update")
        }
        loading={bulkLoading}
      />
    </div>
  );
};

export default AdminBookings;
