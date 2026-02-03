import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Menu() {
  const { t } = useTranslation();

  return (
    <nav className="menu">
      <NavLink to="/" end className="menu-item">
        {t("menu.home")}
      </NavLink>

      <NavLink to="/accounts" className="menu-item">
        {t("menu.accounts")}
      </NavLink>

      <NavLink to="/pots" className="menu-item">
        {t("menu.pots")}
      </NavLink>

      <NavLink to="/transactions" className="menu-item">
        {t("menu.transactions")}
      </NavLink>

      <NavLink to="/stats" className="menu-item">
        {t("menu.stats")}
      </NavLink>

      <NavLink to="/options" className="menu-item">
        {t("menu.options")}
      </NavLink>
    </nav>
  );
}
