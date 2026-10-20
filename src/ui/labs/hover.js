import { hideTip, num, ro, showTip } from '../dom.js';
import { greekAxisLabel } from './portfolio.js';
function parseRo(s) {
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}
function labHover(e) {
  const svg = e.target.closest && e.target.closest('.lab-svg');
  if (!svg || !svg.querySelector('path')) return;
  if (svg.closest('#bmDistChart')) {
    hideTip();
    return;
  }
  const rect = svg.getBoundingClientRect(),
    sx = ((e.clientX - rect.left) / rect.width) * 760;
  if (sx < 50 || sx > 742) {
    hideTip();
    return;
  }
  if (svg.closest('#bmCIChart')) {
    const T1 = num('bmCiT1');
    const T2 = num('bmCiT2');
    const steps = num('bmSteps');
    const nH = Math.max(1, Math.round((steps * T1) / (T1 + T2)));
    const nF = Math.max(1, steps - nH);
    const total = nH + nF;
    const xNH = 50 + (nH / total) * 692;
    const lb = svg.querySelectorAll('text');
    var ymin = parseRo(lb[0].textContent);
    var ymax = parseRo(lb[4].textContent);
    const ps = svg.querySelectorAll('path');
    let t;
    var parts = [];
    function valAt(path) {
      let lo = 0,
        hi = path.getTotalLength(),
        pt;
      for (let j = 0; j < 16; j++) {
        const mid = (lo + hi) / 2;
        pt = path.getPointAtLength(mid);
        if (pt.x < sx) lo = mid;
        else hi = mid;
      }
      pt = path.getPointAtLength((lo + hi) / 2);
      return ymax - ((pt.y - 16) / 250) * (ymax - ymin);
    }
    if (sx <= xNH) {
      t = ((sx - 50) / (xNH - 50)) * T1;
      parts.push('<span class="tl">Preț simulat:</span> <b>' + ro(valAt(ps[4]), 3) + '</b>');
    } else {
      t = T1 + ((sx - xNH) / (742 - xNH)) * T2;
      parts.push('<span class="tl">Mediana:</span> <b>' + ro(valAt(ps[3]), 3) + '</b>');
      parts.push('<span class="tl">Limită inf.:</span> <b>' + ro(valAt(ps[1]), 3) + '</b>');
      parts.push('<span class="tl">Limită sup.:</span> <b>' + ro(valAt(ps[2]), 3) + '</b>');
    }
    showTip(e, '<b>t = ' + ro(t, 3) + '</b><br>' + parts.join('<br>'));
    return;
  }
  const labels = svg.querySelectorAll('text');
  var ymin = labels.length >= 5 ? parseRo(labels[0].textContent) : 0;
  var ymax = labels.length >= 5 ? parseRo(labels[4].textContent) : 1;
  const paths = svg.querySelectorAll('path');
  var parts = [];
  paths.forEach((path, idx) => {
    let lo = 0,
      hi = path.getTotalLength(),
      pt;
    for (let j = 0; j < 14; j++) {
      const mid = (lo + hi) / 2;
      pt = path.getPointAtLength(mid);
      if (pt.x < sx) lo = mid;
      else hi = mid;
    }
    pt = path.getPointAtLength((lo + hi) / 2);
    const value = ymax - ((pt.y - 16) / 250) * (ymax - ymin);
    let title = 'Curba ' + (idx + 1);
    const prev = svg.parentElement.previousElementSibling;
    if (prev && prev.classList.contains('greek-mini-title')) title = prev.textContent;
    if (svg.closest('#greekValueChart')) title = idx === 0 ? 'P&L astăzi' : 'P&L la scadență';
    parts.push('<span class="tl">' + title + ':</span> <b>' + ro(value, 3) + '</b>');
  });
  const xmax = labels.length >= 10 ? parseRo(labels[9].textContent) : 1,
    xmin = labels.length >= 10 ? parseRo(labels[5].textContent) : 0,
    x = xmin + ((xmax - xmin) * (sx - 50)) / (742 - 50),
    xlabel = svg.closest('#pane-greeks') ? greekAxisLabel() : 't';
  showTip(e, '<b>' + xlabel + ' = ' + ro(x, 3) + '</b><br>' + parts.join('<br>'));
}
export { parseRo, labHover };
