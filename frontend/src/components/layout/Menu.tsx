import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FamilyBudgetLogo } from "../ui/FamilyBudgetLogo";

export default function Menu() {
    const { t } = useTranslation();

    return (
        <nav className="flex flex-col gap-2 p-4 bg-bg-soft">
            <div className="flex justify-center py-4">
                <FamilyBudgetLogo size="md" />
            </div>
            <div className="border-t border-base-300 mb-2" />
            <NavLink
                to="/"
                end
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.home")}
            </NavLink>

            <NavLink
                to="/accounts"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.accounts")}
            </NavLink>

            <NavLink
                to="/pots"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.pots")}
            </NavLink>

            <NavLink
                to="/transactions"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.transactions")}
            </NavLink>

            <NavLink
                to="/recurring"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.transactions_recurrent")}
            </NavLink>

            <NavLink
                to="/stats"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.stats")}
            </NavLink>

            <NavLink
                to="/settings"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-base-300 ${isActive ? "bg-base-300 font-bold" : "text-text"}`
                }
            >
                {t("menu.settings")}
            </NavLink>
        </nav>
    );
}
