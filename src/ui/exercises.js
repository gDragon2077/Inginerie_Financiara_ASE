import { CONFIGS } from '../domain/configurations.js';
import { fmt, fmtp, $, esc, pnum } from './dom.js';
import { appState } from '../state/store.js';
import { EX_ORDER, pick, genParams } from '../domain/exercise-generator.js';
import { readControl, writeControl } from '../state/controls.js';
import { blackScholes, paritate } from '../domain/black-scholes.js';
import { crr } from '../domain/binomial.js';
import { withTip } from './pricing/model.js';
import { stepsCRR, stepsBS, bExpr } from './pricing/steps.js';
import { N } from '../domain/normal.js';
function descriereActiv(p) {
  const c = CONFIGS[p.config],
    m = p.meta;
  switch (p.config) {
    case 'stock':
      return (
        'Acțiunea companiei <b>' +
        m.nume +
        '</b> se tranzacționează la un preț spot <b>S₀ = ' +
        fmt(p.S, 2) +
        ' lei</b> și <b>nu plătește dividende</b> până la scadență.'
      );
    case 'stock_q':
      return (
        'Acțiunea companiei <b>' +
        m.nume +
        '</b> cotează la <b>S₀ = ' +
        fmt(p.S, 2) +
        ' lei</b> și oferă un <b>randament al dividendelor de q = ' +
        fmtp(p.q) +
        '</b> pe an, capitalizat continuu.'
      );
    case 'fx':
      return (
        'Cursul spot <b>' +
        m.nume +
        '</b> este <b>S₀ = ' +
        fmt(p.S, 4) +
        '</b>. Rata fără risc în moneda de decontare (' +
        m.dom +
        ') este <b>r = ' +
        fmtp(p.r) +
        '</b>, iar rata fără risc în moneda străină (' +
        m.str +
        ') este <b>r<sub>f</sub> = ' +
        fmtp(p.rf) +
        '</b>.'
      );
    case 'fut':
      return (
        'Un contract futures pe <b>' +
        m.nume +
        '</b> cotează la <b>F₀ = ' +
        fmt(p.S, 2) +
        ' ' +
        m.unit +
        '</b>, cu scadență cel puțin egală cu cea a opțiunii.'
      );
    case 'fwd_stock':
      return (
        'Acțiunea companiei <b>' +
        m.nume +
        '</b> cotează la <b>S₀ = ' +
        fmt(p.S, 2) +
        ' lei</b>, cu un randament al dividendelor de <b>q = ' +
        fmtp(p.q) +
        '</b>. Pe această acțiune există un contract <b>forward cu scadența T<sub>F</sub> = ' +
        fmt(p.Tf, 4) +
        ' ani</b>.'
      );
    case 'fwd_fx':
      return (
        'Cursul spot <b>' +
        m.nume +
        '</b> este <b>S₀ = ' +
        fmt(p.S, 4) +
        '</b>, cu <b>r = ' +
        fmtp(p.r) +
        '</b> în ' +
        m.dom +
        ' și <b>r<sub>f</sub> = ' +
        fmtp(p.rf) +
        '</b> în ' +
        m.str +
        '. Pe această pereche există un contract <b>forward cu scadența T<sub>F</sub> = ' +
        fmt(p.Tf, 4) +
        ' ani</b>.'
      );
  }
  return '';
}
function datePiata(p, includeR) {
  let s = 'Volatilitatea este <b>σ = ' + fmtp(p.sigma) + '</b>';
  if (includeR !== false && p.config !== 'fx' && p.config !== 'fwd_fx')
    s += ', iar rata fără risc este <b>r = ' + fmtp(p.r) + '</b>';
  return s + '.';
}
function makeExerciseModule(opts) {
  const pre = opts.prefix;
  function id(s) {
    return pre + s;
  }
  appState.exercises[opts.prefix] ??= {
    ok: 0,
    tot: 0,
    cur: null,
    gata: false,
    configurations: Object.fromEntries(EX_ORDER.map((key) => [key, true])),
  };
  const st = appState.exercises[opts.prefix];
  function genProblem() {
    let cfgs = EX_ORDER.filter((key) => st.configurations[key]);
    if (!cfgs.length) cfgs = EX_ORDER.slice();
    let cfgSel = pick(cfgs);
    let tip = readControl(id('Type'), 'value');
    if (tip === 'mix') tip = pick(opts.types);
    if (tip === 'fwd' && !['fwd_stock', 'fwd_fx'].includes(cfgSel)) {
      const fwdOpts = cfgs.filter((c) => c === 'fwd_stock' || c === 'fwd_fx');
      cfgSel = fwdOpts.length ? pick(fwdOpts) : pick(['fwd_stock', 'fwd_fx']);
    }
    const amer = opts.amer && $(id('Amer')) && readControl(id('Amer'), 'checked') && tip === 'crr';
    const p = genParams(cfgSel, amer);
    if (tip !== 'crr') p.stil = 'european';
    const zec = cfgSel === 'fx' || cfgSel === 'fwd_fx' ? 5 : 4;
    const q = {
      p,
      tip,
      zec,
      campuri: [],
      enunt: '',
      cerinta: '',
    };
    const opt =
      (p.tip === 'call' ? 'call' : 'put') +
      ' ' +
      (p.stil === 'american' ? 'americană' : 'europeană');
    const K = 'K = ' + fmt(p.K, zec === 5 ? 4 : 2);
    const T = 'T = ' + fmt(p.T, 4) + ' ani';
    q.enunt = descriereActiv(p);
    if (tip === 'carry' || tip === 'fwd') {
      if (!['fx', 'fwd_fx'].includes(cfgSel))
        q.enunt += ' Rata fără risc este <b>r = ' + fmtp(p.r) + '</b>.';
    }
    switch (tip) {
      case 'bs':
        q.enunt += ' ' + datePiata(p);
        q.cerinta =
          'Calculați, cu formula Black-Scholes generalizată, prețul unei opțiuni <b>' +
          (p.tip === 'call' ? 'call' : 'put') +
          ' europene</b> cu ' +
          K +
          ' și ' +
          T +
          '.';
        q.campuri = [
          {
            k: 'V',
            lab: 'Prețul opțiunii',
            val: blackScholes(p).pret,
            dec: zec,
            tol: 'pret',
          },
        ];
        break;
      case 'crr':
        p.n = pick([2, 3]);
        q.enunt += ' ' + datePiata(p);
        q.cerinta =
          'Folosind un arbore binomial <b>Cox-Ross-Rubinstein cu n = ' +
          p.n +
          ' pași</b>, calculați prețul unei opțiuni <b>' +
          opt +
          '</b> cu ' +
          K +
          ' și ' +
          T +
          '.';
        q.campuri = [
          {
            k: 'V',
            lab: 'Prețul opțiunii',
            val: crr(p, p.n).pret,
            dec: zec,
            tol: 'pret',
          },
        ];
        break;
      case 'params':
        p.n = pick([2, 3, 4, 5, 6]);
        q.enunt += ' ' + datePiata(p);
        q.cerinta =
          'Pentru un arbore <b>CRR cu n = ' +
          p.n +
          ' pași</b> pe orizontul ' +
          T +
          ', determinați factorii <i>u</i>, <i>d</i> și probabilitatea neutră la risc <i>p</i>.';
        const o = crr(p, p.n);
        q.campuri = [
          {
            k: 'u',
            lab: 'u',
            val: o.u,
            dec: 4,
            tol: 'mic',
          },
          {
            k: 'd',
            lab: 'd',
            val: o.d,
            dec: 4,
            tol: 'mic',
          },
          {
            k: 'p',
            lab: 'p',
            val: o.p,
            dec: 4,
            tol: 'mic',
          },
        ];
        break;
      case 'd1d2':
        q.enunt += ' ' + datePiata(p);
        q.cerinta =
          'Calculați argumentele <i>d</i><sub>1</sub> și <i>d</i><sub>2</sub> din formula Black-Scholes, pentru ' +
          K +
          ' și ' +
          T +
          '.';
        const ob = blackScholes(p);
        q.campuri = [
          {
            k: 'd1',
            lab: 'd₁',
            val: ob.d1,
            dec: 4,
            tol: 'mic',
          },
          {
            k: 'd2',
            lab: 'd₂',
            val: ob.d2,
            dec: 4,
            tol: 'mic',
          },
        ];
        break;
      case 'parity':
        const cP = blackScholes(withTip(p, 'call')).pret,
          pP = blackScholes(withTip(p, 'put')).pret;
        const dinCall = Math.random() < 0.5;
        q.enunt += ' ' + datePiata(p);
        q.enunt +=
          ' Pe piață se cotează opțiunea <b>' +
          (dinCall ? 'call' : 'put') +
          ' europeană</b> cu ' +
          K +
          ' și ' +
          T +
          ' la prețul <b>' +
          fmt(dinCall ? cP : pP, zec) +
          '</b>.';
        q.cerinta =
          'Folosind <b>paritatea put-call</b> (fără a recalcula Black-Scholes), determinați prețul opțiunii <b>' +
          (dinCall ? 'put' : 'call') +
          '</b> cu aceleași caracteristici.';
        q.campuri = [
          {
            k: 'V',
            lab: 'Prețul opțiunii ' + (dinCall ? 'put' : 'call'),
            val: dinCall ? pP : cP,
            dec: zec,
            tol: 'pret',
          },
        ];
        q.parityDinCall = dinCall;
        break;
      case 'delta':
        q.enunt += ' ' + datePiata(p);
        q.cerinta =
          'Calculați <b>delta</b> opțiunii ' +
          (p.tip === 'call' ? 'call' : 'put') +
          ' europene cu ' +
          K +
          ' și ' +
          T +
          (CONFIGS[cfgSel].forward || cfgSel === 'fut'
            ? ', în raport cu prețul forward/futures'
            : '') +
          '.';
        q.campuri = [
          {
            k: 'delta',
            lab: 'Δ',
            val: blackScholes(p).delta,
            dec: 4,
            tol: 'mic',
          },
        ];
        break;
      case 'fwd':
        if (cfgSel === 'fx') {
          p.Tf = p.T;
        }
        q.cerinta =
          'Calculați <b>prețul forward F₀</b> pentru scadența T<sub>F</sub> = ' +
          fmt(p.Tf || p.T, 4) +
          ' ani.';
        const rate = cfgSel === 'fwd_stock' ? p.q : p.rf;
        q.campuri = [
          {
            k: 'F',
            lab: 'F₀',
            val: p.S * Math.exp((p.r - rate) * (p.Tf || p.T)),
            dec: zec,
            tol: 'pret',
          },
        ];
        break;
      case 'carry':
        q.cerinta =
          'Care este <b>randamentul continuu echivalent <i>q</i></b> folosit în evaluarea opțiunilor pe acest activ suport? Răspundeți în procente pe an (de exemplu 2.50 pentru 2,50%).';
        q.campuri = [
          {
            k: 'q',
            lab: 'q (% pe an)',
            val: (p.r - CONFIGS[cfgSel].b(p)) * 100,
            dec: 2,
            tol: 'mic',
          },
        ];
        break;
    }
    st.cur = q;
    st.gata = false;
    window.__exDebug = window.__exDebug || {};
    window.__exDebug[pre] = q;
    afiseazaProblema();
  }
  function tolFor(kind, val) {
    if (kind === 'mic') return Math.max(0.0015, Math.abs(val) * 0.002);
    return Math.max(0.006, Math.abs(val) * 0.004);
  }
  function afiseazaProblema() {
    const q = st.cur;
    $(id('Problem')).innerHTML =
      '<div class="problem"><div class="qtitle">' +
      esc(CONFIGS[q.p.config].nume) +
      '</div>' +
      q.enunt +
      '<br><br><b>Cerință.</b> ' +
      q.cerinta +
      '</div>';
    $(id('Answers')).innerHTML = q.campuri
      .map(
        (f, i) =>
          '<div><label class="fl" for="' +
          id('ans' + i) +
          '">' +
          f.lab +
          '</label><input type="text" inputmode="decimal" id="' +
          id('ans' + i) +
          '" placeholder="' +
          f.dec +
          ' zecimale"></div>',
      )
      .join('');
    $(id('Feedback')).innerHTML = '';
    $(id('Solution')).innerHTML = '';
    const first = $(id('ans0'));
    if (first) first.focus();
    Array.prototype.forEach.call(
      document.querySelectorAll('#' + id('Answers') + ' input'),
      (inp) => {
        writeControl(inp.id, '');
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') verifica();
        });
      },
    );
  }
  function verifica() {
    const q = st.cur;
    if (!q) return;
    let toateOK = true;
    const det = [];
    q.campuri.forEach((f, i) => {
      const v = pnum(readControl(id('ans' + i), 'value'));
      const tol = tolFor(f.tol, f.val);
      const ok = isFinite(v) && Math.abs(v - f.val) <= tol;
      if (!ok) toateOK = false;
      det.push(
        '<div>' +
          (ok ? '✓' : '✗') +
          ' <b>' +
          f.lab +
          '</b>: răspunsul tău ' +
          (isFinite(v) ? fmt(v, f.dec) : '—') +
          ' &nbsp;·&nbsp; valoarea corectă <b>' +
          fmt(f.val, f.dec) +
          '</b></div>',
      );
    });
    if (!st.gata) {
      st.tot++;
      if (toateOK) st.ok++;
      st.gata = true;
      updateScore();
    }
    $(id('Feedback')).innerHTML =
      '<div class="fb ' +
      (toateOK ? 'ok' : 'bad') +
      '">' +
      (toateOK ? '<b>Corect.</b>' : '<b>Nu este corect.</b> Verifică pașii în rezolvare.') +
      det.join('') +
      '</div>';
  }
  function aratRezolvare() {
    const q = st.cur;
    if (!q) return;
    const p = q.p;
    let h = '';
    if (q.tip === 'params' || q.tip === 'crr') {
      h +=
        '<details class="steps" open><summary>Arborele binomial CRR</summary><div class="stepbody">' +
        stepsCRR(p, p.n) +
        '</div></details>';
      if (q.tip === 'crr')
        h +=
          '<details class="steps"><summary>Comparație: Black-Scholes pe aceleași date</summary><div class="stepbody">' +
          stepsBS(p) +
          '</div></details>';
    } else if (q.tip === 'fwd') {
      const rate2 = p.config === 'fwd_stock' ? p.q : p.rf;
      h +=
        '<details class="steps" open><summary>Prețul forward</summary><div class="stepbody">' +
        '<div class="step"><div class="lbl">Paritatea cash-and-carry</div><div class="fx">' +
        '<i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>·e<sup>(<i>r</i>−' +
        (p.config === 'fwd_stock' ? '<i>q</i>' : '<i>r<sub>f</sub></i>') +
        ')·<i>T<sub>F</sub></i></sup> = <span class="num">' +
        fmt(p.S, q.zec) +
        '·e<sup>(' +
        fmt(p.r, 4) +
        '−' +
        fmt(rate2, 4) +
        ')·' +
        fmt(p.Tf || p.T, 4) +
        '</sup></span> = <span class="res">' +
        fmt(q.campuri[0].val, q.zec) +
        '</span>' +
        '</div></div></div></details>';
    } else if (q.tip === 'carry') {
      h +=
        '<details class="steps" open><summary>Randamentul echivalent q</summary><div class="stepbody"><div class="step"><div class="lbl">' +
        esc(CONFIGS[p.config].nume) +
        '</div>' +
        '<div class="fx">' +
        bExpr(p) +
        '</div><div class="hint">' +
        esc(CONFIGS[p.config].bExplic) +
        '</div></div></div></details>';
    } else if (q.tip === 'parity') {
      const par = paritate(p);
      const cP = blackScholes(withTip(p, 'call')).pret,
        pP = blackScholes(withTip(p, 'put')).pret;
      h +=
        '<details class="steps" open><summary>Paritatea put-call</summary><div class="stepbody">' +
        '<div class="step"><div class="lbl">1. Forma generalizată</div><div class="fx"><i>c</i> − <i>p</i> = <i>S</i>·e<sup>−<i>q</i>τ</sup> − <i>K</i>·e<sup>−<i>r</i>τ</sup>, unde τ = <i>T</i>−<i>t</i></div></div>' +
        '<div class="step"><div class="lbl">2. Substituție</div><div class="fx"><span class="num">' +
        fmt(par.X, q.zec) +
        '·' +
        fmt(Math.exp((par.b - p.r) * p.T), 4) +
        ' − ' +
        fmt(p.K, q.zec) +
        '·' +
        fmt(Math.exp(-p.r * p.T), 4) +
        '</span> = <span class="res">' +
        fmt(par.diferenta, q.zec) +
        '</span></div></div>' +
        '<div class="step"><div class="lbl">3. Rezultatul</div><div class="fx">' +
        (q.parityDinCall
          ? '<i>p</i> = <i>c</i> − (' +
            fmt(par.diferenta, q.zec) +
            ') = <span class="num">' +
            fmt(cP, q.zec) +
            ' − ' +
            fmt(par.diferenta, q.zec) +
            '</span> = <span class="res">' +
            fmt(pP, q.zec) +
            '</span>'
          : '<i>c</i> = <i>p</i> + (' +
            fmt(par.diferenta, q.zec) +
            ') = <span class="num">' +
            fmt(pP, q.zec) +
            ' + ' +
            fmt(par.diferenta, q.zec) +
            '</span> = <span class="res">' +
            fmt(cP, q.zec) +
            '</span>') +
        '</div></div></div></details>';
    } else {
      h +=
        '<details class="steps" open><summary>Black-Scholes generalizat</summary><div class="stepbody">' +
        stepsBS(p) +
        '</div></details>';
      if (q.tip === 'delta') {
        const ov = blackScholes(p);
        h +=
          '<details class="steps" open><summary>Delta</summary><div class="stepbody"><div class="step"><div class="fx">' +
          (p.tip === 'call'
            ? 'Δ = e<sup>−<i>q</i>τ</sup>·<i>N</i>(<i>d</i><sub>1</sub>)'
            : 'Δ = e<sup>−<i>q</i>τ</sup>·[<i>N</i>(<i>d</i><sub>1</sub>) − 1]') +
          ' = <span class="num">' +
          fmt(Math.exp((ov.b - p.r) * p.T), 4) +
          '·' +
          fmt(p.tip === 'call' ? N(ov.d1) : N(ov.d1) - 1, 4) +
          '</span> = <span class="res">' +
          fmt(ov.delta, 4) +
          '</span>' +
          '</div></div></div></details>';
      }
    }
    $(id('Solution')).innerHTML = h;
  }
  function updateScore() {
    $(id('ScOk')).textContent = st.ok;
    $(id('ScTot')).textContent = st.tot;
    $(id('ScPct')).textContent = st.tot ? '(' + Math.round((100 * st.ok) / st.tot) + '%)' : '';
  }
  function init() {
    $(id('Cfgs')).addEventListener('change', (event) => {
      if (event.target.matches('input[type="checkbox"]'))
        st.configurations[event.target.value] = event.target.checked;
    });
    $(id('Cfgs')).innerHTML = EX_ORDER.map(
      (k) =>
        '<label class="chk" style="margin-bottom:5px"><input type="checkbox" value="' +
        k +
        '" checked><span>' +
        esc(CONFIGS[k].scurt) +
        '</span></label>',
    ).join('');
    $(id('New')).addEventListener('click', genProblem);
    $(id('Check')).addEventListener('click', verifica);
    $(id('Sol')).addEventListener('click', aratRezolvare);
    $(id('Reset')).addEventListener('click', () => {
      st.ok = 0;
      st.tot = 0;
      updateScore();
    });
    $(id('Type')).addEventListener('change', genProblem);
    genProblem();
  }
  return {
    init,
  };
}
export { descriereActiv, datePiata, makeExerciseModule };
