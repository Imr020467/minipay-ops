import Link from "next/link";
import { auth } from "@/auth";

const API = "http://localhost:8080";
const TZ = "Asia/Kolkata";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(v));

const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

async function getTransactions() {
  try {
    const res = await fetch(`${API}/api/transactions`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const [transactions, session] = await Promise.all([
    getTransactions(),
    auth(),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (!transactions) {
    return (
      <section className="p-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          Could not reach the backend. Make sure the Go server is running.
        </p>
      </section>
    );
  }

  const hour =
    Number(
      new Date().toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: TZ,
      })
    ) % 24;
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

  // This month
  const monthKey = dayKey(new Date()).slice(0, 7);
  const thisMonth = transactions.filter((t) =>
    dayKey(t.created_at).startsWith(monthKey)
  );
  const sum = (list, type) =>
    list
      .filter((t) => t.type === type)
      .reduce((total, t) => total + Number(t.amount), 0);

  // Last 7 days
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: dayKey(d),
      label: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: TZ }),
      in: 0,
      out: 0,
    };
  });
  transactions.forEach((t) => {
    const day = week.find((d) => d.key === dayKey(t.created_at));
    if (!day) return;
    if (t.type === "deposit") day.in += Number(t.amount);
    else day.out += Number(t.amount);
  });
  const max = Math.max(1, ...week.flatMap((d) => [d.in, d.out]));
  const bar = (v) => (v > 0 ? `${Math.max(4, Math.round((v / max) * 100))}%` : "0%");

  const actions = [
    { href: "/deposit", label: "Deposit", icon: "↓", color: "bg-green-100 text-green-700" },
    { href: "/transfer", label: "Send money", icon: "⇄", color: "bg-blue-100 text-blue-700" },
    { href: "/transactions", label: "Transactions", icon: "≡", color: "bg-violet-100 text-violet-700" },
    { href: "/wallet", label: "My wallet", icon: "▣", color: "bg-amber-100 text-amber-800" },
  ];

  const stats = [
    { label: "Money in this month", value: money(sum(thisMonth, "deposit")), note: "Deposits", noteColor: "text-green-700" },
    { label: "Money out this month", value: money(sum(thisMonth, "transfer")), note: "Transfers", noteColor: "text-blue-700" },
    { label: "Transactions", value: thisMonth.length, note: "This month", noteColor: "text-slate-500" },
  ];

  return (
    <section className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-slate-500">{today}</p>
      </div>

      {/* Privacy banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900">
        <p className="text-sm font-medium">
          🔒 Your balance is private. View it in My Wallet.
        </p>
        <Link
          href="/wallet"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View wallet
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold ${a.color}`}>
              {a.icon}
            </span>
            <span className="text-sm font-semibold text-slate-900">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className={`mt-1 text-xs font-medium ${s.noteColor}`}>{s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Weekly chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Last 7 days</p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-green-600" /> Money in
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Money out
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-3">
            {week.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="flex h-40 items-end gap-1"
                  title={`In ${money(d.in)} / Out ${money(d.out)}`}
                >
                  <div className="w-3 rounded-t bg-green-600" style={{ height: bar(d.in) }} />
                  <div className="w-3 rounded-t bg-blue-600" style={{ height: bar(d.out) }} />
                </div>
                <span className="text-xs text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Recent activity</p>
            <Link href="/transactions" className="text-sm font-semibold text-blue-700 hover:underline">
              View all →
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {transactions.length === 0 && (
              <li className="py-6 text-center text-slate-500">No activity yet.</li>
            )}
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
                      t.type === "deposit"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.type === "deposit" ? "↓" : "⇄"}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize text-slate-900">{t.type}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleString("en-IN", { timeZone: TZ })}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    t.type === "deposit" ? "text-green-700" : "text-slate-900"
                  }`}
                >
                  {t.type === "deposit" ? "+" : "−"}
                  {money(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}