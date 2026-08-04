import StaffLoginPage from "@/components/auth/StaffLoginPage";
import logo from "@/assets/yess-jobs-logo.png";

const JobsStaffLogin = () => (
  <StaffLoginPage
    platformKey="jobs"
    platformName="সন্ধান জবস"
    platformNameEn="Yess Jobs"
    logoSrc={logo}
    homeHref="/jobs"
    roleKeys={[
      "super_admin",
      "admin",
      "moderator",
      "employer",
    ]}
    gradient="from-blue-600 to-indigo-600"
    accent="text-blue-700"
    ring="border-blue-500/30"
  />
);

export default JobsStaffLogin;