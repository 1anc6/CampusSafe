import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, cleanPhone, parseUnitMap } from "./contact-phones.ts";

const UNITS = ["sec-a", "med-1", "night"];

test("cleanPhone accepts common formats and tidies spacing", () => {
  assert.equal(cleanPhone("  +91  98000 00001 "), "+91 98000 00001");
  assert.equal(cleanPhone("+91-80-4450-1101"), "+91-80-4450-1101");
  assert.equal(cleanPhone("(080) 4450 1101"), null); // must start with + or a digit
  assert.equal(cleanPhone("080 4450 1101"), "080 4450 1101");
});

test("cleanPhone rejects junk, too short and too long numbers", () => {
  assert.equal(cleanPhone(undefined), null);
  assert.equal(cleanPhone(""), null);
  assert.equal(cleanPhone("call me"), null);
  assert.equal(cleanPhone("+91 123"), null);
  assert.equal(cleanPhone("+91 1234567890123456"), null);
  assert.equal(cleanPhone("tel:+919800000001"), null);
});

test("cleanName accepts names and rejects markup or numbers", () => {
  assert.equal(cleanName("  Alex   Rivera "), "Alex Rivera");
  assert.equal(cleanName("O'Neil-Smith Jr."), "O'Neil-Smith Jr.");
  assert.equal(cleanName("Zoë"), "Zoë");
  assert.equal(cleanName("मोनिका"), "मोनिका");
  assert.equal(cleanName(""), null);
  assert.equal(cleanName("<b>x</b>"), null);
  assert.equal(cleanName("Agent 47"), null);
  assert.equal(cleanName("a".repeat(61)), null);
});

test("parseUnitMap maps known units and skips the rest without echoing values", () => {
  const { values, skipped } = parseUnitMap(
    "sec-a=+91 98000 00001, med-1 = +91 92000 00002;night=+91 90000 00003\nboss=+91 99000 00004,fire=+91 98000 00005,=+91 1,",
    UNITS,
    cleanPhone,
  );
  assert.deepEqual(Object.fromEntries(values), {
    "sec-a": "+91 98000 00001",
    "med-1": "+91 92000 00002",
    night: "+91 90000 00003",
  });
  assert.deepEqual(skipped, ["boss", "fire", "(no unit id)"]);
});

test("parseUnitMap works for names too, and nothing set is empty", () => {
  const { values } = parseUnitMap("sec-a=Alex, med-1=Sam ,night=Kim", UNITS, cleanName);
  assert.deepEqual(Object.fromEntries(values), { "sec-a": "Alex", "med-1": "Sam", night: "Kim" });
  assert.equal(parseUnitMap(undefined, UNITS, cleanPhone).values.size, 0);
  assert.equal(parseUnitMap("  ", UNITS, cleanName).values.size, 0);
});

test("parseUnitMap keeps the first valid value when a unit is listed twice", () => {
  const { values, skipped } = parseUnitMap(
    "sec-a=+91 80123 45678, sec-a=+91 80987 65432",
    UNITS,
    cleanPhone,
  );
  assert.equal(values.get("sec-a"), "+91 80123 45678");
  assert.deepEqual(skipped, ["sec-a"]);
});
