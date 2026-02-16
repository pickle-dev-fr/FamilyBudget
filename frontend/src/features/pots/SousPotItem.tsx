import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UISousPot } from "./types"
import { useState } from "react"

type Props = {
    sousPot: UISousPot
    disabled?: boolean
    onDelete?: (sousPotId: string) => void
}

export default function SousPotItem({
    sousPot,
    disabled,
    onDelete
}: Props) {

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
        disabled,
    })

    const current = sousPot.current ?? 0

    const percentage =
        sousPot.prevision > 0
            ? (current / sousPot.prevision) * 100
            : 0

    const clamped = Math.min(percentage, 100)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: "#1e1e1e",
        borderRadius: 6,
        opacity: disabled ? 0.5 : isDragging ? 0 : 1,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "24px 2fr 1fr 1fr 1fr 32px",
                    alignItems: "center",
                    fontSize: 14,
                    color: "white",
                    gap: 8,
                }}
            >
                {/* Drag handle uniquement ici */}
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: disabled ? "not-allowed" : "grab",
                        opacity: 0.6,
                        userSelect: "none",
                    }}
                >
                    ⋮
                </div>

                <div>{sousPot.name}</div>

                <div style={{ textAlign: "right" }}>
                    {sousPot.prevision}
                </div>

                <div style={{ textAlign: "right" }}>
                    {current}
                </div>

                <div style={{ textAlign: "right" }}>
                    {percentage.toFixed(0)}%
                </div>

                {/* Colonne actions */}
                <div style={{ textAlign: "right" }}>
                    <SousPotActionsMenu
                        onDelete={() => onDelete?.(sousPot.id)}
                    />
                </div>
            </div>

            <div
                style={{
                    height: 6,
                    background: "#333",
                    borderRadius: 4,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${clamped}%`,
                        height: "100%",
                        background:
                            percentage > 100
                                ? "#e53935"
                                : percentage > 80
                                ? "#fb8c00"
                                : "#4caf50",
                        transition: "width 0.2s ease",
                    }}
                />
            </div>
        </div>
    )
}

function SousPotActionsMenu({
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

