import { normals, confidenceZ, n_pdf } from './normal.js';
import { evaluatePortfolio } from './portfolio.js';
import { finiteNumber } from './validation.js';
import { CONTRACT_MULTIPLIER } from './constants.js';

function moments(values) {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    Math.max(1, values.length - 1);
  return { mean, standardDeviation: Math.sqrt(variance) };
}

export function simulateProcesses(options) {
  const {
    seed,
    paths,
    steps,
    maturity: horizon,
    drift,
    volatility,
    initialSpot,
    historyHorizon,
    forecastHorizon,
    forecastDrift,
    forecastVolatility,
    confidence,
  } = options;
  finiteNumber(horizon, 'Orizont', Number.MIN_VALUE);
  finiteNumber(volatility, 'Volatilitate', 0);
  const standard = [],
    general = [],
    geometric = [];
  const increment = horizon / steps;
  for (let pathIndex = 0; pathIndex < paths; pathIndex += 1) {
    const shocks = normals(seed + pathIndex * 7919, steps);
    const brownian = [0],
      arithmetic = [0],
      prices = [100];
    for (const shock of shocks) {
      const noise = Math.sqrt(increment) * shock;
      brownian.push(brownian.at(-1) + noise);
      arithmetic.push(arithmetic.at(-1) + drift * increment + volatility * noise);
      prices.push(
        prices.at(-1) * Math.exp((drift - volatility ** 2 / 2) * increment + volatility * noise),
      );
    }
    standard.push({ y: brownian });
    general.push({ y: arithmetic });
    geometric.push({ y: prices });
  }
  const historySteps = Math.max(
    1,
    Math.round((steps * historyHorizon) / (historyHorizon + forecastHorizon)),
  );
  const historyIncrement = historyHorizon / historySteps;
  const history = [initialSpot];
  for (const shock of normals(seed + 4241, historySteps))
    history.push(
      history.at(-1) *
        Math.exp(
          (forecastDrift - forecastVolatility ** 2 / 2) * historyIncrement +
            forecastVolatility * Math.sqrt(historyIncrement) * shock,
        ),
    );
  const anchor = history.at(-1);
  const forecastSteps = Math.max(1, steps - historySteps);
  const center = [],
    lower = [],
    upper = [];
  for (let index = 0; index <= forecastSteps; index += 1) {
    const time = (index * forecastHorizon) / forecastSteps;
    const mean = (forecastDrift - forecastVolatility ** 2 / 2) * time;
    const band = confidenceZ(confidence) * forecastVolatility * Math.sqrt(time);
    center.push(anchor * Math.exp(mean));
    lower.push(anchor * Math.exp(mean - band));
    upper.push(anchor * Math.exp(mean + band));
  }
  return {
    standard,
    general,
    geometric,
    history,
    center,
    lower,
    upper,
    anchor,
    forecastSteps,
    paths,
    steps,
    T: horizon,
    mu: drift,
    sigma: volatility,
    ciS0: initialSpot,
    ciT1: historyHorizon,
    ciT2: forecastHorizon,
    level: confidence,
  };
}

export function simulateTerminalDistribution({
  seed,
  count,
  variable,
  maturity,
  drift,
  volatility,
  spot = 100,
  steps = 40,
}) {
  finiteNumber(maturity, 'Orizont', Number.MIN_VALUE);
  finiteNumber(volatility, 'Volatilitate', 0);
  const paths = [],
    terminal = [];
  const increment = maturity / steps;
  for (let pathIndex = 0; pathIndex < count; pathIndex += 1) {
    let logReturn = 0;
    const path = [variable === 'price' ? spot : 0];
    for (const shock of normals(seed + 90001 + pathIndex * 104729, steps)) {
      logReturn +=
        (drift - volatility ** 2 / 2) * increment + volatility * Math.sqrt(increment) * shock;
      path.push(variable === 'price' ? spot * Math.exp(logReturn) : logReturn);
    }
    paths.push(path);
    terminal.push(path.at(-1));
  }
  const meanReturn = (drift - volatility ** 2 / 2) * maturity;
  const deviation = volatility * Math.sqrt(maturity);
  const density = (value) =>
    deviation === 0
      ? 0
      : variable === 'price'
        ? value <= 0
          ? 0
          : n_pdf((Math.log(value / spot) - meanReturn) / deviation) / (deviation * value)
        : n_pdf((value - meanReturn) / deviation) / deviation;
  return {
    paths,
    terminal,
    density,
    variable,
    maturity,
    ...moments(terminal),
    theoreticalMean: variable === 'price' ? spot * Math.exp(drift * maturity) : meanReturn,
    theoreticalStandardDeviation:
      variable === 'price'
        ? spot * Math.exp(drift * maturity) * Math.sqrt(Math.expm1(volatility ** 2 * maturity))
        : deviation,
  };
}

export function simulateHedgePath({
  seed,
  steps,
  spot,
  maturity,
  rate,
  drift,
  realizedVolatility,
  volatility,
  legs,
}) {
  const increment = maturity / steps;
  const metrics = (price, time) =>
    evaluatePortfolio(legs, { spot: price, maturity: time, volatility, rate });
  let price = spot;
  const initial = metrics(spot, maturity);
  let shares = -initial.delta * CONTRACT_MULTIPLIER;
  let cash = -initial.pret * CONTRACT_MULTIPLIER - shares * price;
  const spots = [price],
    hedges = [shares],
    rows = [{ i: 0, t: 0, S: price, d: initial.delta, shares, trade: shares, cash }];
  const shocks = normals(seed, steps);
  for (let index = 1; index <= steps; index += 1) {
    price *= Math.exp(
      (drift - realizedVolatility ** 2 / 2) * increment +
        realizedVolatility * Math.sqrt(increment) * shocks[index - 1],
    );
    cash *= Math.exp(rate * increment);
    const delta = metrics(price, Math.max(maturity - index * increment, 0)).delta;
    const newShares = index < steps ? -delta * CONTRACT_MULTIPLIER : shares;
    const trade = newShares - shares;
    cash -= trade * price;
    shares = newShares;
    spots.push(price);
    hedges.push(shares);
    rows.push({ i: index, t: index * increment, S: price, d: delta, shares, trade, cash });
  }
  const payoff = metrics(price, 0).expiry * CONTRACT_MULTIPLIER;
  return {
    spots,
    hedges,
    rows,
    error: cash + shares * price + payoff,
    S: price,
    payoff,
    p0: initial,
  };
}
