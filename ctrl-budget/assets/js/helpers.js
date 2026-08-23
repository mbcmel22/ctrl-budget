/* Fonctions métier de CTRL Budget : formats, classement automatique,
   calculs du mois et export. Aucun appel réseau ici. */

/* ============================ Formats ============================ */

const euroFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
const euroCourt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const euro = (n) => euroFmt.format(Number(n) || 0);
export const euroArrondi = (n) => euroCourt.format(Number(n) || 0);
export const pourcent = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toString().replace('.', ',')} %`;

export function dateFr(iso) {
  if (!iso) return '';
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ============================ Mois ============================ */

export const cleMois = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const moisDepuisCle = (cle) => new Date(Number(cle.slice(0, 4)), Number(cle.slice(5, 7)) - 1, 1);

export function libelleMois(cle) {
  return moisDepuisCle(cle).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
export function libelleMoisCourt(cle) {
  return moisDepuisCle(cle).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
}
export function moisPrecedent(cle, n = 1) {
  const d = moisDepuisCle(cle);
  d.setMonth(d.getMonth() - n);
  return cleMois(d);
}
export function joursDuMois(cle) {
  const d = moisDepuisCle(cle);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
export function premierJour(cle) { return `${cle}-01`; }
export function dernierJour(cle) { return `${cle}-${String(joursDuMois(cle)).padStart(2, '0')}`; }

/* Nombre de mensualités restantes entre le mois affiché et la date de fin. */
export function mensualitesRestantes(cle, dateFin) {
  if (!dateFin) return null;
  const debut = moisDepuisCle(cle);
  const fin = new Date(dateFin + 'T12:00:00');
  const n = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
  return Math.max(0, n);
}

/* ============================ Référentiels ============================ */

export const NATURES = {
  fixe: { libelle: 'Charge fixe', classe: 'tag-fixe' },
  credit: { libelle: 'Crédit', classe: 'tag-credit' },
  abonnement: { libelle: 'Abonnement', classe: 'tag-abonnement' },
  variable: { libelle: 'Variable', classe: 'tag-variable' },
  epargne: { libelle: 'Épargne', classe: 'tag-epargne' }
};

export const CATEGORIES = {
  logement: { libelle: 'Logement', emoji: '🏠', couleur: '#16274a' },
  energie: { libelle: 'Énergie', emoji: '⚡', couleur: '#2f4d8f' },
  telecom: { libelle: 'Télécom et internet', emoji: '📶', couleur: '#4d7ac7' },
  assurance: { libelle: 'Assurances', emoji: '🛡️', couleur: '#6f86b8' },
  transport: { libelle: 'Transport', emoji: '🚗', couleur: '#17876b' },
  alimentation: { libelle: 'Alimentation', emoji: '🛒', couleur: '#3aa88a' },
  sante: { libelle: 'Santé', emoji: '💊', couleur: '#7fc0ac' },
  loisirs: { libelle: 'Loisirs et sport', emoji: '🎬', couleur: '#8b5fbf' },
  banque: { libelle: 'Banque et frais', emoji: '🏦', couleur: '#b8820c' },
  credit: { libelle: 'Crédits', emoji: '🏦', couleur: '#c74436' },
  impots: { libelle: 'Impôts', emoji: '🧾', couleur: '#8d6e2f' },
  enfants: { libelle: 'Enfants', emoji: '🧸', couleur: '#d98cb3' },
  epargne: { libelle: 'Épargne et placements', emoji: '🌱', couleur: '#17876b' },
  autre: { libelle: 'Autre', emoji: '📦', couleur: '#8d97ad' }
};

export const TYPES_REVENU = {
  salaire: 'Salaire',
  prime: 'Prime',
  aide: 'Aide ou allocation',
  freelance: 'Activité indépendante',
  loyer: 'Loyer perçu',
  autre: 'Autre entrée'
};

/* ==================== Classement automatique ==================== */
/* Chaque règle donne une catégorie et une nature par défaut.
   L'utilisateur peut toujours corriger dans le formulaire. */

const REGLES = [
  { mots: ['pret', 'prêt', 'credit', 'crédit', 'ech pret', 'echeance', 'financement', 'loa', 'lld', 'cofidis', 'cetelem', 'sofinco', 'younited'], categorie: 'credit', nature: 'credit' },
  { mots: ['loyer', 'citya', 'foncia', 'syndic', 'copropriete', 'charges locatives', 'taxe habitation'], categorie: 'logement', nature: 'fixe' },
  { mots: ['vattenfall', 'edf', 'engie', 'total energies', 'ekwateur', 'electricite', 'électricité', 'gaz', 'eau', 'veolia', 'saur', 'suez'], categorie: 'energie', nature: 'fixe' },
  { mots: ['bouygues', 'orange', 'sfr', 'free', 'sosh', 'red by', 'internet', 'fibre', 'mobile', 'box', 'forfait'], categorie: 'telecom', nature: 'abonnement' },
  { mots: ['assurance', 'mutuelle', 'prevoyance', 'prévoyance', 'maif', 'macif', 'axa', 'matmut', 'gmf', 'accident', 'habitation', 'automobile', 'auto', 'moto', 'deces', 'décès'], categorie: 'assurance', nature: 'fixe' },
  { mots: ['netflix', 'spotify', 'deezer', 'disney', 'canal', 'prime video', 'apple', 'youtube', 'claude', 'chatgpt', 'openai', 'adobe', 'icloud', 'abonnement', 'revolut', 'basic fit', 'basicfit', 'salle de sport', 'fitness', 'gym'], categorie: 'loisirs', nature: 'abonnement' },
  { mots: ['courses', 'alimentation', 'drive', 'carrefour', 'leclerc', 'lidl', 'intermarche', 'auchan', 'super u', 'aldi', 'boulangerie', 'restaurant', 'cantine'], categorie: 'alimentation', nature: 'variable' },
  { mots: ['sncf', 'essence', 'carburant', 'peage', 'péage', 'parking', 'bus', 'tram', 'navigo', 'train', 'entretien voiture', 'garage'], categorie: 'transport', nature: 'fixe' },
  { mots: ['epargne', 'épargne', 'livret', 'investir', 'invest', 'pea', 'bourse', 'per', 'assurance vie', 'trade republic', 'boursorama invest'], categorie: 'epargne', nature: 'epargne' },
  { mots: ['impot', 'impôt', 'taxe', 'urssaf', 'tresor public', 'trésor public'], categorie: 'impots', nature: 'fixe' },
  { mots: ['cotisation', 'frais bancaire', 'frais de tenue', 'banque', 'carte bancaire', 'agios'], categorie: 'banque', nature: 'fixe' },
  { mots: ['creche', 'crèche', 'nounou', 'ecole', 'école', 'garderie', 'periscolaire', 'pension'], categorie: 'enfants', nature: 'fixe' },
  { mots: ['pharmacie', 'medecin', 'médecin', 'dentiste', 'osteo', 'kine', 'optique', 'sante', 'santé'], categorie: 'sante', nature: 'variable' }
];

const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function deviner(libelle) {
  const t = sansAccent(libelle || '');
  if (!t.trim()) return { categorie: 'autre', nature: 'fixe' };
  for (const regle of REGLES) {
    if (regle.mots.some((mot) => t.includes(sansAccent(mot)))) {
      return { categorie: regle.categorie, nature: regle.nature };
    }
  }
  return { categorie: 'autre', nature: 'fixe' };
}

/* ==================== Validation des saisies ==================== */

export function nettoyerLibelle(v) {
  return String(v || '').trim().slice(0, 60);
}

export function montantValide(v) {
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1000000) return null;
  return Math.round(n * 100) / 100;
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

export const somme = (liste, champ = 'montant') => liste.reduce((t, x) => t + Number(x[champ] || 0), 0);

/* Synthèse complète d'un mois. */
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
  const projection = rythme * nbJours;

  return {
    chargesMois, revenusMois, depensesMois,
    totalRevenus, totalCharges, totalDepenses, totalCredits, totalAbonnements, totalEpargne,
    resteAVivre, resteReel, tauxEndettement,
    jour, nbJours, moisEnCours, rythme, projection,
    budgetJournalier: resteAVivre > 0 ? (resteAVivre - totalDepenses) / Math.max(1, nbJours - jour + 1) : 0
  };
}

/* Cumul des dépenses jour par jour, pour la courbe de comparaison. */
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
    const cat = CATEGORIES[l.categorie] ? l.categorie : 'autre';
    parCat.set(cat, (parCat.get(cat) || 0) + Number(l.montant || 0));
  });
  return [...parCat.entries()]
    .map(([cle, montant]) => ({ cle, montant, ...CATEGORIES[cle] }))
    .sort((a, b) => b.montant - a.montant);
}

/* ==================== Export CSV ==================== */

export function versCSV(colonnes, lignes) {
  const echapper = (v) => {
    const s = String(v ?? '');
    /* Le préfixe protège contre l'injection de formule dans un tableur. */
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
