import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { formatAmount } from "@/utils"
import { getAccounts, getAccountsBalance, type Account } from "@/api/accounts.api"
import { getTotalBalance } from "@/api/stats.api"
import {
    getTodayTransactions,
    getTomorrowTransactions,
    type Transaction
} from "@/api/transactions.api"
import { getPotsAndSubPotsByAccount } from "@/api/pots.api"
import type { UIPot } from "../pots/types"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { useLoading } from "@/context/loading"

export default function HomePage() {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();
    const { setLoading } = useLoading();

    const [now, setNow] = useState(new Date())
    const [total, setTotal] = useState<number | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [balances, setBalances] = useState<Record<string, number>>({})
    const [todayTx, setTodayTx] = useState<Transaction[]>([])
    const [tomorrowTx, setTomorrowTx] = useState<Transaction[]>([])
    const [pots, setPots] = useState<UIPot[]>([])

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        setLoading(true)
        async function load() {
            try {
                const [totalRes, accountsRes, todayRes, tomorrowRes] = await Promise.all([
                    getTotalBalance(),
                    getAccounts(),
                    getTodayTransactions(),
                    getTomorrowTransactions()
                ])
                setTotal(totalRes)
                setAccounts(accountsRes)
                setTodayTx(todayRes)
                setTomorrowTx(tomorrowRes)

                const balancesEntries = await Promise.all(
                    accountsRes.map(async (a: Account) => {
                        const balance = await getAccountsBalance(a.id)
                        return [a.id, balance] as const
                    })
                )
                setBalances(Object.fromEntries(balancesEntries))

                if (accountsRes.length > 0) {
                    const allPots = await getPotsAndSubPotsByAccount(accountsRes[0].id)
                    setPots(allPots)
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    function showTxAccount(tx: Transaction) {
        if (tx.account_id) {
            return accounts.find(c => c.id === tx.account_id)?.name ?? "-"
        }
        return accounts.find(
            c => c.id === pots.find(p => p.sub_pots.find(sp => sp.id === tx.sub_pot_id))?.account_id
        )?.name ?? "-"
    }

    const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    const timeLabel = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })

    return (
        <div className="flex flex-col gap-6 max-w-4xl">

            {/* ── En-tête ── */}
            <div className="flex items-start justify-between">
                <h1 className="text-xl font-semibold">{t("home.title")}</h1>
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-base-content/60 capitalize">{dateLabel}</div>
                    <div className="text-xs font-mono text-base-content/40">{timeLabel}</div>
                </div>
            </div>

            {/* ── Solde total ── */}
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-white p-6 shadow-lg shadow-primary/20">
                <p className="text-sm font-medium opacity-75 mb-1">{t("home.total_balance")}</p>
                <p className="text-4xl font-bold tracking-tight">
                    {formatAmount(total)}{" "}
                    <span className="text-2xl font-semibold opacity-80">{currencySymbol}</span>
                </p>
            </div>

            {/* ── Comptes ── */}
            <section>
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                    {t("home.accounts_list")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accounts.map((a) => {
                        const balance = balances[a.id] ?? 0
                        return (
                            <div
                                key={a.id}
                                className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-between hover:-translate-y-0.5 transition-transform duration-150"
                            >
                                <div>
                                    <p className="text-sm font-medium">{a.name}</p>
                                    <p className="text-xs text-base-content/40 mt-0.5">{t(`accounts.type_${a.account_type.toLowerCase()}`)}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {balance > 0 ? <TrendingUp size={14} className="text-success shrink-0" /> :
                                     balance < 0 ? <TrendingDown size={14} className="text-error shrink-0" /> :
                                     <Minus size={14} className="text-base-content/30 shrink-0" />}
                                    <span className={`text-sm font-semibold tabular-nums ${balance >= 0 ? "text-success" : "text-error"}`}>
                                        {formatAmount(balance)} {currencySymbol}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ── Transactions du jour ── */}
            <section>
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                    {t("home.today_transactions")}
                </h2>
                <TransactionList items={todayTx} pots={pots} getAccount={showTxAccount} />
            </section>

            {/* ── Transactions de demain ── */}
            <section>
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                    {t("home.tomorrow_transactions")}
                </h2>
                <TransactionList items={tomorrowTx} pots={pots} getAccount={showTxAccount} />
            </section>
        </div>
    )
}

/* ───────────────────────────────────────── */

function TransactionList({
    items,
    pots,
    getAccount,
}: {
    items: Transaction[]
    pots: UIPot[]
    getAccount: (tx: Transaction) => string
}) {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();

    if (!items.length) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-xl p-5 text-center text-sm text-base-content/30">
                —
            </div>
        )
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto] text-xs font-semibold text-base-content/40 uppercase tracking-wider
                px-4 py-2.5 border-b border-base-300 bg-base-200/40">
                <span>{t("transactions.type")}</span>
                <span className="px-3">{t("transactions.motif")}</span>
                <span className="text-right">{t("transactions.amount")}</span>
            </div>
            <div className="divide-y divide-base-300/50">
                {items.map((tx) => {
                    const isCredit = tx.transaction_type === "CREDIT"
                    const potName = pots.flatMap(p => p.sub_pots).find(sp => sp.id === tx.sub_pot_id)?.name
                    return (
                        <div key={tx.id} className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 hover:bg-base-200/50 transition-colors">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                ${isCredit ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                                {tx.transaction_type}
                            </span>
                            <div className="px-3 min-w-0">
                                <p className="text-sm font-medium truncate">{tx.motif || "—"}</p>
                                <p className="text-xs text-base-content/40 truncate">
                                    {getAccount(tx)}{potName ? ` · ${potName}` : ""}
                                </p>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums ${isCredit ? "text-success" : "text-error"}`}>
                                {isCredit ? "+" : "-"}{formatAmount(tx.amount)} {currencySymbol}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
