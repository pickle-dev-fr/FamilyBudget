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
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { deletePot, getPotsAndSousPotsByCompte, reorderPots } from "@/api/pots.api"
import { createSousPot, deleteSousPot, reorderSousPots } from "@/api/sous_pots.api"

import PotColumn from "./PotColumn"
import type { UIPot, UISousPot } from "./types"
import { generateTempId, getActiveLabel, } from "./utils"


type Props = {
    compteId: string
    refreshKey?: number
}

export default function PotsBoard({ compteId, refreshKey }: Props) {


    const [pots, setPots] = useState<UIPot[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeType, setActiveType] = useState<"pot" | "souspot" | null>(null)
    const initialStateRef = useRef<UIPot[]>([])

    useEffect(() => {
        if (!compteId) return

        async function load() {
            const data = await getPotsAndSousPotsByCompte(compteId)

            const sorted = [...data].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }

        load()
    }, [compteId, refreshKey])



    function handleDragStart(event: DragStartEvent) {
        initialStateRef.current = structuredClone(pots)
        setActiveId(event.active.id as string)
        setActiveType(event.active.data.current?.type)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        if (active.data.current?.type === "pot") {
            setPots(prev => {
                const oldIndex = prev.findIndex(p => p.id === active.id)
                const newIndex = prev.findIndex(p => p.id === over.id)

                if (oldIndex === -1 || newIndex === -1) return prev
                if (oldIndex === newIndex) return prev

                const moved = arrayMove(prev, oldIndex, newIndex)

                return moved.map((p, index) => ({
                    ...p,
                    position: index,
                }))
            })
            return
        }

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

        const selectedCompteId = compteId

        try {
            if (active.data.current?.type === "pot") {
                const defaultPotBefore = initialStateRef.current.find(p => p.position === 0)
                if (!defaultPotBefore || pots[0].id !== defaultPotBefore.id) {
                    setPots(initialStateRef.current)
                    reset()
                    return
                }

                await reorderPots({
                    compte_id: selectedCompteId,
                    ordered_ids: pots.map(p => p.id),
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
                        sous_pot_ids:
                            activePotBefore.id !== activePotAfter.id
                                ? activePotBefore.sous_pots.map(sp => sp.id)
                                : [],
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

    function handleAddSousPot(potId: string, name: string) {
        setPots(prev =>
            prev.map(p => {
                if (p.id !== potId) return p

                const newSousPot: UISousPot = {
                    id: generateTempId(),
                    name,
                    pot_id: potId,
                    prevision: 0,
                    current: 0,
                    position: p.sous_pots.length,
                    __isNew: true,
                }

                return {
                    ...p,
                    sous_pots: [...p.sous_pots, newSousPot],
                }
            })
        )
    }
    
    async function handleDeleteSousPot(
        sousPotId: string
    ) {
        if (!compteId) return

        try {
            await deleteSousPot(sousPotId)

            const refreshed =
                await getPotsAndSousPotsByCompte(compteId)

            const sorted = [...refreshed].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)

        } catch {
            // fallback reload
            const fallback =
                await getPotsAndSousPotsByCompte(compteId)

            const sorted = [...fallback].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }
    }

    async function handleDeletePot(potId: string) {
        if (!compteId) return

        const pot = pots.find(p => p.id === potId)
        if (!pot) return

        // sécurité : pot par défaut interdit
        if (pot.position === 0) return

        try {
            await deletePot(potId)

            const refreshed =
                await getPotsAndSousPotsByCompte(compteId)

            const sorted = [...refreshed].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)

        } catch {
            const fallback =
                await getPotsAndSousPotsByCompte(compteId)

            const sorted = [...fallback].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }
    }

    async function handlePersistNewSousPot(
        potId: string,
        name: string,
        prevision: number
    ) {
        if (!compteId) return

        try {
            // 1️⃣ CREATE (backend → ajouté en dernière position)
            await createSousPot(potId, {
                name,
                prevision,
            })

            // 2️⃣ Reload après création
            const dataAfterCreate =
                await getPotsAndSousPotsByCompte(compteId)

            const sortedAfterCreate = [...dataAfterCreate].sort(
                (a, b) => a.position - b.position
            )

            const updatedPot = sortedAfterCreate.find(
                p => p.id === potId
            )

            if (!updatedPot) return

            const sousPots = [...updatedPot.sous_pots]

            if (sousPots.length > 1) {
                // déplacer dernier en première position
                const last = sousPots.pop()!
                sousPots.unshift(last)

                await reorderSousPots(compteId, {
                    ancien_pot: {
                        pot_id: potId,
                        sous_pot_ids: [],
                    },
                    nouveau_pot: {
                        pot_id: potId,
                        sous_pot_ids: sousPots.map(sp => sp.id),
                    },
                })
            }

            // 3️⃣ Reload final propre
            const finalData =
                await getPotsAndSousPotsByCompte(compteId)

            const finalSorted = [...finalData].sort(
                (a, b) => a.position - b.position
            )

            setPots(finalSorted)

        } catch {
            // Optionnel : reload pour reset propre
            const fallback =
                await getPotsAndSousPotsByCompte(compteId)

            const sortedFallback = [...fallback].sort(
                (a, b) => a.position - b.position
            )

            setPots(sortedFallback)
        }
    }

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
                        <PotColumn
                            key={pot.id}
                            pot={pot}
                            onAddSousPot={handleAddSousPot}
                            onPersistSousPot={handlePersistNewSousPot}
                            onDeleteSousPot={handleDeleteSousPot}
                            onDeletePot={handleDeletePot}
                        />

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
                        {getActiveLabel(pots, activeId, activeType)}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}

