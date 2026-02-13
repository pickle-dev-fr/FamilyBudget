import { useEffect, useRef, useState } from "react"
import {
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    DragOverlay,
    rectIntersection,
} from "@dnd-kit/core"
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getComptes } from "@/api/comptes.api"
import {
    getPotsAndSousPotsByCompte,
    reorderPots,
} from "@/api/pots.api"
import {
    reorderSousPots,
    type SousPot,
} from "@/api/sous_pots.api"

type UIPot = {
    id: string
    name: string
    compte_id: string
    position: number
    sous_pots: SousPot[]
}

export default function PotsBoard() {
    const [pots, setPots] = useState<UIPot[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeType, setActiveType] = useState<"pot" | "souspot" | null>(null)
    const initialStateRef = useRef<UIPot[]>([])

    /* ============================= */
    /* ========= LOAD ============== */
    /* ============================= */

    useEffect(() => {
        async function load() {
            const comptes = await getComptes()
            if (!comptes.length) return

            const data = await getPotsAndSousPotsByCompte(comptes[0].id)

            const sorted = [...data].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }

        load()
    }, [])

    /* ============================= */
    /* ========= DRAG CORE ========= */
    /* ============================= */

    function handleDragStart(event: DragStartEvent) {
        initialStateRef.current = structuredClone(pots)
        setActiveId(event.active.id as string)
        setActiveType(event.active.data.current?.type)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        // ==========================
        // REORDER POTS
        // ==========================
        if (active.data.current?.type === "pot") {
            setPots(prev => {
                const oldIndex = prev.findIndex(p => p.id === active.id)
                const newIndex = prev.findIndex(p => p.id === over.id)

                if (oldIndex === -1 || newIndex === -1) return prev
                if (oldIndex === newIndex) return prev

                const moved = arrayMove(prev, oldIndex, newIndex)

                // recalcul propre des positions
                return moved.map((p, index) => ({
                    ...p,
                    position: index,
                }))
            })

            return
        }

        // ==========================
        // SOUS POTS
        // ==========================

        setPots(prev => {
            const activePotId = active.data.current!.potId
            const overPotId =
                over.data.current?.type === "souspot"
                    ? over.data.current.potId
                    : over.id

            const targetPot = prev.find(p => p.id === overPotId)
            if (!targetPot || targetPot.position === 0) return prev

            if (activePotId === overPotId) {
                return prev.map(p => {
                    if (p.id !== activePotId) return p
                    const oldIndex = p.sous_pots.findIndex(sp => sp.id === active.id)
                    const newIndex = p.sous_pots.findIndex(sp => sp.id === over.id)
                    if (oldIndex === newIndex) return p
                    return {
                        ...p,
                        sous_pots: arrayMove(p.sous_pots, oldIndex, newIndex),
                    }
                })
            }

            const source = prev.find(p => p.id === activePotId)
            if (!source) return prev

            const moving = source.sous_pots.find(sp => sp.id === active.id)
            if (!moving) return prev

            return prev.map(p => {
                if (p.id === activePotId) {
                    return {
                        ...p,
                        sous_pots: p.sous_pots.filter(sp => sp.id !== active.id),
                    }
                }

                if (p.id === overPotId) {
                    const index = p.sous_pots.findIndex(sp => sp.id === over.id)
                    const insertIndex = index < 0 ? p.sous_pots.length : index
                    return {
                        ...p,
                        sous_pots: [
                            ...p.sous_pots.slice(0, insertIndex),
                            { ...moving, pot_id: overPotId },
                            ...p.sous_pots.slice(insertIndex),
                        ],
                    }
                }

                return p
            })
        })
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) {
            setPots(initialStateRef.current)
            reset()
            return
        }

        const comptes = await getComptes()
        if (!comptes.length) return
        const selectedCompteId = comptes[0].id

        try {
            if (active.data.current?.type === "pot") {
                const firstPot = pots[0]

                // Si le pot en position 0 n'est plus le défaut → rollback
                if (firstPot.position !== 0) {
                    setPots(initialStateRef.current)
                    reset()
                    return
                }

                // sécurité supplémentaire : vérifier que le défaut est toujours en index 0
                const defaultPotBefore = initialStateRef.current.find(p => p.position === 0)
                if (!defaultPotBefore || pots[0].id !== defaultPotBefore.id) {
                    setPots(initialStateRef.current)
                    reset()
                    return
                }

                const orderedIds = pots.map(p => p.id)

                await reorderPots({
                    compte_id: selectedCompteId,
                    ordered_ids: orderedIds,
                })
            }


            if (active.data.current?.type === "souspot") {
                const before = initialStateRef.current
                const after = pots

                const activePotBefore = before.find(p =>
                    p.sous_pots.some(sp => sp.id === active.id)
                )

                const activePotAfter = after.find(p =>
                    p.sous_pots.some(sp => sp.id === active.id)
                )

                if (!activePotBefore || !activePotAfter) return

                await reorderSousPots(selectedCompteId, {
                    ancien_pot: {
                        pot_id: activePotBefore.id,
                        sous_pot_ids: activePotBefore.id !== activePotAfter.id ? activePotBefore.sous_pots.map(sp => sp.id) : [],
                    },
                    nouveau_pot: {
                        pot_id: activePotAfter.id,
                        sous_pot_ids: activePotAfter.sous_pots.map(sp => sp.id),
                    },
                })
            }
        } catch {
            setPots(initialStateRef.current)
        }

        reset()
    }

    function reset() {
        setActiveId(null)
        setActiveType(null)
    }

    function getActiveLabel(): string {
    if (!activeId) return ""

    if (activeType === "pot") {
        const pot = pots.find(p => p.id === activeId)
        return pot?.name ?? ""
    }

    if (activeType === "souspot") {
        for (const pot of pots) {
            const sp = pot.sous_pots.find(s => s.id === activeId)
            if (sp) return sp.name
        }
    }

    return ""
}


    /* ============================= */
    /* ========= RENDER ============ */
    /* ============================= */

    return (
        <DndContext
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={pots.map(p => p.id)}
                strategy={verticalListSortingStrategy}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {pots.map(pot => (
                        <PotColumn key={pot.id} pot={pot} />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeId && (
                    <div
                        style={{
                            padding: 12,
                            background: "#333",
                            color: "white",
                            borderRadius: 6,
                        }}
                    >
                        {getActiveLabel()}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}

/* ============================= */
/* ========= POT COLUMN ======== */
/* ============================= */

function PotColumn({ pot }: { pot: UIPot }) {
    const disabled = pot.position === 0

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

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <h3 style={{ color: "white" }}>{pot.name}</h3>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#888",
                    padding: "8px 12px",
                }}
            >
                <div>Nom</div>
                <div style={{ textAlign: "right" }}>Prévision</div>
                <div style={{ textAlign: "right" }}>Actuel</div>
                <div style={{ textAlign: "right" }}>%</div>
            </div>

            <SortableContext
                items={pot.sous_pots.map(sp => sp.id)}
                strategy={verticalListSortingStrategy}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {pot.sous_pots.map(sp => (
                        <SousPotItem
                            key={sp.id}
                            sousPot={sp}
                            disabled={pot.position === 0}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    )
}

/* ============================= */
/* ========= SOUSPOT =========== */
/* ============================= */

function SousPotItem({
    sousPot,
    disabled,
}: {
    sousPot: SousPot
    disabled?: boolean
}) {
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

    const percentage =
        sousPot.prevision > 0
            ? (sousPot.current / sousPot.prevision) * 100
            : 0

    const clamped = Math.min(percentage, 100)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: "#1e1e1e",
        borderRadius: 6,
        opacity: disabled ? 0.5 : isDragging ? 0 : 1,
        cursor: disabled ? "not-allowed" : "grab",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {/* Ligne principale */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    alignItems: "center",
                    fontSize: 14,
                    color: "white",
                }}
            >
                <div>{sousPot.name}</div>

                <div style={{ textAlign: "right" }}>
                    {sousPot.prevision}
                </div>

                <div style={{ textAlign: "right" }}>
                    {sousPot.current}
                </div>

                <div style={{ textAlign: "right" }}>
                    {percentage.toFixed(0)}%
                </div>
            </div>

            {/* Barre de progression */}
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


