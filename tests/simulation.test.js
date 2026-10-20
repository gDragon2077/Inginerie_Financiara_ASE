import test from 'node:test';
import assert from 'node:assert/strict';
import { normals } from '../src/domain/normal.js';
import {
  simulateTerminalDistribution,
  simulateHedgePath,
  simulateProcesses,
} from '../src/domain/simulation.js';

test('seeded Gaussian shocks are repeatable with plausible moments', () => {
  assert.deepEqual(normals(137, 20), normals(137, 20));
  assert.notDeepEqual(normals(137, 20), normals(138, 20));
  const samples = normals(137, 30000);
  const mean = samples.reduce((total, value) => total + value, 0) / samples.length;
  const variance =
    samples.reduce((total, value) => total + (value - mean) ** 2, 0) / samples.length;
  assert.ok(Math.abs(mean) < 0.025);
  assert.ok(Math.abs(variance - 1) < 0.04);
});

test('log-return paths include the Ito correction and match geometric price paths', () => {
  const options = { seed: 137, count: 400, maturity: 1, drift: 0.08, volatility: 0.25 };
  const returns = simulateTerminalDistribution({ ...options, variable: 'return' });
  const prices = simulateTerminalDistribution({ ...options, variable: 'price' });
  for (let index = 0; index < returns.terminal.length; index += 1)
    assert.ok(Math.abs(Math.log(prices.terminal[index] / 100) - returns.terminal[index]) < 1e-12);
  assert.equal(returns.theoreticalMean, 0.08 - 0.25 ** 2 / 2);
  assert.ok(Math.abs(returns.mean - returns.theoreticalMean) < 0.04);
});

test('prediction bands start at the simulated anchor and remain ordered', () => {
  const result = simulateProcesses({
    seed: 137,
    paths: 3,
    steps: 64,
    maturity: 1,
    drift: 0.08,
    volatility: 0.25,
    initialSpot: 100,
    historyHorizon: 1,
    forecastHorizon: 0.5,
    forecastDrift: 0.08,
    forecastVolatility: 0.25,
    confidence: 0.95,
  });
  assert.equal(result.center[0], result.anchor);
  assert.equal(result.lower[0], result.anchor);
  assert.equal(result.upper[0], result.anchor);
  for (let index = 0; index < result.center.length; index += 1)
    assert.ok(
      result.lower[index] <= result.center[index] && result.center[index] <= result.upper[index],
    );
  assert.ok(result.geometric.every((path) => path.y.every((value) => value > 0)));
});

test('delta hedge is reproducible and self-financing at every rebalance', () => {
  const options = {
    seed: 911,
    steps: 52,
    spot: 100,
    maturity: 1,
    rate: 0.05,
    drift: 0.08,
    realizedVolatility: 0.2,
    volatility: 0.2,
    legs: [{ type: 'call', qty: -1, K: 100 }],
  };
  const result = simulateHedgePath(options);
  assert.deepEqual(result, simulateHedgePath(options));
  assert.ok(Number.isFinite(result.error));
  for (let index = 1; index < result.rows.length; index += 1) {
    const previous = result.rows[index - 1];
    const current = result.rows[index];
    assert.ok(
      Math.abs(
        current.cash -
          (previous.cash * Math.exp(options.rate / options.steps) - current.trade * current.S),
      ) < 1e-8,
    );
  }
  assert.ok(
    Math.abs(result.rows[0].cash + result.rows[0].shares * options.spot + result.p0.pret * 100) <
      1e-9,
  );
});
