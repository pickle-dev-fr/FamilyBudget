import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UIPot } from "./types"
import SubPotItem from "./SubPotItem"
import { useState } from "react"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import { type UpdateSubPotPayload } from "@/api/sub_pots.api"
import type { UpdatePotPayload } from "@/api/pots.api"
import { useTranslation } from "react-i18next"
import { formatAmount } from "@/utils"
import { GripVertical, Plus } from "lucide-react"

type Props = {
    pot: UIPot
    onAddSubPot: (potId: string, name: string) => void
    onPersistSubPot: (potId: string, name: string, prevision: number) => Promise<void>
    onUpdateSubPot: (subPotId: string, payload: UpdateSubPotPayload) => Promise<void>
    onUpdatePot: (potId: string, payload: UpdatePotPayload) => Promise<void>
    onDeleteSubPot: (subPotId: string) => Promise<void>
    onDeletePot: (potId: string) => Promise<void>
}

export default function PotColumn({ pot, onAddSubPot, onPersistSubPot, onUpdateSubPot, onUpdatePot, onDeletePot, onDeleteSubPot }: Props) {
    const { t } = useTranslation();
    const disabled = pot.position === 0
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newPrevision, setNewPrevision] = useState<number>(0)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(pot.name)

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: pot.id,
        data: { type: "pot" },
        disabled,
    })

    const totalPrevision = Math.round(pot.sub_pots.reduce((acc, sp) => acc + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent = Math.round(pot.sub_pots.reduce((acc, sp) => acc + (sp.current ?? 0), 0) * 100) / 100
    const remaining = Math.round((totalPrevision - totalCurrent) * 100) / 100
    const percentage = totalPrevision > 0 ? (totalCurrent / totalPrevision) * 100 : totalCurrent > 0 ? 100 : 0
    const clamped = Math.min(percentage, 100)
    const progressColor = percentage > 100 ? "bg-error" : percentage >= 80 ? "bg-warning" : "bg-success"

    const remainingBadge = remaining < 0
        ? "bg-error/10 text-error"
        : remaining > 0
        ? "bg-success/10 text-success"
        : "bg-base-300/50 text-base-content/50"

    return (
        <div
            ref={setNodeRef}
            className={`pot-item bg-base-100 border border-base-300 rounded-xl transition-all
                ${isDragging ? "opacity-0" : "opacity-100"}
                ${disabled ? "" : "shadow-sm"}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            {/* ── Header ── */}
            <div
                {...attributes}
                {...listeners}
                className={`flex items-center gap-2 px-4 pt-4 pb-2 ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
            >
                {/* Drag handle */}
                {!disabled && (
                    <GripVertical size={15} className="shrink-0 text-base-content/20 hover:text-base-content/50 transition-colors" />
                )}

                {/* Nom éditable */}
                <div className="flex-1 min-w-0" onPointerDown={(e) => { if (isEditing) e.stopPropagation() }}>
                    {isEditing ? (
                        <input
                            className="input input-sm input-bordered w-full"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <span className="font-semibold text-sm truncate">{pot.name}</span>
                    )}
                </div>

                {/* Actions */}
                {isEditing ? (
                    <div className="flex gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            className="btn btn-xs btn-primary"
                            onClick={async () => {
                                const trimmed = editName.trim()
                                if (!trimmed) return
                                await onUpdatePot(pot.id, { name: trimmed })
                                setIsEditing(false)
                            }}
                        >
                            {t("common.save")}
                        </button>
                        <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => { setEditName(pot.name); setIsEditing(false) }}
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                ) : !disabled ? (
                    <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-primary"
                            onClick={() => setShowCreate(true)}
                            title={t("sub_pots.add")}
                        >
                            <Plus size={14} />
                        </button>
                        <ActionsMenu
                            onDelete={() => onDeletePot(pot.id)}
                            onEdit={() => setIsEditing(true)}
                        />
                    </div>
                ) : null}
            </div>

            {/* ── Résumé badges + barre ── */}
            <div className="px-4 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-xs text-base-content/45">{t("pots.prevision")}</span>
                    <span className="text-xs font-semibold tabular-nums">{formatAmount(totalPrevision)}</span>
                    <span className="text-base-content/20 text-xs">·</span>
                    <span className="text-xs text-base-content/45">{t("pots.current")}</span>
                    <span className="text-xs font-semibold tabular-nums">{formatAmount(totalCurrent)}</span>
                    <span className="text-base-content/20 text-xs">·</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${remainingBadge}`}>
                        {formatAmount(remaining)}
                    </span>
                    <span className="ml-auto text-xs font-medium text-base-content/50 tabular-nums">
                        {percentage.toFixed(0)}%
                    </span>
                </div>
                <div className="h-2 w-full bg-base-300 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${progressColor}`}
                        style={{ width: `${clamped}%` }}
                    />
                </div>
            </div>

            {/* ── Sous-pots ── */}
            <div className="border-t border-base-300 px-3 py-2">

                {/* Formulaire de création */}
                {showCreate && !disabled && (
                    <div className="flex gap-2 mb-2">
                        <input
                            className="input input-sm input-bordered flex-1"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t("sub_pots.name")}
                            autoFocus
                        />
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="input input-sm input-bordered w-24"
                            value={newPrevision}
                            onChange={(e) => setNewPrevision(Number(e.target.value))}
                            placeholder="0"
                        />
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                                const trimmed = newName.trim()
                                if (!trimmed) return
                                onAddSubPot(pot.id, trimmed)
                                setNewName("")
                                setNewPrevision(0)
                                setShowCreate(false)
                                if (newPrevision >= 0) await onPersistSubPot(pot.id, trimmed, newPrevision)
                            }}
                        >
                            {t("common.create")}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setShowCreate(false); setNewName(""); setNewPrevision(0) }}>
                            {t("common.cancel")}
                        </button>
                    </div>
                )}

                {/* Liste sous-pots */}
                <SortableContext items={pot.sub_pots.map(sp => sp.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col">
                        {pot.sub_pots.map(sp => (
                            <SubPotItem
                                key={sp.id}
                                subPot={sp}
                                disabled={disabled}
                                onDelete={onDeleteSubPot}
                                onUpdate={onUpdateSubPot}
                            />
                        ))}
                        {pot.sub_pots.length === 0 && !showCreate && (
                            <p className="text-xs text-base-content/30 italic text-center py-3">—</p>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}
