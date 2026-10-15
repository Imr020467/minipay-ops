export default async function Transactions() {
  const res = await fetch("http://localhost:8080/api/transactions", {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <section className="p-8">
        <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
        <p className="mt-4 text-red-600">Could not load transactions.</p>
      </section>
    );
  }

  const transactions = await res.json();

  const money = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v));

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-6 py-4 text-slate-700">#{t.id}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      t.type === "deposit"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{money(t.amount)}</td>
                <td className="px-6 py-4 capitalize text-slate-700">{t.status}</td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(t.created_at).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}