import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { escalateOverdueWalks } from "@/backend/functions/walks";

/**
 * Backstop for the safe-walk watchdog: `GET /api/cron/walks` with
 * `Authorization: Bearer <CRON_SECRET>` escalates overdue walks even when
 * nobody has the app open. Normally a one-shot QStash call booked when each
 * walk starts or is extended lands here just after its deadline (see
 * backend/core/walk-timer.ts). Do not poll this every minute: each call wakes
 * the database, and a per-minute poll keeps Neon from ever sleeping.
 * Disabled unless CRON_SECRET is set.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/cron/walks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const escalated = await escalateOverdueWalks({ force: true });
        return Response.json({ ok: true, escalated });
      },
    },
  },
});
