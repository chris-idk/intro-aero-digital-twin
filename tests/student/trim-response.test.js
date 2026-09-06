import { describe, expect, it } from "vitest";

import {
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("implements the completed numerical verification case", () => {
    const cm = calculateCm(0.04, -0.8, 2.86);
    const trimAngleDeg = calculateTrimAngleDeg(0.04, -0.8);
    const deltaCm = calculateDeltaCm(-0.8, 2.0);

    expect(cm).toBeCloseTo(0.000066866712, 9);
    expect(trimAngleDeg).toBeCloseTo(2.864788976, 6);
    expect(deltaCm).toBeCloseTo(-0.02792526803, 9);
    expect(isTrimmed(cm)).toBe(false);
    expect(classifyDisturbance(-0.8, 2.0)).toBe("restoring");
  });

  it("doubles delta_Cm magnitude when the disturbance doubles", () => {
    const deltaCm2Deg = calculateDeltaCm(-0.8, 2.0);
    const deltaCm4Deg = calculateDeltaCm(-0.8, 4.0);

    expect(deltaCm2Deg).toBeCloseTo(-0.02792526803, 9);
    expect(deltaCm4Deg).toBeCloseTo(-0.05585053606, 9);
    expect(Math.abs(deltaCm4Deg)).toBeCloseTo(
      Math.abs(deltaCm2Deg) * 2,
      9,
    );
    expect(Math.sign(deltaCm4Deg)).toBe(Math.sign(deltaCm2Deg));
    expect(classifyDisturbance(-0.8, 4.0)).toBe("restoring");
  });

  it("handles zero slope without division by zero", () => {
    const cm = calculateCm(0.04, 0, 2.86);
    const trimAngleDeg = calculateTrimAngleDeg(0.04, 0);
    const deltaCm = calculateDeltaCm(0, 2.0);

    expect(cm).toBeCloseTo(0.04, 9);
    expect(trimAngleDeg).toBe("not available");
    expect(deltaCm).toBe(0);
    expect(classifyDisturbance(0, 2.0)).toBe("neutral");
  });
});