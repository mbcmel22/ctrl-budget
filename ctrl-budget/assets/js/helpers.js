/* Fonctions métier de CTRL Budget : formats, classement automatique,
   calculs du mois, épargne et export. Aucun appel réseau ici. */

import { t, localeCourante } from './i18n.js';
import { arrondiMonetaire } from './devises.js';

/* ============================ Paramètres d'affichage ============================ */

const parametres = { devise: 'EUR' };

export function setDevise(code) {
  if (code) parametres.devise = code;
}
export const deviseCourante = () => parametres.devise;

/* ============================ Formats ============================ */

export function euro(n) {
  return new Intl.NumberFormat(localeCourante(), {
    style: 'currency', currency: parametres.devise
  }).format(Number(n) || 0);
}

export function euroArrondi(n) {
  return new Intl.NumberFormat(localeCourante(), {
    style: 'currency', currency: parametres.devise, maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

export function pourcent(n) {
  return new Intl.NumberFormat(localeCourante(), {
    style: 'percent', maximumFractionDigits: 1
  }).format((Number(n) || 0) / 100);
}

export function dateFr(iso) {
  if (!iso) return '';
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
    .toLocaleDateString(localeCourante(), { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ============================ Mois ============================ */

export const cleMois = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const moisDepuisCle = (cle) => new Date(Number(cle.slice(0, 4)), Number(cle.slice(5, 7)) - 1, 1);
export const moisCourant = () => cleMois(new Date());

export function libelleMois(cle) {
  return moisDepuisCle(cle).toLocaleDateString(localeCourante(), { month: 'long', year: 'numeric' });
}
export function libelleMoisCourt(cle) {
  return moisDepuisCle(cle).toLocaleDateString(localeCourante(), { month: 'short' }).replace('.', '');
}
export function moisPrecedent(cle, n = 1) {
  const d = moisDepuisCle(cle);
  d.setMonth(d.getMonth() - n);
  return cleMois(d);
}
export const moisSuivant = (cle, n = 1) => moisPrecedent(cle, -n);

export function joursDuMois(cle) {
  const d = moisDepuisCle(cle);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
export const premierJour = (cle) => `${cle}-01`;
export const dernierJour = (cle) => `${cle}-${String(joursDuMois(cle)).padStart(2, '0')}`;

/* Écart en mois entre deux clés, positif si b vient après a. */
export function ecartMois(a, b) {
  const da = moisDepuisCle(a);
  const db = moisDepuisCle(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

export function mensualitesRestantes(cle, dateFin) {
  if (!dateFin) return null;
  return Math.max(0, ecartMois(cle, dateFin.slice(0, 7)) + 1);
}

/* ============================ Référentiels ============================ */

export const NATURES_CLES = ['fixe', 'credit', 'abonnement', 'variable', 'epargne'];

const CLASSE_NATURE = {
  fixe: 'tag-fixe', credit: 'tag-credit', abonnement: 'tag-abonnement',
  variable: 'tag-variable', epargne: 'tag-epargne'
};

export const libelleNature = (cle) => t(`nature.${NATURES_CLES.includes(cle) ? cle : 'fixe'}`);
export const classeNature = (cle) => CLASSE_NATURE[cle] || 'tag-fixe';

export const CATEGORIES_CLES = [
  'logement', 'energie', 'telecom', 'assurance', 'transport', 'alimentation',
  'sante', 'loisirs', 'banque', 'credit', 'impots', 'enfants', 'epargne', 'autre'
];

const COULEURS = {
  logement: '#16274a', energie: '#2f4d8f', telecom: '#4d7ac7', assurance: '#6f86b8',
  transport: '#17876b', alimentation: '#3aa88a', sante: '#7fc0ac', loisirs: '#8b5fbf',
  banque: '#b8820c', credit: '#c74436', impots: '#8d6e2f', enfants: '#d98cb3',
  epargne: '#17876b', autre: '#8d97ad'
};

const EMOJIS = {
  logement: '🏠', energie: '⚡', telecom: '📶', assurance: '🛡️', transport: '🚗',
  alimentation: '🛒', sante: '💊', loisirs: '🎬', banque: '🏦', credit: '🏦',
  impots: '🧾', enfants: '🧸', epargne: '🌱', autre: '📦'
};

export function categorie(cle) {
  const c = CATEGORIES_CLES.includes(cle) ? cle : 'autre';
  return { cle: c, libelle: t(`cat.${c}`), couleur: COULEURS[c], emoji: EMOJIS[c] };
}

export const TYPES_REVENU_CLES = ['salaire', 'prime', 'aide', 'freelance', 'loyer', 'autre'];
export const libelleTypeRevenu = (cle) => t(`rev.${TYPES_REVENU_CLES.includes(cle) ? cle : 'autre'}`);

/* ==================== Classement automatique ==================== */

const REGLES = [
  { mots: ['pret', 'prêt', 'credit', 'crédit', 'ech pret', 'echeance', 'financement', 'loa', 'lld', 'cofidis', 'cetelem', 'sofinco', 'younited', 'loan', 'mortgage', 'prestamo'], categorie: 'credit', nature: 'credit' },
  { mots: ['loyer', 'citya', 'foncia', 'syndic', 'copropriete', 'charges locatives', 'taxe habitation', 'rent', 'alquiler'], categorie: 'logement', nature: 'fixe' },
  { mots: ['vattenfall', 'edf', 'engie', 'total energies', 'ekwateur', 'electricite', 'électricité', 'gaz', 'eau', 'veolia', 'saur', 'suez', 'electricity', 'water', 'luz'], categorie: 'energie', nature: 'fixe' },
  { mots: ['bouygues', 'orange', 'sfr', 'free', 'sosh', 'red by', 'internet', 'fibre', 'mobile', 'box', 'forfait', 'vodafone', 'movistar'], categorie: 'telecom', nature: 'abonnement' },
  { mots: ['assurance', 'mutuelle', 'prevoyance', 'prévoyance', 'maif', 'macif', 'axa', 'matmut', 'gmf', 'accident', 'habitation', 'automobile', 'auto', 'moto', 'deces', 'décès', 'insurance', 'seguro'], categorie: 'assurance', nature: 'fixe' },
  { mots: ['netflix', 'spotify', 'deezer', 'disney', 'canal', 'prime video', 'apple', 'youtube', 'claude', 'chatgpt', 'openai', 'adobe', 'icloud', 'abonnement', 'basic fit', 'basicfit', 'salle de sport', 'fitness', 'gym', 'subscription'], categorie: 'loisirs', nature: 'abonnement' },
  { mots: ['courses', 'alimentation', 'drive', 'carrefour', 'leclerc', 'lidl', 'intermarche', 'auchan', 'super u', 'aldi', 'boulangerie', 'restaurant', 'cantine', 'groceries', 'mercadona'], categorie: 'alimentation', nature: 'variable' },
  { mots: ['sncf', 'essence', 'carburant', 'peage', 'péage', 'parking', 'bus', 'tram', 'navigo', 'train', 'entretien voiture', 'garage', 'uber', 'fuel', 'metro'], categorie: 'transport', nature: 'fixe' },
  { mots: ['epargne', 'épargne', 'livret', 'investir', 'invest', 'pea', 'bourse', 'per', 'assurance vie', 'trade republic', 'savings', 'ahorro'], categorie: 'epargne', nature: 'epargne' },
  { mots: ['impot', 'impôt', 'taxe', 'urssaf', 'tresor public', 'trésor public', 'tax'], categorie: 'impots', nature: 'fixe' },
  { mots: ['cotisation', 'frais bancaire', 'frais de tenue', 'banque', 'carte bancaire', 'agios', 'revolut', 'n26', 'boursorama', 'cm', 'bank'], categorie: 'banque', nature: 'fixe' },
  { mots: ['creche', 'crèche', 'nounou', 'ecole', 'école', 'garderie', 'periscolaire', 'pension', 'school'], categorie: 'enfants', nature: 'fixe' },
  { mots: ['pharmacie', 'medecin', 'médecin', 'dentiste', 'osteo', 'kine', 'optique', 'sante', 'santé', 'pharmacy', 'doctor'], categorie: 'sante', nature: 'variable' }
];

export const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const cacheRegex = new Map();
function contientMot(texte, mot) {
  const propre = sansAccent(mot);
  if (!cacheRegex.has(propre)) {
    const echappe = propre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cacheRegex.set(propre, new RegExp(`(^|[^a-z0-9])${echappe}s?([^a-z0-9]|$)`));
  }
  return cacheRegex.get(propre).test(texte);
}

export function deviner(libelle) {
  const texte = sansAccent(libelle);
  if (!texte.trim()) return { categorie: 'autre', nature: 'fixe' };
  for (const regle of REGLES) {
    if (regle.mots.some((mot) => contientMot(texte, mot))) {
      return { categorie: regle.categorie, nature: regle.nature };
    }
  }
  return { categorie: 'autre', nature: 'fixe' };
}

/* ==================== Validation ==================== */

export const nettoyerLibelle = (v) => String(v || '').trim().slice(0, 60);

export function montantValide(v) {
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1000000) return null;
  return arrondiMonetaire(n, parametres.devise);
}

/* ==================== Sélections du mois ==================== */

export function chargesDuMois(charges, cle) {
  const debutMois = premierJour(cle);
  const finMois = dernierJour(cle);
  return charges.filter((c) => {
    if (!c.actif) return false;
    if (c.date_debut && c.date_debut > finMois) return false;
    if (c.date_fin && c.date_fin < debutMois) return false;
    return true;
  });
}

export function revenusDuMois(revenus, cle) {
  return revenus.filter((r) => {
    if (!r.actif) return false;
    if (r.recurrent) return true;
    return (r.mois || '').slice(0, 7) === cle;
  });
}

export const somme = (liste, champ = 'montant') => liste.reduce((total, x) => total + Number(x[champ] || 0), 0);

export function synthese({ charges, revenus, depenses, cle }) {
  const chargesMois = chargesDuMois(charges, cle);
  const revenusMois = revenusDuMois(revenus, cle);
  const depensesMois = depenses.filter((d) => (d.date || '').slice(0, 7) === cle);

  const totalRevenus = somme(revenusMois);
  const totalCharges = somme(chargesMois);
  const totalDepenses = somme(depensesMois);
  const totalCredits = somme(chargesMois.filter((c) => c.nature === 'credit'));
  const totalAbonnements = somme(chargesMois.filter((c) => c.nature === 'abonnement'));
  const totalEpargne = somme(chargesMois.filter((c) => c.nature === 'epargne'));

  const resteAVivre = totalRevenus - totalCharges;
  const resteReel = resteAVivre - totalDepenses;
  const tauxEndettement = totalRevenus > 0 ? (totalCredits / totalRevenus) * 100 : 0;

  const aujourdhui = new Date();
  const moisEnCours = cleMois(aujourdhui) === cle;
  const nbJours = joursDuMois(cle);
  const jour = moisEnCours ? aujourdhui.getDate() : nbJours;
  const rythme = jour > 0 ? totalDepenses / jour : 0;

  return {
    chargesMois, revenusMois, depensesMois,
    totalRevenus, totalCharges, totalDepenses, totalCredits, totalAbonnements, totalEpargne,
    resteAVivre, resteReel, tauxEndettement,
    jour, nbJours, moisEnCours, rythme,
    projection: rythme * nbJours,
    budgetJournalier: (resteAVivre - totalDepenses) / Math.max(1, nbJours - jour + 1)
  };
}

/* ==================== Épargne ==================== */

function premierMoisConnu(charges, mouvements) {
  const dates = [
    ...(charges || []).filter((c) => c.nature === 'epargne').map((c) => (c.date_debut || c.created_at || '').slice(0, 7)),
    ...(mouvements || []).map((m) => (m.date || '').slice(0, 7))
  ].filter((d) => /^\d{4}-\d{2}$/.test(d)).sort();
  return dates[0] || null;
}

/* Reconstitue le solde : solde de départ, versements automatiques issus
   des charges de nature Épargne pour chaque mois écoulé, puis mouvements
   manuels. Renvoie aussi la série mensuelle pour le graphique. */
export function soldeEpargne({ charges, mouvements, initial, jusquA }) {
  const debut = premierMoisConnu(charges, mouvements) || jusquA;
  const nbMois = Math.max(0, ecartMois(debut, jusquA));
  let total = Number(initial) || 0;
  const serie = [];

  for (let i = nbMois; i >= 0; i--) {
    const cle = moisPrecedent(jusquA, i);
    const auto = somme(chargesDuMois(charges, cle).filter((c) => c.nature === 'epargne'));
    const manuels = (mouvements || [])
      .filter((m) => (m.date || '').slice(0, 7) === cle)
      .reduce((acc, m) => acc + Number(m.montant) * (m.sens === 'retrait' ? -1 : 1), 0);
    total += auto + manuels;
    serie.push({ cle, auto, manuels, cumul: total });
  }

  return { total, serie };
}

/* ==================== Séries pour les graphiques ==================== */

export function cumulParJour(depenses, cle) {
  const n = joursDuMois(cle);
  const parJour = new Array(n).fill(0);
  depenses.forEach((d) => {
    if ((d.date || '').slice(0, 7) !== cle) return;
    const j = Number(d.date.slice(8, 10));
    if (j >= 1 && j <= n) parJour[j - 1] += Number(d.montant || 0);
  });
  let cumul = 0;
  return parJour.map((v) => (cumul += v));
}

export function repartition(lignes) {
  const parCat = new Map();
  lignes.forEach((l) => {
    const c = categorie(l.categorie);
    parCat.set(c.cle, (parCat.get(c.cle) || 0) + Number(l.montant || 0));
  });
  return [...parCat.entries()]
    .map(([cle, montant]) => ({ montant, ...categorie(cle) }))
    .sort((a, b) => b.montant - a.montant);
}

/* ==================== Export CSV ==================== */

export function versCSV(colonnes, lignes) {
  const echapper = (v) => {
    const s = String(v ?? '');
    const sur = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
    return '"' + sur.replaceAll('"', '""') + '"';
  };
  const entete = colonnes.map((c) => echapper(c.titre)).join(';');
  const corps = lignes.map((l) => colonnes.map((c) => echapper(c.valeur(l))).join(';'));
  return '\uFEFF' + [entete, ...corps].join('\r\n');
}

export function telechargerCSV(nomFichier, contenu) {
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
