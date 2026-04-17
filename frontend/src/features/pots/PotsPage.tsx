import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import PotsBoard from "./PotsBoard"
import { getAccounts, type Account } from "@/api/accounts.api"
import { createPot } from "@/api/pots.api"
import { getPeriode } from "@/api/utils.api"
import { useTranslation } from "react-i18next"
import { usePersistedState } from "@/hooks/usePersistedState"

type Account = {
    id: string
    name: string
}

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
        <div className="flex flex-col gap-6 pots-container">
            {/* Sélecteur de compte */}
            <div className="w-full account-selector">
                <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="select select-bordered w-full account-select"
                >
                    {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Navigation mois */}
            <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => changeMonth(-1)}>{"<"}</button>
                <span className="font-medium min-w-36 text-center">
                    {currentRefMonth && (
                        new Date(
                            currentRefMonth.year,
                            currentRefMonth.month - 1
                        ).toLocaleString("default", {
                            month: "long",
                            year: "numeric"
                        })
                    )}
                </span>
                <button className="btn btn-sm" onClick={() => changeMonth(1)}>{">"}</button>
                <button className="btn btn-sm btn-ghost" onClick={goToCurrentMonth} title={t("transactions.current_month")}>
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* Création pot */}
            <div className="flex flex-col gap-2 pot-creation">
                {!showCreate && (
                    <button
                        className="btn btn-primary pot-add-btn"
                        onClick={() => setShowCreate(true)}
                    >
                        {t("pots.add")}
                    </button>
                )}

                {showCreate && (
                    <div className="flex flex-row gap-2 pot-create-form">
                        <input
                            className="input input-bordered flex-1 pot-create-input"
                            value={newPotName}
                            onChange={(e) => setNewPotName(e.target.value)}
                            placeholder={t("pots.name")}
                        />

                        <button
                            className="btn btn-success pot-create-submit"
                            onClick={handleCreatePot}
                        >
                            {t("common.create")}
                        </button>

                        <button
                            className="btn btn-error pot-create-cancel"
                            onClick={() => {
                                setShowCreate(false)
                                setNewPotName("")
                            }}
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                )}
            </div>

            {/* Board */}
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
