/**
 * Real campus phone numbers and the names of the people on the dispatch units
 * are kept out of the (public) repository. They come from server environment
 * variables set in the host's dashboard (Vercel → Settings → Environment
 * Variables), and the placeholders in `src/lib/campus.ts` are used until set:
 *
 *   SECURITY_LINE_PHONE="+91 98xxx xxxxx"
 *   RESPONDER_PHONES="sec-a=+91 98xxx xxxxx, med-1=+91 92xxx xxxxx, night=+91 90xxx xxxxx"
 *   RESPONDER_NAMES="sec-a=Alex, med-1=Sam, night=Kim"
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

/** A person's display name: letters (any script), spaces, `.`, `'` and `-`, 1–60 characters. */
export function cleanName(raw: string | undefined | null): string | null {
  const value = raw?.trim().replace(/\s+/g, " ") ?? "";
  return value.length > 0 && value.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(value)
    ? value
    : null;
}

/**
 * `"sec-a=…, med-1=…"` → `Map { "sec-a" => …, … }`, each value checked by `clean`.
 * Entries for unknown units or with an invalid value are skipped (their unit id
 * is listed in `skipped`, never the value) so one typo can't take the app down.
 */
export function parseUnitMap(
  raw: string | undefined | null,
  knownIds: readonly string[],
  clean: (value: string) => string | null,
): { values: Map<string, string>; skipped: string[] } {
  const values = new Map<string, string>();
  const skipped: string[] = [];
  for (const entry of (raw ?? "").split(/[,;\n]/)) {
    if (!entry.trim()) continue;
    const at = entry.indexOf("=");
    const id = at > 0 ? entry.slice(0, at).trim() : "";
    const value = at > 0 ? clean(entry.slice(at + 1)) : null;
    if (!id || !value || !knownIds.includes(id)) {
      skipped.push(id || "(no unit id)");
      continue;
    }
    values.set(id, value);
  }
  return { values, skipped };
}
