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
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}
    >
      <LanguageSelector />
      <ThemeSelector />
      <button onClick={logout}>{t("auth.disconnect")}</button>
    </div>
  );
}
