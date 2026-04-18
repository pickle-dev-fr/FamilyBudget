import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FamilyBudgetLogo } from "../ui/FamilyBudgetLogo";
import { useAccount } from "@/auth/AccountContext";
import {
    LayoutDashboard,
    CreditCard,
    Wallet,
    ArrowLeftRight,
    Repeat,
    BarChart2,
    Settings,
    X,
    type LucideIcon,
} from "lucide-react";

type NavItem = {
    to: string;
    labelKey: string;
    icon: LucideIcon;
    end?: boolean;
    requiresAccount?: boolean;
};

const mainNav: NavItem[] = [
    { to: "/",            labelKey: "menu.home",                   icon: LayoutDashboard, end: true },
    { to: "/accounts",    labelKey: "menu.accounts",               icon: CreditCard },
    { to: "/pots",        labelKey: "menu.pots",                   icon: Wallet,          requiresAccount: true },
    { to: "/transactions",labelKey: "menu.transactions",           icon: ArrowLeftRight,  requiresAccount: true },
    { to: "/recurring",   labelKey: "menu.transactions_recurrent", icon: Repeat,          requiresAccount: true },
    { to: "/stats",       labelKey: "menu.stats",                  icon: BarChart2,       requiresAccount: true },
];

const base = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150";
const activeClass  = `${base} bg-primary/10 text-primary border-l-2 border-primary -ml-px pl-[calc(0.75rem-1px)]`;
const normalClass  = `${base} text-base-content/60 hover:text-base-content hover:bg-base-200 border-l-2 border-transparent -ml-px pl-[calc(0.75rem-1px)]`;
const disabledClass = `${base} text-base-content/25 cursor-not-allowed pointer-events-none`;

function closeDrawer() {
    const drawer = document.getElementById("app-drawer") as HTMLInputElement | null;
    if (drawer) drawer.checked = false;
}

export default function Menu() {
    const { t } = useTranslation();
    const { hasAccounts } = useAccount();

    function navClass({ isActive }: { isActive: boolean }) {
        return isActive ? activeClass : normalClass;
    }

    return (
        <nav className="flex flex-col h-full">
            {/* Logo + bouton fermer (mobile) */}
            <div className="px-5 py-5 border-b border-base-300 flex items-center justify-between">
                <FamilyBudgetLogo size="md" />
                <label
                    htmlFor="app-drawer"
                    className="lg:hidden btn btn-ghost btn-sm btn-square text-base-content/50"
                    aria-label="Fermer le menu"
                >
                    <X size={18} />
                </label>
            </div>

            {/* Nav principale */}
            <div className="flex flex-col gap-0.5 p-3 pl-4 flex-1">
                {mainNav.map(({ to, labelKey, icon: Icon, end, requiresAccount }) => {
                    if (requiresAccount && !hasAccounts) {
                        return (
                            <span key={to} className={disabledClass} title={t("menu.requires_account")}>
                                <Icon size={17} className="shrink-0" />
                                <span>{t(labelKey)}</span>
                            </span>
                        );
                    }
                    return (
                        <NavLink key={to} to={to} end={end} className={navClass} onClick={closeDrawer}>
                            <Icon size={17} className="shrink-0" />
                            <span>{t(labelKey)}</span>
                        </NavLink>
                    );
                })}
            </div>

            {/* Paramètres en bas */}
            <div className="p-3 pl-4 border-t border-base-300">
                <NavLink to="/settings" className={navClass} onClick={closeDrawer}>
                    <Settings size={17} className="shrink-0" />
                    <span>{t("menu.settings")}</span>
                </NavLink>
            </div>
        </nav>
    );
}
