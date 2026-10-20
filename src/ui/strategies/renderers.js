import { $, money, roRatio, fmtp } from '../dom.js';
import { readControl, writeControl } from '../../state/controls.js';
import {
  positionsGreeks,
  quote,
  presetLegs,
  legDays,
  referenceDays,
  legPayoff,
  legValue,
  summary,
  marginEstimate,
  probOfProfit,
} from './model.js';
import { appState } from '../../state/store.js';
import { chartHTML } from './charts.js';
import {
  CATEGORY_ORDER,
  STRATEGY_PRESETS,
  strategyCategory,
  EXPIRIES,
  fmtExpiryDate,
} from './catalog.js';
import { schedule } from '../scheduler.js';
function renderStrategyGreeks() {
  if (!$('strategyGreeks')) return;
  const S = +readControl('chainSpot', 'value'),
    g = positionsGreeks(appState.strategy.positions, S);
  const vals = [
    {
      s: 'V',
      name: 'Valoare netă',
      v: g.pret,
      n: 'valoarea curentă (opțiuni + spot)',
    },
    {
      s: 'Δ',
      name: 'Delta',
      v: g.delta,
      n: 'expunere echivalentă, în acțiuni',
    },
    {
      s: 'Γ',
      name: 'Gamma',
      v: g.gamma,
      n: 'schimbarea Delta la +1 spot',
    },
    {
      s: 'ν',
      name: 'Vega',
      v: g.vega,
      n: 'P&L la +1 punct de volatilitate',
    },
    {
      s: 'Θ',
      name: 'Theta',
      v: g.theta,
      n: 'P&L pentru o zi calendaristică',
    },
    {
      s: 'ρ',
      name: 'Rho',
      v: g.rho,
      n: 'P&L la +1 punct de rată',
    },
  ];
  $('strategyGreeks').innerHTML = vals
    .map(
      (x) =>
        '<div class="greek-card"><div class="symbol">' +
        x.s +
        '</div><small>' +
        x.name +
        '</small><div class="gvalue ' +
        (x.v >= 0 ? 'gpos' : 'gneg') +
        '">' +
        (x.v >= 0 ? '+' : '') +
        money(x.v) +
        '</div><small>' +
        x.n +
        '</small></div>',
    )
    .join('');
}
function renderBasic() {
  const spot = +readControl('basicSpot', 'value'),
    K = +readControl('basicStrike', 'value'),
    parts = appState.strategy.selectedBasic.split('-'),
    qty = parts[0] === 'long' ? 1 : -1,
    type = parts[1],
    prem = quote(type, K, spot).mid,
    leg = {
      type,
      qty,
      strike: K,
      price: prem,
    },
    call = type === 'call',
    long = qty > 0,
    be = call ? K + prem : K - prem;
  $('basicChart').innerHTML = chartHTML([leg], spot, false);
  $('basicSpotOut').textContent = money(spot);
  $('basicStrikeOut').textContent = money(K);
  $('basicPremiumOut').textContent = money(prem);
  $('stratSpotBadge').textContent = 'SPOT ' + money(+readControl('chainSpot', 'value'));
  $('basicBE').textContent = money(be);
  $('basicRisk').textContent = long ? money(prem) : call ? 'Nelimitat' : money(K - prem);
  $('basicReward').textContent = long ? (call ? 'Nelimitat' : money(K - prem)) : money(prem);
  $('basicBias').textContent = call ? (long ? 'Bullish' : 'Bearish') : long ? 'Bearish' : 'Bullish';
}
function renderPresetsNow() {
  let html = '';
  CATEGORY_ORDER.forEach((category) => {
    const items = STRATEGY_PRESETS.filter((p) => strategyCategory(p) === category);
    if (!items.length) return;
    html +=
      '<section class="strategy-group"><div class="strategy-group-head"><h4>' +
      category +
      '</h4><span>' +
      items.length +
      ' strategii</span></div>';
    html += items
      .map((p) => {
        const legs = presetLegs(p);
        return (
          '<article class="strategy-guide"><div><h4>' +
          p.name +
          '</h4><p>' +
          p.desc +
          '</p><div class="mini-payoff">' +
          chartHTML(legs, +readControl('chainSpot', 'value'), true) +
          '</div></div><div class="guide-copy"><div><b>Când se aplică</b>' +
          p.when +
          '</div><div><b>Construcție</b>' +
          p.entry +
          '</div><div><b>Intrare</b>Folosește ordine limită și verifică debitul/creditul net față de payoff-ul maxim.</div><div><b>Ieșire și management</b>' +
          p.exit +
          '</div></div><div class="load-strategy"><div class="preset-tags"><span>' +
          p.bias +
          '</span><span>Risc ' +
          p.risk.toLowerCase() +
          '</span></div><button class="btn primary" data-preset="' +
          p.id +
          '" type="button">Încarcă în builder</button></div></article>'
        );
      })
      .join('');
    html += '</section>';
  });
  $('presetGrid').innerHTML = html;
}
function renderChainNow() {
  const S = +readControl('chainSpot', 'value'),
    step = +readControl('chainStep', 'value'),
    count = +readControl('chainCount', 'value'),
    curDays = +readControl('chainDays', 'value'),
    half = Math.floor(count / 2),
    base = Math.max(0.01, +(Math.round(S / step) * step).toFixed(4)),
    strikes = [];
  for (let i = half; i >= -half; i--) {
    const strike = +(base + i * step).toFixed(4);
    if (strike > 0) strikes.push(strike);
  }
  let h =
    '<thead><tr><th>Delta</th><th>Bid</th><th>Ask</th><th>Strike ↓</th><th>Bid</th><th>Ask</th><th>Delta</th></tr></thead><tbody>';
  strikes.forEach((K) => {
    const c = quote('call', K),
      p = quote('put', K),
      dc = c.delta,
      dp = p.delta,
      legsHere = appState.strategy.positions.filter(
        (l) => l.type !== 'stock' && l.strike === K && legDays(l) === curDays,
      ),
      callLong = legsHere.some((l) => l.type === 'call' && l.qty > 0),
      callShort = legsHere.some((l) => l.type === 'call' && l.qty < 0),
      putLong = legsHere.some((l) => l.type === 'put' && l.qty > 0),
      putShort = legsHere.some((l) => l.type === 'put' && l.qty < 0),
      callCls =
        callLong && callShort
          ? 'side-mixed'
          : callLong
            ? 'side-long'
            : callShort
              ? 'side-short'
              : '',
      putCls =
        putLong && putShort ? 'side-mixed' : putLong ? 'side-long' : putShort ? 'side-short' : '';
    h +=
      '<tr class="' +
      (K === base ? 'atm' : '') +
      '"><td class="' +
      callCls +
      '">' +
      dc.toFixed(2) +
      '</td><td class="' +
      callCls +
      '"><button class="quote-btn bid' +
      (callShort ? ' held' : '') +
      '" data-type="call" data-side="-1" data-k="' +
      K +
      '" data-price="' +
      c.bid +
      '">' +
      money(c.bid) +
      '</button></td><td class="' +
      callCls +
      '"><button class="quote-btn ask' +
      (callLong ? ' held' : '') +
      '" data-type="call" data-side="1" data-k="' +
      K +
      '" data-price="' +
      c.ask +
      '">' +
      money(c.ask) +
      '</button></td><td class="strike">' +
      money(K) +
      '</td><td class="' +
      putCls +
      '"><button class="quote-btn bid' +
      (putShort ? ' held' : '') +
      '" data-type="put" data-side="-1" data-k="' +
      K +
      '" data-price="' +
      p.bid +
      '">' +
      money(p.bid) +
      '</button></td><td class="' +
      putCls +
      '"><button class="quote-btn ask' +
      (putLong ? ' held' : '') +
      '" data-type="put" data-side="1" data-k="' +
      K +
      '" data-price="' +
      p.ask +
      '">' +
      money(p.ask) +
      '</button></td><td class="' +
      putCls +
      '">' +
      dp.toFixed(2) +
      '</td></tr>';
  });
  $('optionChain').innerHTML = h + '</tbody>';
}
function renderResultTable() {
  const scenario = +readControl('scenarioSpot', 'value');
  $('scenarioOut').textContent = money(scenario);
  if (!appState.strategy.positions.length) {
    $('resultTable').innerHTML = '';
    return;
  }
  const refDays = referenceDays(appState.strategy.positions);
  let total = 0;
  let h =
    '<div class="scrollx"><table class="result-table"><thead><tr><th>Poziție</th><th>Cantitate</th><th>Strike / intrare</th><th>Primă totală</th><th>Formula P&amp;L contractual</th><th>Valoare finală</th><th>P&amp;L</th></tr></thead><tbody>';
  appState.strategy.positions.forEach((l) => {
    const remain = Math.max(legDays(l) - refDays, 0) / 365;
    const expired = remain <= 1e-6;

    const raw = legValue(l, scenario, refDays);

    const pnl = legPayoff(l, scenario, refDays);
    const q = l.qty;
    const aq = Math.abs(q);
    const isOption = l.type !== 'stock';
    const value = raw * aq * (isOption ? 100 : 1);
    const intrinsic =
      l.type === 'call'
        ? 'max(Sₜ − ' + money(l.strike) + ', 0)'
        : 'max(' + money(l.strike) + ' − Sₜ, 0)';
    const mult = aq === 1 ? '' : aq + ' × ';
    let formula;
    const premium = aq * l.price * (isOption ? 100 : 1);
    if (l.type === 'stock') formula = (q < 0 ? '− ' : '') + mult + '(Sₜ − ' + money(l.strike) + ')';
    else if (expired)
      formula = (q < 0 ? '− ' : '') + intrinsic + (q > 0 ? ' − ' : ' + ') + money(l.price);
    else
      formula =
        (q < 0 ? '− ' : '') +
        'BS(Sₜ, T rămas ' +
        Math.round(remain * 365) +
        'z)' +
        (q > 0 ? ' − ' : ' + ') +
        money(l.price);
    total += pnl;
    h +=
      '<tr><td>' +
      (q > 0 ? 'BUY ' : 'SELL ') +
      l.type.toUpperCase() +
      '</td><td>' +
      aq +
      ' ' +
      (isOption ? (aq === 1 ? 'contract' : 'contracte') : 'acțiuni') +
      '</td><td>' +
      money(l.strike) +
      '</td><td class="' +
      (q > 0 ? 'pnl-neg' : 'pnl-pos') +
      '">' +
      (isOption ? (q > 0 ? '− ' : '+ ') + money(premium) : '—') +
      '</td><td class="payoff-formula">' +
      formula +
      '</td><td>' +
      money(value) +
      '</td><td class="' +
      (pnl >= 0 ? 'pnl-pos' : 'pnl-neg') +
      '">' +
      (pnl >= 0 ? '+' : '') +
      money(pnl) +
      '</td></tr>';
  });
  h +=
    '</tbody><tfoot><tr><td colspan="6">P&amp;L AGREGAT = Σ P&amp;L poziții</td><td class="' +
    (total >= 0 ? 'pnl-pos' : 'pnl-neg') +
    '">' +
    (total >= 0 ? '+' : '') +
    money(total) +
    '</td></tr></tfoot></table></div>';
  $('resultTable').innerHTML = h;
}
function renderBuilderNow() {
  const S = +readControl('chainSpot', 'value'),
    zoom = +readControl('chartRange', 'value');
  $('chartRangeOut').textContent = '±' + zoom + '%';
  $('scenarioSpot').min = Math.max(0, Math.round(S * 0.2));
  $('scenarioSpot').max = Math.round(S * 2);
  writeControl('scenarioSpot', readControl('scenarioSpot'));
  $('builderChart').innerHTML = chartHTML(appState.strategy.positions, S, false, zoom);
  const refDays = referenceDays(appState.strategy.positions),
    distinctDays = {};
  appState.strategy.positions.forEach((l) => {
    if (l.type !== 'stock') distinctDays[legDays(l)] = 1;
  });
  $('builderSubtitle').textContent =
    Object.keys(distinctDays).length > 1
      ? 'Profit la prima scadență (' + refDays + 'z) · leg-urile mai lungi, evaluate Black–Scholes'
      : 'Profit la scadență';
  const sm = summary(appState.strategy.positions, S),
    cost = appState.strategy.positions.reduce(
      (a, l) => (l.type === 'stock' ? a : a + l.qty * l.price * 100),
      0,
    ),
    loss = Math.max(0, sm.maxLoss),
    rr = isFinite(sm.maxProfit) && loss > 0 ? sm.maxProfit / loss : NaN,
    margin = marginEstimate(appState.strategy.positions, S, sm, cost),
    profitDisplay = isFinite(sm.maxProfit)
      ? (sm.maxProfit >= 0 ? '+' : '') + money(sm.maxProfit)
      : '+∞',
    lossDisplay = isFinite(loss) ? (loss > 0 ? '− ' + money(loss) : money(loss)) : '−∞',
    pop = probOfProfit(appState.strategy.positions, S, sm.breakevens);
  $('strategySummary').innerHTML =
    '<div><small>Prime nete (×100)</small><b>' +
    (cost >= 0 ? 'Debit ' : 'Credit ') +
    money(Math.abs(cost)) +
    '</b></div><div><small>Return / Risk</small><b>' +
    (isFinite(rr) ? roRatio(rr) : 'N/A') +
    '</b></div><div><small>Max return</small><b class="pnl-pos">' +
    profitDisplay +
    '</b></div><div><small>Max loss</small><b class="pnl-neg">' +
    lossDisplay +
    '</b></div><div><small>Probabilitate de profit</small><b>' +
    (appState.strategy.positions.length ? fmtp(pop, 1) : '—') +
    '</b></div><div><small>Break-even</small><b>' +
    (sm.breakevens.length ? sm.breakevens.map(money).join(' / ') : '—') +
    '</b></div><div title="Estimare educațională; cerința brokerului poate fi diferită"><small>Margin impact estimat</small><b>≈ ' +
    money(margin) +
    '</b></div>';
  $('positionCount').textContent =
    appState.strategy.positions.length +
    ' ' +
    (appState.strategy.positions.length === 1 ? 'poziție' : 'poziții');
  $('positions').innerHTML = appState.strategy.positions.length
    ? appState.strategy.positions
        .map((l) => {
          const aq = Math.abs(l.qty),
            unit = l.type === 'stock' ? ' acțiuni' : ' contracte × 100';
          return (
            '<div class="position-row"><b class="' +
            (l.qty > 0 ? 'side-buy' : 'side-sell') +
            '">' +
            (l.qty > 0 ? 'BUY' : 'SELL') +
            '</b><span>' +
            l.type.toUpperCase() +
            '</span><span class="exp-badge">' +
            (l.type === 'stock' ? '—' : legDays(l) + 'z') +
            '</span><span class="qty-stepper"><button data-qtystep="-1" data-id="' +
            l.id +
            '" type="button">−</button><input type="number" class="qty-input" data-id="' +
            l.id +
            '" value="' +
            aq +
            '" min="1" step="1"><button data-qtystep="1" data-id="' +
            l.id +
            '" type="button">+</button></span><span>' +
            (l.type === 'stock' ? 'Intrare ' : 'K ') +
            money(l.strike) +
            '</span><span class="pos-price">' +
            unit +
            (l.type === 'stock' ? '' : ' · @ ' + money(l.price)) +
            '</span><button data-remove="' +
            l.id +
            '">×</button></div>'
          );
        })
        .join('')
    : '<div class="empty-state">Selectează BID/ASK, adaugă un lot spot sau încarcă o strategie. Fiecare contract de opțiuni reprezintă 100 de unități.</div>';
  renderResultTable();
  renderStrategyGreeks();
}
function renderExpiryTabs() {
  const cur = +readControl('chainDays', 'value');
  $('expiryTabs').innerHTML = EXPIRIES.map(
    (d) =>
      '<button type="button" class="expiry-tab' +
      (d === cur ? ' active' : '') +
      '" data-days="' +
      d +
      '"><b>' +
      fmtExpiryDate(d) +
      '</b><small>' +
      d +
      'z DTE</small></button>',
  ).join('');
}
function renderPresets(...args) {
  schedule('renderPresets', () => renderPresetsNow(...args));
}
function renderChain(...args) {
  schedule('renderChain', () => renderChainNow(...args));
}
function renderBuilder(...args) {
  schedule('renderBuilder', () => renderBuilderNow(...args));
}
export {
  renderStrategyGreeks,
  renderBasic,
  renderPresets,
  renderChain,
  renderResultTable,
  renderBuilder,
  renderExpiryTabs,
};
