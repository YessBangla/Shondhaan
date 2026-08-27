import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Settings,
  Shield,
  Home,
  ChevronRight,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  Edit3,
  Bell,
  Search,
  CalendarDays,
  ClipboardList,
  Heart,
  MessageCircle,
  Star,
  MapPin,
  Wrench,
  Clock3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BriefcaseBusiness,
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { getRoleConfig } from "@/config/roles";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getMySqlAuth } from "@/lib/mysqlAuth";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url?: string;
  created_at: string;
}

interface UserStats {
  bookings?: number;
  orders?: number;
  pendingRequests?: number;
  reviews?: number;
  upcomingBookings?: number;
  completedBookings?: number;
  favorites?: number;
  messages?: number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || import.meta.env.VITE_CENTRAL_API_BASE_URL || "";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [mysqlAuth, setMysqlAuth] = useState(() => getMySqlAuth());

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<UserStats>({
    bookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    reviews: 0,
    favorites: 0,
    messages: 0,
  });

  // --------------------------------------------------
  // AUTH SYNC
  // --------------------------------------------------

  useEffect(() => {
    const sync = () => {
      setMysqlAuth(getMySqlAuth());
    };

    window.addEventListener("yess-mysql-auth-changed", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("yess-mysql-auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // --------------------------------------------------
  // AUTH GUARD + PROFILE
  // --------------------------------------------------

  useEffect(() => {
    if (mysqlAuth === null) return;

    if (!mysqlAuth?.user || !mysqlAuth?.token) {
      navigate("/auth");
      return;
    }

    setUserRole(mysqlAuth.user.role || "user");
    fetchUserProfile(mysqlAuth.token);
  }, [mysqlAuth]);

  // --------------------------------------------------
  // FETCH PROFILE
  // --------------------------------------------------

  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired");
        }

        throw new Error("Failed to load profile");
      }

      const data = await response.json();

      setProfile(data);

      fetchUserStats(token);
    } catch (err: any) {
      const msg = err.message || "Error";

      setError(msg);
      toast.error(msg);

      if (msg.includes("Session")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH SERVICE STATS
  // --------------------------------------------------

  const fetchUserStats = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      setStats({
        bookings: data.bookings ?? 0,
        upcomingBookings:
          data.upcomingBookings ??
          data.pendingRequests ??
          0,
        completedBookings:
          data.completedBookings ??
          0,
        reviews: data.reviews ?? 0,
        favorites: data.favorites ?? 0,
        messages: data.messages ?? 0,
      });
    } catch (err) {
      console.error("Service stats error:", err);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("yess_mysql_auth");

    window.dispatchEvent(new Event("yess-mysql-auth-changed"));

    toast.success(bn ? "লগ আউট সফল" : "Logged out");

    navigate("/auth");
  };

  // --------------------------------------------------
  // ROLE PANEL
  // --------------------------------------------------

  const handleNavigateToPanel = () => {
    const roleConfig = getRoleConfig(userRole);

    if (roleConfig && userRole !== "user") {
      navigate(roleConfig.panelPath);
    }
  };

  // --------------------------------------------------
  // PROFILE
  // --------------------------------------------------

  const handleNavigateToProfile = () => {
    navigate("/profile");
  };

  // --------------------------------------------------
  // SERVICE NAVIGATION
  // --------------------------------------------------

  const goToServices = () => {
    navigate("/services");
  };

  const goToBookings = () => {
    navigate("/service/bookings");
  };

  const goToFavorites = () => {
    navigate("/service/favorites");
  };

  const goToMessages = () => {
    navigate("/service/messages");
  };

  const goToReviews = () => {
    navigate("/service/reviews");
  };

  const goToAddresses = () => {
    navigate("/service/addresses");
  };

  // --------------------------------------------------
  // FIRST NAME
  // --------------------------------------------------

  const firstName = useMemo(() => {
    return profile?.name?.split(" ")[0] || (bn ? "ব্যবহারকারী" : "there");
  }, [profile?.name, bn]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] dark:bg-slate-950">
        <Navbar />

        <div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-4 pt-[72px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {bn
              ? "আপনার সার্ভিস ড্যাশবোর্ড লোড হচ্ছে..."
              : "Loading your service dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] dark:bg-slate-950">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
          <div className="flex items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="h-8 w-8 shrink-0" />

            <div>
              <h3 className="text-lg font-bold">
                {bn ? "ত্রুটি" : "Something went wrong"}
              </h3>

              <p className="mt-1 text-sm opacity-90">
                {error || "Failed to load your profile"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleConfig = getRoleConfig(userRole);
  const isStandardUser = userRole === "user";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f9fc] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />

      {/* --------------------------------------------------
          BACKGROUND
      -------------------------------------------------- */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />

        <div className="absolute -right-32 top-[35%] h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-600/10" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />
      </div>

      {/* --------------------------------------------------
          MAIN
      -------------------------------------------------- */}

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-[92px] sm:px-6 lg:px-8">

        {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
              <Wrench className="h-3.5 w-3.5" />

              {bn ? "সার্ভিস ড্যাশবোর্ড" : "SERVICE DASHBOARD"}
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {bn ? "স্বাগতম" : "Welcome back"},{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {firstName}
              </span>{" "}
              👋
            </h1>

            <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              {bn
                ? "আপনার সার্ভিস, বুকিং এবং প্রোভাইডারগুলো এক জায়গা থেকে পরিচালনা করুন।"
                : "Manage your services, bookings, providers and activities from one place."}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={goToMessages}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:text-blue-400"
              title={bn ? "মেসেজ" : "Messages"}
            >
              <MessageCircle className="h-5 w-5" />

              {stats.messages && stats.messages > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {stats.messages > 9 ? "9+" : stats.messages}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => toast.info(bn ? "নোটিফিকেশন শীঘ্রই আসছে" : "Notifications coming soon")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:text-blue-400"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* --------------------------------------------------
            PROFILE MINI CARD
        -------------------------------------------------- */}

        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="relative h-24 overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500">

            <div className="absolute inset-0 opacity-20">
              <svg
                className="h-full w-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="service-dashboard-dots"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx="3"
                      cy="3"
                      r="1.5"
                      fill="white"
                    />
                  </pattern>
                </defs>

                <rect
                  width="100%"
                  height="100%"
                  fill="url(#service-dashboard-dots)"
                />
              </svg>
            </div>

            <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full border border-white/20" />
            <div className="absolute -right-2 -top-12 h-32 w-32 rounded-full border border-white/20" />
          </div>

          <div className="relative px-5 pb-5 sm:px-7">

            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div className="flex items-end gap-4">

                <div className="relative shrink-0">

                  <div className="h-20 w-20 rounded-2xl border-4 border-white bg-white p-0.5 shadow-lg dark:border-slate-900 dark:bg-slate-900 sm:h-24 sm:w-24">

                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700">
                        <User className="h-9 w-9 text-blue-500 dark:text-blue-400" />
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                </div>

                <div className="pb-1">

                  <h2 className="text-xl font-extrabold">
                    {profile.name}
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {bn ? "সার্ভিস কাস্টমার" : "Service Customer"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNavigateToProfile}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              >
                <Edit3 className="h-4 w-4" />
                {bn ? "প্রোফাইল এডিট" : "Edit Profile"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">

              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                {profile.email}
              </span>

              {profile.phone && (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  {profile.phone}
                </span>
              )}

              {profile.address && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  {profile.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            SEARCH SERVICE
        -------------------------------------------------- */}

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 shadow-lg shadow-blue-500/10 sm:p-8">

          <div className="mb-5 flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-extrabold">
                {bn
                  ? "আপনার কী সার্ভিস দরকার?"
                  : "What service do you need?"}
              </h2>

              <p className="text-sm text-blue-100">
                {bn
                  ? "বিশ্বস্ত প্রোভাইডার খুঁজে নিন"
                  : "Find trusted service providers near you"}
              </p>
            </div>
          </div>

          <button
            onClick={goToServices}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-lg transition hover:shadow-xl"
          >
            <Search className="h-5 w-5 shrink-0 text-blue-500" />

            <span className="flex-1 text-sm font-medium text-slate-400">
              {bn
                ? "সার্ভিস সার্চ করুন..."
                : "Search for a service..."}
            </span>

            <div className="hidden rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white sm:block">
              {bn ? "সার্চ" : "Search"}
            </div>
          </button>
        </div>

        {/* --------------------------------------------------
            STATS
        -------------------------------------------------- */}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">

          {/* Bookings */}

          <button
            onClick={goToBookings}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
            </div>

            <p className="text-2xl font-black tabular-nums">
              {stats.bookings ?? 0}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {bn ? "মোট বুকিং" : "Total Bookings"}
            </p>
          </button>

          {/* Upcoming */}

          <button
            onClick={goToBookings}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Clock3 className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-500" />
            </div>

            <p className="text-2xl font-black tabular-nums">
              {stats.upcomingBookings ?? 0}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {bn ? "আসন্ন বুকিং" : "Upcoming"}
            </p>
          </button>

          {/* Completed */}

          <button
            onClick={goToBookings}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500" />
            </div>

            <p className="text-2xl font-black tabular-nums">
              {stats.completedBookings ?? 0}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {bn ? "সম্পন্ন সার্ভিস" : "Completed"}
            </p>
          </button>

          {/* Reviews */}

          <button
            onClick={goToReviews}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-500/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <Star className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-500" />
            </div>

            <p className="text-2xl font-black tabular-nums">
              {stats.reviews ?? 0}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {bn ? "আমার রিভিউ" : "My Reviews"}
            </p>
          </button>
        </div>

        {/* --------------------------------------------------
            UPCOMING BOOKING + QUICK ACTIONS
        -------------------------------------------------- */}

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">

          {/* UPCOMING BOOKING */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {bn ? "পরবর্তী বুকিং" : "NEXT BOOKING"}
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {bn ? "আপনার আসন্ন সার্ভিস" : "Your upcoming service"}
                </h2>
              </div>

              <button
                onClick={goToBookings}
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                {bn ? "সব দেখুন" : "View all"}
              </button>
            </div>

            {/* Booking placeholder / empty state */}

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-cyan-500/5">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                  <Wrench className="h-7 w-7" />
                </div>

                <div className="flex-1">

                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {bn ? "নিশ্চিত" : "CONFIRMED"}
                  </div>

                  <h3 className="text-lg font-extrabold">
                    {bn ? "আপনার পরবর্তী সার্ভিস" : "Your next service"}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">

                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                      {bn ? "তারিখ নির্ধারিত" : "Scheduled date"}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-blue-500" />
                      {bn ? "সময় নির্ধারিত" : "Scheduled time"}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      {bn ? "আপনার ঠিকানা" : "Your address"}
                    </span>

                  </div>
                </div>

                <button
                  onClick={goToBookings}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
                >
                  {bn ? "বুকিং দেখুন" : "View Booking"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Progress */}

              <div className="mt-6 border-t border-blue-100 pt-5 dark:border-blue-500/10">

                <div className="flex items-center">

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <span className="hidden text-[10px] font-bold text-blue-700 dark:text-blue-400 sm:block">
                      {bn ? "নিশ্চিত" : "Confirmed"}
                    </span>
                  </div>

                  <div className="mx-2 h-px flex-1 bg-blue-200 dark:bg-blue-500/20" />

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                    </div>

                    <span className="hidden text-[10px] font-bold text-blue-700 dark:text-blue-400 sm:block">
                      {bn ? "প্রোভাইডার" : "Provider"}
                    </span>
                  </div>

                  <div className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Wrench className="h-3.5 w-3.5" />
                    </div>

                    <span className="hidden text-[10px] font-bold text-slate-400 sm:block">
                      {bn ? "সার্ভিস" : "Service"}
                    </span>
                  </div>

                  <div className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>

                    <span className="hidden text-[10px] font-bold text-slate-400 sm:block">
                      {bn ? "সম্পন্ন" : "Done"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {bn ? "দ্রুত অ্যাকশন" : "QUICK ACTIONS"}
              </p>

              <h2 className="mt-1 text-xl font-black">
                {bn ? "আপনার সার্ভিস" : "Service shortcuts"}
              </h2>
            </div>

            <div className="space-y-2">

              <button
                onClick={goToServices}
                className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Search className="h-4.5 w-4.5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {bn ? "সার্ভিস খুঁজুন" : "Find a Service"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {bn ? "প্রয়োজনীয় সার্ভিস খুঁজুন" : "Browse available services"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </button>

              <button
                onClick={goToBookings}
                className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {bn ? "আমার বুকিং" : "My Bookings"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {bn ? "সব বুকিং দেখুন" : "Manage your bookings"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </button>

              <button
                onClick={goToFavorites}
                className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                  <Heart className="h-4.5 w-4.5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {bn ? "ফেভারিট" : "Favorites"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {bn ? "পছন্দের সার্ভিস" : "Saved services"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </button>

              <button
                onClick={goToMessages}
                className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-purple-50 dark:hover:bg-purple-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {bn ? "মেসেজ" : "Messages"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {bn ? "প্রোভাইডারের সাথে কথা বলুন" : "Chat with providers"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </button>

            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            SERVICE MANAGEMENT
        -------------------------------------------------- */}

        <div className="mb-8">

          <div className="mb-5 flex items-end justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {bn ? "ম্যানেজ করুন" : "MANAGE"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {bn ? "আপনার সার্ভিস অ্যাক্টিভিটি" : "Your service activity"}
              </h2>
            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <button
              onClick={goToBookings}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>

              <h3 className="font-extrabold">
                {bn ? "বুকিং" : "Bookings"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {bn
                  ? "আপনার সব সার্ভিস বুকিং পরিচালনা করুন"
                  : "View and manage all your service bookings"}
              </p>

              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                {bn ? "বুকিং দেখুন" : "View bookings"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>

            <button
              onClick={goToFavorites}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <Heart className="h-5 w-5" />
              </div>

              <h3 className="font-extrabold">
                {bn ? "ফেভারিট সার্ভিস" : "Favorite Services"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {bn
                  ? "আপনার পছন্দের সার্ভিসগুলো এখানে রাখুন"
                  : "Keep your favorite services in one place"}
              </p>

              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                {bn ? "ফেভারিট দেখুন" : "View favorites"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>

            <button
              onClick={goToReviews}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Star className="h-5 w-5" />
              </div>

              <h3 className="font-extrabold">
                {bn ? "রিভিউ" : "Reviews"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {bn
                  ? "আপনার দেওয়া সার্ভিস রিভিউ দেখুন"
                  : "View the reviews you have given"}
              </p>

              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                {bn ? "রিভিউ দেখুন" : "View reviews"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>

            <button
              onClick={goToAddresses}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <MapPin className="h-5 w-5" />
              </div>

              <h3 className="font-extrabold">
                {bn ? "ঠিকানা" : "Addresses"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {bn
                  ? "আপনার সার্ভিসের ঠিকানা পরিচালনা করুন"
                  : "Manage your service locations"}
              </p>

              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {bn ? "ঠিকানা দেখুন" : "Manage addresses"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>

          </div>
        </div>

        {/* --------------------------------------------------
            ACCOUNT ACTIONS
        -------------------------------------------------- */}

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <h2 className="font-extrabold">
              {bn ? "অ্যাকাউন্ট" : "Account"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {bn
                ? "আপনার অ্যাকাউন্ট সেটিংস পরিচালনা করুন"
                : "Manage your account settings"}
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">

            <button
              onClick={handleNavigateToProfile}
              className="group flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <User className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    {bn ? "প্রোফাইল" : "Profile"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {bn
                      ? "আপনার ব্যক্তিগত তথ্য"
                      : "Your personal information"}
                  </p>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="group flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Settings className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    {bn ? "সেটিংস" : "Settings"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {bn
                      ? "অ্যাকাউন্ট প্রিফারেন্স"
                      : "Account preferences"}
                  </p>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1" />
            </button>

            {!isStandardUser && roleConfig && (
              <button
                onClick={handleNavigateToPanel}
                className="group flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Shield className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      {bn ? "প্যানেল" : "Panel"}{" "}
                      <span className="text-blue-600 dark:text-blue-400">
                        ({roleConfig.labelEn})
                      </span>
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {bn
                        ? "অ্যাডমিন প্যানেল অ্যাক্সেস"
                        : "Access administrative panel"}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1" />
              </button>
            )}

          </div>
        </div>

        {/* --------------------------------------------------
            LOGOUT
        -------------------------------------------------- */}

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white py-4 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 dark:border-red-500/10 dark:bg-slate-900 dark:text-red-400 dark:hover:border-red-500/20 dark:hover:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />

          {bn ? "লগ আউট" : "Logout"}
        </button>
      </main>

      <Footer />
    </div>
  );
};

export default UserDashboard;
