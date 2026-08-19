import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AccountsSection from "@/components/AccountsSection";
import RepLeaderboard from "@/components/RepLeaderboard";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminServices from "@/components/admin/AdminServices";
import ServiceImageManager from "@/components/admin/ServiceImageManager";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminOffers from "@/components/admin/AdminOffers";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminHomepageSections from "@/components/admin/AdminHomepageSections";
import AdminServiceRequests from "@/components/admin/AdminServiceRequests";
import AdminContactMessages from "@/components/admin/AdminContactMessages";
import AdminJobApplications from "@/components/admin/AdminJobApplications";
import AdminJobListings from "@/components/admin/AdminJobListings";
import AdminEmployerManagement from "@/components/admin/AdminEmployerManagement";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPermissions from "@/components/admin/AdminPermissions";
import AdminChatHistory from "@/components/admin/AdminChatHistory";
import AdminRepresentatives from "@/components/admin/AdminRepresentatives";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";
import AdminMartOverview from "@/components/admin/AdminMartOverview";
import AdminDealOverview from "@/components/admin/AdminDealOverview";
import AdminDealManagement from "@/components/admin/AdminDealManagement";
import AdminSiteSettings from "@/components/admin/AdminSiteSettings";

const Wrap = ({ children }: { children: React.ReactNode }) => <div className="p-4">{children}</div>;

export const AdminAnalyticsPage = () => <AdminAnalytics />;
export const AdminRequestsPage = () => <Wrap><AdminServiceRequests /></Wrap>;
export const AdminAccountsPage = () => {
  const { user } = useAuth();
  return <Wrap><AccountsSection userId={user!.id} role="admin" /></Wrap>;
};

// [WALLET UPDATE] Role-Specific Accounts Pages
export const AdminServiceAdminAccountsPage = () => {
  const { user } = useAuth();
  return <Wrap><AccountsSection userId={user!.id} role="service_admin" /></Wrap>;
};

export const AdminDealAdminAccountsPage = () => {
  const { user } = useAuth();
  return <Wrap><AccountsSection userId={user!.id} role="deal_admin" /></Wrap>;
};

export const AdminMartAdminAccountsPage = () => {
  const { user } = useAuth();
  return <Wrap><AccountsSection userId={user!.id} role="mart_admin" /></Wrap>;
};

export const AdminJobAdminAccountsPage = () => {
  const { user } = useAuth();
  return <Wrap><AccountsSection userId={user!.id} role="job_admin" /></Wrap>;
};
export const AdminServicesPage = () => <Wrap><AdminServices /></Wrap>;
export const AdminServiceImagesPage = () => <Wrap><ServiceImageManager /></Wrap>;
export const AdminCategoriesPage = () => <Wrap><AdminCategories /></Wrap>;
export const AdminOffersPage = () => <Wrap><AdminOffers /></Wrap>;
export const AdminBannersPage = () => <Wrap><AdminBanners /></Wrap>;
export const AdminSectionsPage = () => <Wrap><AdminHomepageSections /></Wrap>;
export const AdminMartOverviewPage = () => <AdminMartOverview />;
export const AdminDealOverviewPage = () => <AdminDealOverview />;
export const AdminDealCategoriesPage = () => <Wrap><AdminDealManagement /></Wrap>;
export const AdminJobListingsPage = () => <Wrap><AdminJobListings /></Wrap>;
export const AdminEmployersPage = () => <Wrap><AdminEmployerManagement /></Wrap>;
export const AdminContactsPage = () => <Wrap><AdminContactMessages /></Wrap>;
export const AdminChatHistoryPage = () => <Wrap><AdminChatHistory /></Wrap>;
export const AdminNotificationsPage = () => <Wrap><AdminNotificationCenter /></Wrap>;
export const AdminJobsPage = () => <Wrap><AdminJobApplications /></Wrap>;
export const AdminRepresentativesPage = () => <Wrap><AdminRepresentatives /></Wrap>;
export const AdminLeaderboardPage = () => {
  const { user } = useAuth();
  return <Wrap><RepLeaderboard currentUserId={user?.id} /></Wrap>;
};
export const AdminReviewsPage = () => <Wrap><AdminReviews /></Wrap>;
export const AdminCouponsPage = () => <Wrap><AdminCoupons /></Wrap>;
export const AdminWithdrawalsPage = () => <Wrap><AdminWithdrawals /></Wrap>;
export const AdminUsersPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => navigate("/admin/roles")}
        className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary text-white shadow"><ShieldCheck className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-sm md:text-base font-semibold">প্রতিটি রোলের আলাদা পেইজ</p>
            <p className="text-xs text-muted-foreground line-clamp-1">১৪টি রোল, ইউজার তালিকা, পারমিশন ও প্যানেল লিংক একসাথে দেখুন</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">খুলুন →</span>
      </button>
      <AdminUsers />
    </div>
  );
};
export const AdminPermissionsPage = () => <Wrap><AdminPermissions /></Wrap>;
export const AdminSettingsPage = () => <Wrap><AdminSiteSettings /></Wrap>;
