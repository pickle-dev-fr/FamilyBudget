import { useEffect, useState } from "react"
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import PotsBoard from "./PotsBoard"
import { getAccounts, type Account } from "@/api/accounts.api"
import { createPot } from "@/api/pots.api"
import { getPeriode } from "@/api/utils.api"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"

export default function PotsPage(): React.JSX.Element {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("last_account_id", "")
    const [newPotName, setNewPotName] = useState<string>("")
    const [refreshKey, setRefreshKey] = useState<number>(0)
    const [showCreate, setShowCreate] = useState<boolean>(false)

    const [currentRefMonth, setCurrentRefMonth] = usePersistedState<{
        year: number
        month: number
    } | null>(`last_month_${selectedAccountId}`, null)

    useEffect(() => {
        async function load() {
            const data = await getAccounts()
            const eligible = data.filter((a: Account) => a.account_type === "NORMAL")
            setAccounts(eligible)

            if (eligible.length > 0) {
                const valid = eligible.find((a: { id: string }) => a.id === selectedAccountId)
                if (!valid) setSelectedAccountId(eligible[0].id)
            }
        }

        load()
    }, [])

    useEffect(() => {
        async function loadPeriode() {
            if (!selectedAccountId) return
            if (currentRefMonth) return

            const period = await getPeriode(selectedAccountId)
            setCurrentRefMonth({ year: period.year, month: period.month })
        }

        loadPeriode()
    }, [selectedAccountId])

    async function goToCurrentMonth() {
        if (!selectedAccountId) return
        const period = await getPeriode(selectedAccountId)
        setCurrentRefMonth({ year: period.year, month: period.month })
    }

    const changeMonth = (delta: number) => {
        let { year, month } = currentRefMonth!
        month += delta
        if (month < 0) { month = 11; year -= 1 }
        else if (month > 11) { month = 0; year += 1 }
        setCurrentRefMonth({ year, month })
    }

    async function handleCreatePot() {
        if (!newPotName.trim()) return
        if (!selectedAccountId) return

        await createPot(selectedAccountId, {
            name: newPotName.trim(),
        })

        setNewPotName("")
        setRefreshKey(prev => prev + 1)
        setShowCreate(false)
    }

    return (
        <div className="flex flex-col gap-5 max-w-5xl">
            {/* ── Barre outils ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="select select-bordered select-sm min-w-40"
                    >
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-1 py-1">
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => changeMonth(-1)}>
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-sm font-medium min-w-32 text-center capitalize px-1">
                            {currentRefMonth && (
                                new Date(currentRefMonth.year, currentRefMonth.month - 1)
                                    .toLocaleString("default", { month: "long", year: "numeric" })
                            )}
                        </span>
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => changeMonth(1)}>
                            <ChevronRight size={14} />
                        </button>
                        <button className="btn btn-ghost btn-xs btn-square text-base-content/40" onClick={goToCurrentMonth} title={t("transactions.current_month")}>
                            <RotateCcw size={12} />
                        </button>
                    </div>
                </div>

                {!showCreate ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                        {t("pots.add")}
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            className="input input-bordered input-sm w-40"
                            value={newPotName}
                            onChange={(e) => setNewPotName(e.target.value)}
                            placeholder={t("pots.name")}
                            onKeyDown={(e) => e.key === "Enter" && handleCreatePot()}
                            autoFocus
                        />
                        <button className="btn btn-success btn-sm" onClick={handleCreatePot}>
                            {t("common.create")}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setNewPotName("") }}>
                            {t("common.cancel")}
                        </button>
                    </div>
                )}
            </div>

            {selectedAccountId && currentRefMonth && (
                <PotsBoard
                    accountId={selectedAccountId}
                    refreshKey={refreshKey}
                    year={currentRefMonth.year}
                    month={currentRefMonth.month}
                />
            )}
        </div>
    )
}
