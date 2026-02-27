import { useEffect, useState } from "react"
import { deleteTransaction, getTransactionsMois, createTransaction, updateTransaction, type Transaction, type CreateTransactionPayload, type UpdateTransactionPayload } from "@/api/transactions.api"
import { getComptes, type Compte } from "@/api/comptes.api"
import { formatDate } from "@/utils"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import ConfirmModal from "@/components/layout/ConfirmModal"
import { t } from "i18next"
import TransactionModal from "./TransactionModal"
import type { UIPot, UISousPot } from "../pots/types"
import { getPotsAndSousPotsByCompte } from "@/api/pots.api"
import { getPeriode } from "@/api/utils.api"

export default function TransactionsPage(): React.JSX.Element {
    const [comptes, setComptes] = useState<Compte[]>([])
    const [selectedCompteId, setSelectedCompteId] = useState<string>("")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
    const [modalTarget, setModalTarget] = useState<CreateTransactionPayload | UpdateTransactionPayload | null>(null)
    const [transactionEditId, setTransactionEditId] = useState<string | undefined>(undefined)

    // pots déjà chargés depuis le contexte ou parent
    const [pots, setPots] = useState<UIPot[]>([])
    const [sous_pots, setSousPots] = useState<UISousPot[]>([])

    const [currentRefMonth, setCurrentRefMonth] = useState<{
        year: number
        month: number
    } | null>(null)

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
        async function loadPeriode() {
            if (!selectedCompteId) return

            const periode = await getPeriode(selectedCompteId)

            setCurrentRefMonth({
                year: periode.year,
                month: periode.month
            })
        }

        loadPeriode()
    }, [selectedCompteId])

    useEffect(() => {
        if (!selectedCompteId) return

        async function loadPotsEtSousPots() {
            const data: UIPot[] = await getPotsAndSousPotsByCompte(selectedCompteId)
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
        if (!selectedCompteId || !currentRefMonth) return
        loadTransactions()
    }, [selectedCompteId, currentRefMonth])

    const changeMonthIndex = (delta: number) => {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 0) { month = 11; year -= 1 }
        else if (month > 11) { month = 0; year += 1 }
        setCurrentRefMonth({ year, month })
    }

    const loadTransactions = async () => {
        if (!selectedCompteId || !currentRefMonth) return

        const data = await getTransactionsMois(
            selectedCompteId,
            {
                date_month: currentRefMonth.month,
                date_year: currentRefMonth.year
            }
        )

        setTransactions(
            data.sort((a: Transaction, b: Transaction) =>
                a.transaction_date.localeCompare(b.transaction_date)
            )
        )
    }

    const prevMonth = () => changeMonthIndex(-1)
    const nextMonth = () => changeMonthIndex(1)

    async function handleDelete(id: string) {
        await deleteTransaction(id)
        await loadTransactions()
    }

    const handleCreate = async (
        payload: CreateTransactionPayload
    ) => {
        await createTransaction(payload)
        await loadTransactions()
    }

    const handleUpdate = async (id: string, payload: UpdateTransactionPayload) => {
        await updateTransaction(id, payload)
        await loadTransactions()
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
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Navigation mois */}
            <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={prevMonth}>{"<"}</button>
                <span className="font-medium">
                    {currentRefMonth && (
                        new Date(
                            currentRefMonth.year,
                            currentRefMonth.month - 1
                        ).toLocaleString("default", {
                            month: "long",
                            year: "numeric"
                        })
                    )}
                </span>
                <button className="btn btn-sm" onClick={nextMonth}>{">"}</button>
            </div>

            {/* Boutons */}
            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={() => {setModalTarget({} as CreateTransactionPayload); setTransactionEditId(undefined)}}>
                    {t("transactions.add")}
                </button>
                <button className="btn btn-secondary" onClick={() => setModalTarget({ transaction_type: "DEBIT", amount:0, motif:"", transaction_date: formatDate(new Date()) } as CreateTransactionPayload)}>
                    {t("transactions.transfer")}
                </button>
            </div>

            {/* Tableau */}
            <div>
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>{t("transactions.date")}</th>
                            <th>{t("transactions.motif")}</th>
                            <th>{t("transactions.type")}</th>
                            <th>{t("transactions.sous_pot")}</th>
                            <th className="text-right">{t("transactions.amount")}</th>
                            <th>{t("transactions.recurrent")}</th>
                            <th>{t("common.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id}>
                                <td>{tx.transaction_date}</td>
                                <td>{tx.motif}</td>
                                <td>
                                    <span className={`badge ${tx.transaction_type === "DEBIT" ? "badge-error" : "badge-success"}`}>
                                        {tx.transaction_type}
                                    </span>
                                </td>
                                <td>{sous_pots.find(sp => sp.id === tx.sous_pot_id)?.name || "-"}</td>
                                <td className="text-right">{tx.amount.toFixed(2)}</td>
                                <td>
                                    <input type="checkbox" className="checkbox" checked={Boolean(tx.recurrence_type)} readOnly />
                                </td>
                                <td>
                                    <ActionsMenu
                                        onDelete={() => setDeleteTarget(tx)}
                                        onEdit={() => {setModalTarget(tx); setTransactionEditId(tx.id)}}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modales */}
            {modalTarget && (
                <TransactionModal
                    transaction={modalTarget}
                    id={transactionEditId}
                    fixedCompteId={selectedCompteId}
                    comptes={comptes}
                    pots={pots}
                    onClose={() => setModalTarget(null)}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />
            )}

            <ConfirmModal
                open={deleteTarget !== null}
                title={t("transactions.delete.title")}
                message={t("transactions.delete.confirm")}
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