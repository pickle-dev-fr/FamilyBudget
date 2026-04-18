import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicHeader from "@/components/layout/PublicHeader";
import { register, login } from "@/api/auth.api";
import { setToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";
import { useTranslation } from "react-i18next";
import { updateSettings } from "@/api/settings.api";
import { LANGUAGE_I18N } from "@/auth/currency";
import i18n from "i18next";
import { FamilyBudgetLogo } from "@/components/ui/FamilyBudgetLogo";

export default function RegisterPage() {
    const { t } = useTranslation();
    const { refreshAuth } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const isDisabled = !username || !password || loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await register({ username, password });
            const result = await login({ username, password });
            setToken(result.access_token);
            const currentLang = (Object.entries(LANGUAGE_I18N).find(([, v]) => v === i18n.language)?.[0] ?? "FR") as "FR" | "EN";
            const currentTheme = (localStorage.getItem("theme") === "light" ? "LIGHT" : "DARK") as "DARK" | "LIGHT";
            await updateSettings({ language: currentLang, theme: currentTheme }).catch(() => {});
            await refreshAuth();
            navigate("/", { replace: true });
        } catch {
            // géré par client.ts
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <PublicHeader />

            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <FamilyBudgetLogo size="lg" />
                </div>

                {/* Card */}
                <div className="bg-base-100 border border-base-300 rounded-2xl shadow-sm p-8">
                    <h1 className="text-lg font-semibold mb-6">
                        {t("auth.register.title")}
                    </h1>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-base-content/70">
                                {t("auth.register.username")}
                            </label>
                            <input
                                className="input input-bordered w-full"
                                required
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-base-content/70">
                                {t("auth.register.password")}
                            </label>
                            <input
                                className="input input-bordered w-full"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full mt-2"
                            disabled={isDisabled}
                        >
                            {loading ? <span className="loading loading-spinner loading-sm" /> : t("auth.register.submit")}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-base-content/50">
                        {t("auth.register.already_account")}{" "}
                        <Link className="text-primary hover:underline font-medium" to="/login">
                            {t("auth.register.link_login")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
