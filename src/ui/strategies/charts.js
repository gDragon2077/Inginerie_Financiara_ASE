import { referenceDays, totalPayoff } from './model.js';
import { money } from '../dom.js';
function chartHTML(legs, spot, compact, rangePct) {
  const W = compact ? 260 : 720;
  const H = compact ? 72 : 300;
  const ml = compact ? 2 : 50;
  const mr = compact ? 2 : 18;
  const mt = compact ? 4 : 16;
  const mb = compact ? 4 : 34;
  const span = (rangePct || 55) / 100;
  const lo = Math.max(0, spot * (1 - span));
  const hi = spot * (1 + span);
  const pts = [];
  let min = Infinity;
  let max = -Infinity;
  const refDays = referenceDays(legs);
  let i;
  for (i = 0; i <= 140; i++) {
    const s = lo + ((hi - lo) * i) / 140,
      y = totalPayoff(s, legs, refDays);
    pts.push([s, y]);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  const pad = (max - min) * 0.18 || 5;
  min -= pad;
  max += pad;
  function X(s) {
    return ml + ((s - lo) / (hi - lo)) * (W - ml - mr);
  }
  function Y(v) {
    return mt + ((max - v) / (max - min)) * (H - mt - mb);
  }
  const z = Y(0);
  let g = '';
  if (!compact) {
    for (i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4,
        gy = Y(v);
      g +=
        '<line x1="' +
        ml +
        '" y1="' +
        gy +
        '" x2="' +
        (W - mr) +
        '" y2="' +
        gy +
        '" stroke="var(--line2)"/><text x="' +
        (ml - 7) +
        '" y="' +
        (gy + 4) +
        '" text-anchor="end" fill="var(--muted)" font-size="10">' +
        money(v) +
        '</text>';
    }
    [0.5, 0.75, 1, 1.25, 1.5].forEach((k) => {
      g +=
        '<text x="' +
        X(spot * k) +
        '" y="' +
        (H - 8) +
        '" text-anchor="middle" fill="var(--muted)" font-size="10">' +
        Math.round(spot * k) +
        '</text>';
    });
  }
  g +=
    '<line x1="' +
    ml +
    '" y1="' +
    z +
    '" x2="' +
    (W - mr) +
    '" y2="' +
    z +
    '" stroke="var(--muted)"/>';
  for (i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      pos = (a[1] + b[1]) / 2 >= 0,
      color = pos ? 'var(--ok)' : 'var(--bad)',
      soft = pos ? 'var(--pay-fill-pos)' : 'var(--pay-fill-neg)';
    g +=
      '<path d="M' +
      X(a[0]) +
      ' ' +
      z +
      ' L' +
      X(a[0]) +
      ' ' +
      Y(a[1]) +
      ' L' +
      (X(b[0]) + 0.5) +
      ' ' +
      Y(b[1]) +
      ' L' +
      (X(b[0]) + 0.5) +
      ' ' +
      z +
      ' Z" fill="' +
      soft +
      '" shape-rendering="crispEdges"/><line x1="' +
      X(a[0]) +
      '" y1="' +
      Y(a[1]) +
      '" x2="' +
      X(b[0]) +
      '" y2="' +
      Y(b[1]) +
      '" stroke="' +
      color +
      '" stroke-width="' +
      (compact ? 3 : 2.6) +
      '"/>';
  }
  g +=
    '<line x1="' +
    X(spot) +
    '" y1="' +
    mt +
    '" x2="' +
    X(spot) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--s2)" stroke-dasharray="4 4"/><g class="payoff-hover" visibility="hidden"><line class="hover-line" y1="' +
    mt +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--ink)" opacity=".35"/><circle class="hover-dot" r="5" stroke="var(--surface)" stroke-width="2"/><rect class="hover-box" width="128" height="38" rx="5" fill="var(--surface)" stroke="var(--line)"/><text class="hover-price hover-label"></text><text class="hover-pnl hover-label"></text></g><rect class="payoff-hit" x="' +
    ml +
    '" y="' +
    mt +
    '" width="' +
    (W - ml - mr) +
    '" height="' +
    (H - mt - mb) +
    '" fill="transparent"/>';
  return (
    '<div class="scrollx"><svg class="payoff-svg" data-lo="' +
    lo +
    '" data-hi="' +
    hi +
    '" data-min="' +
    min +
    '" data-max="' +
    max +
    '" data-ml="' +
    ml +
    '" data-mr="' +
    mr +
    '" data-mt="' +
    mt +
    '" data-mb="' +
    mb +
    '" data-w="' +
    W +
    '" data-h="' +
    H +
    '" data-legs="' +
    encodeURIComponent(JSON.stringify(legs)) +
    '" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '"' +
    (compact ? ' style="min-width:0;height:72px"' : '') +
    '>' +
    g +
    '</svg></div>'
  );
}
function chartHover(e) {
  const hit = e.target.closest && e.target.closest('.payoff-hit');
  if (!hit) return;
  const svg = hit.ownerSVGElement;
  const rect = svg.getBoundingClientRect();
  const W = +svg.dataset.w;
  const H = +svg.dataset.h;
  const ml = +svg.dataset.ml;
  const mr = +svg.dataset.mr;
  const mt = +svg.dataset.mt;
  const mb = +svg.dataset.mb;
  const lo = +svg.dataset.lo;
  const hi = +svg.dataset.hi;
  const min = +svg.dataset.min;
  const max = +svg.dataset.max;
  let x = ((e.clientX - rect.left) / rect.width) * W;
  x = Math.max(ml, Math.min(W - mr, x));
  const s = lo + ((x - ml) / (W - ml - mr)) * (hi - lo),
    pnl = totalPayoff(s, JSON.parse(decodeURIComponent(svg.dataset.legs))),
    y = mt + ((max - pnl) / (max - min)) * (H - mt - mb),
    g = svg.querySelector('.payoff-hover'),
    bx = Math.min(W - 136, x + 8),
    by = Math.max(mt, Math.min(H - mb - 42, y - 45));
  g.setAttribute('visibility', 'visible');
  g.querySelector('.hover-line').setAttribute('x1', x);
  g.querySelector('.hover-line').setAttribute('x2', x);
  const dot = g.querySelector('.hover-dot');
  dot.setAttribute('cx', x);
  dot.setAttribute('cy', y);
  dot.setAttribute('fill', pnl >= 0 ? 'var(--ok)' : 'var(--bad)');
  const box = g.querySelector('.hover-box');
  box.setAttribute('x', bx);
  box.setAttribute('y', by);
  const t1 = g.querySelector('.hover-price'),
    t2 = g.querySelector('.hover-pnl');
  t1.setAttribute('x', bx + 8);
  t1.setAttribute('y', by + 15);
  t1.textContent = 'Spot: ' + money(s);
  t2.setAttribute('x', bx + 8);
  t2.setAttribute('y', by + 30);
  t2.setAttribute('fill', pnl >= 0 ? 'var(--ok)' : 'var(--bad)');
  t2.textContent = 'P/L: ' + (pnl >= 0 ? '+' : '') + money(pnl);
}
export { chartHTML, chartHover };
