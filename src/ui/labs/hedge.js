import { simulateHedgePath } from '../../domain/simulation.js';
import { num, $, ro } from '../dom.js';
import { greekPortfolioLegs } from './portfolio.js';
import { appState } from '../../state/store.js';
import { lineChart, histogramChart } from '../charts/series.js';
import { schedule } from '../scheduler.js';
function runHedgePath(seed, steps, spot, maturity, rate, drift, realizedVolatility) {
  return simulateHedgePath({
    seed,
    steps,
    spot,
    maturity,
    rate,
    drift,
    realizedVolatility,
    volatility: num('gVol') / 100,
    legs: greekPortfolioLegs(),
  });
}
function simulateHedgeNow() {
  const n = num('hedgeFreq'),
    S0 = num('gSpot'),
    T = num('gDays') / 365,
    r = num('gRate') / 100,
    mu = num('hedgeMu') / 100,
    sigReal = Math.max(0.0001, num('hedgeVolReal') / 100);
  const main = runHedgePath(appState.simulation.hedgeSeed, n, S0, T, r, mu, sigReal);
  $('hedgeResults').innerHTML =
    '<div class="hedge-metric"><small>Valoare inițială portofoliu</small><b>' +
    ro(main.p0.pret * 100, 2) +
    '</b></div><div class="hedge-metric"><small>Spot final</small><b>' +
    ro(main.S, 2) +
    '</b></div><div class="hedge-metric"><small>Payoff portofoliu</small><b class="' +
    (main.payoff >= 0 ? 'gpos' : 'gneg') +
    '">' +
    (main.payoff >= 0 ? '+' : '') +
    ro(main.payoff, 2) +
    '</b></div><div class="hedge-metric"><small>Eroare de hedging</small><b class="' +
    (main.error >= 0 ? 'gpos' : 'gneg') +
    '">' +
    (main.error >= 0 ? '+' : '') +
    ro(main.error, 2) +
    '</b></div>';
  $('hedgeSpotChart').innerHTML = lineChart(
    [
      {
        y: main.spots,
        color: 'var(--accent)',
      },
    ],
    {
      xmax: T,
    },
  );
  $('hedgeDeltaChart').innerHTML = lineChart(
    [
      {
        y: main.hedges,
        color: 'var(--s2)',
      },
    ],
    {
      xmax: T,
      zero: true,
    },
  );
  let h =
    '<table class="hedge-table"><thead><tr><th>Rebalansare</th><th>Timp</th><th>Spot</th><th>Delta portofoliu</th><th>Acțiuni hedge</th><th>Tranzacție spot</th><th>Cont cash</th></tr></thead><tbody>';
  main.rows.forEach((x) => {
    h +=
      '<tr><td>' +
      x.i +
      '</td><td>' +
      ro(x.t, 3) +
      '</td><td>' +
      ro(x.S, 2) +
      '</td><td>' +
      ro(x.d, 4) +
      '</td><td>' +
      ro(x.shares, 2) +
      '</td><td class="' +
      (x.trade >= 0 ? 'gpos' : 'gneg') +
      '">' +
      (x.trade >= 0 ? '+' : '') +
      ro(x.trade, 2) +
      '</td><td>' +
      ro(x.cash, 2) +
      '</td></tr>';
  });
  $('hedgeTable').innerHTML = h + '</tbody></table>';
  const M = 150;
  const errors = [];
  let k;
  for (k = 0; k < M; k++)
    errors.push(
      runHedgePath(appState.simulation.hedgeSeed + (k + 1) * 7919, n, S0, T, r, mu, sigReal).error,
    );
  const meanErr = errors.reduce((a, b) => a + b, 0) / M,
    variance = errors.reduce((a, b) => a + (b - meanErr) * (b - meanErr), 0) / (M - 1),
    sdErr = Math.sqrt(variance);
  $('hedgeErrorChart').innerHTML = histogramChart(errors, 'var(--accent)');
  $('hedgeErrorStats').textContent =
    'Medie eroare = ' +
    ro(meanErr, 3) +
    ' · abatere standard = ' +
    ro(sdErr, 3) +
    ' · vol. implicită=' +
    ro(num('gVol'), 1) +
    '% vs. vol. realizată=' +
    ro(num('hedgeVolReal'), 1) +
    '% · ' +
    n +
    ' reechilibrări';
}
function simulateHedge(...args) {
  schedule('simulateHedge', () => simulateHedgeNow(...args));
}
export { runHedgePath, simulateHedge };
