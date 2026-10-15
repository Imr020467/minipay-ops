"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Wallet,
  CirclePlus,
  ArrowLeftRight,
  ReceiptText,
  WalletCards,
  Bell,
} from "lucide-react";

import {
  getNotifications,
  NOTIFICATIONS_EVENT,
} from "@/lib/notifications";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "My Wallet", href: "/wallet", icon: Wallet },
  { name: "Deposit", href: "/deposit", icon: CirclePlus },
  { name: "Transfer", href: "/transfer", icon: ArrowLeftRight },
  { name: "Transactions", href: "/transactions", icon: ReceiptText },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [backendStatus, setBackendStatus] = useState("checking");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function checkBackend() {
      try {
        const response = await fetch("/backend/health", {
          cache: "no-store",
        });

        if (active) {
          setBackendStatus(
            response.ok ? "connected" : "offline"
          );
        }
      } catch {
        if (active) setBackendStatus("offline");
      }
    }

    checkBackend();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function updateUnreadCount() {
      const items = getNotifications();

      setUnreadCount(
        items.filter((item) => !item.read).length
      );
    }

    updateUnreadCount();

    window.addEventListener(
      NOTIFICATIONS_EVENT,
      updateUnreadCount
    );

    window.addEventListener(
      "storage",
      updateUnreadCount
    );

    return () => {
      window.removeEventListener(
        NOTIFICATIONS_EVENT,
        updateUnreadCount
      );

      window.removeEventListener(
        "storage",
        updateUnreadCount
      );
    };
  }, []);

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[#0B1220] text-white">
      <Link
        href="/"
        className="flex h-[74px] items-center gap-3 px-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12C7B5] text-[#062D2B]">
          <WalletCards size={27} strokeWidth={2.5} />
        </div>

        <span className="text-[26px] font-bold tracking-tight">
          MiniPay
        </span>
      </Link>

      <nav className="mt-7 flex flex-col gap-2 px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-12 items-center gap-4 rounded-xl px-4 transition-colors ${
                isActive
                  ? "bg-[#2157B5] text-white shadow-md"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon size={23} strokeWidth={1.9} />

              <span className="text-[15px] font-medium">
                {item.name}
              </span>

              {item.name === "Notifications" &&
                unreadCount > 0 && (
                  <span className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendStatus === "connected"
                  ? "bg-emerald-400"
                  : backendStatus === "offline"
                    ? "bg-red-400"
                    : "bg-amber-400"
              }`}
            />

            <span className="text-sm font-medium">
              {backendStatus === "connected"
                ? "Backend Connected"
                : backendStatus === "offline"
                  ? "Backend Offline"
                  : "Checking Backend..."}
            </span>
          </div>

          <p className="mt-2 pl-[18px] text-xs text-slate-300">
            http://localhost:8080
          </p>
        </div>
      </div>
    </aside>
  );
}