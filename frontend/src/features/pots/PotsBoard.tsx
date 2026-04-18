import { useEffect, useState } from "react"
import { deletePot, getPotsAndSubPotsByAccount, reorderPots, updatePot, type UpdatePotPayload } from "@/api/pots.api"
import { createSubPot, deleteSubPot, reorderSubPots, updateSubPot, type UpdateSubPotPayload } from "@/api/sub_pots.api"
import PotColumn from "./PotColumn"
import type { UIPot } from "./types"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"

type Props = {
    accountId: string
    refreshKey?: number
    year?: number
    month?: number
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
    const r = [...arr]
    const [item] = r.splice(from, 1)
    r.splice(to, 0, item)
    return r
}

export default function PotsBoard({ accountId, refreshKey, year, month }: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const [pots, setPots] = useState<UIPot[]>([])

    const defaultPot = pots.find(p => p.position === 0)
    const movablePots = pots.filter(p => p.position !== 0)
    const allSubPots = pots.flatMap(p => p.sub_pots)
    const totalPrevision = Math.round(allSubPots.reduce((s, sp) => s + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent  = Math.round(allSubPots.reduce((s, sp) => s + (sp.current  ?? 0), 0) * 100) / 100
    const totalRemaining = Math.round((totalPrevision - totalCurrent) * 100) / 100

    useEffect(() => { if (accountId) load() }, [accountId, refreshKey, year, month])

    async function load() {
        const data = await getPotsAndSubPotsByAccount(accountId, year, month)
        setPots([...data].sort((a, b) => a.position - b.position))
    }

    async function handleUpdatePot(potId: string, payload: UpdatePotPayload) {
        await updatePot(potId, payload)
        await load()
    }

    async function handleDeletePot(potId: string) {
        await deletePot(potId)
        await load()
    }

    async function handleReorderPot(potId: string, newIndex: number) {
        const currentIndex = movablePots.findIndex(p => p.id === potId)
        if (currentIndex === -1 || currentIndex === newIndex) return
        const reordered = reorder(movablePots, currentIndex, newIndex)
        await reorderPots({ account_id: accountId, ordered_ids: [defaultPot!.id, ...reordered.map(p => p.id)] })
        await load()
    }

    async function handleAddSubPot(potId: string, name: string, prevision: number) {
        await createSubPot(potId, { name, prevision })
        await load()
    }

    async function handleSaveSubPot(
        subPotId: string,
        updatePayload: { name: string; prevision: number } | null,
        movePayload: { newPotId: string; newPosition: number } | null
    ) {
        if (updatePayload) {
            await updateSubPot(subPotId, updatePayload)
        }
        if (movePayload) {
            const sourcePot = pots.find(p => p.sub_pots.some(sp => sp.id === subPotId))
            if (!sourcePot) { await load(); return }

            if (movePayload.newPotId === sourcePot.id) {
                const currentIndex = sourcePot.sub_pots.findIndex(sp => sp.id === subPotId)
                const reordered = reorder(sourcePot.sub_pots, currentIndex, movePayload.newPosition)
                await reorderSubPots(accountId, {
                    ancien_pot: { pot_id: sourcePot.id, sub_pot_ids: [] },
                    nouveau_pot: { pot_id: sourcePot.id, sub_pot_ids: reordered.map(sp => sp.id) },
                })
            } else {
                const targetPot = pots.find(p => p.id === movePayload.newPotId)
                if (!targetPot) { await load(); return }
                const movingSubPot = sourcePot.sub_pots.find(sp => sp.id === subPotId)!
                const sourceSubPots = sourcePot.sub_pots.filter(sp => sp.id !== subPotId)
                const targetSubPots = [...targetPot.sub_pots]
                targetSubPots.splice(movePayload.newPosition, 0, movingSubPot)
                await reorderSubPots(accountId, {
                    ancien_pot: { pot_id: sourcePot.id, sub_pot_ids: sourceSubPots.map(sp => sp.id) },
                    nouveau_pot: { pot_id: movePayload.newPotId, sub_pot_ids: targetSubPots.map(sp => sp.id) },
                })
            }
        }
        await load()
    }

    async function handleDeleteSubPot(subPotId: string) {
        await deleteSubPot(subPotId)
        await load()
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Récapitulatif global */}
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

            {defaultPot && (
                <PotColumn
                    pot={defaultPot}
                    allMovablePots={movablePots}
                    onUpdatePot={handleUpdatePot}
                    onDeletePot={handleDeletePot}
                    onReorderPot={handleReorderPot}
                    onAddSubPot={handleAddSubPot}
                    onSaveSubPot={handleSaveSubPot}
                    onDeleteSubPot={handleDeleteSubPot}
                />
            )}

            {movablePots.map(pot => (
                <PotColumn
                    key={pot.id}
                    pot={pot}
                    allMovablePots={movablePots}
                    onUpdatePot={handleUpdatePot}
                    onDeletePot={handleDeletePot}
                    onReorderPot={handleReorderPot}
                    onAddSubPot={handleAddSubPot}
                    onSaveSubPot={handleSaveSubPot}
                    onDeleteSubPot={handleDeleteSubPot}
                />
            ))}
        </div>
    )
}
