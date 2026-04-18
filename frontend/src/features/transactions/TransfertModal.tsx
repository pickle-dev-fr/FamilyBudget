import type { Account } from "@/api/accounts.api"
import Modal from "@/components/ui/Modal"
import { useState } from "react"
import type { UIPot } from "../pots/types"
import { useTranslation } from "react-i18next"
import { ArrowDown, Repeat } from "lucide-react"

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

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium text-base-content/70 mb-1 block">{children}</label>;
}

export default function TransferModal({
    fixedAccountSourceId,
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
    const otherAccounts = accounts.filter(c => c.id !== fixedAccountSourceId)
    const [destinationId, setDestinationId] = useState<string>(otherAccounts[0]?.id ?? "")
    const [selectedSubPotId, setSelectedSubPotId] = useState<string>(pots[0]?.sub_pots[0]?.id ?? "")
    const [recurrence, setRecurrence] = useState(isForcedRecurrent ?? false)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)

    const sourceAccount = accounts.find(c => c.id === fixedAccountSourceId)

    function handleSubmit() {
        if (!destinationId || amount <= 0) return
        onCreate({
            account_source_id: fixedAccountSourceId,
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
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("common.cancel")}</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>{t("common.save")}</button>
                </>
            }
        >
            <div className="flex flex-col gap-4">

                {/* ── Flux source → destination ── */}
                <div className="flex flex-col items-stretch gap-1.5">
                    <div>
                        <FieldLabel>{t("transactions.transfers.source_account")}</FieldLabel>
                        <input
                            type="text"
                            className="input input-bordered w-full bg-base-200/60 text-base-content/60 cursor-not-allowed"
                            value={sourceAccount?.name ?? ""}
                            disabled
                        />
                    </div>
                    <div className="flex justify-center">
                        <div className="w-7 h-7 rounded-full bg-base-200 border border-base-300 flex items-center justify-center">
                            <ArrowDown size={14} className="text-base-content/40" />
                        </div>
                    </div>
                    <div>
                        <FieldLabel>{t("transactions.transfers.destination_account")}</FieldLabel>
                        <select
                            className="select select-bordered w-full"
                            value={destinationId}
                            onChange={e => setDestinationId(e.target.value)}
                        >
                            {otherAccounts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
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
                            min={0}
                            className="input input-bordered w-full"
                            value={amount}
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

                {/* ── Sous-pot picker ── */}
                <div>
                    <FieldLabel>{t("transactions.sub_pot")}</FieldLabel>
                    <div className="bg-base-200/50 border border-base-300 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
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
                                                name="subPotTransfer"
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

                {/* ── Récurrence ── */}
                <div className={`rounded-xl transition-all ${recurrence ? "bg-base-200/50 border border-base-300 p-3" : ""}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={recurrence}
                            disabled={isForcedRecurrent}
                            onChange={e => setRecurrence(e.target.checked)}
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
