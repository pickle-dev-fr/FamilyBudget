import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/layout/PublicHeader";
import { login } from "@/api/auth.api";
import { setToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";



export default function LoginPage() {
    const { refreshAuth } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isDisabled = !username || !password;

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
        const result = await login({ username, password });
        setToken(result.access_token);
        await refreshAuth();
        // redirection
        navigate("/", { replace: true })
        } catch (err: any) {
        setError(err?.data?.message ?? "Erreur");
        } finally {
        setLoading(false);
        }
    }

    return (
        <>
        <PublicHeader />

        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: 360 }}>
                <h2>{t("auth.login.title")}</h2>

                <form className="form" onSubmit={handleSubmit}>
                <div>
                    <div className="label">{t("auth.login.username")}</div>
                    <input required value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div>
                    <div className="label">{t("auth.login.password")}</div>
                    <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button disabled={isDisabled}>
                    {t("auth.login.submit")}
                </button>
                </form>

                <div style={{ marginTop: 16, fontSize: 13 }}>
                <Link to="/register">{t("auth.login.link_register")}</Link>
                </div>

            </div>
        </div>
        </>
        
    );
}
