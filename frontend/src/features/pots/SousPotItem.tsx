import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UISousPot } from "./types"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import type { UpdateSousPotPayload } from "@/api/sous_pots.api"
import { useState } from "react"
import { t } from "i18next"

type Props = {
    sousPot: UISousPot
    disabled?: boolean
    onDelete?: (sousPotId: string) => void
    onUpdate?: (
        sousPotId: string,
        payload: UpdateSousPotPayload
    ) => Promise<void>
}

export default function SousPotItem({
    sousPot,
    disabled,
    onDelete,
    onUpdate
}: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(sousPot.name)
    const [editPrevision, setEditPrevision] = useState(sousPot.prevision)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: sousPot.id,
        data: {
            type: "souspot",
            potId: sousPot.pot_id,
        },
        disabled: disabled || isEditing,
    })

    const current = sousPot.current ?? 0

    const percentage =
        sousPot.prevision > 0
            ? (current / sousPot.prevision) * 100
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
                        sousPot.name
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
                        sousPot.prevision
                    )}
                </div>
                <div className="text-sm">{current}</div>
                <div className="text-sm">{percentage.toFixed(0)} %</div>
                <div className="ml-auto flex gap-1">
                    {!disabled && (
                        isEditing ? (
                            <>
                                <button
                                    className="btn btn-xs btn-primary"
                                    onClick={async () => {
                                        if (editPrevision < 0) return

                                        await onUpdate?.(sousPot.id, {
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
                                        setEditName(sousPot.name)
                                        setEditPrevision(sousPot.prevision)
                                        setIsEditing(false)
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    {t("common.cancel")}
                                </button>
                            </>
                        ) : (
                            <ActionsMenu
                                onDelete={() => onDelete?.(sousPot.id)}
                                onEdit={() => setIsEditing(true)}
                            />
                        )
                    )}
                </div>
            </div>

            <div className="h-2 w-full rounded overflow-hidden">
                <div
                    className={`h-full transition-all ${
                        percentage >= 100
                            ? "bg-error"
                            : percentage > 80
                            ? "bg-warning"
                            : "bg-success"
                    }`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    )
}

