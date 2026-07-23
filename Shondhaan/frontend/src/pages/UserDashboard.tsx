import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, LogOut, Settings, Shield, Home, ChevronRight,
  Clock, AlertCircle, CheckCircle2, Loader2, Phone, Mail
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRoleConfig, ROLES } from "@/config/roles";
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

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    bookings: 0,
    orders: 0,
    pendingRequests: 0,
    reviews: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Get user role and ID from localStorage
    const mysqlAuth = getMySqlAuth();
    if (!mysqlAuth?.user) {
      navigate("/auth");
      return;
    }

    const authenticatedUserId = mysqlAuth.user.id;
    const authenticatedRole = mysqlAuth.user.role;

    // Verify user exists and is authenticated
    if (!authenticatedUserId) {
      setError(bn ? "অননুমোদিত অ্যাক্সেস" : "Unauthorized access");
      toast.error(bn ? "অনুমতি দেওয়া হয়নি" : "Access denied");
      navigate("/auth");
      return;
    }

    setUserRole(authenticatedRole || "user");
    fetchUserProfile(mysqlAuth.token, authenticatedUserId);
  }, [user, navigate, bn]);

  const fetchUserProfile = async (token: string, userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || "https://backend-central.shondhaan.com"}/api/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(bn ? "আপনি এই ড্যাশবোর্ড অ্যাক্সেস করতে পারবেন না" : "You don't have access to this dashboard");
        }
        if (response.status === 401) {
          throw new Error(bn ? "অনুমতি শেষ হয়েছে। পুনরায় লগইন করুন" : "Session expired. Please login again");
        }
        throw new Error(bn ? "প্রোফাইল লোড করতে ব্যর্থ" : "Failed to load profile");
      }

      const data = await response.json();

      // Verify the profile belongs to the authenticated user
      if (data.id !== userId) {
        throw new Error(bn ? "ডেটা ভেরিফিকেশন ব্যর্থ" : "Data verification failed");
      }

      setProfile(data);
      // Fetch stats if available
      fetchUserStats(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error fetching profile";
      console.error("Error fetching profile:", error);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (token: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || "https://backend-central.shondhaan.com"}/api/user/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(bn ? "লগ আউট সফল" : "Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(bn ? "লগ আউট ব্যর্থ হয়েছে" : "Logout failed");
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Show error if profile is not loaded
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-6"
          >
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">
                  {bn ? "ত্রুটি" : "Error"}
                </h3>
                <p className="text-red-800 mb-4">
                  {error || (bn ? "প্রোফাইল লোড করতে পারা যায়নি" : "Could not load your profile")}
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  {bn ? "হোমে ফিরুন" : "Go Home"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  const roleConfig = getRoleConfig(userRole);
  const isStandardUser = userRole === "user";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              {bn ? "আমার ড্যাশবোর্ড" : "My Dashboard"}
            </h1>
            <button
              onClick={() => navigate("/")}
              className="text-slate-600 hover:text-slate-900"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {profile?.name || "User"}
                </h2>
                {roleConfig && (
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium text-slate-600">
                      {roleConfig.labelEn}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleNavigateToProfile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {bn ? "সম্পাদনা করুন" : "Edit Profile"}
            </button>
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">
                {bn ? "ইমেইল" : "Email"}
              </span>
            </div>
            <p className="text-slate-900 font-medium break-all">
              {profile?.email || "-"}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">
                {bn ? "ফোন" : "Phone"}
              </span>
            </div>
            <p className="text-slate-900 font-medium">{profile?.phone || "-"}</p>
          </div>
        </motion.div>

        {/* Stats Section */}
        {!isStandardUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: bn ? "বুকিং" : "Bookings", value: stats.bookings },
              { label: bn ? "অর্ডার" : "Orders", value: stats.orders },
              { label: bn ? "অপেক্ষমান" : "Pending", value: stats.pendingRequests },
              { label: bn ? "রিভিউ" : "Reviews", value: stats.reviews },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Navigation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-8"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {bn ? "দ্রুত অ্যাক্সেস" : "Quick Access"}
          </h3>

          <div className="space-y-3">
            {/* Profile Button */}
            <button
              onClick={handleNavigateToProfile}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-600" />
                <span className="text-slate-900 font-medium">
                  {bn ? "আমার প্রোফাইল" : "My Profile"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            </button>

            {/* Role-specific Panel Button */}
            {!isStandardUser && roleConfig && (
              <button
                onClick={handleNavigateToPanel}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <roleConfig.icon className="w-5 h-5 text-blue-600" />
                  <span className="text-slate-900 font-medium">
                    {bn ? "আমার প্যানেল" : "My Panel"} -{" "}
                    {roleConfig.labelEn}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400 group-hover:text-blue-600" />
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => navigate("/profile")}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-600" />
                <span className="text-slate-900 font-medium">
                  {bn ? "সেটিংস" : "Settings"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>
        </motion.div>

        {/* Access Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8"
        >
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                {bn ? "আপনার ভূমিকা সম্পর্কে" : "About Your Role"}
              </h4>
              <p className="text-sm text-blue-800">
                {isStandardUser
                  ? bn
                    ? "আপনি একজন সাধারণ ব্যবহারকারী। আপনি শুধুমাত্র এই ড্যাশবোর্ড এবং সেবা বুকিং অ্যাক্সেস করতে পারেন। অন্য কোনো ব্যবহারকারীর ড্যাশবোর্ড দেখতে পারবেন না।"
                    : "You are a standard user. You can only access this dashboard and service booking features. You cannot view other users' dashboards."
                  : bn
                    ? `আপনার ভূমিকা: ${roleConfig?.labelBn}। আপনি এই ড্যাশবোর্ড এবং আপনার ভূমিকা-নির্দিষ্ট প্যানেল উভয়ই অ্যাক্সেস করতে পারেন। আপনি শুধুমাত্র আপনার নিজস্ব ডেটা দেখতে পারেন।`
                    : `Your role: ${roleConfig?.labelEn}. You have access to both this dashboard and your role-specific panel. You can only see your own data.`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {bn ? "লগ আউট করুন" : "Logout"}
          </button>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default UserDashboard;
