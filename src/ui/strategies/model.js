import {
  calculateQuote,
  daysForLeg,
  firstExpiry,
  strategyGreeks,
  payoffForLeg,
  strategyPayoff,
  strategySummary,
  probabilityOfProfit,
  estimateMargin,
  valueForLeg,
} from '../../domain/strategies.js';
import { num } from '../dom.js';
import { readControl } from '../../state/controls.js';
import { appState } from '../../state/store.js';
function quote(type, strike, spotOverride) {
  return calculateQuote(type, strike, spotOverride, strategyMarket());
}
function legDays(leg) {
  return daysForLeg(leg, strategyMarket());
}
function referenceDays(legs) {
  return firstExpiry(legs, strategyMarket());
}
function positionsGreeks(legs, spot) {
  return strategyGreeks(legs, spot, strategyMarket());
}
function legPayoff(leg, spot, elapsedDays) {
  return payoffForLeg(leg, spot, elapsedDays, strategyMarket());
}
function totalPayoff(spot, legs, elapsedDays) {
  return strategyPayoff(spot, legs, elapsedDays, strategyMarket());
}
function summary(legs, spot) {
  return strategySummary(legs, spot, strategyMarket());
}
function probOfProfit(legs, spot, breakevens) {
  return probabilityOfProfit(legs, spot, breakevens, strategyMarket());
}
function marginEstimate(legs, spot, metrics, cost) {
  return estimateMargin(legs, spot, metrics, cost, strategyMarket());
}
function presetLegs(p, allocateIds = false) {
  const S = +readControl('chainSpot', 'value'),
    D = +readControl('chainDays', 'value');
  return p.legs.map((l) => {
    const K = Math.max(0.01, S + l[2] - 100);
    return {
      id: allocateIds ? appState.strategy.nextId++ : undefined,
      type: l[0],
      qty: l[0] === 'stock' ? l[1] * 100 : l[1],
      strike: l[0] === 'stock' ? S : K,
      price: l[0] === 'stock' ? 0 : quote(l[0], K).mid,
      days: l[0] === 'stock' ? null : D,
    };
  });
}
function legValue(leg, spot, elapsedDays) {
  return valueForLeg(leg, spot, elapsedDays, strategyMarket());
}
function strategyMarket() {
  return {
    spot: num('chainSpot'),
    volatility: num('chainVol') / 100,
    days: num('chainDays'),
    rate: num('chainRate') / 100,
  };
}
export {
  quote,
  legDays,
  referenceDays,
  positionsGreeks,
  legPayoff,
  totalPayoff,
  summary,
  probOfProfit,
  marginEstimate,
  presetLegs,
  legValue,
};
