import { getSql } from "@/backend/db";
import { RESPONDER_UNITS, SECURITY_LINE } from "@/lib/campus";
import { cleanPhone, parseResponderPhones } from "@/lib/contact-phones";

/**
 * Server side of the private phone numbers (see `src/lib/contact-phones.ts`):
 * they live in environment variables on the host, never in the repository.
 */

/** The campus security line to show in the app: SECURITY_LINE_PHONE, else the placeholder. */
export function securityLinePhone(): string {
  return cleanPhone(process.env.SECURITY_LINE_PHONE) ?? SECURITY_LINE.phone;
}

const state = globalThis as typeof globalThis & { __responderPhonesSynced__?: Promise<void> };

/**
 * Copy RESPONDER_PHONES into the private `responders` table once per server
 * instance, so every screen that reads a unit's phone (admin responders list,
 * the assigned unit on an SOS) shows the real number. Only rows whose number
 * differs are written. Never throws: a failure is logged and retried next call.
 */
export function syncResponderPhones(): Promise<void> {
  state.__responderPhonesSynced__ ??= (async () => {
    const { phones, skipped } = parseResponderPhones(
      process.env.RESPONDER_PHONES,
      RESPONDER_UNITS.map((u) => u.id),
    );
    if (skipped.length) {
      console.warn(`[phones] RESPONDER_PHONES: skipped invalid entries: ${skipped.join(", ")}`);
    }
    if (phones.size === 0) return;
    const sql = await getSql();
    for (const [id, phone] of phones) {
      await sql`
        update responders set phone = ${phone}
        where id = ${id} and phone is distinct from ${phone}
      `;
    }
  })().catch((err: unknown) => {
    state.__responderPhonesSynced__ = undefined;
    console.error("[phones] could not apply RESPONDER_PHONES:", err);
  });
  return state.__responderPhonesSynced__;
}
