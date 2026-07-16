import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Briefcase, ChevronDown, Search, FileText, Users, Building2,
  Video, UserCircle, Heart, Clock, Star, Globe, MapPin,
  Laptop, GraduationCap, TrendingUp, PlusCircle, LayoutDashboard,
  BookOpen, Award, CalendarCheck, Send, Home, HelpCircle,
  Phone, UserPlus, Shield, Info, Bookmark, Eye, Filter,
  ListChecks, BadgeCheck, FileVideo, Upload, UserCheck
} from "lucide-react";

interface MenuItem {
  labelBn: string;
  labelEn: string;
  href?: string;
  icon?: any;
}

interface JobsMenuBarProps {
  flushWithHeader?: boolean;
}

const JobsMenuBar = ({ flushWithHeader = false }: JobsMenuBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Your backend's safeUser() (see server.js) returns the role on `type`
  // (e.g. "employer", "user", "admin", ...), and also mirrors it on `role`
  // for convenience. Check both so this works regardless of which field
  // your AuthContext ends up normalizing to.
  const userRole = String((user as any)?.type || (user as any)?.role || "").toLowerCase();
  const isEmployer = userRole === "employer";

  const allMenus: { key: string; labelBn: string; labelEn: string; icon: any; children: MenuItem[]; employerOnly?: boolean; hideForEmployer?: boolean }[] = [
    {
      key: "jobs",
      labelBn: "চাকরি খুঁজুন",
      labelEn: "Find Jobs",
      icon: Search,
      hideForEmployer: true,
      children: [
        { labelBn: "সকল চাকরি", labelEn: "All Jobs", href: "/jobs", icon: Briefcase },
        { labelBn: "নতুন চাকরি", labelEn: "New / Latest Jobs", href: "/jobs?type=new", icon: Star },
        { labelBn: "ডেডলাইন আগামীকাল", labelEn: "Deadline Tomorrow", href: "/jobs?type=deadline", icon: Clock },
        { labelBn: "ইন্টার্নশিপ", labelEn: "Internship", href: "/jobs?type=intern", icon: GraduationCap },
        { labelBn: "পার্ট-টাইম চাকরি", labelEn: "Part-time Jobs", href: "/jobs?type=parttime", icon: Clock },
        { labelBn: "চুক্তিভিত্তিক চাকরি", labelEn: "Contractual Jobs", href: "/jobs?type=contract", icon: FileText },
        { labelBn: "রিমোট / ওয়ার্ক ফ্রম হোম", labelEn: "Remote / Work from Home", href: "/jobs?type=remote", icon: Laptop },
        { labelBn: "ফ্রেশার চাকরি", labelEn: "Fresher / Entry Level", href: "/jobs?type=fresher", icon: TrendingUp },
        { labelBn: "ফিচার্ড / হট জব", labelEn: "Featured / Hot Jobs", href: "/jobs?type=featured", icon: Award },
        { labelBn: "সরকারি চাকরি", labelEn: "Government Jobs", href: "/jobs?type=government", icon: Building2 },
      ],
    },
    {
      key: "mybdjobs",
      labelBn: "আমার প্রোফাইল",
      labelEn: "My Profile",
      icon: UserCircle,
      hideForEmployer: true,
      children: [
        { labelBn: "চাকরিপ্রার্থী প্রোফাইল", labelEn: "Job Seeker Profile", href: "/jobs/profile", icon: UserCircle },
        { labelBn: "আমার আবেদনসমূহ", labelEn: "My Applications", href: "/jobs/my", icon: Send },
        { labelBn: "আবেদন স্ট্যাটাস ট্র্যাক", labelEn: "Track Application Status", href: "/jobs/my", icon: Eye },
        { labelBn: "ভিডিও সিভি তৈরি", labelEn: "Create Video CV", href: "/jobs/profile#video-cv", icon: Video },
        { labelBn: "সিভি / রিজিউমি আপলোড", labelEn: "Upload CV / Resume", href: "/jobs/profile#cv", icon: Upload },
        { labelBn: "স্কিল ও অভিজ্ঞতা", labelEn: "Skills & Experience", href: "/jobs/profile#experience", icon: Award },
        { labelBn: "ক্লায়েন্ট ড্যাশবোর্ড", labelEn: "Client Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      key: "career",
      labelBn: "ক্যারিয়ার রিসোর্স",
      labelEn: "Career Resources",
      icon: BookOpen,
      hideForEmployer: true,
      children: [
        { labelBn: "কোম্পানি তালিকা", labelEn: "Employer Directory", href: "/jobs/employers", icon: Building2 },
        { labelBn: "ক্যাটেগরি অনুযায়ী চাকরি", labelEn: "Jobs by Category", href: "/jobs#categories", icon: Filter },
        { labelBn: "বিভাগ অনুযায়ী চাকরি", labelEn: "Jobs by Division", href: "/jobs#divisions", icon: MapPin },
        { labelBn: "প্রশ্নোত্তর (FAQ)", labelEn: "FAQ", href: "/faq", icon: HelpCircle },
        { labelBn: "যোগাযোগ করুন", labelEn: "Contact Us", href: "/contact", icon: Phone },
        { labelBn: "আমাদের সম্পর্কে", labelEn: "About Us", href: "/about", icon: Info },
        { labelBn: "হোম পেজে ফিরুন", labelEn: "Back to Home", href: "/", icon: Home },
      ],
    },
    {
      key: "employer",
      labelBn: "নিয়োগদাতা",
      labelEn: "For Employers",
      icon: Building2,
      employerOnly: true,
      children: [
        { labelBn: "চাকরি পোস্ট করুন", labelEn: "Post a Job", href: "/jobs/post", icon: PlusCircle },
        { labelBn: "নিয়োগদাতা প্যানেল", labelEn: "Employer Dashboard", href: "/employer", icon: LayoutDashboard },
        { labelBn: "হায়ারিং পাইপলাইন", labelEn: "Hiring Pipeline", href: "/employer#pipeline", icon: ListChecks },
        { labelBn: "ইন্টারভিউ শিডিউল", labelEn: "Interview Schedule", href: "/employer#interviews", icon: CalendarCheck },
        { labelBn: "ট্যালেন্ট সার্চ", labelEn: "Talent Search", href: "/employer#talent", icon: Search },
        { labelBn: "কোম্পানি প্রোফাইল", labelEn: "Company Profile", href: "/employer#profile", icon: Building2 },
        { labelBn: "কোম্পানি তালিকা", labelEn: "Employer Directory", href: "/jobs/employers", icon: Users },
        { labelBn: "প্রার্থী বুকমার্ক", labelEn: "Bookmarked Candidates", href: "/employer#bookmarks", icon: Bookmark },
        { labelBn: "সাবস্ক্রিপশন প্যাকেজ", labelEn: "Subscription Packages", href: "/employer#packages", icon: Award },
      ],
    },
  ];

  // Exclusive split: employer accounts see ONLY "For Employers" — the job
  // seeker menus (Find Jobs / My Profile / Career Resources) are hidden for
  // them via hideForEmployer. Everyone else sees those three, but never
  // "For Employers" (employerOnly).
  const menus = allMenus.filter((menu) => {
    if (isEmployer) return !menu.hideForEmployer;
    return !menu.employerOnly;
  });

  const isJobsPage = location.pathname.startsWith("/jobs") || location.pathname === "/employer";

  if (!isJobsPage) return null;

  return (
    <div className={`hidden md:block bg-card border-b border-border z-40 ${flushWithHeader ? "fixed left-0 right-0 top-[71px] lg:top-[79px] -mt-px shadow-none" : "sticky top-[71px] lg:top-[79px] -mt-px shadow-sm"}`}>
      <div className="max-w-7xl mx-auto px-2 md:px-4 lg:px-8">
        <div className="flex items-center gap-0 md:gap-0.5 lg:gap-1">
          {menus.map((menu) => (
            <div
              key={menu.key}
              className="relative"
              onMouseEnter={() => setOpenMenu(menu.key)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                className={`flex items-center gap-1 md:gap-1 lg:gap-1.5 px-2 md:px-3 lg:px-4 py-2.5 md:py-3 text-xs md:text-xs lg:text-sm font-medium whitespace-nowrap transition-colors hover:text-primary ${
                  openMenu === menu.key ? "text-primary" : "text-foreground"
                }`}
              >
                <menu.icon className="h-4 w-4" />
                {bn ? menu.labelBn : menu.labelEn}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === menu.key ? "rotate-180" : ""}`} />
              </button>

              {openMenu === menu.key && (
                <div className="absolute top-full left-0 min-w-[260px] max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-card shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {menu.children.map((child, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setOpenMenu(null);
                        if (child.href) navigate(child.href);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                        location.pathname === child.href ? "bg-accent/50 text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      {child.icon && <child.icon className="h-4 w-4 text-muted-foreground" />}
                      <span>{bn ? child.labelBn : child.labelEn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Right side quick links */}
          <div className="ml-auto flex items-center gap-2">
            {!user && (
              <>
                <button
                  onClick={() => navigate("/auth")}
                  className="rounded-lg border border-primary bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {bn ? "সাইন ইন" : "Sign In"}
                </button>
                <button
                  onClick={() => navigate("/auth?mode=register")}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {bn ? "একাউন্ট তৈরি" : "Create Account"}
                </button>
              </>
            )}
            {user && isEmployer && (
              <button
                onClick={() => navigate("/jobs/post")}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {bn ? "চাকরি পোস্ট" : "Post a Job"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsMenuBar;