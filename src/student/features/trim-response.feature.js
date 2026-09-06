import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const PLOT_MIN_DEG = -10;
const PLOT_MAX_DEG = 10;
const PLOT_STEP_DEG = 1;

function requireAircraftNumber(aircraft, key) {
  const value = aircraft?.[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }

  return value;
}

function hasRequiredCapability(capabilityContext) {
  const capabilities = Array.isArray(capabilityContext)
    ? capabilityContext
    : Array.isArray(capabilityContext?.capabilities)
      ? capabilityContext.capabilities
      : Array.isArray(capabilityContext?.runtimeContext?.capabilities)
        ? capabilityContext.runtimeContext.capabilities
        : [];

  return capabilities.some(
    (capability) =>
      capability &&
      capability.id === "loads.pitch.component-sum" &&
      Number(capability.version) >= 1,
  );
}

function buildPlotPoints(aircraft) {
  const cm0 = requireAircraftNumber(aircraft, "cm0");
  const cmAlphaPerRad = requireAircraftNumber(
    aircraft,
    "cmAlphaPerRad",
  );
  const selectedAngle = requireAircraftNumber(
    aircraft,
    "angleOfAttackDeg",
  );

  const angles = [];

  for (
    let angle = PLOT_MIN_DEG;
    angle <= PLOT_MAX_DEG;
    angle += PLOT_STEP_DEG
  ) {
    angles.push(angle);
  }

  if (
    !angles.includes(selectedAngle) &&
    selectedAngle >= PLOT_MIN_DEG &&
    selectedAngle <= PLOT_MAX_DEG
  ) {
    angles.push(selectedAngle);
  }

  angles.sort((a, b) => a - b);

  return angles.map((angleOfAttackDeg) => ({
    x: angleOfAttackDeg,
    y: calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg),
  }));
}

function buildDecision(aircraft, results) {
  const { trimAngleDeg, disturbanceTendency } = results;

  let interpretation;

  if (results.trimmed) {
    interpretation =
      `The selected condition is trimmed under the specified ` +
      `abs(Cm) <= 1e-6 criterion. The disturbance has a ` +
      `${disturbanceTendency} tendency in this linear quasi-static model.`;
  } else {
    interpretation =
      `The selected condition is not trimmed under the specified ` +
      `abs(Cm) <= 1e-6 criterion. The disturbance has a ` +
      `${disturbanceTendency} tendency in this linear quasi-static model.`;
  }

  if (trimAngleDeg === null) {
    interpretation +=
      " No unique trim angle is available because Cm_alpha is zero.";
  }

  interpretation +=
    " This result does not establish safety, controllability, " +
    "flightworthiness, or real-world validation.";

  return {
    question:
      "At the selected angle of attack, is the simplified " +
      "pitching-moment model trimmed, and does a small " +
      "angle-of-attack disturbance create a restoring moment tendency?",
    interpretation,
    status:
      results.trimmed && disturbanceTendency === "restoring"
        ? "pass"
        : results.trimmed
          ? "neutral"
          : "caution",
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluate the linear pitching-moment relationship, trim condition, and small-disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",

  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],

  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 },
  ],

  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],

  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],

  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],

  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    if (!hasRequiredCapability(capabilityContext)) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified " +
            "pitching-moment model trimmed, and does a small " +
            "angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required loads.pitch.component-sum capability " +
            "version 1 is not available, so Stage 4 remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const cm0 = requireAircraftNumber(aircraft, "cm0");
    const cmAlphaPerRad = requireAircraftNumber(
      aircraft,
      "cmAlphaPerRad",
    );
    const angleOfAttackDeg = requireAircraftNumber(
      aircraft,
      "angleOfAttackDeg",
    );
    const disturbanceAlphaDeg = requireAircraftNumber(
      aircraft,
      "disturbanceAlphaDeg",
    );

    const cm = calculateCm(
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      cm0,
      cmAlphaPerRad,
    );

    const deltaCm = calculateDeltaCm(
      cmAlphaPerRad,
      disturbanceAlphaDeg,
    );

    const trimmed = isTrimmed(cm);

    const disturbanceTendency = classifyDisturbance(
      disturbanceAlphaDeg,
      deltaCm,
    );

    const calculated = {
      cm,
      trimAngleDeg,
      deltaCm,
      trimmed,
      disturbanceTendency,
    };

    return {
      results: [
        {
          id: "cm-alpha",
          label: "Cm(alpha)",
          value: cm,
          unit: "",
          precision: 8,
          emphasis: true,
        },
        {
          id: "trim-angle",
          label: "Trim angle",
          value:
            trimAngleDeg === null
              ? "not available"
              : trimAngleDeg,
          unit: trimAngleDeg === null ? "" : "deg",
          precision: 6,
        },
        {
          id: "delta-cm",
          label: "Delta Cm",
          value: deltaCm,
          unit: "",
          precision: 8,
        },
        {
          id: "trimmed",
          label: "Selected condition trimmed",
          value: trimmed,
          unit: "",
          precision: 0,
        },
        {
          id: "disturbance-tendency",
          label: "Disturbance tendency",
          value: disturbanceTendency,
          unit: "",
          precision: 0,
        },
      ],

      // Section 9 remains unspecified in the supplied specification.
      verificationCases: [],

      decision: buildDecision(aircraft, calculated),

      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xLabel: "Angle of attack",
          xUnit: "deg",
          yLabel: "Pitching-moment coefficient",
          yUnit: "",
          points: buildPlotPoints(aircraft),
          regions: [],
          referenceLines: [
            {
              id: "cm-zero",
              label: "Cm = 0",
              axis: "y",
              value: 0,
            },
          ],
        },
      ],

      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!hasRequiredCapability(runtimeContext)) {
      return {
        values: {},
      };
    }

    const cm0 = requireAircraftNumber(aircraft, "cm0");
    const cmAlphaPerRad = requireAircraftNumber(
      aircraft,
      "cmAlphaPerRad",
    );
    const angleOfAttackDeg = requireAircraftNumber(
      aircraft,
      "angleOfAttackDeg",
    );
    const disturbanceAlphaDeg = requireAircraftNumber(
      aircraft,
      "disturbanceAlphaDeg",
    );

    const cm = calculateCm(
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      cm0,
      cmAlphaPerRad,
    );

    const deltaCm = calculateDeltaCm(
      cmAlphaPerRad,
      disturbanceAlphaDeg,
    );

    return {
      values: {
        cm,
        trimAngleDeg,
        deltaCm,
        trimmed: isTrimmed(cm),
        disturbanceTendency: classifyDisturbance(
          disturbanceAlphaDeg,
          deltaCm,
        ),
      },
    };
  },
};