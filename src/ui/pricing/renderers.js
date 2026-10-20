import { params, euro, ZEC } from './model.js';
import { CONFIGS } from '../../domain/configurations.js';
import { blackScholes } from '../../domain/black-scholes.js';
import { fmt, $, esc } from '../dom.js';
import { EX_ORDER } from '../../domain/exercise-generator.js';
import { MODELE } from '../theory.js';
import { stepsBS, stepsCRRDetailed, stepsCombo } from './steps.js';
import { crr } from '../../domain/binomial.js';
import { drawTree } from './tree.js';
import { drawConv } from './convergence.js';
import { schedule } from '../scheduler.js';
function renderBS() {
  const p = params();
  const c = CONFIGS[p.config];
  const pe = euro(p);
  const bsE = blackScholes(pe);
  const intr = p.tip === 'call' ? Math.max(p.S - p.K, 0) : Math.max(p.K - p.S, 0);
  const timeVal = isFinite(bsE.pret) ? bsE.pret - intr : NaN;
  let cards = '';
  cards += card(
    'Valoare teoretică Black–Scholes',
    fmt(bsE.pret, ZEC),
    'preț european, în timp continuu',
    true,
  );
  cards += card(
    'Valoare intrinsecă',
    fmt(intr, ZEC),
    'max(payoff dacă s-ar exercita acum, la S₀)',
    false,
  );
  cards += card(
    'Valoare temporală',
    fmt(timeVal, ZEC),
    'valoare teoretică − valoare intrinsecă',
    false,
  );
  $('cardsBS').innerHTML = cards;
  let al = '';
  if (c.forward && p.Tf < p.T)
    al +=
      '<div class="note warn">Scadența forwardului (T<sub>F</sub> = ' +
      fmt(p.Tf, 4) +
      ') este mai mică decât scadența opțiunii (T = ' +
      fmt(p.T, 4) +
      '). În practică se cere T ≤ T<sub>F</sub>.</div>';
  $('alertsBS').innerHTML = al;
  const configRows = EX_ORDER.map((k) => {
    const cfg = CONFIGS[k];
    const schimbare = {
      stock: '<i>S</i> = <i>S</i><sub>0</sub>; se folosește prețul spot',
      stock_q: '<i>S</i> = <i>S</i><sub>0</sub>; dividendul continuu este <i>q</i>',
      fx: '<i>S</i> = <i>S</i><sub>0</sub>; rata externă <i>r</i><sub>f</sub> joacă rolul lui <i>q</i>',
      fut: '<i>S</i> = <i>F</i><sub>0</sub>; se folosește direct prețul futures',
      fwd_stock:
        '<i>S</i> = <i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>e<sup>(<i>r</i>−<i>q</i><sub>div</sub>)<i>T</i><sub>F</sub></sup>',
      fwd_fx:
        '<i>S</i> = <i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>e<sup>(<i>r</i>−<i>r</i><sub>f</sub>)<i>T</i><sub>F</sub></sup>',
    }[k];
    return (
      '<tr' +
      (k === p.config ? ' style="background:var(--accent-soft)"' : '') +
      '><td>' +
      esc(cfg.scurt) +
      '</td><td class="sym">' +
      cfg.bFormula +
      '</td><td style="font-size:12.5px;color:var(--muted)">' +
      schimbare +
      '</td><td>' +
      MODELE[k] +
      '</td></tr>'
    );
  }).join('');
  $('bsConfigTable').innerHTML =
    '<tr><th>Configurație</th><th>Valoarea lui q</th><th>Ce se schimbă</th><th>Model</th></tr>' +
    configRows;
  $('stepsBS').innerHTML = stepsBS(p);
}
function card(k, v, note, hl) {
  return (
    '<div class="card' +
    (hl ? ' hl' : '') +
    '"><div class="k">' +
    k +
    '</div><div class="v">' +
    v +
    '</div><div class="n">' +
    note +
    '</div></div>'
  );
}
function renderCRR() {
  const p = params();
  const c = CONFIGS[p.config];
  const american = p.stil === 'american';
  const bsE = blackScholes(euro(p));
  const crrE = crr(euro(p), p.n);
  const crrSel = crr(p, p.n);
  let cards = '';
  cards += card(
    'Valoare binomială CRR — ' + p.n + ' pași',
    fmt(crrSel.pret, ZEC),
    (american ? 'opțiune americană' : 'opțiune europeană') + ', arbore recombinant',
    true,
  );
  cards += card(
    'Referință Black–Scholes (european)',
    fmt(bsE.pret, ZEC),
    'limita analitică atunci când n → ∞',
    false,
  );
  if (american) {
    cards += card(
      'Prima de exercitare anticipată',
      fmt(crrSel.pret - crrE.pret, ZEC),
      'american − european, în același arbore',
      false,
    );
  }
  $('cardsCRR').innerHTML = cards;
  let al = '';
  if (!crrSel.valida)
    al +=
      '<div class="note bad"><b>Probabilitate neutră la risc în afara intervalului (0,1):</b> p = ' +
      fmt(crrSel.p, 4) +
      '. Condiția de non-arbitraj d &lt; e^((r−q)Δt) &lt; u este încălcată. Măriți numărul de pași sau volatilitatea.</div>';
  if (c.forward && p.Tf < p.T)
    al +=
      '<div class="note warn">Scadența forwardului (T<sub>F</sub> = ' +
      fmt(p.Tf, 4) +
      ') este mai mică decât scadența opțiunii (T = ' +
      fmt(p.T, 4) +
      ').</div>';
  if (american && p.settleTf && c.forward)
    al +=
      '<div class="note warn">Decontarea amânată la T<sub>F</sub> este definită aici pentru opțiuni europene; pentru stilul american rezultatul este doar orientativ.</div>';
  if (american && p.tip === 'call' && c.b(p) >= p.r - 1e-12)
    al +=
      '<div class="note">Pentru un call american cu <i>q</i> = 0 exercitarea anticipată nu este niciodată optimă: prețul american coincide cu cel european.</div>';
  $('alertsCRR').innerHTML = al;
  const rows = [];
  rows.push(['Configurație', '', esc(c.nume), '']);
  rows.push(['Randament echivalent', '<i>q</i>', fmt(p.r - c.b(p), 4), c.bFormula]);
  const xnote = c.forward
    ? 'preț forward calculat din spot'
    : p.config === 'fut'
      ? 'prețul futures dat'
      : 'prețul spot';
  rows.push(['Activ suport (S₀)', '<i>S</i><sub>0</sub>', fmt(c.subiacent(p), 4), xnote]);
  if (c.forward && p.settleTf)
    rows.push([
      'Factor de decontare',
      'e<sup>−r(T<sub>F</sub>−T)</sup>',
      fmt(crrSel.df, 4),
      'plata are loc la T<sub>F</sub>',
    ]);
  rows.push(['Pas de timp', 'Δ<i>t</i>', fmt(p.T / p.n, 4), p.T + ' / ' + p.n]);
  rows.push(['Factor de creștere', '<i>u</i>', fmt(crrSel.u, 4), 'e<sup>σ√Δt</sup>']);
  rows.push(['Factor de scădere', '<i>d</i>', fmt(crrSel.d, 4), '1/u']);
  rows.push([
    'Drift neutru la risc',
    'e<sup>(<i>r</i>−<i>q</i>)Δ<i>t</i></sup>',
    fmt(Math.exp(c.b(p) * (p.T / p.n)), 4),
    'creșterea medie pe un pas',
  ]);
  rows.push([
    'Probabilitate neutră la risc',
    '<i>p</i>',
    fmt(crrSel.p, 4),
    crrSel.valida
      ? '<span class="badge ok">0 &lt; p &lt; 1</span>'
      : '<span class="badge bad">în afara (0,1)</span>',
  ]);
  rows.push(['Actualizare pe un pas', 'e<sup>−<i>r</i>Δ<i>t</i></sup>', fmt(crrSel.disc, 4), '']);
  $('tabParamsCRR').innerHTML =
    '<tr><th>Mărime</th><th>Simbol</th><th style="text-align:right">Valoare</th><th>Observație</th></tr>' +
    rows
      .map(
        (r) =>
          '<tr><td>' +
          r[0] +
          '</td><td class="sym">' +
          r[1] +
          '</td><td class="num">' +
          r[2] +
          '</td><td style="color:var(--muted);font-size:12.5px">' +
          r[3] +
          '</td></tr>',
      )
      .join('');
  $('stepsCRR').innerHTML = stepsCRRDetailed(p, p.n);
  $('stepsCombo').innerHTML = stepsCombo(p, p.n);
  renderCRRParamsTable(p, c, crrSel);
  const qRows = EX_ORDER.map((k) => {
    const cfg = CONFIGS[k];
    const schimbare = {
      stock: '<i>S</i><sub>0,0</sub> = <i>S</i><sub>0</sub>; se pornește de la spot',
      stock_q: '<i>S</i><sub>0,0</sub> = <i>S</i><sub>0</sub>; dividendul continuu este <i>q</i>',
      fx: '<i>S</i><sub>0,0</sub> = <i>S</i><sub>0</sub>; <i>r</i><sub>f</sub> joacă rolul lui <i>q</i>',
      fut: '<i>S</i><sub>0,0</sub> = <i>F</i><sub>0</sub>; se introduce prețul futures',
      fwd_stock:
        '<i>S</i><sub>0,0</sub> = <i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>e<sup>(<i>r</i>−<i>q</i><sub>div</sub>)<i>T</i><sub>F</sub></sup>',
      fwd_fx:
        '<i>S</i><sub>0,0</sub> = <i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>e<sup>(<i>r</i>−<i>r</i><sub>f</sub>)<i>T</i><sub>F</sub></sup>',
    }[k];
    return (
      '<tr' +
      (k === p.config ? ' style="background:var(--accent-soft)"' : '') +
      '><td>' +
      esc(cfg.scurt) +
      '</td><td class="sym">' +
      cfg.bFormula +
      '</td><td>' +
      schimbare +
      '</td></tr>'
    );
  }).join('');
  $('crrQNote').innerHTML =
    '<div class="note" style="margin-top:14px"><b>Valorile lui q și suportul inițial în CRR</b><div class="scrollx"><table class="t" style="margin-top:10px"><tr><th>Configurație</th><th>Valoarea lui q</th><th>Ce se modifică</th></tr>' +
    qRows +
    '</table></div><p style="margin:10px 0 0"><b>Atenție la forward:</b> nu se introduce o valoare forward dată. Se pornește de la spot, se calculează <i>F</i><sub>0</sub> cu formula din tabel și abia apoi acesta devine rădăcina arborelui.</p></div>';
}
function renderCRRParamsTable(p, c, o) {
  const dt = p.T / p.n,
    subFormula = c.forward
      ? p.config === 'fwd_stock'
        ? 'S₀·e<sup>(r−q)T<sub>F</sub></sup>'
        : 'S₀·e<sup>(r−r<sub>f</sub>)T<sub>F</sub></sup>'
      : p.config === 'fut'
        ? 'F₀ dat'
        : 'S₀ dat';
  const rows = [
    ['Configurație', '—', c.nume, '—'],
    ['Randament echivalent', '<i>q</i>', fmt(p.r - c.b(p), 4), c.bFormula],
    ['Activ suport inițial', '<i>S</i><sub>0,0</sub>', fmt(c.subiacent(p), 4), subFormula],
    ['Pas de timp', 'Δ<i>t</i>', fmt(dt, 4), '<i>T</i>/<i>n</i>'],
    ['Factor de creștere', '<i>u</i>', fmt(o.u, 4), 'e<sup>σ√Δt</sup>'],
    ['Factor de scădere', '<i>d</i>', fmt(o.d, 4), '1/<i>u</i>'],
    ['Probabilitate de creștere', '<i>p</i>', fmt(o.p, 4), '(e<sup>(r−q)Δt</sup>−d)/(u−d)'],
    ['Probabilitate de scădere', '1−<i>p</i>', fmt(1 - o.p, 4), '1−p'],
    ['Factor de actualizare', 'e<sup>−rΔt</sup>', fmt(o.disc, 4), 'e<sup>−rΔt</sup>'],
  ];
  if (c.forward && p.settleTf)
    rows.splice(3, 0, [
      'Factor de decontare',
      'DF<sub>F</sub>',
      fmt(o.df, 4),
      'e<sup>−r(T<sub>F</sub>−T)</sup>',
    ]);
  $('tabParamsCRR').innerHTML =
    '<tr><th>Mărime</th><th>Simbol</th><th>Formula de calcul</th><th style="text-align:right">Valoare</th></tr>' +
    rows
      .map(
        (r) =>
          '<tr><td>' +
          r[0] +
          '</td><td class="sym">' +
          r[1] +
          '</td><td class="formula-cell">' +
          r[3] +
          '</td><td class="num">' +
          r[2] +
          '</td></tr>',
      )
      .join('');
}
function renderAllNow() {
  renderBS();
  renderCRR();
  if ($('pane-crr').classList.contains('on')) {
    drawTree();
    drawConv();
  }
}
function renderAll(...args) {
  schedule('renderAll', () => renderAllNow(...args));
}
export { renderBS, card, renderCRR, renderCRRParamsTable, renderAll };
