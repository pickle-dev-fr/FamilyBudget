import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"
import { getAccounts, type Account } from "@/api/accounts.api"
import { getPeriode } from "@/api/utils.api"
import {
    getDailyBalance, getMonthlySummary, getBySubPot, getHeatmap, getTopTransactions,
    type DailyBalancePoint, type MonthlySummaryPoint, type SubPotAmount, type HeatmapPoint, type TransactionStat,
} from "@/api/stats.api"
import { formatAmount } from "@/utils"
import { useCurrency } from "@/auth/currency"
import {
    ResponsiveContainer, ComposedChart, Line, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from "recharts"

const SUB_POT_HUES = [145, 200, 30, 270, 160, 0, 45, 310, 180, 60, 240, 15]

function subPotBaseColor(index: number): string {
    const hue = SUB_POT_HUES[index % SUB_POT_HUES.length]
    return `hsl(${hue}, 50%, 45%)`
}

function subPotTxColor(subPotIndex: number, txIndex: number, maxTx: number): string {
    const hue = SUB_POT_HUES[subPotIndex % SUB_POT_HUES.length]
    const lightness = 30 + (txIndex / Math.max(maxTx - 1, 1)) * 30
    return `hsl(${hue}, 55%, ${lightness}%)`
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="card bg-base-100 border border-base-300 rounded-lg overflow-hidden">
            <div className="bg-base-200 px-4 py-3 border-b border-base-300">
                <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="card bg-base-200 rounded-lg px-4 py-3 flex flex-col gap-1">
            <span className="text-xs opacity-60 uppercase tracking-wide">{label}</span>
            <span className={`text-xl font-bold ${color ?? ""}`}>{value}</span>
        </div>
    )
}

function CalendarHeatmap({ data, year }: { data: HeatmapPoint[]; year: number }) {
    const byDate = Object.fromEntries(data.map(d => [d.date, d]))
    const maxAmount = data.length ? Math.max(...data.map(d => d.amount)) : 1

    return (
        <div className="flex flex-col gap-1.5 overflow-x-auto">
            {Array.from({ length: 12 }, (_, mi) => {
                const daysInMonth = new Date(year, mi + 1, 0).getDate()
                const monthName = new Date(year, mi).toLocaleString("default", { month: "short" })
                return (
                    <div key={mi} className="flex items-center gap-1">
                        <span className="text-xs opacity-50 w-8 shrink-0">{monthName}</span>
                        <div className="flex gap-0.5">
                            {Array.from({ length: daysInMonth }, (_, d) => {
                                const dateStr = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`
                                const point = byDate[dateStr]
                                const intensity = point ? Math.max(0.15, point.amount / maxAmount) : 0
                                return (
                                    <div
                                        key={d}
                                        className="w-4 h-4 rounded-sm tooltip"
                                        data-tip={point ? `${dateStr}: ${formatAmount(point.amount)} (${point.count} tx)` : dateStr}
                                        style={{ backgroundColor: point ? `rgba(96,165,250,${intensity})` : "rgba(100,100,100,0.1)" }}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00")
    return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`
}

export default function StatsPage() {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()

    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{ year: number; month: number } | null>(
        `last_month_${selectedAccountId}`, null
    )

    const [dailyBalance, setDailyBalance] = useState<DailyBalancePoint[]>([])
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryPoint[]>([])
    const [bySubPot, setBySubPot] = useState<SubPotAmount[]>([])
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([])
    const [allTransactions, setAllTransactions] = useState<TransactionStat[]>([])

    useEffect(() => {
        async function load() {
            const data = await getAccounts()
            setAccounts(data)
            if (data.length > 0) {
                const valid = data.find((a: Account) => a.id === selectedAccountId)
                if (!valid) setSelectedAccountId(data[0].id)
            }
        }
        load()
    }, [])

    useEffect(() => {
        async function loadPeriode() {
            if (!selectedAccountId || currentRefMonth) return
            const period = await getPeriode(selectedAccountId)
            setCurrentRefMonth({ year: period.year, month: period.month })
        }
        loadPeriode()
    }, [selectedAccountId])

    useEffect(() => {
        if (!selectedAccountId || !currentRefMonth) return
        const { year, month } = currentRefMonth
        Promise.all([
            getDailyBalance(selectedAccountId, year, month),
            getMonthlySummary(selectedAccountId),
            getBySubPot(selectedAccountId, year, month),
            getHeatmap(selectedAccountId, year),
            getTopTransactions(selectedAccountId, year, month),
        ]).then(([db, ms, bsp, hm, tt]) => {
            setDailyBalance(db)
            setMonthlySummary(ms)
            setBySubPot(bsp)
            setHeatmap(hm)
            setAllTransactions(tt)
        })
    }, [selectedAccountId, currentRefMonth])

    async function goToCurrentMonth() {
        if (!selectedAccountId) return
        const period = await getPeriode(selectedAccountId)
        setCurrentRefMonth({ year: period.year, month: period.month })
    }

    const changeMonth = (delta: number) => {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 1) { month = 12; year -= 1 }
        else if (month > 12) { month = 1; year += 1 }
        setCurrentRefMonth({ year, month })
    }

    const currentSummary = currentRefMonth
        ? monthlySummary.find(m => m.year === currentRefMonth.year && m.month === currentRefMonth.month)
        : null

    // Dernier point passé pour la carte "Solde"
    const lastPastBalance = dailyBalance.filter(p => !p.is_future).at(-1)?.balance ?? null

    const monthTitle = currentRefMonth
        ? new Date(currentRefMonth.year, currentRefMonth.month - 1).toLocaleString("default", { month: "long", year: "numeric" })
        : ""

    // Données graphique solde journalier : passé (trait plein) + futur (pointillé)
    const dailyChartData = dailyBalance.map(p => ({
        label: formatDayLabel(p.date),
        balance: !p.is_future ? p.balance : undefined,
        // point de jonction : aujourd'hui apparaît dans les deux séries
        balanceFuture: p.is_future || (!p.is_future && dailyBalance[dailyBalance.indexOf(p) + 1]?.is_future)
            ? p.balance
            : undefined,
    }))

    const allBalances = dailyBalance.map(p => p.balance)
    const balanceMin = allBalances.length ? Math.min(...allBalances) : 0
    const balanceMax = allBalances.length ? Math.max(...allBalances) : 0
    const balancePad = Math.abs(balanceMax - balanceMin) * 0.08 || 10

    // Transactions sans sous-pot (dépenses directes)
    const noSubPotTx = allTransactions.filter(tx => tx.sub_pot === "—" && tx.transaction_type === "DEBIT")

    // Stacked bar : transactions DEBIT groupées par sous-pot
    const debitTx = allTransactions.filter(tx => tx.transaction_type === "DEBIT")
    const subPotGroups = new Map<string, { pot: string; sub_pot: string; txs: TransactionStat[] }>()
    for (const tx of debitTx) {
        const key = `${tx.pot}§${tx.sub_pot}`
        if (!subPotGroups.has(key)) subPotGroups.set(key, { pot: tx.pot, sub_pot: tx.sub_pot, txs: [] })
        subPotGroups.get(key)!.txs.push(tx)
    }
    const sortedGroups = [...subPotGroups.values()].sort(
        (a, b) => b.txs.reduce((s, t) => s + t.amount, 0) - a.txs.reduce((s, t) => s + t.amount, 0)
    )
    const maxTxPerSubPot = sortedGroups.length ? Math.max(...sortedGroups.map(g => g.txs.length)) : 0
    const stackedData = sortedGroups.map(({ pot, sub_pot, txs }, j) => {
        const entry: Record<string, unknown> = { name: sub_pot, pot, _subPotIdx: j }
        for (let i = 0; i < maxTxPerSubPot; i++) {
            entry[`tx_${i}`] = txs[i]?.amount ?? 0
            entry[`motif_${i}`] = txs[i]?.motif ?? "—"
        }
        return entry
    })

    return (
        <div className="flex flex-col gap-6 max-w-5xl">

            {/* Sélecteur compte + navigation mois */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <select
                    className="select select-bordered w-full sm:w-64"
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                    <button className="btn btn-sm" onClick={() => changeMonth(-1)}>{"<"}</button>
                    <span className="font-medium min-w-36 text-center text-sm">{monthTitle}</span>
                    <button className="btn btn-sm" onClick={() => changeMonth(1)}>{">"}</button>
                    <button className="btn btn-sm btn-ghost" onClick={goToCurrentMonth} title={t("stats.current_month")}>⌂</button>
                </div>
            </div>

            {/* Cartes synthèse du mois */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label={t("stats.balance")} value={`${formatAmount(lastPastBalance ?? undefined)} ${currencySymbol}`} />
                <StatCard label={t("stats.income")} value={`${formatAmount(currentSummary?.income)} ${currencySymbol}`} color="text-success" />
                <StatCard label={t("stats.expenses")} value={`${formatAmount(currentSummary?.expenses)} ${currencySymbol}`} color="text-error" />
                <StatCard
                    label={t("stats.delta")}
                    value={`${formatAmount(currentSummary?.delta)} ${currencySymbol}`}
                    color={(currentSummary?.delta ?? 0) >= 0 ? "text-success" : "text-error"}
                />
            </div>

            {/* Évolution du solde jour par jour (passé plein, futur pointillé) */}
            <SectionCard title={t("stats.balance_history")}>
                {dailyChartData.length === 0 ? (
                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickFormatter={v => formatAmount(v)}
                                width={70}
                                domain={[Math.floor(balanceMin - balancePad), Math.ceil(balanceMax + balancePad)]}
                            />
                            <Tooltip
                                formatter={(v: number, name: string) => [
                                    `${formatAmount(v)} ${currencySymbol}`,
                                    name === "balanceFuture" ? `${t("stats.balance")} (${t("stats.planned")})` : t("stats.balance"),
                                ]}
                            />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            {/* Zone sous la courbe passée */}
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                fill="url(#balanceGrad)"
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
                            {/* Courbe future en pointillé */}
                            <Line
                                type="monotone"
                                dataKey="balanceFuture"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </SectionCard>

            {/* Répartition par sous-pot + Transactions du mois */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <SectionCard title={t("stats.by_subpot")}>
                    {bySubPot.length === 0 ? (
                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={bySubPot}
                                    dataKey="amount"
                                    nameKey="sub_pot"
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                >
                                    {bySubPot.map((_, i) => <Cell key={i} fill={subPotBaseColor(i)} />)}
                                </Pie>
                                <Tooltip formatter={(v: number, name: string) => [`${formatAmount(v)} ${currencySymbol}`, name]} />
                                <Legend iconType="circle" iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </SectionCard>

                <SectionCard title={t("stats.monthly_transactions")}>
                    {allTransactions.length === 0 ? (
                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                    ) : (
                        <div className="flex flex-col divide-y divide-base-300 max-h-72 overflow-y-auto">
                            {allTransactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between py-2 gap-2">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {tx.is_planned && (
                                                <span className="badge badge-xs badge-warning shrink-0">{t("stats.planned")}</span>
                                            )}
                                            <span className="text-sm font-medium truncate">{tx.motif || "—"}</span>
                                        </div>
                                        <span className="text-xs opacity-50">
                                            {tx.date} · {tx.pot !== "—" ? `${tx.pot} › ${tx.sub_pot}` : t("stats.no_subpot")}
                                        </span>
                                    </div>
                                    <span className={`text-sm font-semibold shrink-0 ${tx.transaction_type === "DEBIT" ? "text-error" : "text-success"}`}>
                                        {tx.transaction_type === "DEBIT" ? "-" : "+"}{formatAmount(tx.amount)} {currencySymbol}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

            </div>

            {/* Stacked bar : dépenses par sous-pot (détail) */}
            <SectionCard title={t("stats.stacked_by_subpot")}>
                {stackedData.length === 0 ? (
                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(260, stackedData.length * 36)}>
                        <BarChart
                            data={stackedData}
                            layout="vertical"
                            margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatAmount(v)} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null
                                    const segments = payload.filter(p => (p.value as number) > 0)
                                    const total = segments.reduce((s, p) => s + (p.value as number), 0)
                                    const subPotIdx = (segments[0]?.payload as Record<string, unknown>)?._subPotIdx as number ?? 0
                                    return (
                                        <div className="bg-base-200 border border-base-300 rounded p-2 text-xs shadow-lg">
                                            <p className="font-semibold mb-1">{label} — {formatAmount(total)} {currencySymbol}</p>
                                            {segments.map((p, i) => {
                                                const txIdx = parseInt((p.dataKey as string).replace("tx_", ""))
                                                const motif = (p.payload as Record<string, unknown>)[`motif_${txIdx}`] as string || "—"
                                                const color = subPotTxColor(subPotIdx, txIdx, maxTxPerSubPot)
                                                return (
                                                    <p key={i} style={{ color }}>
                                                        {motif} : {formatAmount(p.value as number)} {currencySymbol}
                                                    </p>
                                                )
                                            })}
                                        </div>
                                    )
                                }}
                            />
                            {Array.from({ length: maxTxPerSubPot }, (_, i) => (
                                <Bar key={i} dataKey={`tx_${i}`} stackId="a" radius={i === maxTxPerSubPot - 1 ? [0, 4, 4, 0] : undefined}>
                                    {sortedGroups.map((_, j) => (
                                        <Cell key={j} fill={subPotTxColor(j, i, maxTxPerSubPot)} />
                                    ))}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </SectionCard>

            {/* Dépenses sans sous-pot */}
            {noSubPotTx.length > 0 && (
                <SectionCard title={t("stats.no_subpot_expenses")}>
                    <div className="flex flex-col divide-y divide-base-300 max-h-64 overflow-y-auto">
                        {noSubPotTx.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between py-2 gap-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">{tx.motif || "—"}</span>
                                    <span className="text-xs opacity-50">{tx.date}</span>
                                </div>
                                <span className="text-sm font-semibold text-error shrink-0">
                                    -{formatAmount(tx.amount)} {currencySymbol}
                                </span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Heatmap */}
            <SectionCard title={`${t("stats.heatmap")} ${currentRefMonth?.year ?? ""}`}>
                {heatmap.length === 0 ? (
                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                ) : (
                    <CalendarHeatmap data={heatmap} year={currentRefMonth?.year ?? new Date().getFullYear()} />
                )}
            </SectionCard>

        </div>
    )
}
