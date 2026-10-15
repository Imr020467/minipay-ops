"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { addNotification } from "@/lib/notifications";

const money = (v, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(Number(v));

export default function Deposit() {
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet_id: 1,
          amount,
        }),
      });

      if (!res.ok) {
        const text = (await res.text()).trim();

        const message =
          text.startsWith("<") || text.length > 200
            ? "Request failed. Please try again."
            : text;

        addNotification({
          title: "Deposit Failed",
          message,
          type: "error",
        });

        toast.error(message);
      } else {
        const data = await res.json();

        const message =
          `${money(data.amount, data.currency)} deposited. ` +
          `New balance: ${money(data.balance, data.currency)}`;

        // Save the successful deposit notification.
        addNotification({
          title: "Deposit Successful",
          message,
          type: "success",
        });

        // Keep the existing success toast.
        toast.success(message);

        setAmount("");
      }
    } catch {
      const message = "Could not reach the server.";

      addNotification({
        title: "Deposit Failed",
        message,
        type: "error",
      });

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Deposit
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm font-medium text-slate-600">
          Amount (INR)
        </label>

        <input
          type="text"
          inputMode="decimal"
          placeholder="500.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
        />

        <button
          type="submit"
          disabled={loading || amount === ""}
          className="mt-4 w-full rounded-lg bg-blue-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Depositing..." : "Deposit"}
        </button>
      </form>
    </section>
  );
}