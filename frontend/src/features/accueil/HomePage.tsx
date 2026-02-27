import { useEffect, useState } from "react"
import { t } from "i18next"

import { formatAmount } from "@/utils"
import { getComptes, getComptesBalance, type Compte } from "@/api/comptes.api"
import { getTotalBalance } from "@/api/stats.api"
import {
    getTodayTransactions,
    getTomorrowTransactions,
    type Transaction
} from "@/api/transactions.api"
import { getPotsAndSousPotsByCompte } from "@/api/pots.api"
import type { UIPot } from "../pots/types"

export default function HomePage() {

    const [loading, setLoading] = useState(true)

    const [now, setNow] = useState(new Date())

    const [total, setTotal] = useState<number | null>(null)
    const [comptes, setComptes] = useState<Compte[]>([])
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
                    comptesRes,
                    todayRes,
                    tomorrowRes
                ] = await Promise.all([
                    getTotalBalance(),
                    getComptes(),
                    getTodayTransactions(),
                    getTomorrowTransactions()
                ])

                setTotal(totalRes)
                setComptes(comptesRes)
                setTodayTx(todayRes)
                setTomorrowTx(tomorrowRes)

                const balancesEntries = await Promise.all(
                    comptesRes.map(async (a: any) => {
                        const solde = await getComptesBalance(a.id)
                        return [a.id, solde] as const
                    })
                )

                setBalances(Object.fromEntries(balancesEntries))

                // charger pots pour affichage nom pot
                if (comptesRes.length > 0) {
                    const allPots = await getPotsAndSousPotsByCompte(comptesRes[0].id)
                    setPots(allPots)
                }

            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    function showTxCompte(tx: Transaction) {
        if (tx.compte_id) {
            // CREDIT → direct
            return comptes.find(c => c.id === tx.compte_id)?.name ?? "-"
        } else {
            // DEBIT → remonter via sous_pot
            return comptes.find(
                c => c.id === pots.find(p => p.sous_pots.find(sp => sp.id === tx.sous_pot_id))?.compte_id
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

            {/* SOLDE TOTAL */}
            <div className="card bg-base-200 border border-base-300 p-4 rounded-lg flex justify-between items-center">
                <div className="font-medium">
                    {t("home.total_balance")}
                </div>
                <div className="text-xl font-bold">
                    {formatAmount(total)} €
                </div>
            </div>

            {/* COMPTES */}
            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">
                    {t("home.accounts_list")}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comptes.map((a) => {
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
                                    {formatAmount(balance)} €
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
                <TransactionsTable items={todayTx} pots={pots} methodFindCompte={showTxCompte} />
            </section>

            {/* TOMORROW */}
            <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">
                    {t("home.tomorrow_transactions")}
                </h2>
                <TransactionsTable items={tomorrowTx} pots={pots} methodFindCompte={showTxCompte} />
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
    methodFindCompte,
}: {
    items: Transaction[]
    pots: UIPot[]
    methodFindCompte: Function
}) {

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
                        <th>{t("transactions.compte")}</th>
                        <th>{t("transactions.sous_pot")}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((tx) => {
                        const potName =
                            pots
                                .flatMap(p => p.sous_pots)
                                .find(sp => sp.id === tx.sous_pot_id)?.name ?? "-"

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
                                    {formatAmount(tx.amount)} €
                                </td>

                                <td>{tx.motif}</td>

                                <td>{methodFindCompte(tx)}</td>

                                <td>{potName}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
