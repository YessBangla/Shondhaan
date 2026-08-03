import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, User, Phone, MapPin, Save, Loader2, Camera, Mail, Calendar, Lock, 
  LogOut, Shield, Banknote, FileText, Upload, Store, Briefcase,
  Info, Edit2, X, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRoleConfig } from "@/config/roles";
import { CENTRAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth, saveMySqlAuth, clearMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MART_API_BASE = import.meta.env.VITE_MART_API_BASE_URL;
const CENTRAL_PROFILE_API = `${CENTRAL_API_BASE_URL.replace(/\/+$/, "")}/api/users/me/profile`;

type CentralProfile = {
  id: number;
  name: string | null;
  mobile?: string | null;
  phone?: string | null;
  address: string | null;
  email: string | null;
  type?: string | null;
  role?: string | null;
  shop_name?: string | null;
  shop_type?: string | null;
  profile_image?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  nid_front?: string | null;
  nid_back?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MartSellerProfile = {
  id: number;
  user_id: number | null;
  shop_name: string | null;
  shop_type?: string | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_mobile: string | null;
  seller_address: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  routing_number?: string | null;
  mobile_banking_provider?: string | null;
  mobile_banking_number?: string | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  trade_license_url?: string | null;
  tin_certificate_url?: string | null;
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nidFront, setNidFront] = useState<string | null>(null);
  const [nidBack, setNidBack] = useState<string | null>(null);

  // Seller fields
  const [sellerEmail, setSellerEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [sellerProfile, setSellerProfile] = useState<MartSellerProfile | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerSaving, setSellerSaving] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [mobileBankingProvider, setMobileBankingProvider] = useState("");
  const [mobileBankingNumber, setMobileBankingNumber] = useState("");
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // State management
  const [mysqlAuth, setMysqlAuth] = useState(() => getMySqlAuth());
  const [loading, setLoading] = useState(true);
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [accountUpdatedAt, setAccountUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const syncMysqlAuth = () => setMysqlAuth(getMySqlAuth());
    window.addEventListener("yess-mysql-auth-changed", syncMysqlAuth);
    window.addEventListener("storage", syncMysqlAuth);
    return () => {
      window.removeEventListener("yess-mysql-auth-changed", syncMysqlAuth);
      window.removeEventListener("storage", syncMysqlAuth);
    };
  }, []);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const baseUrl = CENTRAL_API_BASE_URL.replace(/\/+$/, "");
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    // ✅ encode spaces & special characters
    return `${baseUrl}${encodeURI(formattedPath)}`;
  };

  const applyCentralProfile = (profile: CentralProfile) => {
    const role = (profile.type || profile.role || "user") as any;
    setDisplayName(profile.name || "");
    setEmail(profile.email || "");
    setSellerEmail(profile.email || "");
    setPhone(profile.mobile || profile.phone || "");
    setAddress(profile.address || "");
    setAvatarUrl(getFullImageUrl(profile.profile_image || profile.avatar_url || null));
    setBio(profile.bio || "");
    setGender(profile.gender || "");
    setDateOfBirth(profile.date_of_birth ? profile.date_of_birth.split("T")[0] : "");
    setNidFront(profile.nid_front || null);
    setNidBack(profile.nid_back || null);
    setShopName(profile.shop_name || "");
    setShopType(profile.shop_type || "");
    setUserRoles([role]);
    setAccountCreatedAt(profile.created_at || null);
    setAccountUpdatedAt(profile.updated_at || null);
  };

  const fetchCentralProfile = async () => {
    try {
      const response = await fetch(CENTRAL_PROFILE_API, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Profile fetch failed:", error);
      throw error;
    }
  };

  const saveCentralProfile = async (payload: Record<string, unknown>) => {
    const response = await fetch(CENTRAL_PROFILE_API, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Could not update profile");
    }
    return data as CentralProfile;
  };

  const fetchSellerProfile = async (userId: string | number) => {
    setSellerLoading(true);
    try {
      const res = await fetch(`${MART_API_BASE}/api/sellers?user_id=${encodeURIComponent(String(userId))}`);
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Could not load seller profile");
      }
      applySellerProfile(json.data?.[0] || null);
    } catch (error: any) {
      toast.error(error.message || (bn ? "সেলার প্রোফাইল লোড হয়নি" : "Seller profile could not be loaded"));
    } finally {
      setSellerLoading(false);
    }
  };

  const applySellerProfile = (seller: MartSellerProfile | null) => {
    setSellerProfile(seller);
    if (seller?.seller_name) setDisplayName(seller.seller_name);
    if (seller?.seller_email) setSellerEmail(seller.seller_email);
    if (seller?.seller_mobile) setPhone(seller.seller_mobile);
    if (seller?.seller_address) setAddress(seller.seller_address);
    setShopName(seller?.shop_name || seller?.seller_name || "");
    setShopType(seller?.shop_type || "");
    setBankName(seller?.bank_name || "");
    setBankAccountName(seller?.bank_account_name || "");
    setBankAccountNumber(seller?.bank_account_number || "");
    setBankBranch(seller?.bank_branch || "");
    setRoutingNumber(seller?.routing_number || "");
    setMobileBankingProvider(seller?.mobile_banking_provider || "");
    setMobileBankingNumber(seller?.mobile_banking_number || "");
    setDocumentUrls({
      nid_front_url: seller?.nid_front_url || "",
      nid_back_url: seller?.nid_back_url || "",
      trade_license_url: seller?.trade_license_url || "",
      tin_certificate_url: seller?.tin_certificate_url || "",
    });
  };

  useEffect(() => {
    if (!authLoading && !user && !mysqlAuth?.user) {
      navigate("/auth", { replace: true });
    }
  }, [user, mysqlAuth, authLoading, navigate]);

  useEffect(() => {
    if (mysqlAuth?.user) {
      let cancelled = false;
      setLoading(true);

      fetchCentralProfile()
        .then(async (profile) => {
          if (cancelled) return;
          applyCentralProfile(profile);
          const role = profile.type || profile.role || mysqlAuth.user.type || mysqlAuth.user.role;
          if (role === "mart_vendor") {
            await fetchSellerProfile(profile.id || mysqlAuth.user.id);
          }
        })
        .catch((error: any) => {
          if (cancelled) return;
          applyCentralProfile(mysqlAuth.user as unknown as CentralProfile);
          const role = mysqlAuth.user.type || mysqlAuth.user.role;
          if (role === "mart_vendor") {
            fetchSellerProfile(mysqlAuth.user.id).catch(() => {});
          }
          toast.error(error.message || (bn ? "প্রোফাইল লোড করতে ব্যর্থ" : "Failed to load profile"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, phone, address, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setDisplayName(data.display_name || "");
        setEmail(user.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setAvatarUrl(data.avatar_url || null);
        setAccountCreatedAt(user.created_at || null);
      }

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const nextRoles = roles?.map((r) => r.role) || ["user"];
      setUserRoles(nextRoles);

      if (nextRoles.includes("mart_vendor")) {
        await fetchSellerProfile(user.id);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, mysqlAuth]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);

      if (mysqlAuth?.user) {
        // --- CENTRAL API (MySQL) UPLOAD ---
        const formData = new FormData();
        formData.append("profile_image", file); // ✅ MUST MATCH BACKEND FIELD

        const res = await fetch(CENTRAL_PROFILE_API, {
          method: "PATCH", // ✅ IMPORTANT
          credentials: "include",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Upload failed");
        }

        setAvatarUrl(getFullImageUrl(data.profile_image));
        toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile picture updated");
      } else if (user) {
        // --- SUPABASE UPLOAD ---
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrlData.publicUrl })
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setAvatarUrl(publicUrlData.publicUrl);
        toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile picture updated");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed"));
    } finally {
      setUploadingAvatar(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mysqlAuth?.user) {
      toast.error("Please login first");
      navigate("/auth");
      return;
    }

    if (!displayName.trim()) {
      toast.error(bn ? "নাম অবশ্যই দিতে হবে" : "Name is required");
      return;
    }

    if (phone.trim() && !/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error(bn ? "ফোন নম্বর বৈধ নয়" : "Invalid phone number");
      return;
    }

    setSaving(true);

    try {
      const updatedProfile = await saveCentralProfile({
        name: displayName.trim(),
        mobile: phone.trim(),
        address: address.trim() || null,
        bio: bio.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
      });

      applyCentralProfile(updatedProfile);

      saveMySqlAuth({
        message: "Profile updated",
        user: {
          ...mysqlAuth.user,
          name: updatedProfile.name || displayName.trim(),
          mobile: updatedProfile.mobile || updatedProfile.phone || phone.trim(),
          address: updatedProfile.address || null,
          email: updatedProfile.email || mysqlAuth.user.email,
        },
      });

      setEditMode(false);
      toast.success(bn ? "প্রোফাইল আপডেট হয়েছে" : "Profile updated successfully");
    } catch (error: any) {
      if (error.message.includes("401")) {
        clearMySqlAuth?.();
        navigate("/auth");
      }
      toast.error(error.message || (bn ? "আপডেট ব্যর্থ হয়েছে" : "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error(bn ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(bn ? "পাসওয়ার্ড মিলছে না" : "Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast.error(bn ? "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে" : "Failed to change password");
      return;
    }
    toast.success(bn ? "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে" : "Password changed successfully");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordChange(false);
  };

  const handleLogout = async () => {
    if (mysqlAuth?.user) {
      localStorage.removeItem("yess_mysql_auth");
      window.dispatchEvent(new Event("yess-mysql-auth-changed"));
    }
    await supabase.auth.signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const memberSinceDate = accountCreatedAt || user?.created_at || "";
  const memberSince = memberSinceDate
    ? new Date(memberSinceDate).toLocaleDateString(bn ? "bn-BD" : "en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const usesCentralProfile = Boolean(mysqlAuth?.user);
  const effectiveRoles = userRoles.length ? userRoles : mysqlAuth?.user ? [mysqlAuth.user.type || mysqlAuth.user.role || "user"] : [];
  const isMartVendor = effectiveRoles.includes("mart_vendor");
  const roleLabels = effectiveRoles.map((role) => getRoleConfig(role)?.[bn ? "labelBn" : "labelEn"] || role);

  const genderLabels = {
    male: bn ? "পুরুষ" : "Male",
    female: bn ? "মহিলা" : "Female",
    other: bn ? "অন্যান্য" : "Other",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto px-4 py-6 md:py-10 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ChevronLeft className="h-4 w-4" /> {bn ? "ফিরে যান" : "Go Back"}
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {bn ? "আমার প্রোফাইল" : "My Profile"}
            </h1>
          </div>
          {!editMode && !isMartVendor && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Edit2 className="h-4 w-4" />
              {bn ? "সম্পাদনা" : "Edit"}
            </button>
          )}
        </motion.div>

        {/* Avatar & Basic Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar Section */}
            <div className="relative group flex-shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary overflow-hidden border-3 border-primary/30">
                {avatarUrl ? (
                 <img
                  src={avatarUrl || "/default-avatar.png"}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover"
                />
                ) : (
                  <User className="h-12 w-12 text-primary" />
                )}
              </div>
              {!editMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                hidden
              />
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-1">{displayName || (bn ? "ব্যবহারকারী" : "User")}</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
                
                {phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{phone}</span>
                  </div>
                )}

                {memberSince && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{bn ? "সদস্য হয়েছেন:" : "Member since:"} {memberSince}</span>
                  </div>
                )}

                {accountUpdatedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{bn ? "সর্বশেষ আপডেট:" : "Last updated:"} {new Date(accountUpdatedAt).toLocaleDateString(bn ? "bn-BD" : "en-US")}</span>
                  </div>
                )}
              </div>

              {/* Role Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {roleLabels.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                    <Shield className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Information */}
        {editMode ? (
          <motion.form
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4 space-y-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
              </h2>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="p-1 hover:bg-secondary rounded-lg transition"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {bn ? "পূর্ণ নাম" : "Full Name"} *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={bn ? "আপনার নাম" : "Your name"}
                  maxLength={100}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {bn ? "ফোন নম্বর" : "Phone Number"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {bn ? "ঠিকানা" : "Address"}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={bn ? "আপনার ঠিকানা" : "Your address"}
                maxLength={300}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {bn ? "পরিচয়" : "Bio"}
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={bn ? "নিজের সম্পর্কে বলুন" : "Tell us about yourself"}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{bio.length}/500</p>
            </div>

            {/* Gender & DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {bn ? "লিঙ্গ" : "Gender"}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{bn ? "নির্বাচন করুন" : "Select"}</option>
                  <option value="male">{genderLabels.male}</option>
                  <option value="female">{genderLabels.female}</option>
                  <option value="other">{genderLabels.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {bn ? "জন্মতারিখ" : "Date of Birth"}
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {bn ? "সংরক্ষণ করছি..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {bn ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 px-4 py-3 rounded-lg border border-input text-foreground font-semibold hover:bg-secondary transition"
              >
                {bn ? "বাতিল" : "Cancel"}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {bn ? "বিস্তারিত তথ্য" : "Detailed Information"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{bn ? "ঠিকানা" : "Address"}</p>
                  <p className="text-foreground font-medium">{address || (bn ? "দেওয়া হয়নি" : "Not provided")}</p>
                </div>

                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{bn ? "লিঙ্গ" : "Gender"}</p>
                  <p className="text-foreground font-medium">{gender ? genderLabels[gender as keyof typeof genderLabels] : (bn ? "দেওয়া হয়নি" : "Not provided")}</p>
                </div>

                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{bn ? "জন্মতারিখ" : "Date of Birth"}</p>
                  <p className="text-foreground font-medium">
                    {dateOfBirth
                      ? new Date(dateOfBirth).toLocaleDateString(bn ? "bn-BD" : "en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : (bn ? "দেওয়া হয়নি" : "Not provided")}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{bn ? "পরিচয়" : "Bio"}</p>
                  <p className="text-foreground font-medium">{bio || (bn ? "দেওয়া হয়নি" : "Not provided")}</p>
                </div>

                {nidFront && (
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {bn ? "NID (সামনের দিক)" : "NID Front"}
                    </p>
                    <a href={nidFront} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium">
                      {bn ? "দেখুন" : "View"}
                    </a>
                  </div>
                )}

                {nidBack && (
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {bn ? "NID (পিছনের দিক)" : "NID Back"}
                    </p>
                    <a href={nidBack} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium">
                      {bn ? "দেখুন" : "View"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Account Security */}
        {!isMartVendor && !usesCentralProfile && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {bn ? "পাসওয়ার্ড পরিবর্তন" : "Change Password"}
            </h2>

            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition font-medium"
              >
                <Lock className="h-4 w-4" />
                {bn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {bn ? "নতুন পাসওয়ার্ড" : "New Password"}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-input hover:bg-secondary transition font-medium"
                  >
                    {bn ? "বাতিল" : "Cancel"}
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium disabled:opacity-50"
                  >
                    {changingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      bn ? "আপডেট করুন" : "Update"
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {bn ? "অ্যাকাউন্ট তথ্য" : "Account Information"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">{bn ? "অ্যাকাউন্ট আইডি" : "Account ID"}</p>
              <p className="text-lg font-bold text-foreground">#{mysqlAuth?.user?.id || user?.id || "—"}</p>
            </div>

            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">{bn ? "একাউন্ট ধরন" : "Account Type"}</p>
              <p className="text-lg font-bold text-foreground capitalize">{mysqlAuth?.user?.type || "user"}</p>
            </div>

            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">{bn ? "সদস্যতা" : "Member Since"}</p>
              <p className="text-sm font-medium text-foreground">{memberSince || "—"}</p>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition font-medium"
        >
          <LogOut className="h-4 w-4" />
          {bn ? "লগ আউট করুন" : "Logout"}
        </motion.button>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Profile;