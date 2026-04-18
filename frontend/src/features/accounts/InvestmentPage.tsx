import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

import {
    getAccount,
    getAccountsBalance,
    createAsset,
    updateAsset,
    deleteAsset,
    refreshAssetPrices,
    type Account,
    type InvestmentAsset,
} from "@/api/accounts.api";
import { formatAmount } from "@/utils";
import { useCurrency } from "@/auth/currency";
import { ActionsMenu } from "@/components/layout/ActionsMenu";
import AssetModal, { type AssetFormData } from "./AssetModal";
import { toast } from "@/lib/toast";
import { useLoading } from "@/context/loading";

const CHART_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16",
];


function formatLastUpdate(iso: string | null): string {
    if (!iso) return "—";
    // Le serveur stocke en UTC sans indicateur de fuseau → on force l'interprétation UTC
    const utcIso = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
    return new Date(utcIso).toLocaleString(undefined, {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function InvestmentPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { currencySymbol } = useCurrency();
    const { setLoading } = useLoading();

    const [account, setAccount] = useState<Account | null>(null);
    const [totalValue, setTotalValue] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<InvestmentAsset | null>(null);

    async function loadAccount() {
        if (!accountId) return;
        setLoading(true);
        try {
            const [data, balance] = await Promise.all([
                getAccount(accountId),
                getAccountsBalance(accountId),
            ]);
            setAccount(data);
            setTotalValue(balance);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadAccount(); }, [accountId]);

    async function handleRefresh() {
        if (!accountId) return;
        setRefreshing(true);
        try {
            await refreshAssetPrices(accountId);
            await loadAccount();
            toast.success(t("toast.success.prices_refreshed"));
        } finally {
            setRefreshing(false);
        }
    }

    async function handleCreateAsset(data: AssetFormData) {
        if (!accountId) return;
        await createAsset(accountId, data);
        setAssetModalOpen(false);
        await loadAccount();
        toast.success(t("toast.success.asset_added"));
    }

    async function handleUpdateAsset(data: AssetFormData) {
        if (!editingAsset) return;
        await updateAsset(editingAsset.account_id, editingAsset.id, data);
        setEditingAsset(null);
        await loadAccount();
        toast.success(t("toast.success.asset_updated"));
    }

    async function handleDeleteAsset(asset: InvestmentAsset) {
        await deleteAsset(asset.account_id, asset.id);
        await loadAccount();
        toast.success(t("toast.success.asset_deleted"));
    }

    const assets = account?.assets ?? [];

    const chartData = assets
        .map(a => ({ name: a.ticker, value: a.quantity * a.current_price }))
        .filter(d => d.value > 0);

    const lastUpdate = assets
        .filter(a => a.last_price_update)
        .map(a => a.last_price_update!)
        .sort()
        .at(-1) ?? null;

    if (!account) return null;

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate("/accounts")}>
                    <ArrowLeft size={16} />
                    {t("investment.back")}
                </button>
                <h1 className="text-xl font-semibold">{account.name}</h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                    {t("accounts.type_investment")}
                </span>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                    <p className="text-xs font-medium text-base-content/45 uppercase tracking-wider mb-1.5">{t("investment.total_value")}</p>
                    <p className={`text-xl font-bold ${totalValue >= 0 ? "text-success" : "text-error"}`}>
                        {formatAmount(totalValue)} {currencySymbol}
                    </p>
                </div>
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                    <p className="text-xs font-medium text-base-content/45 uppercase tracking-wider mb-1.5">{t("investment.asset_count")}</p>
                    <p className="text-xl font-bold">{assets.length}</p>
                </div>
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                    <p className="text-xs font-medium text-base-content/45 uppercase tracking-wider mb-1.5">{t("investment.last_update")}</p>
                    <p className="text-sm font-medium">{formatLastUpdate(lastUpdate)}</p>
                </div>
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-center">
                    <button
                        className="btn btn-outline btn-sm gap-2"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RotateCcw size={14} className={refreshing ? "animate-spin" : ""} />
                        {t("accounts.refresh_prices")}
                    </button>
                </div>
            </div>

            {/* Tableau + graphique */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Tableau des actifs */}
                <div className="flex-1 bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-base-300 bg-base-200/40">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{t("investment.assets_title")}</h2>
                        <button
                            className="btn btn-primary btn-xs"
                            onClick={() => setAssetModalOpen(true)}
                        >
                            + {t("accounts.asset_add")}
                        </button>
                    </div>

                    {assets.length === 0 ? (
                        <p className="text-sm text-base-content/30 italic text-center py-8">{t("accounts.no_assets")}</p>
                    ) : (
                        <table className="table w-full">
                            <thead>
                                <tr className="text-left">
                                    <th>{t("accounts.asset_ticker")}</th>
                                    <th>{t("accounts.asset_name")}</th>
                                    <th>{t("accounts.asset_type")}</th>
                                    <th className="text-right">{t("accounts.asset_quantity")}</th>
                                    <th className="text-right">{t("accounts.asset_price")}</th>
                                    <th className="text-right">{t("accounts.asset_total")}</th>
                                    <th className="text-right">{t("investment.portfolio_pct")}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, i) => {
                                    const assetValue = asset.quantity * asset.current_price;
                                    const pct = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
                                    return (
                                        <tr key={asset.id}>
                                            <td>
                                                <span
                                                    className="font-mono font-semibold"
                                                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                                                >
                                                    {asset.ticker}
                                                </span>
                                            </td>
                                            <td>{asset.name}</td>
                                            <td>
                                                <span className="badge badge-xs badge-ghost">
                                                    {t(`accounts.asset_type_${asset.asset_type.toLowerCase()}`)}
                                                </span>
                                            </td>
                                            <td className="text-right tabular-nums">{asset.quantity}</td>
                                            <td className="text-right tabular-nums">
                                                {formatAmount(asset.current_price)} {currencySymbol}
                                            </td>
                                            <td className="text-right tabular-nums font-semibold">
                                                {formatAmount(assetValue)} {currencySymbol}
                                            </td>
                                            <td className="text-right tabular-nums">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-sm">{pct.toFixed(1)}%</span>
                                                    <progress
                                                        className="progress progress-primary w-16 h-1"
                                                        value={pct}
                                                        max={100}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <ActionsMenu
                                                    onEdit={() => setEditingAsset(asset)}
                                                    onDelete={() => handleDeleteAsset(asset)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold border-t border-base-300">
                                    <td colSpan={5} className="text-right pr-2 opacity-60">Total</td>
                                    <td className="text-right tabular-nums">
                                        {formatAmount(totalValue)} {currencySymbol}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Donut chart */}
                {chartData.length > 0 && (
                    <div className="w-full lg:w-72 bg-base-100 border border-base-300 rounded-xl p-4">
                        <h2 className="text-sm font-semibold mb-3">{t("investment.allocation")}</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `${formatAmount(value)} ${currencySymbol}`}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Modal ajout actif */}
            <AssetModal
                open={assetModalOpen}
                mode="create"
                onClose={() => setAssetModalOpen(false)}
                onSubmit={handleCreateAsset}
            />

            {/* Modal édition actif */}
            <AssetModal
                open={!!editingAsset}
                mode="edit"
                defaultValues={editingAsset ? {
                    ticker: editingAsset.ticker,
                    name: editingAsset.name,
                    asset_type: editingAsset.asset_type,
                    quantity: editingAsset.quantity,
                } : undefined}
                onClose={() => setEditingAsset(null)}
                onSubmit={handleUpdateAsset}
            />
        </div>
    );
}
