import { $ } from './dom.js';
const MODELE = {
  stock: 'Black-Scholes (1973)',
  stock_q: 'Merton (1973)',
  fx: 'Garman-Kohlhagen (1983)',
  fut: 'Black (1976)',
  fwd_stock: 'Black (1976) pe F₀ derivat din spot',
  fwd_fx: 'Black (1976) pe forward valutar',
};
function buildTheoryBS() {
  $('theoryBS').innerHTML =
    '' +
    '<h2 style="margin-top:4px">Interpretarea cost-of-carry</h2>' +
    '<p><i>b</i> este carry-ul activului introdus efectiv în formulă, nu rata de actualizare. Pentru un activ spot, <i>b</i> = <i>r</i> minus venitul continuu produs de deținere; pentru un preț futures sau forward introdus ca suport în Black–76, <i>b</i> = 0. Fluxurile opțiunii sunt actualizate în toate cazurile cu rata fără risc <i>r</i>.</p>' +
    '<div class="note">La forwardurile construite din spot apar două etape distincte: carry-ul spot (<i>r</i>−<i>q</i> sau <i>r</i>−<i>r</i><sub>f</sub>) determină <i>F</i><sub>0</sub>, apoi formula opțiunii folosește <i>S</i> = <i>F</i><sub>0</sub> și <i>b</i> = 0.</div>' +
    '<p>Cu <i>b</i> = <i>r</i> se obține formula Black-Scholes din 1973; cu <i>b</i> = <i>r</i> − <i>q</i>, formula lui Merton pentru active cu randament continuu; cu <i>b</i> = <i>r</i> − <i>r<sub>f</sub></i>, formula Garman-Kohlhagen pentru valute; cu <i>b</i> = 0 și <i>S</i> = <i>F</i><sub>0</sub>, modelul Black din 1976 pentru opțiuni pe futures. Formula presupune opțiuni <b>europene</b>, exercitabile doar la scadență.</p>' +
    '<h2>Opțiuni pe forward și pe futures</h2>' +
    '<p>Sub rate ale dobânzii deterministe prețul forward și prețul futures coincid, iar o opțiune europeană pe oricare dintre ele se evaluează cu <i>b</i> = 0 și <i>S</i> = <i>F</i><sub>0</sub>. Prețul forward se obține din paritatea cash-and-carry:</p>' +
    '<div class="fx big" style="margin:10px 0 14px"><i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>·e<sup>(<i>r</i>−<i>q</i>)<i>T<sub>F</sub></i></sup> &nbsp;&nbsp;(acțiune cu randament <i>q</i>) &nbsp;&nbsp;&nbsp; <i>F</i><sub>0</sub> = <i>S</i><sub>0</sub>·e<sup>(<i>r</i>−<i>r<sub>f</sub></i>)<i>T<sub>F</sub></i></sup> &nbsp;&nbsp;(valută)</div>' +
    '<p>Există o subtilitate de care se lovesc studenții: dacă opțiunea expiră la <i>T</i>, dar contractul forward primit prin exercitare se decontează abia la <i>T<sub>F</sub></i> &gt; <i>T</i>, câștigul (<i>F<sub>T</sub></i> − <i>K</i>) nu se încasează imediat, ci la <i>T<sub>F</sub></i>. Prețul opțiunii trebuie atunci actualizat suplimentar cu e<sup>−<i>r</i>(<i>T<sub>F</sub></i>−<i>T</i>)</sup>. Aplicația tratează ambele convenții — comutați caseta corespunzătoare din configurație și priviți raportul dintre cele două prețuri.</p>' +
    '<p>Când <i>T<sub>F</sub></i> = <i>T</i>, opțiunea pe forward și opțiunea pe spot au exact același preț: verificați acest lucru comparând configurația „forward pe acțiune” cu „acțiune cu dividend continuu”.</p>' +
    '<h2>Referințe</h2><ul class="refs">' +
    '<li>Black, F., Scholes, M. (1973). <i>The Pricing of Options and Corporate Liabilities</i>. Journal of Political Economy, 81(3), 637–654.</li>' +
    '<li>Merton, R. C. (1973). <i>Theory of Rational Option Pricing</i>. Bell Journal of Economics, 4(1), 141–183.</li>' +
    '<li>Black, F. (1976). <i>The Pricing of Commodity Contracts</i>. Journal of Financial Economics, 3(1–2), 167–179.</li>' +
    '<li>Garman, M. B., Kohlhagen, S. W. (1983). <i>Foreign Currency Option Values</i>. Journal of International Money and Finance, 2(3), 231–237.</li>' +
    '<li>Hull, J. C. <i>Options, Futures, and Other Derivatives</i>. Pearson.</li>' +
    '<li>Haug, E. G. <i>The Complete Guide to Option Pricing Formulas</i>. McGraw-Hill.</li>' +
    '</ul>';
}
function buildTheoryCRR() {
  $('theoryCRR').innerHTML =
    '' +
    '<h2 style="margin-top:4px">Modelul binomial Cox-Ross-Rubinstein</h2>' +
    '<p>Orizontul <i>T</i> se împarte în <i>n</i> subintervale de lungime Δ<i>t</i> = <i>T</i>/<i>n</i>. Pe fiecare pas prețul se poate înmulți cu <i>u</i> sau cu <i>d</i>:</p>' +
    '<div class="fx big" style="margin:10px 0 14px"><i>u</i> = e<sup>σ√Δ<i>t</i></sup> ,&nbsp;&nbsp; <i>d</i> = 1/<i>u</i> ,&nbsp;&nbsp; <i>p</i> = (e<sup>(<i>r</i>−<i>q</i>)Δ<i>t</i></sup> − <i>d</i>) / (<i>u</i> − <i>d</i>)</div>' +
    '<p>Alegerea <i>d</i> = 1/<i>u</i> face arborele <b>recombinant</b>: o creștere urmată de o scădere readuce prețul la nivelul inițial, deci numărul de noduri crește liniar, nu exponențial. Observați că <b><i>u</i> și <i>d</i> nu depind de tipul activului suport</b> — ele sunt calibrate exclusiv pe volatilitate. Tipul activului intră în probabilitatea neutră la risc prin randamentul echivalent <i>q</i>. Pentru futures și forward, <i>q</i> = <i>r</i>.</p>' +
    '<p>Valoarea se obține prin <b>inducție inversă</b>: la scadență se pun payoff-urile, apoi în fiecare nod anterior</p>' +
    '<div class="fx big" style="margin:10px 0 14px"><i>V</i> = e<sup>−<i>r</i>Δ<i>t</i></sup>·[<i>p</i>·<i>V<sub>u</sub></i> + (1−<i>p</i>)·<i>V<sub>d</sub></i>]</div>' +
    '<p>pentru opțiuni europene, respectiv <i>V</i> = max(valoare de continuare, valoare de exercitare) pentru opțiuni americane. Condiția de absență a arbitrajului este <i>d</i> &lt; e<sup>(<i>r</i>−<i>q</i>)Δ<i>t</i></sup> &lt; <i>u</i>, echivalentă cu 0 &lt; <i>p</i> &lt; 1; ea se poate încălca dacă pașii sunt prea lungi în raport cu volatilitatea.</p>' +
    '<p>Pentru opțiuni <b>europene</b> există și o cale alternativă, fără a parcurge arborele nod cu nod: formula binomială închisă, calculată direct din distribuția prețului final (vedeți panoul „Calcul alternativ” de mai sus). Pentru opțiuni <b>americane</b> acest lucru nu mai este posibil, pentru că decizia de exercitare depinde de traiectorie, nu doar de valoarea finală — de aceea inducția inversă rămâne singura metodă corectă.</p>' +
    '<h2>Când se exercită anticipat</h2>' +
    '<ul>' +
    '<li>Un <b>call american</b> pe o acțiune fără dividende (<i>q</i> = 0) nu se exercită niciodată anticipat — valoarea lui coincide cu cea a call-ului european.</li>' +
    '<li>Un <b>call american</b> pe o acțiune cu randament de dividend se poate exercita optim doar cu puțin timp înainte de scadență, când randamentul reduce suficient creșterea așteptată a prețului.</li>' +
    '<li>Un <b>put american</b> poate fi exercitat anticipat oricând, dacă este suficient de „în bani”: se încasează <i>K</i> mai devreme și se câștigă dobânda pe această sumă.</li>' +
    '<li>Pentru opțiuni pe <b>futures</b> (<i>q</i> = <i>r</i>), atât call-ul, cât și put-ul american pot fi exercitate anticipat, pentru că valoarea de exercitare nu presupune imobilizarea de capital.</li>' +
    '<li>Pentru opțiuni pe <b>valute</b>, exercitarea anticipată devine atractivă când diferența dintre rate este suficient de mare.</li>' +
    '</ul>' +
    '<p>Toate aceste cazuri se pot observa direct pe arborele de mai sus: nodurile marcate cu portocaliu sunt cele în care valoarea de exercitare imediată depășește valoarea de continuare.</p>' +
    '<h2>Convergență și precizie numerică</h2>' +
    '<p>Prețul binomial converge către cel Black-Scholes, dar <b>oscilant</b>: eroarea își schimbă semnul pe măsură ce prețul de exercitare se deplasează între două noduri terminale. Eroarea scade aproximativ ca 1/<i>n</i>, deci dublarea numărului de pași înjumătățește eroarea. Media prețurilor pentru <i>n</i> și <i>n</i>+1, sau extrapolarea Richardson, ameliorează sensibil convergența. Pentru opțiuni americane nu există formulă închisă, iar arborele rămâne metoda de referință în predare.</p>' +
    '<h2>Referințe</h2><ul class="refs">' +
    '<li>Cox, J. C., Ross, S. A., Rubinstein, M. (1979). <i>Option Pricing: A Simplified Approach</i>. Journal of Financial Economics, 7(3), 229–263.</li>' +
    '<li>Hull, J. C. <i>Options, Futures, and Other Derivatives</i>. Pearson.</li>' +
    '<li>Haug, E. G. <i>The Complete Guide to Option Pricing Formulas</i>. McGraw-Hill.</li>' +
    '</ul>';
}
export { MODELE, buildTheoryBS, buildTheoryCRR };
