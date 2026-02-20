import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Menu() {
  const { t } = useTranslation();

    return (
        <nav className="flex flex-col gap-2 p-4 bg-bg-soft">
            <NavLink
                to="/"
                end
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.home")}
            </NavLink>

            <NavLink
                to="/accounts"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.accounts")}
            </NavLink>

            <NavLink
                to="/pots"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.pots")}
            </NavLink>

            <NavLink
                to="/transactions"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.transactions")}
            </NavLink>

            <NavLink
                to="/stats"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.stats")}
            </NavLink>

            <NavLink
                to="/options"
                className={({ isActive }) =>
                    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? "bg-gray-800 font-bold" : "text-text"}`
                }
            >
                {t("menu.options")}
            </NavLink>
        </nav>
    );
}
