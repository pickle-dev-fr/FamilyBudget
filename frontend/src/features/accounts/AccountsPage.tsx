import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    createAccount,
    getAccounts,
    getAccountsBalance,
    updateAccount,
    reorderAccounts,
    type Account,
    deleteAccount,
    refreshAssetPrices,
} from "@/api/accounts.api";

import { formatAmount } from "@/utils";
import AccountsModal, { type AccountFormData } from "./AccountsModal";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import SortableTableRow from "@/components/table/SortableTableRow";
import { ActionsMenu } from "@/components/layout/ActionsMenu";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/auth/currency";
import { useAccount } from "@/auth/AccountContext";
import { toast } from "@/lib/toast";
import { useLoading } from "@/context/loading";

export default function AccountsPage() {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();
    const { refreshAccounts } = useAccount();
    const { setLoading } = useLoading();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const [refreshing, setRefreshing] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    async function loadAccounts() {
        setLoading(true);
        try {
            const accountsRes = await getAccounts();
            setAccounts(accountsRes);

            const balancesEntries = await Promise.all(
                accountsRes.map(async (a: Account) => {
                    const balance = await getAccountsBalance(a.id);
                    return [a.id, balance] as const;
                })
            );
            setBalances(Object.fromEntries(balancesEntries));
        } finally {
            setLoading(false);
            setIsLoaded(true);
        }
    }

    useEffect(() => { loadAccounts(); }, []);

    async function handleCreate(data: AccountFormData) {
        await createAccount({
            name: data.name,
            start_day: data.startDay,
            initial_value: data.initialValue,
            decallage: data.decallage,
            account_type: data.accountType,
            savings_goal: data.savingsGoal,
            interest_rate: data.interestRate,
            interest_frequency: data.interestFrequency,
        });
        setCreateOpen(false);
        await loadAccounts();
        await refreshAccounts();
        toast.success(t("toast.success.account_created"));
    }

    async function handleDelete(id: string) {
        await deleteAccount(id);
        setAccounts(prev => prev.filter(a => a.id !== id));
        await refreshAccounts();
        toast.success(t("toast.success.account_deleted"));
    }

    async function handleRefreshPrices(accountId: string) {
        setRefreshing(accountId);
        try {
            await refreshAssetPrices(accountId);
            await loadAccounts();
            toast.success(t("toast.success.prices_refreshed"));
        } finally {
            setRefreshing(null);
        }
    }

    function typeBadge(account: Account) {
        if (account.account_type === "SAVINGS")
            return <span className="badge badge-info badge-sm ml-2">{t("accounts.type_savings")}</span>;
        if (account.account_type === "INVESTMENT")
            return <span className="badge badge-warning badge-sm ml-2">{t("accounts.type_investment")}</span>;
        return null;
    }

    return (
        <div className="page flex flex-col gap-6 p-4">
            {accounts.length === 0 && isLoaded && (
                <div role="alert" className="alert alert-info">
                    <span>{t("accounts.no_account_yet")}</span>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
                <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                    {t("accounts.create")}
                </button>
            </div>

            <div className="card p-4">
                <DndContext
                    sensors={sensors}
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
                    <SortableContext items={accounts.map(c => c.id)} strategy={verticalListSortingStrategy}>
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
                                    <tr><td colSpan={4} className="text-center text-gray-400 italic">—</td></tr>
                                )}

                                {accounts.map(a => (
                                    <SortableTableRow key={a.id} id={a.id}>
                                            <td>
                                                {a.name}
                                                {typeBadge(a)}
                                            </td>
                                            <td>
                                                <div className={`font-semibold ${(balances[a.id] ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                    {formatAmount(balances[a.id])} {currencySymbol}
                                                </div>
                                                {/* Barre de progression épargne */}
                                                {a.account_type === "SAVINGS" && a.savings_goal != null && a.savings_goal > 0 && (
                                                    <div className="mt-1">
                                                        <progress
                                                            className="progress progress-primary w-full h-1.5"
                                                            value={Math.min(Math.max(balances[a.id] ?? 0, 0), a.savings_goal)}
                                                            max={a.savings_goal}
                                                        />
                                                        <span className="text-xs opacity-50">
                                                            {formatAmount(balances[a.id] ?? 0)} / {formatAmount(a.savings_goal)} {currencySymbol}
                                                            {a.interest_rate ? ` · ${a.interest_rate}%/${t(`accounts.freq_short_${(a.interest_frequency ?? "annual").toLowerCase()}`)}` : ""}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {a.account_type === "NORMAL" ? a.start_day : "—"}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    {a.account_type === "INVESTMENT" && (
                                                        <>
                                                            <button
                                                                className="btn btn-xs btn-ghost"
                                                                onClick={() => navigate(`/accounts/${a.id}/investment`)}
                                                                title={t("investment.assets_title")}
                                                            >
                                                                {t("accounts.type_investment")}
                                                            </button>
                                                            <button
                                                                className="btn btn-xs btn-ghost"
                                                                onClick={() => handleRefreshPrices(a.id)}
                                                                disabled={refreshing === a.id}
                                                                title={t("accounts.refresh_prices")}
                                                            >
                                                                <RefreshCw size={13} className={refreshing === a.id ? "animate-spin" : ""} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <ActionsMenu
                                                        onDelete={() => handleDelete(a.id)}
                                                        onEdit={() => setEditingAccount(a)}
                                                    />
                                                </div>
                                            </td>
                                        </SortableTableRow>
                                ))}
                            </tbody>
                        </table>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Modal édition compte */}
            <AccountsModal
                open={!!editingAccount}
                mode="edit"
                onClose={() => setEditingAccount(null)}
                defaultValues={
                    editingAccount ? {
                        name: editingAccount.name,
                        startDay: editingAccount.start_day,
                        initialValue: editingAccount.initial_value,
                        decallage: editingAccount.decallage,
                        accountType: editingAccount.account_type,
                        savingsGoal: editingAccount.savings_goal,
                        interestRate: editingAccount.interest_rate,
                        interestFrequency: editingAccount.interest_frequency,
                    } : undefined
                }
                onSubmit={async data => {
                    if (!editingAccount) return;
                    await updateAccount(editingAccount.id, {
                        name: data.name,
                        start_day: data.startDay,
                        initial_value: data.initialValue,
                        savings_goal: data.savingsGoal,
                        interest_rate: data.interestRate,
                        interest_frequency: data.interestFrequency,
                    });
                    setEditingAccount(null);
                    await loadAccounts();
                    toast.success(t("toast.success.account_updated"));
                }}
            />

            {/* Modal création compte */}
            <AccountsModal
                open={createOpen}
                mode="create"
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />

        </div>
    );
}
