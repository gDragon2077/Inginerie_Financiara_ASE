import { pricingState } from '../../state/store.js';
const PRESETS = {
  stock: {
    S: 100,
    K: 100,
    T: 1,
    sigma: 0.25,
    r: 0.05,
  },
  stock_q: {
    S: 100,
    K: 95,
    T: 1,
    sigma: 0.25,
    r: 0.05,
    q: 0.03,
  },
  fx: {
    S: 4.975,
    K: 5.0,
    T: 0.5,
    sigma: 0.08,
    r: 0.055,
    rf: 0.02,
  },
  fut: {
    S: 80,
    K: 78,
    T: 0.75,
    sigma: 0.3,
    r: 0.04,
  },
  fwd_stock: {
    S: 100,
    K: 102,
    T: 0.5,
    sigma: 0.28,
    r: 0.05,
    q: 0.02,
    Tf: 1,
    settleTf: false,
  },
  fwd_fx: {
    S: 4.975,
    K: 5.1,
    T: 0.5,
    sigma: 0.08,
    r: 0.055,
    rf: 0.02,
    Tf: 1,
    settleTf: false,
  },
};
const LABEL_S = {
  stock: 'S₀ — preț spot acțiune',
  stock_q: 'S₀ — nivel spot',
  fx: 'S₀ — curs de schimb spot',
  fut: 'F₀ — preț futures / forward',
  fwd_stock: 'S₀ — preț spot acțiune',
  fwd_fx: 'S₀ — curs de schimb spot',
};
const LABEL_R = {
  fx: 'r — rată internă (%)',
  fwd_fx: 'r — rată internă (%)',
};
const ZEC = 4;
function params() {
  return {
    ...pricingState,
  };
}
function withTip(p, tip) {
  const o = Object.assign({}, p);
  o.tip = tip;
  return o;
}
function euro(p) {
  const o = Object.assign({}, p);
  o.stil = 'european';
  return o;
}
export { PRESETS, LABEL_S, LABEL_R, ZEC, params, withTip, euro };
