import { blackScholes } from './black-scholes.js';
import { N } from './normal.js';
import { optionParameters } from './portfolio.js';
import { CONTRACT_MULTIPLIER, DAYS_PER_YEAR, MINIMUM_SPREAD, SPREAD_RATIO } from './constants.js';

export function calculateQuote(type, strike, spotOverride, market) {
  const output = blackScholes(
    optionParameters(type, strike, {
      ...market,
      spot: spotOverride ?? market.spot,
      maturity: market.days / DAYS_PER_YEAR,
    }),
  );
  const mid = output.pret;
  const spread = Math.max(MINIMUM_SPREAD, mid * SPREAD_RATIO);
  return { mid, delta: output.delta, bid: Math.max(0, mid - spread / 2), ask: mid + spread / 2 };
}

export function daysForLeg(leg, market) {
  return leg.days ?? market.days;
}

export function firstExpiry(legs, market) {
  const expiries = legs.filter((leg) => leg.type !== 'stock').map((leg) => daysForLeg(leg, market));
  return expiries.length ? Math.min(...expiries) : 0;
}

export function valueForLeg(leg, spot, elapsedDays = 0, market) {
  if (leg.type === 'stock') return spot;
  const remaining = Math.max(0, daysForLeg(leg, market) - elapsedDays) / DAYS_PER_YEAR;
  return remaining === 0
    ? Math.max((leg.type === 'call' ? 1 : -1) * (spot - leg.strike), 0)
    : blackScholes(optionParameters(leg.type, leg.strike, { ...market, spot, maturity: remaining }))
        .pret;
}

export function payoffForLeg(leg, spot, elapsedDays = 0, market) {
  if (leg.type === 'stock') return leg.qty * (spot - leg.strike);
  return leg.qty * CONTRACT_MULTIPLIER * (valueForLeg(leg, spot, elapsedDays, market) - leg.price);
}

export function strategyPayoff(spot, legs, elapsedDays, market) {
  return legs.reduce(
    (total, leg) =>
      total + payoffForLeg(leg, spot, elapsedDays ?? firstExpiry(legs, market), market),
    0,
  );
}

export function strategyGreeks(legs, spot, market) {
  const total = { pret: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  for (const leg of legs) {
    if (leg.type === 'stock') {
      total.pret += leg.qty * spot;
      total.delta += leg.qty;
      continue;
    }
    const output = blackScholes(
      optionParameters(leg.type, leg.strike, {
        ...market,
        spot,
        maturity: daysForLeg(leg, market) / DAYS_PER_YEAR,
      }),
    );
    for (const key of Object.keys(total)) {
      const scale =
        key === 'theta'
          ? CONTRACT_MULTIPLIER / DAYS_PER_YEAR
          : ['vega', 'rho'].includes(key)
            ? CONTRACT_MULTIPLIER / 100
            : CONTRACT_MULTIPLIER;
      total[key] += leg.qty * output[key] * scale;
    }
  }
  return total;
}

function bisectRoot(evaluate, lower, upper) {
  let left = lower;
  let right = upper;
  let leftValue = evaluate(left);
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const center = (left + right) / 2;
    const value = evaluate(center);
    if (Math.abs(value) < 1e-9) return center;
    if (value * leftValue <= 0) right = center;
    else {
      left = center;
      leftValue = value;
    }
  }
  return (left + right) / 2;
}

export function strategySummary(legs, spot, market) {
  if (!legs.length) return { maxProfit: 0, maxLoss: 0, breakevens: [], approximate: false };
  const elapsed = firstExpiry(legs, market);
  const evaluate = (price) => strategyPayoff(price, legs, elapsed, market);
  const mixedExpiry = legs.some(
    (leg) => leg.type !== 'stock' && daysForLeg(leg, market) !== elapsed,
  );
  const strikes = [...new Set([0, ...legs.map((leg) => leg.strike)])].sort(
    (left, right) => left - right,
  );
  const upper = Math.max(spot, ...strikes) * 20 + 1;
  const points = mixedExpiry
    ? Array.from({ length: 1601 }, (_, index) => (upper * index) / 1600)
        .concat(strikes)
        .sort((left, right) => left - right)
    : strikes.concat(upper);
  const values = points.map(evaluate);
  const breakevens = [];
  const addRoot = (root) => {
    if (!breakevens.some((value) => Math.abs(value - root) < 1e-6)) breakevens.push(root);
  };
  for (let index = 0; index < points.length; index += 1) {
    if (Math.abs(values[index]) < 1e-8) addRoot(points[index]);
    if (index && values[index] * values[index - 1] < 0)
      addRoot(bisectRoot(evaluate, points[index - 1], points[index]));
  }
  const upperSlope = legs.reduce(
    (total, leg) =>
      total +
      (leg.type === 'stock' ? leg.qty : leg.type === 'call' ? leg.qty * CONTRACT_MULTIPLIER : 0),
    0,
  );
  return {
    maxProfit: upperSlope > 1e-10 ? Infinity : Math.max(...values),
    maxLoss: upperSlope < -1e-10 ? Infinity : Math.max(0, -Math.min(...values)),
    breakevens,
    approximate: mixedExpiry,
  };
}

export function probabilityOfProfit(legs, spot, breakevens, market) {
  if (!legs.length) return 0;
  const elapsed = firstExpiry(legs, market);
  const maturity = elapsed / DAYS_PER_YEAR;
  if (maturity === 0 || market.volatility === 0)
    return strategyPayoff(spot * Math.exp(market.rate * maturity), legs, elapsed, market) > 0
      ? 1
      : 0;
  const distribution = (strike) =>
    strike <= 0
      ? 0
      : strike === Infinity
        ? 1
        : N(
            (Math.log(strike / spot) - (market.rate - market.volatility ** 2 / 2) * maturity) /
              (market.volatility * Math.sqrt(maturity)),
          );
  const bounds = [
    0,
    ...breakevens.filter((value) => value > 0).sort((left, right) => left - right),
    Infinity,
  ];
  let probability = 0;
  for (let index = 1; index < bounds.length; index += 1) {
    const lower = bounds[index - 1];
    const upper = bounds[index];
    const center = Number.isFinite(upper) ? (lower + upper) / 2 : lower + Math.max(spot, 1);
    if (strategyPayoff(center, legs, elapsed, market) > 0)
      probability += distribution(upper) - distribution(lower);
  }
  return Math.max(0, Math.min(1, probability));
}

export function estimateMargin(legs, spot, metrics, cost) {
  if (!legs.length) return 0;
  const stock = legs.reduce(
    (total, leg) => total + (leg.type === 'stock' ? Math.abs(leg.qty) * spot * 0.5 : 0),
    0,
  );
  if (stock) return Math.max(0, stock + Math.max(cost, 0));
  if (Number.isFinite(metrics.maxLoss)) return Math.max(0, metrics.maxLoss);
  const naked = legs.reduce((total, leg) => {
    if (leg.type === 'stock' || leg.qty >= 0) return total;
    const outOfMoney =
      leg.type === 'call' ? Math.max(leg.strike - spot, 0) : Math.max(spot - leg.strike, 0);
    return (
      total +
      Math.abs(leg.qty) *
        CONTRACT_MULTIPLIER *
        Math.max(0.2 * spot - outOfMoney + leg.price, 0.1 * spot + leg.price)
    );
  }, 0);
  return Math.max(naked, cost, 0);
}
