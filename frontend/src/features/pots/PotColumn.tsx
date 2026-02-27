import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UIPot } from "./types"
import SousPotItem from "./SousPotItem"
import { useState } from "react"
import { ActionsMenu } from "@/components/layout/ActionsMenu"
import { t } from "i18next"

type Props = {
    pot: UIPot
    onAddSousPot: (potId: string, name: string) => void
    onPersistSousPot: (
        potId: string,
        name: string,
        prevision: number
    ) => Promise<void>
    onDeleteSousPot: (
        sousPotId: string
    ) => Promise<void>
    onDeletePot: (potId: string) => Promise<void>
}


export default function PotColumn({ pot, onAddSousPot, onPersistSousPot, onDeletePot, onDeleteSousPot }: Props) {
    const disabled = pot.position === 0
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newPrevision, setNewPrevision] = useState<number>(0)


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

    return (
        <div
            ref={setNodeRef}
            className={`pot-item bg-base-200 p-4 rounded-lg ${isDragging ? "opacity-0" : "opacity-100"} ${disabled ? "cursor-not-allowed" : "cursor-grab"}`}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            <div {...attributes} {...listeners} className="flex justify-between items-center mb-2 pot-header">
                <div className="flex items-center gap-2 pot-handle">
                    <span>☰</span>
                    <span>{pot.name}</span>
                </div>

                {!disabled && (
                    <div className="flex gap-2 pot-actions">
                        <button
                            className="btn btn-sm btn-outline"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => setShowCreate(true)}
                        >
                            +
                        </button>

                        <ActionsMenu onDelete={() => onDeletePot(pot.id)} />
                    </div>
                )}
            </div>

        <div className="flex flex-col gap-2">
            {/* Header aligned with columns */}
            <div className="grid grid-cols-5 gap-2 text-sm font-medium mb-2">
                <div>{t("sous_pots.name")}</div>
                <div>{t("sous_pots.prevision")}</div>
                <div>{t("sous_pots.current")}</div>
                <div>{t("sous_pots.pourcentage")}</div>
                <div>{t("common.actions")}</div>
            </div>

            {/* Create new SousPot form */}
            {showCreate && (
                <div className="flex gap-2 mb-2">
                    <input
                        className="input input-bordered flex-1"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={t("sous_pots.name")}
                    />
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input input-bordered"
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

                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            setShowCreate(false)
                            setNewName("")
                            setNewPrevision(0)
                        }}
                    >
                        {t("common.cancel")}
                    </button>
                </div>
            )}

            {/* List of SousPots */}
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
                        />
                    ))}
                </div>
            </SortableContext>
        </div>

        </div>

    )
}
