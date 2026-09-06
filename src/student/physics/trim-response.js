const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }

  return value;
}

// Input angles are degrees; slope is 1/rad.
// Outputs Cm values are dimensionless and trim angle is returned in degrees.
// Positive alpha and positive pitching moment are nose-up.
// The model is linear and quasi-static.
export function degreesToRadians(degrees) {
  return requireFiniteNumber(degrees, "degrees") * DEG_TO_RAD;
}

export function radiansToDegrees(radians) {
  return requireFiniteNumber(radians, "radians") * RAD_TO_DEG;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  const trimRad = -cm0 / cmAlphaPerRad;
  return radiansToDegrees(trimRad);
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const disturbanceRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * disturbanceRad;
}

export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export function classifyDisturbance(disturbanceAlphaDeg, deltaCm) {
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");
  requireFiniteNumber(deltaCm, "deltaCm");

  const disturbanceRad = degreesToRadians(disturbanceAlphaDeg);
  const product = disturbanceRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function calculateTrimResponse(aircraft) {
  if (!aircraft || typeof aircraft !== "object") {
    throw new TypeError("aircraft must be an object");
  }

  const {
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
    disturbanceAlphaDeg,
  } = aircraft;

  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg,
  );
  const trimmed = isTrimmed(cm);
  const disturbanceTendency = classifyDisturbance(
    disturbanceAlphaDeg,
    deltaCm,
  );

  return {
    cm,
    trimAngleDeg,
    deltaCm,
    trimmed,
    disturbanceTendency,
  };
}