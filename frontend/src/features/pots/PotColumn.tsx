import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UIPot } from "./types"
import SousPotItem from "./SousPotItem"
import { useState } from "react"

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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: "#1e1e1e",
        padding: 16,
        borderRadius: 8,
        opacity: isDragging ? 0 : 1,
        cursor: disabled ? "not-allowed" : "grab",
    }

    const iconButtonStyle = {
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: "#2a2a2a",
        color: "white",
        cursor: "pointer",
    }

    return (
        <div ref={setNodeRef} style={style}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                }}
            >
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: disabled ? "not-allowed" : "grab",
                        fontWeight: 600,
                        color: "white",
                    }}
                >
                    <span>☰</span>
                    {pot.name}
                </div>

                {!disabled && (
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowCreate(true)
                            }}
                            style={iconButtonStyle}
                        >
                            +
                        </button>

                        <PotActionsMenu
                            onDelete={() => onDeletePot(pot.id)}
                        />
                    </div>
                )}
            </div>


            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "24px 2fr 1fr 1fr 1fr 40px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#888",
                    padding: "8px 12px",
                }}
            >

            <div />
            <div>Nom</div>
            <div style={{ textAlign: "right" }}>Prévision</div>
            <div style={{ textAlign: "right" }}>Actuel</div>
            <div style={{ textAlign: "right" }}>%</div>
            <div style={{ textAlign: "right" }}>Actions</div>

            </div>
            {showCreate && (
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nom du sous-pot"
                        style={{
                            padding: 6,
                            background: "#1e1e1e",
                            color: "white",
                            borderRadius: 6,
                            border: "1px solid #333",
                            flex: 1,
                        }}
                    />

                    <button
                        onClick={async () => {
                            const trimmed = newName.trim()
                            if (!trimmed) return

                            // 1️⃣ Ajout local immédiat
                            onAddSousPot(pot.id, trimmed)

                            setNewName("")
                            setShowCreate(false)

                            // 2️⃣ Persistance backend directe (sans dépendre du state)
                            await onPersistSousPot(pot.id, trimmed, 0)
                        }}


                        style={{
                            background: "#4caf50",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        OK
                    </button>

                    <button
                        onClick={() => {
                            setShowCreate(false)
                            setNewName("")
                        }}
                        style={{
                            background: "#555",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        X
                    </button>
                </div>
            )}


            <SortableContext
                items={pot.sous_pots.map(sp => sp.id)}
                strategy={verticalListSortingStrategy}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    )
}

function PotActionsMenu({
    onDelete,
}: {
    onDelete: () => void
}) {
    const [open, setOpen] = useState(false)

    const menuItemStyle = {
        padding: "6px 10px",
        cursor: "pointer",
        borderRadius: 4,
        color: "white",
    }

    const iconButtonStyle = {
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: "#2a2a2a",
        color: "white",
        cursor: "pointer",
    }


    return (
        <div style={{ position: "relative" }}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen(prev => !prev)
                }}
                style={iconButtonStyle}
            >
                ⋯
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 32,
                        background: "#2a2a2a",
                        borderRadius: 6,
                        padding: 6,
                        minWidth: 120,
                        zIndex: 10,
                    }}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                            setOpen(false)
                        }}
                        style={menuItemStyle}
                    >
                        Supprimer
                    </div>
                </div>
            )}
        </div>
    )
}
