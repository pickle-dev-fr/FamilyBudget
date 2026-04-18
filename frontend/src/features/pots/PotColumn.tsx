import type { UIPot } from "./types"
import SubPotItem from "./SubPotItem"
import { useState } from "react"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import type { UpdatePotPayload } from "@/api/pots.api"
import type { UpdateSubPotPayload } from "@/api/sub_pots.api"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"
import { Plus } from "lucide-react"

type Props = {
    pot: UIPot
    allMovablePots: UIPot[]
    onUpdatePot: (potId: string, payload: UpdatePotPayload) => Promise<void>
    onDeletePot: (potId: string) => Promise<void>
    onReorderPot: (potId: string, newIndex: number) => Promise<void>
    onAddSubPot: (potId: string, name: string, prevision: number) => Promise<void>
    onSaveSubPot: (
        subPotId: string,
        updatePayload: { name: string; prevision: number } | null,
        movePayload: { newPotId: string; newPosition: number } | null
    ) => Promise<void>
    onDeleteSubPot: (subPotId: string) => Promise<void>
}

export default function PotColumn({
    pot, allMovablePots,
    onUpdatePot, onDeletePot, onReorderPot,
    onAddSubPot, onSaveSubPot, onDeleteSubPot,
}: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const isDefault = pot.position === 0

    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newPrevision, setNewPrevision] = useState(0)

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(pot.name)
    const [editPosition, setEditPosition] = useState(allMovablePots.findIndex(p => p.id === pot.id))

    const totalPrevision = Math.round(pot.sub_pots.reduce((s, sp) => s + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent   = Math.round(pot.sub_pots.reduce((s, sp) => s + (sp.current  ?? 0), 0) * 100) / 100
    const remaining      = Math.round((totalPrevision - totalCurrent) * 100) / 100
    const percentage     = totalPrevision > 0 ? (totalCurrent / totalPrevision) * 100 : totalCurrent > 0 ? 100 : 0
    const progressColor  = percentage > 100 ? "bg-error" : percentage >= 80 ? "bg-warning" : "bg-success"

    async function handleCreate() {
        const trimmed = newName.trim()
        if (!trimmed) return
        await onAddSubPot(pot.id, trimmed, newPrevision)
        setNewName(""); setNewPrevision(0); setShowCreate(false)
    }

    async function handleSavePot() {
        const trimmed = editName.trim()
        if (!trimmed) return
        await onUpdatePot(pot.id, { name: trimmed })
        const currentIndex = allMovablePots.findIndex(p => p.id === pot.id)
        if (!isDefault && currentIndex !== editPosition) {
            await onReorderPot(pot.id, editPosition)
        }
        setIsEditing(false)
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl">

            {/* ── En-tête ── */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                {isEditing ? (
                    <>
                        <input
                            className="input input-sm input-bordered flex-1 min-w-0"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSavePot()}
                            autoFocus
                        />
                        {!isDefault && allMovablePots.length > 1 && (
                            <select
                                className="select select-sm select-bordered w-36 shrink-0"
                                value={editPosition}
                                onChange={e => setEditPosition(Number(e.target.value))}
                            >
                                {allMovablePots.map((_, i) => (
                                    <option key={i} value={i}>{t("pots.position")} {i + 1}</option>
                                ))}
                            </select>
                        )}
                        <div className="flex gap-1 shrink-0">
                            <button className="btn btn-xs btn-primary" onClick={handleSavePot}>{t("common.save")}</button>
                            <button className="btn btn-xs btn-ghost" onClick={() => { setEditName(pot.name); setIsEditing(false) }}>{t("common.cancel")}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-sm flex-1 min-w-0 truncate">{pot.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                            {!isDefault && (
                                <button
                                    className="btn btn-ghost btn-xs btn-square text-base-content/35 hover:text-primary"
                                    onClick={() => setShowCreate(true)}
                                    title={t("sub_pots.add")}
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isDefault && (
                                <ActionsMenu
                                    onEdit={() => { setEditName(pot.name); setEditPosition(allMovablePots.findIndex(p => p.id === pot.id)); setIsEditing(true) }}
                                    onDelete={() => onDeletePot(pot.id)}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Barre progression ── */}
            <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-xs text-base-content/45 mb-1">
                    <span className="tabular-nums">
                        {formatAmount(totalCurrent)} <span className="text-base-content/25">/</span> {formatAmount(totalPrevision)} {currencySymbol}
                    </span>
                    <span className={`font-semibold tabular-nums ${remaining < 0 ? "text-error" : remaining > 0 ? "text-success" : ""}`}>
                        {remaining >= 0 ? "+" : ""}{formatAmount(remaining)} {currencySymbol}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-base-300/70 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
            </div>

            {/* ── Sous-pots ── */}
            {(pot.sub_pots.length > 0 || showCreate) && (
                <div className="border-t border-base-300/60 px-3 pt-1 pb-2 flex flex-col gap-0.5">
                    {showCreate && !isDefault && (
                        <div className="flex flex-wrap gap-2 py-2 border-b border-base-300/40 mb-1">
                            <input
                                className="input input-sm input-bordered flex-1 min-w-28"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder={t("sub_pots.name")}
                                onKeyDown={e => e.key === "Enter" && handleCreate()}
                                autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number" min={0} step="0.01"
                                    className="input input-sm input-bordered w-24"
                                    value={newPrevision}
                                    onChange={e => setNewPrevision(Number(e.target.value))}
                                    placeholder="0"
                                />
                                <span className="text-xs text-base-content/40">{currencySymbol}</span>
                            </div>
                            <div className="flex gap-1">
                                <button className="btn btn-sm btn-primary" onClick={handleCreate}>{t("common.create")}</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => { setShowCreate(false); setNewName(""); setNewPrevision(0) }}>{t("common.cancel")}</button>
                            </div>
                        </div>
                    )}
                    {pot.sub_pots.map(sp => (
                        <SubPotItem
                            key={sp.id}
                            subPot={sp}
                            currentPot={pot}
                            allMovablePots={allMovablePots}
                            isInDefaultPot={isDefault}
                            onDelete={onDeleteSubPot}
                            onSave={onSaveSubPot}
                        />
                    ))}
                </div>
            )}

            {/* Bouton "ajouter" quand pas de sous-pots et formulaire fermé */}
            {!isDefault && !showCreate && pot.sub_pots.length === 0 && (
                <div className="px-4 pb-3">
                    <button className="btn btn-ghost btn-xs text-base-content/35 w-full gap-1" onClick={() => setShowCreate(true)}>
                        <Plus size={13} /> {t("sub_pots.add")}
                    </button>
                </div>
            )}
        </div>
    )
}
