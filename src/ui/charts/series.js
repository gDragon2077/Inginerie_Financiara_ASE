import { ro } from '../dom.js';
function lineChart(series, opt) {
  const W = 760;
  const H = 300;
  const ml = 50;
  const mr = 18;
  const mt = 16;
  const mb = 34;
  const xmin = opt.xmin || 0;
  const xmax = opt.xmax;
  let ymin = Infinity;
  let ymax = -Infinity;
  series.forEach((s) => {
    s.y.forEach((v) => {
      ymin = Math.min(ymin, v);
      ymax = Math.max(ymax, v);
    });
  });
  if (opt.zero) {
    ymin = Math.min(0, ymin);
    ymax = Math.max(0, ymax);
  }
  const pad = (ymax - ymin) * 0.1 || 1;
  ymin -= pad;
  ymax += pad;
  function X(x) {
    return ml + ((x - xmin) / (xmax - xmin)) * (W - ml - mr);
  }
  function Y(y) {
    return mt + ((ymax - y) / (ymax - ymin)) * (H - mt - mb);
  }
  const colors = ['var(--accent)', 'var(--s2)', 'var(--ok)', 'var(--warn)', '#8b5cf6', '#0891b2'];
  let g = '';
  for (var k = 0; k <= 4; k++) {
    const yv = ymin + ((ymax - ymin) * k) / 4,
      yy = Y(yv);
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
      ro(yv, 2) +
      '</text>';
  }
  for (k = 0; k <= 4; k++) {
    const xv = xmin + ((xmax - xmin) * k) / 4;
    g +=
      '<text x="' +
      X(xv) +
      '" y="' +
      (H - 9) +
      '" text-anchor="middle" fill="var(--ink2)" font-size="10" font-weight="600">' +
      ro(xv, 2) +
      '</text>';
  }
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
    '" stroke="var(--ink2)" stroke-width="1.6"/>';
  if (ymin < 0 && ymax > 0)
    g +=
      '<line x1="' +
      ml +
      '" y1="' +
      Y(0) +
      '" x2="' +
      (W - mr) +
      '" y2="' +
      Y(0) +
      '" stroke="var(--ink2)" stroke-width="1.2"/>';
  (opt.vlines || []).forEach((vl) => {
    if (vl.x < xmin || vl.x > xmax) return;
    const vx = X(vl.x);
    g +=
      '<line x1="' +
      vx.toFixed(1) +
      '" y1="' +
      mt +
      '" x2="' +
      vx.toFixed(1) +
      '" y2="' +
      (H - mb) +
      '" stroke="var(--muted)" stroke-dasharray="3 3" stroke-width="1"/><text x="' +
      vx.toFixed(1) +
      '" y="' +
      (mt + 10) +
      '" text-anchor="middle" fill="var(--muted)" font-size="9.5" font-weight="700">' +
      vl.label +
      '</text>';
  });
  series.forEach((s, si) => {
    const d = s.y
      .map(
        (v, i) =>
          (i ? 'L' : 'M') +
          X(xmin + ((xmax - xmin) * i) / (s.y.length - 1)).toFixed(1) +
          ' ' +
          Y(v).toFixed(1),
      )
      .join(' ');
    g +=
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      (s.color || colors[si % colors.length]) +
      '" stroke-width="' +
      (si === 0 ? 2.2 : 1.2) +
      '" opacity="' +
      (si === 0 ? 1 : 0.78) +
      '"/>';
  });
  return (
    '<div class="scrollx"><svg class="lab-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '">' +
    g +
    '</svg></div>'
  );
}
function intervalChart(history, center, lower, upper, T) {
  const W = 760;
  const H = 300;
  const ml = 50;
  const mr = 18;
  const mt = 16;
  const mb = 34;
  const nH = history.length - 1;
  const nF = center.length - 1;
  const total = nH + nF;
  const all = history.concat(lower, upper);
  let ymin = Math.min.apply(null, all);
  let ymax = Math.max.apply(null, all);
  const pad = (ymax - ymin) * 0.1 || 1;
  ymin -= pad;
  ymax += pad;
  function X(i) {
    return ml + (i / total) * (W - ml - mr);
  }
  function Y(v) {
    return mt + ((ymax - v) / (ymax - ymin)) * (H - mt - mb);
  }
  function path(values, offset) {
    return values
      .map((v, i) => (i ? 'L' : 'M') + X(i + offset).toFixed(1) + ' ' + Y(v).toFixed(1))
      .join(' ');
  }
  let g = '',
    k;
  for (k = 0; k <= 4; k++) {
    const yv = ymin + ((ymax - ymin) * k) / 4,
      yy = Y(yv);
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
      ro(yv, 2) +
      '</text>';
  }
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
    '" stroke="var(--ink2)" stroke-width="1.6"/>';
  const area =
    upper.map((v, i) => (i ? 'L' : 'M') + X(nH + i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ') +
    lower
      .slice()
      .reverse()
      .map((v, i) => 'L' + X(total - i).toFixed(1) + ' ' + Y(v).toFixed(1))
      .join(' ') +
    'Z';
  g +=
    '<path d="' +
    area +
    '" fill="var(--accent-soft)"/><path d="' +
    path(lower, nH) +
    '" fill="none" stroke="var(--s2)" stroke-width="1.5"/><path d="' +
    path(upper, nH) +
    '" fill="none" stroke="var(--s2)" stroke-width="1.5"/><path d="' +
    path(center, nH) +
    '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4"/><path d="' +
    path(history, 0) +
    '" fill="none" stroke="var(--accent)" stroke-width="2.6"/><circle cx="' +
    X(nH) +
    '" cy="' +
    Y(history[nH]) +
    '" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><line x1="' +
    X(nH) +
    '" y1="' +
    mt +
    '" x2="' +
    X(nH) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="' +
    (X(nH) - 6) +
    '" y="' +
    (mt + 11) +
    '" text-anchor="end" fill="var(--muted)" font-size="10">astăzi</text><text x="' +
    ml +
    '" y="' +
    (H - 9) +
    '" fill="var(--muted)" font-size="10">istoric simulat</text><text x="' +
    (W - mr) +
    '" y="' +
    (H - 9) +
    '" text-anchor="end" fill="var(--muted)" font-size="10">orizont +' +
    ro(T, 1) +
    ' ani</text>';
  return (
    '<div class="scrollx"><svg class="lab-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '">' +
    g +
    '</svg></div>'
  );
}
function divergeColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [
      [37, 99, 235],
      [139, 92, 246],
      [247, 127, 0],
    ],
    seg = t < 0.5 ? 0 : 1,
    f = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5,
    a = stops[seg],
    b = stops[seg + 1];
  return (
    'rgb(' +
    Math.round(a[0] + (b[0] - a[0]) * f) +
    ',' +
    Math.round(a[1] + (b[1] - a[1]) * f) +
    ',' +
    Math.round(a[2] + (b[2] - a[2]) * f) +
    ')'
  );
}
function distFanChart(paths, terminal, pdfFn, T, zero) {
  const W = 1000,
    H = 420,
    ml = 54,
    mr = 14,
    mt = 18,
    mb = 38,
    gap = 16,
    plotW = W - ml - mr,
    fanW = plotW * 0.66,
    histX0 = ml + fanW + gap,
    histW = plotW - fanW - gap;
  let ymin = Infinity,
    ymax = -Infinity;
  paths.forEach((p) => {
    p.forEach((v) => {
      ymin = Math.min(ymin, v);
      ymax = Math.max(ymax, v);
    });
  });
  if (zero) {
    ymin = Math.min(0, ymin);
    ymax = Math.max(0, ymax);
  }
  const pad = (ymax - ymin) * 0.05 || 1;
  ymin -= pad;
  ymax += pad;
  function Y(v) {
    return mt + ((ymax - v) / (ymax - ymin)) * (H - mt - mb);
  }
  function Xf(i, n) {
    return ml + (i / n) * fanW;
  }
  let g = '';
  for (var k = 0; k <= 4; k++) {
    const yv = ymin + ((ymax - ymin) * k) / 4,
      yy = Y(yv);
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
      (ml - 8) +
      '" y="' +
      (yy + 4) +
      '" text-anchor="end" fill="var(--ink2)" font-size="11" font-weight="600">' +
      ro(yv, 2) +
      '</text>';
  }
  for (k = 0; k <= 4; k++) {
    const xv = (T * k) / 4;
    g +=
      '<text x="' +
      (ml + (k / 4) * fanW).toFixed(1) +
      '" y="' +
      (H - 11) +
      '" text-anchor="middle" fill="var(--ink2)" font-size="11" font-weight="600">' +
      ro(xv, 2) +
      '</text>';
  }
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
    (ml + fanW).toFixed(1) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--ink2)" stroke-width="1.6"/>';
  if (ymin < 0 && ymax > 0)
    g +=
      '<line x1="' +
      ml +
      '" y1="' +
      Y(0) +
      '" x2="' +
      (ml + fanW).toFixed(1) +
      '" y2="' +
      Y(0) +
      '" stroke="var(--ink2)" stroke-width="1"/>';
  const mn = Math.min.apply(null, terminal),
    mx = Math.max.apply(null, terminal),
    rng = mx - mn || 1,
    op = Math.max(0.06, Math.min(0.6, 28 / paths.length));
  paths.forEach((p, idx) => {
    const n = p.length - 1,
      tcol = (terminal[idx] - mn) / rng,
      col = divergeColor(tcol),
      d = p.map((v, i) => (i ? 'L' : 'M') + Xf(i, n).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    g +=
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      col +
      '" stroke-width="1.15" opacity="' +
      op.toFixed(3) +
      '"/>';
  });
  g +=
    '<line x1="' +
    (ml + fanW).toFixed(1) +
    '" y1="' +
    mt +
    '" x2="' +
    (ml + fanW).toFixed(1) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="' +
    (ml + fanW).toFixed(1) +
    '" y="' +
    (mt - 6) +
    '" text-anchor="middle" fill="var(--muted)" font-size="10.5" font-weight="700">T</text>';
  const bins = 30;
  const binw = rng / bins || 1;
  const counts = [];
  let i;
  for (i = 0; i < bins; i++) counts.push(0);
  terminal.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - mn) / binw));
    counts[idx]++;
  });
  const maxc = Math.max.apply(null, counts) || 1;
  const curveSteps = 100;
  const curve = [];
  let maxDens = 0;
  for (i = 0; i <= curveSteps; i++) {
    const yv2 = mn + (rng * i) / curveSteps,
      c = pdfFn(yv2) * terminal.length * binw;
    curve.push([yv2, c]);
    maxDens = Math.max(maxDens, c);
  }
  const maxLen = Math.max(maxc, maxDens) * 1.1;
  function Xh(c) {
    return histX0 + Math.min(1, c / maxLen) * histW;
  }
  counts.forEach((c, i) => {
    const y0 = Y(mn + i * binw),
      y1 = Y(mn + (i + 1) * binw),
      xEnd = Xh(c);
    g +=
      '<rect x="' +
      histX0.toFixed(1) +
      '" y="' +
      Math.min(y0, y1).toFixed(1) +
      '" width="' +
      Math.max(0, xEnd - histX0).toFixed(1) +
      '" height="' +
      Math.max(0, Math.abs(y0 - y1) - 0.6).toFixed(1) +
      '" fill="' +
      divergeColor((mn + (i + 0.5) * binw - mn) / rng) +
      '" opacity=".5"/>';
  });
  const dPath = curve
    .map((pt, i) => {
      const xx = Xh(pt[1]),
        yy = Y(pt[0]);
      return (i ? 'L' : 'M') + xx.toFixed(1) + ' ' + yy.toFixed(1);
    })
    .join(' ');
  g +=
    '<path d="' +
    dPath +
    '" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-dasharray="5 3"/>';
  g +=
    '<line x1="' +
    histX0.toFixed(1) +
    '" y1="' +
    mt +
    '" x2="' +
    histX0.toFixed(1) +
    '" y2="' +
    (H - mb) +
    '" stroke="var(--ink2)" stroke-width="1"/>';
  g +=
    '<text x="' +
    (histX0 + histW / 2).toFixed(1) +
    '" y="' +
    (H - 11) +
    '" text-anchor="middle" fill="var(--muted)" font-size="10.5">distribuția la T</text>';
  g +=
    '<text x="' +
    ml +
    '" y="' +
    (mt + 13) +
    '" fill="var(--muted)" font-size="10.5">' +
    paths.length +
    ' traiectorii</text>';
  return (
    '<div class="scrollx"><svg class="lab-svg dist-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '">' +
    g +
    '</svg></div>'
  );
}
function miniChart(points, key, label, color, vlines) {
  return (
    '<div class="greek-mini-title">' +
    label +
    '</div>' +
    lineChart(
      [
        {
          y: points.map((x) => x[key]),
          color,
        },
      ],
      {
        xmin: points[0].x,
        xmax: points[points.length - 1].x,
        zero: true,
        vlines,
      },
    )
  );
}
function histogramChart(values, color) {
  const n = values.length;
  const mn = Math.min.apply(null, values);
  const mx = Math.max.apply(null, values);
  const bins = 16;
  const binw = (mx - mn) / bins || 1;
  const counts = [];
  let i;
  for (i = 0; i < bins; i++) counts.push(0);
  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - mn) / binw));
    counts[idx]++;
  });
  const W = 760,
    H = 260,
    ml = 50,
    mr = 18,
    mt = 16,
    mb = 34,
    maxc = Math.max.apply(null, counts) || 1;
  function X(i) {
    return ml + (i / bins) * (W - ml - mr);
  }
  function Y(c) {
    return mt + (1 - c / maxc) * (H - mt - mb);
  }
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const yy = mt + ((H - mt - mb) * k) / 4;
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
      Math.round(maxc * (1 - k / 4)) +
      '</text>';
  }
  counts.forEach((c, i) => {
    const x0 = X(i),
      x1 = X(i + 1),
      y = Y(c);
    g +=
      '<rect x="' +
      x0.toFixed(1) +
      '" y="' +
      y.toFixed(1) +
      '" width="' +
      Math.max(0, x1 - x0 - 1).toFixed(1) +
      '" height="' +
      (H - mb - y).toFixed(1) +
      '" fill="' +
      color +
      '" opacity=".85"/>';
  });
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
    const i = Math.round(f * bins),
      xx = X(i),
      v = mn + i * binw;
    g +=
      '<text x="' +
      xx +
      '" y="' +
      (H - 9) +
      '" text-anchor="middle" fill="var(--ink2)" font-size="10" font-weight="600">' +
      ro(v, 1) +
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
    '" stroke="var(--ink2)" stroke-width="1.6"/>';
  if (mn < 0 && mx > 0) {
    const zx = X((0 - mn) / binw);
    g +=
      '<line x1="' +
      zx.toFixed(1) +
      '" y1="' +
      mt +
      '" x2="' +
      zx.toFixed(1) +
      '" y2="' +
      (H - mb) +
      '" stroke="var(--muted)" stroke-dasharray="4 4"/>';
  }
  return (
    '<div class="scrollx"><svg class="lab-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '">' +
    g +
    '</svg></div>'
  );
}
export { lineChart, intervalChart, divergeColor, distFanChart, miniChart, histogramChart };
