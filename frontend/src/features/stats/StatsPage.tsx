import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"
import { getAccounts, type Account, type InvestmentAsset } from "@/api/accounts.api"
import { getPeriode } from "@/api/utils.api"
import {
    getBalanceRange, getMonthlySummary, getBySubPot, getHeatmap, getTopTransactions,
    type DailyBalancePoint, type MonthlySummaryPoint, type SubPotAmount,
    type HeatmapPoint, type TransactionStat,
} from "@/api/stats.api"
import { RotateCcw, Wallet, BarChart2, Clock, TrendingUp, TrendingDown, PiggyBank, Target } from "lucide-react"
import { formatAmount } from "@/utils"
import { useCurrency } from "@/auth/currency"
import {
    ResponsiveContainer, ComposedChart, Line, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from "recharts"

// ─── Couleurs ──────────────────────────────────────────────────────────────
const SUB_POT_HUES = [145, 200, 30, 270, 160, 0, 45, 310, 180, 60, 240, 15]
function subPotBaseColor(i: number) { return `hsl(${SUB_POT_HUES[i % SUB_POT_HUES.length]}, 50%, 45%)` }
function subPotTxColor(si: number, ti: number, max: number) {
    return `hsl(${SUB_POT_HUES[si % SUB_POT_HUES.length]}, 55%, ${30 + (ti / Math.max(max - 1, 1)) * 30}%)`
}

const CHART_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16",
]

// ─── Helpers date ──────────────────────────────────────────────────────────
function todayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function addDaysToStr(s: string, n: number): string {
    const d = new Date(s + "T00:00:00")
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function addMonthsTo(y: number, m: number, n: number): [number, number] {
    let nm = m + n, ny = y
    while (nm > 12) { nm -= 12; ny++ }
    while (nm < 1) { nm += 12; ny-- }
    return [ny, nm]
}
function addMonthsStr(y: number, m: number, n: number): string {
    const [ny, nm] = addMonthsTo(y, m, n)
    return `${ny}-${String(nm).padStart(2, "0")}`
}
function lastDayOfMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
function formatDayLabel(s: string) {
    const d = new Date(s + "T00:00:00")
    return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`
}
function monthLabel(y: number, m: number) {
    return new Date(y, m - 1).toLocaleString("default", { month: "short", year: "2-digit" })
}
function formatLastUpdate(iso: string | null): string {
    if (!iso) return "—"
    const utcIso = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z"
    return new Date(utcIso).toLocaleString(undefined, {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

// ─── Composants UI ────────────────────────────────────────────────────────
function SectionCard({ title, headerRight, children }: {
    title: string; headerRight?: React.ReactNode; children: React.ReactNode
}) {
    return (
        <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
            <div className="bg-base-200/50 px-5 py-3 border-b border-base-300 flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{title}</h2>
                {headerRight}
            </div>
            <div className="p-5">{children}</div>
        </div>
    )
}

function StatCard({ label, value, color, icon: Icon, trend }: {
    label: string; value: string; color?: string; icon?: React.ElementType; trend?: number | null
}) {
    const { t } = useTranslation()
    const trendColor = trend == null ? "" : trend > 0 ? "text-success" : trend < 0 ? "text-error" : "text-base-content/40"
    return (
        <div className="bg-base-100 border border-base-300 rounded-xl px-4 py-3.5 flex items-start gap-3">
            {Icon && (
                <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-primary/10">
                    <Icon size={16} className="text-primary" />
                </div>
            )}
            <div className="min-w-0">
                <span className="text-xs font-medium text-base-content/45 uppercase tracking-wider block">{label}</span>
                <span className={`text-xl font-bold ${color ?? ""}`}>{value}</span>
                {trend != null && (
                    <span className={`text-xs font-medium block mt-0.5 ${trendColor}`}>
                        {trend > 0 ? "↑" : trend < 0 ? "↓" : "="} {Math.abs(Math.round(trend))}% {t("stats.vs_prev_month")}
                    </span>
                )}
            </div>
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
                const mName = new Date(year, mi).toLocaleString("default", { month: "short" })
                return (
                    <div key={mi} className="flex items-center gap-1">
                        <span className="text-xs opacity-50 w-8 shrink-0">{mName}</span>
                        <div className="flex gap-0.5">
                            {Array.from({ length: daysInMonth }, (_, d) => {
                                const ds = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`
                                const pt = byDate[ds]
                                const intensity = pt ? Math.max(0.15, pt.amount / maxAmount) : 0
                                return (
                                    <div key={d} className="w-4 h-4 rounded-sm tooltip"
                                        data-tip={pt ? `${ds}: ${formatAmount(pt.amount)} (${pt.count} tx)` : ds}
                                        style={{ backgroundColor: pt ? `rgba(96,165,250,${intensity})` : "rgba(100,100,100,0.1)" }} />
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Types ────────────────────────────────────────────────────────────────
type BalanceView = "day" | "month" | "year"
type TxSortKey = "date" | "amount"
type TxSortDir = "asc" | "desc"

// ─── Page ─────────────────────────────────────────────────────────────────
export default function StatsPage() {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()
    const now = new Date()
    const nowISO = todayStr()

    // ── Comptes ──
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")

    // ── Données aujourd'hui ──
    const [todayBalance, setTodayBalance] = useState<number | null>(null)
    const [todayPeriod, setTodayPeriod] = useState<{ year: number; month: number } | null>(null)
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryPoint[]>([])

    // ── Graphique évolution solde ──
    const [balanceView, setBalanceView] = useState<BalanceView>("day")
    const [dayFrom, setDayFrom] = useState(() => addDaysToStr(todayStr(), -15))
    const [dayTo, setDayTo] = useState(() => addDaysToStr(todayStr(), 15))
    const [monthFrom, setMonthFrom] = useState(() => addMonthsStr(now.getFullYear(), now.getMonth() + 1, -6))
    const [monthTo, setMonthTo] = useState(() => addMonthsStr(now.getFullYear(), now.getMonth() + 1, 6))
    const [selectedYear, setSelectedYear] = useState(() => now.getFullYear())
    const [balanceViewData, setBalanceViewData] = useState<DailyBalancePoint[]>([])

    // ── Détail mensuel ──
    const [detailMonth, setDetailMonth] = usePersistedState<{ year: number; month: number } | null>(
        `detail_month_${selectedAccountId}`, null
    )
    const [bySubPot, setBySubPot] = useState<SubPotAmount[]>([])
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([])
    const [allTransactions, setAllTransactions] = useState<TransactionStat[]>([])
    const [txSortKey, setTxSortKey] = useState<TxSortKey>("date")
    const [txSortDir, setTxSortDir] = useState<TxSortDir>("desc")

    // ── Compte sélectionné ──
    const selectedAccount = useMemo(
        () => accounts.find(a => a.id === selectedAccountId) ?? null,
        [accounts, selectedAccountId]
    )
    const accountType = selectedAccount?.account_type ?? "NORMAL"
    // Vues balance disponibles selon le type
    const availableBalanceViews: BalanceView[] = accountType === "NORMAL" ? ["day", "month", "year"] : ["month", "year"]

    // ── Chargement comptes (tous types) ──
    useEffect(() => {
        getAccounts().then((data: Account[]) => {
            setAccounts(data)
            if (data.length > 0) {
                const current = data.find(a => a.id === selectedAccountId)
                if (!current) {
                    const first = data[0]
                    setSelectedAccountId(first.id)
                    if (first.account_type !== "NORMAL") setBalanceView("month")
                }
            }
        })
    }, [])

    // ── Changement de compte manuel ──
    function handleAccountChange(id: string) {
        const acct = accounts.find(a => a.id === id)
        setSelectedAccountId(id)
        setBalanceView(acct?.account_type === "NORMAL" ? "day" : "month")
    }

    // ── Données d'aujourd'hui ──
    useEffect(() => {
        if (!selectedAccountId) return
        getBalanceRange(selectedAccountId, nowISO, nowISO)
            .then(data => setTodayBalance(data[0]?.balance ?? null))
        if (accountType !== "INVESTMENT") {
            getMonthlySummary(selectedAccountId).then(setMonthlySummary)
            getPeriode(selectedAccountId).then(p => {
                setTodayPeriod({ year: p.year, month: p.month })
                setDetailMonth(detailMonth ?? { year: p.year, month: p.month })
            })
        }
    }, [selectedAccountId])

    // ── Données détail mensuel ──
    useEffect(() => {
        if (!selectedAccountId || !detailMonth || accountType === "INVESTMENT") return
        const { year, month } = detailMonth
        Promise.all([
            getBySubPot(selectedAccountId, year, month),
            getHeatmap(selectedAccountId, year),
            getTopTransactions(selectedAccountId, year, month),
        ]).then(([bsp, hm, tt]) => {
            setBySubPot(bsp)
            setHeatmap(hm)
            setAllTransactions(tt)
        })
    }, [selectedAccountId, detailMonth])

// ── Données graphique solde ──
    useEffect(() => {
        if (!selectedAccountId) return
        let from: string, to: string
        if (balanceView === "day") {
            from = dayFrom; to = dayTo
        } else if (balanceView === "month") {
            from = `${monthFrom}-01`
            const [ty, tm] = monthTo.split("-").map(Number)
            to = `${ty}-${String(tm).padStart(2, "0")}-${String(lastDayOfMonth(ty, tm)).padStart(2, "0")}`
        } else {
            from = `${selectedYear}-01-01`
            to = `${selectedYear}-12-31`
        }
        if (from <= to) getBalanceRange(selectedAccountId, from, to).then(setBalanceViewData)
    }, [selectedAccountId, balanceView, dayFrom, dayTo, monthFrom, monthTo, selectedYear])

    // ── Navigation mois détail ──
    function changeDetailMonth(delta: number) {
        if (!detailMonth) return
        let { year, month } = detailMonth
        month += delta
        if (month < 1) { month = 12; year-- }
        else if (month > 12) { month = 1; year++ }
        setDetailMonth({ year, month })
    }
    async function resetDetailToNow() {
        if (!selectedAccountId) return
        const p = await getPeriode(selectedAccountId)
        setDetailMonth({ year: p.year, month: p.month })
    }

    // ── Résumé aujourd'hui ──
    const todaySummary = useMemo(() =>
        todayPeriod ? monthlySummary.find(m => m.year === todayPeriod.year && m.month === todayPeriod.month) : null,
        [monthlySummary, todayPeriod]
    )

    const prevSummary = useMemo(() => {
        if (!todaySummary || !monthlySummary.length) return null
        const idx = monthlySummary.findIndex(m => m.year === todaySummary.year && m.month === todaySummary.month)
        return idx > 0 ? monthlySummary[idx - 1] : null
    }, [monthlySummary, todaySummary])

    function pctChange(current?: number, prev?: number): number | null {
        if (current == null || prev == null || Math.abs(prev) < 0.01) return null
        return ((current - prev) / Math.abs(prev)) * 100
    }

    const avgDelta = useMemo(() => {
        if (monthlySummary.length < 2) return null
        const recent = monthlySummary.slice(-6)
        return recent.reduce((s, m) => s + m.delta, 0) / recent.length
    }, [monthlySummary])

    // ── Données graphique formatées ──
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

    const bMin = balanceViewData.length ? Math.min(...balanceViewData.map(p => p.balance)) : 0
    const bMax = balanceViewData.length ? Math.max(...balanceViewData.map(p => p.balance)) : 0
    const bPad = (Math.abs(bMax - bMin) || 100) * 0.08

    // ── Transactions triées ──
    const sortedTransactions = useMemo(() =>
        [...allTransactions].sort((a, b) => {
            const mul = txSortDir === "asc" ? 1 : -1
            return txSortKey === "date"
                ? mul * a.date.localeCompare(b.date)
                : mul * (a.amount - b.amount)
        }),
        [allTransactions, txSortKey, txSortDir]
    )
    function toggleSort(key: TxSortKey) {
        if (txSortKey === key) setTxSortDir(d => d === "asc" ? "desc" : "asc")
        else { setTxSortKey(key); setTxSortDir("desc") }
    }

    // ── Dépenses sans sous-pot ──
    const noSubPotTx = useMemo(() =>
        allTransactions.filter(tx => tx.sub_pot === "—" && tx.transaction_type === "DEBIT"),
        [allTransactions]
    )

    // ── Stacked bar ──
    const debitTx = allTransactions.filter(tx => tx.transaction_type === "DEBIT")
    const subPotGroups = new Map<string, { pot: string; sub_pot: string; txs: TransactionStat[] }>()
    for (const tx of debitTx) {
        const key = `${tx.pot}§${tx.sub_pot}`
        if (!subPotGroups.has(key)) subPotGroups.set(key, { pot: tx.pot, sub_pot: tx.sub_pot, txs: [] })
        subPotGroups.get(key)!.txs.push(tx)
    }
    const sortedGroups = [...subPotGroups.values()].sort(
        (a, b) => a.txs.reduce((s, t) => s + t.amount, 0) - b.txs.reduce((s, t) => s + t.amount, 0)
    )
    const maxTxPerSubPot = sortedGroups.length ? Math.max(...sortedGroups.map(g => g.txs.length)) : 0
    const stackedData = sortedGroups.map(({ pot, sub_pot, txs }, j) => {
        const entry: Record<string, unknown> = { name: sub_pot, pot, _si: j }
        for (let i = 0; i < maxTxPerSubPot; i++) {
            entry[`tx_${i}`] = txs[i]?.amount ?? 0
            entry[`m_${i}`] = txs[i]?.motif ?? "—"
        }
        return entry
    })

    const detailMonthTitle = detailMonth
        ? new Date(detailMonth.year, detailMonth.month - 1).toLocaleString("default", { month: "long", year: "numeric" })
        : ""

    // ── Données investment ──
    const investmentAssets: InvestmentAsset[] = selectedAccount?.assets ?? []
    const investmentTotal = investmentAssets.reduce((s, a) => s + a.quantity * a.current_price, 0)
    const investmentLastUpdate = useMemo(() => {
        const dates = investmentAssets
            .filter(a => a.last_price_update)
            .map(a => a.last_price_update!)
            .sort()
        return dates.at(-1) ?? null
    }, [investmentAssets])
    const investmentChartData = investmentAssets
        .map(a => ({ name: a.ticker, value: a.quantity * a.current_price }))
        .filter(d => d.value > 0)

    // ── JSX graphique balance (inline pour éviter les remounts) ──
    const balanceChartJSX = (
        <SectionCard
            title={t("stats.balance_history")}
            headerRight={
                <div className="flex items-center gap-1">
                    {availableBalanceViews.map(v => (
                        <button key={v}
                            className={`btn btn-xs ${balanceView === v ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setBalanceView(v)}
                        >
                            {t(`stats.view_${v}`)}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {balanceView === "day" && (
                    <>
                        <input type="date" className="input input-bordered input-sm"
                            value={dayFrom} onChange={e => setDayFrom(e.target.value)} />
                        <span className="text-xs opacity-50">→</span>
                        <input type="date" className="input input-bordered input-sm"
                            value={dayTo} onChange={e => setDayTo(e.target.value)} />
                        <button className="btn btn-xs btn-ghost"
                            onClick={() => { setDayFrom(addDaysToStr(todayStr(), -15)); setDayTo(addDaysToStr(todayStr(), 15)) }}>
                            <RotateCcw size={13} />
                        </button>
                    </>
                )}
                {balanceView === "month" && (
                    <>
                        <input type="month" className="input input-bordered input-sm"
                            value={monthFrom} onChange={e => setMonthFrom(e.target.value)} />
                        <span className="text-xs opacity-50">→</span>
                        <input type="month" className="input input-bordered input-sm"
                            value={monthTo} onChange={e => setMonthTo(e.target.value)} />
                        <button className="btn btn-xs btn-ghost"
                            onClick={() => {
                                setMonthFrom(addMonthsStr(now.getFullYear(), now.getMonth() + 1, -6))
                                setMonthTo(addMonthsStr(now.getFullYear(), now.getMonth() + 1, 6))
                            }}>
                            <RotateCcw size={13} />
                        </button>
                    </>
                )}
                {balanceView === "year" && (
                    <>
                        <input type="number" className="input input-bordered input-sm w-24"
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            min={2000} max={2100} />
                        <button className="btn btn-xs btn-ghost"
                            onClick={() => setSelectedYear(now.getFullYear())}>
                            <RotateCcw size={13} />
                        </button>
                    </>
                )}
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
                        <XAxis dataKey="label" tick={{ fontSize: 10, angle: -35, textAnchor: "end", dy: 4 }} interval={Math.max(0, Math.floor(balanceChartData.length / 10) - 1)} height={45} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatAmount(v)} width={70}
                            domain={[Math.floor(bMin - bPad), Math.ceil(bMax + bPad)]} />
                        <Tooltip formatter={((v: unknown, name: string) => [
                            `${formatAmount(v as number)} ${currencySymbol}`,
                            name === "balanceFuture"
                                ? `${t("stats.balance")} (${t("stats.planned")})`
                                : t("stats.balance"),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ]) as any} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                        <Area type="monotone" dataKey="balance" stroke="#60a5fa" strokeWidth={2}
                            fill="url(#bGrad)" dot={false} connectNulls={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="balanceFuture" stroke="#60a5fa" strokeWidth={2}
                            strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </SectionCard>
    )

    // ── JSX liste de transactions ──
    function txListJSX(showPotInfo: boolean) {
        return (
            <SectionCard
                title={t("stats.monthly_transactions")}
                headerRight={
                    <div className="flex items-center gap-1">
                        {(["date", "amount"] as TxSortKey[]).map(k => (
                            <button key={k}
                                className={`btn btn-xs ${txSortKey === k ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => toggleSort(k)}
                            >
                                {t(`stats.sort_${k}`)}
                                {txSortKey === k && <span className="ml-0.5">{txSortDir === "asc" ? "↑" : "↓"}</span>}
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
                                        {tx.date}
                                        {showPotInfo && tx.pot !== "—" && ` · ${tx.pot} › ${tx.sub_pot}`}
                                        {showPotInfo && tx.pot === "—" && ` · ${t("stats.no_subpot")}`}
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
        )
    }

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 max-w-5xl">

            {/* Sélecteur de compte */}
            <select
                className="select select-bordered select-sm w-full sm:w-64"
                value={selectedAccountId}
                onChange={e => handleAccountChange(e.target.value)}
            >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {/* ══ VUE INVESTISSEMENT ══ */}
            {accountType === "INVESTMENT" && (
                <>
                    {/* Cartes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard
                            icon={Wallet}
                            label={t("investment.total_value")}
                            value={`${formatAmount(todayBalance ?? undefined)} ${currencySymbol}`}
                            color={(todayBalance ?? 0) >= 0 ? "text-success" : "text-error"}
                        />
                        <StatCard
                            icon={BarChart2}
                            label={t("investment.asset_count")}
                            value={String(investmentAssets.length)}
                        />
                        <StatCard
                            icon={Clock}
                            label={t("investment.last_update")}
                            value={formatLastUpdate(investmentLastUpdate)}
                        />
                    </div>

                    {/* Évolution portefeuille */}
                    {balanceChartJSX}

                    {/* Répartition des actifs */}
                    {investmentChartData.length > 0 && (
                        <SectionCard title={t("investment.allocation")}>
                            <div className="flex flex-col lg:flex-row gap-6 items-start">
                                {/* Donut */}
                                <div className="w-full lg:w-72 shrink-0">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={investmentChartData}
                                                cx="50%" cy="50%"
                                                innerRadius={55} outerRadius={85}
                                                paddingAngle={2} dataKey="value"
                                            >
                                                {investmentChartData.map((_, i) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `${formatAmount(value)} ${currencySymbol}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Table actifs */}
                                <div className="flex-1 overflow-x-auto">
                                    <table className="table w-full">
                                        <thead>
                                            <tr className="text-left">
                                                <th>{t("accounts.asset_ticker")}</th>
                                                <th>{t("accounts.asset_name")}</th>
                                                <th className="text-right">{t("accounts.asset_quantity")}</th>
                                                <th className="text-right">{t("accounts.asset_price")}</th>
                                                <th className="text-right">{t("accounts.asset_total")}</th>
                                                <th className="text-right">{t("investment.portfolio_pct")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {investmentAssets.map((asset, i) => {
                                                const assetValue = asset.quantity * asset.current_price
                                                const pct = investmentTotal > 0 ? (assetValue / investmentTotal) * 100 : 0
                                                return (
                                                    <tr key={asset.id}>
                                                        <td>
                                                            <span className="font-mono font-semibold"
                                                                style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                                                {asset.ticker}
                                                            </span>
                                                        </td>
                                                        <td className="text-sm">{asset.name}</td>
                                                        <td className="text-right tabular-nums">{asset.quantity}</td>
                                                        <td className="text-right tabular-nums">
                                                            {formatAmount(asset.current_price)} {currencySymbol}
                                                        </td>
                                                        <td className="text-right tabular-nums font-semibold">
                                                            {formatAmount(assetValue)} {currencySymbol}
                                                        </td>
                                                        <td className="text-right tabular-nums">
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className="text-sm">{pct.toFixed(1)}%</span>
                                                                <progress className="progress progress-primary w-16 h-1"
                                                                    value={pct} max={100} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-bold border-t border-base-300">
                                                <td colSpan={4} className="text-right pr-2 opacity-60">Total</td>
                                                <td className="text-right tabular-nums">
                                                    {formatAmount(investmentTotal)} {currencySymbol}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </SectionCard>
                    )}
                </>
            )}

            {/* ══ VUE NORMALE & ÉPARGNE ══ */}
            {accountType !== "INVESTMENT" && (
                <>
                    {/* Cartes d'aujourd'hui */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <StatCard
                            icon={Wallet}
                            label={t("stats.balance")}
                            value={`${formatAmount(todayBalance ?? undefined)} ${currencySymbol}`}
                        />
                        <StatCard
                            icon={TrendingUp}
                            label={t("stats.income")}
                            value={`${formatAmount(todaySummary?.income)} ${currencySymbol}`}
                            color="text-success"
                            trend={pctChange(todaySummary?.income, prevSummary?.income)}
                        />
                        <StatCard
                            icon={TrendingDown}
                            label={t("stats.expenses")}
                            value={`${formatAmount(todaySummary?.expenses)} ${currencySymbol}`}
                            color="text-error"
                            trend={pctChange(todaySummary?.expenses, prevSummary?.expenses) !== null
                                ? -(pctChange(todaySummary?.expenses, prevSummary?.expenses)!)
                                : null}
                        />
                        <StatCard
                            icon={(todaySummary?.delta ?? 0) >= 0 ? TrendingUp : TrendingDown}
                            label={t("stats.delta")}
                            value={`${formatAmount(todaySummary?.delta)} ${currencySymbol}`}
                            color={(todaySummary?.delta ?? 0) >= 0 ? "text-success" : "text-error"}
                            trend={pctChange(todaySummary?.delta, prevSummary?.delta)}
                        />
                        <StatCard
                            icon={BarChart2}
                            label={t("stats.avg_delta")}
                            value={avgDelta !== null ? `${formatAmount(avgDelta)} ${currencySymbol}` : "—"}
                            color={avgDelta !== null ? (avgDelta >= 0 ? "text-success" : "text-error") : ""}
                        />
                    </div>

                    {/* Évolution du solde */}
                    {balanceChartJSX}

                    {/* Détail mensuel */}
                    <div className="flex flex-col gap-6">
                        {/* Navigation mois */}
                        <div className="flex items-center gap-2">
                            <button className="btn btn-sm" onClick={() => changeDetailMonth(-1)}>{"<"}</button>
                            <span className="font-medium min-w-36 text-center text-sm">{detailMonthTitle}</span>
                            <button className="btn btn-sm" onClick={() => changeDetailMonth(1)}>{">"}</button>
                            <button className="btn btn-sm btn-ghost" onClick={resetDetailToNow} title={t("stats.current_month")}>
                                <RotateCcw size={14} />
                            </button>
                        </div>

                        {/* Compte courant : pots + stacked bar */}
                        {accountType === "NORMAL" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <SectionCard title={t("stats.by_subpot")}>
                                        {bySubPot.length === 0 ? (
                                            <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <PieChart>
                                                    <Pie data={bySubPot} dataKey="amount" nameKey="sub_pot"
                                                        cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                                                        {bySubPot.map((_, i) => <Cell key={i} fill={subPotBaseColor(i)} />)}
                                                    </Pie>
                                                    <Tooltip formatter={((v: unknown, name: string) => [`${formatAmount(v as number)} ${currencySymbol}`, name]) as any} />
                                                    <Legend iconType="circle" iconSize={8} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </SectionCard>
                                    {txListJSX(true)}
                                </div>

                                <SectionCard title={t("stats.stacked_by_subpot")}>
                                    {stackedData.length === 0 ? (
                                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={Math.max(260, stackedData.length * 36)}>
                                            <BarChart data={stackedData} layout="vertical"
                                                margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatAmount(v)} />
                                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (!active || !payload?.length) return null
                                                        const segs = payload.filter(p => (p.value as number) > 0)
                                                        const total = segs.reduce((s, p) => s + (p.value as number), 0)
                                                        const si = (segs[0]?.payload as Record<string, unknown>)?._si as number ?? 0
                                                        return (
                                                            <div className="bg-base-200 border border-base-300 rounded p-2 text-xs shadow-lg">
                                                                <p className="font-semibold mb-1">{label} — {formatAmount(total)} {currencySymbol}</p>
                                                                {segs.map((p, i) => {
                                                                    const ti = parseInt((p.dataKey as string).replace("tx_", ""))
                                                                    const motif = (p.payload as Record<string, unknown>)[`m_${ti}`] as string || "—"
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
                                                    <Bar key={i} dataKey={`tx_${i}`} stackId="a"
                                                        radius={i === maxTxPerSubPot - 1 ? [0, 4, 4, 0] : undefined}>
                                                        {sortedGroups.map((_, j) => (
                                                            <Cell key={j} fill={subPotTxColor(j, i, maxTxPerSubPot)} />
                                                        ))}
                                                    </Bar>
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </SectionCard>

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
                            </>
                        )}

                        {/* Épargne : seulement les transactions (sans info pots) */}
                        {accountType === "SAVINGS" && txListJSX(false)}

                        {/* Heatmap (compte courant uniquement) */}
                        {accountType === "NORMAL" && (
                            <SectionCard title={`${t("stats.heatmap")} ${detailMonth?.year ?? ""}`}>
                                {heatmap.length === 0 ? (
                                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                                ) : (
                                    <CalendarHeatmap data={heatmap} year={detailMonth?.year ?? now.getFullYear()} />
                                )}
                            </SectionCard>
                        )}

                    </div>
                </>
            )}

        </div>
    )
}
