import { useEffect, useState } from "react"
import PotsBoard from "./PotsBoard"
import { getComptes } from "@/api/comptes.api"
import { createPot } from "@/api/pots.api"
import { t } from "i18next";

type Compte = {
    id: string
    name: string
}

export default function PotsPage(): React.JSX.Element {
    const [comptes, setComptes] = useState<Compte[]>([])
    const [selectedCompteId, setSelectedCompteId] = useState<string>("")
    const [newPotName, setNewPotName] = useState<string>("")
    const [refreshKey, setRefreshKey] = useState<number>(0)
	const [showCreate, setShowCreate] = useState<boolean>(false)


    useEffect(() => {
        async function load() {
            const data = await getComptes()
            setComptes(data)

            if (data.length > 0) {
                setSelectedCompteId(data[0].id)
            }
        }

        load()
    }, [])

    async function handleCreatePot() {
        if (!newPotName.trim()) return
        if (!selectedCompteId) return

        await createPot(selectedCompteId, {
            name: newPotName.trim(),
        })

        setNewPotName("")
        setRefreshKey(prev => prev + 1)
		setShowCreate(false)
    }

    return (
        <div className="flex flex-col gap-6 pots-container">
            {/* Sélecteur de compte */}
            <div className="w-full compte-selector">
                <select
                    value={selectedCompteId}
                    onChange={(e) => setSelectedCompteId(e.target.value)}
                    className="select select-bordered w-full compte-select"
                >
                    {comptes.map((compte) => (
                        <option key={compte.id} value={compte.id}>
                            {compte.name}
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
            {selectedCompteId && (
                <PotsBoard
                    compteId={selectedCompteId}
                    refreshKey={refreshKey}
                />
            )}
        </div>
    )
}
