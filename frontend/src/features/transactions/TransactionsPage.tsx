import { useEffect, useState } from "react"
import { deleteTransaction, getTransactionsMois, type Transaction } from "@/api/transactions.api"
import { getComptes, type Compte } from "@/api/comptes.api"
import { adaptDate, formatDate } from "@/utils"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import ConfirmModal from "@/components/layout/ConfirmModal"
import { t } from "i18next"

export default function TransactionsPage(): React.JSX.Element {
    const [comptes, setComptes] = useState<Compte[]>([])
    const [selectedCompteId, setSelectedCompteId] = useState<string>("")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    
    // Stocke année et mois (0-indexé)
    const [currentRefMonth, setCurrentRefMonth] = useState<{ year: number; month: number }>({
        year: 2026,
        month: 0
    })

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
        async function loadTransactions() {
            if (!selectedCompteId) return
            const compte = comptes.find(c => c.id === selectedCompteId)
            if (!compte) return

            // Jour de début du compte
            const startDay = compte.start_day

            // Construire la date complète et appliquer adaptDate
            const date = adaptDate(currentRefMonth.year, currentRefMonth.month, startDay)
            console.log(formatDate(date))

            const data = await getTransactionsMois(selectedCompteId, formatDate(date))
            setTransactions(data)
        }
        loadTransactions()
    }, [selectedCompteId, comptes, currentRefMonth])

    // Méthode générique pour changer le mois (delta = +1 ou -1)
    const changeMonthIndex = (delta: number) => {
        let { year, month } = currentRefMonth
        month += delta

        if (month < 0) {
            month = 11
            year -= 1
        } else if (month > 11) {
            month = 0
            year += 1
        }

        setCurrentRefMonth({ year, month })
    }

    const prevMonth = () => changeMonthIndex(-1)
    const nextMonth = () => changeMonthIndex(1)

    async function handleDelete(id: string) {
        await deleteTransaction(id)
        setTransactions(prev => prev.filter(t => t.id !== id))
    }


    return (
        <div className="flex flex-col gap-6 p-4 transactions-page">
            {/* Sélecteur de compte */}
            <div className="w-full">
                <select
                    className="select select-bordered w-full"
                    value={selectedCompteId}
                    onChange={(e) => setSelectedCompteId(e.target.value)}
                >
                    {comptes.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Navigation mois */}
            <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={prevMonth}>{"<"}</button>
                <span className="font-medium">
                    {new Date(currentRefMonth.year, currentRefMonth.month).toLocaleString("default", {
                        month: "long",
                        year: "numeric"
                    })}
                </span>
                <button className="btn btn-sm" onClick={nextMonth}>{">"}</button>
            </div>

            <button className="btn btn-primary self-start" onClick={() => setCreateOpen(true)}>
                {t("transactions.add")}
            </button>

            {/* Liste des transactions */}
            <div>
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>{t("transactions.date")}</th>
                            <th>{t("transactions.type")}</th>
                            <th>{t("transactions.motif")}</th>
                            <th className="text-right">{t("transactions.amount")}</th>
                            <th>{t("common.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id}>
                                <td>{tx.transaction_date}</td>
                                <td>
                                    <span className={`badge ${tx.transaction_type === "DEBIT" ? "badge-error" : "badge-success"}`}>
                                        {tx.transaction_type}
                                    </span>
                                </td>
                                <td>{tx.motif}</td>
                                <td className="text-right">{tx.amount.toFixed(2)}</td>
                                <td>
                                    <ActionsMenu onDelete={() => setDeleteTarget(tx)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                open={deleteTarget !== null}
                title={t("transactions.delete_title")}
                message={t("transactions.delete_confirm")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await handleDelete(deleteTarget.id);
                    setDeleteTarget(null);
                }}
            />
        </div>
    )
}
