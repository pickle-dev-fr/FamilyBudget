import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UIPot } from "./types"
import SousPotItem from "./SousPotItem"
import { useState } from "react"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import { t } from "i18next"
import { type UpdateSousPotPayload } from "@/api/sous_pots.api"
import type { UpdatePotPayload } from "@/api/pots.api"

type Props = {
    pot: UIPot
    onAddSousPot: (potId: string, name: string) => void
    onPersistSousPot: (
        potId: string,
        name: string,
        prevision: number
    ) => Promise<void>
    onUpdateSousPot: (
        sousPotId: string,
        payload: UpdateSousPotPayload
    ) => Promise<void>
    onUpdatePot: (
        potId: string,
        payload: UpdatePotPayload
    ) => Promise<void>
    onDeleteSousPot: (
        sousPotId: string
    ) => Promise<void>
    onDeletePot: (potId: string) => Promise<void>
}


export default function PotColumn({ pot, onAddSousPot, onPersistSousPot, onUpdateSousPot, onUpdatePot, onDeletePot, onDeleteSousPot }: Props) {
    const disabled = pot.position === 0
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newPrevision, setNewPrevision] = useState<number>(0)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(pot.name)


    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: pot.id,
        data: { type: "pot" },
        disabled,
    })
    const totalPrevision = pot.sous_pots.reduce(
        (acc, sp) => acc + (sp.prevision ?? 0),
        0
    )

    const totalCurrent = pot.sous_pots.reduce(
        (acc, sp) => acc + (sp.current ?? 0),
        0
    )

    const remaining = totalPrevision - totalCurrent

    const percentage =
        totalPrevision > 0
            ? (totalCurrent / totalPrevision) * 100
            : totalCurrent > 0
            ? 100
            : 0

    const clamped = Math.min(percentage, 100)

    return (
        <div
            ref={setNodeRef}
            className={`pot-item bg-base-200 border border-base-300 shadow-sm p-4 rounded-lg transition-all
                ${isDragging ? "opacity-0" : "opacity-100"} 
                ${disabled ? "cursor-not-allowed" : "cursor-grab"}
            `}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            {/* HEADER */}
            <div
                {...attributes}
                {...listeners}
                className="flex justify-between items-center pot-header"
            >
                <div
                    className="flex items-center gap-2 pot-handle"
                    onPointerDown={(e) => {
                        if (isEditing) {
                            e.stopPropagation()
                            setEditName(pot.name)
                            setIsEditing(false)
                        }
                    }}
                >
                    <span className="text-sm">☰</span>

                    {isEditing && !disabled ? (
                        <input
                            className="input input-xs input-bordered"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="font-medium">{pot.name}</span>
                    )}
                </div>

                {isEditing && !disabled ? (
                    <div className="flex gap-1">
                        <button
                            className="btn btn-xs btn-primary"
                            onClick={async () => {
                                const trimmed = editName.trim()
                                if (!trimmed) return

                                await onUpdatePot(pot.id, { name: trimmed })
                                setIsEditing(false)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {t("common.save")}
                        </button>

                        <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                                setEditName(pot.name)
                                setIsEditing(false)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                ) : (
                    !disabled && (
                        <ActionsMenu
                            onDelete={() => onDeletePot(pot.id)}
                            onEdit={() => setIsEditing(true)}
                        />
                    )
                )}
            </div>

            {/* RÉSUMÉ COMPACT */}
            <div className="mt-2 flex items-center justify-between text-xs">

                <div className="flex gap-4">
                    <div>
                        <span className="opacity-60">{t("pots.prevision")} </span>
                        <span className="font-medium">{totalPrevision}</span>
                    </div>

                    <div>
                        <span className="opacity-60">{t("pots.current")} </span>
                        <span className="font-medium">{totalCurrent}</span>
                    </div>

                    <div>
                        <span className="opacity-60">{t("pots.reste")} </span>
                        <span className={`font-medium ${
                            remaining < 0 ? "text-error" : ""
                        }`}>
                            {remaining}
                        </span>
                    </div>
                </div>

                <div className="font-medium">
                    {percentage.toFixed(0)} %
                </div>
            </div>

            {/* BARRE */}
            <div className="mt-1 h-1.5 w-full bg-base-300 rounded overflow-hidden">
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

            {/* TABLEAU */}
            <div className="mt-3 pt-3 border-t border-base-300 flex flex-col gap-3">

                <div className="grid grid-cols-5 gap-2 text-xs font-medium opacity-70">
                    <div>{t("sous_pots.name")}</div>
                    <div>{t("sous_pots.prevision")}</div>
                    <div>{t("sous_pots.current")}</div>
                    <div>{t("sous_pots.pourcentage")}</div>
                    <div>{t("common.actions")}</div>
                </div>

                {showCreate && (
                    <div className="flex gap-2">
                        <input
                            className="input input-sm input-bordered flex-1"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t("sous_pots.name")}
                        />

                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="input input-sm input-bordered w-28"
                            value={newPrevision}
                            onChange={(e) => setNewPrevision(Number(e.target.value))}
                            placeholder={t("sous_pots.prevision")}
                        />

                        <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                                const trimmed = newName.trim()
                                if (!trimmed) return

                                onAddSousPot(pot.id, trimmed)
                                setNewName("")
                                setNewPrevision(0)
                                setShowCreate(false)

                                if (newPrevision < 0) return

                                await onPersistSousPot(
                                    pot.id,
                                    trimmed,
                                    newPrevision
                                )
                            }}
                        >
                            {t("common.create")}
                        </button>
                    </div>
                )}

                <SortableContext
                    items={pot.sous_pots.map(sp => sp.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2">
                        {pot.sous_pots.map(sp => (
                            <SousPotItem
                                key={sp.id}
                                sousPot={sp}
                                disabled={disabled}
                                onDelete={onDeleteSousPot}
                                onUpdate={onUpdateSousPot}
                            />
                        ))}
                    </div>
                </SortableContext>

            </div>
        </div>
    )
}
