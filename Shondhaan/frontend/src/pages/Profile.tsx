import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, User, Phone, MapPin, Save, Loader2, Camera, Mail, Calendar, Lock, LogOut, Shield, Banknote, FileText, Upload, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRoleConfig } from "@/config/roles";
import { getMySqlAuth, saveMySqlAuth } from "@/lib/mysqlAuth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MART_API_BASE = import.meta.env.VITE_MART_API_BASE_URL || "http://localhost:8081";

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
  const [displayName, setDisplayName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
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
  const [mysqlAuth, setMysqlAuth] = useState(() => getMySqlAuth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!authLoading && !user && !mysqlAuth?.user) {
      navigate("/auth", { replace: true });
    }
  }, [user, mysqlAuth, authLoading, navigate]);

  useEffect(() => {
    if (mysqlAuth?.user && !user) {
      setDisplayName(mysqlAuth.user.name || "");
      setSellerEmail(mysqlAuth.user.email || "");
      setPhone(mysqlAuth.user.mobile || "");
      setAddress(mysqlAuth.user.address || "");
      setShopName(mysqlAuth.user.shop_name || "");
      setShopType(mysqlAuth.user.shop_type || "");
      setUserRoles([mysqlAuth.user.type || mysqlAuth.user.role || "user"]);
      setLoading(false);
      if ((mysqlAuth.user.type || mysqlAuth.user.role) === "mart_vendor") {
        fetchSellerProfile(mysqlAuth.user.id);
      }
      return;
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
        setSellerEmail(user.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setAvatarUrl(data.avatar_url || null);
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
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(bn ? "ফাইল সাইজ ২MB এর বেশি হতে পারবে না" : "File size must be under 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(bn ? "শুধুমাত্র ছবি ফাইল আপলোড করুন" : "Please upload an image file");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `avatars/${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("cms-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(bn ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("cms-images").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
    toast.success(bn ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile photo updated");
  };

  const saveSellerProfile = async (overrides: Record<string, any> = {}) => {
    if (!sellerProfile?.id) {
      toast.error(bn ? "সেলার প্রোফাইল পাওয়া যায়নি" : "Seller profile was not found");
      return null;
    }

    const payload = {
      shop_name: shopName.trim() || null,
      seller_name: displayName.trim() || null,
      seller_email: (isMartVendor ? sellerEmail : accountEmail) || null,
      seller_mobile: phone.trim() || null,
      seller_address: address.trim() || null,
      bank_name: bankName.trim() || null,
      bank_account_name: bankAccountName.trim() || null,
      bank_account_number: bankAccountNumber.trim() || null,
      bank_branch: bankBranch.trim() || null,
      routing_number: routingNumber.trim() || null,
      mobile_banking_provider: mobileBankingProvider.trim() || null,
      mobile_banking_number: mobileBankingNumber.trim() || null,
      nid_front_url: documentUrls.nid_front_url || null,
      nid_back_url: documentUrls.nid_back_url || null,
      trade_license_url: documentUrls.trade_license_url || null,
      tin_certificate_url: documentUrls.tin_certificate_url || null,
      ...overrides,
    };

    const res = await fetch(`${MART_API_BASE}/api/sellers/${sellerProfile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.message || "Failed to save seller profile");
    }
    applySellerProfile(json.data);
    return json.data as MartSellerProfile;
  };

  const handleSellerProfileSave = async () => {
    setSellerSaving(true);
    try {
      await saveSellerProfile();
      toast.success(bn ? "মার্ট ভেন্ডর প্রোফাইল সেভ হয়েছে" : "Mart vendor profile saved");
    } catch (error: any) {
      toast.error(error.message || (bn ? "সেভ ব্যর্থ হয়েছে" : "Save failed"));
    } finally {
      setSellerSaving(false);
    }
  };

  const handleSellerDocumentUpload = async (field: string, file?: File) => {
    if (!file) return;
    if (!sellerProfile?.id) {
      toast.error(bn ? "সেলার প্রোফাইল পাওয়া যায়নি" : "Seller profile was not found");
      return;
    }

    setUploadingDoc(field);
    try {
      const image = await fileToDataUrl(file);
      const res = await fetch(`${MART_API_BASE}/api/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, folder: "seller-documents" }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Document upload failed");
      }
      const nextDocs = { ...documentUrls, [field]: json.url };
      setDocumentUrls(nextDocs);
      await saveSellerProfile({ [field]: json.url });
      toast.success(bn ? "ডকুমেন্ট আপলোড হয়েছে" : "Document uploaded");
    } catch (error: any) {
      toast.error(error.message || (bn ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed"));
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !mysqlAuth?.user) return;

    if (!displayName.trim()) {
      toast.error(t("profile.enterName"));
      return;
    }
    if (phone.trim() && !/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error(t("profile.validPhone"));
      return;
    }

    setSaving(true);
    if (mysqlAuth?.user && !user) {
      try {
        saveMySqlAuth({
          ...mysqlAuth,
          user: {
            ...mysqlAuth.user,
            name: displayName.trim(),
            mobile: phone.trim(),
            address: address.trim() || null,
          },
        });
        if (sellerProfile) {
          await saveSellerProfile({
            seller_name: displayName.trim(),
            seller_mobile: phone.trim(),
            seller_address: address.trim() || null,
          });
        }
        toast.success(t("profile.updated"));
      } catch (error: any) {
        toast.error(error.message || t("profile.updateError"));
      } finally {
        setSaving(false);
      }
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast.error(t("profile.updateError"));
      return;
    }
    toast.success(t("profile.updated"));
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const accountEmail = mysqlAuth?.user?.email || user?.email || "";
  const effectiveRoles = userRoles.length
    ? userRoles
    : mysqlAuth?.user
    ? [mysqlAuth.user.type || mysqlAuth.user.role || "user"]
    : [];
  const isMartVendor = effectiveRoles.includes("mart_vendor");
  const displayedEmail = isMartVendor ? (sellerEmail || accountEmail) : accountEmail;
  const roleLabels = effectiveRoles.map((role) => getRoleConfig(role)?.[bn ? "labelBn" : "labelEn"] || role);
  const shopTypeLabels: Record<string, string> = {
    grocery: bn ? "গ্রোসারি" : "Grocery",
    electronics: bn ? "ইলেকট্রনিক্স" : "Electronics",
    fashion: bn ? "ফ্যাশন" : "Fashion",
    pharmacy: bn ? "ফার্মেসি" : "Pharmacy",
    others: bn ? "অন্যান্য" : "Others",
  };
  const sellerDocumentFields = [
    { key: "nid_front_url", label: bn ? "NID Front" : "NID Front" },
    { key: "nid_back_url", label: bn ? "NID Back" : "NID Back" },
    { key: "trade_license_url", label: bn ? "ট্রেড লাইসেন্স" : "Trade License" },
    { key: "tin_certificate_url", label: bn ? "TIN সার্টিফিকেট" : "TIN Certificate" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className={`mx-auto px-4 py-6 md:py-10 ${isMartVendor ? "max-w-3xl" : "max-w-lg"}`}>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> {t("profile.goBack")}
        </button>

        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6">
          {isMartVendor ? (bn ? "মার্ট ভেন্ডর প্রোফাইল" : "Mart Vendor Profile") : t("profile.title")}
        </h1>

        {/* Avatar & Account Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-4"
        >
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative group">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary overflow-hidden border-2 border-primary/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  isMartVendor ? <Store className="h-8 w-8" /> : <User className="h-8 w-8" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || !user}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                title={!user ? (bn ? "স্টাফ প্রোফাইলে ছবি আপলোড এখন উপলব্ধ নয়" : "Photo upload is not available for staff profile yet") : undefined}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{displayName || t("profile.user")}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{displayedEmail}</span>
              </div>
              {memberSince && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{bn ? "সদস্য হয়েছেন:" : "Member since:"} {memberSince}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Role-specific account info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {bn ? "অ্যাকাউন্ট রোল" : "Account Role"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(roleLabels.length ? roleLabels : [bn ? "ইউজার" : "User"]).map((label) => (
              <span key={label} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {label}
              </span>
            ))}
          </div>
          {isMartVendor && (
            <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{bn ? "শপ নাম" : "Shop Name"}</p>
                <p className="font-semibold text-foreground">{shopName || (bn ? "এখনো দেওয়া হয়নি" : "Not provided yet")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? "শপ টাইপ" : "Shop Type"}</p>
                <p className="font-semibold text-foreground">{shopTypeLabels[shopType] || shopType || (bn ? "এখনো দেওয়া হয়নি" : "Not provided yet")}</p>
              </div>
            </div>
          )}
        </motion.div>

        {isMartVendor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              {bn ? "মার্ট ভেন্ডর প্রোফাইল" : "Mart Vendor Profile"}
            </h2>

            {sellerLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {bn ? "সেলার ডাটা লোড হচ্ছে..." : "Loading seller data..."}
              </div>
            ) : !sellerProfile ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {bn ? "এই অ্যাকাউন্টের জন্য সেলার প্রোফাইল পাওয়া যায়নি।" : "No seller profile was found for this account."}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-background p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4 text-primary" />
                    {bn ? "সেলার তথ্য" : "Seller Information"}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={bn ? "সেলার নাম" : "Seller name"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} placeholder={bn ? "সেলার ইমেইল" : "Seller email"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder={bn ? "মোবাইল নম্বর" : "Mobile number"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={bn ? "সেলার ঠিকানা" : "Seller address"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {bn ? "স্টোর নাম" : "Store Name"}
                    </label>
                    <input
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {bn ? "স্টোর টাইপ" : "Store Type"}
                    </label>
                    <input
                      value={shopTypeLabels[shopType] || shopType || ""}
                      readOnly
                      className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-3 text-base md:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Banknote className="h-4 w-4 text-primary" />
                    {bn ? "ব্যাংকিং ইনফরমেশন" : "Banking Information"}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={bn ? "ব্যাংকের নাম" : "Bank name"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder={bn ? "অ্যাকাউন্টের নাম" : "Account name"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder={bn ? "অ্যাকাউন্ট নম্বর" : "Account number"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder={bn ? "ব্রাঞ্চ" : "Branch"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder={bn ? "রাউটিং নম্বর" : "Routing number"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <select value={mobileBankingProvider} onChange={(e) => setMobileBankingProvider(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="">{bn ? "মোবাইল ব্যাংকিং" : "Mobile banking"}</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                    </select>
                    <input value={mobileBankingNumber} onChange={(e) => setMobileBankingNumber(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder={bn ? "মোবাইল ব্যাংকিং নম্বর" : "Mobile banking number"} className="rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring md:col-span-2" />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    {bn ? "ডকুমেন্ট আপলোড" : "Documents Upload"}
                  </h3>
                  <div className="grid gap-3">
                    {sellerDocumentFields.map((doc) => (
                      <label key={doc.key} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.label}</p>
                          {documentUrls[doc.key] ? (
                            <a href={documentUrls[doc.key]} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                              {bn ? "আপলোড করা ফাইল দেখুন" : "View uploaded file"}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground">{bn ? "এখনো আপলোড করা হয়নি" : "Not uploaded yet"}</p>
                          )}
                        </div>
                        <span className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                          {uploadingDoc === doc.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingDoc === doc.key ? (bn ? "আপলোড হচ্ছে" : "Uploading") : (bn ? "আপলোড" : "Upload")}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            disabled={uploadingDoc === doc.key}
                            onChange={(e) => handleSellerDocumentUpload(doc.key, e.target.files?.[0])}
                            className="hidden"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSellerProfileSave}
                  disabled={sellerSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {sellerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {bn ? "ভেন্ডর প্রোফাইল সেভ করুন" : "Save Vendor Profile"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Edit Profile Form */}
        {!isMartVendor && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.name")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  enterKeyHint="next"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                  maxLength={100}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.phone")}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="01[3-9][0-9]{8}"
                  autoComplete="tel"
                  enterKeyHint="next"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.address")}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("profile.addressPlaceholder")}
                  maxLength={300}
                  rows={2}
                  autoComplete="street-address"
                  autoCapitalize="sentences"
                  enterKeyHint="done"
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition resize-none"
                />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("profile.saving")}</>
              ) : (
                <><Save className="h-4 w-4" /> {t("profile.save")}</>
              )}
            </button>
          </form>
        </motion.div>
        )}

        {/* Security Section */}
        {!isMartVendor && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {bn ? "নিরাপত্তা" : "Security"}
          </h2>

          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span>{bn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {bn ? "নতুন পাসওয়ার্ড" : "New Password"}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowPasswordChange(false); setNewPassword(""); setConfirmPassword(""); }}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  {bn ? "বাতিল" : "Cancel"}
                </button>
                <button onClick={handlePasswordChange} disabled={changingPassword}
                  className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (bn ? "পরিবর্তন করুন" : "Update")}
                </button>
              </div>
            </div>
          )}
        </motion.div>
        )}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </motion.div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Profile;
