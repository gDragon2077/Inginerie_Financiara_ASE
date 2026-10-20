import { initializeControls } from './state/controls.js';
import { buildForm, fillInputs, syncFields } from './ui/pricing/form.js';
import { renderAll } from './ui/pricing/renderers.js';
import { drawConv } from './ui/pricing/convergence.js';
import { initTabs, initTheme } from './ui/shell.js';
import { initStrategies } from './ui/strategies/controller.js';
import { initBrownian } from './ui/labs/brownian.js';
import { initGreeks } from './ui/labs/greeks.js';
import { makeExerciseModule } from './ui/exercises.js';
import { reportError } from './ui/scheduler.js';

export function initializeApplication() {
  initializeControls();
  const initialize = (callback) => {
    try {
      callback();
    } catch (error) {
      reportError(error);
    }
  };
  initialize(() => {
    buildForm();
    fillInputs();
    syncFields();
    initTabs();
    initTheme();
    renderAll();
  });
  initialize(initStrategies);
  initialize(initBrownian);
  initialize(initGreeks);
  initialize(() =>
    makeExerciseModule({
      prefix: 'exbs_',
      types: ['bs', 'd1d2', 'parity', 'delta', 'fwd', 'carry'],
      amer: false,
    }).init(),
  );
  initialize(() =>
    makeExerciseModule({ prefix: 'excrr_', types: ['crr', 'params'], amer: true }).init(),
  );
  document.getElementById('convN').addEventListener('input', (event) => {
    document.getElementById('convNOut').textContent = event.target.value;
    drawConv();
  });
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', initializeApplication, { once: true });
else initializeApplication();
