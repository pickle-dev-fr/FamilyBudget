import { useEffect, useState } from "react";

import {
    createAccount,
    getAccounts,
    getAccountsBalance,
    updateAccount,
    reorderAccounts,
    type Account,
    deleteAccount
} from "@/api/accounts.api";

import { formatAmount } from "@/utils";
import AccountsModal, { type AccountFormData } from "./AccountsModal";

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
import { useTranslation } from "react-i18next";

type AccountWithMeta = Account & {
    start_day: number;
    decallage: number;
};

export default function AccountsPage() {
    const { t } = useTranslation();

    const [accounts, setAccounts] = useState<AccountWithMeta[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    async function loadAccounts() {
        setLoading(true);

        try {
            const accountsRes = await getAccounts();
            setAccounts(accountsRes);

            const balancesEntries = await Promise.all(
                accountsRes.map(async (a: AccountWithMeta) => {
                    const balance = await getAccountsBalance(a.id);
                    return [a.id, balance] as const;
                })
            );

            setBalances(Object.fromEntries(balancesEntries));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAccounts();
    }, []);

    async function handleCreate(data: AccountFormData) {
        await createAccount({
            name: data.name,
            start_day: data.startDay,
            initial_value: data.initialValue,
            decallage: data.decallage,
        });

        setCreateOpen(false);
        await loadAccounts();
    }
    
    async function handleDelete(id: string) {
        await deleteAccount(id)
        setAccounts(prev => prev.filter(t => t.id !== id))
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

                        setAccounts(prev => {
                            const oldIndex = prev.findIndex(c => c.id === active.id);
                            const newIndex = prev.findIndex(c => c.id === over.id);
                            const reordered = arrayMove(prev, oldIndex, newIndex);
                            reorderAccounts(reordered.map(c => c.id));
                            return reordered;
                        });
                    }}
                >
                    <SortableContext
                        items={accounts.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <table className="table w-full">
                            <thead>
                                <tr className="text-left">
                                    <th>{t("accounts.name")}</th>
                                    <th>{t("accounts.balance")}</th>
                                    <th>{t("accounts.start_day")}</th>
                                    <th>{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center text-gray-400 italic">—</td>
                                    </tr>
                                )}

                            {accounts.map(a => (
                                <SortableTableRow key={a.id} id={a.id}>
                                    <td>{a.name}</td>
                                    <td className={`${balances[a.id] >= 0 ? "text-green-500" : "text-red-500"}`}>
                                        {formatAmount(balances[a.id])} €
                                    </td>
                                    <td>{a.start_day}</td>
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
        

            <AccountsModal
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
                    await updateAccount(editingAccount.id, {
                        name: data.name,
                        start_day: data.startDay,
                        initial_value: data.initialValue,
                        decallage: data.decallage,
                    });
                    setEditingAccount(null);
                    await loadAccounts();
                }}
            />

            <AccountsModal
                open={createOpen}
                mode="create"
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
        </div>
    );
}
