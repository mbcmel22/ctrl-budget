import { sb, sessionRequise, messageErreur } from './supabase.js';
import { toast, ech } from './ui.js';
import { CATEGORIES, NATURES, TYPES_REVENU, deviner, euro, montantValide, nettoyerLibelle } from './helpers.js';
import { extraireTexte, analyser } from './import-fichier.js';

const zone = document.getElementById('etapeContenu');
const progression = document.getElementById('progression');

let session = null;
let etape = 1;
const TOTAL = 4;

const etat = { prenom: '', revenus: [], charges: [], objectif: 0, importe: null };

const SUGGESTIONS_REVENUS = [
  { libelle: 'Salaire', type: 'salaire' },
  { libelle: 'Prime', type: 'prime' },
  { libelle: 'Aide au logement', type: 'aide' },
  { libelle: 'Freelance', type: 'freelance' }
];

const SUGGESTIONS_CHARGES = [
  'Loyer', 'Électricité', 'Internet', 'Forfait mobile', 'Assurance habitation',
  'Assurance automobile', 'Crédit auto', 'Prêt personnel', 'Courses',
  'Netflix', 'Spotify', 'Salle de sport', 'Épargne'
];

/* ============================== Rendu ============================== */

function afficher() {
  progression.style.width = `${(etape / TOTAL) * 100}%`;
  const rendus = { 1: etape1, 2: etape2, 3: etape3, 4: etape4 };
  zone.innerHTML = rendus[etape]();
  brancher();
  window.scrollTo({ top: 0, behavior: 'auto' });
  const premier = zone.querySelector('input, select');
  if (premier && etape > 1) premier.focus();
}

function entete(titre, texte) {
  return `<p class="onb-etape">Étape ${etape} sur ${TOTAL}</p>
    <h1>${ech(titre)}</h1>
    <p style="color:var(--ardoise);font-size:1.02rem">${texte}</p>`;
}

function etape1() {
  return `
  ${entete('Bienvenue', "Trois minutes pour poser votre budget, et vous n'y reviendrez qu'en cas de changement.")}
  <div class="carte" style="margin-top:20px">
    <div class="champ">
      <label for="prenom">Votre prénom</label>
      <input id="prenom" type="text" maxlength="40" value="${ech(etat.prenom)}" placeholder="Comment doit-on vous appeler ?">
      <p class="aide">Utilisé uniquement pour l'accueil de votre tableau de bord.</p>
    </div>
  </div>
  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>Vous tenez déjà un fichier ?</h3></div>
    <p class="aide" style="margin-bottom:14px">Déposez votre relevé de charges au format PDF, Excel, CSV ou Word. Les libellés et les montants sont lus, classés, puis proposés à la vérification. Rien n'est enregistré tant que vous n'avez pas validé.</p>

    <label class="depot" for="fichierImport" id="zoneDepot">
      <span class="depot-icone">📄</span>
      <strong>Choisir un fichier</strong>
      <span class="aide" style="margin:4px 0 0">ou glissez-le ici. PDF, Excel, CSV, Word, 5 Mo maximum.</span>
    </label>
    <input type="file" id="fichierImport" hidden
      accept=".pdf,.xlsx,.xls,.csv,.txt,.docx,application/pdf,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
    <div id="etatImport" aria-live="polite"></div>

    <p class="aide" style="margin-top:14px">Pas de fichier sous la main ? Continuez, la saisie se fait en deux écrans.</p>
  </div>

  <div class="alerte alerte-info" style="margin-top:18px">
    Vous n'aurez jamais à connecter votre banque. Vous saisissez vos montants, l'application fait les calculs.
  </div>
  <div class="onb-actions">
    <button class="btn btn-principal" data-suivant>Commencer</button>
  </div>`;
}

function etape2() {
  const total = etat.revenus.reduce((t, r) => t + r.montant, 0);
  return `
  ${entete("Vos entrées d'argent", "Salaire, primes, aides, revenus complémentaires. Ajoutez chaque ligne qui alimente votre compte ce mois-ci.")}
  ${bandeauImport('revenus')}

  <div class="suggestions">
    ${SUGGESTIONS_REVENUS.map((s) => `<button class="suggestion" data-sugg-revenu="${ech(s.libelle)}" data-type="${ech(s.type)}">+ ${ech(s.libelle)}</button>`).join('')}
  </div>

  <div class="carte">
    <div class="ligne-champs">
      <div class="champ"><label for="rLibelle">Libellé</label><input id="rLibelle" maxlength="60" placeholder="Salaire"></div>
      <div class="champ"><label for="rMontant">Montant mensuel</label><input id="rMontant" type="number" inputmode="decimal" step="0.01" min="0" placeholder="1928,61"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ">
        <label for="rType">Nature</label>
        <select id="rType">${Object.entries(TYPES_REVENU).map(([k, v]) => `<option value="${k}">${ech(v)}</option>`).join('')}</select>
      </div>
      <div class="champ">
        <label for="rRecurrent">Fréquence</label>
        <select id="rRecurrent"><option value="1">Tous les mois</option><option value="0">Ce mois seulement</option></select>
      </div>
    </div>
    <button class="btn btn-secondaire btn-bloc" data-ajout-revenu>Ajouter cette entrée</button>
  </div>

  ${listeRevenus(total)}

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>Retour</button>
    <button class="btn btn-principal" data-suivant>Continuer</button>
  </div>`;
}

function bandeauImport(quoi) {
  if (!etat.importe) return '';
  const n = quoi === 'charges' ? etat.importe.charges : etat.importe.revenus;
  if (!n) return '';
  return `<div class="alerte alerte-ok" style="margin-bottom:16px">${n} ligne${n > 1 ? 's importées' : ' importée'} depuis votre fichier. Vérifiez les montants et la nature, le crayon permet de corriger une ligne.</div>`;
}

function listeRevenus(total) {
  if (!etat.revenus.length) {
    return `<div class="carte vide" style="margin-top:16px"><strong>Aucune entrée pour l'instant</strong>Ajoutez au moins votre salaire pour que le reste à vivre ait un sens.</div>`;
  }
  return `
  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>Vos entrées</h3><span class="montant" style="font-weight:700">${ech(euro(total))}</span></div>
    <ul class="liste">
      ${etat.revenus.map((r, i) => `
        <li class="ligne-item">
          <span class="ligne-nom">${ech(r.libelle)}<span class="ligne-meta">${ech(TYPES_REVENU[r.type])} · ${r.recurrent ? 'tous les mois' : 'ce mois'}</span></span>
          <span class="ligne-montant">${ech(euro(r.montant))}</span>
          <span class="actions-ligne">
            <button class="icone-btn" data-edit-revenu="${i}" aria-label="Corriger ${ech(r.libelle)}">✎</button>
            <button class="icone-btn" data-suppr-revenu="${i}" aria-label="Supprimer ${ech(r.libelle)}">✕</button>
          </span>
        </li>`).join('')}
    </ul>
  </div>`;
}

function etape3() {
  const total = etat.charges.reduce((t, c) => t + c.montant, 0);
  return `
  ${entete('Vos charges fixes', "Tout ce qui part automatiquement chaque mois. La nature est proposée d'après le libellé, corrigez-la si besoin.")}
  ${bandeauImport('charges')}

  <div class="suggestions">
    ${SUGGESTIONS_CHARGES.map((s) => `<button class="suggestion" data-sugg-charge="${ech(s)}">+ ${ech(s)}</button>`).join('')}
  </div>

  <div class="carte">
    <div class="ligne-champs">
      <div class="champ"><label for="cLibelle">Libellé</label><input id="cLibelle" maxlength="60" placeholder="Prêt voiture"></div>
      <div class="champ"><label for="cMontant">Montant mensuel</label><input id="cMontant" type="number" inputmode="decimal" step="0.01" min="0" placeholder="81,02"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ">
        <label for="cNature">Nature</label>
        <select id="cNature">${Object.entries(NATURES).map(([k, v]) => `<option value="${k}">${ech(v.libelle)}</option>`).join('')}</select>
      </div>
      <div class="champ">
        <label for="cCategorie">Catégorie</label>
        <select id="cCategorie">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${ech(v.emoji + ' ' + v.libelle)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="cJour">Jour de prélèvement</label><input id="cJour" type="number" min="1" max="31" placeholder="5"></div>
      <div class="champ"><label for="cFin">Fin de l'engagement</label><input id="cFin" type="month"><p class="aide">Facultatif, pour les crédits et abonnements avec date de fin.</p></div>
    </div>
    <button class="btn btn-secondaire btn-bloc" data-ajout-charge>Ajouter cette charge</button>
  </div>

  ${listeCharges(total)}

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>Retour</button>
    <button class="btn btn-principal" data-suivant>Continuer</button>
  </div>`;
}

function listeCharges(total) {
  if (!etat.charges.length) {
    return `<div class="carte vide" style="margin-top:16px"><strong>Aucune charge saisie</strong>Commencez par le loyer, l'énergie et les crédits, ce sont les plus lourds.</div>`;
  }
  return `
  <div class="carte" style="margin-top:16px">
    <div class="carte-titre"><h3>Vos charges</h3><span class="montant" style="font-weight:700">${ech(euro(total))}</span></div>
    <ul class="liste">
      ${etat.charges.map((c, i) => `
        <li class="ligne-item">
          <span class="ligne-nom">${ech(c.libelle)}
            <span class="tag ${NATURES[c.nature].classe}">${ech(NATURES[c.nature].libelle)}</span>
            <span class="ligne-meta">${ech(CATEGORIES[c.categorie].libelle)}${c.date_fin ? ' · fin ' + ech(c.date_fin.slice(0, 7)) : ''}</span>
          </span>
          <span class="ligne-montant">${ech(euro(c.montant))}</span>
          <span class="actions-ligne">
            <button class="icone-btn" data-edit-charge="${i}" aria-label="Corriger ${ech(c.libelle)}">✎</button>
            <button class="icone-btn" data-suppr-charge="${i}" aria-label="Supprimer ${ech(c.libelle)}">✕</button>
          </span>
        </li>`).join('')}
    </ul>
  </div>`;
}

function etape4() {
  const revenus = etat.revenus.reduce((t, r) => t + r.montant, 0);
  const charges = etat.charges.reduce((t, c) => t + c.montant, 0);
  const credits = etat.charges.filter((c) => c.nature === 'credit').reduce((t, c) => t + c.montant, 0);
  const reste = revenus - charges;
  const taux = revenus > 0 ? (credits / revenus) * 100 : 0;

  return `
  ${entete('Votre mois, en résumé', "Voici ce que donne votre budget. Vous pourrez tout modifier ensuite, rien n'est figé.")}

  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="kpi"><p class="label">Entrées du mois</p><div class="kpi-valeur">${ech(euro(revenus))}</div></div>
    <div class="kpi"><p class="label">Charges fixes</p><div class="kpi-valeur">${ech(euro(charges))}</div></div>
  </div>
  <div class="kpi ${reste >= 0 ? 'kpi-vert' : 'kpi-rouge'}" style="margin-bottom:16px">
    <p class="label">Reste à vivre avant dépenses courantes</p>
    <div class="kpi-valeur">${ech(euro(reste))}</div>
    <p class="kpi-detail">Soit environ ${ech(euro(reste / 30))} par jour pour les courses, l'essence et les imprévus.</p>
  </div>

  ${taux > 35 ? `<div class="alerte alerte-attention">Vos crédits représentent ${Math.round(taux)} % de vos entrées. Au delà de 35 %, les banques parlent de taux d'endettement élevé. Rien de grave, mais gardez l'œil.</div>` : ''}
  ${reste < 0 ? `<div class="alerte alerte-danger">Vos charges dépassent vos entrées. Vérifiez qu'aucune ligne n'a été saisie en double avant de continuer.</div>` : ''}

  <div class="carte">
    <div class="champ">
      <label for="objectif">Objectif d'épargne mensuel</label>
      <input id="objectif" type="number" inputmode="decimal" step="0.01" min="0" value="${etat.objectif || ''}" placeholder="100">
      <p class="aide">Facultatif. Il apparaîtra comme repère sur votre tableau de bord.</p>
    </div>
  </div>

  <div class="onb-actions">
    <button class="btn btn-secondaire" data-precedent>Retour</button>
    <button class="btn btn-principal" data-terminer>Ouvrir mon tableau de bord</button>
  </div>`;
}

/* ============================== Interactions ============================== */

function brancher() {
  const q = (sel) => zone.querySelector(sel);

  const suivant = q('[data-suivant]');
  if (suivant) suivant.onclick = () => {
    if (etape === 1) etat.prenom = nettoyerLibelle(q('#prenom').value);
    if (etape === 2 && !etat.revenus.length) return toast('Ajoutez au moins une entrée d\'argent', 'ko');
    etape++;
    afficher();
  };

  const precedent = q('[data-precedent]');
  if (precedent) precedent.onclick = () => { etape--; afficher(); };

  /* Étape revenus */
  const ajoutRevenu = q('[data-ajout-revenu]');
  if (ajoutRevenu) ajoutRevenu.onclick = () => {
    const libelle = nettoyerLibelle(q('#rLibelle').value);
    const montant = montantValide(q('#rMontant').value);
    if (!libelle) return toast('Donnez un libellé à cette entrée', 'ko');
    if (montant === null || montant === 0) return toast('Indiquez un montant valide', 'ko');
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
      const f = zone.querySelector('#rLibelle');
      f.value = ligne.libelle;
      zone.querySelector('#rMontant').value = ligne.montant;
      zone.querySelector('#rType').value = ligne.type;
      zone.querySelector('#rRecurrent').value = ligne.recurrent ? '1' : '0';
      f.focus();
      f.scrollIntoView({ block: 'center' });
    };
  });

  /* Étape charges */
  const libelleCharge = q('#cLibelle');
  if (libelleCharge) {
    let natureModifiee = false;
    q('#cNature').addEventListener('change', () => { natureModifiee = true; });
    const proposer = () => {
      const propose = deviner(libelleCharge.value);
      if (!natureModifiee) q('#cNature').value = propose.nature;
      q('#cCategorie').value = propose.categorie;
    };
    libelleCharge.addEventListener('input', proposer);
  }

  const ajoutCharge = q('[data-ajout-charge]');
  if (ajoutCharge) ajoutCharge.onclick = () => {
    const libelle = nettoyerLibelle(q('#cLibelle').value);
    const montant = montantValide(q('#cMontant').value);
    if (!libelle) return toast('Donnez un libellé à cette charge', 'ko');
    if (montant === null || montant === 0) return toast('Indiquez un montant valide', 'ko');
    const jour = Number(q('#cJour').value);
    const fin = q('#cFin').value;
    etat.charges.push({
      libelle,
      montant,
      nature: q('#cNature').value,
      categorie: q('#cCategorie').value,
      jour_prelevement: jour >= 1 && jour <= 31 ? jour : null,
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
      const f = zone.querySelector('#cLibelle');
      f.value = ligne.libelle;
      zone.querySelector('#cMontant').value = ligne.montant;
      zone.querySelector('#cNature').value = ligne.nature;
      zone.querySelector('#cCategorie').value = ligne.categorie;
      zone.querySelector('#cJour').value = ligne.jour_prelevement || '';
      zone.querySelector('#cFin').value = (ligne.date_fin || '').slice(0, 7);
      f.focus();
      f.scrollIntoView({ block: 'center' });
    };
  });

  /* Import de fichier */
  const champFichier = q('#fichierImport');
  if (champFichier) {
    champFichier.onchange = () => { if (champFichier.files[0]) importer(champFichier.files[0]); };
    const depot = q('#zoneDepot');
    depot.addEventListener('click', (ev) => { ev.preventDefault(); champFichier.click(); });
    ['dragenter', 'dragover'].forEach((e) => depot.addEventListener(e, (ev) => {
      ev.preventDefault(); depot.classList.add('survol');
    }));
    ['dragleave', 'drop'].forEach((e) => depot.addEventListener(e, (ev) => {
      ev.preventDefault(); depot.classList.remove('survol');
    }));
    depot.addEventListener('drop', (ev) => {
      const fichier = ev.dataTransfer?.files?.[0];
      if (fichier) importer(fichier);
    });
  }

  /* Fin */
  const terminer = q('[data-terminer]');
  if (terminer) terminer.onclick = () => enregistrer(terminer);
}

/* ============================== Import de fichier ============================== */

const TAILLE_MAX = 5 * 1024 * 1024;

async function importer(fichier) {
  const retour = zone.querySelector('#etatImport');
  const message = (classe, texte) => { retour.innerHTML = `<div class="alerte ${classe}" style="margin-top:14px">${ech(texte)}</div>`; };

  if (fichier.size > TAILLE_MAX) {
    return message('alerte-danger', 'Ce fichier dépasse 5 Mo. Réduisez-le ou saisissez vos lignes à la main.');
  }

  message('alerte-info', `Lecture de ${fichier.name} en cours, cela prend quelques secondes.`);

  try {
    etat.prenom = nettoyerLibelle(zone.querySelector('#prenom').value) || etat.prenom;

    const texte = await extraireTexte(fichier);
    const resultat = analyser(texte);
    const total = resultat.charges.length + resultat.revenus.length;

    if (!total) {
      return message('alerte-attention', "Aucune ligne exploitable trouvée. Si le PDF vient d'un scan, son texte n'est pas lisible : passez par la saisie manuelle, elle prend deux minutes.");
    }

    etat.charges = [...etat.charges, ...resultat.charges];
    etat.revenus = [...etat.revenus, ...resultat.revenus];
    etat.importe = { charges: resultat.charges.length, revenus: resultat.revenus.length };

    toast(`${total} ligne${total > 1 ? 's' : ''} importée${total > 1 ? 's' : ''}`);
    etape = 2;
    afficher();
  } catch (erreur) {
    console.error(erreur);
    message('alerte-danger', erreur.message && erreur.message.length < 120
      ? erreur.message
      : "Ce fichier n'a pas pu être lu. Vérifiez son format, ou saisissez vos lignes à la main.");
  }
}

/* ============================== Enregistrement ============================== */

async function enregistrer(bouton) {
  const objectif = montantValide(zone.querySelector('#objectif').value) || 0;
  bouton.disabled = true;
  bouton.textContent = 'Enregistrement';

  try {
    const uid = session.user.id;

    const { error: e1 } = await sb.from('profiles').upsert({
      id: uid,
      prenom: etat.prenom || null,
      objectif_epargne: objectif,
      onboarding_done: true
    });
    if (e1) throw e1;

    if (etat.revenus.length) {
      const { error: e2 } = await sb.from('revenus').insert(
        etat.revenus.map((r) => ({
          user_id: uid, libelle: r.libelle, montant: r.montant,
          type: r.type, recurrent: r.recurrent, actif: true
        }))
      );
      if (e2) throw e2;
    }

    if (etat.charges.length) {
      const { error: e3 } = await sb.from('charges').insert(
        etat.charges.map((c) => ({
          user_id: uid, libelle: c.libelle, montant: c.montant,
          nature: c.nature, categorie: c.categorie,
          jour_prelevement: c.jour_prelevement, date_fin: c.date_fin, actif: true
        }))
      );
      if (e3) throw e3;
    }

    location.replace('/app.html');
  } catch (erreur) {
    console.error(erreur);
    toast(messageErreur(erreur), 'ko');
    bouton.disabled = false;
    bouton.textContent = 'Ouvrir mon tableau de bord';
  }
}

/* ============================== Démarrage ============================== */

(async () => {
  session = await sessionRequise();
  if (!session) return;
  etat.prenom = session.user.user_metadata?.prenom || '';

  const { data } = await sb.from('profiles').select('onboarding_done, prenom').eq('id', session.user.id).maybeSingle();
  if (data?.onboarding_done) return location.replace('/app.html');
  if (data?.prenom) etat.prenom = data.prenom;

  afficher();
})();
