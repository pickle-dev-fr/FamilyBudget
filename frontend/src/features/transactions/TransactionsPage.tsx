import { useEffect, useState } from "react"
import { RotateCcw, ChevronLeft, ChevronRight, Plus, ArrowLeftRight } from "lucide-react"
import { deleteTransaction, getTransactionsMois, createTransaction, updateTransaction, type Transaction, type CreateTransactionPayload, type UpdateTransactionPayload, createTransfer } from "@/api/transactions.api"
import { getAccounts, type Account } from "@/api/accounts.api"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import ConfirmModal from "@/components/layout/ConfirmModal"
import TransactionModal from "./TransactionModal"
import type { UIPot, UISubPot } from "../pots/types"
import { getPotsAndSubPotsByAccount } from "@/api/pots.api"
import { getPeriode } from "@/api/utils.api"
import TransferModal from "./TransfertModal"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"
import { formatAmount } from "@/utils"
import { useCurrency } from "@/auth/currency"

export default function TransactionsPage(): React.JSX.Element {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();

    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
    const [modalTarget, setModalTarget] = useState<CreateTransactionPayload | UpdateTransactionPayload | null>(null)
    const [transactionEditId, setTransactionEditId] = useState<string | undefined>(undefined)
    const [transferModalOpen, setTransferModalOpen] = useState(false)
    const [pots, setPots] = useState<UIPot[]>([])
    const [sub_pots, setSubPots] = useState<UISubPot[]>([])

    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{ year: number; month: number } | null>(
        `last_month_${selectedAccountId}`, null
    )

    useEffect(() => {
        async function loadAccounts() {
            const data = await getAccounts()
            const eligible = data.filter((a: Account) => a.account_type !== "INVESTMENT")
            setAccounts(eligible)
            if (eligible.length > 0) {
                const valid = eligible.find((a: Account) => a.id === selectedAccountId)
                if (!valid) setSelectedAccountId(eligible[0].id)
            }
        }
        loadAccounts()
    }, [])

    useEffect(() => {
        async function loadPeriode() {
            if (!selectedAccountId || currentRefMonth) return
            const period = await getPeriode(selectedAccountId)
            setCurrentRefMonth({ year: period.year, month: period.month })
        }
        loadPeriode()
    }, [selectedAccountId])

    async function goToCurrentMonth() {
        if (!selectedAccountId) return
        const period = await getPeriode(selectedAccountId)
        setCurrentRefMonth({ year: period.year, month: period.month })
    }

    useEffect(() => {
        if (!selectedAccountId) return
        async function loadPotsEtSubPots() {
            const data: UIPot[] = await getPotsAndSubPotsByAccount(selectedAccountId)
            setPots(data)
            const sps: UISubPot[] = []
            data.forEach((pot: UIPot) => pot.sub_pots.forEach((sp: UISubPot) => sps.push(sp)))
            setSubPots(sps)
        }
        loadPotsEtSubPots()
    }, [selectedAccountId])

    useEffect(() => {
        if (!selectedAccountId || !currentRefMonth) return
        loadTransactions()
    }, [selectedAccountId, currentRefMonth])

    const changeMonth = (delta: number) => {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 0) { month = 11; year -= 1 }
        else if (month > 11) { month = 0; year += 1 }
        setCurrentRefMonth({ year, month })
    }

    const loadTransactions = async () => {
        if (!selectedAccountId || !currentRefMonth) return
        const data = await getTransactionsMois(selectedAccountId, {
            date_month: currentRefMonth.month,
            date_year: currentRefMonth.year
        })
        setTransactions(data.sort((a: Transaction, b: Transaction) =>
            a.transaction_date.localeCompare(b.transaction_date)
        ))
    }

    const monthLabel = currentRefMonth
        ? new Date(currentRefMonth.year, currentRefMonth.month - 1)
            .toLocaleString("default", { month: "long", year: "numeric" })
        : ""

    return (
        <div className="flex flex-col gap-5 max-w-4xl">

            {/* ── Barre outils ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {/* Sélecteur compte */}
                    <select
                        className="select select-bordered select-sm min-w-40"
                        value={selectedAccountId}
                        onChange={(e) => { setSelectedAccountId(e.target.value); loadTransactions() }}
                    >
                        {accounts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {/* Navigation mois */}
                    <div className="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-1 py-1">
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => changeMonth(-1)}>
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-sm font-medium min-w-32 text-center capitalize px-1">{monthLabel}</span>
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => changeMonth(1)}>
                            <ChevronRight size={14} />
                        </button>
                        <button
                            className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content"
                            onClick={goToCurrentMonth}
                            title={t("transactions.current_month")}
                        >
                            <RotateCcw size={12} />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-primary btn-sm gap-1.5"
                        onClick={() => { setModalTarget({} as CreateTransactionPayload); setTransactionEditId(undefined) }}
                    >
                        <Plus size={14} />
                        {t("transactions.add")}
                    </button>
                    <button
                        className="btn btn-outline btn-sm gap-1.5"
                        onClick={() => setTransferModalOpen(true)}
                    >
                        <ArrowLeftRight size={14} />
                        {t("transactions.transfers.add")}
                    </button>
                </div>
            </div>

            {/* ── Tableau ── */}
            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="text-center text-base-content/30 text-sm py-12">—</div>
                ) : (
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>{t("transactions.date")}</th>
                                <th>{t("transactions.motif")}</th>
                                <th>{t("transactions.type")}</th>
                                <th>{t("transactions.sub_pot")}</th>
                                <th className="text-right">{t("transactions.amount")}</th>
                                <th>{t("transactions.recurrent")}</th>
                                <th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="text-sm text-base-content/60 tabular-nums">{tx.transaction_date}</td>
                                    <td className="text-sm font-medium">{tx.motif || "—"}</td>
                                    <td>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                            ${tx.transaction_type === "DEBIT"
                                                ? "bg-error/10 text-error"
                                                : "bg-success/10 text-success"}`}>
                                            {tx.transaction_type}
                                        </span>
                                    </td>
                                    <td className="text-sm text-base-content/60">
                                        {sub_pots.find(sp => sp.id === tx.sub_pot_id)?.name || "—"}
                                    </td>
                                    <td className={`text-right text-sm font-semibold tabular-nums
                                        ${tx.transaction_type === "DEBIT" ? "text-error" : "text-success"}`}>
                                        {tx.transaction_type === "CREDIT" ? "+" : "-"}{formatAmount(tx.amount)} {currencySymbol}
                                    </td>
                                    <td>
                                        {Boolean(tx.recurrence_type) && (
                                            <span className="text-xs text-base-content/40 font-medium">↻</span>
                                        )}
                                    </td>
                                    <td>
                                        <ActionsMenu
                                            onDelete={() => setDeleteTarget(tx)}
                                            onEdit={() => { setModalTarget(tx); setTransactionEditId(tx.id) }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modales */}
            {modalTarget && (
                <TransactionModal
                    transaction={modalTarget}
                    id={transactionEditId}
                    fixedAccountId={selectedAccountId}
                    accounts={accounts}
                    pots={pots}
                    onClose={() => setModalTarget(null)}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />
            )}
            {transferModalOpen && selectedAccountId && (
                <TransferModal
                    fixedAccountSourceId={selectedAccountId}
                    accounts={accounts}
                    pots={pots}
                    onClose={() => setTransferModalOpen(false)}
                    onCreate={async (payload) => {
                        await createTransfer(payload)
                        await loadTransactions()
                    }}
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

    async function handleDelete(id: string) {
        await deleteTransaction(id)
        await loadTransactions()
    }

    async function handleCreate(payload: CreateTransactionPayload) {
        await createTransaction(payload)
        await loadTransactions()
    }

    async function handleUpdate(id: string, payload: UpdateTransactionPayload) {
        await updateTransaction(id, payload)
        await loadTransactions()
    }
}
