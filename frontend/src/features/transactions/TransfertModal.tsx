import type { Compte } from "@/api/comptes.api"
import Modal from "@/components/ui/Modal"
import { useState } from "react"
import { t } from "i18next"
import type { UIPot } from "../pots/types"

type Props = {
    fixedCompteSourceId: string
    comptes: Compte[]
    pots: UIPot[]
    isForcedRecurrent: boolean
    onClose: () => void
    onCreate: (payload: {
        compte_source_id: string
        compte_destination_id: string
        sous_pot_id: string
        amount: number
        motif?: string
        transaction_date?: string
        recurrent: boolean
        recurrence_type?: string | null
        recurrence_end_date?: string | null
    }) => void
}

export default function TransferModal({
    fixedCompteSourceId,
    comptes,
    isForcedRecurrent,
    pots,
    onClose,
    onCreate
}: Props) {

    const today = new Date().toISOString().split("T")[0]

    const [amount, setAmount] = useState(0)
    const [motif, setMotif] = useState("")
    const [transactionDate, setTransactionDate] = useState(today)
    const otherAccounts = comptes.filter(
        c => c.id !== fixedCompteSourceId
    )

    const [destinationId, setDestinationId] = useState<string>(
        otherAccounts[0]?.id ?? ""
    )

    const [selectedSousPotId, setSelectedSousPotId] = useState<string>(
        pots[0].sous_pots[0]?.id ?? ""
    )

    const [recurrence, setRecurrence] = useState(isForcedRecurrent ?? false)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)

    const sourceAccount = comptes.find(c => c.id === fixedCompteSourceId)

    function handleSubmit() {
        console.log(destinationId)
        if (!destinationId) return
        if (amount <= 0) return

        onCreate({
            compte_source_id: fixedCompteSourceId,
            compte_destination_id: destinationId,
            amount,
            motif,
            transaction_date: transactionDate,
            sous_pot_id: selectedSousPotId,
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
                    <label className="label">{t("transactions.sous_pot")}</label>
                    <div className="border rounded p-2 max-h-60 overflow-auto">
                        {pots.map(pot => (
                            <div key={pot.id} className="mb-2">
                                <div className="font-semibold">{pot.name}</div>
                                <div className="ml-4 flex flex-col gap-1">
                                    {pot.sous_pots.map(sp => (
                                        <label key={sp.id} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sousPot"
                                                checked={selectedSousPotId === sp.id}
                                                onChange={() =>
                                                    setSelectedSousPotId(sp.id)
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
                        {comptes
                            .filter(c => c.id !== fixedCompteSourceId)
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