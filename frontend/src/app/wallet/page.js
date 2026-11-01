"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v) || 0
  );

function Icon({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const EyeIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOffIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.7A17 17 0 0 0 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);

export default function Wallet() {
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setMe(await res.json());
      setFailed(false);
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    const ok = await load();
    if (ok) toast.success("Balance updated");
    else toast.error("Could not load your wallet.");
  }

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
      <p className="mt-1 text-slate-500">View your wallet balance and details</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {/* Balance card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d2d6e] to-[#0a1a45] p-9 text-white shadow-lg">
            <div className="relative z-10 flex items-start justify-between">
              <p className="text-lg font-medium">Available Balance</p>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <Icon size={30}>
                  <path d="M3 7a2 2 0 0 1 2-2h13v4" />
                  <path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
                  <path d="M21 12h-5a2 2 0 0 0 0 4h5z" />
                </Icon>
              </span>
            </div>

            <div className="relative z-10 mt-3 flex items-center gap-4">
              <p className="text-4xl font-bold tracking-wide">
                {me && show ? money(me.balance) : "●●●●●●"}
              </p>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide balance" : "Show balance"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                {show ? <EyeIcon size={22} /> : <EyeOffIcon size={22} />}
              </button>
            </div>

            <p className="relative z-10 mt-14 text-lg">
              Wallet ID: {me ? me.wallet_id : "—"}
            </p>

            <svg
              className="pointer-events-none absolute bottom-0 right-0 w-3/4 text-white/5"
              viewBox="0 0 600 160"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M0 160V110C120 100 220 140 340 110C440 85 520 40 600 20V160Z" />
            </svg>
          </div>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              disabled={!me}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-4 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {show ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              {show ? "Hide balance" : "Show balance"}
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              <span className={loading ? "animate-spin" : ""}>
                <Icon size={20}>
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <path d="M21 3v6h-6" />
                </Icon>
              </span>
              Refresh balance
            </button>
          </div>
        </div>

        {/* Details */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xl font-bold text-slate-900">Wallet Details</p>

          {loading && !me && <p className="mt-5 text-slate-500">Loading…</p>}

          {failed && !me && (
            <div className="mt-5">
              <p className="text-sm text-red-600">Could not load your wallet.</p>
              <button
                type="button"
                onClick={load}
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Try again
              </button>
            </div>
          )}

          {me && (
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-semibold text-slate-900">{me.name}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="truncate font-semibold text-slate-900">{me.email}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Wallet ID</dt>
                <dd className="font-semibold text-slate-900">{me.wallet_id}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Currency</dt>
                <dd className="font-semibold text-slate-900">{me.currency}</dd>
              </div>
            </dl>
          )}
        </aside>
      </div>

      {/* Protection banner */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Icon size={30}>
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </Icon>
          </span>
          <div>
            <p className="text-xl font-bold text-slate-900">Your wallet is protected</p>
            <p className="text-slate-500">Your balance stays hidden until you choose to show it.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-5 py-4 text-blue-900">
          <Icon size={22}>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </Icon>
          <div>
            <p className="font-semibold">Keep your PIN private</p>
            <p className="text-sm text-blue-700">Never share your PIN with anyone.</p>
          </div>
        </div>
      </div>
    </section>
  );
}