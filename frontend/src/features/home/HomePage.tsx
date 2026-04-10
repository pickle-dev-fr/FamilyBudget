import { useEffect, useState } from "react"

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

export default function HomePage() {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();

    const [loading, setLoading] = useState(true)

    const [now, setNow] = useState(new Date())

    const [total, setTotal] = useState<number | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [balances, setBalances] = useState<Record<string, number>>({})
    const [todayTx, setTodayTx] = useState<Transaction[]>([])
    const [tomorrowTx, setTomorrowTx] = useState<Transaction[]>([])
    const [pots, setPots] = useState<UIPot[]>([])

    /* ========================= */
    /* CLOCK */
    /* ========================= */

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    /* ========================= */
    /* LOAD DATA */
    /* ========================= */

    useEffect(() => {
        async function load() {
            try {
                const [
                    totalRes,
                    accountsRes,
                    todayRes,
                    tomorrowRes
                ] = await Promise.all([
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
                    accountsRes.map(async (a: any) => {
                        const balance = await getAccountsBalance(a.id)
                        return [a.id, balance] as const
                    })
                )

                setBalances(Object.fromEntries(balancesEntries))

                // charger pots pour affichage nom pot
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
            // CREDIT → direct
            return accounts.find(c => c.id === tx.account_id)?.name ?? "-"
        } else {
            // DEBIT → remonter via sub_pot
            return accounts.find(
                c => c.id === pots.find(p => p.sub_pots.find(sp => sp.id === tx.sub_pot_id))?.account_id
            )?.name ?? "-"
        }
    }

    if (loading) {
        return <div className="p-6">{t("common.loading")}</div>
    }

    return (
        <div className="flex flex-col gap-8 p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    {t("home.title")}
                </h1>

                <div className="text-right text-sm opacity-70">
                    <div>{now.toLocaleDateString()}</div>
                    <div className="font-mono">
                        {now.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* BALANCE TOTAL */}
            <div className="card bg-base-200 border border-base-300 p-4 rounded-lg flex justify-between items-center">
                <div className="font-medium">
                    {t("home.total_balance")}
                </div>
                <div className="text-xl font-bold">
                    {formatAmount(total)} {currencySymbol}
                </div>
            </div>

            {/* ACCOUNTS */}
            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">
                    {t("home.accounts_list")}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map((a) => {
                        const balance = balances[a.id]

                        return (
                            <div
                                key={a.id}
                                className="card bg-base-200 border border-base-300 p-4 rounded-lg flex justify-between items-center 
                                transition hover:-translate-y-2
                                "
                            >
                                <div className="font-medium">
                                    {a.name}
                                </div>
                                <div
                                    className={
                                        balance >= 0
                                            ? "text-success font-semibold"
                                            : "text-error font-semibold"
                                    }
                                >
                                    {formatAmount(balance)} {currencySymbol}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* TODAY */}
            <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">
                    {t("home.today_transactions")}
                </h2>
                <TransactionsTable items={todayTx} pots={pots} methodFindAccount={showTxAccount} />
            </section>

            {/* TOMORROW */}
            <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">
                    {t("home.tomorrow_transactions")}
                </h2>
                <TransactionsTable items={tomorrowTx} pots={pots} methodFindAccount={showTxAccount} />
            </section>

        </div>
    )
}

/* ========================= */
/* TABLE */
/* ========================= */

function TransactionsTable({
    items,
    pots,
    methodFindAccount,
}: {
    items: Transaction[]
    pots: UIPot[]
    methodFindAccount: Function
}) {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();

    if (!items.length) {
        return (
            <div className="card bg-base-200 border border-base-300 p-4 rounded-lg text-center opacity-60">
                —
            </div>
        )
    }

    return (
        <div className="card bg-base-200 border border-base-300 rounded-lg overflow-x-auto">
            <table className="table w-full">
                <thead>
                    <tr>
                        <th>{t("transactions.type")}</th>
                        <th>{t("transactions.amount")}</th>
                        <th>{t("transactions.motif")}</th>
                        <th>{t("transactions.account")}</th>
                        <th>{t("transactions.sub_pot")}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((tx) => {
                        const potName =
                            pots
                                .flatMap(p => p.sub_pots)
                                .find(sp => sp.id === tx.sub_pot_id)?.name ?? "-"

                        return (
                            <tr key={tx.id}>
                                <td>
                                    <span
                                        className={
                                            tx.transaction_type === "CREDIT"
                                                ? "badge badge-success"
                                                : "badge badge-error"
                                        }
                                    >
                                        {tx.transaction_type}
                                    </span>
                                </td>

                                <td
                                    className={
                                        tx.transaction_type === "CREDIT"
                                            ? "text-success font-semibold"
                                            : "text-error font-semibold"
                                    }
                                >
                                    {formatAmount(tx.amount)} {currencySymbol}
                                </td>

                                <td>{tx.motif}</td>

                                <td>{methodFindAccount(tx)}</td>

                                <td>{potName}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
