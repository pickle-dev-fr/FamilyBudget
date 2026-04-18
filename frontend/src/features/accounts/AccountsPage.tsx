import { useEffect, useState } from "react";
import { RotateCcw, ChevronRight, Wallet } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
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

type TabType = "NORMAL" | "SAVINGS" | "INVESTMENT";

export default function AccountsPage() {
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();
    const { refreshAccounts } = useAccount();
    const { setLoading } = useLoading();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("NORMAL");
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

    const tabs: { key: TabType; label: string }[] = [
        { key: "NORMAL",     label: t("accounts.type_normal") },
        { key: "SAVINGS",    label: t("accounts.type_savings") },
        { key: "INVESTMENT", label: t("accounts.type_investment") },
    ];

    const filteredAccounts = accounts.filter(a => a.account_type === activeTab);

    return (
        <div className="flex flex-col gap-6 max-w-4xl">

            {/* En-tête */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">{t("accounts.title")}</h1>
                <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
                    {t("accounts.create")}
                </button>
            </div>

            {accounts.length === 0 && isLoaded && (
                <div role="alert" className="alert alert-info text-sm">
                    <span>{t("accounts.no_account_yet")}</span>
                </div>
            )}

            {/* Onglets en pilule */}
            <div className="inline-flex bg-base-100 border border-base-300 rounded-xl p-1 gap-0.5 self-start">
                {tabs.map(({ key, label }) => {
                    const count = accounts.filter(a => a.account_type === key).length;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5
                                ${activeTab === key
                                    ? "bg-primary text-primary-content shadow-sm"
                                    : "text-base-content/50 hover:text-base-content hover:bg-base-200"
                                }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                                    ${activeTab === key ? "bg-white/20" : "bg-base-300 text-base-content/60"}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tableau */}
            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                {filteredAccounts.length === 0 && isLoaded ? (
                    <EmptyState icon={Wallet} message={t("accounts.empty_tab")} />
                ) : (
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
                    <SortableContext items={filteredAccounts.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {/* Vue carte mobile */}
                        <div className="md:hidden">
                            {filteredAccounts.map(a => {
                                const bal = balances[a.id] ?? 0;
                                return (
                                    <div key={a.id} className="px-4 py-3 border-b border-base-300/40 last:border-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{a.name}</p>
                                                {activeTab === "NORMAL" && (
                                                    <p className="text-xs text-base-content/40 mt-0.5">{t("accounts.start_day")} {a.start_day}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`text-sm font-bold tabular-nums ${bal >= 0 ? "text-success" : "text-error"}`}>
                                                    {formatAmount(bal)} {currencySymbol}
                                                </span>
                                                <div className="flex items-center gap-0">
                                                    {a.account_type === "INVESTMENT" && (
                                                        <>
                                                            <button className="btn btn-ghost btn-xs btn-square text-primary" onClick={() => navigate(`/accounts/${a.id}/investment`)}><ChevronRight size={14} /></button>
                                                            <button className="btn btn-ghost btn-xs btn-square text-base-content/40" onClick={() => handleRefreshPrices(a.id)} disabled={refreshing === a.id}><RotateCcw size={13} className={refreshing === a.id ? "animate-spin" : ""} /></button>
                                                        </>
                                                    )}
                                                    <ActionsMenu onDelete={() => handleDelete(a.id)} onEdit={() => setEditingAccount(a)} />
                                                </div>
                                            </div>
                                        </div>
                                        {a.account_type === "SAVINGS" && a.savings_goal != null && a.savings_goal > 0 && (
                                            <div className="mt-2">
                                                <div className="flex justify-between text-xs text-base-content/40 mb-1">
                                                    <span>{formatAmount(bal)}</span>
                                                    <span>{formatAmount(a.savings_goal)} {currencySymbol}</span>
                                                </div>
                                                <progress className="progress progress-primary w-full h-1.5" value={Math.min(Math.max(bal, 0), a.savings_goal)} max={a.savings_goal} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Vue tableau desktop */}
                        <div className="hidden md:block overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>{t("accounts.name")}</th>
                                    <th>{t("accounts.balance")}</th>
                                    {activeTab === "NORMAL" && <th>{t("accounts.start_day")}</th>}
                                    <th className="w-16">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAccounts.map(a => {
                                    const bal = balances[a.id] ?? 0;
                                    return (
                                        <SortableTableRow key={a.id} id={a.id}>
                                            <td className="font-medium">{a.name}</td>
                                            <td>
                                                <span className={`text-sm font-semibold tabular-nums ${bal >= 0 ? "text-success" : "text-error"}`}>
                                                    {formatAmount(bal)} {currencySymbol}
                                                </span>
                                                {a.account_type === "SAVINGS" && a.savings_goal != null && a.savings_goal > 0 && (
                                                    <div className="mt-1.5">
                                                        <progress
                                                            className="progress progress-primary w-full h-1"
                                                            value={Math.min(Math.max(bal, 0), a.savings_goal)}
                                                            max={a.savings_goal}
                                                        />
                                                        <span className="text-xs text-base-content/40">
                                                            {formatAmount(bal)} / {formatAmount(a.savings_goal)} {currencySymbol}
                                                            {a.interest_rate && a.interest_frequency
                                                                ? ` · ${a.interest_rate}%/${t(`accounts.freq_short_${a.interest_frequency.toLowerCase()}`)}`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            {activeTab === "NORMAL" && (
                                                <td className="text-sm text-base-content/60">{a.start_day}</td>
                                            )}
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    {a.account_type === "INVESTMENT" && (
                                                        <>
                                                            <button
                                                                className="btn btn-ghost btn-xs text-primary hover:text-primary/80"
                                                                onClick={() => navigate(`/accounts/${a.id}/investment`)}
                                                                title={t("investment.assets_title")}
                                                            >
                                                                <ChevronRight size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-xs text-base-content/40 hover:text-base-content"
                                                                onClick={() => handleRefreshPrices(a.id)}
                                                                disabled={refreshing === a.id}
                                                                title={t("accounts.refresh_prices")}
                                                            >
                                                                <RotateCcw size={13} className={refreshing === a.id ? "animate-spin" : ""} />
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
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </SortableContext>
                </DndContext>
                )}
            </div>

            {/* Modales */}
            <AccountsModal
                open={!!editingAccount}
                mode="edit"
                onClose={() => setEditingAccount(null)}
                defaultValues={editingAccount ? {
                    name: editingAccount.name,
                    startDay: editingAccount.start_day,
                    initialValue: editingAccount.initial_value,
                    accountType: editingAccount.account_type,
                    savingsGoal: editingAccount.savings_goal,
                    interestRate: editingAccount.interest_rate,
                    interestFrequency: editingAccount.interest_frequency,
                } : undefined}
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
            <AccountsModal
                open={createOpen}
                mode="create"
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
        </div>
    );
}
