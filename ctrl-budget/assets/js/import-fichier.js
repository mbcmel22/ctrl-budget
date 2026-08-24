/* Lecture d'un fichier budgétaire existant (PDF, Excel, CSV, Word) et
   transformation en charges, entrées d'argent et dépenses.
   Deux formats sont reconnus :
   - une liste de postes, une ligne par charge, du type « Loyer : 580 € » ;
   - un relevé bancaire, une ligne par opération datée.
   Les bibliothèques de lecture sont chargées à la demande. */

import { deviner, montantValide, nettoyerLibelle, sansAccent } from './helpers.js';

const CDN = 'https://esm.sh';

/* ==================== Extraction du texte ==================== */

export async function extraireTexte(fichier) {
  const nom = (fichier.name || '').toLowerCase();
  if (nom.endsWith('.pdf')) return lirePdf(fichier);
  if (nom.endsWith('.xlsx') || nom.endsWith('.xls')) return lireTableur(fichier);
  if (nom.endsWith('.docx')) return lireWord(fichier);
  if (nom.endsWith('.csv') || nom.endsWith('.txt')) return fichier.text();
  throw new Error('Format non pris en charge. Utilisez un PDF, un Excel, un CSV ou un Word.');
}

async function lirePdf(fichier) {
  const pdfjs = await import(`${CDN}/pdfjs-dist@4.6.82/legacy/build/pdf.mjs`);
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `${CDN}/pdfjs-dist@4.6.82/legacy/build/pdf.worker.mjs`;
  } catch (e) { /* bascule automatique en mode sans worker */ }

  const doc = await pdfjs.getDocument({
    data: await fichier.arrayBuffer(),
    useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false
  }).promise;

  const lignes = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const contenu = await page.getTextContent();
    const parLigne = new Map();

    contenu.items.forEach((item) => {
      if (!item.str || !item.str.trim()) return;
      const cle = Math.round(Math.round(item.transform[5]) / 4);
      if (!parLigne.has(cle)) parLigne.set(cle, []);
      parLigne.get(cle).push({ x: item.transform[4], texte: item.str });
    });

    [...parLigne.entries()].sort((a, b) => b[0] - a[0]).forEach(([, morceaux]) => {
      lignes.push(morceaux.sort((a, b) => a.x - b.x).map((m) => m.texte).join(' ').replace(/\s+/g, ' ').trim());
    });
  }

  await doc.destroy();
  return lignes.join('\n');
}

async function lireTableur(fichier) {
  const XLSX = await import(`${CDN}/xlsx@0.18.5`);
  const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
  const lignes = [];
  classeur.SheetNames.forEach((nom) => {
    XLSX.utils.sheet_to_json(classeur.Sheets[nom], { header: 1, raw: false, defval: '' })
      .forEach((rangee) => {
        const cellules = rangee.map((c) => String(c).trim()).filter(Boolean);
        if (cellules.length) lignes.push(cellules.join(' : '));
      });
  });
  return lignes.join('\n');
}

async function lireWord(fichier) {
  const { unzipSync, strFromU8 } = await import(`${CDN}/fflate@0.8.2`);
  const archive = unzipSync(new Uint8Array(await fichier.arrayBuffer()));
  const document = archive['word/document.xml'];
  if (!document) throw new Error('Ce fichier Word semble vide ou protégé.');
  return strFromU8(document)
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, ' : ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ');
}

/* ==================== Outils communs ==================== */

const MOIS_NOMS = {
  janv: 1, jan: 1, janvier: 1, fev: 2, fevr: 2, fevrier: 2, feb: 2, mars: 3, mar: 3,
  avr: 4, avril: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, juillet: 7, jul: 7,
  aout: 8, aou: 8, aug: 8, sept: 9, sep: 9, septembre: 9, oct: 10, octobre: 10,
  nov: 11, novembre: 11, dec: 12, decembre: 12
};

function versNombre(brut) {
  const propre = brut.replace(/[\s\u00a0]/g, '');
  let normalise;
  if (/,\d{1,2}$/.test(propre)) normalise = propre.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}$/.test(propre)) normalise = propre.replace(/\./g, '');
  else normalise = propre.replace(',', '.');
  return montantValide(normalise);
}

function montantsDe(texte) {
  const trouves = [];
  const regex = /([+-]?\s?)(\d{1,3}(?:[ \u00a0.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(€|eur\b|euros?|\$|£)?/gi;
  let m;
  while ((m = regex.exec(texte)) !== null) {
    const valeur = versNombre(m[2]);
    if (valeur === null || valeur === 0) continue;
    const symbole = Boolean(m[3]);
    if (!symbole && Number.isInteger(valeur) && valeur >= 1990 && valeur <= 2100) continue;
    if (valeur > 100000) continue;
    trouves.push({ valeur, symbole, signe: (m[1] || '').trim(), index: m.index, decimales: /[.,]\d{1,2}$/.test(m[2]) });
  }
  return trouves;
}

function dateFinDe(texte) {
  const m = sansAccent(texte).match(/fin\s+(?:le\s+)?([a-z]{3,10})\.?\s*(\d{2,4})/);
  if (m && MOIS_NOMS[m[1]]) {
    let annee = Number(m[2]);
    if (annee < 100) annee += 2000;
    return `${annee}-${String(MOIS_NOMS[m[1]]).padStart(2, '0')}-28`;
  }
  const m2 = texte.match(/fin\s+(?:le\s+)?(\d{1,2})[/-](\d{4})/);
  if (m2) return `${m2[2]}-${String(Number(m2[1])).padStart(2, '0')}-28`;
  return null;
}

function jourDe(texte) {
  const m = sansAccent(texte).match(/\ble\s+(\d{1,2})\b/);
  if (!m) return null;
  const j = Number(m[1]);
  return j >= 1 && j <= 31 ? j : null;
}

const MOTS_REVENU = /salaire|revenu|budget|prime|paie|paye|allocation|\bcaf\b|aide|pension|remuneration|honoraires|salary|income|ingreso|nomina/;
const MOTS_IGNORES = /^(total|reste|solde|sous.?total|somme|difference|balance|montant|libelle|categorie|date|mois|ancien solde|nouveau solde)\b/;

/* ==================== Détection du type de document ==================== */

const RE_DATE = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s+/;

function estReleve(lignes) {
  const datees = lignes.filter((l) => RE_DATE.test(l.trim()) && montantsDe(l).length);
  return datees.length >= 5 && datees.length >= lignes.length * 0.25;
}

function dateISO(m, anneeDefaut) {
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  let annee = m[3] ? Number(m[3]) : anneeDefaut;
  if (annee < 100) annee += 2000;
  if (!(jour >= 1 && jour <= 31) || !(mois >= 1 && mois <= 12)) return null;
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

/* Nettoie un libellé d'opération bancaire : références, numéros de carte,
   dates internes et mentions techniques. */
function libelleOperation(brut) {
  return nettoyerLibelle(
    brut
      .replace(/\b(cb|carte|paiement|prlv|prelevement|prélèvement|vir|virement|sepa|inst|achat|facture|ref|retrait|dab|recu|reçu|de|du)\b\.?/gi, ' ')
      .replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, ' ')
      .replace(/\b\d{4,}\b/g, ' ')
      .replace(/[*#]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  ) || nettoyerLibelle(brut);
}

const CLE_REGROUPEMENT = (libelle) => sansAccent(libelle).replace(/[^a-z]/g, '').slice(0, 14);

/* ==================== Analyse d'un relevé bancaire ==================== */

function analyserReleve(lignes) {
  const anneeDefaut = new Date().getFullYear();
  const operations = [];

  lignes.forEach((brute) => {
    const propre = brute.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const m = propre.match(RE_DATE);
    if (!m) return;

    const date = dateISO(m, anneeDefaut);
    if (!date) return;

    const reste = propre.slice(m[0].length);
    const montants = montantsDe(reste);
    if (!montants.length) return;

    /* Le dernier nombre d'une ligne de relevé est souvent le solde
       courant : on privilégie un montant avec décimales qui n'est pas
       en fin de ligne quand il y en a plusieurs. */
    const candidat = montants.length > 1
      ? montants.slice(0, -1).reverse().find((x) => x.decimales) || montants[0]
      : montants[0];

    const texte = reste.slice(0, candidat.index);
    const libelle = libelleOperation(texte);
    if (!libelle || libelle.length < 2) return;

    const bas = sansAccent(libelle + ' ' + texte);
    const credit = candidat.signe === '+'
      || /vir(ement)? recu|virement de|salaire|remboursement|remb\b|depot|versement recu/.test(bas)
      || MOTS_REVENU.test(bas);

    operations.push({ date, libelle, montant: candidat.valeur, credit });
  });

  if (!operations.length) return { type: 'releve', charges: [], revenus: [], depenses: [] };

  /* Regroupement par libellé pour repérer ce qui revient chaque mois. */
  const groupes = new Map();
  operations.forEach((op) => {
    const cle = (op.credit ? 'c-' : 'd-') + CLE_REGROUPEMENT(op.libelle);
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(op);
  });

  const charges = [];
  const revenus = [];
  const depenses = [];

  groupes.forEach((liste) => {
    const mois = new Set(liste.map((o) => o.date.slice(0, 7)));
    const recurrent = mois.size >= 2;
    const modele = liste[liste.length - 1];
    const moyenne = Math.round((liste.reduce((t, o) => t + o.montant, 0) / liste.length) * 100) / 100;

    if (modele.credit) {
      if (recurrent) {
        revenus.push({ libelle: modele.libelle, montant: moyenne, type: 'salaire', recurrent: true });
      } else {
        liste.forEach((o) => revenus.push({
          libelle: o.libelle, montant: o.montant, type: 'autre', recurrent: false, mois: o.date.slice(0, 7) + '-01'
        }));
      }
      return;
    }

    if (recurrent) {
      const propose = deviner(modele.libelle);
      charges.push({
        libelle: modele.libelle,
        montant: moyenne,
        nature: propose.nature === 'variable' ? 'fixe' : propose.nature,
        categorie: propose.categorie,
        jour_prelevement: Number(modele.date.slice(8, 10)) || null,
        date_fin: null,
        date_debut: null
      });
      return;
    }

    liste.forEach((o) => {
      const propose = deviner(o.libelle);
      depenses.push({ libelle: o.libelle, montant: o.montant, categorie: propose.categorie, date: o.date });
    });
  });

  return { type: 'releve', charges, revenus, depenses };
}

/* ==================== Analyse d'une liste de postes ==================== */

function decouper(ligne) {
  const propre = ligne.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (propre.length < 3 || propre.length > 140) return null;

  const separe = propre.match(/^(.{2,60}?)\s*[:;=|]\s*(.+)$/);
  if (separe) return { libelle: separe[1], reste: separe[2], ligne: propre };

  const espace = propre.match(/^([^\d]{2,60}?)\s+([+-]?\d.*)$/);
  if (espace) return { libelle: espace[1], reste: espace[2], ligne: propre };

  return null;
}

function analyserListe(lignes) {
  const charges = [];
  const revenus = [];
  const vus = new Set();

  lignes.forEach((brute) => {
    const decoupe = decouper(brute);
    if (!decoupe) return;

    const libelle = nettoyerLibelle(decoupe.libelle.replace(/^[-•*\d.)\s]+/, ''));
    if (!libelle || libelle.length < 2) return;

    const cle = sansAccent(libelle);
    if (MOTS_IGNORES.test(cle) && !MOTS_REVENU.test(cle)) return;

    const montants = montantsDe(decoupe.reste);
    if (!montants.length) return;

    if (MOTS_REVENU.test(cle)) {
      montants.slice(0, 4).forEach((m, i) => {
        const nom = i === 0 ? libelle : `${libelle} (${i + 1})`;
        const empreinte = 'r' + sansAccent(nom) + m.valeur;
        if (vus.has(empreinte)) return;
        vus.add(empreinte);
        revenus.push({
          libelle: nom,
          montant: m.valeur,
          type: /prime/.test(cle) ? 'prime' : /aide|caf|allocation/.test(cle) ? 'aide' : 'salaire',
          recurrent: true
        });
      });
      return;
    }

    const montant = montants[0].valeur;
    const empreinte = 'c' + cle + montant;
    if (vus.has(empreinte)) return;
    vus.add(empreinte);

    const propose = deviner(libelle);
    charges.push({
      libelle,
      montant,
      nature: propose.nature,
      categorie: propose.categorie,
      jour_prelevement: jourDe(decoupe.reste),
      date_fin: dateFinDe(decoupe.ligne),
      date_debut: null
    });
  });

  return { type: 'liste', charges, revenus, depenses: [] };
}

/* ==================== Point d'entrée ==================== */

export function analyser(texte) {
  const lignes = (texte || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return { type: 'liste', charges: [], revenus: [], depenses: [] };
  return estReleve(lignes) ? analyserReleve(lignes) : analyserListe(lignes);
}
