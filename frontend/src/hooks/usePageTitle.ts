import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

export function usePageTitle(): string {
    const { pathname } = useLocation()
    const { t } = useTranslation()

    if (pathname === "/") return t("menu.home")
    if (pathname.includes("/investment")) return t("investment.assets_title")
    if (pathname.startsWith("/accounts")) return t("menu.accounts")
    if (pathname.startsWith("/pots")) return t("menu.pots")
    if (pathname.startsWith("/transactions")) return t("menu.transactions")
    if (pathname.startsWith("/recurring")) return t("menu.transactions_recurrent")
    if (pathname.startsWith("/stats")) return t("menu.stats")
    if (pathname.startsWith("/settings")) return t("menu.settings")
    return t("menu.home")
}
