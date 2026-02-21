import { useEffect, useState } from "react"
import { getComptes, type Compte } from "@/api/comptes.api"
import { getTransactionsRecurrente, type Transaction } from "@/api/transactions.api"
import { t } from "i18next"
import { getPotsAndSousPotsByCompte } from "@/api/pots.api"
import type { UIPot, UISousPot } from "../pots/types"

export default function RecurringPage() {
    const [comptes, setComptes] = useState<Compte[]>([])
    const [pots, setPots] = useState<UIPot[]>([])
    const [sous_pots, setSousPots] = useState<UISousPot[]>([])
    const [selectedCompteId, setSelectedCompteId] = useState<string | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        async function loadComptes() {
            const data = await getComptes()
            setComptes(data)

            if (data.length > 0) {
                setSelectedCompteId(data[0].id)
            }
        }

        loadComptes()
    }, [])

        useEffect(() => {
        if (!selectedCompteId) return

        async function loadPotsEtSousPots() {
            const data: UIPot[] = await getPotsAndSousPotsByCompte(selectedCompteId!)
            setPots(data)
            const sous_pots: UISousPot[] = [];
            data.forEach((pot: UIPot)=> {
                pot.sous_pots.forEach((sous_pot: UISousPot) => sous_pots.push(sous_pot))
            })
            setSousPots(sous_pots)
        }
        loadPotsEtSousPots()
    }, [selectedCompteId])

    useEffect(() => {
        if (!selectedCompteId) return

        async function loadRecurring() {
            setLoading(true)
            const data = await getTransactionsRecurrente(selectedCompteId!)
            setTransactions(data)
            setLoading(false)
        }

        loadRecurring()
    }, [selectedCompteId])

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {t("recurring.title")}
                </h1>

                <select
                    className="select select-bordered"
                    value={selectedCompteId ?? ""}
                    onChange={(e) => setSelectedCompteId(e.target.value)}
                >
                    {comptes.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="p-6">
                            {t("common.loading")}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t("transactions.type")}</th>
                                        <th>{t("transactions.amount")}</th>
                                        <th>{t("transactions.sous_pot")}</th>
                                        <th>{t("transactions.motif")}</th>
                                        <th>{t("recurring.recurrence_type.label")}</th>
                                        <th>{t("recurring.next_date")}</th>
                                        <th>{t("recurring.end_date")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-6">
                                                {t("recurring.empty")}
                                            </td>
                                        </tr>
                                    )}

                                    {transactions.map((tx) => (
                                        <tr key={tx.id}>
                                            <td>
                                                <span
                                                    className={
                                                        tx.transaction_type === "DEBIT"
                                                            ? "badge badge-error"
                                                            : "badge badge-success"
                                                    }
                                                >
                                                    {tx.transaction_type}
                                                </span>
                                            </td>

                                            <td>
                                                {tx.amount.toFixed(2)} €
                                            </td>

                                            <td>
                                                {sous_pots.find(sp => sp.id === tx.sous_pot_id)?.name ?? "-"}
                                            </td>

                                            <td>
                                                {tx.motif}
                                            </td>

                                            <td>
                                                {tx.recurrence_type ?? "-"}
                                            </td>

                                            <td>
                                                {tx.transaction_date}
                                            </td>

                                            <td>
                                                {tx.recurrence_end_date ?? "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}