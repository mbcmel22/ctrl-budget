/* Devises et taux de change.
   Les taux viennent de l'API Frankfurter, alimentée par les taux de
   référence de la Banque centrale européenne. Pas de clé, pas de compte,
   et une mise en cache d'une journée pour limiter les appels. */

export const DEVISES = {
  EUR: { libelle: 'Euro', symbole: '€' },
  USD: { libelle: 'Dollar américain', symbole: '$' },
  GBP: { libelle: 'Livre sterling', symbole: '£' },
  CHF: { libelle: 'Franc suisse', symbole: 'CHF' },
  CAD: { libelle: 'Dollar canadien', symbole: '$ CA' },
  AUD: { libelle: 'Dollar australien', symbole: '$ AU' },
  JPY: { libelle: 'Yen japonais', symbole: '¥' },
  SEK: { libelle: 'Couronne suédoise', symbole: 'kr' },
  NOK: { libelle: 'Couronne norvégienne', symbole: 'kr' },
  DKK: { libelle: 'Couronne danoise', symbole: 'kr' },
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
  CNY: { libelle: 'Yuan chinois', symbole: '¥' },
  SGD: { libelle: 'Dollar de Singapour', symbole: 'S$' },
  MAD: { libelle: 'Dirham marocain', symbole: 'DH' },
  XOF: { libelle: 'Franc CFA', symbole: 'F CFA' }
};

const CLE_CACHE = 'ctrl-budget-taux';

/* Renvoie le taux pour convertir un montant de la devise A vers la B. */
export async function tauxChange(de, vers) {
  if (de === vers) return 1;

  const cache = JSON.parse(localStorage.getItem(CLE_CACHE) || '{}');
  const cle = `${de}-${vers}`;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  if (cache[cle] && cache[cle].jour === aujourdhui) return cache[cle].taux;

  /* Frankfurter ne couvre pas toutes les devises exotiques, l'échec est
     donc traité comme une absence de taux, jamais comme un blocage. */
  const reponse = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(de)}&to=${encodeURIComponent(vers)}`);
  if (!reponse.ok) throw new Error('Taux indisponible');

  const donnees = await reponse.json();
  const taux = donnees?.rates?.[vers];
  if (!taux || !Number.isFinite(taux)) throw new Error('Taux indisponible');

  cache[cle] = { taux, jour: aujourdhui };
  localStorage.setItem(CLE_CACHE, JSON.stringify(cache));
  return taux;
}

export function arrondiMonetaire(valeur, devise) {
  /* Le yen et le forint ne se divisent pas en centimes. */
  const sansDecimale = ['JPY', 'HUF', 'XOF'].includes(devise);
  const facteur = sansDecimale ? 1 : 100;
  return Math.round(Number(valeur) * facteur) / facteur;
}
