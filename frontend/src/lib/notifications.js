const STORAGE_KEY = "minipay_notifications";
export const NOTIFICATIONS_EVENT = "minipay-notifications-updated";

export function getNotifications() {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const items = saved ? JSON.parse(saved) : [];

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveNotifications(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

    window.dispatchEvent(
      new Event(NOTIFICATIONS_EVENT)
    );

    return true;
  } catch {
    return false;
  }
}

export function addNotification({
  title,
  message,
  type = "info",
}) {
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const items = getNotifications();

  if (!saveNotifications([notification, ...items])) {
    return null;
  }

  return notification;
}

export function markNotificationRead(id) {
  const items = getNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );

  saveNotifications(items);
}

export function markAllNotificationsRead() {
  const items = getNotifications().map((item) => ({
    ...item,
    read: true,
  }));

  saveNotifications(items);
}

export function deleteNotification(id) {
  const items = getNotifications().filter(
    (item) => item.id !== id
  );

  saveNotifications(items);
}

export function clearNotifications() {
  saveNotifications([]);
}