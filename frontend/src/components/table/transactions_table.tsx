export function TransactionsTable({ items }: { items: any[] }) {
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
                {tx.amount} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
