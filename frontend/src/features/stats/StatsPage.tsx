import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"
import { getAccounts, type Account } from "@/api/accounts.api"
import { getPeriode } from "@/api/utils.api"
import {
    getBalanceHistory, getMonthlySummary, getBySubPot, getHeatmap, getTopTransactions,
    type BalancePoint, type MonthlySummaryPoint, type SubPotAmount, type HeatmapPoint, type TransactionStat,
} from "@/api/stats.api"
import { formatAmount } from "@/utils"
import { useCurrency } from "@/auth/currency"
import {
    ResponsiveContainer, LineChart, Line, ComposedChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ReferenceLine, PieChart, Pie, Cell,
} from "recharts"

const COLORS = ["#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fbbf24", "#f472b6", "#38bdf8", "#4ade80"]

function monthLabel(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString("default", { month: "short", year: "2-digit" })
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

export default function StatsPage() {
    const { t } = useTranslation()
    const { currencySymbol } = useCurrency()

    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{ year: number; month: number } | null>(
        `last_month_${selectedAccountId}`, null
    )

    const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([])
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryPoint[]>([])
    const [bySubPot, setBySubPot] = useState<SubPotAmount[]>([])
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([])
    const [topTransactions, setTopTransactions] = useState<TransactionStat[]>([])

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
            setTopTransactions(tt)
        })
    }, [selectedAccountId, currentRefMonth])

    async function goToCurrentMonth() {
        if (!selectedAccountId) return
        const period = await getPeriode(selectedAccountId)
        setCurrentRefMonth({ year: period.year, month: period.month })
    }

    // mois en 1-12 (cohérent avec l'API)
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

    const currentBalance = currentRefMonth
        ? balanceHistory.find(m => m.year === currentRefMonth.year && m.month === currentRefMonth.month)
        : null

    const monthTitle = currentRefMonth
        ? new Date(currentRefMonth.year, currentRefMonth.month - 1).toLocaleString("default", { month: "long", year: "numeric" })
        : ""

    const chartData = monthlySummary.map(m => ({
        label: monthLabel(m.year, m.month),
        income: m.income,
        expenses: m.expenses,
        delta: m.delta,
    }))

    const balanceData = balanceHistory.map(m => ({
        label: monthLabel(m.year, m.month),
        balance: m.balance,
    }))

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
            <div className="flex flex-col gap-2">
                <p className="text-xs opacity-50 uppercase tracking-wide">{monthTitle}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label={t("stats.balance")} value={`${formatAmount(currentBalance?.balance)} ${currencySymbol}`} />
                    <StatCard label={t("stats.income")} value={`${formatAmount(currentSummary?.income)} ${currencySymbol}`} color="text-success" />
                    <StatCard label={t("stats.expenses")} value={`${formatAmount(currentSummary?.expenses)} ${currencySymbol}`} color="text-error" />
                    <StatCard
                        label={t("stats.delta")}
                        value={`${formatAmount(currentSummary?.delta)} ${currencySymbol}`}
                        color={(currentSummary?.delta ?? 0) >= 0 ? "text-success" : "text-error"}
                    />
                </div>
            </div>

            {/* Évolution du solde (depuis le début) */}
            <SectionCard title={t("stats.balance_history")}>
                {balanceData.length === 0 ? (
                    <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={balanceData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatAmount(v)} width={70} />
                            <Tooltip formatter={(v: number) => [`${formatAmount(v)} ${currencySymbol}`, t("stats.balance")]} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <Line type="monotone" dataKey="balance" stroke="#60a5fa" strokeWidth={2} dot={balanceData.length <= 24 ? { r: 3 } : false} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </SectionCard>

            {/* Entrées / Sorties / Delta */}
            <SectionCard title={t("stats.monthly_summary")}>
                <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatAmount(v)} width={70} />
                        <Tooltip formatter={(v: number, name: string) => [`${formatAmount(v)} ${currencySymbol}`, t(`stats.${name}`)]} />
                        <Legend formatter={(value) => t(`stats.${value}`)} />
                        <Bar dataKey="income" fill="#34d399" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
                        <Line type="monotone" dataKey="delta" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </SectionCard>

            {/* Répartition par sous-pot + Transactions du mois */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <SectionCard title={t("stats.by_subpot")}>
                    {bySubPot.length === 0 ? (
                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={bySubPot}
                                    dataKey="amount"
                                    nameKey="sub_pot"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                >
                                    {bySubPot.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number, name: string) => [`${formatAmount(v)} ${currencySymbol}`, name]} />
                                <Legend iconType="circle" iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </SectionCard>

                <SectionCard title={t("stats.top_transactions")}>
                    {topTransactions.length === 0 ? (
                        <p className="text-sm opacity-50 text-center py-4">{t("stats.no_data")}</p>
                    ) : (
                        <div className="flex flex-col divide-y divide-base-300 max-h-64 overflow-y-auto">
                            {topTransactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between py-2 gap-2">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate">{tx.motif || "—"}</span>
                                        <span className="text-xs opacity-50">{tx.pot} · {tx.sub_pot} · {tx.date}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-error shrink-0">
                                        -{formatAmount(tx.amount)} {currencySymbol}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

            </div>

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
