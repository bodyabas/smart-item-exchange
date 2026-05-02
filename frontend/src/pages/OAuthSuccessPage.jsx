import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function OAuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loadUser, saveToken } = useAuth();
  const [message, setMessage] = useState("Completing Google login...");

  useEffect(() => {
    async function completeLogin() {
      const token = searchParams.get("token");
      if (!token) {
        navigate("/login?error=google_auth_failed", { replace: true });
        return;
      }

      try {
        saveToken(token);
        await loadUser();
        navigate("/dashboard", { replace: true });
      } catch {
        setMessage("Google login failed. Redirecting...");
        navigate("/login?error=google_auth_failed", { replace: true });
      }
    }

    completeLogin();
  }, [searchParams]);

  return <LoadingState label={message} />;
}
