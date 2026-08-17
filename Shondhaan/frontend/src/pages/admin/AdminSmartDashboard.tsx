import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Clock,
  XCircle,
  Wrench,
  Package,
  Star,
  Wallet,
  CreditCard,
  Layers,
  CircleDollarSign,
  BriefcaseBusiness,
} from "lucide-react";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================
// TYPES
// ============================================================

type DashboardData = {
  services: {
    total: number;
    active: number;
    inactive: number;
  };

  providers: {
    total: number;
    pending: number;
    approved: number;
    suspended: number;
    rejected: number;
  };

  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    assigned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };

  categories: {
    total: number;
    active: number;
  };

  packages: {
    total: number;
    active: number;
  };

  reviews: {
    total: number;
    average_rating: number;
  };

  revenue: {
    total: number;
    today: number;
    monthly: number;
    paid_bookings: number;
    unpaid_bookings: number;
  };
};

// ============================================================
// API
// ============================================================

const API_BASE =
  import.meta.env.VITE_SERVICE_API_URL ||
  "http://localhost:3000";

const DASHBOARD_API =
  `${API_BASE}/api/service-admin/dashboard`;

// ============================================================
// API FETCH
// ============================================================

const apiFetch = async (url: string) => {
  const authRaw = localStorage.getItem("yess_mysql_auth");

  let token = "";

  try {
    if (authRaw) {
      const auth = JSON.parse(authRaw);

      token =
        auth?.token ||
        auth?.accessToken ||
        auth?.access_token ||
        "";
    }
  } catch (error) {
    console.warn(
      "Could not parse yess_mysql_auth",
      error
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    console.error(
      `Non-JSON response from ${url}:`,
      text.substring(0, 300)
    );

    throw new Error(
      `Invalid response from dashboard API (${response.status})`
    );
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `API Error: ${response.status}`
    );
  }

  return result;
};

// ============================================================
// HELPERS
// ============================================================

const money = (value: number) =>
  `৳${Number(value || 0).toLocaleString("bn-BD")}`;

const number = (value: number) =>
  Number(value || 0).toLocaleString("bn-BD");

// ============================================================
// COMPONENT
// ============================================================

interface AdminSmartDashboardProps {
  defaultTab?: "service";
}

const AdminSmartDashboard = ({
  defaultTab = "service",
}: AdminSmartDashboardProps) => {
  const { user } = useAuth();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date>(new Date());

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      setError(null);

      console.log(
        "Loading service dashboard:",
        `${DASHBOARD_API}/stats`
      );

      const response = await apiFetch(
        `${DASHBOARD_API}/stats`
      );

      console.log(
        "Service dashboard response:",
        response
      );

      /*
       * Your API returns:
       *
       * {
       *   success: true,
       *   data: {
       *      services: {...},
       *      providers: {...},
       *      bookings: {...},
       *      categories: {...},
       *      packages: {...},
       *      reviews: {...},
       *      revenue: {...}
       *   }
       * }
       */

      const dashboard =
        response?.data ?? response;

      if (!dashboard) {
        throw new Error(
          "Dashboard data is empty"
        );
      }

      setData({
        services: {
          total: Number(
            dashboard.services?.total ?? 0
          ),
          active: Number(
            dashboard.services?.active ?? 0
          ),
          inactive: Number(
            dashboard.services?.inactive ?? 0
          ),
        },

        providers: {
          total: Number(
            dashboard.providers?.total ?? 0
          ),
          pending: Number(
            dashboard.providers?.pending ?? 0
          ),
          approved: Number(
            dashboard.providers?.approved ?? 0
          ),
          suspended: Number(
            dashboard.providers?.suspended ?? 0
          ),
          rejected: Number(
            dashboard.providers?.rejected ?? 0
          ),
        },

        bookings: {
          total: Number(
            dashboard.bookings?.total ?? 0
          ),
          pending: Number(
            dashboard.bookings?.pending ?? 0
          ),
          confirmed: Number(
            dashboard.bookings?.confirmed ?? 0
          ),
          assigned: Number(
            dashboard.bookings?.assigned ?? 0
          ),
          in_progress: Number(
            dashboard.bookings?.in_progress ?? 0
          ),
          completed: Number(
            dashboard.bookings?.completed ?? 0
          ),
          cancelled: Number(
            dashboard.bookings?.cancelled ?? 0
          ),
          rejected: Number(
            dashboard.bookings?.rejected ?? 0
          ),
        },

        categories: {
          total: Number(
            dashboard.categories?.total ?? 0
          ),
          active: Number(
            dashboard.categories?.active ?? 0
          ),
        },

        packages: {
          total: Number(
            dashboard.packages?.total ?? 0
          ),
          active: Number(
            dashboard.packages?.active ?? 0
          ),
        },

        reviews: {
          total: Number(
            dashboard.reviews?.total ?? 0
          ),
          average_rating: Number(
            dashboard.reviews?.average_rating ?? 0
          ),
        },

        revenue: {
          total: Number(
            dashboard.revenue?.total ?? 0
          ),
          today: Number(
            dashboard.revenue?.today ?? 0
          ),
          monthly: Number(
            dashboard.revenue?.monthly ?? 0
          ),
          paid_bookings: Number(
            dashboard.revenue?.paid_bookings ?? 0
          ),
          unpaid_bookings: Number(
            dashboard.revenue?.unpaid_bookings ?? 0
          ),
        },
      });

      setLastUpdated(new Date());
    } catch (error: any) {
      console.error(
        "Service admin dashboard error:",
        error
      );

      setError(
        error?.message ||
          "Dashboard data load করা যাচ্ছে না"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================
  // KPI
  // ==========================================================

  const kpis = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "মোট বুকিং",
        value: number(data.bookings.total),
        icon: Calendar,
        color: "sky",
        description: `${number(
          data.bookings.pending
        )} pending`,
      },

      {
        label: "মোট রেভিনিউ",
        value: money(data.revenue.total),
        icon: DollarSign,
        color: "emerald",
        description: `মাসে ${money(
          data.revenue.monthly
        )}`,
      },

      {
        label: "আজকের রেভিনিউ",
        value: money(data.revenue.today),
        icon: Wallet,
        color: "violet",
        description: "আজকের paid revenue",
      },

      {
        label: "সম্পন্ন বুকিং",
        value: number(data.bookings.completed),
        icon: CheckCircle2,
        color: "amber",
        description: `${number(
          data.bookings.total
        )} মোট বুকিং`,
      },
    ];
  }, [data]);

  // ==========================================================
  // ACCENTS
  // ==========================================================

  const accentMap: Record<
    string,
    {
      from: string;
      to: string;
      soft: string;
      text: string;
    }
  > = {
    sky: {
      from: "from-sky-500",
      to: "to-blue-600",
      soft: "bg-sky-500/10",
      text: "text-sky-600",
    },

    emerald: {
      from: "from-emerald-500",
      to: "to-green-600",
      soft: "bg-emerald-500/10",
      text: "text-emerald-600",
    },

    violet: {
      from: "from-violet-500",
      to: "to-purple-600",
      soft: "bg-violet-500/10",
      text: "text-violet-600",
    },

    amber: {
      from: "from-amber-500",
      to: "to-orange-600",
      soft: "bg-amber-500/10",
      text: "text-amber-600",
    },
  };

  // ==========================================================
  // BOOKING STATUS
  // ==========================================================

  const bookingStatuses = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Pending",
        value: data.bookings.pending,
        icon: Clock,
        className:
          "bg-amber-500/10 text-amber-600",
      },

      {
        label: "Confirmed",
        value: data.bookings.confirmed,
        icon: CheckCircle2,
        className:
          "bg-sky-500/10 text-sky-600",
      },

      {
        label: "Assigned",
        value: data.bookings.assigned,
        icon: UserCheck,
        className:
          "bg-violet-500/10 text-violet-600",
      },

      {
        label: "In Progress",
        value: data.bookings.in_progress,
        icon: Activity,
        className:
          "bg-indigo-500/10 text-indigo-600",
      },

      {
        label: "Completed",
        value: data.bookings.completed,
        icon: CheckCircle2,
        className:
          "bg-emerald-500/10 text-emerald-600",
      },

      {
        label: "Cancelled",
        value: data.bookings.cancelled,
        icon: XCircle,
        className:
          "bg-rose-500/10 text-rose-600",
      },
    ];
  }, [data]);

  // ==========================================================
  // PRIORITY ALERTS
  // ==========================================================

  const alerts = useMemo(() => {
    if (!data) return [];

    const result: {
      label: string;
      value: number;
      href: string;
      icon: any;
      className: string;
    }[] = [];

    if (data.bookings.pending > 0) {
      result.push({
        label: "অপেক্ষমাণ বুকিং",
        value: data.bookings.pending,
        href: "/admin/bookings",
        icon: Clock,
        className:
          "bg-amber-500/10 text-amber-700",
      });
    }

    if (data.providers.pending > 0) {
      result.push({
        label: "Pending Provider",
        value: data.providers.pending,
        href: "/admin/providers",
        icon: UserCheck,
        className:
          "bg-violet-500/10 text-violet-700",
      });
    }

    if (data.bookings.cancelled > 0) {
      result.push({
        label: "বাতিল বুকিং",
        value: data.bookings.cancelled,
        href: "/admin/bookings",
        icon: XCircle,
        className:
          "bg-rose-500/10 text-rose-700",
      });
    }

    if (data.services.inactive > 0) {
      result.push({
        label: "Inactive Service",
        value: data.services.inactive,
        href: "/admin/services",
        icon: Wrench,
        className:
          "bg-orange-500/10 text-orange-700",
      });
    }

    return result;
  }, [data]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-80 rounded-2xl bg-muted/40 animate-pulse" />
        </div>

        <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>

        <h2 className="text-lg font-bold">
          Dashboard Load Failed
        </h2>

        <p className="text-sm text-muted-foreground mt-2">
          {error || "কোনো dashboard data পাওয়া যায়নি"}
        </p>

        <button
          onClick={loadDashboard}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((stat, index) => {
          const accent =
            accentMap[stat.color];
          return (
            <motion.div
              key={stat.label}
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.07,
              }}
              whileHover={{
                y: -4,
              }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 md:p-5 shadow-sm hover:shadow-xl transition-all"
            >

              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                  accent.from,
                  accent.to
                )}
              />

              <div className="flex items-start justify-between">

                <div
                  className={cn(
                    "h-10 w-10 md:h-11 md:w-11 rounded-xl flex items-center justify-center",
                    accent.soft
                  )}
                >
                  <stat.icon
                    className={cn(
                      "h-5 w-5",
                      accent.text
                    )}
                  />
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition" />

              </div>

              <p className="text-[11px] text-muted-foreground font-medium mt-4">
                {stat.label}
              </p>

              <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight">
                {stat.value}
              </p>

              <p className="text-[10px] text-muted-foreground mt-1">
                {stat.description}
              </p>

            </motion.div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "মোট Provider",
            value: data.providers.total,
            sub: `${data.providers.approved} approved`,
            icon: Users,
            color: "sky",
          },
          {
            label: "মোট Service",
            value: data.services.total,
            sub: `${data.services.active} active`,
            icon: Wrench,
            color: "emerald",
          },

          {
            label: "মোট Category",
            value: data.categories.total,
            sub: `${data.categories.active} active`,
            icon: Layers,
            color: "violet",
          },

          {
            label: "মোট Package",
            value: data.packages.total,
            sub: `${data.packages.active} active`,
            icon: Package,
            color: "amber",
          },
        ].map((item, index) => {
          const accent =
            accentMap[item.color];
          return (
            <motion.div
              key={item.label}
              initial={{
                opacity: 0,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: index * 0.05,
              }}
              whileHover={{
                y: -3,
              }}
              className="rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md transition-all"
            >

              <div className="flex items-center gap-3">

                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    accent.soft
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      accent.text
                    )}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.label}
                  </p>

                  <p className="text-xl font-bold">
                    {number(item.value)}
                  </p>

                  <p className="text-[9px] text-muted-foreground">
                    {item.sub}
                  </p>
                </div>

              </div>

            </motion.div>
          );
        })}

      </div>

      {/* ======================================================
          BOOKING + ALERTS
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* BOOKING STATUS */}

        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4 md:p-5">

          <div className="flex items-center justify-between mb-5">

            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>

                <h3 className="text-sm font-bold">
                  Booking Overview
                </h3>
              </div>

              <p className="text-[11px] text-muted-foreground mt-2">
                সকল booking-এর বর্তমান status
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">
                {number(data.bookings.total)}
              </p>

              <p className="text-[10px] text-muted-foreground">
                Total Bookings
              </p>
            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {bookingStatuses.map(
              (status, index) => (
                <motion.div
                  key={status.label}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.04,
                  }}
                  className="rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition"
                >

                  <div className="flex items-center justify-between">

                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        status.className
                      )}
                    >
                      <status.icon className="h-4 w-4" />
                    </div>

                    <span className="text-lg font-bold">
                      {number(status.value)}
                    </span>

                  </div>

                  <p className="text-[10px] font-medium text-muted-foreground mt-2">
                    {status.label}
                  </p>

                </motion.div>
              )
            )}

          </div>

        </div>

        {/* ALERTS */}

        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">

          <div className="flex items-center justify-between mb-4">

            <div className="flex items-center gap-2">

              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>

              <h3 className="text-sm font-bold">
                Priority Alerts
              </h3>

            </div>

            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">
              {alerts.length}
            </span>

          </div>

          {alerts.length === 0 ? (
            <div className="py-10 text-center">

              <div className="h-14 w-14 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>

              <p className="text-sm font-semibold">
                সবকিছু ঠিকঠাক
              </p>

              <p className="text-[11px] text-muted-foreground mt-1">
                এই মুহূর্তে কোনো জরুরি কাজ নেই।
              </p>

            </div>
          ) : (
            <div className="space-y-2">

              {alerts.map(
                (alert, index) => (
                  <motion.div
                    key={alert.label}
                    initial={{
                      opacity: 0,
                      x: 10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: index * 0.05,
                    }}
                  >

                    <Link
                      to={alert.href}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 bg-muted/30 hover:bg-muted/60 transition"
                    >

                      <div
                        className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center",
                          alert.className
                        )}
                      >
                        <alert.icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-[11px] font-semibold truncate">
                          {alert.label}
                        </p>

                        <p className="text-[9px] text-muted-foreground">
                          এখনই দেখুন →
                        </p>

                      </div>

                      <span className="text-lg font-bold">
                        {number(alert.value)}
                      </span>

                    </Link>

                  </motion.div>
                )
              )}

            </div>
          )}

        </div>

      </div>

      {/* ======================================================
          REVENUE + PROVIDERS
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* REVENUE */}

        <motion.div
          whileHover={{
            y: -2,
          }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >

          <div className="flex items-center justify-between mb-5">

            <div>
              <div className="flex items-center gap-2">

                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <h3 className="text-sm font-bold">
                    Revenue Overview
                  </h3>

                  <p className="text-[10px] text-muted-foreground">
                    Service platform revenue
                  </p>
                </div>

              </div>
            </div>

            <DollarSign className="h-5 w-5 text-muted-foreground/40" />

          </div>

          <div className="grid grid-cols-3 gap-3">

            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
              <p className="text-[9px] text-muted-foreground">
                Total
              </p>

              <p className="text-lg font-bold text-emerald-600 mt-1">
                {money(data.revenue.total)}
              </p>
            </div>

            <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-3">
              <p className="text-[9px] text-muted-foreground">
                Monthly
              </p>

              <p className="text-lg font-bold text-sky-600 mt-1">
                {money(data.revenue.monthly)}
              </p>
            </div>

            <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-3">
              <p className="text-[9px] text-muted-foreground">
                Today
              </p>

              <p className="text-lg font-bold text-violet-600 mt-1">
                {money(data.revenue.today)}
              </p>
            </div>

          </div>

          <div className="mt-4">

            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="text-muted-foreground">
                Payment Status
              </span>

              <span className="font-semibold">
                {number(
                  data.revenue.paid_bookings +
                    data.revenue.unpaid_bookings
                )}{" "}
                bookings
              </span>
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden">

              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${
                    data.revenue.paid_bookings +
                      data.revenue.unpaid_bookings >
                    0
                      ? (data.revenue.paid_bookings /
                          (data.revenue.paid_bookings +
                            data.revenue.unpaid_bookings)) *
                        100
                      : 0
                  }%`,
                }}
              />

            </div>

            <div className="flex items-center justify-between mt-2">

              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Paid: {number(
                  data.revenue.paid_bookings
                )}
              </span>

              <span className="flex items-center gap-1 text-[10px] text-amber-600">
                <Clock className="h-3 w-3" />
                Unpaid: {number(
                  data.revenue.unpaid_bookings
                )}
              </span>

            </div>

          </div>

        </motion.div>

        {/* PROVIDERS */}

        <motion.div
          whileHover={{
            y: -2,
          }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >

          <div className="flex items-center justify-between mb-5">

            <div className="flex items-center gap-2">

              <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold">
                  Provider Overview
                </h3>

                <p className="text-[10px] text-muted-foreground">
                  Provider status summary
                </p>
              </div>

            </div>

            <p className="text-2xl font-bold">
              {number(data.providers.total)}
            </p>

          </div>

          <div className="space-y-3">

            {[
              {
                label: "Approved",
                value: data.providers.approved,
                icon: UserCheck,
                className:
                  "bg-emerald-500/10 text-emerald-600",
              },

              {
                label: "Pending",
                value: data.providers.pending,
                icon: Clock,
                className:
                  "bg-amber-500/10 text-amber-600",
              },

              {
                label: "Suspended",
                value: data.providers.suspended,
                icon: ShieldCheck,
                className:
                  "bg-orange-500/10 text-orange-600",
              },

              {
                label: "Rejected",
                value: data.providers.rejected,
                icon: XCircle,
                className:
                  "bg-rose-500/10 text-rose-600",
              },
            ].map((item) => (

              <div
                key={item.label}
                className="flex items-center gap-3"
              >

                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    item.className
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>

                <div className="flex-1">

                  <div className="flex items-center justify-between">

                    <span className="text-[11px] font-medium">
                      {item.label}
                    </span>

                    <span className="text-sm font-bold">
                      {number(item.value)}
                    </span>

                  </div>

                  <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">

                    <div
                      className="h-full rounded-full bg-current opacity-70 transition-all duration-700"
                      style={{
                        width: `${
                          data.providers.total
                            ? (item.value /
                                data.providers.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />

                  </div>

                </div>

              </div>

            ))}

          </div>

        </motion.div>

      </div>

      {/* ======================================================
          REVIEWS + SERVICES
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* REVIEWS */}

        <div className="rounded-2xl border border-border/60 bg-card p-5">

          <div className="flex items-center gap-3">

            <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground">
                Customer Reviews
              </p>

              <div className="flex items-center gap-2">

                <span className="text-2xl font-bold">
                  {data.reviews.average_rating.toFixed(1)}
                </span>

                <span className="text-xs text-muted-foreground">
                  / 5
                </span>

              </div>

            </div>

          </div>

          <div className="mt-4 flex items-center justify-between">

            <span className="text-xs text-muted-foreground">
              মোট Review
            </span>

            <span className="font-bold">
              {number(data.reviews.total)}
            </span>

          </div>

        </div>

        {/* SERVICES */}

        <div className="rounded-2xl border border-border/60 bg-card p-5">

          <div className="flex items-center gap-3">

            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground">
                Service Status
              </p>

              <p className="text-2xl font-bold">
                {number(data.services.active)}
              </p>

            </div>

          </div>

          <div className="mt-4">

            <div className="flex justify-between text-[10px] mb-1.5">

              <span className="text-muted-foreground">
                Active Services
              </span>

              <span className="font-semibold">
                {data.services.total
                  ? Math.round(
                      (data.services.active /
                        data.services.total) *
                        100
                    )
                  : 0}
                %
              </span>

            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">

              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{
                  width: `${
                    data.services.total
                      ? (data.services.active /
                          data.services.total) *
                        100
                      : 0
                  }%`,
                }}
              />

            </div>

            <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">

              <span>
                Active: {number(data.services.active)}
              </span>

              <span>
                Inactive: {number(data.services.inactive)}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          QUICK ACTIONS
      ====================================================== */}

      <div>

        <div className="flex items-center gap-2 mb-3">

          <Activity className="h-4 w-4 text-primary" />

          <h3 className="text-sm font-bold">
            দ্রুত একশন
          </h3>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {[
            {
              to: "/admin/bookings",
              icon: Calendar,
              label: "Bookings",
              desc: "বুকিং ম্যানেজ করুন",
              tint:
                "text-sky-600 bg-sky-500/10",
            },

            {
              to: "/admin/providers",
              icon: Users,
              label: "Providers",
              desc: "Provider ম্যানেজ করুন",
              tint:
                "text-violet-600 bg-violet-500/10",
            },

            {
              to: "/admin/services",
              icon: Wrench,
              label: "Services",
              desc: "Service ম্যানেজ করুন",
              tint:
                "text-emerald-600 bg-emerald-500/10",
            },

            {
              to: "/admin/categories",
              icon: Layers,
              label: "Categories",
              desc: "Category ম্যানেজ করুন",
              tint:
                "text-amber-600 bg-amber-500/10",
            },
          ].map((action) => (

            <Link
              key={action.to}
              to={action.to}
              className="group rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all"
            >

              <div className="flex items-start justify-between mb-3">

                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    action.tint
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />

              </div>

              <p className="text-[13px] font-semibold">
                {action.label}
              </p>

              <p className="text-[10px] text-muted-foreground mt-1">
                {action.desc}
              </p>

            </Link>

          ))}

        </div>

      </div>

      {/* ======================================================
          FOOTER SUMMARY
      ====================================================== */}

      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-muted/30 via-card to-muted/30 p-4">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {[
            {
              label: "Paid Bookings",
              value:
                data.revenue.paid_bookings,
              icon: CreditCard,
            },

            {
              label: "Unpaid Bookings",
              value:
                data.revenue.unpaid_bookings,
              icon: Clock,
            },

            {
              label: "Cancelled",
              value:
                data.bookings.cancelled,
              icon: XCircle,
            },

            {
              label: "Average Rating",
              value:
                data.reviews.average_rating.toFixed(
                  1
                ),
              icon: Star,
            },
          ].map((item) => (

            <div
              key={item.label}
              className="flex items-center gap-3"
            >

              <div className="h-9 w-9 rounded-lg bg-card flex items-center justify-center text-muted-foreground border border-border/60">

                <item.icon className="h-4 w-4" />

              </div>

              <div>

                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>

                <p className="text-lg font-bold">
                  {item.value}
                </p>

              </div>

            </div>

          ))}
        </div>
      </div>
    </div>
  );
};
export default AdminSmartDashboard;