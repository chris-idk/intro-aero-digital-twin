import { describe, expect, test } from "vitest";

import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  test("converts the Section 8 reference angle to the specified Cm result", () => {
    const cm = calculateCm(0.04, -0.8, 2.86);

    expect(cm).toBeCloseTo(0.000066866712, 10);
    expect(isTrimmed(cm)).toBe(false);
  });

  test("calculates the Section 8 reference trim angle", () => {
    const trimAngleDeg = calculateTrimAngleDeg(0.04, -0.8);

    expect(trimAngleDeg).toBeCloseTo(2.864788976, 8);
  });

  test("calculates the Section 8 reference disturbance response", () => {
    const deltaCm = calculateDeltaCm(-0.8, 2);

    expect(deltaCm).toBeCloseTo(-0.02792526803, 10);
    expect(classifyDisturbance(2, deltaCm)).toBe("restoring");
  });

  // Section 9.2 was not completed in the supplied specification.
  // No behavioral verification case is invented here.

  // Section 9.3 was not completed in the supplied specification.
  // No boundary/sanity verification case is invented here.
});