import { validateSteps, validateParameters } from './validation.js';
import { deterministicTree } from './deterministic.js';
import { CONFIGS, factorDecontare } from './configurations.js';
function crr(p, nSteps, wantTree) {
  validateSteps(nSteps ?? p.n);
  validateParameters(p);
  if (p.T === 0 || p.sigma === 0) return deterministicTree(p, nSteps ?? p.n, wantTree);
  const c = CONFIGS[p.config];
  const n = nSteps ?? p.n;
  const T = p.T,
    sig = p.sigma,
    r = p.r,
    K = p.K;
  const b = c.b(p);
  const dt = T / n;
  const u = Math.exp(sig * Math.sqrt(dt));
  const d = 1 / u;
  const pu = (Math.exp(b * dt) - d) / (u - d);
  if (pu < 0 || pu > 1 || !Number.isFinite(pu))
    throw new RangeError('Probabilitate CRR invalidă. Crește numărul de pași sau volatilitatea.');
  const disc = Math.exp(-r * dt);
  const df = factorDecontare(p);
  const american = p.stil === 'american';
  const X0 = c.subiacent(p);
  const out = {
    n,
    dt,
    u,
    d,
    p: pu,
    disc,
    b,
    X0,
    df,
    valida: pu >= 0 && pu <= 1,
  };
  const V = new Float64Array(n + 1);
  const Sn = new Float64Array(n + 1);
  let i;
  for (i = 0; i <= n; i++) {
    const Sx = X0 * u ** i * d ** (n - i);
    Sn[i] = Sx;
    V[i] = p.tip === 'call' ? Math.max(Sx - K, 0) : Math.max(K - Sx, 0);
  }
  let tree = null;
  if (wantTree) {
    tree = {
      S: [],
      V: [],
      ex: [],
    };
    for (let lvl = 0; lvl <= n; lvl++) {
      tree.S.push(new Array(lvl + 1));
      tree.V.push(new Array(lvl + 1));
      tree.ex.push(new Array(lvl + 1));
    }
    for (i = 0; i <= n; i++) {
      tree.S[n][i] = Sn[i];
      tree.V[n][i] = V[i];
      tree.ex[n][i] = V[i] > 0;
    }
  }
  let lvl2 = null,
    lvl1 = null;
  for (let j = n - 1; j >= 0; j--) {
    for (i = 0; i <= j; i++) {
      const cont = disc * (pu * V[i + 1] + (1 - pu) * V[i]);
      const Sj = X0 * u ** i * d ** (j - i);
      const exVal = p.tip === 'call' ? Math.max(Sj - K, 0) : Math.max(K - Sj, 0);
      let exercitat = false;
      let val = cont;
      if (american && exVal > cont) {
        val = exVal;
        exercitat = true;
      }
      V[i] = val;
      if (wantTree) {
        tree.S[j][i] = Sj;
        tree.V[j][i] = val;
        tree.ex[j][i] = exercitat;
      }
      if (j === 2) {
        if (!lvl2)
          lvl2 = {
            S: [],
            V: [],
          };
        lvl2.S[i] = Sj;
        lvl2.V[i] = val;
      }
      if (j === 1) {
        if (!lvl1)
          lvl1 = {
            S: [],
            V: [],
          };
        lvl1.S[i] = Sj;
        lvl1.V[i] = val;
      }
    }
  }
  out.pret = V[0] * df;
  out.tree = tree;
  out.lvl1 = lvl1;
  out.lvl2 = lvl2;
  out.radacina = V[0];
  if (n >= 2 && lvl1 && lvl2) {
    out.delta = (df * (lvl1.V[1] - lvl1.V[0])) / (lvl1.S[1] - lvl1.S[0]);
    const g1 = (lvl2.V[2] - lvl2.V[1]) / (lvl2.S[2] - lvl2.S[1]);
    const g0 = (lvl2.V[1] - lvl2.V[0]) / (lvl2.S[1] - lvl2.S[0]);
    out.gamma = (df * (g1 - g0)) / ((lvl2.S[2] - lvl2.S[0]) / 2);
    out.theta = (df * (lvl2.V[1] - V[0])) / (2 * dt);
  }
  return out;
}
function crrGreeksNumerice(p, n) {
  validateParameters(p);
  const h = 0.005;
  const pUp = Object.assign({}, p, {
    sigma: p.sigma + h,
  });
  const pDn = Object.assign({}, p, {
    sigma: Math.max(p.sigma - h, 1e-6),
  });
  const vega = (crr(pUp, n).pret - crr(pDn, n).pret) / (pUp.sigma - pDn.sigma);
  const hr = 0.0001;
  const rUp = Object.assign({}, p, {
    r: p.r + hr,
  });
  const rDn = Object.assign({}, p, {
    r: p.r - hr,
  });
  const rho = (crr(rUp, n).pret - crr(rDn, n).pret) / (2 * hr);
  return {
    vega,
    rho,
  };
}
function primaAmericana(p, n) {
  validateParameters(p);
  const eu = Object.assign({}, p, {
    stil: 'european',
  });
  const am = Object.assign({}, p, {
    stil: 'american',
  });
  return crr(am, n).pret - crr(eu, n).pret;
}
function crrCombinatorial(p, nSteps) {
  validateSteps(nSteps ?? p.n);
  validateParameters(p);
  if (p.T === 0 || p.sigma === 0) return deterministicTree(p, nSteps ?? p.n, false);
  const c = CONFIGS[p.config];
  const n = nSteps ?? p.n;
  const X0 = c.subiacent(p),
    b = c.b(p),
    r = p.r,
    K = p.K,
    T = p.T,
    sig = p.sigma;
  const dt = T / n;
  const u = Math.exp(sig * Math.sqrt(dt)),
    d = 1 / u;
  const pu = (Math.exp(b * dt) - d) / (u - d);
  if (pu < 0 || pu > 1 || !Number.isFinite(pu))
    throw new RangeError('Probabilitate CRR invalidă. Crește numărul de pași sau volatilitatea.');
  const df = factorDecontare(p);
  const logP = Math.log(Math.max(pu, 1e-300)),
    logQ = Math.log(Math.max(1 - pu, 1e-300));
  const terms = [];
  let sum = 0;
  let logC = 0;
  let i;
  for (i = 0; i <= n; i++) {
    if (i > 0) logC += Math.log(n - i + 1) - Math.log(i);
    const prob = Math.exp(logC + i * logP + (n - i) * logQ);
    const S = X0 * u ** i * d ** (n - i);
    const pay = p.tip === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    sum += prob * pay;
    terms.push({
      i,
      prob,
      S,
      pay,
    });
  }
  const pret = Math.exp(-r * T) * sum * df;
  return {
    pret,
    u,
    d,
    p: pu,
    dt,
    df,
    n,
    terms,
  };
}
export { crr, crrGreeksNumerice, primaAmericana, crrCombinatorial };
