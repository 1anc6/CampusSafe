import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPhone, parseResponderPhones } from "./contact-phones.ts";

const UNITS = ["sec-a", "med-1", "night", "fire"];

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

test("parseResponderPhones maps known units and skips the rest", () => {
  const { phones, skipped } = parseResponderPhones(
    "sec-a=+91 98000 00001, med-1 = +91 92000 00002;night=+91 90000 00003\nboss=+91 99000 00004,fire=nope,=+91 1,",
    UNITS,
  );
  assert.deepEqual(Object.fromEntries(phones), {
    "sec-a": "+91 98000 00001",
    "med-1": "+91 92000 00002",
    night: "+91 90000 00003",
  });
  assert.deepEqual(skipped, ["boss", "fire", "=+91 1"]);
});

test("parseResponderPhones with nothing set is empty", () => {
  assert.equal(parseResponderPhones(undefined, UNITS).phones.size, 0);
  assert.equal(parseResponderPhones("  ", UNITS).phones.size, 0);
});
