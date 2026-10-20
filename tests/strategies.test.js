import test from 'node:test';
import assert from 'node:assert/strict';
import {
  strategySummary,
  strategyPayoff,
  strategyGreeks,
  probabilityOfProfit,
  calculateQuote,
} from '../src/domain/strategies.js';

const market = { spot: 100, volatility: 0.2, rate: 0.05, days: 30 };
const call = (strike, qty, price = 2) => ({ type: 'call', strike, qty, price, days: 30 });
const put = (strike, qty, price = 2) => ({ type: 'put', strike, qty, price, days: 30 });
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('long and short options retain exact contractual multipliers and tail risks', () => {
  const long = strategySummary([call(100, 1)], 100, market);
  assert.equal(long.maxProfit, Infinity);
  close(long.maxLoss, 200);
  close(long.breakevens[0], 102);
  const short = strategySummary([call(100, -1)], 100, market);
  assert.equal(short.maxLoss, Infinity);
  close(short.maxProfit, 200);
  const longPut = strategySummary([put(100, 1)], 100, market);
  close(longPut.maxProfit, 9800);
  close(longPut.maxLoss, 200);
  close(longPut.breakevens[0], 98);
  close(strategyPayoff(110, [call(100, 3)], undefined, market), 2400);
});

test('vertical spreads and butterflies have exact extrema at strikes and exact breakevens', () => {
  const vertical = [call(95, 1, 7), call(105, -1, 2)];
  const metrics = strategySummary(vertical, 100, market);
  close(metrics.maxProfit, 500);
  close(metrics.maxLoss, 500);
  close(metrics.breakevens[0], 100);
  const butterfly = [call(90, 1, 12), call(100, -2, 5), call(110, 1, 1)];
  const result = strategySummary(butterfly, 100, market);
  close(result.maxProfit, 700);
  close(result.maxLoss, 300);
  close(result.breakevens[0], 93);
  close(result.breakevens[1], 107);
});

test('covered calls combine shares and contracts without confusing their units', () => {
  const legs = [{ type: 'stock', qty: 100, strike: 100, price: 0 }, call(110, -1, 2)];
  const result = strategySummary(legs, 100, market);
  close(result.maxProfit, 1200);
  close(result.maxLoss, 9800);
  close(strategyPayoff(120, legs, undefined, market), 1200);
  close(strategyGreeks([{ type: 'stock', qty: 100, strike: 100 }], 100, market).delta, 100);
});

test('calendar strategies value remaining time at the first expiry and label estimates', () => {
  const legs = [call(100, -1, 2), { ...call(100, 1, 5), days: 90 }];
  const payoff = strategyPayoff(100, legs, undefined, market);
  assert.ok(payoff > -300);
  assert.equal(strategySummary(legs, 100, market).approximate, true);
});

test('probabilities are bounded and simulated bid never exceeds ask', () => {
  const legs = [call(95, 1, 7), call(105, -1, 2)];
  const metrics = strategySummary(legs, 100, market);
  const probability = probabilityOfProfit(legs, 100, metrics.breakevens, market);
  assert.ok(probability > 0 && probability < 1);
  for (const strike of [10, 100, 1000]) {
    const quote = calculateQuote('call', strike, undefined, market);
    assert.ok(quote.bid >= 0 && quote.bid <= quote.mid && quote.mid <= quote.ask);
  }
});
