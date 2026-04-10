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

import { deletePot, getPotsAndSubPotsByAccount, reorderPots, updatePot, type UpdatePotPayload } from "@/api/pots.api"
import { createSubPot, deleteSubPot, reorderSubPots, updateSubPot, type UpdateSubPotPayload } from "@/api/sub_pots.api"

import PotColumn from "./PotColumn"
import type { UIPot, UISubPot } from "./types"
import { generateTempId, getActiveLabel, } from "./utils"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"


type Props = {
    accountId: string
    refreshKey?: number
    year?: number
    month?: number
}

export default function PotsBoard({ accountId, refreshKey, year, month }: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()

    const [pots, setPots] = useState<UIPot[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeType, setActiveType] = useState<"pot" | "subpot" | null>(null)
    const initialStateRef = useRef<UIPot[]>([])
    const defaultPot = pots.find(p => p.position === 0)
    const movablePots = pots.filter(p => p.position !== 0)

    const allSubPots = pots.flatMap(p => p.sub_pots)
    const totalPrevision = Math.round(allSubPots.reduce((acc, sp) => acc + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent = Math.round(allSubPots.reduce((acc, sp) => acc + (sp.current ?? 0), 0) * 100) / 100
    const totalRemaining = Math.round((totalPrevision - totalCurrent) * 100) / 100

    useEffect(() => {
        if (!accountId) return

        async function load() {
            const data = await getPotsAndSubPotsByAccount(accountId, year, month)

            const sorted = [...data].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }

        load()
    }, [accountId, refreshKey, year, month])



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
                const defaultPot = prev.find(p => p.position === 0)
                const movable = prev.filter(p => p.position !== 0)

                const oldIndex = movable.findIndex(p => p.id === active.id)
                const newIndex = movable.findIndex(p => p.id === over.id)

                if (oldIndex === -1 || newIndex === -1) return prev
                if (oldIndex === newIndex) return prev

                const reordered = arrayMove(movable, oldIndex, newIndex)

                return [
                    defaultPot!,
                    ...reordered.map((p, index) => ({
                        ...p,
                        position: index + 1,
                    })),
                ]
            })

            return
        }

        setPots(prev => {
            const activePotId = active.data.current!.potId
            const overPotId =
                over.data.current?.type === "subpot"
                    ? over.data.current.potId
                    : over.id

            const targetPot = prev.find(p => p.id === overPotId)
            if (!targetPot || targetPot.position === 0) return prev

            if (activePotId === overPotId) {
                return prev.map(p => {
                    if (p.id !== activePotId) return p
                    const oldIndex = p.sub_pots.findIndex(sp => sp.id === active.id)
                    const newIndex = p.sub_pots.findIndex(sp => sp.id === over.id)
                    if (oldIndex === newIndex) return p
                    return {
                        ...p,
                        sub_pots: arrayMove(p.sub_pots, oldIndex, newIndex),
                    }
                })
            }

            const source = prev.find(p => p.id === activePotId)
            if (!source) return prev

            const moving = source.sub_pots.find(sp => sp.id === active.id)
            if (!moving) return prev

            return prev.map(p => {
                if (p.id === activePotId) {
                    return {
                        ...p,
                        sub_pots: p.sub_pots.filter(sp => sp.id !== active.id),
                    }
                }

                if (p.id === overPotId) {
                    const index = p.sub_pots.findIndex(sp => sp.id === over.id)
                    const insertIndex = index < 0 ? p.sub_pots.length : index
                    return {
                        ...p,
                        sub_pots: [
                            ...p.sub_pots.slice(0, insertIndex),
                            { ...moving, pot_id: overPotId },
                            ...p.sub_pots.slice(insertIndex),
                        ],
                    }
                }

                return p
            })
        })
    }

    async function reloadPots() {
        if (!accountId) return

        const data = await getPotsAndSubPotsByAccount(accountId, year, month)

        const sorted = [...data].sort(
            (a, b) => a.position - b.position
        )

        setPots(sorted)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) {
            setPots(initialStateRef.current)
            reset()
            return
        }

        const selectedAccountId = accountId

        try {
            if (active.data.current?.type === "pot") {
                const defaultPotBefore = initialStateRef.current.find(p => p.position === 0)
                if (!defaultPotBefore || pots[0].id !== defaultPotBefore.id) {
                    setPots(initialStateRef.current)
                    reset()
                    return
                }

                await reorderPots({
                    account_id: selectedAccountId,
                    ordered_ids: pots.map(p => p.id),
                })
            }

            if (active.data.current?.type === "subpot") {
                const before = initialStateRef.current
                const after = pots

                const activePotBefore = before.find(p =>
                    p.sub_pots.some(sp => sp.id === active.id)
                )

                const activePotAfter = after.find(p =>
                    p.sub_pots.some(sp => sp.id === active.id)
                )

                if (!activePotBefore || !activePotAfter) return

                await reorderSubPots(selectedAccountId, {
                    ancien_pot: {
                        pot_id: activePotBefore.id,
                        sub_pot_ids:
                            activePotBefore.id !== activePotAfter.id
                                ? activePotBefore.sub_pots.map(sp => sp.id)
                                : [],
                    },
                    nouveau_pot: {
                        pot_id: activePotAfter.id,
                        sub_pot_ids: activePotAfter.sub_pots.map(sp => sp.id),
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

    function handleAddSubPot(potId: string, name: string) {
        setPots(prev =>
            prev.map(p => {
                if (p.id !== potId) return p

                const newSubPot: UISubPot = {
                    id: generateTempId(),
                    name,
                    pot_id: potId,
                    prevision: 0,
                    current: 0,
                    position: p.sub_pots.length,
                    __isNew: true,
                }

                return {
                    ...p,
                    sub_pots: [...p.sub_pots, newSubPot],
                }
            })
        )
    }
    
    async function handleDeleteSubPot(
        subPotId: string
    ) {
        if (!accountId) return

        try {
            await deleteSubPot(subPotId)

            await reloadPots()

        } catch {
            // fallback reload
            const fallback =
                await getPotsAndSubPotsByAccount(accountId, year, month)

            const sorted = [...fallback].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }
    }

    async function handleDeletePot(potId: string) {
        if (!accountId) return

        const pot = pots.find(p => p.id === potId)
        if (!pot) return

        // sécurité : pot par défaut interdit
        if (pot.position === 0) return

        try {
            await deletePot(potId)

            await reloadPots()

        } catch {
            const fallback =
                await getPotsAndSubPotsByAccount(accountId, year, month)

            const sorted = [...fallback].sort(
                (a, b) => a.position - b.position
            )

            setPots(sorted)
        }
    }

    async function handlePersistNewSubPot(
        potId: string,
        name: string,
        prevision: number
    ) {
        if (!accountId) return

        try {
            // CREATE (backend → ajouté en dernière position)
            await createSubPot(potId, {
                name,
                prevision,
            })

            // Reload après création
            const dataAfterCreate =
                await getPotsAndSubPotsByAccount(accountId, year, month)

            const sortedAfterCreate = [...dataAfterCreate].sort(
                (a, b) => a.position - b.position
            )

            const updatedPot = sortedAfterCreate.find(
                p => p.id === potId
            )

            if (!updatedPot) return

            const subPots = [...updatedPot.sub_pots]

            if (subPots.length > 1) {
                // déplacer dernier en première position
                const last = subPots.pop()!
                subPots.unshift(last)

                await reorderSubPots(accountId, {
                    ancien_pot: {
                        pot_id: potId,
                        sub_pot_ids: [],
                    },
                    nouveau_pot: {
                        pot_id: potId,
                        sub_pot_ids: subPots.map(sp => sp.id),
                    },
                })
            }

            // Reload final propre
            await reloadPots()

        } catch {
            await reloadPots()
        }
    }
    
    async function handleUpdateSubPot(
        subPotId: string,
        payload: UpdateSubPotPayload
    ) {
        if (!accountId) return

        try {
            await updateSubPot(subPotId, payload)
            await reloadPots()
        } catch {
            await reloadPots()
        }
    }

    async function handleUpdatePot(
        potId: string,
        payload: UpdatePotPayload
    ) {
        if (!accountId) return

        try {
            await updatePot(potId, payload)
            await reloadPots()
        } catch {
            await reloadPots()
        }
    }

    return (
        <DndContext
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-4 pots-list">

                {/* Récapitulatif total */}
                {pots.length > 0 && (
                    <div className="card bg-base-200 border border-base-300 rounded-lg px-4 py-3 flex flex-row gap-6 text-sm">
                        <span>
                            <span className="opacity-60">{t("pots.prevision")} </span>
                            <span className="font-semibold">{formatAmount(totalPrevision)} {currencySymbol}</span>
                        </span>
                        <span>
                            <span className="opacity-60">{t("pots.current")} </span>
                            <span className="font-semibold">{formatAmount(totalCurrent)} {currencySymbol}</span>
                        </span>
                        <span>
                            <span className="opacity-60">{t("pots.reste")} </span>
                            <span className={`font-semibold ${totalRemaining < 0 ? "text-error" : ""}`}>
                                {formatAmount(totalRemaining)} {currencySymbol}
                            </span>
                        </span>
                    </div>
                )}

                {/* Default fixe (hors SortableContext) */}
                {defaultPot && (
                    <PotColumn
                        key={defaultPot.id}
                        pot={defaultPot}
                        onAddSubPot={handleAddSubPot}
                        onPersistSubPot={handlePersistNewSubPot}
                        onUpdateSubPot={handleUpdateSubPot}
                        onUpdatePot={handleUpdatePot}
                        onDeleteSubPot={handleDeleteSubPot}
                        onDeletePot={handleDeletePot}
                    />
                )}

                {/* Pots déplaçables uniquement */}
                <SortableContext
                    items={movablePots.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {movablePots.map(pot => (
                        <PotColumn
                            key={pot.id}
                            pot={pot}
                            onAddSubPot={handleAddSubPot}
                            onPersistSubPot={handlePersistNewSubPot}
                            onUpdateSubPot={handleUpdateSubPot}
                            onUpdatePot={handleUpdatePot}
                            onDeleteSubPot={handleDeleteSubPot}
                            onDeletePot={handleDeletePot}
                        />
                    ))}
                </SortableContext>

</div>

            <DragOverlay className="pointer-events-none">
                {activeId && (
                    <div
                        className="
                            bg-base-100
                            border-2 border-primary
                            shadow-2xl
                            rounded-lg
                            p-4
                            opacity-100
                            scale-105
                        "
                    >
                        {getActiveLabel(pots, activeId, activeType)}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}
