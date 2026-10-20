import { fmt, esc } from '../dom.js';
import { CONFIGS } from '../../domain/configurations.js';
import { ZEC, euro, withTip } from './model.js';
import { blackScholes, paritate } from '../../domain/black-scholes.js';
import { crr, crrCombinatorial } from '../../domain/binomial.js';
function bExpr(p) {
  switch (p.config) {
    case 'stock':
      return '<i>q</i> = <span class="res">0</span>';
    case 'stock_q':
      return (
        '<i>q</i> = <span class="res">' +
        fmt(p.q, 4) +
        '</span> <span class="num">(randamentul dividendului)</span>'
      );
    case 'fx':
      return '<i>q</i> = <i>r<sub>f</sub></i> = <span class="res">' + fmt(p.rf, 4) + '</span>';
    default:
      return (
        '<i>q</i> = <i>r</i> = <span class="res">' +
        fmt(p.r, 4) +
        '</span> <span class="num">(suport forward/futures)</span>'
      );
  }
}
function subiacentSteps(p) {
  const c = CONFIGS[p.config];
  let h = '';
  if (p.config === 'fwd_stock' || p.config === 'fwd_fx') {
    const rate = p.config === 'fwd_stock' ? p.q : p.rf;
    const simb = p.config === 'fwd_stock' ? '<i>q</i>' : '<i>r<sub>f</sub></i>';
    const F = p.S * Math.exp((p.r - rate) * p.Tf);
    h +=
      '<div class="step"><div class="lbl">2. Prețul forward (cash-and-carry)</div><div class="fx">' +
      '<i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>·e<sup>(<i>r</i>−' +
      simb +
      ')·<i>T<sub>F</sub></i></sup> = <span class="num">' +
      fmt(p.S, ZEC) +
      '·e<sup>(' +
      fmt(p.r, 4) +
      '−' +
      fmt(rate, 4) +
      ')·' +
      fmt(p.Tf, 4) +
      '</sup></span> = <span class="res">' +
      fmt(F, ZEC) +
      '</span>' +
      '</div><div class="hint">Volatilitatea σ se referă la prețul forward; sub rate deterministe ea coincide cu volatilitatea spotului.</div></div>';
  } else if (p.config === 'fut') {
    h +=
      '<div class="step"><div class="lbl">2. Activul suport</div><div class="fx"><i>S</i> = <i>F</i><sub>0</sub> = <span class="res">' +
      fmt(p.S, ZEC) +
      '</span></div></div>';
  } else {
    h +=
      '<div class="step"><div class="lbl">2. Activul suport</div><div class="fx"><i>S</i> = <i>S</i><sub>0</sub> = <span class="res">' +
      fmt(p.S, ZEC) +
      '</span></div></div>';
  }
  return h;
}
function stepsBS(p) {
  const c = CONFIGS[p.config];
  const o = blackScholes(euro(p));
  const call = p.tip === 'call';
  let h = '';
  h +=
    '<div class="step"><div class="lbl">1. Randamentul echivalent pentru „' +
    esc(c.nume) +
    '”</div><div class="fx">' +
    bExpr(p) +
    '</div>' +
    '<div class="hint">' +
    esc(c.bExplic) +
    '</div></div>';
  h += subiacentSteps(p);
  if (!isFinite(o.d1)) {
    h +=
      '<div class="note bad">Scadență sau volatilitate nulă — prețul este valoarea intrinsecă.</div>';
    return h;
  }
  h +=
    '<div class="step"><div class="lbl">3. Argumentele funcției de repartiție</div><div class="fx">' +
    '<i>d</i><sub>1</sub> = [ln(<i>S</i>/<i>K</i>) + (<i>r</i>−<i>q</i> + σ²/2)·τ] / (σ·√τ), unde τ = <i>T</i> − <i>t</i><br>' +
    '<span class="num">= [ln(' +
    fmt(o.X, ZEC) +
    '/' +
    fmt(p.K, ZEC) +
    ') + (' +
    fmt(o.b, 4) +
    ' + ' +
    fmt((p.sigma * p.sigma) / 2, 4) +
    ')·' +
    fmt(p.T, 4) +
    '] / (' +
    fmt(p.sigma, 4) +
    '·' +
    fmt(Math.sqrt(p.T), 4) +
    ')</span> = <span class="res">' +
    fmt(o.d1, ZEC) +
    '</span><br>' +
    '<i>d</i><sub>2</sub> = <i>d</i><sub>1</sub> − σ·√τ = <span class="num">' +
    fmt(o.d1, ZEC) +
    ' − ' +
    fmt(o.vt, ZEC) +
    '</span> = <span class="res">' +
    fmt(o.d2, ZEC) +
    '</span>' +
    '</div></div>';
  h +=
    '<div class="step"><div class="lbl">4. Probabilitățile normale</div><div class="fx">' +
    (call
      ? '<i>N</i>(<i>d</i><sub>1</sub>) = <span class="res">' +
        fmt(o.Nd1, ZEC) +
        '</span> &nbsp;&nbsp; <i>N</i>(<i>d</i><sub>2</sub>) = <span class="res">' +
        fmt(o.Nd2, ZEC) +
        '</span>'
      : '<i>N</i>(−<i>d</i><sub>1</sub>) = <span class="res">' +
        fmt(o.Nd1, ZEC) +
        '</span> &nbsp;&nbsp; <i>N</i>(−<i>d</i><sub>2</sub>) = <span class="res">' +
        fmt(o.Nd2, ZEC) +
        '</span>') +
    '</div></div>';
  const eb = Math.exp((o.b - p.r) * p.T),
    er = Math.exp(-p.r * p.T);
  h +=
    '<div class="step"><div class="lbl">5. Prețul opțiunii ' +
    (call ? 'call' : 'put') +
    ' europene</div><div class="fx">' +
    (call
      ? '<i>c</i> = <i>S</i>·e<sup>−<i>q</i>τ</sup>·<i>N</i>(<i>d</i><sub>1</sub>) − <i>K</i>·e<sup>−<i>r</i>τ</sup>·<i>N</i>(<i>d</i><sub>2</sub>)<br><span class="num">= ' +
        fmt(o.X, ZEC) +
        '·' +
        fmt(eb, ZEC) +
        '·' +
        fmt(o.Nd1, ZEC) +
        ' − ' +
        fmt(p.K, ZEC) +
        '·' +
        fmt(er, ZEC) +
        '·' +
        fmt(o.Nd2, ZEC) +
        '</span>'
      : '<i>p</i> = <i>K</i>·e<sup>−<i>r</i>τ</sup>·<i>N</i>(−<i>d</i><sub>2</sub>) − <i>S</i>·e<sup>−<i>q</i>τ</sup>·<i>N</i>(−<i>d</i><sub>1</sub>)<br><span class="num">= ' +
        fmt(p.K, ZEC) +
        '·' +
        fmt(er, ZEC) +
        '·' +
        fmt(o.Nd2, ZEC) +
        ' − ' +
        fmt(o.X, ZEC) +
        '·' +
        fmt(eb, ZEC) +
        '·' +
        fmt(o.Nd1, ZEC) +
        '</span>') +
    ' = <span class="res">' +
    fmt(o.df !== 1 ? o.pret / o.df : o.pret, ZEC) +
    '</span></div></div>';
  if (o.df !== 1) {
    h +=
      '<div class="step"><div class="lbl">5a. Actualizarea pentru decontarea la T<sub>F</sub></div><div class="fx">' +
      'preț = <span class="num">' +
      fmt(o.pret / o.df, ZEC) +
      ' · e<sup>−' +
      fmt(p.r, 4) +
      '·(' +
      fmt(p.Tf, 4) +
      '−' +
      fmt(p.T, 4) +
      ')</sup></span> = <span class="res">' +
      fmt(o.pret, ZEC) +
      '</span>' +
      '</div></div>';
  }
  const cE = blackScholes(withTip(euro(p), 'call')).pret;
  const pE = blackScholes(withTip(euro(p), 'put')).pret;
  const par = paritate(p);
  h +=
    '<div class="step"><div class="lbl">6. Paritatea call–put</div><div class="fx">' +
    '<i>c</i> − <i>p</i> = <i>S</i>·e<sup>−<i>q</i>τ</sup> − <i>K</i>·e<sup>−<i>r</i>τ</sup><br><br>' +
    '<b>Put din call:</b> &nbsp;<i>p</i> = <i>c</i> − <i>S</i>·e<sup>−<i>q</i>τ</sup> + <i>K</i>·e<sup>−<i>r</i>τ</sup><br>' +
    '<span class="num">= ' +
    fmt(cE, ZEC) +
    ' − ' +
    fmt(par.stanga, ZEC) +
    ' + ' +
    fmt(par.dreapta, ZEC) +
    '</span> = <span class="res">' +
    fmt(pE, ZEC) +
    '</span><br><br>' +
    '<b>Call din put:</b> &nbsp;<i>c</i> = <i>p</i> + <i>S</i>·e<sup>−<i>q</i>τ</sup> − <i>K</i>·e<sup>−<i>r</i>τ</sup><br>' +
    '<span class="num">= ' +
    fmt(pE, ZEC) +
    ' + ' +
    fmt(par.stanga, ZEC) +
    ' − ' +
    fmt(par.dreapta, ZEC) +
    '</span> = <span class="res">' +
    fmt(cE, ZEC) +
    '</span>' +
    '</div></div>';
  return h;
}
function stepsCRR(p, n) {
  const c = CONFIGS[p.config];
  const o = crr(p, n);
  const dt = p.T / n;
  let h = '';
  h +=
    '<div class="step"><div class="lbl">1. Randamentul echivalent pentru „' +
    esc(c.nume) +
    '”</div><div class="fx">' +
    bExpr(p) +
    '</div>' +
    '<div class="hint">' +
    esc(c.bExplic) +
    '</div></div>';
  h += subiacentSteps(p);
  h +=
    '<div class="step"><div class="lbl">3. Pasul de timp</div><div class="fx">' +
    'Δ<i>t</i> = <i>T</i>/<i>n</i> = <span class="num">' +
    fmt(p.T, 4) +
    '/' +
    n +
    '</span> = <span class="res">' +
    fmt(dt, 4) +
    '</span></div></div>';
  h +=
    '<div class="step"><div class="lbl">4. Factorii de creștere și de scădere (Cox-Ross-Rubinstein)</div><div class="fx">' +
    '<i>u</i> = e<sup>σ√Δ<i>t</i></sup> = <span class="num">e<sup>' +
    fmt(p.sigma, 4) +
    '·' +
    fmt(Math.sqrt(dt), 4) +
    '</sup></span> = <span class="res">' +
    fmt(o.u, 4) +
    '</span><br>' +
    '<i>d</i> = 1/<i>u</i> = <span class="res">' +
    fmt(o.d, 4) +
    '</span>' +
    '</div><div class="hint">Alegerea <i>d</i> = 1/<i>u</i> face arborele recombinant și simetric în logaritm; <i>u</i> și <i>d</i> nu depind de <i>q</i>.</div></div>';
  h +=
    '<div class="step"><div class="lbl">5. Probabilitatea neutră la risc</div><div class="fx">' +
    '<i>p</i> = (e<sup>(<i>r</i>−<i>q</i>)Δ<i>t</i></sup> − <i>d</i>) / (<i>u</i> − <i>d</i>) = <span class="num">(' +
    fmt(Math.exp(o.b * dt), 4) +
    ' − ' +
    fmt(o.d, 4) +
    ') / (' +
    fmt(o.u, 4) +
    ' − ' +
    fmt(o.d, 4) +
    ')</span> = <span class="res">' +
    fmt(o.p, 4) +
    '</span>' +
    '</div><div class="hint">Aici intră toată informația despre tipul activului suport: ' +
    c.bFormula +
    '. Actualizarea se face însă mereu cu rata fără risc <i>r</i>.</div></div>';
  h +=
    '<div class="step"><div class="lbl">6. Verificarea absenței arbitrajului</div><div class="fx">' +
    (o.valida
      ? '0 &lt; <i>p</i> = ' +
        fmt(o.p, 4) +
        ' &lt; 1 <span class="badge ok">condiție îndeplinită</span>'
      : '<i>p</i> = ' +
        fmt(o.p, 4) +
        ' <span class="badge bad">în afara intervalului (0, 1)</span>') +
    '</div>' +
    (o.valida
      ? ''
      : '<div class="hint">Este necesar <i>d</i> &lt; e<sup>(<i>r</i>−<i>q</i>)Δ<i>t</i></sup> &lt; <i>u</i>. Măriți numărul de pași sau volatilitatea.</div>') +
    '</div>';
  h +=
    '<div class="step"><div class="lbl">7. Factorul de actualizare pe un pas</div><div class="fx">' +
    'e<sup>−<i>r</i>Δ<i>t</i></sup> = <span class="res">' +
    fmt(o.disc, 4) +
    '</span></div></div>';
  if (o.lvl1) {
    h +=
      '<div class="step"><div class="lbl">8. Inducția inversă — ultimul pas, din nodul inițial</div><div class="fx">' +
      '<i>V</i><sub>0</sub> = e<sup>−<i>r</i>Δ<i>t</i></sup>·[<i>p</i>·<i>V<sub>u</sub></i> + (1−<i>p</i>)·<i>V<sub>d</sub></i>]<br>' +
      '<span class="num">= ' +
      fmt(o.disc, 4) +
      '·[' +
      fmt(o.p, 4) +
      '·' +
      fmt(o.lvl1.V[1], ZEC) +
      ' + ' +
      fmt(1 - o.p, 4) +
      '·' +
      fmt(o.lvl1.V[0], ZEC) +
      ']</span> = <span class="res">' +
      fmt(o.radacina, ZEC) +
      '</span>' +
      '</div><div class="hint">Valorile <i>V<sub>u</sub></i> și <i>V<sub>d</sub></i> sunt rezultatul aceleiași reguli aplicate recursiv de la scadență înapoi' +
      (p.stil === 'american'
        ? ', comparând la fiecare nod valoarea de continuare cu valoarea de exercitare imediată'
        : '') +
      '.</div></div>';
  }
  if (o.df !== 1) {
    h +=
      '<div class="step"><div class="lbl">9. Decontarea la T<sub>F</sub></div><div class="fx">preț = <span class="num">' +
      fmt(o.radacina, ZEC) +
      '·' +
      fmt(o.df, 4) +
      '</span> = <span class="res">' +
      fmt(o.pret, ZEC) +
      '</span></div></div>';
  }
  return h;
}
function stepsCRRDetailed(p, n) {
  const c = CONFIGS[p.config];
  const o = crr(p, n, true);
  const dt = p.T / n;
  const X0 = o.X0;
  let h = '';
  let j;
  let i;
  h +=
    '<div class="step crr-major"><div class="lbl">Pasul 1 — Calculăm parametrii modelului</div><div class="fx">' +
    'Δ<i>t</i> = <i>T</i>/<i>n</i> = <span class="num">' +
    fmt(p.T, 4) +
    '/' +
    n +
    '</span> = <span class="res">' +
    fmt(dt, 4) +
    '</span><br>' +
    '<i>u</i> = e<sup>σ√Δt</sup> = e<sup>' +
    fmt(p.sigma, 4) +
    '·√' +
    fmt(dt, 4) +
    '</sup> = <span class="res">' +
    fmt(o.u, 4) +
    '</span><br>' +
    '<i>d</i> = 1/<i>u</i> = 1/' +
    fmt(o.u, 4) +
    ' = <span class="res">' +
    fmt(o.d, 4) +
    '</span><br>' +
    bExpr(p) +
    '<br><i>p</i> = (e<sup>(r−q)Δt</sup>−d)/(u−d) = <span class="num">(' +
    fmt(Math.exp(o.b * dt), 4) +
    '−' +
    fmt(o.d, 4) +
    ')/(' +
    fmt(o.u, 4) +
    '−' +
    fmt(o.d, 4) +
    ')</span> = <span class="res">' +
    fmt(o.p, 4) +
    '</span><br>' +
    '1−<i>p</i> = <span class="res">' +
    fmt(1 - o.p, 4) +
    '</span><br>factor de actualizare = e<sup>−rΔt</sup> = e<sup>−' +
    fmt(p.r, 4) +
    '·' +
    fmt(dt, 4) +
    '</sup> = <span class="res">' +
    fmt(o.disc, 4) +
    '</span></div><div class="hint">Activul de la rădăcină este S<sub>0,0</sub> = ' +
    fmt(X0, ZEC) +
    '. Condiția de non-arbitraj este d &lt; e<sup>(r−q)Δt</sup> &lt; u, echivalent cu 0 &lt; p &lt; 1.</div></div>';
  const asset = [];
  for (j = 0; j <= n; j++) {
    const level = [];
    for (i = 0; i <= j; i++) {
      level.push(
        '<i>S</i><sub>' +
          j +
          ',' +
          i +
          '</sub> = ' +
          fmt(X0, ZEC) +
          '·' +
          fmt(o.u, 4) +
          '<sup>' +
          i +
          '</sup>·' +
          fmt(o.d, 4) +
          '<sup>' +
          (j - i) +
          '</sup> = <b>' +
          fmt(o.tree.S[j][i], ZEC) +
          '</b>',
      );
    }
    asset.push(
      '<div class="node-level"><b>Nivelul ' + j + '</b><div>' + level.join('<br>') + '</div></div>',
    );
  }
  h +=
    '<div class="step crr-major"><div class="lbl">Pasul 2 — Calculăm valoarea probabilă a activului suport în fiecare nod</div><div class="fx"><i>S</i><sub>j,i</sub> = <i>S</i><sub>0,0</sub>·<i>u</i><sup>i</sup>·<i>d</i><sup>j−i</sup></div><div class="node-calcs">' +
    asset.join('') +
    '</div><div class="hint">Indicele j este momentul din arbore, iar i este numărul de mișcări în sus. Deoarece ud = 1, o urcare urmată de o coborâre ajunge în același nod ca o coborâre urmată de o urcare.</div></div>';
  const terminal = [];
  for (i = 0; i <= n; i++) {
    const S = o.tree.S[n][i],
      pay = p.tip === 'call' ? Math.max(S - p.K, 0) : Math.max(p.K - S, 0);
    terminal.push(
      '<i>V</i><sub>' +
        n +
        ',' +
        i +
        '</sub> = ' +
        (p.tip === 'call' ? 'max(S−K,0)' : 'max(K−S,0)') +
        ' = ' +
        (p.tip === 'call'
          ? 'max(' + fmt(S, ZEC) + '−' + fmt(p.K, ZEC) + ',0)'
          : 'max(' + fmt(p.K, ZEC) + '−' + fmt(S, ZEC) + ',0)') +
        ' = <b>' +
        fmt(pay, ZEC) +
        '</b>',
    );
  }
  h +=
    '<div class="step crr-major"><div class="lbl">Pasul 3 — Calculăm valoarea derivativului în nodurile finale</div><div class="fx">' +
    (p.tip === 'call'
      ? '<i>V</i><sub>n,i</sub> = max(<i>S</i><sub>n,i</sub>−<i>K</i>,0)'
      : '<i>V</i><sub>n,i</sub> = max(<i>K</i>−<i>S</i><sub>n,i</sub>,0)') +
    '</div><div class="node-calcs"><div class="node-level"><b>Scadența T</b><div>' +
    terminal.join('<br>') +
    '</div></div></div></div>';
  const back = [];
  for (j = n - 1; j >= 0; j--) {
    const bl = [];
    for (i = 0; i <= j; i++) {
      const down = o.tree.V[j + 1][i],
        up = o.tree.V[j + 1][i + 1],
        cont = o.disc * (o.p * up + (1 - o.p) * down),
        ex =
          p.tip === 'call' ? Math.max(o.tree.S[j][i] - p.K, 0) : Math.max(p.K - o.tree.S[j][i], 0),
        val = o.tree.V[j][i];
      let line =
        '<i>V</i><sub>' +
        j +
        ',' +
        i +
        '</sub> = ' +
        fmt(o.disc, 4) +
        '·[' +
        fmt(o.p, 4) +
        '·' +
        fmt(up, ZEC) +
        ' + ' +
        fmt(1 - o.p, 4) +
        '·' +
        fmt(down, ZEC) +
        '] = ' +
        fmt(cont, ZEC);
      if (p.stil === 'american')
        line += '; max(continuare ' + fmt(cont, ZEC) + ', exercitare ' + fmt(ex, ZEC) + ')';
      line += ' = <b>' + fmt(val, ZEC) + '</b>';
      bl.push(line);
    }
    back.push(
      '<div class="node-level"><b>De la nivelul ' +
        (j + 1) +
        ' la nivelul ' +
        j +
        '</b><div>' +
        bl.join('<br>') +
        '</div></div>',
    );
  }
  h +=
    '<div class="step crr-major"><div class="lbl">Pasul 4 — Actualizăm derivativul de la dreapta la stânga</div><div class="fx"><i>V</i><sub>j,i</sub> = e<sup>−rΔt</sup>[<i>pV</i><sub>j+1,i+1</sub> + (1−<i>p</i>)<i>V</i><sub>j+1,i</sub>]</div><div class="node-calcs">' +
    back.join('') +
    '</div><div class="note">Valoarea din rădăcină este <b>V<sub>0,0</sub> = ' +
    fmt(o.radacina, ZEC) +
    '</b>' +
    (o.df !== 1
      ? ', iar după factorul de decontare rezultatul este <b>' + fmt(o.pret, ZEC) + '</b>'
      : '') +
    '.</div></div>';
  return h;
}
function stepsCombo(p, n) {
  let h = '';
  if (p.stil === 'american') {
    return '<div class="note warn">Formula combinatorică presupune că opțiunea se decontează o singură dată, la scadență — este valabilă doar pentru opțiuni <b>europene</b>. Pentru stilul <b>american</b>, la fiecare nod poate fi optimă exercitarea imediată, iar acest lucru poate fi tratat corect doar prin inducție inversă (arborele de mai jos).</div>';
  }
  const o = crrCombinatorial(p, n);
  const crrRef = crr(euro(p), n).pret;
  const X0 = CONFIGS[p.config].subiacent(p);
  h +=
    '<div class="step"><div class="lbl">1. Formula binomială închisă (fără inducție inversă)</div><div class="fx">' +
    (p.tip === 'call'
      ? '<i>c</i> = e<sup>−<i>rT</i></sup> Σ<sub><i>i</i>=0</sub><sup><i>n</i></sup> C(<i>n</i>,<i>i</i>)·<i>p</i><sup><i>i</i></sup>·(1−<i>p</i>)<sup><i>n</i>−<i>i</i></sup>·max(<i>S</i><sub>0</sub><i>u</i><sup><i>i</i></sup><i>d</i><sup><i>n</i>−<i>i</i></sup> − <i>K</i>, 0)'
      : '<i>p</i> = e<sup>−<i>rT</i></sup> Σ<sub><i>i</i>=0</sub><sup><i>n</i></sup> C(<i>n</i>,<i>i</i>)·<i>p</i><sup><i>i</i></sup>·(1−<i>p</i>)<sup><i>n</i>−<i>i</i></sup>·max(<i>K</i> − <i>S</i><sub>0</sub><i>u</i><sup><i>i</i></sup><i>d</i><sup><i>n</i>−<i>i</i></sup>, 0)') +
    '</div><div class="fx"><b>Numărul de combinații:</b>&nbsp; C(<i>n</i>,<i>i</i>) = <span class="num"><i>n</i>! / [<i>i</i>!·(<i>n</i>−<i>i</i>)!]</span></div><div class="hint">C(n,i) numără drumurile distincte care conțin exact <i>i</i> creșteri și <i>n−i</i> scăderi. De exemplu, C(3,2) = 3!/[2!·1!] = 3. Suma parcurge toate cele <i>n</i>+1 rezultate terminale și este echivalentă matematic cu inducția inversă.</div></div>';
  h +=
    '<div class="step"><div class="lbl">2. Aceeași formulă, cu valorile din acest caz</div><div class="fx">' +
    (p.tip === 'call'
      ? '<i>c</i> = e<sup>−' +
        fmt(p.r, 4) +
        '·' +
        fmt(p.T, 4) +
        '</sup> Σ<sub><i>i</i>=0</sub><sup>' +
        n +
        '</sup> C(' +
        n +
        ',<i>i</i>)·' +
        fmt(o.p, 4) +
        '<sup><i>i</i></sup>·' +
        fmt(1 - o.p, 4) +
        '<sup>' +
        n +
        '−<i>i</i></sup>·max(' +
        fmt(X0, ZEC) +
        '·' +
        fmt(o.u, 4) +
        '<sup><i>i</i></sup>·' +
        fmt(o.d, 4) +
        '<sup>' +
        n +
        '−<i>i</i></sup> − ' +
        fmt(p.K, ZEC) +
        ', 0)'
      : '<i>p</i> = e<sup>−' +
        fmt(p.r, 4) +
        '·' +
        fmt(p.T, 4) +
        '</sup> Σ<sub><i>i</i>=0</sub><sup>' +
        n +
        '</sup> C(' +
        n +
        ',<i>i</i>)·' +
        fmt(o.p, 4) +
        '<sup><i>i</i></sup>·' +
        fmt(1 - o.p, 4) +
        '<sup>' +
        n +
        '−<i>i</i></sup>·max(' +
        fmt(p.K, ZEC) +
        ' − ' +
        fmt(X0, ZEC) +
        '·' +
        fmt(o.u, 4) +
        '<sup><i>i</i></sup>·' +
        fmt(o.d, 4) +
        '<sup>' +
        n +
        '−<i>i</i></sup>, 0)') +
    '</div><div class="hint">Fiecare termen <i>i</i> = 0…' +
    n +
    ' din tabelul de mai jos înlocuiește pur și simplu <i>i</i> în această expresie — vedeți coloana „contribuție”.</div></div>';
  h +=
    '<div class="step"><div class="lbl"><i>u</i>, <i>d</i>, <i>p</i> — identice cu cele din arbore</div><div class="fx">' +
    '<i>u</i> = <span class="res">' +
    fmt(o.u, 4) +
    '</span> &nbsp;&nbsp; <i>d</i> = <span class="res">' +
    fmt(o.d, 4) +
    '</span> &nbsp;&nbsp; <i>p</i> = <span class="res">' +
    fmt(o.p, 4) +
    '</span>' +
    '</div></div>';
  const termLines = o.terms.map((t) => {
    const probExpr =
      'C(' +
      n +
      ',' +
      t.i +
      ')·' +
      fmt(o.p, 4) +
      '<sup>' +
      t.i +
      '</sup>·' +
      fmt(1 - o.p, 4) +
      '<sup>' +
      (n - t.i) +
      '</sup>';
    const payExpr =
      p.tip === 'call'
        ? 'max(' + fmt(t.S, 2) + ' − ' + fmt(p.K, 2) + ', 0)'
        : 'max(' + fmt(p.K, 2) + ' − ' + fmt(t.S, 2) + ', 0)';
    return (
      '<i>i</i>=' +
      t.i +
      ':&nbsp; ' +
      probExpr +
      ' · ' +
      payExpr +
      ' = ' +
      fmt(t.prob, 4) +
      ' · ' +
      fmt(t.pay, 4) +
      ' = <b>' +
      fmt(t.prob * t.pay, 4) +
      '</b>'
    );
  });
  h +=
    '<div class="step"><div class="lbl">Calculul desfășurat, termen cu termen (n = ' +
    n +
    ')</div><div class="fx" style="font-size:14.5px;line-height:2.2">' +
    termLines.join('<br>') +
    '</div></div>';
  const sumExpr = o.terms.map((t) => fmt(t.prob * t.pay, 4)).join(' + ');
  const sumRaw = o.terms.reduce((s, t) => s + t.prob * t.pay, 0);
  h +=
    '<div class="step"><div class="lbl">Suma și rezultatul final</div><div class="fx" style="overflow-wrap:break-word">' +
    'Σ = ' +
    sumExpr +
    ' = <span class="res">' +
    fmt(sumRaw, 4) +
    '</span><br>' +
    (p.tip === 'call' ? '<i>c</i>' : '<i>p</i>') +
    ' = e<sup>−<i>rT</i></sup>·Σ = <span class="num">' +
    fmt(Math.exp(-p.r * p.T), 4) +
    '·' +
    fmt(sumRaw, 4) +
    '</span> = <span class="res">' +
    fmt(o.df !== 1 ? o.pret / o.df : o.pret, ZEC) +
    '</span>' +
    (o.df !== 1
      ? ' &nbsp;→&nbsp; după decontare la T<sub>F</sub>: <span class="res">' +
        fmt(o.pret, ZEC) +
        '</span>'
      : '') +
    '</div>' +
    '<div class="note">Verificare: prețul din arbore (inducție inversă) pentru aceiași parametri este <b>' +
    fmt(crrRef, ZEC) +
    '</b> — identic (până la eroarea de rotunjire), pentru că cele două metode calculează aceeași sumă, doar în ordine diferită.</div></div>';
  const exerciseTerms = o.terms.map((t) => {
    const exercita = t.pay > 0;
    return (
      '<i>i</i> = ' +
      t.i +
      ': <i>S</i><sub>T</sub> = ' +
      fmt(t.S, ZEC) +
      (p.tip === 'call' ? (exercita ? ' &gt; ' : ' ≤ ') : exercita ? ' &lt; ' : ' ≥ ') +
      fmt(p.K, ZEC) +
      ' → ' +
      (exercita ? '<b>se exercită</b>' : 'nu se exercită') +
      '; probabilitatea nodului = ' +
      fmt(t.prob, 4)
    );
  });
  const exerciseProb = o.terms.reduce((sum, t) => sum + (t.pay > 0 ? t.prob : 0), 0);
  const included = o.terms.filter((t) => t.pay > 0);
  const probabilitySum = included.length ? included.map((t) => fmt(t.prob, 4)).join(' + ') : '0';
  h +=
    '<div class="step"><div class="lbl">Probabilitatea de exercitare la scadență</div>' +
    '<div class="fx"><i>P</i>(exercitare) = Σ probabilitățile nodurilor cu payoff pozitiv<br>' +
    (p.tip === 'call'
      ? '<i>P</i>(<i>S</i><sub>T</sub> &gt; <i>K</i>)'
      : '<i>P</i>(<i>S</i><sub>T</sub> &lt; <i>K</i>)') +
    ' = <span class="num">' +
    probabilitySum +
    '</span> = <span class="res">' +
    fmt(exerciseProb, 4) +
    ' (' +
    fmt(100 * exerciseProb, 2) +
    '%)</span></div>' +
    '<div class="fx" style="font-size:14px;line-height:2.1;margin-top:10px">' +
    exerciseTerms.join('<br>') +
    '</div>' +
    '<div class="hint">Este probabilitatea neutră la risc de exercitare a opțiunii europene la scadență. Nu reprezintă probabilitatea reală estimată de piață.</div></div>';
  return h;
}
export { bExpr, subiacentSteps, stepsBS, stepsCRR, stepsCRRDetailed, stepsCombo };
