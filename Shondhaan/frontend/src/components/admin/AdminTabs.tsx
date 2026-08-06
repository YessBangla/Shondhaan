import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Grid3X3, Percent, Image, LayoutList, Settings, FileText, MessageSquare, Briefcase, Star, Users, ShieldCheck, Bot, MapPinCheck, BarChart3, Bell, Tag, Banknote, ImagePlus, Handshake, ShoppingCart } from "lucide-react";
import AdminServices from "./AdminServices";
import AdminCategories from "./AdminCategories";
import AdminOffers from "./AdminOffers";
import AdminBanners from "./AdminBanners";
import AdminHomepageSections from "./AdminHomepageSections";
import AdminSiteSettings from "./AdminSiteSettings";
import AdminServiceRequests from "./AdminServiceRequests";
import AdminContactMessages from "./AdminContactMessages";
import AdminJobApplications from "./AdminJobApplications";
import AdminReviews from "./AdminReviews";
import AdminUserRoles from "./AdminUserRoles";
import AdminPermissions from "./AdminPermissions";
import AdminChatHistory from "./AdminChatHistory";
import AdminRepresentatives from "./AdminRepresentatives";
import AdminAnalytics from "./AdminAnalytics";
import AdminNotificationCenter from "./AdminNotificationCenter";
import AdminCoupons from "./AdminCoupons";
import AdminWithdrawals from "./AdminWithdrawals";
import ServiceImageManager from "./ServiceImageManager";
import AdminDealManagement from "./AdminDealManagement";
import AdminMartOverview from "./AdminMartOverview";
import AdminDealOverview from "./AdminDealOverview";
import AdminJobListings from "./AdminJobListings";

const AdminTabs = () => (
  <Tabs defaultValue="analytics" className="w-full">
    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 h-auto p-1">
      <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs">
        <BarChart3 className="h-3.5 w-3.5" /> অ্যানালিটিক্স
      </TabsTrigger>
      <TabsTrigger value="services" className="flex items-center gap-1.5 text-xs">
        <Package className="h-3.5 w-3.5" /> সার্ভিস
      </TabsTrigger>
      <TabsTrigger value="service-images" className="flex items-center gap-1.5 text-xs">
        <ImagePlus className="h-3.5 w-3.5" /> সার্ভিসর ছবি
      </TabsTrigger>
      <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs">
        <Grid3X3 className="h-3.5 w-3.5" /> ক্যাটেগরি
      </TabsTrigger>
      <TabsTrigger value="offers" className="flex items-center gap-1.5 text-xs">
        <Percent className="h-3.5 w-3.5" /> অফার
      </TabsTrigger>
      <TabsTrigger value="banners" className="flex items-center gap-1.5 text-xs">
        <Image className="h-3.5 w-3.5" /> ব্যানার
      </TabsTrigger>
      <TabsTrigger value="sections" className="flex items-center gap-1.5 text-xs">
        <LayoutList className="h-3.5 w-3.5" /> সেকশন
      </TabsTrigger>
      <TabsTrigger value="mart-overview" className="flex items-center gap-1.5 text-xs">
        <ShoppingCart className="h-3.5 w-3.5" /> সন্ধান মার্ট
      </TabsTrigger>
      <TabsTrigger value="deal-overview" className="flex items-center gap-1.5 text-xs">
        <Handshake className="h-3.5 w-3.5" /> সন্ধান ডিল
      </TabsTrigger>
      <TabsTrigger value="deal-categories" className="flex items-center gap-1.5 text-xs">
        <Grid3X3 className="h-3.5 w-3.5" /> ডিল ক্যাটেগরি
      </TabsTrigger>
      <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs">
        <FileText className="h-3.5 w-3.5" /> রিকোয়েস্ট
      </TabsTrigger>
      <TabsTrigger value="contacts" className="flex items-center gap-1.5 text-xs">
        <MessageSquare className="h-3.5 w-3.5" /> মেসেজ
      </TabsTrigger>
      <TabsTrigger value="jobs" className="flex items-center gap-1.5 text-xs">
        <Briefcase className="h-3.5 w-3.5" /> আবেদন
      </TabsTrigger>
      <TabsTrigger value="job-listings" className="flex items-center gap-1.5 text-xs">
        <Briefcase className="h-3.5 w-3.5" /> চাকরি বিজ্ঞাপন
      </TabsTrigger>
      <TabsTrigger value="reviews" className="flex items-center gap-1.5 text-xs">
        <Star className="h-3.5 w-3.5" /> রিভিউ
      </TabsTrigger>
      <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs">
        <Users className="h-3.5 w-3.5" /> ইউজার রোল
      </TabsTrigger>
      <TabsTrigger value="permissions" className="flex items-center gap-1.5 text-xs">
        <ShieldCheck className="h-3.5 w-3.5" /> পারমিশন
      </TabsTrigger>
      <TabsTrigger value="chat-history" className="flex items-center gap-1.5 text-xs">
        <Bot className="h-3.5 w-3.5" /> চ্যাট হিস্ট্রি
      </TabsTrigger>
      <TabsTrigger value="representatives" className="flex items-center gap-1.5 text-xs">
        <MapPinCheck className="h-3.5 w-3.5" /> প্রতিনিধি
      </TabsTrigger>
      <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
        <Bell className="h-3.5 w-3.5" /> নোটিফিকেশন
      </TabsTrigger>
      <TabsTrigger value="coupons" className="flex items-center gap-1.5 text-xs">
        <Tag className="h-3.5 w-3.5" /> কুপন
      </TabsTrigger>
      <TabsTrigger value="withdrawals" className="flex items-center gap-1.5 text-xs">
        <Banknote className="h-3.5 w-3.5" /> উইথড্রয়াল
      </TabsTrigger>
      <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs">
        <Settings className="h-3.5 w-3.5" /> সেটিংস
      </TabsTrigger>
    </TabsList>

    <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
    <TabsContent value="services"><AdminServices /></TabsContent>
    <TabsContent value="service-images"><ServiceImageManager /></TabsContent>
    <TabsContent value="categories"><AdminCategories /></TabsContent>
    <TabsContent value="offers"><AdminOffers /></TabsContent>
    <TabsContent value="banners"><AdminBanners /></TabsContent>
    <TabsContent value="sections"><AdminHomepageSections /></TabsContent>
    <TabsContent value="mart-overview"><AdminMartOverview /></TabsContent>
    <TabsContent value="deal-overview"><AdminDealOverview /></TabsContent>
    <TabsContent value="deal-categories"><AdminDealManagement /></TabsContent>
    <TabsContent value="requests"><AdminServiceRequests /></TabsContent>
    <TabsContent value="contacts"><AdminContactMessages /></TabsContent>
    <TabsContent value="jobs"><AdminJobApplications /></TabsContent>
    <TabsContent value="job-listings"><AdminJobListings /></TabsContent>
    <TabsContent value="reviews"><AdminReviews /></TabsContent>
    <TabsContent value="users"><AdminUserRoles /></TabsContent>
    <TabsContent value="permissions"><AdminPermissions /></TabsContent>
    <TabsContent value="chat-history"><AdminChatHistory /></TabsContent>
    <TabsContent value="representatives"><AdminRepresentatives /></TabsContent>
    <TabsContent value="notifications"><AdminNotificationCenter /></TabsContent>
    <TabsContent value="coupons"><AdminCoupons /></TabsContent>
    <TabsContent value="withdrawals"><AdminWithdrawals /></TabsContent>
    <TabsContent value="settings"><AdminSiteSettings /></TabsContent>
  </Tabs>
);

export default AdminTabs;
