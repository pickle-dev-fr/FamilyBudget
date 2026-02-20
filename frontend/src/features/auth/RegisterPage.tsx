import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { t } from "i18next";
import PublicHeader from "@/components/layout/PublicHeader";
import { register, login } from "@/api/auth.api";
import { setToken } from "@/api/token";
import { useAuth } from "@/auth/AuthContext";


export default function RegisterPage() {
    const { refreshAuth } = useAuth();
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
        await register({ username, password });
        const result = await login({ username, password })
        setToken(result.access_token);
        await refreshAuth();
        //redirection
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

            <div className="flex h-screen items-center justify-center bg-bg">
                <div className="card bg-bg p-6 rounded-lg shadow-lg w-80">
                    <h2 className="text-2xl font-bold mb-4 text-text">
                        {t("auth.register.title")}
                    </h2>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">
                                {t("auth.register.username")}
                            </label>
                            <input
                                className="input input-bordered w-full bg-bg-soft text-text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">
                                {t("auth.register.password")}
                            </label>
                            <input
                                className="input input-bordered w-full bg-bg-soft text-text"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary mt-2"
                            disabled={isDisabled}
                        >
                            {t("auth.register.submit")}
                        </button>
                    </form>

                    <div className="mt-4 text-center text-sm text-text">
                        {t("auth.register.already_account")}{" "}
                        <Link className="link link-primary" to="/login">
                            {t("auth.register.link_login")}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
