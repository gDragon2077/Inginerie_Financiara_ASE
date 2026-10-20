import { readControl } from '../state/controls.js';
function $(id) {
  return document.getElementById(id);
}
function fmt(x, d) {
  if (x === null || x === undefined || !isFinite(x)) return '—';
  return Number(x).toFixed(d == null ? 4 : d);
}
function fmtp(x, d) {
  return fmt(x * 100, d == null ? 2 : d) + '%';
}
function pnum(s) {
  if (typeof s === 'number') return s;
  const v = parseFloat(String(s).replace(',', '.').trim());
  return isNaN(v) ? NaN : v;
}
function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}
function num(id) {
  return Number(readControl(id));
}
function ro(x, d) {
  return isFinite(x)
    ? Number(x).toLocaleString('ro-RO', {
        minimumFractionDigits: d == null ? 2 : d,
        maximumFractionDigits: d == null ? 2 : d,
      })
    : '—';
}
function money(x) {
  return isFinite(x)
    ? x.toLocaleString('ro-RO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : 'Nelimitat';
}
function roRatio(x) {
  return (
    x.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '×'
  );
}
function showTip(e, html) {
  const t = $('tip');
  t.innerHTML = html;
  t.style.display = 'block';
  let x = e.clientX + 14,
    y = e.clientY + 14;
  if (x + 300 > window.innerWidth) x = e.clientX - 300;
  if (y + 160 > window.innerHeight) y = e.clientY - 150;
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}
function hideTip() {
  $('tip').style.display = 'none';
}
export { $, fmt, fmtp, pnum, esc, num, ro, money, roRatio, showTip, hideTip };
