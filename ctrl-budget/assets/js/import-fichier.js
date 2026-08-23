/* Lecture d'un fichier budgétaire existant (PDF, Excel, CSV, Word)
   et transformation en charges et entrées d'argent exploitables.
   Les bibliothèques de lecture sont chargées à la demande, uniquement
   quand l'utilisateur dépose un fichier. */

import { deviner, montantValide, nettoyerLibelle } from './helpers.js';

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
  } catch (e) { /* le lecteur bascule seul en mode sans worker */ }

  const doc = await pdfjs.getDocument({
    data: await fichier.arrayBuffer(),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false
  }).promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const contenu = await page.getTextContent();

    /* Les morceaux de texte sont regroupés par ligne grâce à leur
       position verticale, sinon tout arrive en un seul bloc. */
    const parLigne = new Map();
    contenu.items.forEach((item) => {
      if (!item.str || !item.str.trim()) return;
      const y = Math.round(item.transform[5]);
      const cle = Math.round(y / 4);
      if (!parLigne.has(cle)) parLigne.set(cle, []);
      parLigne.get(cle).push({ x: item.transform[4], texte: item.str });
    });

    [...parLigne.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, morceaux]) => {
        pages.push(morceaux.sort((a, b) => a.x - b.x).map((m) => m.texte).join(' ').replace(/\s+/g, ' ').trim());
      });
  }

  await doc.destroy();
  return pages.join('\n');
}

async function lireTableur(fichier) {
  const XLSX = await import(`${CDN}/xlsx@0.18.5`);
  const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
  const lignes = [];

  classeur.SheetNames.forEach((nom) => {
    const rangees = XLSX.utils.sheet_to_json(classeur.Sheets[nom], { header: 1, raw: false, defval: '' });
    rangees.forEach((rangee) => {
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

/* ==================== Analyse du texte ==================== */

const MOIS = {
  janv: 1, jan: 1, janvier: 1, fev: 2, fevr: 2, fevrier: 2, mars: 3, mar: 3,
  avr: 4, avril: 4, mai: 5, juin: 6, juil: 7, juillet: 7, aout: 8, aou: 8,
  sept: 9, sep: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11,
  dec: 12, decembre: 12
};

const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MOTS_REVENU = /salaire|revenu|budget|prime|paie|paye|allocation|\bcaf\b|aide|pension|virement recu|entree|remuneration|honoraires/;
const MOTS_IGNORES = /^(total|reste|solde|sous.?total|somme|difference|balance|montant|libelle|categorie|date|mois)\b/;

/* Convertit « 1 928,61 » ou « 1.928.61 » ou « 80 » en nombre. */
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
  const regex = /(\d{1,3}(?:[ \u00a0.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(€|eur\b|euros?)?/gi;
  let m;
  while ((m = regex.exec(texte)) !== null) {
    const valeur = versNombre(m[1]);
    if (valeur === null || valeur === 0) continue;
    const avecSymbole = Boolean(m[2]);
    /* Une année isolée sans symbole monétaire n'est pas un montant. */
    const estAnnee = !avecSymbole && Number.isInteger(valeur) && valeur >= 1990 && valeur <= 2100;
    if (estAnnee) continue;
    if (valeur > 100000) continue;
    trouves.push({ valeur, avecSymbole, index: m.index });
  }
  return trouves;
}

function dateFinDe(texte) {
  const m = sansAccent(texte).match(/fin\s+(?:le\s+)?([a-z]{3,10})\.?\s*(\d{2,4})/);
  if (m && MOIS[m[1]]) {
    let annee = Number(m[2]);
    if (annee < 100) annee += 2000;
    return `${annee}-${String(MOIS[m[1]]).padStart(2, '0')}-28`;
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

function decouper(ligne) {
  const propre = ligne.replace(/[\u00a0]/g, ' ').replace(/\s+/g, ' ').trim();
  if (propre.length < 3 || propre.length > 140) return null;

  const separe = propre.match(/^(.{2,60}?)\s*[:;=|]\s*(.+)$/);
  if (separe) return { libelle: separe[1], reste: separe[2], ligne: propre };

  const espace = propre.match(/^([^\d]{2,60}?)\s+(\d.*)$/);
  if (espace) return { libelle: espace[1], reste: espace[2], ligne: propre };

  return null;
}

export function analyser(texte) {
  const charges = [];
  const revenus = [];
  const vus = new Set();

  (texte || '').split(/\r?\n/).forEach((brute) => {
    const decoupe = decouper(brute);
    if (!decoupe) return;

    const libelle = nettoyerLibelle(decoupe.libelle.replace(/^[-•*\d.)\s]+/, ''));
    if (!libelle || libelle.length < 2) return;

    const cle = sansAccent(libelle);
    if (MOTS_IGNORES.test(cle) && !MOTS_REVENU.test(cle)) return;

    const montants = montantsDe(decoupe.reste);
    if (!montants.length) return;

    if (MOTS_REVENU.test(cle)) {
      /* Une ligne du type « Budget : 1 928,61 € + 333,93 € » contient
         plusieurs entrées d'argent, elles sont séparées. */
      montants.slice(0, 4).forEach((m, i) => {
        const nom = i === 0 ? libelle : `${libelle} (complément ${i})`;
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
      date_fin: dateFinDe(decoupe.ligne)
    });
  });

  return { charges, revenus };
}
