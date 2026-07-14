import { useState, useCallback, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { MartCartProvider } from "@/contexts/MartCartContext";
import { MartWishlistProvider } from "@/contexts/MartWishlistContext";
import { MartCompareProvider } from "@/contexts/MartCompareContext";
import CartSidebar from "@/components/CartSidebar";
import MartCartSidebar from "@/components/MartCartSidebar";
import CompareBar from "@/components/CompareBar";
import MartCompareBar from "@/components/mart/MartCompareBar";
import SplashScreen from "@/components/SplashScreen";
import ChatWidget from "@/components/ChatWidget";
import { useEffect } from "react";
import { socket, setSocketUser } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";

import PageLoader from "@/components/PageLoader";
import DesktopMegaMenu from "@/components/DesktopMegaMenu";
import GlobalLanguageSwitcher from "@/components/GlobalLanguageSwitcher";
import OnboardingScreen from "@/components/OnboardingScreen";
import PageTransition from "@/components/PageTransition";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import InstallAppBanner from "@/components/InstallAppBanner";
import IOSInstallGuide from "@/components/IOSInstallGuide";
import OfflineFallback from "@/components/OfflineFallback";
import SwipeBackGesture from "@/components/SwipeBackGesture";
import ShakeToReport from "@/components/ShakeToReport";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import InAppRatingPrompt from "@/components/InAppRatingPrompt";
import LiveActivityBar from "@/components/LiveActivityBar";
import ShareTargetReceiver from "@/components/ShareTargetReceiver";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import VoiceBookingFAB from "@/components/VoiceBookingFAB";
import LoyaltyWalletCard from "@/components/LoyaltyWalletCard";
import SmartNotificationScheduler from "@/components/SmartNotificationScheduler";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import BookingRemindersManager from "@/components/BookingRemindersManager";
import AutoDarkMode from "@/components/AutoDarkMode";
import ShakeToUndoManager from "@/components/ShakeToUndoManager";
import GestureTutorial from "@/components/GestureTutorial";
import CartAbandonmentNudge from "@/components/CartAbandonmentNudge";
import AIRecommenderBubble from "@/components/AIRecommenderBubble";
import PriceDropAlertsManager from "@/components/PriceDropAlertsManager";
import SocialProofToaster from "@/components/SocialProofToaster";
import ReadingProgressFab from "@/components/ReadingProgressFab";
import ServiceMatchmakerLauncher from "@/components/ServiceMatchmakerLauncher";
import VoiceCartActionsManager from "@/components/VoiceCartActionsManager";
import DynamicIslandActivity from "@/components/DynamicIslandActivity";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import FabStackPreview from "@/components/FabStackPreview";
import MobileFabHub from "@/components/MobileFabHub";
import MobileLayerDebugOverlay from "@/components/MobileLayerDebugOverlay";

// Lazy-loaded pages — each route loads only when visited
const Index = lazy(() => import("./pages/Index"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminPaymentLedger = lazy(() => import("./pages/admin/AdminPaymentLedger"));
const AdminApprovalQueue = lazy(() => import("./pages/admin/AdminApprovalQueue"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminSmartDashboard = lazy(() => import("./pages/admin/AdminSmartDashboard"));
const AdminStaffAssignments = lazy(() => import("./pages/admin/AdminStaffAssignments"));
const AdminStaffWorkload = lazy(() => import("./pages/admin/AdminStaffWorkload"));
const AdminNotificationRules = lazy(() => import("./pages/admin/AdminNotificationRules"));
import {
  AdminAnalyticsPage, AdminRequestsPage, AdminAccountsPage,
  AdminServicesPage, AdminServiceImagesPage, AdminCategoriesPage,
  AdminOffersPage, AdminBannersPage, AdminSectionsPage,
  AdminMartOverviewPage, AdminDealOverviewPage, AdminDealCategoriesPage,
  AdminJobListingsPage, AdminEmployersPage, AdminContactsPage,
  AdminChatHistoryPage, AdminNotificationsPage, AdminJobsPage,
  AdminRepresentativesPage, AdminLeaderboardPage, AdminReviewsPage,
  AdminCouponsPage, AdminWithdrawalsPage, AdminUsersPage,
  AdminPermissionsPage, AdminSettingsPage,
} from "./pages/admin/AdminPages";
import MartStore from "./pages/MartStore";
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));
const AdminRoleDetail = lazy(() => import("./pages/AdminRoleDetail"));
const AllServices = lazy(() => import("./pages/AllServices"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Compare = lazy(() => import("./pages/Compare"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const CallCenterPanel = lazy(() => import("./pages/CallCenterPanel"));
const ProviderPanel = lazy(() => import("./pages/ProviderPanel"));
const RepresentativePanel = lazy(() => import("./pages/RepresentativePanel"));
const FAQ = lazy(() => import("./pages/FAQ"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const JoinUs = lazy(() => import("./pages/JoinUs"));
const ModeratorPanel = lazy(() => import("./pages/ModeratorPanel"));
const ServiceTracking = lazy(() => import("./pages/ServiceTracking"));
const TrackLanding = lazy(() => import("./pages/TrackLanding"));
const SupervisorPanel = lazy(() => import("./pages/SupervisorPanel"));
const FinancePanel = lazy(() => import("./pages/FinancePanel"));
const InternalServiceChat = lazy(() => import("./pages/InternalServiceChat"));
const InternalChatHub = lazy(() => import("./pages/InternalChatHub"));
const MartPanel = lazy(() => import("./pages/MartPanel"));
const VendorMessageDetail = lazy(() => import("../src/components/mart/VendorMessageDetail"));
const MartAdminPanel = lazy(() => import("./pages/MartAdminPanel"));
const MartDeliveryPanel = lazy(() => import("./pages/MartDeliveryPanel"));
const MartCustomerServicePanel = lazy(() => import("./pages/MartCustomerServicePanel"));
const MartHome = lazy(() => import("./pages/MartHome"));
const MartCategoryPage = lazy(() => import("./pages/MartCategoryPage"));
const MartProductDetail = lazy(() => import("./pages/MartProductDetail"));
const MartCheckout = lazy(() => import("./pages/MartCheckout"));
const MartWishlist = lazy(() => import("./pages/MartWishlist"));
const MartOrders = lazy(() => import("./pages/MartOrders"));
const MartCompare = lazy(() => import("./pages/MartCompare"));
const MartShopPage = lazy(() => import("./pages/MartShopPage"));
const MartStoreShopPage = lazy(() => import("./pages/mart/MartStoreShopPage"));
const MartShopPanel = lazy(() => import("./pages/MartShopPanel"));
const YessDealPanel = lazy(() => import("./pages/YessDealPanel"));
const SuperAdminPanel = lazy(() => import("./pages/SuperAdminPanel"));
const DealHome = lazy(() => import("./pages/DealHome"));
const DealCategoryPage = lazy(() => import("./pages/DealCategoryPage"));
const DealAdDetail = lazy(() => import("./pages/DealAdDetail"));
const DealPostAd = lazy(() => import("./pages/DealPostAd"));
const DealAllAds = lazy(() => import("./pages/DealAllAds"));
const DealInbox = lazy(() => import("./pages/DealInbox"));
const DealEditAd = lazy(() => import("./pages/DealEditAd"));
const DealMyAds = lazy(() => import("./pages/DealMyAds"));
const DealSellerProfile = lazy(() => import("./pages/DealSellerProfile"));
const MartInbox = lazy(() => import("./pages/MartInbox"));
const JobHome = lazy(() => import("./pages/JobHome"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const JobPostForm = lazy(() => import("./pages/JobPostForm"));
const MyJobs = lazy(() => import("./pages/MyJobs"));
const JobSeekerProfile = lazy(() => import("./pages/JobSeekerProfile"));
const EmployerList = lazy(() => import("./pages/EmployerList"));
const EmployerPanel = lazy(() => import("./pages/EmployerPanel"));
const EmployerProfile = lazy(() => import("./pages/EmployerProfile"));
const MartStaffLogin = lazy(() => import("./pages/MartStaffLogin"));
const DealStaffLogin = lazy(() => import("./pages/DealStaffLogin"));
const JobsStaffLogin = lazy(() => import("./pages/JobsStaffLogin"));
const MainLogin = lazy(() => import("./pages/MainLogin"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min — reduces refetches
      gcTime: 10 * 60 * 1000,         // 10 min cache
      refetchOnWindowFocus: false,     // prevent refetch on tab switch
      retry: 1,                        // single retry on failure
    },
  },
});




function SocketInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // ✅ connect once
    socket.connect();

    // ✅ tell backend who this user is
    setSocketUser(user.id);

    console.log("🔥 Socket initialized for user:", user.id);

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return null;
}
const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  // Show onboarding only on small screens, only first time, only after splash
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const seen = localStorage.getItem("yess_onboarded");
      return !seen && window.innerWidth < 768;
    } catch {
      return false;
    }
  });
  const handleOnboardingFinish = useCallback(() => setShowOnboarding(false), []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NetworkStatusBanner />
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      {splashDone && showOnboarding && (
        <OnboardingScreen onFinish={handleOnboardingFinish} />
      )}
      <BrowserRouter>
        <LanguageProvider>
        <AuthProvider>
            <SocketInitializer /> 
          <CartProvider>
          <CompareProvider>
          <MartCartProvider>
          <MartWishlistProvider>
          <MartCompareProvider>
          <LocationProvider>
          <SwipeBackGesture />
          <InstallAppBanner />
          <IOSInstallGuide />
          <OfflineFallback />
          <ShakeToReport />
          <PushNotificationPrompt />
          <InAppRatingPrompt />
          <LiveActivityBar />
          <ShareTargetReceiver />
          <OfflineSyncManager />
          <SmartNotificationScheduler />
          {/* <VoiceBookingFAB /> */}
          {/* <LoyaltyWalletCard /> */}
          <KeyboardShortcuts />
          <BookingRemindersManager />
          <AutoDarkMode />
          <ShakeToUndoManager />
          <GestureTutorial />
          <CartAbandonmentNudge />
          <AIRecommenderBubble />
          <PriceDropAlertsManager />
          <SocialProofToaster />
          <ReadingProgressFab />
          <ServiceMatchmakerLauncher />
          {/* <VoiceCartActionsManager /> */}
          <DynamicIslandActivity />
          {/* <WhatsAppFloatingButton /> */}
          {/* <FabStackPreview /> */}
          <CartSidebar />
          <MartCartSidebar />
          <CompareBar />
          <MartCompareBar />
          {/* <ChatWidget /> */}
          <MobileFabHub />
          <MobileLayerDebugOverlay />
          {splashDone && <DesktopMegaMenu />}
          <GlobalLanguageSwitcher />
          <Suspense fallback={<PageLoader />}>
          <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/service/:slug" element={<ServiceDetail />} />
            <Route path="/all-services" element={<AllServices />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/main-login" element={<MainLogin />} />
            <Route path="/super-admin-login" element={<SuperAdminLogin />} />
            <Route path="/bookings" element={<BookingHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/roles/:role" element={<AdminRoleDetail />} />
            <Route path="/admin" element={<AdminLayout />}>
           
              <Route index element={<Navigate to="/admin/analytics" replace />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="service-images" element={<AdminServiceImagesPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="offers" element={<AdminOffersPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="sections" element={<AdminSectionsPage />} />
              <Route path="mart-overview" element={<AdminMartOverviewPage />} />
              <Route path="deal-overview" element={<AdminDealOverviewPage />} />
              <Route path="deal-categories" element={<AdminDealCategoriesPage />} />
              <Route path="job-listings" element={<AdminJobListingsPage />} />
              <Route path="employers" element={<AdminEmployersPage />} />
              <Route path="contacts" element={<AdminContactsPage />} />
              <Route path="chat-history" element={<AdminChatHistoryPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="representatives" element={<AdminRepresentativesPage />} />
              <Route path="leaderboard" element={<AdminLeaderboardPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="permissions" element={<AdminPermissionsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="payment-ledger" element={<AdminPaymentLedger />} />
              <Route path="smart-dashboard" element={<AdminSmartDashboard />} />
              <Route path="approval-queue" element={<AdminApprovalQueue />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="staff-assignments" element={<AdminStaffAssignments />} />
              <Route path="staff-workload" element={<AdminStaffWorkload />} />
              <Route path="notification-rules" element={<AdminNotificationRules />} />
            </Route>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/join" element={<JoinUs />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/call-center" element={<CallCenterPanel />} />
            <Route path="/provider" element={<ProviderPanel />} />
            <Route path="/representative" element={<RepresentativePanel />} />
            <Route path="/moderator" element={<ModeratorPanel />} />
            <Route path="/track" element={<TrackLanding />} />
            <Route path="/track/:token" element={<ServiceTracking />} />
            <Route path="/supervisor" element={<SupervisorPanel />} />
            <Route path="/finance" element={<FinancePanel />} />
            <Route path="/internal" element={<InternalChatHub />} />
            <Route path="/internal/:slug" element={<InternalServiceChat />} />
            <Route path="/mart" element={<MartPanel />} />
            <Route path="/mart/vendor/messages/:conversationId" element={<VendorMessageDetail />} />
            <Route path="/mart/admin" element={<MartAdminPanel />} />
            <Route path="/mart/delivery" element={<MartDeliveryPanel />} />
            <Route path="/mart/cs" element={<MartCustomerServicePanel />} />
            <Route path="/mart/home" element={<MartHome />} />
            
            <Route path="/mart/category/:slug" element={<MartCategoryPage />} />
            <Route path="/mart/product/:slug" element={<MartProductDetail />} />
            <Route path="/mart/checkout" element={<MartCheckout />} />
            <Route path="/mart/wishlist" element={<MartWishlist />} />
            <Route path="/mart/orders" element={<MartOrders />} />
            <Route path="/mart/compare" element={<MartCompare />} />
            <Route path="/mart/store" element={<MartStore />} />
            <Route path="/mart/shop/:slug" element={<MartShopPage />} />
            <Route path="/mart/my-shop" element={<MartShopPanel />} />
            <Route path="/mart/inbox" element={<MartInbox />} />
            <Route path="/super-admin" element={<SuperAdminPanel />} />
            <Route path="/yessdeal" element={<YessDealPanel />} />
            <Route path="/deal" element={<DealHome />} />
            <Route path="/deal/ads" element={<DealAllAds />} />
            <Route path="/deal/category/:slug" element={<DealCategoryPage />} />
            <Route path="/deal/ad/:id" element={<DealAdDetail />} />
            <Route path="/deal/edit/:id" element={<DealEditAd />} />
            <Route path="/deal/post" element={<DealPostAd />} />
            <Route path="/deal/my-ads" element={<DealMyAds />} />
            <Route path="/deal/seller/:userId" element={<DealSellerProfile />} />
            <Route path="/deal/inbox" element={<DealInbox />} />
            <Route path="/jobs" element={<JobHome />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/post" element={<JobPostForm />} />
            <Route path="/jobs/my" element={<MyJobs />} />
            <Route path="/jobs/profile" element={<JobSeekerProfile />} />
            <Route path="/jobs/employers" element={<EmployerList />} />
            <Route path="/jobs/employer/:id" element={<EmployerProfile />} />
            <Route path="/employer" element={<EmployerPanel />} />
            <Route path="/mart/login" element={<MartStaffLogin />} />
            <Route path="/deal/login" element={<DealStaffLogin />} />
            <Route path="/jobs/login" element={<JobsStaffLogin />} />
            <Route path="/mart/store/:vendorId" element={<MartStore />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PageTransition>
          </Suspense>
          <MobileBottomNav />
          </LocationProvider>
          </MartCompareProvider>
          </MartWishlistProvider>
          </MartCartProvider>
          </CompareProvider>
          </CartProvider>
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
