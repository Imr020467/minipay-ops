import HiddenAmount from "@/components/HiddenAmount";

export default async function Wallet() {
  const res = await fetch("http://localhost:8080/api/wallets/1", {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <section className="p-8">
        <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
        <p className="mt-4 text-red-600">Could not load wallet.</p>
      </section>
    );
  }

  const wallet = await res.json();

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: wallet.currency,
  }).format(Number(wallet.balance));

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>

      <div className="mt-6 max-w-md rounded-2xl bg-[#0B1220] p-6 text-white shadow-lg">
        <p className="text-sm text-slate-400">Available Balance</p>
        <p className="mt-2">
          <HiddenAmount value={formatted} className="text-4xl font-bold" />
        </p>

        <div className="mt-6 flex justify-between text-sm text-slate-400">
          <span>Wallet ID: {wallet.id}</span>
          <span>{wallet.currency}</span>
        </div>
      </div>
    </section>
  );
}