import { useEffect, useState } from "react";
import { t } from "i18next";

import {
    createCompte,
    getComptes,
    getComptesBalance,
    updateCompte,
    reorderComptes,
    type Compte,
    deleteCompte
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
import { ActionsMenu } from "@/components/layout/ActionsMenu";

type CompteWithMeta = Compte & {
    start_day: number;
    decallage: number;
};

export default function ComptesPage() {

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
            decallage: data.decallage,
        });

        setCreateOpen(false);
        await loadComptes();
    }
    
    async function handleDelete(id: string) {
        await deleteCompte(id)
        setComptes(prev => prev.filter(t => t.id !== id))
    }

    if (loading) {
        return <div className="page">Loading…</div>;
    }

    return (
        <div className="page flex flex-col gap-6 p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setCreateOpen(true)}
                >
                    {t("accounts.create")}
                </button>
            </div>

            <div className="card p-4">
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={async event => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;

                        setComptes(prev => {
                            const oldIndex = prev.findIndex(c => c.id === active.id);
                            const newIndex = prev.findIndex(c => c.id === over.id);
                            const reordered = arrayMove(prev, oldIndex, newIndex);
                            reorderComptes(reordered.map(c => c.id));
                            return reordered;
                        });
                    }}
                >
                    <SortableContext
                        items={comptes.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <table className="table w-full">
                            <thead>
                                <tr className="text-left">
                                    <th>{t("accounts.name")}</th>
                                    <th>{t("accounts.balance")}</th>
                                    <th>{t("accounts.start_day")}</th>
                                    <th>{t("accounts.decallage")}</th>
                                    <th>{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comptes.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-gray-400 italic">—</td>
                                    </tr>
                                )}

                            {comptes.map(a => (
                                <SortableTableRow key={a.id} id={a.id}>
                                    <td>{a.name}</td>
                                    <td className={`${balances[a.id] >= 0 ? "text-green-500" : "text-red-500"}`}>
                                        {formatAmount(balances[a.id])} €
                                    </td>
                                    <td>{a.start_day}</td>
                                    <td>{a.decallage}</td>
                                    <td>
                                        <ActionsMenu
                                            onDelete={() => handleDelete(a.id)}
                                            onEdit={() => {setEditingAccount(a)}}
                                        />
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
                mode="edit"
                onClose={() => setEditingAccount(null)}
                defaultValues={
                    editingAccount
                        ? {
                            name: editingAccount.name,
                            startDay: editingAccount.start_day,
                            initialValue: editingAccount.initial_value,
                            decallage: editingAccount.decallage,
                        }
                        : undefined
                }
                onSubmit={async data => {
                    if (!editingAccount) return;
                    await updateCompte(editingAccount.id, {
                        name: data.name,
                        start_day: data.startDay,
                        initial_value: data.initialValue,
                        decallage: data.decallage,
                    });
                    setEditingAccount(null);
                    await loadComptes();
                }}
            />

            <ComptesModal
                open={createOpen}
                mode="create"
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
        </div>
    );
}
