import { CONFIGS } from './configurations.js';
import { MAX_TREE_STEPS } from './constants.js';

export function finiteNumber(value, name, minimum = -Infinity, maximum = Infinity) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name}: valoare finită între ${minimum} și ${maximum} necesară.`);
  }
  return value;
}

export function validateSteps(steps) {
  finiteNumber(steps, 'Pași', 1, MAX_TREE_STEPS);
  if (!Number.isInteger(steps)) throw new RangeError('Numărul de pași trebuie să fie întreg.');
}

export function validateParameters(parameters) {
  if (!Object.hasOwn(CONFIGS, parameters.config))
    throw new RangeError('Configurație de activ necunoscută.');
  if (!['call', 'put'].includes(parameters.tip))
    throw new RangeError('Tipul trebuie să fie call sau put.');
  if (parameters.stil && !['european', 'american'].includes(parameters.stil))
    throw new RangeError('Stil de opțiune necunoscut.');
  finiteNumber(parameters.S, 'Spot', Number.MIN_VALUE);
  finiteNumber(parameters.K, 'Strike', Number.MIN_VALUE);
  finiteNumber(parameters.T, 'Maturitate', 0);
  finiteNumber(parameters.sigma, 'Volatilitate', 0);
  finiteNumber(parameters.r, 'Rată');
  if (['stock_q', 'fwd_stock'].includes(parameters.config)) finiteNumber(parameters.q, 'Dividend');
  if (['fx', 'fwd_fx'].includes(parameters.config)) finiteNumber(parameters.rf, 'Rată externă');
  if (CONFIGS[parameters.config].forward) {
    finiteNumber(parameters.Tf, 'Maturitate forward', parameters.T);
  }
}
