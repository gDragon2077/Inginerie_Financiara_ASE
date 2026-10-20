import { num, $, ro, hideTip } from '../dom.js';
import { portfolioMetrics, greekAxisMeta, legsLabel } from './portfolio.js';
import { readControl } from '../../state/controls.js';
import { lineChart, miniChart } from '../charts/series.js';
import { simulateHedge } from './hedge.js';
import { appState } from '../../state/store.js';
import { labHover } from './hover.js';
import { schedule } from '../scheduler.js';
function renderGreeksNow() {
  const S0 = num('gSpot');
  const K = num('gStrike');
  const Tdays = num('gDays');
  const T0 = Tdays / 365;
  const vol0 = num('gVol');
  const r0 = num('gRate') / 100;
  const base = portfolioMetrics(S0);
  const entry = base.pret;
  const axis = greekAxisMeta();
  const points = [];
  let i;
  const N = 100;
  for (i = 0; i <= N; i++) {
    let S = S0,
      T = T0,
      sigma = vol0 / 100,
      x;
    if (axis.key === 'spot') {
      S = Math.max(0.01, S0 * 0.4 + (S0 * 1.2 * i) / N);
      x = S;
    } else if (axis.key === 'days') {
      const dmin = 0.5,
        dmax = Math.max(Tdays, 1),
        d = dmin + ((dmax - dmin) * i) / N;
      T = d / 365;
      x = d;
    } else {
      const vmin = Math.max(1, vol0 * 0.2),
        vmax = vol0 * 2.5,
        v = vmin + ((vmax - vmin) * i) / N;
      sigma = v / 100;
      x = v;
    }
    const o = portfolioMetrics(S, T, sigma, r0);
    points.push({
      x,
      S,
      price: (o.pret - entry) * 100,
      expiry: (o.expiry - entry) * 100,
      delta: o.delta * 100,
      gamma: o.gamma * 100,
      vega: o.vega,
      theta: (o.theta / 365) * 100,
      rho: o.rho,
    });
  }
  $('gType').disabled = readControl('gPortfolio', 'value') !== 'single';
  $('gLegsHint').textContent = 'Structură: ' + legsLabel();
  $('legExpiry').style.display = axis.key === 'spot' ? '' : 'none';
  $('greekValueTitle').textContent =
    axis.key === 'spot'
      ? 'P&L imediat vs. la scadență (funcție de Spot)'
      : 'P&L imediat (funcție de ' + axis.label + ')';
  const stepK = Math.max(0.01, num('gStrikeStep') || 5),
    nablaK = base.dK * 100 * stepK;
  const vals = [
    {
      s: 'V',
      name: 'Valoare netă',
      v: base.pret * 100,
      n: 'valoarea portofoliului × 100',
    },
    {
      s: '∇ₖ',
      name: 'Nabla (strike)',
      v: nablaK,
      sub: 'rată: ' + ro(base.dK * 100, 3) + ' / punct de strike',
      n: 'estimare (∂V/∂K analitic) pentru pasul de strike ales (K+' + ro(stepK, 2) + ')',
    },
    {
      s: 'Δ',
      name: 'Delta',
      v: base.delta * 100,
      sub: 'pe acțiune: ' + (base.delta >= 0 ? '+' : '') + ro(base.delta, 4),
      n: 'unități echivalente de spot',
    },
    {
      s: 'Γ',
      name: 'Gamma',
      v: base.gamma * 100,
      sub: 'pe acțiune: ' + ro(base.gamma, 5),
      n: 'schimbarea Delta la +1 spot',
    },
    {
      s: 'ν',
      name: 'Vega',
      v: base.vega,
      n: 'P&L la +1 punct de volatilitate',
    },
    {
      s: 'Θ',
      name: 'Theta',
      v: (base.theta / 365) * 100,
      n: 'P&L pentru o zi calendaristică',
    },
    {
      s: 'ρ',
      name: 'Rho',
      v: base.rho,
      n: 'P&L la +1 punct de rată',
    },
  ];
  $('greekCards').innerHTML = vals
    .map((x) => {
      const numeric = typeof x.v === 'number';
      return (
        '<div class="greek-card"><div class="symbol">' +
        x.s +
        '</div><small>' +
        x.name +
        '</small><div class="gvalue ' +
        (numeric ? (x.v >= 0 ? 'gpos' : 'gneg') : '') +
        '">' +
        (numeric ? (x.v >= 0 ? '+' : '') + ro(x.v, 3) : x.v) +
        '</div>' +
        (x.sub ? '<small>' + x.sub + '</small>' : '') +
        '<small>' +
        x.n +
        '</small></div>'
      );
    })
    .join('');
  const vlines =
      axis.key === 'spot'
        ? [
            {
              x: S0,
              label: 'S₀',
            },
            {
              x: K,
              label: 'K',
            },
          ]
        : [],
    mainSeries = [
      {
        y: points.map((p) => p.price),
        color: 'var(--accent)',
      },
    ];
  if (axis.key === 'spot')
    mainSeries.push({
      y: points.map((p) => p.expiry),
      color: 'var(--s2)',
    });
  $('greekValueChart').innerHTML = lineChart(mainSeries, {
    xmin: points[0].x,
    xmax: points[points.length - 1].x,
    zero: true,
    vlines,
  });
  $('deltaGammaChart').innerHTML =
    miniChart(points, 'delta', 'Delta contractuală', 'var(--accent)', vlines) +
    miniChart(points, 'gamma', 'Gamma contractuală', 'var(--s2)', vlines);
  $('vegaThetaChart').innerHTML =
    miniChart(points, 'vega', 'Vega / +1 pp vol', 'var(--ok)', vlines) +
    miniChart(points, 'theta', 'Theta / zi', 'var(--bad)', vlines) +
    miniChart(points, 'rho', 'Rho / +1 pp rată', 'var(--warn)', vlines);
  renderAttribution(base);
}
function renderAttribution(o) {
  const S0 = num('gSpot'),
    T0 = num('gDays') / 365,
    vol0 = num('gVol') / 100,
    r0 = num('gRate') / 100,
    ds = num('gShockS'),
    dv = num('gShockV') / 100,
    dr = num('gShockR') / 100,
    days = Math.min(Math.max(num('gShockT'), 0), num('gDays')),
    d = o.delta * 100 * ds,
    g = 0.5 * o.gamma * 100 * ds * ds,
    v = o.vega * 100 * dv,
    t = (o.theta * 100 * days) / 365,
    r = o.rho * 100 * dr,
    total = d + g + v + t + r;
  const Snew = Math.max(0.01, S0 + ds),
    Tnew = Math.max(T0 - days / 365, 1e-8),
    volNew = Math.max(0.001, vol0 + dv),
    rNew = r0 + dr,
    exact = (portfolioMetrics(Snew, Tnew, volNew, rNew).pret - o.pret) * 100,
    err = exact - total;
  function box(name, x) {
    return (
      '<div><small>' +
      name +
      '</small><b class="' +
      (x >= 0 ? 'gpos' : 'gneg') +
      '">' +
      (x >= 0 ? '+' : '') +
      ro(x, 2) +
      '</b></div>'
    );
  }
  $('greekAttribution').innerHTML =
    box('Delta', d) +
    box('Gamma', g) +
    box('Vega', v) +
    box('Theta', t) +
    box('Rho', r) +
    box('Total aproximat (Taylor)', total) +
    box('P&L exact (reevaluare)', exact) +
    box('Eroare aproximare', err);
}
function initGreeks() {
  if (!$('pane-greeks') || $('pane-greeks').hidden) return;
  $('greekGuide').innerHTML = [
    [
      'Nabla (strike)',
      'Chain',
      'Sensibilitatea analitică față de strike: cu cât s-ar schimba valoarea dacă întreaga structură s-ar muta pe strike-ul următor din chain, cu pasul ales.',
      '∇ₖV ≈ (∂V/∂K)·ΔK',
    ],
    [
      'Delta',
      'Direcție',
      'Aproximarea variației opțiunii la o unitate de mișcare a spotului.',
      'Δ = ∂V/∂S',
    ],
    [
      'Gamma',
      'Curbură',
      'Arată cât de repede se schimbă Delta; este maximă de regulă aproape ATM.',
      'Γ = ∂²V/∂S²',
    ],
    [
      'Vega',
      'Volatilitate',
      'Sensibilitatea la un punct procentual de volatilitate implicită.',
      'ν = ∂V/∂σ',
    ],
    [
      'Theta',
      'Timp',
      'Efectul trecerii unei zile. Pentru opțiunile long este de regulă negativ.',
      'Θ = −∂V/∂T',
    ],
    ['Rho', 'Dobândă', 'Sensibilitatea la un punct procentual al ratei fără risc.', 'ρ = ∂V/∂r'],
  ]
    .map(
      (x) =>
        '<div class="greek-explain"><h4>' +
        x[0] +
        ' · ' +
        x[1] +
        '</h4><p>' +
        x[2] +
        '</p><code>' +
        x[3] +
        '</code></div>',
    )
    .join('');
  [
    'gType',
    'gSide',
    'gPortfolio',
    'gSpot',
    'gStrike',
    'gDays',
    'gVol',
    'gRate',
    'gStrikeStep',
    'gAxis',
  ].forEach((id) => {
    $(id).addEventListener('input', () => {
      renderGreeks();
      simulateHedge();
    });
  });
  ['gShockS', 'gShockV', 'gShockT', 'gShockR'].forEach((id) => {
    $(id).addEventListener('input', () => {
      renderAttribution(portfolioMetrics(num('gSpot')));
    });
  });
  ['hedgeFreq', 'hedgeMu', 'hedgeVolReal'].forEach((id) => {
    $(id).addEventListener('input', simulateHedge);
  });
  $('hedgeResim').addEventListener('click', () => {
    appState.simulation.hedgeSeed = (appState.simulation.hedgeSeed + 65537) % 2147483647;
    simulateHedge();
  });
  document.addEventListener('mousemove', labHover);
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest('.lab-svg')) hideTip();
  });
  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.closest && el.closest('.lab-svg'))
        labHover({
          clientX: t.clientX,
          clientY: t.clientY,
          target: el,
        });
    },
    {
      passive: true,
    },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.closest && el.closest('.lab-svg'))
        labHover({
          clientX: t.clientX,
          clientY: t.clientY,
          target: el,
        });
    },
    {
      passive: true,
    },
  );
  document.addEventListener('touchend', hideTip);
  renderGreeks();
  simulateHedge();
}
function renderGreeks(...args) {
  schedule('renderGreeks', () => renderGreeksNow(...args));
}
export { renderGreeks, renderAttribution, initGreeks };
