import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { getComptes, type Compte } from "@/api/comptes.api";
import {
    getPotsByCompte,
    getDefaultPot,
    createPot,
    updatePot,
    deletePot,
    type Pot
} from "@/api/pots.api";
import {
    getSousPotsByPot,
    type SousPot
} from "@/api/sous_pots.api";

import PotForm from "@/features/pots/PotForm";
import PotCard from "@/features/pots/PotCard";

export default function PotsPage() {
    const { t } = useTranslation();

    const [comptes, setComptes] = useState<Compte[]>([]);
    const [selectedCompteId, setSelectedCompteId] = useState<string | null>(null);

    const [pots, setPots] = useState<Pot[]>([]);
    const [sousPots, setSousPots] = useState<Record<string, SousPot[]>>({});

    const [creatingPot, setCreatingPot] = useState(false);
    const [defaultPotId, setDefaultPotId] = useState<string | null>(null);

    const loadPotsAndSousPots = useCallback(async (compteId: string) => {
        const potsRes = await getPotsByCompte(compteId) ?? [];
        setPots(potsRes);

        const map: Record<string, SousPot[]> = {};
        for (const pot of potsRes) {
            map[pot.id] = await getSousPotsByPot(pot.id) ?? [];
        }
        setSousPots(map);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            const comptesRes = await getComptes() ?? [];
            setComptes(comptesRes);

            if (comptesRes.length === 0) {
                return;
            }

            const firstCompteId = comptesRes[0].id;
            setSelectedCompteId(firstCompteId);

            const defaultRes = await getDefaultPot(firstCompteId);
            setDefaultPotId(defaultRes?.pot_id ?? null);
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (!selectedCompteId) {
            return;
        }

        loadPotsAndSousPots(selectedCompteId);
    }, [selectedCompteId, loadPotsAndSousPots]);

    return (
        <div className="page">
            <h1>{t("pots.title")}</h1>

            <div className="card">
                <label className="label">{t("pots.select_compte")}</label>
                <select
                    className="select"
                    value={selectedCompteId ?? ""}
                    onChange={e => setSelectedCompteId(e.target.value)}
                >
                    {comptes.map(compte => (
                        <option key={compte.id} value={compte.id}>
                            {compte.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="card">
                <button
                    className="btn btn-primary"
                    onClick={() => setCreatingPot(true)}
                >
                    {t("pots.add")}
                </button>
            </div>

            {creatingPot && selectedCompteId && (
                <PotForm
                    onSubmit={async name => {
                        await createPot(selectedCompteId, { name });
                        setCreatingPot(false);
                        await loadPotsAndSousPots(selectedCompteId);
                    }}
                    onCancel={() => setCreatingPot(false)}
                />
            )}

            {pots.map(pot => (
                <PotCard
                    key={pot.id}
                    pot={pot}
                    sousPots={sousPots[pot.id] ?? []}
                    isDefault={pot.id === defaultPotId}
                    onRename={async (potId, name) => {
                        await updatePot(potId, { name });
                        if (selectedCompteId) {
                            await loadPotsAndSousPots(selectedCompteId);
                        }
                    }}
                    onDelete={async potId => {
                        if (!selectedCompteId) return;
                        await deletePot(potId);
                        await loadPotsAndSousPots(selectedCompteId);
                    }}
                />
            ))}
        </div>
    );
}
