import { readControl } from '../../state/controls.js';
import { params, euro, ZEC } from './model.js';
import { blackScholes } from '../../domain/black-scholes.js';
import { crr } from '../../domain/binomial.js';
import { fmt, $, fmtp, showTip, hideTip } from '../dom.js';
import { schedule } from '../scheduler.js';
function drawConvNow() {
  const Nmax = +readControl('convN', 'value');
  const p = params();
  const bs = blackScholes(euro(p)).pret;
  const xs = [],
    ys = [];
  for (let n = 1; n <= Nmax; n++) {
    xs.push(n);
    ys.push(crr(p, n).pret);
  }
  const W = 760,
    H = 380,
    ml = 62,
    mr = 96,
    mt = 18,
    mb = 40;
  let lo = Infinity,
    hi = -Infinity;
  const start = Math.min(4, Nmax - 1);
  for (var i = start; i < ys.length; i++) {
    lo = Math.min(lo, ys[i]);
    hi = Math.max(hi, ys[i]);
  }
  lo = Math.min(lo, bs);
  hi = Math.max(hi, bs);
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(bs) * 0.02, 0.01);
  lo -= pad;
  hi += pad;
  const X = (n) => ml + ((n - 1) / (Nmax - 1)) * (W - ml - mr);
  const Y = (v) => mt + ((hi - v) / (hi - lo)) * (H - mt - mb);
  let g =
    '<defs><clipPath id="convClip"><rect x="' +
    ml +
    '" y="' +
    mt +
    '" width="' +
    (W - ml - mr) +
    '" height="' +
    (H - mt - mb) +
    '"/></clipPath></defs>';
  for (let t = 0; t <= 4; t++) {
    const v = lo + ((hi - lo) * t) / 4,
      y = Y(v);
    g +=
      '<line x1="' +
      ml +
      '" y1="' +
      y +
      '" x2="' +
      (W - mr) +
      '" y2="' +
      y +
      '" stroke="var(--line2)" stroke-width="1"/>';
    g +=
      '<text x="' +
      (ml - 8) +
      '" y="' +
      (y + 4) +
      '" text-anchor="end" font-size="11" fill="var(--muted)">' +
      fmt(v, 3) +
      '</text>';
  }
  const ticks = [1];
  for (let k = 1; k <= 5; k++) ticks.push(Math.round((Nmax * k) / 5));
  ticks.forEach((n) => {
    if (n < 1) return;
    g +=
      '<text x="' +
      X(n) +
      '" y="' +
      (H - mb + 20) +
      '" text-anchor="middle" font-size="11" fill="var(--muted)">' +
      n +
      '</text>';
  });
  g +=
    '<text x="' +
    (ml + W - mr) / 2 +
    '" y="' +
    (H - 4) +
    '" text-anchor="middle" font-size="11.5" fill="var(--muted)">număr de pași n</text>';
  g +=
    '<line x1="' +
    ml +
    '" y1="' +
    Y(bs) +
    '" x2="' +
    (W - mr) +
    '" y2="' +
    Y(bs) +
    '" stroke="var(--s2)" stroke-width="2" stroke-dasharray="6 4"/>';
  g +=
    '<text x="' +
    (W - mr + 8) +
    '" y="' +
    (Y(bs) + 4) +
    '" font-size="11.5" font-weight="600" fill="var(--s2)">BS ' +
    fmt(bs, ys[0] < 1 ? 5 : 4) +
    '</text>';
  let d = '';
  for (i = 0; i < xs.length; i++)
    d += (i ? 'L' : 'M') + X(xs[i]).toFixed(2) + ' ' + Y(ys[i]).toFixed(2) + ' ';
  g +=
    '<path d="' +
    d +
    '" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" clip-path="url(#convClip)"/>';
  let yCRR = Y(ys[ys.length - 1]);
  const yBS = Y(bs);
  if (Math.abs(yCRR - yBS) < 15) yCRR = yBS - 15;
  yCRR = Math.max(mt + 8, Math.min(H - mb - 4, yCRR));
  g +=
    '<text x="' +
    (W - mr + 8) +
    '" y="' +
    (yCRR + 4) +
    '" font-size="11.5" font-weight="600" fill="var(--s1)">CRR</text>';
  g +=
    '<rect id="convHit" x="' +
    ml +
    '" y="' +
    mt +
    '" width="' +
    (W - ml - mr) +
    '" height="' +
    (H - mt - mb) +
    '" fill="transparent"/>';
  g +=
    '<line id="convCross" x1="0" y1="' +
    mt +
    '" x2="0" y2="' +
    (H - mb) +
    '" stroke="var(--muted)" stroke-width="1" opacity="0"/>';
  g +=
    '<circle id="convDot" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2" opacity="0"/>';
  $('convChart').innerHTML =
    '<div class="scrollx"><svg viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" style="width:100%;min-width:640px;height:auto;display:block">' +
    g +
    '</svg></div>';
  $('convLegend').innerHTML =
    '<span><span class="sw" style="background:var(--s1)"></span>preț binomial CRR cu n pași</span>' +
    '<span><span class="sw" style="background:var(--s2)"></span>preț Black-Scholes (limita n → ∞)</span>';
  const amer = p.stil === 'american';
  let noteHtml = amer
    ? 'Pentru opțiuni <b>americane</b> nu există formulă închisă: linia portocalie este valoarea europeană Black-Scholes, iar distanța dintre curbe reprezintă prima de exercitare anticipată. Curba CRR converge către valoarea americană exactă.'
    : 'Convergența este <b>oscilantă</b>: prețul binomial trece alternativ deasupra și dedesubtul valorii Black-Scholes, pe măsură ce prețul de exercitare cade între două noduri terminale. Eroarea scade aproximativ ca 1/n; media a doi pași consecutivi (extrapolarea) converge sensibil mai repede.';
  if (!amer) {
    const difCur = crr(p, p.n).pret - bs;
    noteHtml =
      '<b>Diferența față de Black-Scholes</b> la <i>n</i> = ' +
      p.n +
      ' pași (arborele de mai sus): ' +
      (difCur >= 0 ? '+' : '') +
      fmt(difCur, ZEC) +
      ' &nbsp;(' +
      (difCur >= 0 ? '+' : '') +
      fmtp(difCur / bs, 2) +
      ' din preț). ' +
      noteHtml;
  }
  $('convNote').innerHTML = noteHtml;
  const hit = document.getElementById('convHit');
  function convHover(e) {
    const svgEl = hit.ownerSVGElement,
      rect = svgEl.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    let nn = Math.round(1 + ((sx - ml) / (W - ml - mr)) * (Nmax - 1));
    nn = Math.max(1, Math.min(Nmax, nn));
    const yv = ys[nn - 1];
    document.getElementById('convCross').setAttribute('x1', X(nn));
    document.getElementById('convCross').setAttribute('x2', X(nn));
    document.getElementById('convCross').setAttribute('opacity', '.5');
    const dot = document.getElementById('convDot');
    dot.setAttribute('cx', X(nn));
    dot.setAttribute('cy', Y(yv));
    dot.setAttribute('opacity', '1');
    showTip(
      e,
      '<b>n = ' +
        nn +
        '</b><br><span class="tl">CRR:</span> <b>' +
        fmt(yv, 4) +
        '</b><br><span class="tl">Black-Scholes:</span> ' +
        fmt(bs, 4) +
        '<br><span class="tl">eroare:</span> ' +
        (yv - bs >= 0 ? '+' : '') +
        fmt(yv - bs, 4),
    );
  }
  function convHide() {
    hideTip();
    document.getElementById('convCross').setAttribute('opacity', '0');
    document.getElementById('convDot').setAttribute('opacity', '0');
  }
  hit.addEventListener('mousemove', convHover);
  hit.addEventListener('mouseleave', convHide);
  hit.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (t)
        convHover({
          clientX: t.clientX,
          clientY: t.clientY,
        });
    },
    {
      passive: true,
    },
  );
  hit.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (t)
        convHover({
          clientX: t.clientX,
          clientY: t.clientY,
        });
    },
    {
      passive: true,
    },
  );
  hit.addEventListener('touchend', convHide);
}
function drawConv(...args) {
  schedule('drawConv', () => drawConvNow(...args));
}
export { drawConv };
