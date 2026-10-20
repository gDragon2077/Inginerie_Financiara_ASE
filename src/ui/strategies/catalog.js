const STRATEGY_PRESETS = [
  {
    id: 'bull-call',
    name: 'Bull Call Spread',
    desc: 'Creștere moderată, cu risc și profit limitate.',
    when: 'Când te aștepți la o creștere controlată, nu la o explozie a prețului.',
    entry:
      'Cumperi call-ul cu strike inferior și vinzi call-ul cu strike superior, la aceeași scadență.',
    exit: 'Închide spread-ul înainte de scadență dacă ținta este atinsă; evită riscul de asignare.',
    bias: 'Bullish',
    risk: 'Limitat',
    legs: [
      ['call', 1, 95],
      ['call', -1, 105],
    ],
  },
  {
    id: 'bear-put',
    name: 'Bear Put Spread',
    desc: 'Scădere moderată, cu cost inițial controlat.',
    when: 'Când anticipezi o scădere moderată și vrei risc definit.',
    entry: 'Cumperi un put cu strike superior și vinzi un put cu strike inferior.',
    exit: 'Marchează profitul aproape de strike-ul inferior sau ieși dacă teza bearish este invalidată.',
    bias: 'Bearish',
    risk: 'Limitat',
    legs: [
      ['put', 1, 105],
      ['put', -1, 95],
    ],
  },
  {
    id: 'straddle',
    name: 'Long Straddle',
    desc: 'Mișcare amplă în orice direcție.',
    when: 'Înaintea unui eveniment capabil să producă o mișcare mai mare decât cea inclusă în prime.',
    entry: 'Cumperi simultan call și put ATM, cu același strike și aceeași scadență.',
    exit: 'Ieși după expansiunea de volatilitate sau mișcarea majoră; theta erodează rapid poziția.',
    bias: 'Volatil',
    risk: 'Primele',
    legs: [
      ['call', 1, 100],
      ['put', 1, 100],
    ],
  },
  {
    id: 'strangle',
    name: 'Long Strangle',
    desc: 'Mișcare puternică, la un debit mai redus.',
    when: 'Când aștepți o mișcare foarte mare, dar nu ai o direcție clară.',
    entry: 'Cumperi un put OTM și un call OTM cu aceeași scadență.',
    exit: 'Închide după mișcare sau creșterea volatilității; nu aștepta inutil degradarea temporală.',
    bias: 'Volatil',
    risk: 'Primele',
    legs: [
      ['put', 1, 90],
      ['call', 1, 110],
    ],
  },
  {
    id: 'butterfly',
    name: 'Long Call Butterfly',
    desc: 'Profit maxim dacă prețul rămâne aproape de centru.',
    when: 'Când estimezi că prețul va termina aproape de un nivel precis și volatilitatea va scădea.',
    entry: 'Cumperi call-ul inferior, vinzi două call-uri centrale și cumperi call-ul superior.',
    exit: 'Țintește zona centrală; închide dacă prețul se îndepărtează persistent.',
    bias: 'Neutru',
    risk: 'Limitat',
    legs: [
      ['call', 1, 90],
      ['call', -2, 100],
      ['call', 1, 110],
    ],
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    desc: 'Profit într-un interval, cu risc definit.',
    when: 'Când anticipezi o piață laterală și volatilitate stabilă sau în scădere.',
    entry: 'Vinzi un put spread și un call spread OTM; aripile cumpărate limitează riscul.',
    exit: 'Marchează o parte din credit înainte de scadență; ajustează dacă o latură este amenințată.',
    bias: 'Neutru',
    risk: 'Limitat',
    legs: [
      ['put', 1, 85],
      ['put', -1, 95],
      ['call', -1, 105],
      ['call', 1, 115],
    ],
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    desc: 'Venit din primă peste o poziție long în activ.',
    when: 'Când deții activul și accepți să limitezi creșterea în schimbul primei.',
    entry: 'Cumperi sau deții spot și vinzi un call, de regulă OTM.',
    exit: 'Răscumpără call-ul dacă vrei să păstrezi activul; acceptă asignarea dacă ținta a fost atinsă.',
    bias: 'Ușor bullish',
    risk: 'Spot',
    legs: [
      ['stock', 1, 100],
      ['call', -1, 110],
    ],
  },
  {
    id: 'protective-put',
    name: 'Protective Put',
    desc: 'Poziție long asigurată împotriva scăderilor.',
    when: 'Când vrei expunere bullish, dar ai nevoie de o podea pentru pierdere.',
    entry: 'Cumperi spot și un put la nivelul de protecție dorit.',
    exit: 'Rulează put-ul pentru protecție continuă sau vinde-l când riscul a trecut.',
    bias: 'Bullish',
    risk: 'Limitat',
    legs: [
      ['stock', 1, 100],
      ['put', 1, 95],
    ],
  },
  {
    id: 'bull-put',
    name: 'Bull Put Spread',
    desc: 'Credit primit pentru o perspectivă moderat bullish.',
    when: 'Când te aștepți ca prețul să rămână peste un prag ales.',
    entry: 'Vinzi un put cu strike superior și cumperi un put cu strike inferior.',
    exit: 'Închide după captarea majorității creditului sau dacă suportul sparge strike-ul short.',
    bias: 'Bullish',
    risk: 'Limitat',
    legs: [
      ['put', 1, 90],
      ['put', -1, 100],
    ],
  },
  {
    id: 'cash-put',
    name: 'Cash-Secured Put',
    desc: 'Încasezi primă și accepți cumpărarea activului mai jos.',
    when: 'Când ești bullish și ai cumpăra activul la strike-ul ales.',
    entry: 'Vinzi un put și păstrezi numerarul necesar unei eventuale asignări.',
    exit: 'Lasă opțiunea să expire sau ruleaz-o; la asignare, costul efectiv este strike minus primă.',
    bias: 'Bullish',
    risk: 'Spot',
    legs: [['put', -1, 95]],
  },
  {
    id: 'bear-call',
    name: 'Bear Call Spread',
    desc: 'Credit primit dacă prețul rămâne sub strike-ul short.',
    when: 'Când perspectiva este moderat bearish sau neutră.',
    entry: 'Vinzi call-ul inferior și cumperi call-ul superior pentru limitarea riscului.',
    exit: 'Marchează profitul din credit sau închide dacă prețul depășește strike-ul short.',
    bias: 'Bearish',
    risk: 'Limitat',
    legs: [
      ['call', -1, 100],
      ['call', 1, 110],
    ],
  },
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    desc: 'Profit dintr-o piață foarte stabilă, dar cu risc ridicat.',
    when: 'Doar când anticipezi volatilitate realizată redusă și poți gestiona activ riscul.',
    entry: 'Vinzi call și put ATM la aceeași scadență, încasând ambele prime.',
    exit: 'Ia profit devreme; închide sau ajustează rapid la o mișcare amplă. Riscul call-ului este nelimitat.',
    bias: 'Neutru',
    risk: 'Nelimitat',
    legs: [
      ['call', -1, 100],
      ['put', -1, 100],
    ],
  },
  {
    id: 'collar',
    name: 'Protective Collar',
    desc: 'Protecție la scădere finanțată prin limitarea creșterii.',
    when: 'Când deții activul și vrei un interval clar de rezultat.',
    entry: 'Cumperi spot și un put OTM, apoi vinzi un call OTM.',
    exit: 'Rulează ambele opțiuni împreună sau acceptă ieșirea din spot la strike-ul call.',
    bias: 'Hedging',
    risk: 'Limitat',
    legs: [
      ['stock', 1, 100],
      ['put', 1, 90],
      ['call', -1, 110],
    ],
  },
];
const CATEGORY_ORDER = ['Bullish', 'Bearish', 'Neutru / Range', 'Volatilitate', 'Hedging & venit'];
function strategyCategory(p) {
  if (['bull-call', 'bull-put', 'cash-put'].includes(p.id)) return 'Bullish';
  if (['bear-put', 'bear-call'].includes(p.id)) return 'Bearish';
  if (['butterfly', 'iron-condor', 'short-straddle'].includes(p.id)) return 'Neutru / Range';
  if (['straddle', 'strangle'].includes(p.id)) return 'Volatilitate';
  return 'Hedging & venit';
}
const EXPIRIES = [7, 14, 21, 30, 45, 60, 90, 120, 180, 365];
function fmtExpiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
  });
}
export { STRATEGY_PRESETS, CATEGORY_ORDER, strategyCategory, EXPIRIES, fmtExpiryDate };
