import { useEffect, useState } from "react"
import PotsBoard from "./PotsBoard"
import { getComptes } from "@/api/comptes.api"
import { createPot } from "@/api/pots.api"

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
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Sélecteur de compte */}
            <div>
                <select
                    value={selectedCompteId}
                    onChange={(e) => setSelectedCompteId(e.target.value)}
                    style={{
                        padding: 8,
                        background: "#1e1e1e",
                        color: "white",
                        borderRadius: 6,
                        border: "1px solid #333",
                    }}
                >
                    {comptes.map((compte) => (
                        <option key={compte.id} value={compte.id}>
                            {compte.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Création pot */}
            {/* Bouton afficher formulaire */}
			<div>
				{!showCreate && (
					<button
						onClick={() => setShowCreate(true)}
						style={{
							padding: "8px 16px",
							background: "#333",
							color: "white",
							border: "1px solid #444",
							borderRadius: 6,
							cursor: "pointer",
						}}
					>
						+ Ajouter un pot
					</button>
				)}

				{showCreate && (
					<div style={{ display: "flex", gap: 8 }}>
						<input
							value={newPotName}
							onChange={(e) => setNewPotName(e.target.value)}
							placeholder="Nom du pot"
							style={{
								padding: 8,
								background: "#1e1e1e",
								color: "white",
								borderRadius: 6,
								border: "1px solid #333",
								flex: 1,
							}}
						/>

						<button
							onClick={handleCreatePot}
							style={{
								padding: "8px 16px",
								background: "#4caf50",
								color: "white",
								border: "none",
								borderRadius: 6,
								cursor: "pointer",
							}}
						>
							Valider
						</button>

						<button
							onClick={() => {
								setShowCreate(false)
								setNewPotName("")
							}}
							style={{
								padding: "8px 16px",
								background: "#555",
								color: "white",
								border: "none",
								borderRadius: 6,
								cursor: "pointer",
							}}
						>
							Annuler
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
