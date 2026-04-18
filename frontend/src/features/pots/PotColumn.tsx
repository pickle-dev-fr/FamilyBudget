import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { UIPot } from "./types"
import { useTranslation } from "react-i18next"
import { useCurrency } from "@/auth/currency"
import { formatAmount } from "@/utils"
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react"

type Props = {
    pot: UIPot
    onRequestDelete: (potId: string) => void
}

export default function PotColumn({ pot, onRequestDelete }: Props) {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const navigate = useNavigate()
    const isDefault = pot.position === 0
    const [collapsed, setCollapsed] = useState(false)

    const totalPrevision = Math.round(pot.sub_pots.reduce((s, sp) => s + (sp.prevision ?? 0), 0) * 100) / 100
    const totalCurrent   = Math.round(pot.sub_pots.reduce((s, sp) => s + (sp.current  ?? 0), 0) * 100) / 100
    const remaining      = Math.round((totalPrevision - totalCurrent) * 100) / 100
    const percentage     = totalPrevision > 0 ? (totalCurrent / totalPrevision) * 100 : totalCurrent > 0 ? 100 : 0
    const progressColor  = percentage > 100 ? "bg-error" : percentage >= 80 ? "bg-warning" : "bg-success"

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl">
            {/* ── En-tête ── */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                {/* Chevron collapse pour pot défaut */}
                {isDefault && (
                    <button
                        className="btn btn-ghost btn-xs btn-square text-base-content/35"
                        onClick={() => setCollapsed(v => !v)}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
                <span className="font-semibold text-sm flex-1 min-w-0 truncate">{pot.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {!isDefault && (
                        <button
                            className="btn btn-ghost btn-xs gap-1.5 text-base-content/50 hover:text-primary"
                            onClick={() => navigate(`/pots/${pot.id}/edit`)}
                        >
                            <Pencil size={13} />
                            <span className="text-xs">{t("common.edit")}</span>
                        </button>
                    )}
                    {!isDefault && (
                        <button
                            className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error"
                            onClick={() => onRequestDelete(pot.id)}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Contenu (masqué si replié) ── */}
            {!collapsed && <>
                <div className="px-4 pb-3">
                    <div className="flex items-center justify-between text-xs text-base-content/45 mb-1">
                        <span className="tabular-nums">
                            {formatAmount(totalCurrent)}
                            <span className="text-base-content/25 mx-1">/</span>
                            {formatAmount(totalPrevision)} {currencySymbol}
                        </span>
                        <span className={`font-semibold tabular-nums ${remaining < 0 ? "text-error" : remaining > 0 ? "text-success" : ""}`}>
                            {remaining >= 0 ? "+" : ""}{formatAmount(remaining)} {currencySymbol}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-base-300/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                </div>

                {pot.sub_pots.length > 0 && (
                    <div className="border-t border-base-300/60 px-4 py-2 flex flex-col gap-1">
                        {pot.sub_pots.map(sp => {
                            const current = sp.current ?? 0
                            const pct = sp.prevision > 0 ? (current / sp.prevision) * 100 : current ? 100 : 0
                            const barColor = pct > 100 ? "bg-error" : pct >= 80 ? "bg-warning" : "bg-success"
                            return (
                                <div key={sp.id} className="py-1.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-base-content/75 truncate">{sp.name}</span>
                                        <span className="text-xs text-base-content/40 tabular-nums shrink-0 ml-2">
                                            {formatAmount(current)} / {formatAmount(sp.prevision)} {currencySymbol}
                                        </span>
                                    </div>
                                    <div className="h-1 w-full bg-base-300/50 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </>}
        </div>
    )
}
