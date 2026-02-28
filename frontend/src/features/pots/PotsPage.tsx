import { useEffect, useState } from "react"
import PotsBoard from "./PotsBoard"
import { getAccounts } from "@/api/accounts.api"
import { createPot } from "@/api/pots.api"
import { useTranslation } from "react-i18next"

type Account = {
    id: string
    name: string
}

export default function PotsPage(): React.JSX.Element {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")
    const [newPotName, setNewPotName] = useState<string>("")
    const [refreshKey, setRefreshKey] = useState<number>(0)
	const [showCreate, setShowCreate] = useState<boolean>(false)


    useEffect(() => {
        async function load() {
            const data = await getAccounts()
            setAccounts(data)

            if (data.length > 0) {
                setSelectedAccountId(data[0].id)
            }
        }

        load()
    }, [])

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
            {/* Sélecteur de account */}
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
            {selectedAccountId && (
                <PotsBoard
                    accountId={selectedAccountId}
                    refreshKey={refreshKey}
                />
            )}
        </div>
    )
}
