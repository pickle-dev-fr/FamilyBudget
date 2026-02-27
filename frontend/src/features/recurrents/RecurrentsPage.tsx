import { useEffect, useState } from "react"
import { getComptes, type Compte } from "@/api/comptes.api"
import {
    getTransactionsRecurrente,
    deleteTransaction,
    createTransaction,
    updateTransaction,
    type Transaction,
    deleteTransactionRecurrence,
    createTransfer,
} from "@/api/transactions.api"
import { getPotsAndSousPotsByCompte } from "@/api/pots.api"
import type { UIPot, UISousPot } from "../pots/types"
import TransactionModal from "../transactions/TransactionModal"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import { t } from "i18next"
import DeleteRecurringModal from "./DeleteRecurringModal"
import TransferModal from "../transactions/TransfertModal"

export default function RecurringPage() {
    const [comptes, setComptes] = useState<Compte[]>([])
    const [pots, setPots] = useState<UIPot[]>([])
    const [sousPots, setSousPots] = useState<UISousPot[]>([])
    const [selectedCompteId, setSelectedCompteId] = useState<string | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTx, setSelectedTx] = useState<Transaction | undefined>()
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)
    const [transferModalOpen, setTransferModalOpen] = useState(false)

    /* ============================= */
    /* LOAD COMPTES */
    /* ============================= */

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

    /* ============================= */
    /* LOAD POTS + SOUS POTS */
    /* ============================= */

    useEffect(() => {
        if (!selectedCompteId) return

        async function loadPots() {
            const data: UIPot[] =
                await getPotsAndSousPotsByCompte(selectedCompteId!)

            setPots(data)

            const flat: UISousPot[] = []
            data.forEach(p =>
                p.sous_pots.forEach(sp => flat.push(sp))
            )

            setSousPots(flat)
        }

        loadPots()
    }, [selectedCompteId])

    /* ============================= */
    /* LOAD RECURRING */
    /* ============================= */

    useEffect(() => {
        if (!selectedCompteId) return

        async function loadRecurring() {
            setLoading(true)
            const data =
                await getTransactionsRecurrente(selectedCompteId!)
            setTransactions(data)
            setLoading(false)
        }

        loadRecurring()
    }, [selectedCompteId])

    async function reloadRecurring() {
        if (!selectedCompteId) return
        const data =
            await getTransactionsRecurrente(selectedCompteId)
        setTransactions(data)
    }

    /* ============================= */
    /* DELETE */
    /* ============================= */

    async function handleConfirmDelete(
        deleteFuture: boolean
    ) {
        if (!txToDelete) return

        if (deleteFuture) {
            await deleteTransaction(txToDelete.id)
        } else {
            await deleteTransactionRecurrence(txToDelete.id)
        }

        setDeleteModalOpen(false)
        setTxToDelete(null)

        await reloadRecurring()
    }

    /* ============================= */
    /* RENDER */
    /* ============================= */

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {t("recurring.title")}
                </h1>

                <div className="flex gap-2">
                    <select
                        className="select select-bordered"
                        value={selectedCompteId ?? ""}
                        onChange={(e) =>
                            setSelectedCompteId(e.target.value)
                        }
                    >
                        {comptes.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSelectedTx(undefined)
                            setIsModalOpen(true)
                        }}
                    >
                        {t("recurring.add")}
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={() => setTransferModalOpen(true)}
                    >
                        {t("transactions.transfers.add")}
                    </button>
                </div>
            </div>

            {/* CARD */}
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
                                        <th>{t("common.actions")}</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="text-center py-6"
                                            >
                                                {t("recurring.empty")}
                                            </td>
                                        </tr>
                                    )}

                                    {transactions.map(tx => (
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
                                                {sousPots.find(
                                                    sp => sp.id === tx.sous_pot_id
                                                )?.name ?? "-"}
                                            </td>

                                            <td>{tx.motif}</td>

                                            <td>
                                                {tx.recurrence_type ?? "-"}
                                            </td>

                                            <td>
                                                {tx.transaction_date}
                                            </td>

                                            <td>
                                                {tx.recurrence_end_date ?? "-"}
                                            </td>

                                            <td>
                                                <ActionsMenu
                                                    onEdit={() => {
                                                        setSelectedTx(tx)
                                                        setIsModalOpen(true)
                                                    }}
                                                    onDelete={() => {
                                                        setTxToDelete(tx)
                                                        setDeleteModalOpen(true)
                                                    }}
                                                />
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <TransactionModal
                    id={selectedTx?.id}
                    transaction={selectedTx}
                    isForcedRecurrent={true}
                    comptes={comptes}
                    pots={pots}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedTx(undefined)
                    }}
                    onCreate={async (payload) => {
                        await createTransaction(payload)
                        await reloadRecurring()
                    }}
                    onUpdate={async (id, payload) => {
                        await updateTransaction(id, payload)
                        await reloadRecurring()
                    }}
                />
            )}
            {transferModalOpen && selectedCompteId && (
                <TransferModal
                    fixedCompteSourceId={selectedCompteId}
                    comptes={comptes}
                    pots={pots.filter(p => p.compte_id === selectedCompteId)}
                    isForcedRecurrent={true}
                    onClose={() => setTransferModalOpen(false)}
                    onCreate={async (payload) => {
                        await createTransfer({
                            ...payload,
                            recurrent: true,
                            recurrence_type: payload.recurrence_type ?? "MONTH"
                        })

                        await reloadRecurring()
                    }}
                />
            )}
            {deleteModalOpen && txToDelete && (
                <DeleteRecurringModal
                    transaction={txToDelete}
                    onClose={() => {
                        setDeleteModalOpen(false)
                        setTxToDelete(null)
                    }}
                    onConfirm={handleConfirmDelete}
                />
            )}

        </div>
    )
}
