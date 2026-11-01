"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

const MIN = 1;
const MAX = 100000;
const QUICK = [500, 1000, 2000, 5000];

const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v) || 0
  );

function clean(raw) {
  let v = raw.replace(/[^0-9.]/g, "");
  const i = v.indexOf(".");
  if (i !== -1) {
    v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 2);
  }
  if (v.startsWith(".")) v = "0" + v;
  v = v.replace(/^0+(?=\d)/, "");
  return v.slice(0, 10);
}

function validate(v) {
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Enter a valid amount, up to 2 decimals.";
  const n = Number(v);
  if (n < MIN) return `Minimum deposit is ${money(MIN)}.`;
  if (n > MAX) return `Maximum per deposit is ${money(MAX)}.`;
  return null;
}

export default function Deposit() {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [pop, setPop] = useState(false);
  const [recent, setRecent] = useState(null);

  const problem = amount ? validate(amount) : null;
  const valid = amount !== "" && !problem;

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const list = await res.json();
      setRecent(list.filter((t) => t.type === "deposit").slice(0, 3));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!reviewing) return;
    function onKey(e) {
      if (e.key === "Escape" && !loading) setReviewing(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reviewing, loading]);

  function onSubmit(e) {
    e.preventDefault();
    if (valid) setReviewing(true);
  }

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const text = (await res.text()).trim();
        setReviewing(false);
        toast.error(
          text.startsWith("<") || text.length > 200
            ? "Request failed. Please try again."
            : text
        );
        return;
      }

      const data = await res.json();
      setReviewing(false);
      setAmount("");
      setDone({ amount: data.amount, id: data.transaction_id });
      setPop(false);
      setTimeout(() => setPop(true), 30);
      toast.success(`${money(data.amount)} deposited`);
      loadRecent();
    } catch {
      setReviewing(false);
      toast.error("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">Deposit</h1>
      <p className="mt-1 text-slate-500">Add money to your wallet</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Form or success */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-3">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 transition-transform duration-500 ${
                  pop ? "scale-100" : "scale-0"
                }`}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h2 className="mt-6 text-2xl font-bold text-slate-900">Deposit successful</h2>
              <p className="mt-2 text-4xl font-bold text-green-700">{money(done.amount)}</p>
              <p className="mt-2 text-sm text-slate-500">Transaction #{done.id}</p>

              <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDone(null)}
                  className="rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800"
                >
                  Deposit again
                </button>
                <Link
                  href="/transactions"
                  className="rounded-xl border border-slate-300 py-3 text-center font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  View history
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Deposit to</p>
                  <p className="font-semibold text-slate-900">My wallet</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  INR
                </span>
              </div>

              <label htmlFor="amount" className="mt-6 block text-sm font-medium text-slate-600">
                Amount
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
                  ₹
                </span>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(clean(e.target.value))}
                  aria-invalid={Boolean(problem)}
                  className={`w-full rounded-2xl border-2 py-4 pl-12 pr-24 text-3xl font-bold text-slate-900 outline-none transition ${
                    problem
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-600"
                  }`}
                />
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className={`mt-2 min-h-5 text-sm ${problem ? "text-red-600" : "text-slate-500"}`}>
                {problem ?? (valid ? `You are adding ${money(amount)}` : `Between ${money(MIN)} and ${money(MAX)} per deposit`)}
              </p>

              <p className="mt-4 text-sm font-medium text-slate-600">Quick amounts</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`rounded-xl border-2 py-2.5 font-semibold transition ${
                      amount === String(q)
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    ₹{q.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!valid}
                className="mt-8 w-full rounded-xl bg-blue-700 py-4 text-lg font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {valid ? `Review deposit of ${money(amount)}` : "Enter an amount"}
              </button>
            </form>
          )}
        </div>

        {/* Right column */}
        <aside className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="font-semibold text-slate-900">Summary</p>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Deposit to</dt>
                <dd className="font-semibold text-slate-900">My wallet</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold text-slate-900">{valid ? money(amount) : "—"}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Fee</dt>
                <dd className="font-semibold text-slate-900">₹0.00</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="text-lg font-bold text-slate-900">{valid ? money(amount) : "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Recent deposits</p>
              <Link href="/transactions" className="text-sm font-semibold text-blue-700 hover:underline">
                View all →
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-slate-100">
              {recent === null && <li className="py-4 text-sm text-slate-500">Loading…</li>}
              {recent?.length === 0 && <li className="py-4 text-sm text-slate-500">No deposits yet.</li>}
              {recent?.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                      ↓
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Deposit</p>
                      <p className="text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-700">+{money(t.amount)}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Review dialog */}
      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !loading && setReviewing(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900">Review deposit</h2>
            <p className="mt-1 text-sm text-slate-500">Check the details before you confirm.</p>

            <p className="mt-6 text-center text-4xl font-bold text-slate-900">{money(amount)}</p>

            <dl className="mt-6 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">To</dt>
                <dd className="font-semibold text-slate-900">My wallet</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Fee</dt>
                <dd className="font-semibold text-slate-900">₹0.00</dd>
              </div>
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewing(false)}
                disabled={loading}
                className="rounded-xl border border-slate-300 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={loading}
                autoFocus
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-70"
              >
                {loading && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? "Depositing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}