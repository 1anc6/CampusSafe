import { getSql } from "@/backend/db";
import { RESPONDER_UNITS, SECURITY_LINE } from "@/lib/campus";
import { cleanName, cleanPhone, parseUnitMap } from "@/lib/contact-phones";

/**
 * Server side of the private contact details (see `src/lib/contact-phones.ts`):
 * real numbers and names live in environment variables on the host, never in
 * the repository.
 */

/** The campus security line to show in the app: SECURITY_LINE_PHONE, else the placeholder. */
export function securityLinePhone(): string {
  return cleanPhone(process.env.SECURITY_LINE_PHONE) ?? SECURITY_LINE.phone;
}

const state = globalThis as typeof globalThis & { __responderContactsSynced__?: Promise<void> };

/**
 * Copy RESPONDER_PHONES and RESPONDER_NAMES into the private `responders`
 * table once per server instance, so every screen that reads a unit (the
 * dispatch list, the admin responders page, the assigned unit on an SOS) shows
 * the real person and number. Only rows that differ are written. Never throws:
 * a failure is logged and retried on the next call.
 */
export function syncResponderContacts(): Promise<void> {
  state.__responderContactsSynced__ ??= (async () => {
    const ids = RESPONDER_UNITS.map((u) => u.id);
    const phones = parseUnitMap(process.env.RESPONDER_PHONES, ids, cleanPhone);
    const names = parseUnitMap(process.env.RESPONDER_NAMES, ids, cleanName);
    for (const [variable, { skipped }] of [
      ["RESPONDER_PHONES", phones],
      ["RESPONDER_NAMES", names],
    ] as const) {
      if (skipped.length) {
        console.warn(`[contacts] ${variable}: skipped invalid entries for ${skipped.join(", ")}`);
      }
    }
    if (phones.values.size === 0 && names.values.size === 0) return;
    const sql = await getSql();
    for (const [id, phone] of phones.values) {
      await sql`
        update responders set phone = ${phone}
        where id = ${id} and phone is distinct from ${phone}
      `;
    }
    for (const [id, name] of names.values) {
      await sql`
        update responders set name = ${name}
        where id = ${id} and name is distinct from ${name}
      `;
    }
  })().catch((err: unknown) => {
    state.__responderContactsSynced__ = undefined;
    console.error("[contacts] could not apply RESPONDER_PHONES / RESPONDER_NAMES:", err);
  });
  return state.__responderContactsSynced__;
}
