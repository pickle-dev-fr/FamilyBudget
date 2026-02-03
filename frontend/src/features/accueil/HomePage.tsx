import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatAmount } from "@/utils";
import { getComptes, getComptesBalance, type Compte } from "@/api/comptes.api";
import { getTotalBalance } from "@/api/stats.api";
import {
  getTodayTransactions,
  getTomorrowTransactions,
  type Transaction
} from "@/api/transactions.api";

export default function HomePage() {
  const { t } = useTranslation();

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
    <div className="page">
      <h1 className="page-title">{t("home.title")}</h1>

      {/* Solde total */}
      <section>
        <div className="card metric">
          <div className="metric-label">{t("home.total_balance")}</div>
          <div className="metric-value">
            {formatAmount(total)} €
          </div>
        </div>
      </section>

      {/* Comptes - cartes */}
      <section>
        <h2 className="section-title">{t("home.accounts_list")}</h2>

        <div className="grid grid-2">
          {accounts.map((a) => {
            const balance = balances[a.id];

            return (
              <div key={a.id} className="card account">
                <div className="account-name">{a.name}</div>
                <div
                  className={`account-balance ${
                    balance >= 0 ? "ok" : "nok"
                  }`}
                >
                  {formatAmount(balance)} €
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comptes - tableau */}
      <section>
        <h2 className="section-title">
          {t("home.accounts_table")}
        </h2>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>{t("home.account_name")}</th>
                <th>{t("home.account_balance")}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={2}>—</td>
                </tr>
              )}

              {accounts.map((a) => {
                const balance = balances[a.id];

                return (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className={balance >= 0 ? "ok" : "nok"}>
                      {formatAmount(balance)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transactions aujourd’hui */}
      <section>
        <h2 className="section-title">
          {t("home.today_transactions")}
        </h2>
        <TransactionsTable items={todayTx} />
      </section>

      {/* Transactions demain */}
      <section>
        <h2 className="section-title">
          {t("home.tomorrow_transactions")}
        </h2>
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
    <div className="card">
      <table className="table">
        <tbody>
          {items.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.label}</td>
              <td>{tx.account_name}</td>
              <td className={tx.amount >= 0 ? "ok" : "nok"}>
                {formatAmount(tx.amount)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
