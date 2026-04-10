import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UISubPot } from "./types"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import type { UpdateSubPotPayload } from "@/api/sub_pots.api"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { formatAmount } from "@/utils"

type Props = {
    subPot: UISubPot
    disabled?: boolean
    onDelete?: (subPotId: string) => void
    onUpdate?: (
        subPotId: string,
        payload: UpdateSubPotPayload
    ) => Promise<void>
}

export default function SubPotItem({
    subPot,
    disabled,
    onDelete,
    onUpdate
}: Props) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(subPot.name)
    const [editPrevision, setEditPrevision] = useState(subPot.prevision)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: subPot.id,
        data: {
            type: "subpot",
            potId: subPot.pot_id,
        },
        disabled: disabled || isEditing,
    })

    const current = subPot.current ?? 0

    const percentage =
        subPot.prevision > 0
            ? (current / subPot.prevision) * 100
            : current ? 100 : 0

    const clamped = Math.min(percentage, 100)

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col gap-1 p-2 rounded-md bg-base-200"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: disabled ? 0.5 : isDragging ? 0 : 1,
            }}
        >
            <div
                {...attributes}
                {...(!isEditing ? listeners : {})}
                className="grid grid-cols-5 items-center gap-2"
            >
                <div className="cursor-grab">
                    {isEditing ? (
                        <input
                            className="input input-sm input-bordered w-full"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        subPot.name
                    )}
                </div>

                <div className="text-sm">
                    {isEditing ? (
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="input input-sm input-bordered w-full"
                            value={editPrevision}
                            onChange={(e) =>
                                setEditPrevision(Number(e.target.value))
                            }
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        formatAmount(subPot.prevision)
                    )}
                </div>
                <div className="text-sm">{formatAmount(current)}</div>
                <div className="text-sm">{percentage.toFixed(0)} %</div>
                <div className="ml-auto flex gap-1">
                    {!disabled && (
                        isEditing ? (
                            <>
                                <button
                                    className="btn btn-xs btn-primary"
                                    onClick={async () => {
                                        if (editPrevision < 0) return

                                        await onUpdate?.(subPot.id, {
                                            name: editName.trim(),
                                            prevision: editPrevision,
                                        })

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
                            </>
                        ) : (
                            <ActionsMenu
                                onDelete={() => onDelete?.(subPot.id)}
                                onEdit={() => setIsEditing(true)}
                            />
                        )
                    )}
                </div>
            </div>

            <div className="h-2 w-full rounded overflow-hidden">
                <div
                    className={`h-full transition-all ${
                        percentage > 100
                            ? "bg-error"
                            : percentage >= 80
                            ? "bg-warning"
                            : "bg-success"
                    }`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    )
}

