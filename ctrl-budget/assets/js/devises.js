/* Devises et taux de change.
   Les taux flottants viennent de l'API Frankfurter, alimentée par les taux
   de référence de la Banque centrale européenne. Les devises à parité fixe
   avec l'euro sont converties par leur parité officielle, sans appel réseau.
   Un cache d'une journée limite les requêtes. */

/* Parités fixes officielles, 1 EUR vaut : */
const PARITES_FIXES = {
  XOF: 655.957,   // franc CFA UEMOA
  XAF: 655.957,   // franc CFA CEMAC
  XPF: 119.3317   // franc Pacifique
};

/* Devises cotées quotidiennement par la BCE, donc convertibles en direct. */
const FLOTTANTES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'HKD', 'SGD',
  'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'RON', 'BGN', 'HUF', 'TRY',
  'BRL', 'MXN', 'INR', 'ZAR', 'KRW', 'ILS', 'THB', 'MYR', 'PHP', 'IDR'
];

export const DEVISES = {
  EUR: { libelle: 'Euro', symbole: '€' },
  USD: { libelle: 'Dollar américain', symbole: '$' },
  GBP: { libelle: 'Livre sterling', symbole: '£' },
  CHF: { libelle: 'Franc suisse', symbole: 'CHF' },
  CAD: { libelle: 'Dollar canadien', symbole: '$ CA' },
  AUD: { libelle: 'Dollar australien', symbole: '$ AU' },
  NZD: { libelle: 'Dollar néo-zélandais', symbole: '$ NZ' },
  JPY: { libelle: 'Yen japonais', symbole: '¥' },
  CNY: { libelle: 'Yuan chinois', symbole: '¥' },
  HKD: { libelle: 'Dollar de Hong Kong', symbole: 'HK$' },
  SGD: { libelle: 'Dollar de Singapour', symbole: 'S$' },
  SEK: { libelle: 'Couronne suédoise', symbole: 'kr' },
  NOK: { libelle: 'Couronne norvégienne', symbole: 'kr' },
  DKK: { libelle: 'Couronne danoise', symbole: 'kr' },
  ISK: { libelle: 'Couronne islandaise', symbole: 'kr' },
  PLN: { libelle: 'Zloty polonais', symbole: 'zł' },
  CZK: { libelle: 'Couronne tchèque', symbole: 'Kč' },
  RON: { libelle: 'Leu roumain', symbole: 'lei' },
  BGN: { libelle: 'Lev bulgare', symbole: 'лв' },
  HUF: { libelle: 'Forint hongrois', symbole: 'Ft' },
  TRY: { libelle: 'Livre turque', symbole: '₺' },
  BRL: { libelle: 'Réal brésilien', symbole: 'R$' },
  MXN: { libelle: 'Peso mexicain', symbole: '$ MX' },
  INR: { libelle: 'Roupie indienne', symbole: '₹' },
  ZAR: { libelle: 'Rand sud-africain', symbole: 'R' },
  KRW: { libelle: 'Won sud-coréen', symbole: '₩' },
  ILS: { libelle: 'Shekel israélien', symbole: '₪' },
  THB: { libelle: 'Baht thaïlandais', symbole: '฿' },
  MYR: { libelle: 'Ringgit malaisien', symbole: 'RM' },
  PHP: { libelle: 'Peso philippin', symbole: '₱' },
  IDR: { libelle: 'Roupie indonésienne', symbole: 'Rp' },
  XOF: { libelle: 'Franc CFA, Afrique de l\'Ouest', symbole: 'F CFA' },
  XAF: { libelle: 'Franc CFA, Afrique centrale', symbole: 'F CFA' },
  XPF: { libelle: 'Franc Pacifique', symbole: 'F' }
};

const CLE_CACHE = 'ctrl-budget-taux';

/* Combien d'unités de cette devise valent 1 euro. */
async function parEuro(code) {
  if (code === 'EUR') return 1;
  if (PARITES_FIXES[code]) return PARITES_FIXES[code];
  if (!FLOTTANTES.includes(code)) throw new Error('Devise non convertible');

  const cache = JSON.parse(localStorage.getItem(CLE_CACHE) || '{}');
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (cache[code] && cache[code].jour === aujourdhui) return cache[code].taux;

  const reponse = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(code)}`);
  if (!reponse.ok) throw new Error('Taux indisponible');

  const donnees = await reponse.json();
  const taux = donnees?.rates?.[code];
  if (!taux || !Number.isFinite(taux)) throw new Error('Taux indisponible');

  cache[code] = { taux, jour: aujourdhui };
  localStorage.setItem(CLE_CACHE, JSON.stringify(cache));
  return taux;
}

/* Taux pour convertir un montant de la devise A vers la devise B. */
export async function tauxChange(de, vers) {
  if (de === vers) return 1;
  const [a, b] = await Promise.all([parEuro(de), parEuro(vers)]);
  return b / a;
}

export function arrondiMonetaire(valeur, devise) {
  /* Ces devises ne se divisent pas en centimes. */
  const sansDecimale = ['JPY', 'HUF', 'KRW', 'IDR', 'XOF', 'XAF', 'XPF', 'ISK'].includes(devise);
  const facteur = sansDecimale ? 1 : 100;
  return Math.round(Number(valeur) * facteur) / facteur;
}
