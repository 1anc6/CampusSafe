import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMPUS,
  campusProximity,
  formatKm,
  headingLabel,
  nearestLocation,
  walkMinutes,
} from "./campus.ts";

describe("campus helpers", () => {
  it("classifies the campus centre as on campus", () => {
    assert.equal(campusProximity(CAMPUS.center).zone, "on");
  });

  it("formats walking distances for people, not coordinates", () => {
    assert.equal(formatKm(846), "850 m");
    assert.equal(formatKm(1240), "1.2 km");
    assert.equal(walkMinutes(0), 1);
    assert.equal(walkMinutes(780), 10);
  });

  it("finds a nearby landmark and gives a useful direction", () => {
    assert.equal(nearestLocation(CAMPUS.center).name, "Vishwakarma Block");
    assert.equal(headingLabel(CAMPUS.center, { lat: CAMPUS.center.lat + 0.001, lng: CAMPUS.center.lng }), "north");
  });
});
