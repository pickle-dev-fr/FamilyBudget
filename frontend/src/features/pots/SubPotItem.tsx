import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UISubPot } from "./types"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import type { UpdateSubPotPayload } from "@/api/sub_pots.api"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { formatAmount } from "@/utils"
import { GripVertical } from "lucide-react"

type Props = {
    subPot: UISubPot
    disabled?: boolean
    onDelete?: (subPotId: string) => void
    onUpdate?: (subPotId: string, payload: UpdateSubPotPayload) => Promise<void>
}

export default function SubPotItem({ subPot, disabled, onDelete, onUpdate }: Props) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(subPot.name)
    const [editPrevision, setEditPrevision] = useState(subPot.prevision)

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: subPot.id,
        data: { type: "subpot", potId: subPot.pot_id },
        disabled: disabled || isEditing,
    })

    const current = subPot.current ?? 0
    const percentage = subPot.prevision > 0 ? (current / subPot.prevision) * 100 : current ? 100 : 0
    const clamped = Math.min(percentage, 100)
    const progressColor = percentage > 100 ? "bg-error" : percentage >= 80 ? "bg-warning" : "bg-success"

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-base-200/60 transition-colors group
                ${isDragging ? "opacity-0" : ""} ${disabled ? "opacity-50" : ""}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...(!isEditing ? listeners : {})}
                className={`shrink-0 text-base-content/20 group-hover:text-base-content/40 transition-colors
                    ${disabled || isEditing ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
            >
                <GripVertical size={14} />
            </div>

            {/* Nom */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        className="input input-xs input-bordered w-full"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        autoFocus
                    />
                ) : (
                    <p className="text-sm font-medium truncate">{subPot.name}</p>
                )}
                {/* Barre de progression */}
                <div className="mt-1 h-1 w-full bg-base-300 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${clamped}%` }} />
                </div>
            </div>

            {/* Stats */}
            {isEditing ? (
                <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input input-xs input-bordered w-20 shrink-0"
                    value={editPrevision}
                    onChange={(e) => setEditPrevision(Number(e.target.value))}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder={t("sub_pots.prevision")}
                />
            ) : (
                <div className="flex items-center gap-1.5 shrink-0 text-xs text-base-content/50 tabular-nums">
                    <span>{formatAmount(current)}</span>
                    <span className="text-base-content/25">/</span>
                    <span>{formatAmount(subPot.prevision)}</span>
                    <span className={`font-medium text-xs px-1.5 py-0.5 rounded-full ${
                        percentage > 100 ? "bg-error/10 text-error" :
                        percentage >= 80 ? "bg-warning/10 text-warning" :
                        "bg-base-300/50 text-base-content/50"
                    }`}>
                        {percentage.toFixed(0)}%
                    </span>
                </div>
            )}

            {/* Actions */}
            {!disabled && (
                isEditing ? (
                    <div className="flex gap-1 shrink-0">
                        <button
                            className="btn btn-xs btn-primary"
                            onClick={async () => {
                                if (editPrevision < 0) return
                                await onUpdate?.(subPot.id, { name: editName.trim(), prevision: editPrevision })
                                setIsEditing(false)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {t("common.save")}
                        </button>
                        <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                                setEditName(subPot.name)
                                setEditPrevision(subPot.prevision)
                                setIsEditing(false)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                ) : (
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionsMenu
                            onDelete={() => onDelete?.(subPot.id)}
                            onEdit={() => setIsEditing(true)}
                        />
                    </div>
                )
            )}
        </div>
    )
}
