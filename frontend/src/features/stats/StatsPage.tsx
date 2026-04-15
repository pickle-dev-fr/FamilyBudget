import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"
import { getAccounts, type Account } from "@/api/accounts.api"
import { getPeriode } from "@/api/utils.api"
import {
    getBalanceRange, getBalanceHistory, getMonthlySummary, getBySubPot, getHeatmap, getTopTransactions,
    type BalancePoint, type DailyBalancePoint, type MonthlySummaryPoint, type SubPotAmount,
    type HeatmapPoint, type TransactionStat,
} from "@/api/stats.api"
import { formatAmount } from "@/utils"
import { useCurrency } from "@/auth/currency"
import {
    ResponsiveContainer, ComposedChart, Line, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from "recharts"

// ─── Couleurs sous-pots ────────────────────────────────────────────────────
const SUB_POT_HUES = [145, 200, 30, 270, 160, 0, 45, 310, 180, 60, 240, 15]
function subPotBaseColor(i: number) { return `hsl(${SUB_POT_HUES[i % SUB_POT_HUES.length]}, 50%, 45%)` }
function subPotTxColor(si: number, ti: number, max: number) {
    const h = SUB_POT_HUES[si % SUB_POT_HUES.length]
    return `hsl(${h}, 55%, ${30 + (ti / Math.max(max - 1, 1)) * 30}%)`
}

// ─── Helpers date ──────────────────────────────────────────────────────────
function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function addDaysToStr(dateStr: string, n: number): string {
    const d = new Date(dateStr + "T00:00:00")
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function addMonthsTo(y: number, m: number, delta: number): [number, number] {
    let nm = m + delta, ny = y
    while (nm > 12) { nm -= 12; ny++ }
    while (nm < 1) { nm += 12; ny-- }
    return [ny, nm]
}
function lastDayOfMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
function formatDayLabel(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00")
    return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`
}
function monthLabel(y: number, m: number) {
    return new Date(y, m - 1).toLocaleString("default", { month: "short", year: "2-digit" })
}

// ─── Composants UI ────────────────────────────────────────────────────────
function SectionCard({ title, headerRight, children }: {
    title: string; headerRight?: React.ReactNode; children: React.ReactNode
}) {
    return (
        <div className="card bg-base-100 border border-base-300 rounded-lg overflow-hidden">
            <div className="bg-base-200 px-4 py-3 border-b border-base-300 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
                {headerRight}
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
                                const ds = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`
                                const point = byDate[ds]
                                const intensity = point ? Math.max(0.15, point.amount / maxAmount) : 0
                                return (
                                    <div
                                        key={d}
                                        className="w-4 h-4 rounded-sm tooltip"
                                        data-tip={point ? `${ds}: ${formatAmount(point.amount)} (${point.count} tx)` : ds}
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

// ─── Page principale ──────────────────────────────────────────────────────
type BalanceView = "day" | "month" | "year"
type TxSortKey = "date" | "amount"
type TxSortDir = "asc" | "desc"

export default function StatsPage() {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()

    // ── Sélection compte / mois ──
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{ year: number; month: number } | null>(
        `last_month_${selectedAccountId}`, null
    )

    // ── Données stats mensuelles ──
    const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([])
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryPoint[]>([])
    const [bySubPot, setBySubPot] = useState<SubPotAmount[]>([])
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([])
    const [allTransactions, setAllTransactions] = useState<TransactionStat[]>([])

    // ── Graphique évolution du solde ──
    const [balanceView, setBalanceView] = useState<BalanceView>("day")
    const [dayCenter, setDayCenter] = useState<string>(todayStr)
    const [monthCenter, setMonthCenter] = useState<{ year: number; month: number } | null>(null)
    const [balanceYear, setBalanceYear] = useState(() => new Date().getFullYear())
    const [balanceViewData, setBalanceViewData] = useState<DailyBalancePoint[]>([])

    // ── Tri des transactions ──
    const [txSortKey, setTxSortKey] = useState<TxSortKey>("date")
    const [txSortDir, setTxSortDir] = useState<TxSortDir>("desc")

    // ── Chargement des comptes ──
    useEffect(() => {
        getAccounts().then(data => {
            setAccounts(data)
            if (data.length > 0 && !data.find((a: Account) => a.id === selectedAccountId))
                setSelectedAccountId(data[0].id)
        })
    }, [])

    // ── Période courante ──
    useEffect(() => {
        if (!selectedAccountId || currentRefMonth) return
        getPeriode(selectedAccountId).then(p => setCurrentRefMonth({ year: p.year, month: p.month }))
    }, [selectedAccountId])

    // ── Initialiser le centre du graphique mois ──
    useEffect(() => {
        if (currentRefMonth && !monthCenter)
            setMonthCenter(currentRefMonth)
    }, [currentRefMonth])

    // ── Données mensuelles (changement compte / mois) ──
    useEffect(() => {
        if (!selectedAccountId || !currentRefMonth) return
        const { year, month } = currentRefMonth
        Promise.all([
            getBalanceHistory(selectedAccountId),
            getMonthlySummary(selectedAccountId),
            getBySubPot(selectedAccountId, year, month),
            getHeatmap(selectedAccountId, year),
            getTopTransactions(selectedAccountId, year, month),
        ]).then(([bh, ms, bsp, hm, tt]) => {
            setBalanceHistory(bh)
            setMonthlySummary(ms)
            setBySubPot(bsp)
            setHeatmap(hm)
            setAllTransactions(tt)
        })
    }, [selectedAccountId, currentRefMonth])

    // ── Données graphique solde (changement vue / navigation) ──
    useEffect(() => {
        if (!selectedAccountId) return
        if (balanceView === "month" && !monthCenter) return

        let from: string, to: string
        if (balanceView === "day") {
            from = addDaysToStr(dayCenter, -15)
            to = addDaysToStr(dayCenter, +15)
        } else if (balanceView === "month" && monthCenter) {
            const [fy, fm] = addMonthsTo(monthCenter.year, monthCenter.month, -6)
            const [ty, tm] = addMonthsTo(monthCenter.year, monthCenter.month, +6)
            from = `${fy}-${String(fm).padStart(2, "0")}-01`
            to = `${ty}-${String(tm).padStart(2, "0")}-${String(lastDayOfMonth(ty, tm)).padStart(2, "0")}`
        } else {
            from = `${balanceYear}-01-01`
            to = `${balanceYear}-12-31`
        }

        getBalanceRange(selectedAccountId, from, to).then(setBalanceViewData)
    }, [selectedAccountId, balanceView, dayCenter, monthCenter, balanceYear])

    // ── Navigation mois de stats ──
    async function goToCurrentMonth() {
        if (!selectedAccountId) return
        const p = await getPeriode(selectedAccountId)
        setCurrentRefMonth({ year: p.year, month: p.month })
    }
    function changeMonth(delta: number) {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 1) { month = 12; year-- }
        else if (month > 12) { month = 1; year++ }
        setCurrentRefMonth({ year, month })
    }

    // ── Navigation graphique solde ──
    function navigateBalance(delta: number) {
        if (balanceView === "day") setDayCenter(d => addDaysToStr(d, delta * 7))
        else if (balanceView === "month" && monthCenter) {
            const [ny, nm] = addMonthsTo(monthCenter.year, monthCenter.month, delta)
            setMonthCenter({ year: ny, month: nm })
        } else setBalanceYear(y => y + delta)
    }
    function resetBalanceToNow() {
        setDayCenter(todayStr())
        if (currentRefMonth) setMonthCenter(currentRefMonth)
        setBalanceYear(new Date().getFullYear())
    }

    // ── Label période graphique ──
    const balancePeriodLabel = useMemo(() => {
        if (balanceView === "day") {
            return `${formatDayLabel(addDaysToStr(dayCenter, -15))} — ${formatDayLabel(addDaysToStr(dayCenter, +15))}`
        } else if (balanceView === "month" && monthCenter) {
            const [fy, fm] = addMonthsTo(monthCenter.year, monthCenter.month, -6)
            const [ty, tm] = addMonthsTo(monthCenter.year, monthCenter.month, +6)
            return `${monthLabel(fy, fm)} — ${monthLabel(ty, tm)}`
        } else return String(balanceYear)
    }, [balanceView, dayCenter, monthCenter, balanceYear])

    // ── Données chart solde ──
    const balanceChartData = useMemo(() => {
        if (balanceView === "day") {
            return balanceViewData.map((p, i) => {
                const isJunction = !p.is_future && balanceViewData[i + 1]?.is_future
                return {
                    label: formatDayLabel(p.date),
                    balance: !p.is_future ? p.balance : undefined,
                    balanceFuture: (p.is_future || isJunction) ? p.balance : undefined,
                }
            })
        }
        // Vues mois / année : agréger par mois (dernier point du mois)
        const monthly = new Map<string, DailyBalancePoint>()
        for (const p of balanceViewData) monthly.set(p.date.slice(0, 7), p)
        return [...monthly.entries()].sort().map(([key, p], i, arr) => {
            const isJunction = !p.is_future && arr[i + 1]?.[1].is_future
            const [y, m] = key.split("-").map(Number)
            return {
                label: monthLabel(y, m),
                balance: !p.is_future ? p.balance : undefined,
                balanceFuture: (p.is_future || isJunction) ? p.balance : undefined,
            }
        })
    }, [balanceViewData, balanceView])

    const allBalances = balanceViewData.map(p => p.balance)
    const bMin = allBalances.length ? Math.min(...allBalances) : 0
    const bMax = allBalances.length ? Math.max(...allBalances) : 0
    const bPad = (Math.abs(bMax - bMin) || 100) * 0.08

    // ── Résumé mois courant ──
    const currentSummary = currentRefMonth
        ? monthlySummary.find(m => m.year === currentRefMonth.year && m.month === currentRefMonth.month)
        : null
    const currentMonthBalance = currentRefMonth
        ? balanceHistory.find(m => m.year === currentRefMonth.year && m.month === currentRefMonth.month)
        : null
    const monthTitle = currentRefMonth
        ? new Date(currentRefMonth.year, currentRefMonth.month - 1).toLocaleString("default", { month: "long", year: "numeric" })
        : ""

    // ── Transactions triées ──
    const sortedTransactions = useMemo(() => {
        return [...allTransactions].sort((a, b) => {
            const mul = txSortDir === "asc" ? 1 : -1
            if (txSortKey === "date") return mul * a.date.localeCompare(b.date)
            return mul * (a.amount - b.amount)
        })
    }, [allTransactions, txSortKey, txSortDir])

    function toggleSort(key: TxSortKey) {
        if (txSortKey === key) setTxSortDir(d => d === "asc" ? "desc" : "asc")
        else { setTxSortKey(key); setTxSortDir("desc") }
    }

    // ── Dépenses sans sous-pot ──
    const noSubPotTx = useMemo(() =>
        allTransactions.filter(tx => tx.sub_pot === "—" && tx.transaction_type === "DEBIT"),
        [allTransactions]
    )

    // ── Stacked bar (dépenses DEBIT par sous-pot, les plus grosses en haut) ──
    const debitTx = allTransactions.filter(tx => tx.transaction_type === "DEBIT")
    const subPotGroups = new Map<string, { pot: string; sub_pot: string; txs: TransactionStat[] }>()
    for (const tx of debitTx) {
        const key = `${tx.pot}§${tx.sub_pot}`
        if (!subPotGroups.has(key)) subPotGroups.set(key, { pot: tx.pot, sub_pot: tx.sub_pot, txs: [] })
        subPotGroups.get(key)!.txs.push(tx)
    }
    // Tri croissant → recharts affiche le dernier en haut, donc le plus gros en haut
    const sortedGroups = [...subPotGroups.values()].sort(
        (a, b) => a.txs.reduce((s, t) => s + t.amount, 0) - b.txs.reduce((s, t) => s + t.amount, 0)
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

    // ─── Render ────────────────────────────────────────────────────────────
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

            {/* Cartes synthèse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label={t("stats.balance")} value={`${formatAmount(currentMonthBalance?.balance)} ${currencySymbol}`} />
                <StatCard label={t("stats.income")} value={`${formatAmount(currentSummary?.income)} ${currencySymbol}`} color="text-success" />
                <StatCard label={t("stats.expenses")} value={`${formatAmount(currentSummary?.expenses)} ${currencySymbol}`} color="text-error" />
                <StatCard
                    label={t("stats.delta")}
                    value={`${formatAmount(currentSummary?.delta)} ${currencySymbol}`}
                    color={(currentSummary?.delta ?? 0) >= 0 ? "text-success" : "text-error"}
                />
            </div>

            {/* Évolution du solde — vues Jour / Mois / Année */}
            <SectionCard
                title={t("stats.balance_history")}
                headerRight={
                    <div className="flex items-center gap-1">
                        {(["day", "month", "year"] as BalanceView[]).map(v => (
                            <button
                                key={v}
                                className={`btn btn-xs ${balanceView === v ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setBalanceView(v)}
                            >
                                {t(`stats.view_${v}`)}
                            </button>
                        ))}
                    </div>
                }
            >
                {/* Navigation de période */}
                <div className="flex items-center justify-between mb-3 gap-2">
                    <button className="btn btn-sm btn-ghost" onClick={() => navigateBalance(-1)}>{"<"}</button>
                    <span className="text-xs opacity-60 text-center">{balancePeriodLabel}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => navigateBalance(1)}>{">"}</button>
                    <button className="btn btn-xs btn-ghost" onClick={resetBalanceToNow} title="Aujourd'hui">⌂</button>
                </div>

                {balanceChartData.length === 0 ? (
                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={balanceChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
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
                                domain={[Math.floor(bMin - bPad), Math.ceil(bMax + bPad)]}
                            />
                            <Tooltip
                                formatter={(v: number, name: string) => [
                                    `${formatAmount(v)} ${currencySymbol}`,
                                    name === "balanceFuture"
                                        ? `${t("stats.balance")} (${t("stats.planned")})`
                                        : t("stats.balance"),
                                ]}
                            />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                fill="url(#bGrad)"
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
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
                                    cx="50%" cy="45%"
                                    innerRadius={55} outerRadius={85}
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

                <SectionCard
                    title={t("stats.monthly_transactions")}
                    headerRight={
                        <div className="flex items-center gap-1">
                            {(["date", "amount"] as TxSortKey[]).map(k => (
                                <button
                                    key={k}
                                    className={`btn btn-xs ${txSortKey === k ? "btn-primary" : "btn-ghost"}`}
                                    onClick={() => toggleSort(k)}
                                >
                                    {t(`stats.sort_${k}`)}
                                    {txSortKey === k && (
                                        <span className="ml-0.5">{txSortDir === "asc" ? "↑" : "↓"}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {sortedTransactions.length === 0 ? (
                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                    ) : (
                        <div className="flex flex-col divide-y divide-base-300 max-h-72 overflow-y-auto">
                            {sortedTransactions.map((tx, i) => (
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

            {/* Stacked bar : dépenses par sous-pot (plus grosses en haut) */}
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
                                    const segs = payload.filter(p => (p.value as number) > 0)
                                    const total = segs.reduce((s, p) => s + (p.value as number), 0)
                                    const si = (segs[0]?.payload as Record<string, unknown>)?._subPotIdx as number ?? 0
                                    return (
                                        <div className="bg-base-200 border border-base-300 rounded p-2 text-xs shadow-lg">
                                            <p className="font-semibold mb-1">{label} — {formatAmount(total)} {currencySymbol}</p>
                                            {segs.map((p, i) => {
                                                const ti = parseInt((p.dataKey as string).replace("tx_", ""))
                                                const motif = (p.payload as Record<string, unknown>)[`motif_${ti}`] as string || "—"
                                                return (
                                                    <p key={i} style={{ color: subPotTxColor(si, ti, maxTxPerSubPot) }}>
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
