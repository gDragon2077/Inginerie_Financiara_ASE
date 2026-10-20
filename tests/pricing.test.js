import test from 'node:test';
import assert from 'node:assert/strict';
import { blackScholes, paritate } from '../src/domain/black-scholes.js';
import {
  crr,
  crrCombinatorial,
  crrGreeksNumerice,
  primaAmericana,
} from '../src/domain/binomial.js';

const base = {
  config: 'stock',
  tip: 'call',
  stil: 'european',
  S: 100,
  K: 100,
  T: 1,
  sigma: 0.2,
  r: 0.05,
  q: 0.02,
  rf: 0.03,
  Tf: 1.5,
  settleTf: false,
  n: 100,
};
const close = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (±${tolerance})`);
const derivative = (parameters, key, step) =>
  (blackScholes({ ...parameters, [key]: parameters[key] + step }).pret -
    blackScholes({ ...parameters, [key]: parameters[key] - step }).pret) /
  (2 * step);

test('Black–Scholes matches published vanilla benchmark values', () => {
  close(blackScholes(base).pret, 10.450583572185565);
  close(blackScholes({ ...base, tip: 'put' }).pret, 5.573526022256971);
  close(blackScholes(base).delta, 0.6368306511756191);
  close(blackScholes(base).gamma, 0.018762017345846895);
});

for (const config of ['stock', 'stock_q', 'fx', 'fut', 'fwd_stock', 'fwd_fx']) {
  for (const tip of ['call', 'put']) {
    for (const settleTf of config.startsWith('fwd') ? [false, true] : [false]) {
      const parameters = { ...base, config, tip, settleTf };
      test(`${config}/${tip}/settlement=${settleTf}: parity, Greeks and CRR convergence`, () => {
        const output = blackScholes(parameters);
        const call = blackScholes({ ...parameters, tip: 'call' });
        const put = blackScholes({ ...parameters, tip: 'put' });
        close(call.pret - put.pret, paritate(parameters).diferenta);
        close(output.deltaSpot ?? output.delta, derivative(parameters, 'S', 0.001), 1e-6);
        close(output.vega, derivative(parameters, 'sigma', 0.00001), 1e-5);
        close(output.rho, derivative(parameters, 'r', 0.000001), 1e-5);
        close(output.theta, -derivative(parameters, 'T', 0.000001), 1e-5);
        close(output.dK, derivative(parameters, 'K', 0.001), 1e-6);
        const spotStep = 0.01;
        const gamma =
          (blackScholes({ ...parameters, S: parameters.S + spotStep }).pret -
            2 * output.pret +
            blackScholes({ ...parameters, S: parameters.S - spotStep }).pret) /
          spotStep ** 2;
        close(output.gammaSpot ?? output.gamma, gamma, 1e-6);
        close(crr(parameters, 800).pret, output.pret, 0.02);
        close(crrCombinatorial(parameters, 100).pret, crr(parameters, 100).pret, 1e-8);
      });
    }
  }
}

test('zero carry does not turn a dividend stock into a fixed futures quote for rho', () => {
  const parameters = { ...base, config: 'stock_q', r: 0.03, q: 0.03 };
  close(blackScholes(parameters).rho, derivative(parameters, 'r', 0.000001), 1e-5);
  assert.ok(blackScholes(parameters).rho > 0);
});

test('CRR prices European options using the same tree and combinatorial distribution', () => {
  for (const steps of [1, 2, 5, 20, 200, 1000]) {
    const output = crr(base, steps, steps <= 20);
    close(output.pret, crrCombinatorial(base, steps).pret, 1e-7);
    if (steps <= 20) {
      assert.equal(output.tree.S.length, steps + 1);
      close(output.tree.V[0][0] * output.df, output.pret);
      assert.equal(output.tree.S[steps].length, steps + 1);
    }
  }
});

test('American exercise premium is nonnegative; nondividend calls need no early exercise', () => {
  close(primaAmericana(base, 300), 0, 1e-9);
  const put = { ...base, tip: 'put', S: 50, K: 100, stil: 'american' };
  assert.ok(crr(put, 300).pret >= 50);
  assert.ok(primaAmericana(put, 300) > 0);
  for (const tip of ['call', 'put'])
    for (const config of ['stock_q', 'fx', 'fut'])
      assert.ok(primaAmericana({ ...base, config, tip }, 100) >= -1e-9);
});

test('zero volatility discounts the deterministic future payoff', () => {
  const parameters = { ...base, sigma: 0 };
  const expected = Math.max(100 - 100 * Math.exp(-0.05), 0);
  close(blackScholes(parameters).pret, expected);
  close(crr(parameters, 10).pret, expected);
  close(crrCombinatorial(parameters, 10).pret, expected);
  close(crr({ ...parameters, tip: 'put', S: 50, stil: 'american' }, 10).pret, 50);
  for (const tip of ['call', 'put']) {
    const expired = { ...base, tip, T: 0, S: 120 };
    close(blackScholes(expired).pret, tip === 'call' ? 20 : 0);
    close(crr(expired, 2).pret, blackScholes(expired).pret);
  }
});

test('numeric CRR Greeks converge to analytical sensitivities', () => {
  const output = crrGreeksNumerice(base, 1000);
  close(output.vega, blackScholes(base).vega, 0.04);
  close(output.rho, blackScholes(base).rho, 0.04);
});

test('invalid model parameters fail explicitly, including infeasible CRR probabilities', () => {
  for (const patch of [
    { S: 0 },
    { S: NaN },
    { K: -1 },
    { sigma: -0.1 },
    { T: -1 },
    { r: Infinity },
    { config: 'unknown' },
    { tip: 'straddle' },
    { config: 'fx', rf: NaN },
    { config: 'fwd_stock', Tf: 0.5 },
  ]) {
    assert.throws(() => blackScholes({ ...base, ...patch }), RangeError);
    assert.throws(() => crr({ ...base, ...patch }, 5), RangeError);
  }
  for (const steps of [0, -1, 1.5, NaN, 2001]) assert.throws(() => crr(base, steps), RangeError);
  assert.throws(() => crr({ ...base, r: 1, sigma: 0.01 }, 1), /Probabilitate/);
});
