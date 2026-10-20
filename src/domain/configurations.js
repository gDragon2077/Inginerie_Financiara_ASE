const CONFIGS = {
  stock: {
    id: 'stock',
    nume: 'Acțiune fără dividende',
    scurt: 'Acțiune (fără dividende)',
    simbolSpot: 'S₀',
    campuri: [],
    forward: false,
    bFormula: 'q = 0',
    bExplic: 'Acțiunea nu plătește dividende, deci randamentul continuu echivalent este zero.',
    b: function (p) {
      return p.r;
    },
    subiacent: function (p) {
      return p.S;
    },
  },
  stock_q: {
    id: 'stock_q',
    nume: 'Acțiune / indice cu randament de dividend continuu q',
    scurt: 'Acțiune cu dividend continuu q',
    simbolSpot: 'S₀',
    campuri: ['q'],
    forward: false,
    bFormula: 'q = randamentul dividendului',
    bExplic: 'q este randamentul continuu al dividendului plătit de acțiune sau indice.',
    b: function (p) {
      return p.r - p.q;
    },
    subiacent: function (p) {
      return p.S;
    },
  },
  fx: {
    id: 'fx',
    nume: 'Curs valutar (opțiune pe valută)',
    scurt: 'Valută (curs de schimb)',
    simbolSpot: 'S₀ (curs spot)',
    campuri: ['rf'],
    forward: false,
    bFormula: 'q = r_f',
    bExplic: 'Rata externă r_f joacă rolul randamentului continuu echivalent.',
    b: function (p) {
      return p.r - p.rf;
    },
    subiacent: function (p) {
      return p.S;
    },
  },
  fut: {
    id: 'fut',
    nume: 'Futures / forward (prețul F este dat)',
    scurt: 'Futures / forward',
    simbolSpot: 'F₀ (preț futures)',
    campuri: [],
    forward: false,
    bFormula: 'q = r',
    bExplic:
      'Pentru un preț futures introdus direct în Black–76, randamentul echivalent este rata fără risc.',
    b: function (p) {
      return 0;
    },
    subiacent: function (p) {
      return p.S;
    },
  },
  fwd_stock: {
    id: 'fwd_stock',
    nume: 'Forward pe acțiune care plătește dividende',
    scurt: 'Forward pe acțiune cu dividende',
    simbolSpot: 'S₀ (spot acțiune)',
    campuri: ['q', 'Tf', 'settleTf'],
    forward: true,
    bFormula: 'q = r',
    bExplic:
      'Se calculează F₀ = S₀·e^((r−q_div)T_F), apoi opțiunea se evaluează prin Black–76 cu randamentul echivalent q = r.',
    b: function (p) {
      return 0;
    },
    subiacent: function (p) {
      return p.S * Math.exp((p.r - p.q) * p.Tf);
    },
  },
  fwd_fx: {
    id: 'fwd_fx',
    nume: 'Forward pe valută',
    scurt: 'Forward pe valută',
    simbolSpot: 'S₀ (curs spot)',
    campuri: ['rf', 'Tf', 'settleTf'],
    forward: true,
    bFormula: 'q = r',
    bExplic:
      'Se calculează F₀ = S₀·e^((r−r_f)T_F), apoi opțiunea se evaluează prin Black–76 cu randamentul echivalent q = r.',
    b: function (p) {
      return 0;
    },
    subiacent: function (p) {
      return p.S * Math.exp((p.r - p.rf) * p.Tf);
    },
  },
};
function factorDecontare(p) {
  const c = CONFIGS[p.config];
  if (c.forward && p.settleTf && p.Tf > p.T) return Math.exp(-p.r * (p.Tf - p.T));
  return 1;
}
export { CONFIGS, factorDecontare };
