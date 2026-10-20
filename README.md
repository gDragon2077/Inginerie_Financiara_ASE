# Inginerie Financiară ASE

Laborator interactiv în limba română pentru opțiuni, strategii, procese stocastice și modele de evaluare. Aplicația rulează local în browser; nu are backend, chei API sau dependențe de servicii de cotații.

## Pornire

Este necesar Node.js 22.12 sau mai nou.

```sh
npm ci
npm run dev
```

Deschide adresa afișată de Vite. Pentru o versiune optimizată:

```sh
npm run build
npm run preview
```

Directorul `dist/` poate fi servit de un server HTTP static. Modulele ES necesită HTTP; deschiderea directă a fișierului HTML prin `file://` nu este modul de rulare suportat.

## Funcționalități păstrate

- Option chain simulat, BID/ASK, 13 strategii predefinite și builder cu poziții long/short, cantități, loturi spot, scadențe multiple, scenarii, payoff și Greeks agregați.
- Black–Scholes generalizat pentru acțiuni, dividende, valută, futures și forwarduri; paritate put-call și rezolvare pas cu pas.
- CRR european/american: arbore recombinant, decizii de exercitare, formulă combinatorică și convergență.
- Mișcare browniană standard/generalizată/geometrică, histograme, distribuții terminale și intervale de predicție.
- Exerciții BS/CRR generate automat, verificarea răspunsurilor, soluții și scoruri separate.
- Interfață responsive, teme și interacțiuni mouse/touch pe grafice.

Laboratorul separat Greeks/delta-hedging este păstrat și testat. Rămâne ascuns în navigația implicită, la fel ca în fișierul primit; Greeks agregate din builder sunt vizibile. Activarea laboratorului separat presupune eliminarea atributelor `hidden` de pe butonul `data-tab="greeks"` și secțiunea `pane-greeks` din `index.html`.

## Structură

```text
index.html                  Structura semantică și conținutul didactic
src/
  main.js                   Inițializare și legarea modulelor
  domain/                   Funcții pure, fără DOM sau acces la store
    black-scholes.js        Evaluare, paritate și sensibilități analitice
    binomial.js             CRR, arbore, evaluare combinatorică și Greeks numerice
    configurations.js       Activul suport și convențiile cost-of-carry
    deterministic.js        Cazuri cu maturitate/volatilitate zero
    strategies.js           Quote, payoff, extreme, break-even, probabilități, marjă
    portfolio.js            Agregarea opțiunilor unui portofoliu
    simulation.js           Procese stocastice, distribuții și hedging
    normal.js               Distribuția normală și generatorul reproductibil
    validation.js           Invariantele intrărilor financiare
    constants.js            Unități și convenții comune
    exercise-generator.js   Generarea parametrilor exercițiilor
  state/
    store.js                Unicul model de stare observabil
    controls.js             Adaptarea evenimentelor și valorilor formularelor
  ui/
    pricing/                Formular, explicații, rezultate, arbore, convergență
    strategies/             Catalog, selectori, grafice, randare, evenimente
    labs/                   Simulări, Greeks, hedging și hover
    charts/                 Primitive SVG comune
    exercises.js            Fluxul exercițiilor și feedback
    dom.js                  Acces DOM și formatare/escaping
    scheduler.js            Gruparea randărilor și afișarea erorilor
    shell.js                Navigație și temă
  styles/                   Tokens, bază, componente, strategii, laboratoare, responsive
tests/                      Teste financiare, simulări, stare și integrare UI
.github/workflows/ci.yml     Verificare automată la push și pull request
```

Dependențele urmează direcția `UI → state/selectori → domain`. Modulele `domain/` nu importă `ui/`, `state/`, `document` sau `window`. Pot fi folosite separat în Node.js ori într-un alt frontend.

## Stare și randare

`store.state` deține `pricing`, `controls`, `strategy`, `simulation`, `exercises` și `ui`. Proxy-urile observă inclusiv modificările pozițiilor și array-urilor; `store.transaction()` grupează notificările, iar `store.subscribe()` permite observatori cu dezabonare. Store-ul este în memorie și se resetează la reîncărcare.

Câmpurile de pricing sunt citite direct din ramura `pricing`, inclusiv de adaptorul formularelor. Celelalte controale au valori în `controls`. Citirile pentru calcule folosesc modelul; DOM-ul reprezintă vederea. Evenimentele sunt validate în faza de captură, înaintea controllerelor. O valoare goală sau invalidă nu înlocuiește ultima valoare numerică acceptată. Erorile de model apar într-un mesaj vizibil.

Funcțiile din `ui/strategies/model.js` și `ui/labs/portfolio.js` construiesc explicit parametrii pentru funcțiile pure. Previzualizările strategiilor nu consumă ID-uri de poziții. Poziția inițială este deterministă, pentru a face reproducerea problemelor posibilă.

Randările costisitoare sunt grupate prin `requestAnimationFrame`, cu maximum o lucrare pentru fiecare cheie într-un cadru. Evenimentele pe poziții folosesc delegare. Fragmentele calculate și SVG-urile sunt randate local, fără reconstruirea formularului comun; textele variabile sunt formatate sau escaped la granița de prezentare. Graficele și explicațiile păstrează șabloane HTML/SVG explicite.

## Convenții numerice

- Ratele, dividendele și volatilitatea din domain sunt fracții: `0.05` înseamnă 5%. Timpul este în ani, cu 365 zile/an în adaptorul strategiilor.
- `blackScholes()` întoarce preț per unitate, Vega/Rho la o variație de 1.0 și Theta pe an calendaristic (`−∂V/∂T`). UI convertește Vega/Rho la un punct procentual și Theta la o zi.
- Pentru forward calculat din spot, `delta`/`gamma` sunt față de prețul forward, iar `deltaSpot`/`gammaSpot` includ transformarea față de spot. Rho include dependența forwardului de dobândă. Theta păstrează `Tf` fix.
- Un contract de opțiuni reprezintă 100 unități; cantitățile spot sunt acțiuni efective.
- CRR respinge probabilități risk-neutral în afara `[0, 1]`, pași neîntregi și peste 2000. Maturitatea și volatilitatea zero au ramuri deterministe explicite.
- La expirare, Delta ATM folosește convenția de jumătate din salt, Gamma/Vega/Theta sunt zero. Aceste valori sunt convenții de afișare la un payoff nederivabil.
- Pentru scadență unică, extremele și break-even-urile payoff-ului sunt calculate pe segmentele dintre strike-uri; riscul nelimitat este dedus din panta cozii. Pentru scadențe multiple, valorile opțiunilor rămase sunt reevaluate BS, iar extremele/rădăcinile sunt estimări numerice (`approximate: true`).
- Probabilitatea de profit folosește distribuția risk-neutral a modelului; marja este o estimare didactică. Aceste convenții continuă comportamentul aplicației originale.

## Verificări

```sh
npm test
npm run test:coverage
npm run format:check
npm run build
```

Testele verifică benchmark-uri BS, paritate pentru toate cele șase configurații, Greeks prin diferențe finite, forward/decontare amânată, convergență CRR, exercitare americană, cazuri-limită și intrări invalide. Alte teste acoperă payoff-uri exacte, unități, distribuții reproductibile, contabilitatea autofinanțată a hedgingului și store-ul.

Testul de integrare folosește JSDOM și parcurge selecția pozițiilor, cantitățile, scadențele, scenariile, formularele BS/CRR, validarea, simulările, temele și laboratorul Greeks/hedging. JSDOM nu înlocuiește verificarea vizuală într-un browser real; aceasta este necesară când schimbi layout-ul sau interacțiunile SVG.

## Migrare și mentenanță

Sursa primită: `Pasted text.txt`, SHA-256 `27fa73686f2b9890e160a1d25fed392e3660c03c6206820968409386e8c8e40a`. Prima versiune arhivată în istoricul Git păstrează monolitul pentru comparație; sursa activă este exclusiv cea modulară.

Migrarea include corecții pentru discountarea la volatilitate zero, Rho când cost-of-carry este zero, sensibilitățile forwardurilor inferate și Theta la decontare amânată. Distribuția randamentelor logaritmice folosește aceeași corecție Itô ca procesul geometric, iar BID nu poate depăși prețul mediu/ASK. CSS-ul are definiții consolidate pe selector și condiție media, cu override-urile finale absorbite în stilurile componentelor.

Pentru o funcționalitate nouă: implementează și testează întâi funcția pură în `domain/`, adaugă datele în store, apoi selectorul și interacțiunea UI. Evită citirile DOM în motorul financiar și adăugarea unor corecții CSS la sfârșitul fișierelor; modifică regula componentei și breakpoint-ul corespunzător.

Licența existentă a repository-ului este păstrată în `LICENSE`.
