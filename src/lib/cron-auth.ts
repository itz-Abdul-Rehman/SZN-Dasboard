import { NextResponse } from "next/server";

/**
 * Guards a cron endpoint. Returns a 401 NextResponse if the request is not an
 * authorized cron call, or null if it should proceed.
 *
 * When CRON_SECRET is unset the guard is a no-op (all calls allowed) so nothing
 * breaks before the secret is configured. Once set, callers must pass it as
 * `?key=SECRET` or an `Authorization: Bearer SECRET` header.
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("key") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (provided === secret) return null;
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
