import { simulateProcesses, simulateTerminalDistribution } from '../../domain/simulation.js';
import { appState } from '../../state/store.js';
import { num, $, ro } from '../dom.js';
import { lineChart, intervalChart, distFanChart } from '../charts/series.js';
import { normals } from '../../domain/normal.js';
import { readControl } from '../../state/controls.js';
import { schedule } from '../scheduler.js';
function simulateBrownianNow() {
  const {
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
    T,
    mu,
    sigma,
    ciS0,
    ciT1,
    ciT2,
    level,
  } = simulateProcesses({
    seed: appState.simulation.brownianSeed,
    paths: num('bmPaths'),
    steps: num('bmSteps'),
    maturity: num('bmT'),
    drift: num('bmMu') / 100,
    volatility: num('bmSigma') / 100,
    initialSpot: num('bmCiS0'),
    historyHorizon: num('bmCiT1'),
    forecastHorizon: num('bmCiT2'),
    forecastDrift: num('bmCiMu') / 100,
    forecastVolatility: num('bmCiSigma') / 100,
    confidence: num('bmConfidence'),
  });
  $('bmStandardChart').innerHTML = lineChart(standard, {
    xmax: T,
    zero: true,
  });
  $('bmGeneralChart').innerHTML = lineChart(general, {
    xmax: T,
    zero: true,
  });
  $('bmGeometricChart').innerHTML = lineChart(geometric, {
    xmax: T,
  });
  $('bmCIChart').innerHTML = intervalChart(history, center, lower, upper, ciT2);
  const endB = standard.map((s) => s.y[steps]),
    endS = geometric.map((s) => s.y[steps]),
    mean = (a) => a.reduce((v, w) => v + w, 0) / a.length;
  $('bmStandardStats').textContent =
    'La T: media simulată ' +
    ro(mean(endB), 3) +
    ' · teoretic 0 · abatere teoretică ' +
    ro(Math.sqrt(T), 3);
  $('bmGeneralStats').textContent =
    'E[X(T)] = ' + ro(mu * T, 3) + ' · abatere standard = ' + ro(sigma * Math.sqrt(T), 3);
  $('bmGeometricStats').textContent =
    'S₀ = 100 · media simulată la T = ' +
    ro(mean(endS), 2) +
    ' · E[S(T)] = ' +
    ro(100 * Math.exp(mu * T), 2);
  $('bmCIStats').textContent =
    'S₀ = ' +
    ro(ciS0, 2) +
    ' · preț simulat la T₁=' +
    ro(ciT1, 2) +
    ' ani: ' +
    ro(anchor, 2) +
    ' · la T₁+T₂=' +
    ro(ciT1 + ciT2, 2) +
    ' ani, interval de predicție ' +
    Math.round(level * 100) +
    '%: [' +
    ro(lower[forecastSteps], 2) +
    ', ' +
    ro(upper[forecastSteps], 2) +
    ']';
}
function initBrownian() {
  if (!$('pane-brownian')) return;
  function redraw() {
    simulateBrownian();
    noiseChart();
    simulateDistribution();
  }
  [
    'bmPaths',
    'bmSteps',
    'bmT',
    'bmMu',
    'bmSigma',
    'bmCiS0',
    'bmCiT1',
    'bmCiT2',
    'bmCiMu',
    'bmCiSigma',
    'bmConfidence',
    'bmDistN',
    'bmDistVar',
  ].forEach((id) => {
    $(id).addEventListener('input', redraw);
  });
  $('bmResim').addEventListener('click', () => {
    appState.simulation.brownianSeed = (appState.simulation.brownianSeed + 104729) % 2147483647;
    redraw();
  });
  $('bmCiResim').addEventListener('click', () => {
    appState.simulation.brownianSeed = (appState.simulation.brownianSeed + 104729) % 2147483647;
    redraw();
  });
  redraw();
}
function noiseChartNow() {
  const steps = num('bmSteps');
  const T = num('bmT');
  const n = Math.min(steps, 252);
  const z = normals(appState.simulation.brownianSeed, n);
  const W = 760;
  const H = 260;
  const ml = 42;
  const mr = 12;
  const mt = 12;
  const mb = 40;
  const mid = (H - mb + mt) / 2;
  const bw = (W - ml - mr) / n;
  const unit = 32;
  const maxLevel = Math.max(1, Math.floor((mid - mt) / unit));
  let g = '';
  for (let lvl = -maxLevel; lvl <= maxLevel; lvl++) {
    const yy = mid - lvl * unit;
    g +=
      '<line x1="' +
      ml +
      '" y1="' +
      yy +
      '" x2="' +
      (W - mr) +
      '" y2="' +
      yy +
      '" stroke="var(--line)"/><text x="' +
      (ml - 7) +
      '" y="' +
      (yy + 4) +
      '" text-anchor="end" fill="var(--ink2)" font-size="10" font-weight="600">' +
      lvl +
      '</text>';
  }
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
    const xi = Math.round(f * (n - 1)),
      xx = ml + xi * bw;
    g +=
      '<text x="' +
      xx +
      '" y="' +
      (H - mb + 13) +
      '" text-anchor="middle" fill="var(--ink2)" font-size="10" font-weight="600">' +
      xi +
      '</text>';
  });
  g +=
    '<line x1="' +
    ml +
    '" y1="' +
    mt +
    '" x2="' +
    ml +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--ink2)" stroke-width="1.6"/><line x1="' +
    ml +
    '" y1="' +
    (H - mb) +
    '" x2="' +
    (W - mr) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--ink2)" stroke-width="1.6"/><line x1="' +
    ml +
    '" y1="' +
    mid +
    '" x2="' +
    (W - mr) +
    '" y2="' +
    mid +
    '" stroke="var(--ink2)" stroke-width="1.2"/>';
  for (let i = 0; i < n; i++) {
    const h = Math.min(Math.abs(z[i]) * unit, mid - mt),
      x = ml + i * bw,
      y = z[i] >= 0 ? mid - h : mid;
    g +=
      '<rect class="' +
      (z[i] >= 0 ? 'noise-pos' : 'noise-neg') +
      '" x="' +
      x.toFixed(2) +
      '" y="' +
      y.toFixed(2) +
      '" width="' +
      Math.max(0.8, bw * 0.75).toFixed(2) +
      '" height="' +
      h.toFixed(2) +
      '" opacity=".92"/>';
  }
  g +=
    '<text x="' +
    ml +
    '" y="' +
    (H - 8) +
    '" fill="var(--muted)" font-size="10">șocuri succesive Zᵢ (primele ' +
    n +
    ')</text>';
  $('bmNoiseChart').innerHTML =
    '<div class="scrollx"><svg class="noise-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '">' +
    g +
    '</svg></div>';
  const mean = z.reduce((a, b) => a + b, 0) / n,
    variance = z.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  $('bmNoiseStats').textContent =
    'Media Z = ' +
    ro(mean, 3) +
    ' · varianța Z = ' +
    ro(variance, 3) +
    ' · Δt = ' +
    ro(T / steps, 4);
}
function simulateDistributionNow() {
  const result = simulateTerminalDistribution({
    seed: appState.simulation.brownianSeed,
    count: num('bmDistN'),
    variable: readControl('bmDistVar'),
    maturity: num('bmT'),
    drift: num('bmMu') / 100,
    volatility: num('bmSigma') / 100,
  });
  $('bmDistChart').innerHTML = distFanChart(
    result.paths,
    result.terminal,
    result.density,
    result.maturity,
    result.variable !== 'price',
  );
  $('bmDistStats').textContent =
    (result.variable === 'price' ? 'Preț' : 'Randament logaritmic') +
    ' la T: media simulată ' +
    ro(result.mean, 3) +
    ' vs. teoretic ' +
    ro(result.theoreticalMean, 3) +
    ' · abaterea standard simulată ' +
    ro(result.standardDeviation, 3) +
    ' vs. teoretic ' +
    ro(result.theoreticalStandardDeviation, 3) +
    ' · ' +
    result.terminal.length +
    ' traiectorii';
}
function simulateBrownian(...args) {
  schedule('simulateBrownian', () => simulateBrownianNow(...args));
}
function noiseChart(...args) {
  schedule('noiseChart', () => noiseChartNow(...args));
}
function simulateDistribution(...args) {
  schedule('simulateDistribution', () => simulateDistributionNow(...args));
}
export { simulateBrownian, initBrownian, noiseChart, simulateDistribution };
