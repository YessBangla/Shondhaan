import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleRedirectPath } from "@/lib/roleRedirect";
import PageLoader from "@/components/PageLoader";

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    getRoleRedirectPath().then((path) => {
      const url = `${window.location.origin}${path}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (win) {
        navigate("/", { replace: true });
      } else {
        navigate(path, { replace: true });
      }
    });
  }, [user, loading, navigate]);

  return <PageLoader />;
};

export default AuthCallback;