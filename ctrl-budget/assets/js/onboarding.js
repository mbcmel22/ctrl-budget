import { sb, sessionRequise, messageErreur } from './supabase.js';
import { toast, ech } from './ui.js';
import { t, LANGUES, langueCourante, setLangue } from './i18n.js';
import {
  CATEGORIES_CLES, NATURES_CLES, TYPES_REVENU_CLES, categorie, libelleNature, libelleTypeRevenu,
  classeNature, deviner, euro, montantValide, nettoyerLibelle, moisCourant, libelleMois, dateFr
} from './helpers.js';
import { extraireTexte, analyser } from './import-fichier.js';

const zone = document.getElementById('etapeContenu');
const progression = document.getElementById('progression');

let session = null;
let etape = 1;
const TOTAL = 4;

const etat = { prenom: '', revenus: [], charges: [], depenses: [], objectif: 0, importe: null };

const SUGGESTIONS_REVENUS = [
  { cle: 'salaire', type: 'salaire' },
  { cle: 'prime', type: 'prime' },
  { cle: 'aide', type: 'aide' },
  { cle: 'freelance', type: 'freelance' }
];

const SUGGESTIONS_CHARGES = [
  'Loyer', 'Électricité', 'Internet', 'Forfait mobile', 'Assurance habitation',
  'Assurance automobile', 'Crédit auto', 'Prêt personnel', 'Courses',
  'Netflix', 'Spotify', 'Salle de sport', 'Épargne'
];

const optionsNature = (selection) => NATURES_CLES
  .map((k) => `<option value="${k}" ${selection === k ? 'selected' : ''}>${ech(libelleNature(k))}</option>`).join('');

const optionsCategorie = (selection) => CATEGORIES_CLES
  .map((k) => { const c = categorie(k); return `<option value="${k}" ${selection === k ? 'selected' : ''}>${ech(c.emoji + ' ' + c.libelle)}</option>`; }).join('');

const optionsTypeRevenu = (selection) => TYPES_REVENU_CLES
  .map((k) => `<option value="${k}" ${selection === k ? 'selected' : ''}>${ech(libelleTypeRevenu(k))}</option>`).join('');

/* ============================== Rendu ============================== */

function afficher() {
  progression.style.width = `${(etape / TOTAL) * 100}%`;
  zone.innerHTML = { 1: etape1, 2: etape2, 3: etape3, 4: etape4 }[etape]();
  brancher();
  window.scrollTo({ top: 0, behavior: 'auto' });
  const premier = zone.querySelector('input, select');
  if (premier && etape > 1) premier.focus();
}

const entete = (titre, texte) => `
  <p class="onb-etape">${ech(t('onb.step', { a: etape, b: TOTAL }))}</p>
  <h1>${ech(titre)}</h1>
  <p style="color:var(--ardoise);font-size:1.02rem">${ech(texte)}</p>`;

function etape1() {
  return `
  <div class="barre-langue">
    ${Object.values(LANGUES).map((l) => `<button class="puce" data-langue="${l.code}" aria-pressed="${langueCourante() === l.code}">${ech(l.libelle)}</button>`).join('')}
  </div>

  ${entete(t('onb.welcome'), t('onb.welcomeText'))}

  <div class="carte" style="margin-top:20px">
    <div class="champ">
      <label for="prenom">${ech(t('prof.firstName'))}</label>
      <input id="prenom" type="text" maxlength="40" value="${ech(etat.prenom)}">
      <p class="aide">${ech(t('onb.firstNameHelp'))}</p>
    </div>
  </div>

  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>${ech(t('onb.importTitle'))}</h3></div>

    <label class="depot" for="fichierImport" id="zoneDepot">
      <span class="depot-icone">📄</span>
      <strong>${ech(t('onb.importChoose'))}</strong>
      <span class="aide" style="margin:4px 0 0">${ech(t('onb.importDrop'))}</span>
    </label>
    <input type="file" id="fichierImport" hidden
      accept=".pdf,.xlsx,.xls,.csv,.txt,.docx,application/pdf,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
    <div id="etatImport" aria-live="polite"></div>

    <details class="regles">
      <summary>${ech(t('onb.importRules'))}</summary>
      <ul>
        <li>${ech(t('onb.importRule1'))}</li>
        <li>${ech(t('onb.importRule2'))}</li>
        <li>${ech(t('onb.importRule3'))}</li>
        <li>${ech(t('onb.importRule4'))}</li>
        <li>${ech(t('onb.importRule5'))}</li>
        <li>${ech(t('onb.importScanned'))}</li>
      </ul>
    </details>

    <p class="aide" style="margin-top:14px">${ech(t('onb.noFile'))}</p>
  </div>

  <div class="alerte alerte-info" style="margin-top:18px">${ech(t('onb.noBank'))}</div>

  <div class="onb-actions">
    <button class="btn btn-principal" data-suivant>${ech(t('onb.start'))}</button>
  </div>`;
}

function etape2() {
  const total = etat.revenus.reduce((acc, r) => acc + r.montant, 0);
  return `
  ${entete(t('onb.incomeTitle'), t('onb.incomeText'))}
  ${bandeauImport('revenus')}

  <div class="suggestions">
    ${SUGGESTIONS_REVENUS.map((s) => `<button class="suggestion" data-sugg-revenu="${ech(libelleTypeRevenu(s.cle))}" data-type="${s.type}">+ ${ech(libelleTypeRevenu(s.cle))}</button>`).join('')}
  </div>

  <div class="carte">
    <div class="ligne-champs">
      <div class="champ"><label for="rLibelle">${ech(t('common.label'))}</label><input id="rLibelle" maxlength="60"></div>
      <div class="champ"><label for="rMontant">${ech(t('common.amount'))}</label><input id="rMontant" type="number" inputmode="decimal" step="0.01" min="0"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="rType">${ech(t('common.nature'))}</label><select id="rType">${optionsTypeRevenu()}</select></div>
      <div class="champ"><label for="rRecurrent">${ech(t('prof.frequency'))}</label>
        <select id="rRecurrent"><option value="1">${ech(t('prof.recurring'))}</option><option value="0">${ech(t('prof.oneOff'))}</option></select>
      </div>
    </div>
    <button class="btn btn-secondaire btn-bloc" data-ajout-revenu>${ech(t('onb.incomeAdd'))}</button>
  </div>

  ${etat.revenus.length ? `
  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>${ech(t('onb.yourIncome'))}</h3><span class="montant" style="font-weight:700">${ech(euro(total))}</span></div>
    <ul class="liste">
      ${etat.revenus.map((r, i) => `
        <li class="ligne-item">
          <span class="ligne-nom">${ech(r.libelle)}<span class="ligne-meta">${ech(libelleTypeRevenu(r.type))} · ${ech(r.recurrent ? t('prof.recurring') : t('prof.oneOff'))}</span></span>
          <span class="ligne-montant">${ech(euro(r.montant))}</span>
          <span class="actions-ligne">
            <button class="icone-btn" data-edit-revenu="${i}" aria-label="${ech(t('common.edit'))}">✎</button>
            <button class="icone-btn" data-suppr-revenu="${i}" aria-label="${ech(t('common.delete'))}">✕</button>
          </span>
        </li>`).join('')}
    </ul>
  </div>`
  : `<div class="carte vide" style="margin-top:16px"><strong>${ech(t('onb.incomeEmpty'))}</strong>${ech(t('onb.incomeEmptyHelp'))}</div>`}

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>${ech(t('common.back'))}</button>
    <button class="btn btn-principal" data-suivant>${ech(t('common.continue'))}</button>
  </div>`;
}

function etape3() {
  const total = etat.charges.reduce((acc, c) => acc + c.montant, 0);
  return `
  ${entete(t('onb.chargesTitle'), t('onb.chargesText'))}
  ${bandeauImport('charges')}

  <div class="suggestions">
    ${SUGGESTIONS_CHARGES.map((s) => `<button class="suggestion" data-sugg-charge="${ech(s)}">+ ${ech(s)}</button>`).join('')}
  </div>

  <div class="carte">
    <div class="ligne-champs">
      <div class="champ"><label for="cLibelle">${ech(t('common.label'))}</label><input id="cLibelle" maxlength="60"></div>
      <div class="champ"><label for="cMontant">${ech(t('common.amount'))}</label><input id="cMontant" type="number" inputmode="decimal" step="0.01" min="0"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="cNature">${ech(t('common.nature'))}</label><select id="cNature">${optionsNature()}</select></div>
      <div class="champ"><label for="cCategorie">${ech(t('common.category'))}</label><select id="cCategorie">${optionsCategorie()}</select></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="cDebut">${ech(t('charges.start'))}</label><input id="cDebut" type="month"><p class="aide">${ech(t('charges.startHelp'))}</p></div>
      <div class="champ"><label for="cFin">${ech(t('charges.end'))}</label><input id="cFin" type="month"><p class="aide">${ech(t('charges.endHelp'))}</p></div>
    </div>
    <div class="champ"><label for="cJour">${ech(t('charges.debitDay'))}</label><input id="cJour" type="number" min="1" max="31"></div>
    <button class="btn btn-secondaire btn-bloc" data-ajout-charge>${ech(t('onb.chargesAdd'))}</button>
  </div>

  ${etat.charges.length ? `
  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>${ech(t('onb.yourCharges'))}</h3><span class="montant" style="font-weight:700">${ech(euro(total))}</span></div>
    <ul class="liste">
      ${etat.charges.map((c, i) => `
        <li class="ligne-item">
          <span class="ligne-nom">${ech(c.libelle)}
            <span class="tag ${classeNature(c.nature)}">${ech(libelleNature(c.nature))}</span>
            <span class="ligne-meta">${ech(categorie(c.categorie).libelle)}${c.date_debut ? ' · ' + ech(t('charges.from', { d: c.date_debut.slice(0, 7) })) : ''}${c.date_fin ? ' · ' + ech(t('charges.endedOn', { d: c.date_fin.slice(0, 7) })) : ''}</span>
          </span>
          <span class="ligne-montant">${ech(euro(c.montant))}</span>
          <span class="actions-ligne">
            <button class="icone-btn" data-edit-charge="${i}" aria-label="${ech(t('common.edit'))}">✎</button>
            <button class="icone-btn" data-suppr-charge="${i}" aria-label="${ech(t('common.delete'))}">✕</button>
          </span>
        </li>`).join('')}
    </ul>
  </div>`
  : `<div class="carte vide" style="margin-top:16px"><strong>${ech(t('onb.chargesEmpty'))}</strong>${ech(t('onb.chargesEmptyHelp'))}</div>`}

  ${etat.depenses.length ? `<div class="alerte alerte-info" style="margin-top:16px">${ech(t('onb.expensesImported', { n: etat.depenses.length }))}</div>` : ''}

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>${ech(t('common.back'))}</button>
    <button class="btn btn-principal" data-suivant>${ech(t('common.continue'))}</button>
  </div>`;
}

function etape4() {
  const revenus = etat.revenus.reduce((acc, r) => acc + r.montant, 0);
  const charges = etat.charges.reduce((acc, c) => acc + c.montant, 0);
  const credits = etat.charges.filter((c) => c.nature === 'credit').reduce((acc, c) => acc + c.montant, 0);
  const reste = revenus - charges;
  const taux = revenus > 0 ? (credits / revenus) * 100 : 0;

  return `
  ${entete(t('onb.recapTitle'), t('onb.recapText'))}

  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="kpi"><p class="label">${ech(t('onb.recapIncome'))}</p><div class="kpi-valeur">${ech(euro(revenus))}</div></div>
    <div class="kpi"><p class="label">${ech(t('dash.fixed'))}</p><div class="kpi-valeur">${ech(euro(charges))}</div></div>
  </div>

  <div class="kpi ${reste >= 0 ? 'kpi-vert' : 'kpi-rouge'}" style="margin-bottom:16px">
    <p class="label">${ech(t('dash.disposable'))}</p>
    <div class="kpi-valeur">${ech(euro(reste))}</div>
    <p class="kpi-detail">${ech(t('onb.recapDaily', { m: euro(reste / 30) }))}</p>
  </div>

  ${taux > 35 ? `<div class="alerte alerte-attention">${ech(t('onb.recapDebt', { p: Math.round(taux) + ' %' }))}</div>` : ''}
  ${reste < 0 ? `<div class="alerte alerte-danger">${ech(t('onb.recapNegative'))}</div>` : ''}

  <div class="carte">
    <div class="champ">
      <label for="objectif">${ech(t('prof.savingsGoal'))}</label>
      <input id="objectif" type="number" inputmode="decimal" step="0.01" min="0" value="${etat.objectif || ''}">
      <p class="aide">${ech(t('onb.savingsGoalHelp'))}</p>
    </div>
  </div>

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>${ech(t('common.back'))}</button>
    <button class="btn btn-principal" data-terminer>${ech(t('onb.finish'))}</button>
  </div>`;
}

function bandeauImport(quoi) {
  if (!etat.importe) return '';
  const n = quoi === 'charges' ? etat.importe.charges : etat.importe.revenus;
  if (!n) return '';
  const releve = etat.importe.type === 'releve' && quoi === 'charges'
    ? `<div class="alerte alerte-info" style="margin-bottom:16px">${ech(t('onb.statementDetected'))}</div>` : '';
  return `${releve}<div class="alerte alerte-ok" style="margin-bottom:16px">${ech(t('onb.importBanner', { n }))}</div>`;
}

/* ============================== Interactions ============================== */

function brancher() {
  const q = (sel) => zone.querySelector(sel);

  zone.querySelectorAll('[data-langue]').forEach((b) => {
    b.onclick = () => {
      etat.prenom = nettoyerLibelle(q('#prenom')?.value) || etat.prenom;
      setLangue(b.dataset.langue);
      afficher();
    };
  });

  const suivant = q('[data-suivant]');
  if (suivant) suivant.onclick = () => {
    if (etape === 1) etat.prenom = nettoyerLibelle(q('#prenom').value);
    if (etape === 2 && !etat.revenus.length) return toast(t('onb.incomeNeeded'), 'ko');
    etape++;
    afficher();
  };

  const precedent = q('[data-precedent]');
  if (precedent) precedent.onclick = () => { etape--; afficher(); };

  /* Revenus */
  const ajoutRevenu = q('[data-ajout-revenu]');
  if (ajoutRevenu) ajoutRevenu.onclick = () => {
    const libelle = nettoyerLibelle(q('#rLibelle').value);
    const montant = montantValide(q('#rMontant').value);
    if (!libelle) return toast(t('common.labelRequired'), 'ko');
    if (montant === null || montant === 0) return toast(t('common.invalidAmount'), 'ko');
    etat.revenus.push({ libelle, montant, type: q('#rType').value, recurrent: q('#rRecurrent').value === '1' });
    afficher();
  };

  zone.querySelectorAll('[data-sugg-revenu]').forEach((b) => {
    b.onclick = () => {
      q('#rLibelle').value = b.dataset.suggRevenu;
      q('#rType').value = b.dataset.type;
      q('#rMontant').focus();
    };
  });

  zone.querySelectorAll('[data-suppr-revenu]').forEach((b) => {
    b.onclick = () => { etat.revenus.splice(Number(b.dataset.supprRevenu), 1); afficher(); };
  });

  zone.querySelectorAll('[data-edit-revenu]').forEach((b) => {
    b.onclick = () => {
      const [ligne] = etat.revenus.splice(Number(b.dataset.editRevenu), 1);
      afficher();
      const champ = zone.querySelector('#rLibelle');
      champ.value = ligne.libelle;
      zone.querySelector('#rMontant').value = ligne.montant;
      zone.querySelector('#rType').value = ligne.type;
      zone.querySelector('#rRecurrent').value = ligne.recurrent ? '1' : '0';
      champ.focus();
      champ.scrollIntoView({ block: 'center' });
    };
  });

  /* Charges */
  const libelleCharge = q('#cLibelle');
  if (libelleCharge) {
    let natureModifiee = false;
    q('#cNature').addEventListener('change', () => { natureModifiee = true; });
    libelleCharge.addEventListener('input', () => {
      const propose = deviner(libelleCharge.value);
      if (!natureModifiee) q('#cNature').value = propose.nature;
      q('#cCategorie').value = propose.categorie;
    });
  }

  const ajoutCharge = q('[data-ajout-charge]');
  if (ajoutCharge) ajoutCharge.onclick = () => {
    const libelle = nettoyerLibelle(q('#cLibelle').value);
    const montant = montantValide(q('#cMontant').value);
    if (!libelle) return toast(t('common.labelRequired'), 'ko');
    if (montant === null || montant === 0) return toast(t('common.invalidAmount'), 'ko');
    const jour = Number(q('#cJour').value);
    const debut = q('#cDebut').value;
    const fin = q('#cFin').value;
    etat.charges.push({
      libelle, montant,
      nature: q('#cNature').value,
      categorie: q('#cCategorie').value,
      jour_prelevement: jour >= 1 && jour <= 31 ? jour : null,
      date_debut: debut ? `${debut}-01` : null,
      date_fin: fin ? `${fin}-28` : null
    });
    afficher();
  };

  zone.querySelectorAll('[data-sugg-charge]').forEach((b) => {
    b.onclick = () => {
      const libelle = b.dataset.suggCharge;
      q('#cLibelle').value = libelle;
      const propose = deviner(libelle);
      q('#cNature').value = propose.nature;
      q('#cCategorie').value = propose.categorie;
      q('#cMontant').focus();
    };
  });

  zone.querySelectorAll('[data-suppr-charge]').forEach((b) => {
    b.onclick = () => { etat.charges.splice(Number(b.dataset.supprCharge), 1); afficher(); };
  });

  zone.querySelectorAll('[data-edit-charge]').forEach((b) => {
    b.onclick = () => {
      const [ligne] = etat.charges.splice(Number(b.dataset.editCharge), 1);
      afficher();
      const champ = zone.querySelector('#cLibelle');
      champ.value = ligne.libelle;
      zone.querySelector('#cMontant').value = ligne.montant;
      zone.querySelector('#cNature').value = ligne.nature;
      zone.querySelector('#cCategorie').value = ligne.categorie;
      zone.querySelector('#cJour').value = ligne.jour_prelevement || '';
      zone.querySelector('#cDebut').value = (ligne.date_debut || '').slice(0, 7);
      zone.querySelector('#cFin').value = (ligne.date_fin || '').slice(0, 7);
      champ.focus();
      champ.scrollIntoView({ block: 'center' });
    };
  });

  /* Import */
  const champFichier = q('#fichierImport');
  if (champFichier) {
    champFichier.onchange = () => { if (champFichier.files[0]) importer(champFichier.files[0]); };
    const depot = q('#zoneDepot');
    depot.addEventListener('click', (ev) => { ev.preventDefault(); champFichier.click(); });
    ['dragenter', 'dragover'].forEach((e) => depot.addEventListener(e, (ev) => { ev.preventDefault(); depot.classList.add('survol'); }));
    ['dragleave', 'drop'].forEach((e) => depot.addEventListener(e, (ev) => { ev.preventDefault(); depot.classList.remove('survol'); }));
    depot.addEventListener('drop', (ev) => {
      const fichier = ev.dataTransfer?.files?.[0];
      if (fichier) importer(fichier);
    });
  }

  const terminer = q('[data-terminer]');
  if (terminer) terminer.onclick = () => enregistrer(terminer);
}

/* ============================== Import ============================== */

const TAILLE_MAX = 5 * 1024 * 1024;

async function importer(fichier) {
  const retour = zone.querySelector('#etatImport');
  const message = (classe, texte) => { retour.innerHTML = `<div class="alerte ${classe}" style="margin-top:14px">${ech(texte)}</div>`; };

  if (fichier.size > TAILLE_MAX) return message('alerte-danger', t('onb.importTooBig'));
  message('alerte-info', t('onb.importReading', { f: fichier.name }));

  try {
    etat.prenom = nettoyerLibelle(zone.querySelector('#prenom').value) || etat.prenom;

    const resultat = analyser(await extraireTexte(fichier));
    const total = resultat.charges.length + resultat.revenus.length + resultat.depenses.length;
    if (!total) return message('alerte-attention', t('onb.importNothing'));

    etat.charges = [...etat.charges, ...resultat.charges];
    etat.revenus = [...etat.revenus, ...resultat.revenus];
    etat.depenses = [...etat.depenses, ...resultat.depenses];
    etat.importe = { charges: resultat.charges.length, revenus: resultat.revenus.length, type: resultat.type };

    toast(t('onb.importDone', { n: total }));
    etape = 2;
    afficher();
  } catch (erreur) {
    console.error(erreur);
    message('alerte-danger', erreur.message && erreur.message.length < 120 ? erreur.message : t('onb.importFailed'));
  }
}

/* ============================== Enregistrement ============================== */

async function enregistrer(bouton) {
  const objectif = montantValide(zone.querySelector('#objectif').value) || 0;
  bouton.disabled = true;
  bouton.textContent = t('onb.saving');

  try {
    const uid = session.user.id;

    const { error: e1 } = await sb.from('profiles').upsert({
      id: uid,
      prenom: etat.prenom || null,
      objectif_epargne: objectif,
      langue: langueCourante(),
      onboarding_done: true
    });
    if (e1) throw e1;

    if (etat.revenus.length) {
      const { error } = await sb.from('revenus').insert(etat.revenus.map((r) => ({
        user_id: uid, libelle: r.libelle, montant: r.montant,
        type: r.type, recurrent: r.recurrent, mois: r.recurrent ? null : (r.mois || null), actif: true
      })));
      if (error) throw error;
    }

    if (etat.charges.length) {
      const { error } = await sb.from('charges').insert(etat.charges.map((c) => ({
        user_id: uid, libelle: c.libelle, montant: c.montant,
        nature: c.nature, categorie: c.categorie,
        jour_prelevement: c.jour_prelevement, date_debut: c.date_debut || null,
        date_fin: c.date_fin, actif: true
      })));
      if (error) throw error;
    }

    if (etat.depenses.length) {
      const { error } = await sb.from('depenses').insert(etat.depenses.map((d) => ({
        user_id: uid, libelle: d.libelle, montant: d.montant,
        categorie: d.categorie, date: d.date
      })));
      if (error) throw error;
    }

    location.replace('/app.html');
  } catch (erreur) {
    console.error(erreur);
    toast(messageErreur(erreur), 'ko');
    bouton.disabled = false;
    bouton.textContent = t('onb.finish');
  }
}

/* ============================== Démarrage ============================== */

(async () => {
  session = await sessionRequise();
  if (!session) return;
  etat.prenom = session.user.user_metadata?.prenom || '';

  const { data } = await sb.from('profiles').select('onboarding_done, prenom, langue').eq('id', session.user.id).maybeSingle();
  if (data?.onboarding_done) return location.replace('/app.html');
  if (data?.prenom) etat.prenom = data.prenom;
  if (data?.langue) setLangue(data.langue);

  afficher();
})();
