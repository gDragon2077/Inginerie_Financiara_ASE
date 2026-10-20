import { CONFIGS, factorDecontare } from './configurations.js';
import { blackScholes } from './black-scholes.js';

export function deterministicTree(parameters, steps, wantTree) {
  const configuration = CONFIGS[parameters.config];
  const underlying = configuration.subiacent(parameters);
  const carry = configuration.b(parameters);
  const timeStep = parameters.T / steps;
  const settlement = factorDecontare(parameters);
  const sign = parameters.tip === 'call' ? 1 : -1;
  const terminalPayoff = Math.max(
    sign * (underlying * Math.exp(carry * parameters.T) - parameters.K),
    0,
  );
  const tree = wantTree ? { S: [], V: [], ex: [] } : null;
  let presentValue = terminalPayoff;
  for (let level = steps; level >= 0; level -= 1) {
    const spot = underlying * Math.exp(carry * timeStep * level);
    const exercise = Math.max(sign * (spot - parameters.K), 0);
    if (level < steps) presentValue *= Math.exp(-parameters.r * timeStep);
    const earlyExercise = parameters.stil === 'american' && exercise > presentValue;
    if (earlyExercise) presentValue = exercise;
    if (tree) {
      tree.S[level] = Array(level + 1).fill(spot);
      tree.V[level] = Array(level + 1).fill(presentValue);
      tree.ex[level] = Array(level + 1).fill(earlyExercise);
    }
  }
  const analytical = blackScholes(parameters);
  return {
    n: steps,
    dt: timeStep,
    u: 1,
    d: 1,
    p: 0.5,
    disc: Math.exp(-parameters.r * timeStep),
    b: carry,
    X0: underlying,
    df: settlement,
    valida: true,
    pret: presentValue * settlement,
    radacina: presentValue,
    tree,
    lvl1: null,
    lvl2: null,
    delta: analytical.delta,
    gamma: analytical.gamma,
    theta: analytical.theta,
    terms: [{ i: 0, prob: 1, S: underlying * Math.exp(carry * parameters.T), pay: terminalPayoff }],
  };
}
