import { readControl } from '../../state/controls.js';
import { num, $, ro } from '../dom.js';
import { evaluatePortfolio } from '../../domain/portfolio.js';
function gp(S) {
  return {
    config: 'stock',
    tip: readControl('gType', 'value'),
    stil: 'european',
    S,
    K: num('gStrike'),
    T: num('gDays') / 365,
    sigma: num('gVol') / 100,
    r: num('gRate') / 100,
    q: 0,
    rf: 0,
    Tf: num('gDays') / 365,
    settleTf: false,
  };
}
function greekPortfolioLegs() {
  const K = num('gStrike');
  const side = num('gSide');
  const kind = readControl('gPortfolio', 'value');
  let legs;
  if (kind === 'bull')
    legs = [
      ['call', 1, K - 5],
      ['call', -1, K + 5],
    ];
  else if (kind === 'butterfly')
    legs = [
      ['call', 1, K - 10],
      ['call', -2, K],
      ['call', 1, K + 10],
    ];
  else if (kind === 'condor')
    legs = [
      ['put', 1, K - 15],
      ['put', -1, K - 5],
      ['call', -1, K + 5],
      ['call', 1, K + 15],
    ];
  else if (kind === 'straddle')
    legs = [
      ['call', 1, K],
      ['put', 1, K],
    ];
  else legs = [[readControl('gType', 'value'), 1, K]];
  return legs.map((l) => ({
    type: l[0],
    qty: l[1] * side,
    K: Math.max(0.01, l[2]),
  }));
}
function portfolioMetrics(spot, maturity, volatility, rate) {
  return evaluatePortfolio(greekPortfolioLegs(), {
    spot,
    maturity: maturity ?? num('gDays') / 365,
    volatility: volatility ?? num('gVol') / 100,
    rate: rate ?? num('gRate') / 100,
  });
}
function greekAxisMeta() {
  const mode = $('gAxis') ? readControl('gAxis', 'value') : 'spot';
  if (mode === 'days')
    return {
      key: 'days',
      label: 'Zile până la scadență',
    };
  if (mode === 'vol')
    return {
      key: 'vol',
      label: 'Volatilitate (%)',
    };
  return {
    key: 'spot',
    label: 'Spot',
  };
}
function greekAxisLabel() {
  return greekAxisMeta().label;
}
function legsLabel() {
  return greekPortfolioLegs()
    .map(
      (l) => (l.qty > 0 ? '+' : '') + ro(l.qty, 0) + ' ' + l.type.toUpperCase() + ' ' + ro(l.K, 2),
    )
    .join('  ·  ');
}
export { gp, greekPortfolioLegs, portfolioMetrics, greekAxisMeta, greekAxisLabel, legsLabel };
