import { useEffect, useState } from "react"
import { Repeat } from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import { getAccounts, type Account } from "@/api/accounts.api"
import {
    getTransactionsRecurrente,
    deleteTransaction,
    createTransaction,
    updateTransaction,
    type Transaction,
    deleteTransactionRecurrence,
    createTransfer,
} from "@/api/transactions.api"
import { getPotsAndSubPotsByAccount } from "@/api/pots.api"
import type { UIPot, UISubPot } from "../pots/types"
import TransactionModal from "../transactions/TransactionModal"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import DeleteRecurringModal from "./DeleteRecurrentModal"
import TransferModal from "../transactions/TransfertModal"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"
import { useLoading } from "@/context/loading"
import { usePersistedState } from "@/hooks/usePersistedState"

export default function RecurringPage() {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();
    const { setLoading } = useLoading();
    const [accounts, setAccounts] = useState<Account[]>([])
    const [pots, setPots] = useState<UIPot[]>([])
    const [subPots, setSubPots] = useState<UISubPot[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string | null>("last_account_id", null)
    const [transactions, setTransactions] = useState<Transaction[]>([])

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTx, setSelectedTx] = useState<Transaction | undefined>()
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)
    const [transferModalOpen, setTransferModalOpen] = useState(false)

    /* ============================= */
    /* LOAD ACCOUNTS */
    /* ============================= */

    useEffect(() => {
        async function loadAccounts() {
            const data = await getAccounts()
            const eligible = data.filter((a: Account) => a.account_type !== "INVESTMENT")
            setAccounts(eligible)

            if (eligible.length > 0) {
                const valid = eligible.find((a: { id: string }) => a.id === selectedAccountId)
                if (!valid) setSelectedAccountId(eligible[0].id)
            }
        }

        loadAccounts()
    }, [])

    /* ============================= */
    /* LOAD POTS + SOUS POTS */
    /* ============================= */

    useEffect(() => {
        if (!selectedAccountId) return

        async function loadPots() {
            const data: UIPot[] =
                await getPotsAndSubPotsByAccount(selectedAccountId!)

            setPots(data)

            const flat: UISubPot[] = []
            data.forEach(p =>
                p.sub_pots.forEach(sp => flat.push(sp))
            )

            setSubPots(flat)
        }

        loadPots()
    }, [selectedAccountId])

    /* ============================= */
    /* LOAD RECURRING */
    /* ============================= */

    useEffect(() => {
        if (!selectedAccountId) return

        async function loadRecurring() {
            setLoading(true)
            const data =
                await getTransactionsRecurrente(selectedAccountId!)
            setTransactions(data)
            setLoading(false)
        }

        loadRecurring()
    }, [selectedAccountId])

    async function reloadRecurring() {
        if (!selectedAccountId) return
        const data =
            await getTransactionsRecurrente(selectedAccountId)
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
        <div className="flex flex-col gap-5 max-w-5xl">

            {/* En-tête */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        className="select select-bordered select-sm min-w-36"
                        value={selectedAccountId ?? ""}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                        {accounts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSelectedTx(undefined); setIsModalOpen(true) }}
                    >
                        {t("recurring.add")}
                    </button>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setTransferModalOpen(true)}
                    >
                        {t("transactions.transfers.add")}
                    </button>
                </div>
            </div>

            {/* Tableau / Cartes */}
            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                {transactions.length === 0 ? (
                    <EmptyState icon={Repeat} message={t("recurring.empty")} />
                ) : (<>
                    {/* Vue carte mobile */}
                    <div className="md:hidden">
                        {transactions.map(tx => {
                            const isCredit = tx.transaction_type === "CREDIT"
                            const subPotName = subPots.find(sp => sp.id === tx.sub_pot_id)?.name
                            return (
                                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-base-300/40 last:border-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
                                        ${isCredit ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                                        ↻
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-tight truncate">{tx.motif || "—"}</p>
                                        <p className="text-xs text-base-content/40 mt-0.5 truncate">
                                            {tx.recurrence_type} · {tx.transaction_date}
                                            {subPotName ? ` · ${subPotName}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-sm font-bold tabular-nums ${isCredit ? "text-success" : "text-error"}`}>
                                            {isCredit ? "+" : "−"}{formatAmount(tx.amount)} {currencySymbol}
                                        </span>
                                        <ActionsMenu
                                            onEdit={() => { setSelectedTx(tx); setIsModalOpen(true) }}
                                            onDelete={() => { setTxToDelete(tx); setDeleteModalOpen(true) }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Vue tableau desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>{t("transactions.type")}</th>
                                    <th>{t("transactions.amount")}</th>
                                    <th>{t("transactions.sub_pot")}</th>
                                    <th>{t("transactions.motif")}</th>
                                    <th>{t("recurring.recurrence_type.label")}</th>
                                    <th>{t("recurring.next_date")}</th>
                                    <th>{t("recurring.end_date")}</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                                ${tx.transaction_type === "DEBIT"
                                                    ? "bg-error/10 text-error"
                                                    : "bg-success/10 text-success"}`}>
                                                {tx.transaction_type}
                                            </span>
                                        </td>
                                        <td className="text-sm font-semibold tabular-nums">
                                            {tx.amount.toFixed(2)} {currencySymbol}
                                        </td>
                                        <td className="text-sm text-base-content/60">
                                            {subPots.find(sp => sp.id === tx.sub_pot_id)?.name ?? "—"}
                                        </td>
                                        <td className="text-sm">{tx.motif}</td>
                                        <td className="text-sm text-base-content/60">{tx.recurrence_type ?? "—"}</td>
                                        <td className="text-sm tabular-nums text-base-content/60">{tx.transaction_date}</td>
                                        <td className="text-sm tabular-nums text-base-content/60">{tx.recurrence_end_date ?? "—"}</td>
                                        <td>
                                            <ActionsMenu
                                                onEdit={() => { setSelectedTx(tx); setIsModalOpen(true) }}
                                                onDelete={() => { setTxToDelete(tx); setDeleteModalOpen(true) }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>)}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <TransactionModal
                    id={selectedTx?.id}
                    transaction={selectedTx}
                    isForcedRecurrent={true}
                    accounts={accounts}
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
            {transferModalOpen && selectedAccountId && (
                <TransferModal
                    fixedAccountSourceId={selectedAccountId}
                    accounts={accounts}
                    pots={pots.filter(p => p.account_id === selectedAccountId)}
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
