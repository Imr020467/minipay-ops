import { auth } from "@/auth";

const API = process.env.GO_API_URL ?? "http://127.0.0.1:8080";

// Only these Go endpoints can be reached from the browser.
const ALLOWED = new Set(["me", "transactions", "deposits", "transfers"]);

async function forward(req, { params }) {
  // 1. Must be logged in. The user ID comes from the session, never the browser.
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Only allow-listed endpoints (this also blocks /api/internal/*).
  const { path } = await params;
  if (path.length !== 1 || !ALLOWED.has(path[0])) {
    return new Response("Not found", { status: 404 });
  }

  // 3. CSRF defence: changes must come from our own site.
  const hasBody = !["GET", "HEAD"].includes(req.method);
  if (hasBody) {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const { search } = new URL(req.url);

  try {
    const res = await fetch(`${API}/api/${path[0]}${search}`, {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET,
        "X-User-ID": String(session.user.id),
      },
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });

    const headers = {
      "Content-Type": res.headers.get("content-type") ?? "text/plain",
    };
    const total = res.headers.get("x-total-count");
    if (total) headers["X-Total-Count"] = total;

    return new Response(await res.text(), { status: res.status, headers });
  } catch {
    return new Response("Backend unavailable", { status: 502 });
  }
}

export { forward as GET, forward as POST };