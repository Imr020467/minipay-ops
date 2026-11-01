import { auth } from "@/auth";

const API = process.env.GO_API_URL ?? "http://localhost:8080";

export async function goFetch(path) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET,
        "X-User-ID": String(session.user.id),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}