import { createServerFn } from "@tanstack/react-start";
import { optionalAuthMiddleware } from "@/lib/auth/middleware";
import type { Profile } from "@/lib/types";
import { ensureBootstrapAccounts } from "@/backend/core/accounts";
import { getOrCreateProfile } from "@/backend/core/helpers";
import { ensureSeedData } from "@/backend/core/seed";
import { escalateOverdueWalks } from "./walks";
import { securityLinePhone, syncResponderContacts } from "@/backend/core/contact-phones";
import { SECURITY_LINE } from "@/lib/campus";

/**
 * Who is visiting, with the role read from the database on every call — the
 * single input to every route guard (`src/lib/auth/guards.ts`). `null` when
 * signed out. Never trust a role sent from the browser; this is the source.
 */
export const getViewer = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<Profile | null> => {
    if (!context.userId) return null;
    // Safe-walk watchdog rides along with navigation; never delays the page.
    void escalateOverdueWalks().catch((err) => console.error("[walks] watchdog failed:", err));
    await ensureSeedData();
    // Real unit names and numbers from RESPONDER_NAMES / RESPONDER_PHONES (once per server instance; never throws).
    await syncResponderContacts();
    return getOrCreateProfile(context.userId);
  });

/**
 * The campus security line for the call buttons. Read on the server from
 * SECURITY_LINE_PHONE so the real number is never in the repository or the
 * JavaScript bundle; loaded once per visit by the root route.
 */
export const getSecurityLine = createServerFn({ method: "GET" }).handler(async () => ({
  label: SECURITY_LINE.label,
  phone: securityLinePhone(),
}));

/**
 * Called by the login page loader: makes sure env-declared bootstrap accounts
 * exist before anyone tries to sign in. Takes no input and returns nothing
 * sensitive; idempotent and memoized per server process.
 */
export const prepareSignIn = createServerFn({ method: "GET" }).handler(async () => {
  await ensureBootstrapAccounts();
  return { ok: true as const };
});
