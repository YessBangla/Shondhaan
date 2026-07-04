import { useNavigate } from "react-router-dom";
import StaffLoginPage from "@/components/auth/StaffLoginPage";
import logo from "/yess-service-logo.png?url";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";

const SuperAdminLogin = () => {
  const navigate = useNavigate();

  useSEO({
    title: "Super Admin Login",
    description: "Super Admin login for Yess Service.",
    canonical: "/super-admin-login",
    noindex: true,
  });

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 py-4 text-right">
        <Button variant="secondary" size="sm" onClick={() => navigate("/main-login")}>Back to Staff Login</Button>
      </div>
      <StaffLoginPage
        platformKey="super_admin"
        platformName="সুপার অ্যাডমিন"
        platformNameEn="Super Admin"
        logoSrc={logo}
        homeHref="/super-admin"
        roleKeys={["super_admin"]}
        gradient="from-amber-500 to-orange-600"
        accent="text-amber-700"
        ring="border-amber-500/30"
      />
    </div>
  );
};

export default SuperAdminLogin;
