import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, LogOut, Settings, Shield, Home, ChevronRight,
  AlertCircle, Loader2, Phone, Mail
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

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-central.shondhaan.com";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [mysqlAuth, setMysqlAuth] = useState(() => getMySqlAuth());

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    bookings: 0,
    orders: 0,
    pendingRequests: 0,
    reviews: 0,
  });

  // 🔄 Sync auth
  useEffect(() => {
    const sync = () => setMysqlAuth(getMySqlAuth());
    window.addEventListener("yess-mysql-auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("yess-mysql-auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // 🔒 Auth Guard + Load
  useEffect(() => {
    if (mysqlAuth === null) return;

    if (!mysqlAuth?.user || !mysqlAuth?.token) {
      navigate("/auth");
      return;
    }

    setUserRole(mysqlAuth.user.role || "user");
    fetchUserProfile(mysqlAuth.token);
  }, [mysqlAuth]);

  // 📦 Fetch Profile
  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired");
        }
        throw new Error("Failed to load profile");
      }

      const data = await res.json();

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

  // 📊 Stats
  const fetchUserStats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  // 🚪 Logout (MySQL only)
  const handleLogout = () => {
    localStorage.removeItem("yess_mysql_auth");
    window.dispatchEvent(new Event("yess-mysql-auth-changed"));
    toast.success(bn ? "লগ আউট সফল" : "Logged out");
    navigate("/auth");
  };

  const handleNavigateToPanel = () => {
    const roleConfig = getRoleConfig(userRole);
    if (roleConfig && userRole !== "user") {
      navigate(roleConfig.panelPath);
    }
  };

  const handleNavigateToProfile = () => {
    navigate("/profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="p-6 text-red-600">
          {error || "Failed to load"}
        </div>
        <Footer />
      </div>
    );
  }

  const roleConfig = getRoleConfig(userRole);
  const isStandardUser = userRole === "user";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto p-4 max-w-4xl">

        {/* Header */}
        <h1 className="text-2xl font-bold mb-6">
          {bn ? "ড্যাশবোর্ড" : "Dashboard"}
        </h1>

        {/* Profile */}
        <div className="bg-white p-4 rounded shadow mb-6 flex justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-blue-500 rounded flex items-center justify-center text-white">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover rounded" />
              ) : (
                <User />
              )}
            </div>

            <div>
              <h2 className="font-bold text-lg">{profile.name}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>

          <button onClick={handleNavigateToProfile}>
            {bn ? "সম্পাদনা" : "Edit"}
          </button>
        </div>

        {/* Contact */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <Mail /> {profile.email}
          </div>
          <div className="bg-white p-4 rounded shadow">
            <Phone /> {profile.phone}
          </div>
        </div>

        {/* Stats */}
        {!isStandardUser && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="bg-white p-4 rounded shadow text-center">
                <p>{k}</p>
                <b>{v}</b>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white p-4 rounded shadow space-y-3">
          <button onClick={handleNavigateToProfile} className="w-full text-left">
            {bn ? "প্রোফাইল" : "Profile"}
          </button>

          {!isStandardUser && roleConfig && (
            <button onClick={handleNavigateToPanel} className="w-full text-left">
              {bn ? "প্যানেল" : "Panel"} ({roleConfig.labelEn})
            </button>
          )}

          <button onClick={() => navigate("/profile")} className="w-full text-left">
            {bn ? "সেটিংস" : "Settings"}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-6 w-full bg-red-600 text-white p-3 rounded"
        >
          <LogOut /> {bn ? "লগ আউট" : "Logout"}
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default UserDashboard;