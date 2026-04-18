import { passwordChange, deleteAccount } from "@/api/auth.api";
import { clearToken } from "@/api/token";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import { useCurrency } from "@/auth/currency";
import { useAuth } from "@/auth/AuthContext";
import { Sun, Moon, LogOut } from "lucide-react";
import type { Currency, Language, Theme } from "@/api/settings.api";

function Section({ title, danger = false, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
    return (
        <div className={`rounded-xl overflow-hidden border ${danger ? "border-error/40" : "border-base-300"}`}>
            <div className={`px-5 py-3 border-b ${danger ? "border-error/40 bg-error/5" : "border-base-300 bg-base-200/50"}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${danger ? "text-error" : "text-base-content/50"}`}>
                    {title}
                </h2>
            </div>
            <div className="bg-base-100 px-5 py-4">
                {children}
            </div>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm font-medium">{label}</span>
            {children}
        </div>
    );
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshAuth } = useAuth();
    const { currency, currencySymbol, language, theme, setCurrency, setLanguage, setTheme } = useCurrency();

    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const confirmWord = t("settings.delete_account_confirm_word");
    const isConfirmed = confirmText === confirmWord;

    function logout() {
        clearToken();
        refreshAuth();
        navigate("/login", { replace: true });
    }

    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        if (!password || password !== repeatPassword) {
            toast.warning(t("toast.error.passwords_mismatch"));
            return;
        }
        await passwordChange(password);
        setPassword("");
        setRepeatPassword("");
        toast.success(t("toast.success.password_changed"));
    }

    async function handleDeleteAccount() {
        if (!isConfirmed) return;
        await deleteAccount();
        clearToken();
        navigate("/login");
    }

    return (
        <>
            <div className="max-w-lg flex flex-col gap-5">

                {/* Apparence */}
                <Section title={t("settings.appearance")}>
                    <div className="divide-y divide-base-300/50">
                        <Row label={t("settings.language")}>
                            <select
                                className="select select-bordered select-sm"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                            >
                                <option value="FR">{t("languageName", { lng: "fr" })}</option>
                                <option value="EN">{t("languageName", { lng: "en" })}</option>
                            </select>
                        </Row>
                        <Row label={t("settings.theme")}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Sun size={16} className={theme === "LIGHT" ? "text-warning" : "text-base-content/30"} />
                                <input
                                    type="checkbox"
                                    className="toggle toggle-sm toggle-primary"
                                    checked={theme === "DARK"}
                                    onChange={() => setTheme(theme === "DARK" ? "LIGHT" : "DARK" as Theme)}
                                />
                                <Moon size={16} className={theme === "DARK" ? "text-primary" : "text-base-content/30"} />
                            </label>
                        </Row>
                        <Row label={t("settings.currency")}>
                            <select
                                className="select select-bordered select-sm"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                            >
                                <option value="EUR">EUR — €</option>
                                <option value="USD">USD — $</option>
                                <option value="GBP">GBP — £</option>
                                <option value="CHF">CHF — Fr.</option>
                                <option value="JPY">JPY — ¥</option>
                                <option value="CAD">CAD — CA$</option>
                                <option value="AUD">AUD — A$</option>
                            </select>
                        </Row>
                        <p className="text-xs text-base-content/40 pt-2">
                            {t("settings.currency_current", { symbol: currencySymbol })}
                        </p>
                    </div>
                </Section>

                {/* Mot de passe */}
                <Section title={t("settings.change_password")}>
                    <form onSubmit={changePassword} className="flex flex-col gap-3">
                        <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={t("settings.change_password")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder={t("settings.repeat_password")}
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <button className="btn btn-sm btn-primary" type="submit">
                                {t("common.save")}
                            </button>
                        </div>
                    </form>
                </Section>

                {/* Déconnexion */}
                <button
                    className="btn btn-outline w-full gap-2"
                    onClick={logout}
                >
                    <LogOut size={16} />
                    {t("auth.disconnect")}
                </button>

                {/* Zone de danger */}
                <Section title={t("settings.danger_zone")} danger>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">{t("settings.delete_account")}</p>
                            <p className="text-xs text-base-content/50 mt-0.5">
                                {t("settings.delete_account_description")}
                            </p>
                        </div>
                        <button
                            className="btn btn-error btn-sm shrink-0"
                            onClick={() => { setConfirmText(""); setShowDeleteModal(true); }}
                        >
                            {t("settings.delete_account")}
                        </button>
                    </div>
                </Section>
            </div>

            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={t("settings.delete_account_modal_title")}
                footer={
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteModal(false)}>
                            {t("common.cancel")}
                        </button>
                        <button className="btn btn-error btn-sm" disabled={!isConfirmed} onClick={handleDeleteAccount}>
                            {t("settings.delete_account_confirm_button")}
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-base-content/70">{t("settings.delete_account_modal_description")}</p>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm">
                            <Trans i18nKey="settings.delete_account_confirm_label" components={[<strong key="0" className="font-mono text-error" />]} />
                        </label>
                        <input
                            type="text"
                            className="input input-bordered input-error w-full"
                            placeholder={t("settings.delete_account_confirm_placeholder")}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
}
