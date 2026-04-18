import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicHeader from "@/components/layout/PublicHeader";
import { login } from "@/api/auth.api";
import { setToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import { FamilyBudgetLogo } from "@/components/ui/FamilyBudgetLogo";

export default function LoginPage() {
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
            const result = await login({ username, password });
            setToken(result.access_token);
            await refreshAuth();
            navigate("/", { replace: true });
        } catch {
            toast.error(t("toast.error.login_failed"));
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
                        {t("auth.login.title")}
                    </h1>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-base-content/70">
                                {t("auth.login.username")}
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
                                {t("auth.login.password")}
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
                            {loading ? <span className="loading loading-spinner loading-sm" /> : t("auth.login.submit")}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-base-content/50">
                        <Link className="text-primary hover:underline font-medium" to="/register">
                            {t("auth.login.link_register")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
