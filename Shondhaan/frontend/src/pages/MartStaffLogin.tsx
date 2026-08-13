import StaffLoginPage from "@/components/auth/StaffLoginPage";
import logo from "@/assets/yess-mart-logo.png";

const MartStaffLogin = () => (
  <StaffLoginPage
    platformKey="mart"
    platformName="সন্ধান মার্ট"
    platformNameEn="Yess Mart"
    logoSrc={logo}
    homeHref="/mart/home"
    roleKeys={[
      "super_admin",
      "admin",
      "mart_admin",
      "mart_vendor",
      "mart_delivery",
      "mart_cs",
      "representative",
    ]}
    gradient="from-emerald-600 to-teal-600"
    accent="text-emerald-700"
    ring="border-emerald-500/30"
  />
);

export default MartStaffLogin;
