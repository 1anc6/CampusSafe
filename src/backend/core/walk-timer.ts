/**
 * One-shot wake-up call for the safe-walk watchdog, booked through Upstash
 * QStash (https://upstash.com/docs/qstash).
 *
 * When a walk starts or is extended we ask QStash to call `GET /api/cron/walks`
 * once, shortly after the walk's deadline plus the server's grace period. That
 * call escalates the walk if the student never checked in — even when their
 * phone is dead and no admin console is open.
 *
 * This replaces an every-minute cron. A query every minute kept the Neon
 * database awake around the clock (it only sleeps after 5 idle minutes) and
 * used up the free plan's monthly compute. With one call per walk the database
 * sleeps whenever nobody is walking.
 *
 * QStash forwards `Upstash-Forward-Authorization` as `Authorization`, so the
 * endpoint's existing `Bearer <CRON_SECRET>` check covers these calls too. If a
 * call fails (database waking up, deploy in progress) QStash retries it.
 *
 * Needs QSTASH_TOKEN, CRON_SECRET and a public site URL (BETTER_AUTH_URL, or
 * Vercel's production URL). QSTASH_URL is optional: newer Upstash accounts get
 * a regional address, which the Vercel integration sets for you. Without them
 * this does nothing and the other triggers (open admin consoles, the student's
 * own phone, an optional external cron) still apply.
 */

/** Extra wait after deadline + grace, so the walk is surely overdue when the call lands. */
const SLACK_MS = 30_000;

type TimerConfig = { qstashUrl: string; token: string; target: string; secret: string };

function siteUrl(): string | null {
  const explicit = process.env.BETTER_AUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel.replace(/\/+$/, "")}` : null;
}

function timerConfig(): TimerConfig | null {
  const token = process.env.QSTASH_TOKEN?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  const site = siteUrl();
  if (!token || !secret || !site) return null;
  const qstashUrl = (process.env.QSTASH_URL?.trim() || "https://qstash.upstash.io").replace(
    /\/+$/,
    "",
  );
  return { qstashUrl, token, secret, target: `${site}/api/cron/walks` };
}

/**
 * Book the watchdog call for a walk due at `dueAt` that the server escalates
 * `graceMs` after that. Never throws: a failed booking is logged, and the
 * walk still starts (the phone's own countdown and open consoles still guard it).
 */
export async function scheduleWalkCheck(dueAt: string, graceMs: number): Promise<void> {
  const cfg = timerConfig();
  if (!cfg) return;
  const fireAt = new Date(dueAt).getTime() + graceMs + SLACK_MS;
  if (!Number.isFinite(fireAt)) return;
  try {
    const res = await fetch(`${cfg.qstashUrl}/v2/publish/${cfg.target}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Upstash-Method": "GET",
        "Upstash-Not-Before": String(Math.ceil(fireAt / 1000)),
        "Upstash-Retries": "3",
        "Upstash-Forward-Authorization": `Bearer ${cfg.secret}`,
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`QStash responded ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[walks] could not book the watchdog call:", err);
  }
}
