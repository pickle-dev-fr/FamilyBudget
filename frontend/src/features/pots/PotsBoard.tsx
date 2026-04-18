import { useEffect, useState } from "react"
import { deletePot, getPotsAndSubPotsByAccount } from "@/api/pots.api"
import PotColumn from "./PotColumn"
import type { UIPot } from "./types"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"
import ConfirmModal from "@/components/layout/ConfirmModal"

type Props = {
    accountId: string
    refreshKey?: number
    year?: number
    month?: number
}

export default function PotsBoard({ accountId, refreshKey, year, month }: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const [pots, setPots] = useState<UIPot[]>([])
    const [potToDelete, setPotToDelete] = useState<string | null>(null)

    const allSubPots    = pots.flatMap(p => p.sub_pots)
    const totalPrevision = Math.round(allSubPots.reduce((s, sp) => s + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent   = Math.round(allSubPots.reduce((s, sp) => s + (sp.current  ?? 0), 0) * 100) / 100
    const totalRemaining = Math.round((totalPrevision - totalCurrent) * 100) / 100

    useEffect(() => { if (accountId) load() }, [accountId, refreshKey, year, month])

    async function load() {
        const data = await getPotsAndSubPotsByAccount(accountId, year, month)
        setPots([...data].sort((a, b) => a.position - b.position))
    }

    async function handleDeletePot(potId: string) {
        await deletePot(potId)
        setPotToDelete(null)
        await load()
    }

    return (
        <div className="flex flex-col gap-3">
            {pots.length > 0 && (
                <div className="bg-base-100 border border-base-300 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
                    <span className="text-base-content/50">{t("pots.prevision")}
                        <span className="font-semibold text-base-content ml-1 tabular-nums">{formatAmount(totalPrevision)} {currencySymbol}</span>
                    </span>
                    <span className="text-base-content/50">{t("pots.current")}
                        <span className="font-semibold text-base-content ml-1 tabular-nums">{formatAmount(totalCurrent)} {currencySymbol}</span>
                    </span>
                    <span className="text-base-content/50">{t("pots.reste")}
                        <span className={`font-semibold ml-1 tabular-nums ${totalRemaining < 0 ? "text-error" : "text-success"}`}>
                            {formatAmount(totalRemaining)} {currencySymbol}
                        </span>
                    </span>
                </div>
            )}

            {pots.map(pot => (
                <PotColumn
                    key={pot.id}
                    pot={pot}
                    onRequestDelete={setPotToDelete}
                />
            ))}

            <ConfirmModal
                open={!!potToDelete}
                title={t("common.confirm")}
                message={t("pots.delete_confirm")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                onConfirm={() => potToDelete && handleDeletePot(potToDelete)}
                onCancel={() => setPotToDelete(null)}
            />
        </div>
    )
}
