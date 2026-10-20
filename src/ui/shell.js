import { $ } from './dom.js';
import { drawTree } from './pricing/tree.js';
import { drawConv } from './pricing/convergence.js';
import { appState } from '../state/store.js';
let configPanelEl;
let cfgMountBS;
let cfgMountCRR;
function initTabs() {
  cfgMountBS = $('cfgMount-bs');
  cfgMountCRR = $('cfgMount-crr');
  configPanelEl = $('configPanel');
  cfgMountBS.appendChild(configPanelEl);
  Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), (b) => {
    b.addEventListener('click', () => {
      Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), (x) => {
        x.setAttribute('aria-selected', x === b ? 'true' : 'false');
      });
      Array.prototype.forEach.call(document.querySelectorAll('.tabpane'), (s) => {
        s.classList.remove('on');
      });
      $('pane-' + b.dataset.tab).classList.add('on');
      if (b.dataset.tab === 'bs') cfgMountBS.appendChild(configPanelEl);
      if (b.dataset.tab === 'crr') cfgMountCRR.appendChild(configPanelEl);
      if (b.dataset.tab === 'crr') {
        drawTree();
        drawConv();
      }
      appState.ui.tab = b.dataset.tab;
      window.scrollTo(0, 0);
    });
  });
}
function initTheme() {
  const b = $('themeBtn');
  b.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
    appState.ui.theme = next;
    if (next) document.documentElement.setAttribute('data-theme', next);
    else document.documentElement.removeAttribute('data-theme');
    b.textContent =
      next === 'dark' ? 'Temă: întunecată' : next === 'light' ? 'Temă: luminoasă' : 'Temă: sistem';
    if ($('pane-crr').classList.contains('on')) {
      drawTree();
      drawConv();
    }
  });
}
export { configPanelEl, cfgMountBS, cfgMountCRR, initTabs, initTheme };
