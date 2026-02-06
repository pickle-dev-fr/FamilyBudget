import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { createCompte, getComptes, getComptesBalance, updateCompte, type Compte } from "@/api/comptes.api";
import { formatAmount } from "@/utils";
import ComptesModal, { type CompteFormData } from "./ComptesModal";

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
    await loadComptes(); // fonction que tu as déjà extraite
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
                <td colSpan={3}>—</td>
              </tr>
            )}

            {comptes.map((a) => {
              const balance = balances[a.id];

              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className={balance >= 0 ? "ok" : "nok"}>
                    {formatAmount(balance)} €
                  </td>
                  <td>{a.start_day}</td>
                  <td>
                    <button onClick={() => setEditingAccount(a)}>
                      {t("accounts.edit")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
        onSubmit={async (data) => {
          if (!editingAccount) return;

          await updateCompte(editingAccount.id, {
            name: data.name,
            start_day: data.startDay,
            initial_value: data.initialValue,
          });

          setEditingAccount(null);
          await loadComptes(); // refetch liste
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
