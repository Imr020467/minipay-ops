"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  CircleCheck,
  AlertCircle,
  Info,
} from "lucide-react";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
  NOTIFICATIONS_EVENT,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getNotifications());
    }

    refreshNotifications();

    window.addEventListener(
      NOTIFICATIONS_EVENT,
      refreshNotifications
    );

    window.addEventListener(
      "storage",
      refreshNotifications
    );

    return () => {
      window.removeEventListener(
        NOTIFICATIONS_EVENT,
        refreshNotifications
      );

      window.removeEventListener(
        "storage",
        refreshNotifications
      );
    };
  }, []);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  function formatDate(date) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Date unavailable";
    }

    return parsed.toLocaleString("en-IN");
  }

  function getIcon(type) {
    if (type === "success") {
      return CircleCheck;
    }

    if (type === "error") {
      return AlertCircle;
    }

    return Info;
  }

  return (
    <section className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              All your MiniPay messages in one place.
            </p>
          </div>

          {notifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsRead()}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <CheckCheck size={17} />
                  Mark all read
                </button>
              )}

              <button
                onClick={() => clearNotifications()}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={17} />
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Bell size={30} />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No notifications yet
              </h2>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Deposit and transfer messages will appear here
                after they are connected to notifications.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => {
                const Icon = getIcon(item.type);

                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 p-4 transition hover:bg-slate-50 ${
                      !item.read ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        item.type === "success"
                          ? "bg-emerald-100 text-emerald-600"
                          : item.type === "error"
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon size={20} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        markNotificationRead(item.id);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {item.title}
                        </span>

                        {!item.read && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(item.createdAt)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteNotification(item.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                      className="self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}