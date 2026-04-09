import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FamilyBudgetLogo } from "../ui/FamilyBudgetLogo";
import { useAccount } from "@/auth/AccountContext";

export default function Menu() {
    const { t } = useTranslation();
    const { hasAccounts } = useAccount();

    const disabledLink = "px-3 py-2 rounded opacity-40 cursor-not-allowed text-text pointer-events-none";
    const activeLink = "px-3 py-2 rounded hover:bg-base-300 bg-base-300 font-bold";
    const normalLink = "px-3 py-2 rounded hover:bg-base-300 text-text";

    function navClass({ isActive }: { isActive: boolean }) {
        return isActive ? activeLink : normalLink;
    }

    return (
        <nav className="flex flex-col gap-2 p-4 bg-bg-soft">
            <div className="flex justify-center py-4">
                <FamilyBudgetLogo size="md" />
            </div>
            <div className="border-t border-base-300 mb-2" />

            <NavLink to="/" end className={navClass}>
                {t("menu.home")}
            </NavLink>

            <NavLink to="/accounts" className={navClass}>
                {t("menu.accounts")}
            </NavLink>

            {hasAccounts ? (
                <>
                    <NavLink to="/pots" className={navClass}>
                        {t("menu.pots")}
                    </NavLink>

                    <NavLink to="/transactions" className={navClass}>
                        {t("menu.transactions")}
                    </NavLink>

                    <NavLink to="/recurring" className={navClass}>
                        {t("menu.transactions_recurrent")}
                    </NavLink>

                    <NavLink to="/stats" className={navClass}>
                        {t("menu.stats")}
                    </NavLink>
                </>
            ) : (
                <>
                    <span className={disabledLink} title={t("menu.requires_account")}>{t("menu.pots")}</span>
                    <span className={disabledLink} title={t("menu.requires_account")}>{t("menu.transactions")}</span>
                    <span className={disabledLink} title={t("menu.requires_account")}>{t("menu.transactions_recurrent")}</span>
                    <span className={disabledLink} title={t("menu.requires_account")}>{t("menu.stats")}</span>
                </>
            )}

            <NavLink to="/settings" className={navClass}>
                {t("menu.settings")}
            </NavLink>
        </nav>
    );
}
