import { params } from './model.js';
import { crr } from '../../domain/binomial.js';
import { $, fmt, showTip, hideTip } from '../dom.js';
import { schedule } from '../scheduler.js';
function drawTreeNow() {
  const p = params();
  const n = p.n;
  const o = crr(p, n, true);
  const american = p.stil === 'american';
  const BW = american ? 132 : 118,
    BH = american ? 76 : 52,
    GX = american ? 186 : 172,
    GY = american ? 96 : 64;
  const W = 40 + n * GX + BW + 30,
    H = n * GY + 140;
  const midY = H / 2 + 14;
  const zS = Math.abs(o.tree.S[0][0]) < 10 ? 4 : 2;
  let maxV = 0;
  for (let a = 0; a <= n; a++)
    for (let bq = 0; bq <= a; bq++) maxV = Math.max(maxV, Math.abs(o.tree.V[a][bq]));
  const zV = maxV < 1 ? 4 : 3;
  const svg = $('treeSvg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.style.maxWidth = 'none';
  const px = (j) => 40 + j * GX;
  const py = (j, i) => midY + ((j - 2 * i) * GY) / 2;
  let g = '';
  for (var j = 0; j < n; j++)
    for (var i = 0; i <= j; i++) {
      const x1 = px(j) + BW,
        y1 = py(j, i);
      g +=
        '<line x1="' +
        x1 +
        '" y1="' +
        y1 +
        '" x2="' +
        px(j + 1) +
        '" y2="' +
        py(j + 1, i + 1) +
        '" stroke="var(--line)" stroke-width="2"/>';
      g +=
        '<line x1="' +
        x1 +
        '" y1="' +
        y1 +
        '" x2="' +
        px(j + 1) +
        '" y2="' +
        py(j + 1, i) +
        '" stroke="var(--line)" stroke-width="2"/>';
    }
  for (j = 0; j <= n; j++)
    for (i = 0; i <= j; i++) {
      const x = px(j),
        y = py(j, i),
        rt = y - BH / 2;
      const S = o.tree.S[j][i],
        V = o.tree.V[j][i],
        ex = o.tree.ex[j][i] && j < n;
      const terminal = j === n;
      const decision = american && !terminal;
      const stroke = ex ? 'var(--s2)' : 'var(--line)';
      const fill = ex ? 'var(--warn-soft)' : 'var(--surface)';
      g += '<g class="node" data-j="' + j + '" data-i="' + i + '" style="cursor:pointer">';
      g +=
        '<rect x="' +
        x +
        '" y="' +
        rt +
        '" width="' +
        BW +
        '" height="' +
        BH +
        '" rx="8" fill="' +
        fill +
        '" stroke="' +
        stroke +
        '" stroke-width="' +
        (ex ? 2.5 : 1.5) +
        '"/>';
      g +=
        '<text x="' +
        (x + BW / 2) +
        '" y="' +
        (rt + 16) +
        '" text-anchor="middle" font-size="13" font-family="ui-monospace,Menlo,monospace" fill="var(--muted)">S ' +
        fmt(S, zS) +
        '</text>';
      if (decision) {
        const Vu = o.tree.V[j + 1][i + 1],
          Vd = o.tree.V[j + 1][i];
        const cont = o.disc * (o.p * Vu + (1 - o.p) * Vd);
        const exVal = p.tip === 'call' ? Math.max(S - p.K, 0) : Math.max(p.K - S, 0);
        const contWins = cont >= exVal;
        g +=
          '<text x="' +
          (x + BW / 2) +
          '" y="' +
          (rt + BH / 2 + 3) +
          '" text-anchor="middle" font-size="12.5" font-weight="' +
          (contWins ? 700 : 400) +
          '" font-family="ui-monospace,Menlo,monospace" fill="' +
          (contWins ? 'var(--s1)' : 'var(--muted)') +
          '">cont ' +
          fmt(cont, zV) +
          '</text>';
        g +=
          '<text x="' +
          (x + BW / 2) +
          '" y="' +
          (rt + BH - 10) +
          '" text-anchor="middle" font-size="12.5" font-weight="' +
          (!contWins ? 700 : 400) +
          '" font-family="ui-monospace,Menlo,monospace" fill="' +
          (!contWins ? 'var(--s2)' : 'var(--muted)') +
          '">exer ' +
          fmt(exVal, zV) +
          '</text>';
      } else {
        g +=
          '<text x="' +
          (x + BW / 2) +
          '" y="' +
          (rt + BH - 12) +
          '" text-anchor="middle" font-size="16" font-weight="700" font-family="ui-monospace,Menlo,monospace" fill="' +
          (ex ? 'var(--s2)' : 'var(--s1)') +
          '">' +
          fmt(V, zV) +
          '</text>';
      }
      g += '</g>';
    }
  for (j = 0; j <= n; j++) {
    g +=
      '<text x="' +
      (px(j) + BW / 2) +
      '" y="18" text-anchor="middle" font-size="13" fill="var(--muted)">t = ' +
      fmt((j * p.T) / n, 3) +
      '</text>';
  }
  svg.innerHTML = g;
  Array.prototype.forEach.call(svg.querySelectorAll('.node'), (nd) => {
    nd.addEventListener('mousemove', (e) => {
      showTip(e, nodeTipHtml(o, p, n, +nd.dataset.j, +nd.dataset.i));
    });
    nd.addEventListener('mouseleave', hideTip);
    nd.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        if (t)
          showTip(
            {
              clientX: t.clientX,
              clientY: t.clientY,
            },
            nodeTipHtml(o, p, n, +nd.dataset.j, +nd.dataset.i),
          );
      },
      {
        passive: true,
      },
    );
    nd.addEventListener('touchend', hideTip);
  });
  const lg = $('treeLegend');
  if (lg) {
    lg.innerHTML = american
      ? '<span><span class="sw" style="background:var(--s1)"></span>valoare de continuare (cont) — dacă e mai mare, se așteaptă</span>' +
        '<span><span class="sw" style="background:var(--s2)"></span>valoare de exercitare (exer) — dacă e mai mare, exercitarea este optimă</span>' +
        '<span><span class="sw" style="background:var(--muted)"></span>prețul activului suport</span>'
      : '<span><span class="sw" style="background:var(--s1)"></span>valoarea opțiunii</span>' +
        '<span><span class="sw" style="background:var(--muted)"></span>prețul activului suport</span>';
  }
}
function nodeTipHtml(o, p, n, j, i) {
  const S = o.tree.S[j][i],
    V = o.tree.V[j][i],
    ex = o.tree.ex[j][i] && j < n;
  let html = '<b>Nodul (' + j + ', ' + i + ')</b> — t = ' + fmt((j * p.T) / n, 4) + '<br>';
  html +=
    '<span class="tl">preț activ suport:</span><br>' +
    '<span style="font-family:var(--serif);font-style:italic">S = S₀·u<sup>' +
    i +
    '</sup>·d<sup>' +
    (j - i) +
    '</sup></span><br>' +
    '<span style="font-family:var(--mono);font-size:11.5px">= ' +
    fmt(o.X0, 4) +
    '·' +
    fmt(o.u, 4) +
    '<sup>' +
    i +
    '</sup>·' +
    fmt(o.d, 4) +
    '<sup>' +
    (j - i) +
    '</sup> = <b>' +
    fmt(S, 4) +
    '</b></span><br><br>';
  if (j === n) {
    html += '<span class="tl">valoare la scadență (payoff):</span><br>';
    html +=
      '<span style="font-family:var(--mono);font-size:11.5px">' +
      (p.tip === 'call'
        ? 'max(S−K, 0) = max(' + fmt(S, 4) + '−' + fmt(p.K, 4) + ', 0)'
        : 'max(K−S, 0) = max(' + fmt(p.K, 4) + '−' + fmt(S, 4) + ', 0)') +
      ' = <b>' +
      fmt(V, 4) +
      '</b></span>';
  } else {
    const Vu = o.tree.V[j + 1][i + 1],
      Vd = o.tree.V[j + 1][i];
    const cont = o.disc * (o.p * Vu + (1 - o.p) * Vd);
    html +=
      '<span class="tl">valoare de continuare:</span><br>' +
      '<span style="font-family:var(--serif);font-style:italic">V = e<sup>−rΔt</sup>[p·V<sub>u</sub> + (1−p)·V<sub>d</sub>]</span><br>' +
      '<span style="font-family:var(--mono);font-size:11.5px">= ' +
      fmt(o.disc, 4) +
      '·[' +
      fmt(o.p, 4) +
      '·' +
      fmt(Vu, 4) +
      ' + ' +
      fmt(1 - o.p, 4) +
      '·' +
      fmt(Vd, 4) +
      '] = <b>' +
      fmt(cont, 4) +
      '</b></span>';
    if (p.stil === 'american') {
      const exVal = p.tip === 'call' ? Math.max(S - p.K, 0) : Math.max(p.K - S, 0);
      html +=
        '<br><br><span class="tl">valoare de exercitare imediată:</span><br>' +
        '<span style="font-family:var(--mono);font-size:11.5px">' +
        (p.tip === 'call' ? 'max(S−K, 0)' : 'max(K−S, 0)') +
        ' = <b>' +
        fmt(exVal, 4) +
        '</b></span><br>' +
        '<span style="font-family:var(--serif);font-style:italic">V = max(continuare, exercitare) = <b>' +
        fmt(V, 4) +
        '</b></span>' +
        (ex ? '<br><b style="color:var(--s2)">exercitare anticipată optimă</b>' : '');
    }
  }
  return html;
}
function drawTree(...args) {
  schedule('drawTree', () => drawTreeNow(...args));
}
export { drawTree, nodeTipHtml };
