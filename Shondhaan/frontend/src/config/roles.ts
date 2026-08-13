import type { LucideIcon } from "lucide-react";
import {
  Crown, Shield, ShieldCheck, Headphones, Wrench, MapPinCheck,
  ClipboardCheck, Banknote, Store, Truck, MessageCircle, Tag, Briefcase, User,
  ShoppingCart, Handshake, Building2 // ✅ Added new icons
} from "lucide-react";

export type RoleKey =
  | "super_admin" | "admin" | "service_admin" | "mart_admin" | "deal_admin" | "job_admin" // ✅ Added new roles
  | "moderator" | "call_center" | "provider"
  | "representative" | "supervisor" | "finance" | "mart_vendor"
  | "mart_delivery" | "mart_cs" | "yessdeal_seller" | "employer" | "user";

export interface RoleConfig {
  key: RoleKey;
  labelBn: string;
  labelEn: string;
  descriptionBn: string;
  panelPath: string;
  icon: LucideIcon;
  gradient: string;
  accent: string;
}

export const ROLES: RoleConfig[] = [
  { key: "super_admin", labelBn: "সুপার অ্যাডমিন", labelEn: "Super Admin", descriptionBn: "পুরো সিস্টেমের কেন্দ্রীয় নিয়ন্ত্রণ — POS, SAAS, ফাইন্যান্স।", panelPath: "/super-admin", icon: Crown, gradient: "from-amber-500 to-orange-600", accent: "text-amber-700" },
  { key: "admin", labelBn: "অ্যাডমিন", labelEn: "Admin", descriptionBn: "সেবা, অর্ডার, ইউজার ও কনটেন্ট ম্যানেজমেন্ট।", panelPath: "/admin", icon: Shield, gradient: "from-red-500 to-rose-600", accent: "text-red-700" },
  { key: "service_admin", labelBn: "সার্ভিস অ্যাডমিন", labelEn: "Service Admin", descriptionBn: "সেবা CMS, বুকিং, রিকোয়েস্ট ও সার্ভিস কমিউনিকেশন।", panelPath: "/admin/analytics", icon: Wrench, gradient: "from-sky-500 to-blue-600", accent: "text-sky-700" },
  
  // ✅ ADDED MART ADMIN
  { key: "mart_admin", labelBn: "মার্ট অ্যাডমিন", labelEn: "Mart Admin", descriptionBn: "সন্ধান মার্ট কেন্দ্রিক পণ্য, অর্ডার ও ভেন্ডর ম্যানেজমেন্ট।", panelPath: "/admin/mart-overview", icon: ShoppingCart, gradient: "from-emerald-500 to-green-600", accent: "text-emerald-700" },
  
  // ✅ ADDED DEAL ADMIN
  { key: "deal_admin", labelBn: "ডিল অ্যাডমিন", labelEn: "Deal Admin", descriptionBn: "সন্ধান ডিল কেন্দ্রিক বিজ্ঞাপন, ক্যাটেগরি ও সেলার ম্যানেজমেন্ট।", panelPath: "/admin/deal-overview", icon: Handshake, gradient: "from-orange-500 to-amber-600", accent: "text-orange-700" },
  
  // ✅ ADDED JOB ADMIN
  { key: "job_admin", labelBn: "জব অ্যাডমিন", labelEn: "Job Admin", descriptionBn: "সন্ধান জবস কেন্দ্রিক চাকরি, এমপ্লয়ার ও আবেদন ম্যানেজমেন্ট।", panelPath: "/admin/job-listings", icon: Building2, gradient: "from-indigo-500 to-blue-600", accent: "text-indigo-700" },

  { key: "moderator", labelBn: "মডারেটর", labelEn: "Moderator", descriptionBn: "রিভিউ, রিপোর্ট ও কনটেন্ট মডারেশন।", panelPath: "/moderator", icon: ShieldCheck, gradient: "from-purple-500 to-violet-600", accent: "text-purple-700" },
  { key: "call_center", labelBn: "কল সেন্টার", labelEn: "Call Center", descriptionBn: "কল গ্রহণ, বুকিং তৈরি ও কাস্টমার সাপোর্ট।", panelPath: "/call-center", icon: Headphones, gradient: "from-blue-500 to-indigo-600", accent: "text-blue-700" },
  { key: "provider", labelBn: "প্রোভাইডার", labelEn: "Provider", descriptionBn: "অ্যাসাইন বুকিং ও সার্ভিস সম্পন্নকরণ।", panelPath: "/provider", icon: Wrench, gradient: "from-emerald-500 to-green-600", accent: "text-emerald-700" },
  { key: "representative", labelBn: "প্রতিনিধি", labelEn: "Representative", descriptionBn: "এলাকা ভিত্তিক কমিশন ও কাস্টমার ম্যানেজমেন্ট।", panelPath: "/representative", icon: MapPinCheck, gradient: "from-teal-500 to-cyan-600", accent: "text-teal-700" },
  { key: "supervisor", labelBn: "সুপারভাইজার", labelEn: "Supervisor", descriptionBn: "মাঠ পর্যায়ের সার্ভিস ও দল তত্ত্বাবধান।", panelPath: "/supervisor", icon: ClipboardCheck, gradient: "from-sky-500 to-blue-600", accent: "text-sky-700" },
  { key: "finance", labelBn: "ফাইন্যান্স", labelEn: "Finance", descriptionBn: "পেমেন্ট, কমিশন ও উইথড্রয়াল প্রসেসিং।", panelPath: "/finance", icon: Banknote, gradient: "from-yellow-500 to-amber-600", accent: "text-yellow-700" },
  { key: "mart_vendor", labelBn: "মার্ট ভেন্ডর", labelEn: "Mart Vendor", descriptionBn: "সন্ধান মার্টে নিজস্ব পণ্য বিক্রয়।", panelPath: "/mart", icon: Store, gradient: "from-emerald-500 to-teal-600", accent: "text-emerald-700" },
  { key: "mart_delivery", labelBn: "মার্ট ডেলিভারি", labelEn: "Mart Delivery", descriptionBn: "মার্ট অর্ডার ডেলিভারি ব্যবস্থাপনা।", panelPath: "/mart/delivery", icon: Truck, gradient: "from-lime-500 to-green-600", accent: "text-lime-700" },
  { key: "mart_cs", labelBn: "মার্ট কাস্টমার সার্ভিস", labelEn: "Mart Customer Service", descriptionBn: "মার্টে রিটার্ন ও কাস্টমার সাপোর্ট।", panelPath: "/mart/cs", icon: MessageCircle, gradient: "from-cyan-500 to-blue-600", accent: "text-cyan-700" },
  { key: "yessdeal_seller", labelBn: "ডিল সেলার", labelEn: "Deal Seller", descriptionBn: "সন্ধান ডিলে বিজ্ঞাপন পোস্ট ও ম্যানেজমেন্ট।", panelPath: "/yessdeal", icon: Tag, gradient: "from-amber-500 to-yellow-600", accent: "text-amber-700" },
  { key: "employer", labelBn: "নিয়োগদাতা", labelEn: "Employer", descriptionBn: "সন্ধান জব এ চাকরি পোস্ট ও ক্যান্ডিডেট ম্যানেজমেন্ট।", panelPath: "/employer", icon: Briefcase, gradient: "from-indigo-500 to-blue-600", accent: "text-indigo-700" },
  { key: "user", labelBn: "ইউজার", labelEn: "User", descriptionBn: "সাধারণ গ্রাহক — সার্ভিস বুকিং ও অর্ডার।", panelPath: "/dashboard", icon: User, gradient: "from-slate-500 to-gray-600", accent: "text-slate-700" },
];

export const getRoleConfig = (key: string): RoleConfig | undefined =>
  ROLES.find((r) => r.key === key);