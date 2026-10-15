"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { addNotification } from "@/lib/notifications";

const money = (v, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(Number(v));

export default function Transfer() {
  const toast = useToast();

  const [toWallet, setToWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_wallet_id: 1,
          to_wallet_id: Number(toWallet),
          amount,
        }),
      });

      if (!res.ok) {
        const text = (await res.text()).trim();

        const message =
          text.startsWith("<") || text.length > 200
            ? "Transfer failed. Please try again."
            : text;

        // Save the failed transfer notification.
        addNotification({
          title: "Transfer Failed",
          message,
          type: "error",
        });

        toast.error(message);
      } else {
        const data = await res.json();

        const message =
          `${money(data.amount)} sent to wallet #${data.to_wallet_id}. ` +
          `Transaction #${data.transaction_id}`;

        // Save the successful transfer notification.
        addNotification({
          title: "Transfer Successful",
          message,
          type: "success",
        });

        // Keep the existing success toast.
        toast.success(message);

        setToWallet("");
        setAmount("");
      }
    } catch {
      const message = "Could not reach the server.";

      addNotification({
        title: "Transfer Failed",
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
        Transfer
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm font-medium text-slate-600">
          Recipient wallet ID
        </label>

        <input
          type="text"
          inputMode="numeric"
          placeholder="2"
          value={toWallet}
          onChange={(e) => setToWallet(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
        />

        <label className="mt-4 block text-sm font-medium text-slate-600">
          Amount (INR)
        </label>

        <input
          type="text"
          inputMode="decimal"
          placeholder="100.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
        />

        <button
          type="submit"
          disabled={
            loading ||
            toWallet === "" ||
            amount === ""
          }
          className="mt-4 w-full rounded-lg bg-blue-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Money"}
        </button>
      </form>
    </section>
  );
}