import { $, esc, pnum } from '../dom.js';
import { CONFIGS } from '../../domain/configurations.js';
import { pricingState } from '../../state/store.js';
import { PRESETS, LABEL_S, LABEL_R } from './model.js';
import { renderAll } from './renderers.js';
import { writeControl } from '../../state/controls.js';
function buildForm() {
  const sel = $('cfg');
  let h = '';
  for (const k in CONFIGS) h += '<option value="' + k + '">' + esc(CONFIGS[k].nume) + '</option>';
  sel.innerHTML = h;
  sel.value = pricingState.config;
  sel.addEventListener('change', () => {
    pricingState.config = sel.value;
    const pr = PRESETS[pricingState.config];
    for (const kk in pr) pricingState[kk] = pr[kk];
    if (CONFIGS[pricingState.config].campuri.includes('Tf') && !pricingState.Tf)
      pricingState.Tf = 1;
    fillInputs();
    syncFields();
    renderAll();
  });
  ['S', 'K', 'T', 'sigma', 'r', 'q', 'rf', 'Tf'].forEach((k) => {
    $('in_' + k).addEventListener('input', function () {
      const v = pnum(this.value);
      if (!isNaN(v)) {
        pricingState[k] = k === 'sigma' || k === 'r' || k === 'q' || k === 'rf' ? v / 100 : v;
        renderAll();
      }
    });
  });
  $('in_settleTf').addEventListener('change', function () {
    pricingState.settleTf = this.checked;
    renderAll();
  });
  $('in_n').addEventListener('input', function () {
    pricingState.n = +this.value;
    $('nOut').textContent = pricingState.n;
    renderAll();
  });
  segment('segTip', (v) => {
    pricingState.tip = v;
    renderAll();
  });
  segment('segStil', (v) => {
    pricingState.stil = v;
    renderAll();
  });
}
function segment(id, cb) {
  const box = $(id);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    Array.prototype.forEach.call(box.querySelectorAll('button'), (x) => {
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    cb(b.dataset.v);
  });
}
function fillInputs() {
  writeControl('in_S', pricingState.S, 'value');
  writeControl('in_K', pricingState.K, 'value');
  writeControl('in_T', pricingState.T, 'value');
  writeControl('in_sigma', +(pricingState.sigma * 100).toFixed(6), 'value');
  writeControl('in_r', +(pricingState.r * 100).toFixed(6), 'value');
  writeControl('in_q', +(pricingState.q * 100).toFixed(6), 'value');
  writeControl('in_rf', +(pricingState.rf * 100).toFixed(6), 'value');
  writeControl('in_Tf', pricingState.Tf, 'value');
  writeControl('in_settleTf', !!pricingState.settleTf, 'checked');
  writeControl('in_n', pricingState.n, 'value');
  $('nOut').textContent = pricingState.n;
}
function syncFields() {
  const c = CONFIGS[pricingState.config],
    f = c.campuri;
  $('f_q').style.display = f.includes('q') ? '' : 'none';
  $('f_rf').style.display = f.includes('rf') ? '' : 'none';
  $('f_Tf').style.display = f.includes('Tf') ? '' : 'none';
  $('f_settle').style.display = f.includes('settleTf') ? '' : 'none';
  $('lab_S').textContent = LABEL_S[pricingState.config];
  $('lab_r').textContent = LABEL_R[pricingState.config] || 'r — rată fără risc (%)';
  $('cfgHint').innerHTML = esc(c.bExplic) + ' <b>' + c.bFormula + '</b>';
}
export { buildForm, segment, fillInputs, syncFields };
