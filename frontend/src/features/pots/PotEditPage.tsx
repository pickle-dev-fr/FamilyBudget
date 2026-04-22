import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Trash2, Plus } from "lucide-react"
import {
    getPotsAndSubPotsByAccount, reorderPots, updatePot, deletePot,
} from "@/api/pots.api"
import {
    createSubPot, deleteSubPot, reorderSubPots, updateSubPot,
} from "@/api/sub_pots.api"
import type { UIPot, UISubPot } from "./types"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"
import { usePersistedState } from "@/hooks/usePersistedState"
import ConfirmModal from "@/components/layout/ConfirmModal"

export default function PotEditPage() {
    const { potId } = useParams<{ potId: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()

    const [pots, setPots] = useState<UIPot[]>([])
    const pot = pots.find(p => p.id === potId)
    const movablePots = pots.filter(p => p.position !== 0)
    const isDefault = pot?.position === 0

    const accountId = pot?.account_id ?? ""
    const [currentRefMonth] = usePersistedState<{ year: number; month: number } | null>(
        `last_month_${accountId}`, null
    )

    // Pot fields
    const [potName, setPotName] = useState("")
    const [potPosition, setPotPosition] = useState(0)

    // New sub-pot form
    const [showAdd, setShowAdd] = useState(false)
    const [newName, setNewName] = useState("")
    const [newPrevision, setNewPrevision] = useState(0)

    // Confirm delete pot
    const [confirmDeletePot, setConfirmDeletePot] = useState(false)
    const [subPotToDelete, setSubPotToDelete] = useState<string | null>(null)

    // Pre-load with first found accountId from any pot
    const [initAccountId, setInitAccountId] = usePersistedState<string>("last_account_id", "")

    useEffect(() => {
        if (initAccountId) {
            loadWithAccount(initAccountId)
        }
    }, [initAccountId, currentRefMonth])

    useEffect(() => {
        if (pot) {
            setPotName(pot.name)
            setPotPosition(movablePots.findIndex(p => p.id === potId))
        }
    }, [pot?.id])

    async function loadWithAccount(accId: string) {
        const data = await getPotsAndSubPotsByAccount(accId, currentRefMonth?.year, currentRefMonth?.month)
        setPots([...data].sort((a, b) => a.position - b.position))
    }

    async function reload() {
        await loadWithAccount(initAccountId)
    }

    async function handleSavePot() {
        if (!pot || !potName.trim()) return
        await updatePot(pot.id, { name: potName.trim() })
        if (!isDefault) {
            const currentIndex = movablePots.findIndex(p => p.id === potId)
            if (currentIndex !== potPosition) {
                const defaultPot = pots.find(p => p.position === 0)!
                const reordered = [...movablePots]
                const [item] = reordered.splice(currentIndex, 1)
                reordered.splice(potPosition, 0, item)
                await reorderPots({
                    account_id: pot.account_id,
                    ordered_ids: [defaultPot.id, ...reordered.map(p => p.id)],
                })
            }
        }
        await reload()
    }

    async function handleDeletePot() {
        if (!pot || isDefault) return
        await deletePot(pot.id)
        navigate("/pots")
    }

    async function handleAddSubPot() {
        if (!pot || !newName.trim()) return
        await createSubPot(pot.id, { name: newName.trim(), prevision: newPrevision })
        setNewName(""); setNewPrevision(0); setShowAdd(false)
        await reload()
    }

    async function handleSaveSubPot(
        subPotId: string,
        name: string,
        prevision: number,
        newPotId: string,
        newPosition: number
    ) {
        const sourcePot = pots.find(p => p.sub_pots.some(sp => sp.id === subPotId))
        if (!sourcePot) return

        await updateSubPot(subPotId, { name, prevision })

        const originalIndex = sourcePot.sub_pots.findIndex(sp => sp.id === subPotId)
        const moved = newPotId !== sourcePot.id || newPosition !== originalIndex

        if (moved) {
            if (newPotId === sourcePot.id) {
                const reordered = [...sourcePot.sub_pots]
                const [item] = reordered.splice(originalIndex, 1)
                reordered.splice(newPosition, 0, item)
                await reorderSubPots(pot!.account_id, {
                    ancien_pot: { pot_id: sourcePot.id, sub_pot_ids: [] },
                    nouveau_pot: { pot_id: sourcePot.id, sub_pot_ids: reordered.map(sp => sp.id) },
                })
            } else {
                const targetPot = pots.find(p => p.id === newPotId)!
                const sourceRemaining = sourcePot.sub_pots.filter(sp => sp.id !== subPotId)
                const targetNew = [...targetPot.sub_pots]
                const movingSp = sourcePot.sub_pots.find(sp => sp.id === subPotId)!
                targetNew.splice(newPosition, 0, movingSp)
                await reorderSubPots(pot!.account_id, {
                    ancien_pot: { pot_id: sourcePot.id, sub_pot_ids: sourceRemaining.map(sp => sp.id) },
                    nouveau_pot: { pot_id: newPotId, sub_pot_ids: targetNew.map(sp => sp.id) },
                })
                // Navigate to new pot's edit page
                navigate(`/pots/${newPotId}/edit`)
                return
            }
        }
        await reload()
    }

    async function handleDeleteSubPot(subPotId: string) {
        await deleteSubPot(subPotId)
        setSubPotToDelete(null)
        await reload()
    }

    if (!pot) return null

    return (
        <div className="flex flex-col gap-5 max-w-2xl">

            {/* ── En-tête ── */}
            <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => navigate("/pots")}>
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-xl font-semibold flex-1 truncate">{pot.name}</h1>
                {!isDefault && (
                    <button className="btn btn-ghost btn-sm text-error gap-1.5" onClick={() => setConfirmDeletePot(true)}>
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">{t("common.delete")}</span>
                    </button>
                )}
            </div>

            {/* ── Modifier le pot ── */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                    {t("pots.section_pot")}
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1 flex-1 min-w-40">
                        <label className="text-sm font-medium text-base-content/60">{t("accounts.name")}</label>
                        <input
                            className="input input-bordered input-sm"
                            value={potName}
                            onChange={e => setPotName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSavePot()}
                        />
                    </div>
                    {!isDefault && movablePots.length > 1 && (
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-base-content/60">{t("pots.position")}</label>
                            <select
                                className="select select-bordered select-sm w-32"
                                value={potPosition}
                                onChange={e => setPotPosition(Number(e.target.value))}
                            >
                                {movablePots.map((_, i) => (
                                    <option key={i} value={i}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={handleSavePot}>
                        {t("common.save")}
                    </button>
                </div>
            </div>

            {/* ── Sous-pots ── */}
            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
                    <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                        {t("pots.section_subpots")}
                    </p>
                    {!isDefault && (
                        <button className="btn btn-ghost btn-xs text-primary gap-1" onClick={() => setShowAdd(true)}>
                            <Plus size={13} />{t("sub_pots.add")}
                        </button>
                    )}
                </div>

                {/* Formulaire ajout */}
                {showAdd && (
                    <div className="px-4 py-3 border-b border-base-300 bg-base-200/30 flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1 flex-1 min-w-32">
                            <label className="text-xs font-medium text-base-content/50">{t("sub_pots.name")}</label>
                            <input
                                className="input input-bordered input-sm"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAddSubPot()}
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-base-content/50">{t("sub_pots.prevision")}</label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number" min={0} step="0.01"
                                    className="input input-bordered input-sm w-28"
                                    value={newPrevision}
                                    onChange={e => setNewPrevision(Number(e.target.value))}
                                    placeholder="0"
                                />
                                <span className="text-sm text-base-content/40">{currencySymbol}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button className="btn btn-primary btn-sm" onClick={handleAddSubPot}>{t("common.create")}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setNewName(""); setNewPrevision(0) }}>{t("common.cancel")}</button>
                        </div>
                    </div>
                )}

                {/* Liste */}
                {pot.sub_pots.length === 0 && !showAdd ? (
                    <p className="text-center text-sm text-base-content/35 py-8">{t("pots.empty_subpots")}</p>
                ) : (
                    <div className="divide-y divide-base-300/40">
                        {pot.sub_pots.map(sp => (
                            <SubPotEditRow
                                key={sp.id}
                                subPot={sp}
                                currentPot={pot}
                                allMovablePots={movablePots}
                                isInDefaultPot={isDefault}
                                currencySymbol={currencySymbol}
                                onSave={handleSaveSubPot}
                                onRequestDelete={setSubPotToDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modales confirmation */}
            <ConfirmModal
                open={confirmDeletePot}
                title={t("common.confirm")}
                message={t("pots.delete_confirm")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleDeletePot}
                onCancel={() => setConfirmDeletePot(false)}
            />
            <ConfirmModal
                open={!!subPotToDelete}
                title={t("common.confirm")}
                message={t("pots.delete_subpot_confirm")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                onConfirm={() => subPotToDelete && handleDeleteSubPot(subPotToDelete)}
                onCancel={() => setSubPotToDelete(null)}
            />
        </div>
    )
}

/* ── Ligne d'édition d'un sous-pot ─────────────────────── */

type SubPotRowProps = {
    subPot: UISubPot
    currentPot: UIPot
    allMovablePots: UIPot[]
    isInDefaultPot: boolean
    currencySymbol: string
    onSave: (id: string, name: string, prevision: number, newPotId: string, newPosition: number) => Promise<void>
    onRequestDelete: (id: string) => void
}

function SubPotEditRow({ subPot, currentPot, allMovablePots, isInDefaultPot, currencySymbol, onSave, onRequestDelete }: SubPotRowProps) {
    const { t } = useTranslation()
    const [name, setName] = useState(subPot.name)
    const [prevision, setPrevision] = useState(subPot.prevision)
    const [potId, setPotId] = useState(subPot.pot_id)

    const originalIndex = currentPot.sub_pots.findIndex(sp => sp.id === subPot.id)
    const [position, setPosition] = useState(originalIndex)

    // Sync position après reload (l'ordre a pu changer côté serveur)
    const prevOriginalIndex = useRef(originalIndex)
    useEffect(() => {
        if (prevOriginalIndex.current !== originalIndex) {
            setPosition(originalIndex)
            prevOriginalIndex.current = originalIndex
        }
    }, [originalIndex])

    const targetPot = allMovablePots.find(p => p.id === potId) ?? currentPot
    const positionCount = potId === currentPot.id
        ? currentPot.sub_pots.length
        : targetPot.sub_pots.length + 1

    const current = subPot.current ?? 0
    const pct = subPot.prevision > 0 ? (current / subPot.prevision) * 100 : current ? 100 : 0
    const pctColor = pct > 100 ? "text-error" : pct >= 80 ? "text-warning" : "text-success"
    const barColor = pct > 100 ? "bg-error" : pct >= 80 ? "bg-warning" : "bg-success"

    const isDirty = name !== subPot.name || prevision !== subPot.prevision
        || potId !== subPot.pot_id || position !== originalIndex

    return (
        <div className="px-4 py-4 flex flex-col gap-3">
            {/* Ligne stats */}
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-base-content/45 mb-1">
                        <span className="font-medium text-sm text-base-content/70">{subPot.name}</span>
                        <span className={`font-semibold tabular-nums ${pctColor}`}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-base-300/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-base-content/40 tabular-nums mt-0.5">
                        {formatAmount(current)} / {formatAmount(subPot.prevision)} {currencySymbol}
                    </p>
                </div>
                {!isInDefaultPot && (
                    <button className="btn btn-ghost btn-xs btn-square text-error/60 hover:text-error shrink-0" onClick={() => onRequestDelete(subPot.id)}>
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Formulaire */}
            <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1 min-w-28">
                    <label className="text-xs font-medium text-base-content/50">{t("sub_pots.name")}</label>
                    <input
                        className="input input-bordered input-sm"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-base-content/50">{t("sub_pots.prevision")}</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number" min={0} step="0.01"
                            className="input input-bordered input-sm w-24"
                            value={prevision}
                            onChange={e => setPrevision(Number(e.target.value))}
                        />
                        <span className="text-xs text-base-content/40">{currencySymbol}</span>
                    </div>
                </div>
                {!isInDefaultPot && allMovablePots.length > 1 && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-base-content/50">{t("pots.name")}</label>
                        <select
                            className="select select-bordered select-sm min-w-28"
                            value={potId}
                            onChange={e => { setPotId(e.target.value); setPosition(0) }}
                        >
                            {allMovablePots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                {!isInDefaultPot && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-base-content/50">{t("pots.position")}</label>
                        <select
                            className="select select-bordered select-sm w-24"
                            value={position}
                            onChange={e => setPosition(Number(e.target.value))}
                        >
                            {Array.from({ length: positionCount }, (_, i) => (
                                <option key={i} value={i}>{i + 1}</option>
                            ))}
                        </select>
                    </div>
                )}
                {isDirty && (
                    <button
                        className="btn btn-primary btn-sm self-end"
                        onClick={() => onSave(subPot.id, name.trim(), prevision, potId, position)}
                    >
                        {t("common.save")}
                    </button>
                )}
            </div>
        </div>
    )
}
