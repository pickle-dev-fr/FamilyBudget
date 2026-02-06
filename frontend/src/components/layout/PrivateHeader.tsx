import { clearToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../ui/LanguageSelector";
import ThemeSelector from "../ui/ThemeSelector";

export default function PrivateHeader() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { t } = useTranslation();

  function logout() {
    clearToken();
    refreshAuth();
    navigate("/login", { replace: true });
  }

  return (
    <header className="private-header">
      <LanguageSelector />
      <ThemeSelector />
      <button onClick={logout}>
        {t("auth.disconnect")}
      </button>
    </header>
  );
}
