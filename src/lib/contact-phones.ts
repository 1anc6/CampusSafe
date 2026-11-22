/**
 * Real campus phone numbers are kept out of the (public) repository. They come
 * from server environment variables set in the host's dashboard (Vercel →
 * Settings → Environment Variables), and the placeholder numbers in
 * `src/lib/campus.ts` are used until they are set:
 *
 *   SECURITY_LINE_PHONE="+91 98xxx xxxxx"
 *   RESPONDER_PHONES="sec-a=+91 98xxx xxxxx, med-1=+91 92xxx xxxxx, night=+91 90xxx xxxxx"
 *
 * Plain TypeScript with no imports, so `node --experimental-strip-types` can test it.
 */

/** Digits with optional leading +, spaces, dashes and brackets: 7–15 digits in all. */
export function cleanPhone(raw: string | undefined | null): string | null {
  const value = raw?.trim() ?? "";
  if (!/^\+?[0-9][0-9 ()-]*$/.test(value)) return null;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 ? value.replace(/\s+/g, " ") : null;
}

/**
 * `"sec-a=+91 98…, med-1=+91 92…"` → `Map { "sec-a" => "+91 98…", … }`.
 * Entries for unknown units or with an invalid number are skipped (and listed in
 * `skipped`) instead of failing, so one typo can't take the app down.
 */
export function parseResponderPhones(
  raw: string | undefined | null,
  knownIds: readonly string[],
): { phones: Map<string, string>; skipped: string[] } {
  const phones = new Map<string, string>();
  const skipped: string[] = [];
  for (const entry of (raw ?? "").split(/[,;\n]/)) {
    if (!entry.trim()) continue;
    const at = entry.indexOf("=");
    const id = at > 0 ? entry.slice(0, at).trim() : "";
    const phone = at > 0 ? cleanPhone(entry.slice(at + 1)) : null;
    if (!id || !phone || !knownIds.includes(id)) {
      skipped.push(id || entry.trim().slice(0, 12));
      continue;
    }
    phones.set(id, phone);
  }
  return { phones, skipped };
}
