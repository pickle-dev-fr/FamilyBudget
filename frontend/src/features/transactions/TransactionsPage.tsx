import { useEffect, useState } from "react"
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

export default function TransactionsPage(): React.JSX.Element {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
    const [modalTarget, setModalTarget] = useState<CreateTransactionPayload | UpdateTransactionPayload | null>(null)
    const [transactionEditId, setTransactionEditId] = useState<string | undefined>(undefined)
    const [transferModalOpen, setTransferModalOpen] = useState(false)

    // pots déjà chargés depuis le contexte ou parent
    const [pots, setPots] = useState<UIPot[]>([])
    const [sub_pots, setSubPots] = useState<UISubPot[]>([])

    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{
        year: number
        month: number
    } | null>(`last_month_${selectedAccountId}`, null)

    useEffect(() => {
        async function loadAccounts() {
            const data = await getAccounts()
            setAccounts(data)
            if (data.length > 0) {
                const valid = data.find((a: Account) => a.id === selectedAccountId)
                if (!valid) setSelectedAccountId(data[0].id)
            }
        }
        loadAccounts()
    }, [])

    useEffect(() => {
        async function loadPeriode() {
            if (!selectedAccountId) return
            if (currentRefMonth) return

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
            const sub_pots: UISubPot[] = [];
            data.forEach((pot: UIPot)=> {
                pot.sub_pots.forEach((sub_pot: UISubPot) => sub_pots.push(sub_pot))
            })
            setSubPots(sub_pots)
        }
        loadPotsEtSubPots()
    }, [selectedAccountId])

    useEffect(() => {
        if (!selectedAccountId || !currentRefMonth) return
        loadTransactions()
    }, [selectedAccountId, currentRefMonth])

    const changeMonthIndex = (delta: number) => {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 0) { month = 11; year -= 1 }
        else if (month > 11) { month = 0; year += 1 }
        setCurrentRefMonth({ year, month })
    }

    const loadTransactions = async () => {
        if (!selectedAccountId || !currentRefMonth) return

        const data = await getTransactionsMois(
            selectedAccountId,
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
            {/* Sélecteur de account */}
            <div className="w-full">
                <select
                    className="select select-bordered w-full"
                    value={selectedAccountId}
                    onChange={(e) => {
                        setSelectedAccountId(e.target.value);
                        loadTransactions()
                    }}
                >
                    {accounts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Navigation mois */}
            <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={prevMonth}>{"<"}</button>
                <span className="font-medium min-w-36 text-center">
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
                <button className="btn btn-sm btn-ghost" onClick={goToCurrentMonth} title={t("transactions.current_month")}>
                    ⌂
                </button>
            </div>

            {/* Boutons */}
            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={() => {setModalTarget({} as CreateTransactionPayload); setTransactionEditId(undefined)}}>
                    {t("transactions.add")}
                </button>
                <button
                    className="btn btn-outline"
                    onClick={() => setTransferModalOpen(true)}
                >
                    {t("transactions.transfers.add")}
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
                            <th>{t("transactions.sub_pot")}</th>
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
                                <td>{sub_pots.find(sp => sp.id === tx.sub_pot_id)?.name || "-"}</td>
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
}