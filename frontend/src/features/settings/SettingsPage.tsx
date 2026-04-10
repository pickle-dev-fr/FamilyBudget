import { passwordChange, deleteAccount } from "@/api/auth.api";
import { clearToken } from "@/api/token";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import { useCurrency } from "@/auth/currency";
import { useAuth } from "@/auth/AuthContext";
import ThemeSelector from "@/components/ui/ThemeSelector";
import type { Currency, Language } from "@/api/settings.api";


export default function SettingsPage() {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshAuth } = useAuth();
    const { currency, currencySymbol, language, setCurrency, setLanguage } = useCurrency();

    function logout() {
        clearToken();
        refreshAuth();
        navigate("/login", { replace: true });
    }
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const confirmWord = t("settings.delete_account_confirm_word");
    const isConfirmed = confirmText === confirmWord;

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
            <div className="max-w-lg flex flex-col gap-8">

                {/* Langue + Thème + Déconnexion */}
                <div className="flex flex-wrap items-center gap-4">
                    <select
                        className="select select-bordered select-sm"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                    >
                        <option value="FR">{t("languageName", { lng: "fr" })}</option>
                        <option value="EN">{t("languageName", { lng: "en" })}</option>
                    </select>
                    <ThemeSelector />
                    <button className="btn btn-error btn-sm ml-auto" onClick={logout}>
                        {t("auth.disconnect")}
                    </button>
                </div>

                {/* Change password */}
                <form onSubmit={changePassword}>
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">{t("settings.change_password")}</legend>
                        <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </fieldset>
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">{t("settings.repeat_password")}</legend>
                        <input type="password" className="input" placeholder="Password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
                    </fieldset>
                    <button className="btn" type="submit">{t("common.save")}</button>
                </form>

                {/* Currency */}
                <fieldset className="fieldset">
                    <legend className="fieldset-legend">{t("settings.currency")}</legend>
                    <select
                        className="select"
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
                    <label className="fieldset-label">{t("settings.currency_current", { symbol: currencySymbol })}</label>
                </fieldset>

                {/* Danger zone */}
                <div className="border border-error rounded-lg overflow-hidden">
                    <div className="bg-error/10 px-4 py-3 border-b border-error">
                        <h2 className="text-error font-semibold text-sm uppercase tracking-wide">
                            {t("settings.danger_zone")}
                        </h2>
                    </div>
                    <div className="px-4 py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium text-sm">{t("settings.delete_account")}</p>
                            <p className="text-xs text-base-content/60 mt-0.5">
                                {t("settings.delete_account_description")}
                            </p>
                        </div>
                        <button
                            className="btn btn-error btn-sm shrink-0"
                            onClick={() => {
                                setConfirmText("");
                                setShowDeleteModal(true);
                            }}
                        >
                            {t("settings.delete_account")}
                        </button>
                    </div>
                </div>

            </div>

            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={t("settings.delete_account_modal_title")}
                footer={
                    <>
                        <button className="btn" onClick={() => setShowDeleteModal(false)}>
                            {t("common.cancel")}
                        </button>
                        <button
                            className="btn btn-error"
                            disabled={!isConfirmed}
                            onClick={handleDeleteAccount}
                        >
                            {t("settings.delete_account_confirm_button")}
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm">
                        {t("settings.delete_account_modal_description")}
                    </p>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm">
                            <Trans
                                i18nKey="settings.delete_account_confirm_label"
                                components={[<strong key="0" className="font-mono" />]}
                            />
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
