import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Phone, Save, Loader2, Camera, Mail, Calendar, Lock,
  LogOut, Shield, FileText,
  Info, Edit2, X, CheckCircle,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRoleConfig } from "@/config/roles";
import { CENTRAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth, saveMySqlAuth, clearMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";

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

interface ProfileContentProps {
  /** Optional callback fired after a successful profile save (e.g. to refresh dashboard header) */
  onProfileUpdated?: (profile: {
    display_name: string;
    phone: string;
    address: string;
    email: string;
    profile_image_url: string | null;
  }) => void;
  /** Show the "Go Back" + page-title header. Off by default when embedded in a tab. */
  showHeader?: boolean;
}

const ProfileContent = ({ onProfileUpdated, showHeader = false }: ProfileContentProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
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

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const baseUrl = CENTRAL_API_BASE_URL.replace(/\/+$/, "");
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
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
  const auth = getMySqlAuth();
  const response = await fetch(CENTRAL_PROFILE_API, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  });
  if (response.status === 401) throw new Error("Unauthorized");
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return await response.json();
};

const saveCentralProfile = async (payload: Record<string, unknown>) => {
  const auth = getMySqlAuth();
  const response = await fetch(CENTRAL_PROFILE_API, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not update profile");
  return data as CentralProfile;
};

  const fetchSellerProfile = async (userId: string | number) => {
    try {
      const res = await fetch(`${MART_API_BASE}/api/sellers?user_id=${encodeURIComponent(String(userId))}`);
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Could not load seller profile");
      setSellerProfile(json.data?.[0] || null);
    } catch (error: any) {
      toast.error(error.message || (bn ? "সেলার প্রোফাইল লোড হয়নি" : "Seller profile could not be loaded"));
    }
  };

  useEffect(() => {
    if (!authLoading && !user && !mysqlAuth?.user) {
      navigate("/login", { replace: true });
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
        const formData = new FormData();
        formData.append("profile_image", file);

        const res = await fetch(CENTRAL_PROFILE_API, {
          method: "PATCH",
          credentials: "include",
          headers: {
            ...(mysqlAuth.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}),
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Upload failed");

        const fullUrl = getFullImageUrl(data.profile_image);
        setAvatarUrl(fullUrl);
        toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile picture updated");

        onProfileUpdated?.({
          display_name: displayName,
          phone,
          address,
          email,
          profile_image_url: fullUrl,
        });
      } else if (user) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrlData.publicUrl })
          .eq("user_id", user.id);
        if (updateError) throw updateError;

        setAvatarUrl(publicUrlData.publicUrl);
        toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile picture updated");

        onProfileUpdated?.({
          display_name: displayName,
          phone,
          address,
          email,
          profile_image_url: publicUrlData.publicUrl,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mysqlAuth?.user) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    if (!displayName.trim()) {
      toast.error(bn ? "নাম অবশ্যই দিতে হবে" : "Name is required");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(bn ? "সঠিক ইমেইল দিন" : "Enter a valid email address");
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
        email: email.trim(),
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
          email: updatedProfile.email || email.trim(),
        },
      });

      onProfileUpdated?.({
        display_name: updatedProfile.name || displayName.trim(),
        phone: updatedProfile.mobile || updatedProfile.phone || phone.trim(),
        address: updatedProfile.address || address.trim(),
        email: updatedProfile.email || email.trim(),
        profile_image_url: getFullImageUrl(updatedProfile.profile_image || updatedProfile.avatar_url || null),
      });

      setEditMode(false);
      toast.success(bn ? "প্রোফাইল আপডেট হয়েছে" : "Profile updated successfully");
    } catch (error: any) {
      if (error.message.includes("401")) {
        clearMySqlAuth?.();
        navigate("/login");
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
      <div className="flex items-center justify-center py-20">
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
    <div>
      {showHeader && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{bn ? "আমার প্রোফাইল" : "My Profile"}</h1>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-1 md:py-2 rounded-lg bg-primary text-white hover:bg-emerald-600 transition"
            >
              <Edit2 className="h-4 w-4" />
              {bn ? "এডিট" : "Edit"}
            </button>
          )}
        </motion.div>
      )}

      {/* Avatar & Basic Info Card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative group flex-shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary overflow-hidden border-3 border-primary/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-userprimary text-white shadow-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} hidden />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold text-foreground mb-1">{displayName || (bn ? "ব্যবহারকারী" : "User")}</h2>
              {!showHeader && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="rounded-full md:bg-userprimary text-foreground md:flex px-2 py-1 md:gap-1 md:text-white text-xs font-semibold md:hover:bg-emerald-600 transition"
                  >
                  <Edit className="my-auto h-3.5 w-3.5"/>
                  <span className="hidden md:inline">{bn ? "এডিট" : "Edit"}</span>
                </button>
              )}
            </div>

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

            <div className="flex flex-wrap gap-2 mt-4">
              {roleLabels.map((label) => (
                <span key={label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-userprimary border border-userprimary">
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
              <User className="h-5 w-5 text-userprimary" />
              {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
            </h2>
            <button type="button" onClick={() => setEditMode(false)} className="p-1 hover:bg-secondary rounded-lg transition">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{bn ? "পূর্ণ নাম" : "Full Name"} *</label>
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
              <label className="block text-sm font-medium text-foreground mb-2">{bn ? "ইমেইল" : "Email"}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={bn ? "আপনার ইমেইল" : "your@email.com"}
                maxLength={150}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{bn ? "ফোন নম্বর" : "Phone Number"}</label>
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{bn ? "ঠিকানা" : "Address"}</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={bn ? "আপনার ঠিকানা" : "Your address"}
              maxLength={300}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{bn ? "পরিচয়" : "Bio"}</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{bn ? "লিঙ্গ" : "Gender"}</label>
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
              <label className="block text-sm font-medium text-foreground mb-2">{bn ? "জন্মতারিখ" : "Date of Birth"}</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex text-[12px] md:text-[14px] items-center justify-center gap-2 px-4 py-1 md:py-3 text-nowrap rounded-lg bg-userprimary text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {bn ? "সংরক্ষণ করছি..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {bn ? "সেইভ চেইঞ্জস" : "Save Changes"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="flex-1 px-4 py-1 md:py-3 text-nowrap text-[12px] md:text-[14px] rounded-lg border border-input text-foreground font-semibold hover:bg-secondary transition"
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
            <Info className="h-5 w-5 text-userprimary" />
            {bn ? "বিস্তারিত তথ্য" : "Detailed Information"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    ? new Date(dateOfBirth).toLocaleDateString(bn ? "bn-BD" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                    : (bn ? "দেওয়া হয়নি" : "Not provided")}
                </p>
              </div>
            </div>

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
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4">
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
                <label className="block text-sm font-medium text-foreground mb-2">{bn ? "নতুন পাসওয়ার্ড" : "New Password"}</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">{bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}</label>
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
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition font-medium disabled:opacity-50"
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : bn ? "আপডেট করুন" : "Update"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Account Info */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4">
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

      {/* Logout */}
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
  );
};

export default ProfileContent;