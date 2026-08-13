import StaffLoginPage from "@/components/auth/StaffLoginPage";
import logo from "@/assets/yess-deal-logo.png";

const DealStaffLogin = () => (
  <StaffLoginPage
    platformKey="deal"
    platformName="সন্ধান ডিল"
    platformNameEn="Deal"
    logoSrc={logo}
    homeHref="/deal"
    roleKeys={[
      "super_admin",
      "admin",
      "deal_admin",
      "moderator",
      "yessdeal_seller",
      "representative",
    ]}
    gradient="from-amber-500 to-orange-600"
    accent="text-amber-700"
    ring="border-amber-500/30"
  />
);

export default DealStaffLogin;