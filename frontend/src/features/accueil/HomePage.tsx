import { useEffect, useState } from "react";
import { t } from "i18next";

import { formatAmount } from "@/utils";
import { getComptes, getComptesBalance, type Compte } from "@/api/comptes.api";
import { getTotalBalance } from "@/api/stats.api";
import {
    getTodayTransactions,
    getTomorrowTransactions,
    type Transaction
} from "@/api/transactions.api";

export default function HomePage() {

    const [loading, setLoading] = useState(true);

    const [total, setTotal] = useState<number | null>(null);
    const [accounts, setAccounts] = useState<Compte[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [todayTx, setTodayTx] = useState<Transaction[]>([]);
    const [tomorrowTx, setTomorrowTx] = useState<Transaction[]>([]);

    useEffect(() => {
        async function load() {
        try {
            const [
            totalRes,
            accountsRes,
            todayRes,
            tomorrowRes
            ] = await Promise.all([
            getTotalBalance(),
            getComptes(),
            getTodayTransactions(),
            getTomorrowTransactions()
            ]);

            setTotal(totalRes);
            setAccounts(accountsRes);
            setTodayTx(todayRes);
            setTomorrowTx(tomorrowRes);

            const balancesEntries = await Promise.all(
            accountsRes.map(async (a:any) => {
                const solde = await getComptesBalance(a.id);
                return [a.id, solde] as const;
            })
            );

            setBalances(Object.fromEntries(balancesEntries));
        } finally {
            setLoading(false);
        }
        }

        load();
    }, []);

    if (loading) {
        return <div className="page">Loading…</div>;
    }

    return (
        <div className="flex flex-col gap-8 p-4">
            <h1 className="text-2xl font-bold">{t("home.title")}</h1>

            {/* Solde total */}
            <section className="flex flex-col gap-2">
                <div className="card p-4 rounded-lg bg-bg-soft flex justify-between items-center">
                    <div className="font-medium">{t("home.total_balance")}</div>
                    <div className="text-xl font-bold">{formatAmount(total)} €</div>
                </div>
            </section>

            {/* Comptes - cartes */}
            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">{t("home.accounts_list")}</h2>

                <div className="grid grid-cols-2 gap-4">
                    {accounts.map((a) => {
                        const balance = balances[a.id];

                        return (
                            <div key={a.id} className="card p-4 rounded-lg bg-bg-soft flex justify-between items-center">
                                <div>{a.name}</div>
                                <div className={balance >= 0 ? "text-success" : "text-error"}>
                                    {formatAmount(balance)} €
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Transactions aujourd’hui */}
            <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{t("home.today_transactions")}</h2>
                <TransactionsTable items={todayTx} />
            </section>

            {/* Transactions demain */}
            <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{t("home.tomorrow_transactions")}</h2>
                <TransactionsTable items={tomorrowTx} />
            </section>
        </div>
    );
}

function TransactionsTable({ items }: { items: Transaction[] }) {
    if (!items.length) {
        return <div className="card">—</div>;
    }

    return (
        <div className="card bg-bg-soft p-4 rounded-lg overflow-x-auto">
            <table className="table w-full border-collapse">
                <tbody>
                    {items.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-700">
                            <td>{tx.transaction_type}</td>
                            <td>{tx.transaction_date}</td>
                            <td className={tx.amount >= 0 ? "text-success" : "text-error"} style={{ textAlign: "right" }}>
                                {formatAmount(tx.amount)} €
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
