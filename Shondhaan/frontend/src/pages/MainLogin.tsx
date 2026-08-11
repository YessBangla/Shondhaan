import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StaffLoginPage from "@/components/auth/StaffLoginPage";
import logo from "/yess-service-logo.png?url";
import { useSEO } from "@/hooks/useSEO";

/**
 * Unified login page for ALL staff/admin roles.
 * Customer signup/login remains on `/auth`.
 */
const MainLogin = () => {
  const navigate = useNavigate();

  useSEO({
    title: "Staff Login",
    description: "Shondhaan staff & admin sign-in portal.",
    canonical: "/main-login",
    noindex: true,
  });

  return (
    <>
      
      <StaffLoginPage
        platformKey="mart"
        platformName="সন্ধান স্টাফ"
        platformNameEn="Shondhaan Staff"
        logoSrc={logo}
        homeHref="/"
        roleKeys={[
          "super_admin",
          "admin",
          "service_admin",
          "moderator",
          "supervisor",
          "finance",
          "call_center",
          "provider",
          "representative",
          "mart_vendor",
          "mart_delivery",
          "mart_cs",
          "yessdeal_seller",
          "employer",
        ]}
        gradient="from-primary to-primary/70"
        accent="text-primary"
        ring="border-primary/30"
      />
    </>
  );
};

export default MainLogin;
