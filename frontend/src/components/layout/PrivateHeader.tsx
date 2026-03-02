import { clearToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../ui/LanguageSelector";
import ThemeSelector from "../ui/ThemeSelector";
import { useTranslation } from "react-i18next";

export default function PrivateHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  function logout() {
    clearToken();
    refreshAuth();
    navigate("/login", { replace: true });
  }

  return (
        <header className="flex items-center justify-end gap-4 p-4 bg-bg-soft">
            <LanguageSelector />
            <ThemeSelector />
            <button
                className="btn btn-error btn-sm"
                onClick={logout}
            >
                {t("auth.disconnect")}
            </button>
        </header>
  )
}
