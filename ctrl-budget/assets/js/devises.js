/* Devises et taux de change.

   Trois sources, dans cet ordre :
   1. les parités fixes officielles, codées en dur, exactes et hors ligne ;
   2. l'API Frankfurter, taux de référence de la Banque centrale européenne ;
   3. l'API open.er-api.com, qui couvre le reste des devises du monde.

   Les noms des devises ne sont pas codés en dur : ils viennent de
   Intl.DisplayNames, donc traduits automatiquement dans la langue de
   l'interface. */

import { localeCourante } from './i18n.js';

/* Parités fixes, 1 EUR vaut exactement : */
const PARITES_EUR = {
  XOF: 655.957,      // franc CFA, Afrique de l'Ouest
  XAF: 655.957,      // franc CFA, Afrique centrale
  XPF: 119.33174,    // franc Pacifique
  KMF: 491.96775,    // franc comorien
  CVE: 110.265,      // escudo cap-verdien
  BAM: 1.95583,      // mark convertible
  BGN: 1.95583       // lev bulgare
};

/* Parités fixes exprimées en dollars, 1 USD vaut exactement : */
const PARITES_USD = {
  AED: 3.6725, SAR: 3.75, QAR: 3.64, OMR: 0.384497, BHD: 0.376, JOD: 0.709,
  ERN: 15, PAB: 1, BSD: 1, BBD: 2, BZD: 2, XCD: 2.7, AWG: 1.79, CUP: 24,
  DJF: 177.721, LSL: null, SVC: 8.75
};

/* Devises cotées quotidiennement par la BCE. */
const BCE = ['USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'HKD', 'SGD',
  'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'RON', 'HUF', 'TRY', 'BRL', 'MXN',
  'INR', 'ZAR', 'KRW', 'ILS', 'THB', 'MYR', 'PHP', 'IDR'];

/* Toutes les devises proposées dans le profil, par code ISO 4217. */
export const CODES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'HKD', 'TWD', 'SGD',
  'KRW', 'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'THB', 'VND', 'IDR', 'MYR', 'PHP', 'MMK',
  'KHR', 'LAK', 'MNT', 'BND', 'MOP', 'MVR', 'AFN', 'BTN',
  'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'BAM',
  'MKD', 'ALL', 'MDL', 'UAH', 'BYN', 'RUB', 'GEL', 'AMD', 'AZN', 'TRY', 'CHF',
  'ILS', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'IQD', 'IRR', 'YER', 'SYP',
  'EGP', 'MAD', 'DZD', 'TND', 'LYD', 'SDG', 'ETB', 'KES', 'UGX', 'TZS', 'RWF', 'BIF',
  'XOF', 'XAF', 'XPF', 'NGN', 'GHS', 'GMD', 'GNF', 'SLE', 'LRD', 'CVE', 'STN', 'KMF',
  'ZAR', 'BWP', 'NAD', 'ZMW', 'MWK', 'MZN', 'AOA', 'ZWG', 'LSL', 'SZL', 'MGA', 'MUR', 'SCR',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES', 'GTQ', 'HNL',
  'NIO', 'CRC', 'PAB', 'DOP', 'HTG', 'JMD', 'TTD', 'BBD', 'BSD', 'BZD', 'XCD', 'CUP', 'AWG', 'SRD', 'GYD',
  'KZT', 'UZS', 'KGS', 'TJS', 'TMT', 'PGK', 'FJD', 'SBD', 'VUV', 'WST', 'TOP', 'NZD'
].filter((c, i, tab) => tab.indexOf(c) === i);

/* Devises sans subdivision : elles s'affichent sans centimes. */
export const SANS_DECIMALES = ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

/* Nom localisé de la devise, par le navigateur. */
export function nomDevise(code) {
  try {
    const nom = new Intl.DisplayNames([localeCourante()], { type: 'currency' }).of(code);
    if (nom && nom !== code) return nom.charAt(0).toUpperCase() + nom.slice(1);
  } catch (e) { /* le navigateur ne connaît pas ce code */ }
  return code;
}

export function listeDevises() {
  return CODES
    .map((code) => ({ code, nom: nomDevise(code) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, localeCourante()));
}

const CLE_CACHE = 'ctrl-budget-taux';

function lireCache() {
  try { return JSON.parse(localStorage.getItem(CLE_CACHE) || '{}'); } catch (e) { return {}; }
}
function ecrireCache(cache) {
  try { localStorage.setItem(CLE_CACHE, JSON.stringify(cache)); } catch (e) { /* stockage plein */ }
}

let tableComplete = null;

/* Table de secours : tous les taux depuis l'euro, en un seul appel. */
async function chargerTableComplete() {
  if (tableComplete) return tableComplete;

  const cache = lireCache();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (cache.table && cache.table.jour === aujourdhui) {
    tableComplete = cache.table.taux;
    return tableComplete;
  }

  const reponse = await fetch('https://open.er-api.com/v6/latest/EUR');
  if (!reponse.ok) throw new Error('Taux indisponible');
  const donnees = await reponse.json();
  if (!donnees?.rates) throw new Error('Taux indisponible');

  tableComplete = donnees.rates;
  cache.table = { taux: donnees.rates, jour: aujourdhui };
  ecrireCache(cache);
  return tableComplete;
}

/* Combien d'unités de cette devise valent un euro. */
async function parEuro(code) {
  if (code === 'EUR') return 1;
  if (PARITES_EUR[code]) return PARITES_EUR[code];

  const cache = lireCache();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (cache[code] && cache[code].jour === aujourdhui) return cache[code].taux;

  let taux = null;

  if (BCE.includes(code)) {
    try {
      const reponse = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(code)}`);
      if (reponse.ok) {
        const donnees = await reponse.json();
        if (Number.isFinite(donnees?.rates?.[code])) taux = donnees.rates[code];
      }
    } catch (e) { /* on passera par la table complète */ }
  }

  if (taux === null && PARITES_USD[code]) {
    const usd = await parEuro('USD');
    taux = usd * PARITES_USD[code];
  }

  if (taux === null) {
    const table = await chargerTableComplete();
    if (Number.isFinite(table[code])) taux = table[code];
  }

  if (taux === null) throw new Error('Taux indisponible');

  cache[code] = { taux, jour: aujourdhui };
  ecrireCache(cache);
  return taux;
}

/* Taux pour convertir un montant de la devise A vers la devise B. */
export async function tauxChange(de, vers) {
  if (de === vers) return 1;
  const [a, b] = await Promise.all([parEuro(de), parEuro(vers)]);
  return b / a;
}

/* Les montants sont TOUJOURS stockés avec deux décimales, même pour le yen
   ou le franc CFA. C'est ce qui permet à un aller-retour entre deux devises
   de rendre exactement les montants d'origine. L'affichage, lui, respecte
   les usages de chaque devise. */
export function arrondiMonetaire(valeur) {
  return Math.round(Number(valeur) * 100) / 100;
}
