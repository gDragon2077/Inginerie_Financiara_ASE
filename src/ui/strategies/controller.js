import { STRATEGY_PRESETS } from './catalog.js';
import { appState } from '../../state/store.js';
import { presetLegs, legDays } from './model.js';
import {
  renderChain,
  renderBuilder,
  renderExpiryTabs,
  renderPresets,
  renderResultTable,
} from './renderers.js';
import { $ } from '../dom.js';
import { writeControl, readControl } from '../../state/controls.js';
import { chartHTML, chartHover } from './charts.js';
function loadPreset(id) {
  const p = STRATEGY_PRESETS.filter((x) => x.id === id)[0];
  if (p) {
    appState.strategy.positions = presetLegs(p, true);
    renderChain();
    renderBuilder();
    document.querySelector('.chain-section').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
function initStrategies() {
  if (!$('pane-strategii')) return;
  if (!appState.strategy.positions.length)
    appState.strategy.positions = presetLegs(STRATEGY_PRESETS[0], true);
  renderExpiryTabs();
  renderChain();
  renderPresets();
  renderBuilder();
  ['chainSpot', 'chainVol', 'chainRate', 'chainStep', 'chainCount'].forEach((id) => {
    $(id).addEventListener('input', () => {
      renderChain();
      renderPresets();
      renderBuilder();
    });
  });
  $('expiryTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-days]');
    if (!b) return;
    writeControl('chainDays', b.dataset.days, 'value');
    renderExpiryTabs();
    renderChain();
    renderPresets();
    renderBuilder();
  });
  $('chartRange').addEventListener('input', () => {
    $('chartRangeOut').textContent = '±' + readControl('chartRange', 'value') + '%';
    $('builderChart').innerHTML = chartHTML(
      appState.strategy.positions,
      +readControl('chainSpot', 'value'),
      false,
      +readControl('chartRange', 'value'),
    );
  });
  $('optionChain').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    const type = b.dataset.type,
      side = +b.dataset.side,
      K = +b.dataset.k,
      price = +b.dataset.price,
      curDays = +readControl('chainDays', 'value'),
      matches = (l) =>
        l.type === type &&
        l.strike === K &&
        legDays(l) === curDays &&
        (side > 0 ? l.qty > 0 : l.qty < 0);
    if (appState.strategy.positions.some(matches)) {
      appState.strategy.positions = appState.strategy.positions.filter((l) => !matches(l));
    } else {
      appState.strategy.positions.push({
        id: appState.strategy.nextId++,
        type,
        qty: side,
        strike: K,
        price,
        days: curDays,
      });
    }
    renderChain();
    renderBuilder();
  });
  $('positions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (b) {
      appState.strategy.positions = appState.strategy.positions.filter(
        (l) => l.id !== +b.dataset.remove,
      );
      renderChain();
      renderBuilder();
      return;
    }
    const st = e.target.closest('[data-qtystep]');
    if (st) {
      const leg = appState.strategy.positions.filter((l) => l.id === +st.dataset.id)[0];
      if (leg) {
        const sign = leg.qty < 0 ? -1 : 1,
          aq = Math.max(1, Math.abs(leg.qty) + +st.dataset.qtystep);
        leg.qty = sign * aq;
        renderChain();
        renderBuilder();
      }
    }
  });
  $('positions').addEventListener('change', (e) => {
    const inp = e.target.closest('.qty-input');
    if (!inp) return;
    const leg = appState.strategy.positions.filter((l) => l.id === +inp.dataset.id)[0];
    if (!leg) return;
    const sign = leg.qty < 0 ? -1 : 1,
      aq = Math.max(1, Math.round(+inp.value) || 1);
    leg.qty = sign * aq;
    renderChain();
    renderBuilder();
  });
  $('presetGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (b) loadPreset(b.dataset.preset);
  });
  $('clearStrategy').addEventListener('click', () => {
    appState.strategy.positions = [];
    renderChain();
    renderBuilder();
  });
  ['buySpot', 'sellSpot'].forEach((id) => {
    $(id).addEventListener('click', () => {
      const S = +readControl('chainSpot', 'value');
      appState.strategy.positions.push({
        id: appState.strategy.nextId++,
        type: 'stock',
        qty: id === 'buySpot' ? 100 : -100,
        strike: S,
        price: 0,
      });
      renderChain();
      renderBuilder();
    });
  });
  $('scenarioSpot').addEventListener('input', renderResultTable);
  document.addEventListener('mousemove', chartHover);
  document.addEventListener('mouseout', (e) => {
    if (e.target.classList && e.target.classList.contains('payoff-hit')) {
      const g = e.target.ownerSVGElement.querySelector('.payoff-hover');
      if (g) g.setAttribute('visibility', 'hidden');
    }
  });
  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.classList && el.classList.contains('payoff-hit'))
        chartHover({
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
      if (el && el.classList && el.classList.contains('payoff-hit'))
        chartHover({
          clientX: t.clientX,
          clientY: t.clientY,
          target: el,
        });
    },
    {
      passive: true,
    },
  );
  document.addEventListener('touchend', () => {
    Array.prototype.forEach.call(document.querySelectorAll('.payoff-hover'), (g) => {
      g.setAttribute('visibility', 'hidden');
    });
  });
}
export { loadPreset, initStrategies };
