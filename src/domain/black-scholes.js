import { CONFIGS, factorDecontare } from './configurations.js';
import { N, n_pdf } from './normal.js';
import { validateParameters } from './validation.js';

export function blackScholes(parameters) {
  validateParameters(parameters);
  const configuration = CONFIGS[parameters.config];
  const underlying = configuration.subiacent(parameters);
  const carry = configuration.b(parameters);
  const { K: strike, T: maturity, sigma: volatility, r: rate } = parameters;
  const sign = parameters.tip === 'call' ? 1 : -1;
  const discount = Math.exp(-rate * maturity);
  const carryDiscount = Math.exp((carry - rate) * maturity);
  const settlement = factorDecontare(parameters);
  const extraTime = configuration.forward && parameters.settleTf ? parameters.Tf - maturity : 0;
  const carryRateDerivative = ['stock', 'stock_q', 'fx'].includes(parameters.config) ? 1 : 0;
  const underlyingRateDerivative = configuration.forward ? underlying * parameters.Tf : 0;
  const result = { X: underlying, b: carry, df: settlement, er: discount, eb: carryDiscount };
  if (!Number.isFinite(underlying) || !Number.isFinite(carryDiscount) || !Number.isFinite(discount))
    throw new RangeError('Parametrii produc o depășire numerică.');

  if (maturity === 0 || volatility === 0) {
    const terminal = underlying * Math.exp(carry * maturity);
    const distance = sign * (terminal - strike);
    const weight = distance > 0 ? 1 : distance === 0 ? 0.5 : 0;
    const baseValue = discount * Math.max(distance, 0);
    const baseDelta = sign * carryDiscount * weight;
    Object.assign(result, {
      pret: baseValue * settlement,
      delta: baseDelta * settlement,
      gamma: 0,
      vega:
        maturity > 0 && distance === 0
          ? underlying * carryDiscount * n_pdf(0) * Math.sqrt(maturity) * settlement
          : 0,
      theta:
        maturity === 0
          ? 0
          : -sign *
              weight *
              ((carry - rate) * underlying * carryDiscount + rate * strike * discount) *
              settlement -
            (extraTime > 0 ? rate * baseValue * settlement : 0),
      rho:
        ((-maturity - extraTime) * baseValue +
          (carryRateDerivative * maturity * underlying + underlyingRateDerivative) * baseDelta) *
        settlement,
      dK: -sign * discount * weight * settlement,
      d1: distance === 0 ? NaN : Math.sign(terminal - strike) * Infinity,
      d2: distance === 0 ? NaN : Math.sign(terminal - strike) * Infinity,
      Nd1: weight,
      Nd2: weight,
      vt: 0,
    });
  } else {
    const volatilityTime = volatility * Math.sqrt(maturity);
    const first =
      (Math.log(underlying / strike) + (carry + volatility ** 2 / 2) * maturity) / volatilityTime;
    const second = first - volatilityTime;
    const firstProbability = N(sign * first);
    const secondProbability = N(sign * second);
    const baseValue =
      sign *
      (underlying * carryDiscount * firstProbability - strike * discount * secondProbability);
    const baseDelta = sign * carryDiscount * firstProbability;
    const baseTheta =
      (-underlying * carryDiscount * n_pdf(first) * volatility) / (2 * Math.sqrt(maturity)) -
      sign * (carry - rate) * underlying * carryDiscount * firstProbability -
      sign * rate * strike * discount * secondProbability;
    Object.assign(result, {
      d1: first,
      d2: second,
      Nd1: firstProbability,
      Nd2: secondProbability,
      vt: volatilityTime,
      pret: Math.max(0, baseValue * settlement),
      delta: baseDelta * settlement,
      gamma: ((carryDiscount * n_pdf(first)) / (underlying * volatilityTime)) * settlement,
      vega: underlying * carryDiscount * n_pdf(first) * Math.sqrt(maturity) * settlement,
      theta: baseTheta * settlement - (extraTime > 0 ? rate * baseValue * settlement : 0),
      rho:
        ((-maturity - extraTime) * baseValue +
          (carryRateDerivative * maturity * underlying + underlyingRateDerivative) * baseDelta) *
        settlement,
      dK: -sign * discount * secondProbability * settlement,
    });
  }
  if (configuration.forward) {
    const spotDerivative = underlying / parameters.S;
    result.deltaSpot = result.delta * spotDerivative;
    result.gammaSpot = result.gamma * spotDerivative ** 2;
  }
  return result;
}

export function paritate(parameters) {
  validateParameters(parameters);
  const configuration = CONFIGS[parameters.config];
  const underlying = configuration.subiacent(parameters);
  const carry = configuration.b(parameters);
  const settlement = factorDecontare(parameters);
  const asset = underlying * Math.exp((carry - parameters.r) * parameters.T) * settlement;
  const strike = parameters.K * Math.exp(-parameters.r * parameters.T) * settlement;
  return { X: underlying, b: carry, stanga: asset, dreapta: strike, diferenta: asset - strike };
}
