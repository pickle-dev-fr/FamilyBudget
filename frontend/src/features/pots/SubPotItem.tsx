import type { UISubPot, UIPot } from "./types"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"

type Props = {
    subPot: UISubPot
    currentPot: UIPot
    allMovablePots: UIPot[]
    isInDefaultPot: boolean
    prevMonthCurrent?: number
    onDelete: (subPotId: string) => Promise<void>
    onSave: (
        subPotId: string,
        updatePayload: { name: string; prevision: number } | null,
        movePayload: { newPotId: string; newPosition: number } | null
    ) => Promise<void>
}

export default function SubPotItem({ subPot, currentPot, allMovablePots, isInDefaultPot, prevMonthCurrent, onDelete, onSave }: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(subPot.name)
    const [editPrevision, setEditPrevision] = useState(subPot.prevision)
    const [editPotId, setEditPotId] = useState(subPot.pot_id)
    const [editPosition, setEditPosition] = useState(currentPot.sub_pots.findIndex(sp => sp.id === subPot.id))

    const current    = subPot.current ?? 0
    const percentage = subPot.prevision > 0 ? (current / subPot.prevision) * 100 : current ? 100 : 0
    const progressColor = percentage > 100 ? "bg-error" : percentage >= 80 ? "bg-warning" : "bg-success"

    const trend = prevMonthCurrent !== undefined && prevMonthCurrent > 0
        ? ((current - prevMonthCurrent) / prevMonthCurrent) * 100
        : null

    const targetPot = allMovablePots.find(p => p.id === editPotId) ?? currentPot
    const positionCount = editPotId === currentPot.id
        ? currentPot.sub_pots.length
        : (targetPot.sub_pots.length + 1)

    async function handleSave() {
        const originalIndex = currentPot.sub_pots.findIndex(sp => sp.id === subPot.id)
        const nameChanged = editName.trim() !== subPot.name || editPrevision !== subPot.prevision
        const moved = editPotId !== subPot.pot_id || editPosition !== originalIndex

        await onSave(
            subPot.id,
            nameChanged ? { name: editName.trim(), prevision: editPrevision } : null,
            moved ? { newPotId: editPotId, newPosition: editPosition } : null
        )
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <div className="bg-base-200/40 border border-base-300/60 rounded-lg px-3 py-2.5 my-0.5 flex flex-col gap-2">
                {/* Nom + prévision */}
                <div className="flex gap-2 flex-wrap">
                    <input
                        className="input input-xs input-bordered flex-1 min-w-28"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center gap-1">
                        <input
                            type="number" min={0} step="0.01"
                            className="input input-xs input-bordered w-20"
                            value={editPrevision}
                            onChange={e => setEditPrevision(Number(e.target.value))}
                        />
                        <span className="text-xs text-base-content/40 shrink-0">{currencySymbol}</span>
                    </div>
                </div>
                {/* Déplacer : pot + position */}
                {!isInDefaultPot && allMovablePots.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <select
                            className="select select-xs select-bordered flex-1 min-w-28"
                            value={editPotId}
                            onChange={e => { setEditPotId(e.target.value); setEditPosition(0) }}
                        >
                            {allMovablePots.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <select
                            className="select select-xs select-bordered w-32 shrink-0"
                            value={editPosition}
                            onChange={e => setEditPosition(Number(e.target.value))}
                        >
                            {Array.from({ length: positionCount }, (_, i) => (
                                <option key={i} value={i}>{t("pots.position")} {i + 1}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="flex gap-1 justify-end">
                    <button className="btn btn-xs btn-primary" onClick={handleSave}>{t("common.save")}</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => setIsEditing(false)}>{t("common.cancel")}</button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-base-200/50 transition-colors group">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{subPot.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 flex-1 bg-base-300/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                    <span className="text-xs text-base-content/40 tabular-nums shrink-0">
                        {formatAmount(current)} / {formatAmount(subPot.prevision)} {currencySymbol}
                    </span>
                    {trend !== null && (
                        <span className={`text-xs tabular-nums shrink-0 ${trend > 0 ? "text-error" : "text-success"}`}>
                            {trend > 0 ? "↑" : "↓"}{Math.abs(Math.round(trend))}%
                        </span>
                    )}
                </div>
            </div>
            {!isInDefaultPot && (
                <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <ActionsMenu
                        onEdit={() => {
                            setEditName(subPot.name)
                            setEditPrevision(subPot.prevision)
                            setEditPotId(subPot.pot_id)
                            setEditPosition(currentPot.sub_pots.findIndex(sp => sp.id === subPot.id))
                            setIsEditing(true)
                        }}
                        onDelete={() => onDelete(subPot.id)}
                    />
                </div>
            )}
        </div>
    )
}
