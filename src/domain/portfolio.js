import { blackScholes } from './black-scholes.js';

export function optionParameters(type, strike, market) {
  return {
    config: 'stock',
    tip: type,
    stil: 'european',
    S: Math.max(market.spot, 1e-12),
    K: strike,
    T: market.maturity,
    sigma: market.volatility,
    r: market.rate,
  };
}

export function evaluatePortfolio(legs, market) {
  const total = { pret: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, dK: 0, expiry: 0 };
  for (const leg of legs) {
    const output = blackScholes(optionParameters(leg.type, leg.K, market));
    for (const key of ['pret', 'delta', 'gamma', 'vega', 'theta', 'rho', 'dK'])
      total[key] += leg.qty * output[key];
    total.expiry += leg.qty * Math.max((leg.type === 'call' ? 1 : -1) * (market.spot - leg.K), 0);
  }
  return total;
}
