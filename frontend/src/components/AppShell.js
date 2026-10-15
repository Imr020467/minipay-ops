"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Sidebar from "./Sidebar";
import ProfileAvatar from "./ProfileAvatar";

const titles = {
  "/": "Dashboard",
  "/wallet": "My Wallet",
  "/deposit": "Deposit",
  "/transfer": "Transfer",
  "/transactions": "Transactions",
};

export default function AppShell({ children, user }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const title = titles[pathname] ?? "MiniPay";

  if (pathname === "/login") return children;

  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      <div
        className={`sticky top-0 grid h-screen shrink-0 transition-[grid-template-columns] duration-300 ease-in-out ${
          open ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
        }`}
      >
        <div className="h-full min-w-0 overflow-hidden">
          <Sidebar />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle sidebar"
              title="Show / hide menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <ProfileAvatar name={user?.name ?? "Guest"} image={user?.image} />
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/login" })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}