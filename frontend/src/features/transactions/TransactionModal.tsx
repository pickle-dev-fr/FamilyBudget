import type { Account } from "@/api/accounts.api"
import type { CreateTransactionPayload, UpdateTransactionPayload } from "@/api/transactions.api"
import Modal from "@/components/ui/Modal"
import { useState, useEffect } from "react"
import type { UIPot } from "../pots/types"
import { useTranslation } from "react-i18next"
import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react"

type Props = {
    transaction?: UpdateTransactionPayload
    id?: string
    isForcedRecurrent?: boolean
    fixedAccountId?: string
    onClose: () => void
    accounts: Account[]
    pots: UIPot[]
    onCreate: (payload: CreateTransactionPayload) => void
    onUpdate: (id: string, payload: UpdateTransactionPayload) => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium text-base-content/70 mb-1 block">{children}</label>;
}

export default function TransactionModal({
    transaction, id, isForcedRecurrent, fixedAccountId,
    onClose, accounts, pots, onCreate, onUpdate
}: Props) {
    const { t } = useTranslation();
    const today = new Date().toISOString().split("T")[0]

    const [transactionType, setTransactionType] = useState<"DEBIT" | "CREDIT">("DEBIT")
    const [amount, setAmount] = useState(0)
    const [motif, setMotif] = useState("")
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedSubPotId, setSelectedSubPotId] = useState<string | null>(null)
    const [transactionDate, setTransactionDate] = useState(today)
    const [recurrence, setRecurrence] = useState(isForcedRecurrent ?? false)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)

    useEffect(() => {
        if (!transaction) return
        setTransactionType(transaction.transaction_type ?? "DEBIT")
        setAmount(transaction.amount ?? 0)
        setMotif(transaction.motif ?? "")
        setSelectedAccountId(fixedAccountId ?? transaction?.account_id ?? accounts[0]?.id)
        setSelectedSubPotId(transaction.sub_pot_id ?? pots[0]?.sub_pots[0]?.id ?? null)
        setTransactionDate(transaction.transaction_date ?? today)
        setRecurrence(Boolean(transaction.recurrence_type))
        setRecurrenceEndDate(transaction.recurrence_end_date ?? null)
    }, [transaction])

    function handleSubmit() {
        if (transactionType === "DEBIT" && !selectedSubPotId) return
        if (transactionType === "CREDIT" && !selectedAccountId) return

        const payload = {
            ...transaction,
            transaction_type: transactionType,
            amount,
            motif,
            transaction_date: transactionDate,
            account_id: transactionType === "CREDIT" ? (fixedAccountId ?? selectedAccountId) : null,
            sub_pot_id: transactionType === "DEBIT" ? selectedSubPotId : null,
            recurrence_type: recurrence ? "MONTH" : null,
            recurrent: recurrence ?? false,
            recurrence_end_date: recurrence ? recurrenceEndDate : null
        }

        if (id !== undefined) {
            onUpdate(id, payload as UpdateTransactionPayload)
        } else {
            onCreate(payload as CreateTransactionPayload)
        }
        onClose()
    }

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={id !== undefined ? t("transactions.edit") : t("transactions.add")}
            footer={
                <>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("common.cancel")}</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>{t("common.save")}</button>
                </>
            }
        >
            <div className="flex flex-col gap-4">

                {/* ── Type toggle pill ── */}
                <div className="inline-flex w-full bg-base-200 rounded-xl p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setTransactionType("DEBIT")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150
                            ${transactionType === "DEBIT"
                                ? "bg-base-100 text-error shadow-sm"
                                : "text-base-content/45 hover:text-base-content"}`}
                    >
                        <ArrowDownLeft size={14} />
                        {t("transactions.debit")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTransactionType("CREDIT")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150
                            ${transactionType === "CREDIT"
                                ? "bg-base-100 text-success shadow-sm"
                                : "text-base-content/45 hover:text-base-content"}`}
                    >
                        <ArrowUpRight size={14} />
                        {t("transactions.credit")}
                    </button>
                </div>

                {/* ── Date + Montant ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>{t("transactions.date")}</FieldLabel>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={transactionDate}
                            onChange={e => setTransactionDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <FieldLabel>{t("transactions.amount")}</FieldLabel>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={amount}
                            min={0}
                            onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                        />
                    </div>
                </div>

                {/* ── Motif ── */}
                <div>
                    <FieldLabel>{t("transactions.motif")}</FieldLabel>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={motif}
                        onChange={e => setMotif(e.target.value)}
                    />
                </div>

                {/* ── Compte (CREDIT) ── */}
                {transactionType === "CREDIT" && (
                    <div>
                        <FieldLabel>{t("transactions.account")}</FieldLabel>
                        <select
                            className="select select-bordered w-full"
                            value={selectedAccountId || ""}
                            disabled={Boolean(fixedAccountId)}
                            onChange={e => setSelectedAccountId(e.target.value)}
                        >
                            {accounts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* ── Sous-pot picker (DEBIT) ── */}
                {transactionType === "DEBIT" && (
                    <div>
                        <FieldLabel>{t("transactions.sub_pot")}</FieldLabel>
                        <div className="bg-base-200/50 border border-base-300 rounded-xl p-2 max-h-52 overflow-y-auto space-y-1">
                            {pots.map(pot => (
                                <div key={pot.id}>
                                    <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider px-2 py-1">
                                        {pot.name}
                                    </p>
                                    <div className="space-y-0.5">
                                        {pot.sub_pots.map(sp => (
                                            <label
                                                key={sp.id}
                                                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                                                    ${selectedSubPotId === sp.id
                                                        ? "bg-primary/10 text-primary"
                                                        : "hover:bg-base-100 text-base-content"}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="subPot"
                                                    checked={selectedSubPotId === sp.id}
                                                    onChange={() => setSelectedSubPotId(sp.id)}
                                                    className="radio radio-sm radio-primary"
                                                />
                                                <span className="text-sm">{sp.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Récurrence ── */}
                <div className={`rounded-xl transition-all ${recurrence ? "bg-base-200/50 border border-base-300 p-3" : ""}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={recurrence}
                            onChange={e => setRecurrence(e.target.checked)}
                            disabled={isForcedRecurrent ?? false}
                        />
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                            <Repeat size={14} className="text-base-content/50" />
                            {t("transactions.recurrent")}
                        </span>
                    </label>

                    {recurrence && (
                        <div className="mt-3">
                            <FieldLabel>{t("transactions.recurrence_end")}</FieldLabel>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={recurrenceEndDate ?? ""}
                                onChange={e => setRecurrenceEndDate(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
