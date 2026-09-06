import {
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const numericalInputs = {
  cm0: 0.04,
  cmAlphaPerRad: -0.8,
  angleOfAttackDeg: 2.86,
  disturbanceAlphaDeg: 2.0,
};

function hasRequiredCapability(capabilityContext) {
  const capabilities = capabilityContext?.capabilities ?? capabilityContext;

  if (Array.isArray(capabilities)) {
    return capabilities.some(
      (capability) =>
        capability?.id === "loads.pitch.component-sum" &&
        Number(capability.version) >= 1,
    );
  }

  if (capabilities && typeof capabilities === "object") {
    const capability = capabilities["loads.pitch.component-sum"];

    if (capability === true) {
      return true;
    }

    if (typeof capability === "number") {
      return capability >= 1;
    }

    return Number(capability?.version) >= 1;
  }

  return false;
}

function calculateResults(aircraft) {
  const cm = calculateCm(
    aircraft.cm0,
    aircraft.cmAlphaPerRad,
    aircraft.angleOfAttackDeg,
  );

  const trimAngleDeg = calculateTrimAngleDeg(
    aircraft.cm0,
    aircraft.cmAlphaPerRad,
  );

  const deltaCm = calculateDeltaCm(
    aircraft.cmAlphaPerRad,
    aircraft.disturbanceAlphaDeg,
  );

  const trimmed = isTrimmed(cm);
  const tendency = classifyDisturbance(
    aircraft.cmAlphaPerRad,
    aircraft.disturbanceAlphaDeg,
  );

  return {
    cm,
    trimAngleDeg,
    deltaCm,
    trimmed,
    tendency,
  };
}

function buildVerificationCases() {
  const numerical = calculateResults(numericalInputs);

  const behavioralInputs = {
    ...numericalInputs,
    disturbanceAlphaDeg: 4.0,
  };

  const behavioral = calculateResults(behavioralInputs);

  const boundaryInputs = {
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  };

  const boundary = calculateResults(boundaryInputs);

  return [
    {
      id: "numerical",
      label: "Numerical case",
      inputs: numericalInputs,
      expected: {
        cm: 0.000066866712,
        trimAngleDeg: 2.864788976,
        deltaCm: -0.02792526803,
        trimmed: false,
        tendency: "restoring",
      },
      passed:
        Math.abs(numerical.cm - 0.000066866712) <= 1e-9 &&
        Math.abs(numerical.trimAngleDeg - 2.864788976) <= 1e-6 &&
        Math.abs(numerical.deltaCm - -0.02792526803) <= 1e-9 &&
        numerical.trimmed === false &&
        numerical.tendency === "restoring",
    },
    {
      id: "behavioral",
      label: "Behavioral case",
      inputs: behavioralInputs,
      expected: {
        deltaCm: -0.05585053606,
        tendency: "restoring",
        relationship:
          "delta_Cm(+4.00 deg) has twice the magnitude of delta_Cm(+2.00 deg) with the same negative sign",
      },
      passed:
        Math.abs(behavioral.deltaCm - -0.05585053606) <= 1e-9 &&
        Math.abs(behavioral.deltaCm) ===
          Math.abs(numerical.deltaCm) * 2 &&
        Math.sign(behavioral.deltaCm) === Math.sign(numerical.deltaCm) &&
        behavioral.tendency === "restoring",
    },
    {
      id: "boundary-sanity",
      label: "Boundary or sanity case",
      inputs: boundaryInputs,
      expected: {
        cm: 0.04,
        trimAngleDeg: "not available",
        deltaCm: 0,
        tendency: "neutral",
      },
      passed:
        Math.abs(boundary.cm - 0.04) <= 1e-9 &&
        boundary.trimAngleDeg === "not available" &&
        Math.abs(boundary.deltaCm) <= 1e-9 &&
        boundary.tendency === "neutral",
    },
  ];
}

function buildDecision(results) {
  if (!results.capabilityAvailable) {
    return {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation:
        "The required earlier longitudinal moment-contribution capability is not available, so the Stage 4 analysis remains locked.",
      status: "caution",
    };
  }

  const condition = results.trimmed ? "trimmed" : "not trimmed";
  const trimNote = results.trimAngleDeg === "not available"
    ? " No unique trim angle is available because Cm_alpha is zero."
    : "";

  return {
    question:
      "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
    interpretation:
      `The selected condition is ${condition} under the specified abs(Cm) <= 1e-6 criterion. ` +
      `The disturbance has a ${results.tendency} tendency in this linear quasi-static model.` +
      trimNote +
      " This does not establish aircraft safety, controllability, flightworthiness, or validity outside the model limits.",
    status: results.tendency === "destabilizing" || !results.trimmed
      ? "caution"
      : results.tendency === "restoring" ? "pass" : "neutral",
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluate trim and small-disturbance pitching-moment tendency using the linear Cm–alpha model.",
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
    {
      id: "loads.pitch.component-sum",
      version: 1,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
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
    const capabilityAvailable =
      hasRequiredCapability(capabilityContext);

    if (!capabilityAvailable) {
      throw new TypeError("Stage 3 loads.pitch.component-sum capability v1 is required.");
    }

    const calculated = calculateResults(aircraft);

    const results = [
      {
        id: "cm-alpha",
        label: "Pitching-moment coefficient, Cm(alpha)",
        value: calculated.cm,
        unit: "",
        precision: 9,
        emphasis: true,
      },
      {
        id: "trim-angle",
        label: "Trim angle",
        value: calculated.trimAngleDeg,
        unit: typeof calculated.trimAngleDeg === "number" ? "deg" : "",
        precision: 6,
      },
      {
        id: "delta-cm",
        label: "Disturbance moment-coefficient change, delta_Cm",
        value: calculated.deltaCm,
        unit: "",
        precision: 9,
      },
      {
        id: "trim-status",
        label: "Selected condition trimmed",
        value: calculated.trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
      },
      {
        id: "disturbance-tendency",
        label: "Disturbance tendency",
        value: calculated.tendency,
        unit: "",
        precision: 0,
      },
    ];

    const plotPoints = [];
    for (let angleDeg = -10; angleDeg <= 10; angleDeg += 1) {
      plotPoints.push({
        x: angleDeg,
        y: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          angleDeg,
        ),
      });
    }

    if (
      aircraft.angleOfAttackDeg >= -10 &&
      aircraft.angleOfAttackDeg <= 10 &&
      !plotPoints.some(
        (point) => point.x === aircraft.angleOfAttackDeg,
      )
    ) {
      plotPoints.push({
        x: aircraft.angleOfAttackDeg,
        y: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          aircraft.angleOfAttackDeg,
        ),
      });
      plotPoints.sort((a, b) => a.x - b.x);
    }

    return {
      results,
      verificationCases: buildVerificationCases(),
      decision: buildDecision({
        ...calculated,
        capabilityAvailable,
      }),
      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xLabel: "Angle of attack (deg)",
          yLabel: "Pitching-moment coefficient, Cm",
          currentX: aircraft.angleOfAttackDeg,
          series: [
            {
              id: "cm",
              label: "Cm(alpha)",
              points: plotPoints,
            },
          ],
          referenceLines: [
            {
              id: "trim-line",
              label: "Cm = 0",
              axis: "y",
              value: 0,
            },
          ],
          regions: [],
        },
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? {};
    const capabilityContext = runtimeContext?.capabilities
      ? { capabilities: runtimeContext.capabilities }
      : runtimeContext;

    if (!hasRequiredCapability(capabilityContext)) {
      return {
        values: {},
      };
    }

    const calculated = calculateResults(aircraft);

    return {
      values: {
        cm: calculated.cm,
        trimAngleDeg: calculated.trimAngleDeg,
        deltaCm: calculated.deltaCm,
        trimmed: calculated.trimmed,
        disturbanceTendency: calculated.tendency,
      },
    };
  },
};