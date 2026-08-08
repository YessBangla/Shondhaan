import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, LayoutDashboard, BarChart3, Wallet, ShieldCheck,
  Users, Settings, Package, Grid3X3, Percent, Image, LayoutList,
  FileText, MessageSquare, Briefcase, Star, Bot, MapPinCheck,
  Bell, Tag, Banknote, ImagePlus, Handshake, ShoppingCart, Calendar,
  Receipt, Crown, Key, Activity, CreditCard, Store, RefreshCw, Truck,
  Headphones
  , UserPlus, UserCog,
  UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { clearMySqlAuth, getMySqlAuth } from "@/lib/mysqlAuth";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import AccountsSection from "@/components/AccountsSection";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

// Admin components (reused)
import AdminServices from "@/components/admin/AdminServices";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminOffers from "@/components/admin/AdminOffers";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminHomepageSections from "@/components/admin/AdminHomepageSections";
import AdminSiteSettings from "@/components/admin/AdminSiteSettings";
import AdminServiceRequests from "@/components/admin/AdminServiceRequests";
import AdminContactMessages from "@/components/admin/AdminContactMessages";
import AdminJobApplications from "@/components/admin/AdminJobApplications";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminUserRoles from "@/components/admin/AdminUserRoles";
import AdminPermissions from "@/components/admin/AdminPermissions";
import AdminChatHistory from "@/components/admin/AdminChatHistory";
import AdminRepresentatives from "@/components/admin/AdminRepresentatives";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";
import ServiceImageManager from "@/components/admin/ServiceImageManager";
import AdminDealManagement from "@/components/admin/AdminDealManagement";
import AdminMartOverview from "@/components/admin/AdminMartOverview";
import AdminDealOverview from "@/components/admin/AdminDealOverview";

// Super Admin exclusive
import POSSystem from "@/components/super-admin/POSSystem";
import SaaSManagement from "@/components/super-admin/SaaSManagement";
import CentralAccounts from "@/components/super-admin/CentralAccounts";
import SuperAdminOverview from "@/components/super-admin/SuperAdminOverview";
import SuperAdminProfile from "@/components/super-admin/SuperAdminProfile";
import StaffAssignmentManager from "@/components/admin/StaffAssignmentManager";
import AdminMartKyc from "@/components/mart/AdminMartKyc";
import AdminDeliveryKyc from "@/components/mart/AdminDeliveryKyc";
import AdminMartCategories from "@/components/admin/Adminmartcategories";
import AdminMartBanners from "@/components/mart/Adminmartbanners";
import ServiceStaffChatInbox from "@/components/admin/ServiceStaffChatInbox";
const sidebarItems = [
  // ড্যাশবোর্ড
  { value: "overview", label: "ওভারভিউ", icon: <LayoutDashboard />, group: "ড্যাশবোর্ড" },
  { value: "analytics", label: "অ্যানালিটিক্স", icon: <BarChart3 />, group: "ড্যাশবোর্ড" },
  { value: "central-accounts", label: "সেন্ট্রাল একাউন্টস", icon: <Wallet />, group: "ড্যাশবোর্ড" },
  { value: "accounts", label: "বিভাগীয় একাউন্টস", icon: <CreditCard />, group: "ড্যাশবোর্ড" },
  { value: "admin-assignments", label: "অ্যাডমিন কাজ ভাগ", icon: <UserPlus />, group: "ড্যাশবোর্ড" },

  // POS
  { value: "pos", label: "POS সিস্টেম", icon: <Receipt />, group: "POS ও বিলিং" },

  // SaaS
  { value: "saas", label: "SaaS ম্যানেজমেন্ট", icon: <Crown />, group: "SaaS প্ল্যাটফর্ম" },
  { value: "api-keys", label: "API ও ইন্টিগ্রেশন", icon: <Key />, group: "SaaS প্ল্যাটফর্ম" },
  { value: "monitoring", label: "সিস্টেম মনিটরিং", icon: <Activity />, group: "SaaS প্ল্যাটফর্ম" },

  // সার্ভিস CMS
  { value: "services", label: "সার্ভিস", icon: <Package />, group: "সার্ভিস CMS" },
  { value: "service-images", label: "সার্ভিসর ছবি", icon: <ImagePlus />, group: "সার্ভিস CMS" },
  { value: "categories", label: "ক্যাটেগরি", icon: <Grid3X3 />, group: "সার্ভিস CMS" },
  { value: "offers", label: "অফার", icon: <Percent />, group: "সার্ভিস CMS" },
  { value: "banners", label: "ব্যানার", icon: <Image />, group: "সার্ভিস CMS" },
  { value: "sections", label: "সেকশন", icon: <LayoutList />, group: "সার্ভিস CMS" },

  // সন্ধান মার্ট
  { value: "mart-overview", label: "মার্ট ওভারভিউ", icon: <ShoppingCart />, group: "সন্ধান মার্ট" },
   { value: "kyc verification", label: "SELLER KYC VERIFICATION", icon: <UserCheck />, group: "সন্ধান মার্ট" },
   { value: "delivery kyc verification", label: "DELIVERY KYC VERIFICATION", icon: <Truck />, group: "সন্ধান মার্ট" },
   { value: "category add", label: "Category Add", icon: <UserCheck />, group: "সন্ধান মার্ট" },
{ value: "mart-banners", label: "মার্ট ব্যানার", icon: <Image />, group: "সন্ধান মার্ট" },
  // সন্ধান ডিল
  { value: "deal-overview", label: "ডিল ওভারভিউ", icon: <Handshake />, group: "সন্ধান ডিল" },
  { value: "deal-categories", label: "ডিল ক্যাটেগরি", icon: <Grid3X3 />, group: "সন্ধান ডিল" },

  // সার্ভিস রিকোয়েস্ট
  { value: "requests", label: "সার্ভিস রিকোয়েস্ট", icon: <FileText />, group: "অপারেশন" },
  { value: "bookings", label: "বুকিং", icon: <Calendar />, group: "অপারেশন" },

  // কমিউনিকেশন
  { value: "contacts", label: "মেসেজ", icon: <MessageSquare />, group: "কমিউনিকেশন" },
  { value: "service-messages", label: "Service messages", icon: <Headphones />, group: "কমিউনিকেশন" },
  { value: "chat-history", label: "চ্যাট হিস্ট্রি", icon: <Bot />, group: "কমিউনিকেশন" },
  { value: "notifications", label: "নোটিফিকেশন", icon: <Bell />, group: "কমিউনিকেশন" },

  // হিউম্যান রিসোর্স
  { value: "jobs", label: "আবেদন", icon: <Briefcase />, group: "হিউম্যান রিসোর্স" },
  { value: "representatives", label: "প্রতিনিধি", icon: <MapPinCheck />, group: "হিউম্যান রিসোর্স" },
  { value: "reviews", label: "রিভিউ", icon: <Star />, group: "হিউম্যান রিসোর্স" },

  // ফিনান্স
  { value: "coupons", label: "কুপন", icon: <Tag />, group: "ফিনান্স" },
  { value: "withdrawals", label: "উইথড্রয়াল", icon: <Banknote />, group: "ফিনান্স" },

  // সিস্টেম
  { value: "users", label: "ইউজার রোল", icon: <Users />, group: "সিস্টেম ও সিকিউরিটি" },
  { value: "permissions", label: "পারমিশন", icon: <ShieldCheck />, group: "সিস্টেম ও সিকিউরিটি" },
  { value: "settings", label: "সেটিংস", icon: <Settings />, group: "সিস্টেম ও সিকিউরিটি" },
  { value: "profile", label: "আমার প্রোফাইল", icon: <UserCog />, group: "সিস্টেম ও সিকিউরিটি" },
];

const SuperAdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const checkAccess = useCallback(async () => {
    const mysqlAuth = getMySqlAuth();
    if (mysqlAuth?.user.type === "super_admin") {
      setIsSuperAdmin(true);
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "admin"]);
    const roles = data?.map(r => r.role) || [];
    if (roles.includes("super_admin" as any)) {
      setIsSuperAdmin(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user && getMySqlAuth()?.user.type !== "super_admin") {
      navigate("/main-login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => { checkAccess(); }, [checkAccess]);
  
  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const mysqlAuth = getMySqlAuth();
      await fetch(`${CENTRAL_API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}),
        },
      }).catch(() => null);
    } finally {
      // Clear local auth regardless of API outcome
      clearMySqlAuth();
      navigate("/main-login", { replace: true });
      setLoggingOut(false);
    }
  }, [loggingOut, navigate]);


  if (authLoading || loading) {
    return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>);
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><Crown className="h-8 w-8 text-muted-foreground" /></div>
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">এই পেজটি শুধুমাত্র সুপার অ্যাডমিনদের জন্য।</p>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</button>
        </div>
      </div>
    );
  }

  const renderContent = (activeTab: string) => {
    switch (activeTab) {
      case "overview": return <SuperAdminOverview />;
      case "analytics": return <AdminAnalytics />;
      case "central-accounts": return <CentralAccounts />;
      case "accounts": return <div className="p-4"><AccountsSection userId={user!.id} role="admin" /></div>;
      case "admin-assignments": return <div className="p-4"><StaffAssignmentManager mode="super_admin" /></div>;
      case "pos": return <POSSystem />;
      case "saas": return <SaaSManagement />;
      case "api-keys": return <SaaSManagement />;
      case "monitoring": return <SaaSManagement />;
      case "services": return <div className="p-4"><AdminServices /></div>;
      case "service-images": return <div className="p-4"><ServiceImageManager /></div>;
      case "categories": return <div className="p-4"><AdminCategories /></div>;
      case "offers": return <div className="p-4"><AdminOffers /></div>;
      case "banners": return <div className="p-4"><AdminBanners /></div>;
      case "sections": return <div className="p-4"><AdminHomepageSections /></div>;
      case "mart-overview": return <AdminMartOverview />;
      case "deal-overview": return <AdminDealOverview />;
      case "deal-categories": return <div className="p-4"><AdminDealManagement /></div>;
      case "requests": return <div className="p-4"><AdminServiceRequests /></div>;
      case "bookings": return <div className="p-4"><AdminServiceRequests /></div>;
      case "contacts": return <div className="p-4"><AdminContactMessages /></div>;
      case "service-messages": return <div className="p-4"><ServiceStaffChatInbox /></div>;
      case "jobs": return <div className="p-4"><AdminJobApplications /></div>;
      case "reviews": return <div className="p-4"><AdminReviews /></div>;
      case "users": return <div className="p-4"><AdminUserRoles /></div>;
      case "permissions": return <div className="p-4"><AdminPermissions /></div>;
      case "chat-history": return <div className="p-4"><AdminChatHistory /></div>;
      case "representatives": return <div className="p-4"><AdminRepresentatives /></div>;
      case "notifications": return <div className="p-4"><AdminNotificationCenter /></div>;
      case "coupons": return <div className="p-4"><AdminCoupons /></div>;
      case "withdrawals": return <div className="p-4"><AdminWithdrawals /></div>;
      case "settings": return <div className="p-4"><AdminSiteSettings /></div>;
      case "profile": return <SuperAdminProfile />;
      case "kyc verification": return <div className="p-4"><AdminMartKyc /></div>;
      case "delivery kyc verification": return <div className="p-4"><AdminDeliveryKyc /></div>;
      case "category add": return <div className="p-4"><AdminMartCategories /></div>;
      case "mart-banners": return <div className="p-4"><AdminMartBanners /></div>;
      default: return null;
    }
  };

  return (
    <PanelSidebarTabs
      items={sidebarItems}
      defaultValue="overview"
      panelTitle="সুপার অ্যাডমিন"
      panelIcon={<Crown className="h-4 w-4" />}
    >
      {renderContent}
    </PanelSidebarTabs>
  );
};

export default SuperAdminPanel;
