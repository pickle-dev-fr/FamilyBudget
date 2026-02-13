import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
    createCompte,
    getComptes,
    getComptesBalance,
    updateCompte,
    reorderComptes,
    type Compte
} from "@/api/comptes.api";

import { formatAmount } from "@/utils";
import ComptesModal, { type CompteFormData } from "./ComptesModal";

import {
    DndContext,
    closestCenter
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove
} from "@dnd-kit/sortable";

import SortableTableRow from "@/components/table/SortableTableRow";

type CompteWithMeta = Compte & {
    start_day: number;
};

export default function ComptesPage() {
    const { t } = useTranslation();

    const [comptes, setComptes] = useState<CompteWithMeta[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const [editingAccount, setEditingAccount] = useState<Compte | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    async function loadComptes() {
        setLoading(true);

        try {
            const comptesRes = await getComptes();
            setComptes(comptesRes);

            const balancesEntries = await Promise.all(
                comptesRes.map(async (a: CompteWithMeta) => {
                    const solde = await getComptesBalance(a.id);
                    return [a.id, solde] as const;
                })
            );

            setBalances(Object.fromEntries(balancesEntries));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadComptes();
    }, []);

    async function handleCreate(data: CompteFormData) {
        await createCompte({
            name: data.name,
            start_day: data.startDay,
            initial_value: data.initialValue,
        });

        setCreateOpen(false);
        await loadComptes();
    }

    if (loading) {
        return <div className="page">Loading…</div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{t("accounts.title")}</h1>

                <button onClick={() => setCreateOpen(true)}>
                    {t("accounts.create")}
                </button>
            </div>

            <div className="card">
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={async event => {
                        const { active, over } = event;

                        if (!over || active.id === over.id) {
                            return;
                        }

                        setComptes(prev => {
                            const oldIndex = prev.findIndex(c => c.id === active.id);
                            const newIndex = prev.findIndex(c => c.id === over.id);

                            const reordered = arrayMove(prev, oldIndex, newIndex);

                            reorderComptes(
                                reordered.map(c => c.id)
                            );

                            return reordered;
                        });
                    }}
                >
                    <SortableContext
                        items={comptes.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t("accounts.name")}</th>
                                    <th>{t("accounts.balance")}</th>
                                    <th>{t("accounts.start_day")}</th>
                                    <th>{t("accounts.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comptes.length === 0 && (
                                    <tr>
                                        <td colSpan={4}>—</td>
                                    </tr>
                                )}

                                {comptes.map(a => (
                                    <SortableTableRow
                                        key={a.id}
                                        id={a.id}
                                    >
                                        <td>{a.name}</td>
                                        <td className={balances[a.id] >= 0 ? "ok" : "nok"}>
                                            {formatAmount(balances[a.id])} €
                                        </td>
                                        <td>{a.start_day}</td>
                                        <td>
                                            <button onClick={() => setEditingAccount(a)}>
                                                {t("accounts.edit")}
                                            </button>
                                        </td>
                                    </SortableTableRow>
                                ))}
                            </tbody>
                        </table>
                    </SortableContext>
                </DndContext>
            </div>

            <ComptesModal
                open={!!editingAccount}
                onClose={() => setEditingAccount(null)}
                defaultValues={
                    editingAccount
                        ? {
                              name: editingAccount.name,
                              startDay: editingAccount.start_day,
                              initialValue: editingAccount.initial_value,
                          }
                        : undefined
                }
                onSubmit={async data => {
                    if (!editingAccount) {
                        return;
                    }

                    await updateCompte(editingAccount.id, {
                        name: data.name,
                        start_day: data.startDay,
                        initial_value: data.initialValue,
                    });

                    setEditingAccount(null);
                    await loadComptes();
                }}
            />

            <ComptesModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
        </div>
    );
}
