import { appState, pricingState, store } from './store.js';
import { reportError, clearError } from '../ui/scheduler.js';
import { validateParameters, validateSteps } from '../domain/validation.js';

const pricingFields = new Set(['S', 'K', 'T', 'sigma', 'r', 'q', 'rf', 'Tf', 'n', 'settleTf']);
const percentages = new Set(['sigma', 'r', 'q', 'rf']);
const numericValue = (element) =>
  element.value.trim() === '' ? NaN : Number(element.value.trim().replace(',', '.'));

function saveControl(element) {
  const value = element.type === 'checkbox' ? element.checked : element.value;
  const pricingKey = element.id.startsWith('in_') ? element.id.slice(3) : null;
  if (pricingFields.has(pricingKey)) {
    pricingState[pricingKey] =
      pricingKey === 'settleTf'
        ? value
        : numericValue(element) / (percentages.has(pricingKey) ? 100 : 1);
  } else if (element.id === 'cfg') {
    pricingState.config = value;
  } else {
    appState.controls[element.id] = value;
  }
}

export function readControl(id) {
  const pricingKey = id.startsWith('in_') ? id.slice(3) : null;
  if (pricingFields.has(pricingKey))
    return pricingState[pricingKey] * (percentages.has(pricingKey) ? 100 : 1);
  if (id === 'cfg') return pricingState.config;
  return appState.controls[id];
}

export function writeControl(id, value, property = 'value') {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Control inexistent: ${id}`);
  element[property] = value;
  saveControl(element);
  return value;
}

export function initializeControls() {
  store.transaction(() => {
    for (const element of document.querySelectorAll('input[id], select[id]')) {
      if (!element.id.startsWith('in_') && element.id !== 'cfg') saveControl(element);
    }
  });
  const capture = (event) => {
    const element = event.target;
    if (!element.matches?.('input[id], select[id]')) return;
    const pricingKey = element.id.startsWith('in_') ? element.id.slice(3) : null;
    if (
      element.type === 'number' ||
      element.type === 'range' ||
      (pricingFields.has(pricingKey) && pricingKey !== 'settleTf')
    ) {
      const value = numericValue(element);
      if (
        !Number.isFinite(value) ||
        (element.min !== '' && value < Number(element.min)) ||
        (element.max !== '' && value > Number(element.max))
      ) {
        element.setAttribute('aria-invalid', 'true');
        reportError(new RangeError('Introdu o valoare numerică în intervalul indicat de câmp.'));
        event.stopImmediatePropagation();
        return;
      }
      if (pricingFields.has(pricingKey)) {
        try {
          if (pricingKey === 'n') validateSteps(value);
          else
            validateParameters({
              ...pricingState,
              [pricingKey]: value / (percentages.has(pricingKey) ? 100 : 1),
            });
        } catch (error) {
          element.setAttribute('aria-invalid', 'true');
          reportError(error);
          event.stopImmediatePropagation();
          return;
        }
      }
    }
    element.removeAttribute('aria-invalid');
    clearError();
    saveControl(element);
  };
  document.addEventListener('input', capture, true);
  document.addEventListener('change', capture, true);
}
