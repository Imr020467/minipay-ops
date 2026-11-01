"use client";

import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS = { type: "all", direction: "all", from: "", to: "" };

const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v) || 0
  );

// Dates are sent as exact instants, so "today" means today in YOUR timezone.
function toParams(filters, page) {
  const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (filters.type !== "all") p.set("type", filters.type);
  if (filters.direction !== "all") p.set("direction", filters.direction);
  if (filters.from) {
    p.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  }
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00`);
    end.setDate(end.getDate() + 1); // include the whole "to" day
    p.set("to", end.toISOString());
  }
  return p;
}

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600";

export default function Transactions() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  const rangeBad = Boolean(filters.from && filters.to && filters.from > filters.to);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  useEffect(() => {
    if (rangeBad) return;
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/transactions?${toParams(filters, page)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");
        const list = await res.json();
        const count = Number(res.headers.get("X-Total-Count")) || 0;
        if (ignore) return;

        // If the last page vanished (e.g. after filtering), step back.
        const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setRows(list);
        setTotal(count);
        setError(false);
      } catch {
        if (!ignore) {
          setError(true);
          setRows([]);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [filters, page, rangeBad]);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clear() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
      <p className="mt-1 text-slate-500">Your deposits and transfers</p>

      {/* Filters */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="f-type" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Type
            </label>
            <select id="f-type" value={filters.type} onChange={(e) => update("type", e.target.value)} className={selectClass}>
              <option value="all">All types</option>
              <option value="deposit">Deposits</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-dir" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Direction
            </label>
            <select id="f-dir" value={filters.direction} onChange={(e) => update("direction", e.target.value)} className={selectClass}>
              <option value="all">Money in &amp; out</option>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-from" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              From
            </label>
            <input id="f-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update("from", e.target.value)} className={selectClass} />
          </div>

          <div>
            <label htmlFor="f-to" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              To
            </label>
            <input id="f-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update("to", e.target.value)} className={selectClass} />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clear}
              disabled={!filtered}
              className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>
        </div>

        {rangeBad && (
          <p className="mt-3 text-sm text-red-600">The &quot;From&quot; date must be before the &quot;To&quot; date.</p>
        )}
      </div>

      {/* List */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <p className="py-6 text-center text-sm text-red-600">
            Could not load transactions. Please try again.
          </p>
        )}

        {!error && rows === null && (
          <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
        )}

        {!error && rows?.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            {filtered ? "No transactions match these filters." : "No transactions yet."}
          </p>
        )}

        {!error && rows?.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => {
              const incoming = t.direction === "in";
              const label =
                t.type === "deposit" ? "Deposit" : incoming ? "Received" : "Sent";
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${
                        incoming ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {incoming ? "↓" : "↑"}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleString("en-IN")} · #{t.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-semibold ${incoming ? "text-green-700" : "text-red-700"}`}>
                      {incoming ? "+" : "-"}
                      {money(t.amount)}
                    </p>
                    <p className="text-xs capitalize text-slate-500">{t.status}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pager */}
        {!error && total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing {first}–{last} of {total}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}