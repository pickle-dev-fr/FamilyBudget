import type { Account } from "@/api/accounts.api"
import type { CreateTransactionPayload, UpdateTransactionPayload } from "@/api/transactions.api"
import Modal from "@/components/ui/Modal"
import { useState, useEffect } from "react"
import type { UIPot } from "../pots/types"
import { useTranslation } from "react-i18next"

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

export default function TransactionModal({
    transaction,
    id,
    isForcedRecurrent,
    fixedAccountId,
    onClose,
    accounts,
    pots,
    onCreate,
    onUpdate
}: Props) {
    const { t } = useTranslation();

    const today = new Date().toISOString().split("T")[0]

    const [transactionType, setTransactionType] = useState<"DEBIT" | "CREDIT">("DEBIT")
    const [amount, setAmount] = useState(0)
    const [motif, setMotif] = useState("")
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedSubPotId, setSelectedSubPotId] = useState<string | null>(null)

    const [transactionDate, setTransactionDate] = useState(today)
    const [recurrence, setRecurrence] = useState(false)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)

    useEffect(() => {
        if (!transaction) return

        setTransactionType(transaction.transaction_type ?? "DEBIT")
        setAmount(transaction.amount ?? 0)
        setMotif(transaction.motif ?? "")
        setSelectedAccountId(
            fixedAccountId ??
            transaction?.account_id ??
            accounts[0]?.id
        )
        setSelectedSubPotId(transaction.sub_pot_id ?? pots[0].sub_pots[0].id)

        setTransactionDate(transaction.transaction_date ?? today)

        const isRecurrent = Boolean(transaction.recurrence_type)
        setRecurrence(isRecurrent)

        setRecurrenceEndDate(
            transaction.recurrence_end_date ?? null
        )
    }, [transaction])

    function isUpdateTransaction(id: string | undefined): boolean {
        return id !== undefined
    }

    function handleSubmit() {
        if (transactionType === "DEBIT" && !selectedSubPotId) return
        if (transactionType === "CREDIT" && !selectedAccountId) return

        const payload = {
            ...transaction,
            transaction_type: transactionType,
            amount,
            motif,
            transaction_date: transactionDate,

            account_id:
                transactionType === "CREDIT"
                    ? (fixedAccountId ?? selectedAccountId)
                    : null,

            sub_pot_id:
                transactionType === "DEBIT"
                    ? selectedSubPotId
                    : null,
            
            recurrence_type: recurrence ? "MONTH" : null,
            recurrent: recurrence ?? false,
            recurrence_end_date: recurrence
                ? recurrenceEndDate
                : null
        }

        if (isUpdateTransaction(id)) {
            onUpdate(id!, payload as UpdateTransactionPayload)
        } else {
            onCreate(payload as CreateTransactionPayload)
        }

        onClose()
    }

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={isUpdateTransaction(id)
                ? t("transactions.edit")
                : t("transactions.add")}
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>
                        {t("common.cancel")}
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        {t("common.save")}
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-4">

                {/* TYPE */}
                <div>
                    <label className="label">{t("transactions.type")}</label>
                    <select
                        className="select select-bordered w-full"
                        value={transactionType}
                        onChange={e =>
                            setTransactionType(
                                e.target.value as "DEBIT" | "CREDIT"
                            )
                        }
                    >
                        <option value="DEBIT">{t("transactions.debit")}</option>
                        <option value="CREDIT">{t("transactions.credit")}</option>
                    </select>
                </div>

                {/* DATE */}
                <div>
                    <label className="label">{t("transactions.date")}</label>
                    <input
                        type="date"
                        className="input input-bordered w-full"
                        value={transactionDate}
                        onChange={e => setTransactionDate(e.target.value)}
                    />
                </div>

                {/* AMOUNT */}
                <div>
                    <label className="label">{t("transactions.amount")}</label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={amount}
                        min={0}
                        onChange={e =>
                            setAmount(Math.max(0, Number(e.target.value)))
                        }
                    />
                </div>

                {/* MOTIF */}
                <div>
                    <label className="label">{t("transactions.motif")}</label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={motif}
                        onChange={e => setMotif(e.target.value)}
                    />
                </div>

                {/* CREDIT */}
                {transactionType === "CREDIT" && (
                    <div>
                        <label className="label">{t("transactions.account")}</label>
                        <select
                            className="select select-bordered w-full"
                            value={selectedAccountId || ""}
                            disabled={fixedAccountId ? true : false}
                            onChange={e =>
                                setSelectedAccountId(e.target.value)
                            }
                        >
                            {accounts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* DEBIT */}
                {transactionType === "DEBIT" && (
                    <div>
                        <label className="label">{t("transactions.sub_pot")}</label>
                        <div className="border rounded p-2 max-h-60 overflow-auto">
                            {pots.map(pot => (
                                <div key={pot.id} className="mb-2">
                                    <div className="font-semibold">{pot.name}</div>
                                    <div className="ml-4 flex flex-col gap-1">
                                        {pot.sub_pots.map(sp => (
                                            <label key={sp.id} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="subPot"
                                                    checked={selectedSubPotId === sp.id}
                                                    onChange={() =>
                                                        setSelectedSubPotId(sp.id)
                                                    }
                                                    className="radio"
                                                />
                                                <span>{sp.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RECURRENCE */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={recurrence}
                        onChange={e => setRecurrence(e.target.checked)}
                        disabled={isForcedRecurrent ?? false}
                    />
                    <span>{t("transactions.recurrent")}</span>
                </div>

                {recurrence && (
                    <div>
                        <label className="label">
                            {t("transactions.recurrence_end")}
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={recurrenceEndDate ?? ""}
                            onChange={e =>
                                setRecurrenceEndDate(e.target.value)
                            }
                        />
                    </div>
                )}

            </div>
        </Modal>
    )
}