"use client";

import { useEffect, useState } from "react";

const KEY = "minipay_hide_balance";

export default function HiddenAmount({ value, className = "" }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null) setHidden(saved === "1");
    } catch {}
  }, []);

  function toggle() {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <span className="inline-flex items-center gap-3">
      <span className={className}>{hidden ? "••••••" : value}</span>
      <button
        type="button"
        onClick={toggle}
        aria-label={hidden ? "Show balance" : "Hide balance"}
        title={hidden ? "Show balance" : "Hide balance"}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-current transition hover:bg-white/25"
      >
        {hidden ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}