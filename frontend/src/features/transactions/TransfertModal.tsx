import type { Account } from "@/api/accounts.api"
import Modal from "@/components/ui/Modal"
import { useState } from "react"
import type { UIPot } from "../pots/types"
import { useTranslation } from "react-i18next"

type Props = {
    fixedAccountSourceId: string
    accounts: Account[]
    pots: UIPot[]
    isForcedRecurrent?: boolean
    onClose: () => void
    onCreate: (payload: {
        account_source_id: string
        account_destination_id: string
        sub_pot_id: string
        amount: number
        motif?: string
        transaction_date?: string
        recurrent: boolean
        recurrence_type?: string | null
        recurrence_end_date?: string | null
    }) => void
}

export default function TransferModal({
    fixedAccountSourceId: fixedAccountsourceId,
    accounts,
    isForcedRecurrent,
    pots,
    onClose,
    onCreate
}: Props) {
    const { t } = useTranslation();

    const today = new Date().toISOString().split("T")[0]

    const [amount, setAmount] = useState(0)
    const [motif, setMotif] = useState("")
    const [transactionDate, setTransactionDate] = useState(today)
    const otherAccounts = accounts.filter(
        c => c.id !== fixedAccountsourceId
    )

    const [destinationId, setDestinationId] = useState<string>(
        otherAccounts[0]?.id ?? ""
    )

    const [selectedSubPotId, setSelectedSubPotId] = useState<string>(
        pots[0].sub_pots[0]?.id ?? ""
    )

    const [recurrence, setRecurrence] = useState(isForcedRecurrent ?? false)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)

    const sourceAccount = accounts.find(c => c.id === fixedAccountsourceId)

    function handleSubmit() {
        console.log(destinationId)
        if (!destinationId) return
        if (amount <= 0) return

        onCreate({
            account_source_id: fixedAccountsourceId,
            account_destination_id: destinationId,
            amount,
            motif,
            transaction_date: transactionDate,
            sub_pot_id: selectedSubPotId,
            recurrent: recurrence,
            recurrence_type: recurrence ? "MONTH" : null,
            recurrence_end_date: recurrence ? recurrenceEndDate : null
        })

        onClose()
    }

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={t("transactions.transfers.add")}
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
                        min={0}
                        className="input input-bordered w-full"
                        value={amount}
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

                {/* SOURCE ACCOUNT */}
                <div>
                    <label className="label">
                        {t("transactions.transfers.source_account")}
                    </label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={sourceAccount?.name ?? ""}
                        disabled
                    />
                </div>

                {/* SOUS POT */}
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

                {/* DESTINATION ACCOUNT */}
                <div>
                    <label className="label">
                        {t("transactions.transfers.destination_account")}
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={destinationId}
                        onChange={e => setDestinationId(e.target.value)}
                    >
                        {accounts
                            .filter(c => c.id !== fixedAccountsourceId)
                            .map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </div>

                {/* RECURRENCE */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={recurrence}
                        disabled={isForcedRecurrent}
                        onChange={e => setRecurrence(e.target.checked)}
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