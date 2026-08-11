import { SESSION_COOKIE, verifySession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookies = req.headers.get("cookie") ?? "";
  const token = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const session = verifySession(token);
  if (!session) {
    return new Response(JSON.stringify({ error: "no session" }), { status: 401 });
  }
  return Response.json(session);
}
