const EX_ORDER = ['stock', 'stock_q', 'fx', 'fut', 'fwd_stock', 'fwd_fx'];
function rr(a, b, step) {
  const v = a + Math.random() * (b - a);
  return +(Math.round(v / step) * step).toFixed(6);
}
function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
const FIRME = ['ALFA', 'BETA', 'CARPATICA', 'DELTA', 'OMEGA', 'VEGA', 'SIGMA'];
const PERECHI = [
  {
    nume: 'EUR/RON',
    lo: 4.9,
    hi: 5.15,
    step: 0.0025,
    dom: 'RON',
    str: 'EUR',
    rd: [0.05, 0.075],
    rf: [0.015, 0.03],
    sig: [0.03, 0.07],
  },
  {
    nume: 'EUR/USD',
    lo: 1.0,
    hi: 1.2,
    step: 0.0025,
    dom: 'USD',
    str: 'EUR',
    rd: [0.03, 0.055],
    rf: [0.015, 0.035],
    sig: [0.06, 0.12],
  },
  {
    nume: 'USD/RON',
    lo: 4.3,
    hi: 4.9,
    step: 0.0025,
    dom: 'RON',
    str: 'USD',
    rd: [0.05, 0.075],
    rf: [0.03, 0.055],
    sig: [0.05, 0.1],
  },
  {
    nume: 'GBP/USD',
    lo: 1.2,
    hi: 1.4,
    step: 0.0025,
    dom: 'USD',
    str: 'GBP',
    rd: [0.03, 0.055],
    rf: [0.035, 0.06],
    sig: [0.07, 0.13],
  },
];
const MARFURI = [
  {
    nume: 'petrol Brent',
    unit: 'USD/baril',
    lo: 65,
    hi: 95,
    step: 0.5,
    sig: [0.25, 0.45],
  },
  {
    nume: 'grâu',
    unit: 'EUR/tonă',
    lo: 190,
    hi: 260,
    step: 1,
    sig: [0.18, 0.35],
  },
  {
    nume: 'indicele BET',
    unit: 'puncte',
    lo: 15000,
    hi: 19000,
    step: 50,
    sig: [0.15, 0.28],
  },
  {
    nume: 'gaze naturale',
    unit: 'EUR/MWh',
    lo: 25,
    hi: 55,
    step: 0.5,
    sig: [0.35, 0.6],
  },
];
function genParams(cfg, permiteAmerican) {
  const p = {
    config: cfg,
    tip: pick(['call', 'put']),
    stil: 'european',
    settleTf: false,
    n: 5,
  };
  p.T = pick([0.25, 0.5, 0.75, 1, 1.5, 2]);
  if (cfg === 'fx' || cfg === 'fwd_fx') {
    const pr = pick(PERECHI);
    p.meta = pr;
    p.S = rr(pr.lo, pr.hi, pr.step);
    p.K = rr(p.S * 0.97, p.S * 1.03, pr.step);
    p.r = rr(pr.rd[0], pr.rd[1], 0.0025);
    p.rf = rr(pr.rf[0], pr.rf[1], 0.0025);
    p.sigma = rr(pr.sig[0], pr.sig[1], 0.005);
  } else if (cfg === 'fut') {
    const m = pick(MARFURI);
    p.meta = m;
    p.S = rr(m.lo, m.hi, m.step);
    p.K = rr(p.S * 0.92, p.S * 1.08, m.step);
    p.sigma = rr(m.sig[0], m.sig[1], 0.01);
    p.r = rr(0.02, 0.07, 0.0025);
  } else {
    p.meta = {
      nume: pick(FIRME),
    };
    p.S = rr(30, 160, 1);
    p.K = rr(p.S * 0.88, p.S * 1.12, 1);
    p.sigma = rr(0.18, 0.45, 0.01);
    p.r = rr(0.02, 0.08, 0.0025);
    if (cfg === 'stock_q' || cfg === 'fwd_stock') p.q = rr(0.01, 0.05, 0.0025);
  }
  if (cfg === 'fwd_stock' || cfg === 'fwd_fx') p.Tf = +(p.T + pick([0, 0.25, 0.5, 1])).toFixed(4);
  if (permiteAmerican && Math.random() < 0.45) p.stil = 'american';
  return p;
}
export { EX_ORDER, rr, pick, FIRME, PERECHI, MARFURI, genParams };
