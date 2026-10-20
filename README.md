# Inginerie Financiară ASE

Laborator interactiv pentru studiul opțiunilor financiare, strategiilor de tranzacționare și proceselor stocastice. Interfața este în limba română, iar calculele se execută integral în browser, fără backend, chei API sau servicii externe de cotații.

[Deschide aplicația](https://gdragon2077.github.io/Inginerie_Financiara_ASE/) · [Proiectul original](https://github.com/codrutivascu-ase/inginerie_financiara)

## Originea proiectului

Această versiune este o refactorizare a aplicației publicate în [codrutivascu-ase/inginerie_financiara](https://github.com/codrutivascu-ase/inginerie_financiara).

Contribuția acestui repository constă în reorganizarea implementării într-o arhitectură modulară, separarea logicii financiare de interfață, centralizarea stării aplicației și configurarea procesului de compilare și publicare. Referința către proiectul de origine este păstrată explicit.

## Funcționalități

| Modul                 | Capabilități                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Black–Scholes         | Evaluarea opțiunilor pe acțiuni, active cu dividende, valută, futures și forwarduri; paritate put-call, Greeks și explicații pas cu pas. |
| Model binomial CRR    | Opțiuni europene și americane, arbore recombinant, decizii de exercitare anticipată și convergență către Black–Scholes.                  |
| Strategii cu opțiuni  | Option chain simulat, 13 strategii predefinite, poziții long/short, scadențe multiple, payoff, scenarii și Greeks agregați.              |
| Procese stocastice    | Mișcare browniană standard, generalizată și geometrică, distribuții terminale și intervale de predicție.                                 |
| Exerciții interactive | Probleme Black–Scholes și CRR generate automat, verificarea răspunsurilor și afișarea rezolvărilor.                                      |
| Interfață             | Layout responsive, teme și grafice SVG interactive.                                                                                      |

Laboratorul suplimentar pentru Greeks și delta-hedging este inclus în cod, dar nu este afișat în navigația implicită.

Datele de piață sunt simulate. Aplicația are scop educațional; cotațiile, probabilitățile și estimările de marjă nu reprezintă date furnizate de un broker sau recomandări de investiții.

## Tehnologii

- JavaScript cu module ES native.
- HTML semantic, CSS modular și grafice SVG.
- Vite pentru dezvoltare și compilare.
- Prettier pentru formatarea codului.
- GitHub Actions și GitHub Pages pentru verificare și publicare.

## Instalare și rulare locală

Este necesar **Node.js 22.12 sau mai nou**, împreună cu npm.

```sh
git clone https://github.com/gDragon2077/Inginerie_Financiara_ASE.git
cd Inginerie_Financiara_ASE
npm ci
npm run dev
```

Deschide adresa afișată de Vite. Aplicația trebuie servită prin HTTP; deschiderea directă a fișierului `index.html` prin `file://` nu este suportată.

### Compilare pentru publicare

```sh
npm run build
npm run preview
```

Compilarea generează directorul `dist/`. Comanda `preview` permite verificarea locală a acestei versiuni și nu este destinată utilizării ca server de producție.

Configurația `base` din `vite.config.js` folosește prefixul `/Inginerie_Financiara_ASE/`. Dacă publici aplicația sub alt nume de repository sau într-un alt director, adaptează această valoare.

## Structura proiectului

```text
index.html                 Structura paginii și conținutul didactic
src/
  main.js                  Inițializarea aplicației
  domain/                  Modele financiare, portofolii și simulări
  state/                   Starea centralizată și adaptarea controalelor
  ui/
    pricing/               Formulare, rezultate și vizualizări BS/CRR
    strategies/            Catalogul de strategii și constructorul de poziții
    labs/                  Simulări, Greeks și hedging
    charts/                Primitive SVG comune
  styles/                  Stiluri de bază, componente și reguli responsive
.github/workflows/ci.yml    Verificare și publicare automată
vite.config.js             Configurația compilării și a căilor publice
```

### Principii de arhitectură

- **Logică financiară independentă:** modulele din `domain/` nu accesează DOM-ul și nu depind de interfață sau de starea aplicației.
- **O singură sursă de stare:** datele formularelor, pozițiile și configurațiile sunt gestionate printr-un model centralizat.
- **Responsabilități separate:** interfața adaptează datele pentru calcul și prezintă rezultatele; graficele și stilurile sunt organizate în module dedicate.

Pentru funcționalități noi, implementează mai întâi logica în `domain/`, apoi integrează datele în `state/` și interacțiunile în `ui/`.

## Convenții de calcul

- Ratele și volatilitatea sunt reprezentate intern ca fracții: `0.05` înseamnă 5%. Timpul este exprimat în ani.
- Prețurile opțiunilor sunt calculate per unitate. Un contract reprezintă 100 de unități, iar pozițiile spot sunt exprimate în acțiuni.
- Greeks sunt calculate în convențiile motorului financiar și convertite în interfață pentru afișare, inclusiv Theta pe zi și Vega/Rho la un punct procentual.
- Pentru strategii cu scadențe multiple, opțiunile rămase sunt reevaluate la prima scadență; extremele payoff-ului și pragurile de rentabilitate sunt estimări numerice.
- Probabilitățile de profit folosesc distribuția risk-neutral a modelului, iar estimările de marjă au caracter orientativ.

## Verificare și publicare

```sh
npm run format:check
npm run build
```

Verificările automate curente acoperă formatarea și compilarea. Repository-ul nu include o suită de teste automate; corectitudinea numerică a modelelor și comportamentul interfeței trebuie verificate separat după modificări.

Publicarea pe GitHub Pages este gestionată de `.github/workflows/ci.yml`:

1. Instalează dependențele din `package-lock.json`.
2. Verifică formatarea și compilează aplicația.
3. Publică directorul `dist/` numai pentru modificările din `main` care trec verificările.

Pull request-urile sunt verificate fără publicare. În **Settings → Pages**, sursa de publicare trebuie să rămână **GitHub Actions**.

## Licență

Fișierul [LICENSE](LICENSE) al acestui repository conține licența **Apache License 2.0**. Pentru informațiile de licențiere ale proiectului de origine, consultați separat [repository-ul original](https://github.com/codrutivascu-ase/inginerie_financiara).
