import { sb, sessionRequise, deconnexion, messageErreur, colonneManquante } from './supabase.js';
import { toast, ech, ouvrirModale, fermerModale, confirmer } from './ui.js';
import { t, LANGUES, langueCourante, setLangue } from './i18n.js';
import { listeDevises, nomDevise, tauxChange } from './devises.js';
import {
  CATEGORIES_CLES, NATURES_CLES, TYPES_REVENU_CLES, categorie, libelleNature, classeNature,
  libelleTypeRevenu, deviner, euro, euroArrondi, pourcent, dateFr, setDevise, deviseCourante,
  cleMois, moisCourant, libelleMois, libelleMoisCourt, moisPrecedent, moisSuivant, moisDepuisCle,
  joursDuMois, mensualitesRestantes, synthese, cumulParJour, repartition, chargesDuMois,
  soldeEpargne, somme, montantValide, nettoyerLibelle, versCSV, telechargerCSV
} from './helpers.js';
import { courbeComparaison, donut, barres } from './charts.js';

const vue = document.getElementById('vue');

const etat = {
  session: null,
  profil: null,
  charges: [],
  revenus: [],
  depenses: [],
  epargne: [],
  mois: moisCourant(),
  onglet: 'tableau',
  filtreNature: 'tout'
};

const uid = () => etat.session.user.id;

const optionsNature = (sel) => NATURES_CLES.map((k) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${ech(libelleNature(k))}</option>`).join('');
const optionsCategorie = (sel) => CATEGORIES_CLES.map((k) => { const c = categorie(k); return `<option value="${k}" ${sel === k ? 'selected' : ''}>${ech(c.emoji + ' ' + c.libelle)}</option>`; }).join('');
const optionsTypeRevenu = (sel) => TYPES_REVENU_CLES.map((k) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${ech(libelleTypeRevenu(k))}</option>`).join('');

/* ====================== Écriture en base ====================== */

/* Colonnes ajoutées par les migrations : si la base ne les connaît pas
   encore, la ligne est enregistrée sans elles plutôt que perdue. */
const COLONNES_OPTIONNELLES = ['date_debut', 'derniere_conversion', 'epargne_initiale', 'langue', 'devise'];

/* Dernière ligne réellement écrite, relue depuis la base. */
let derniereLigneEcrite = null;

/* Renvoie null et la ligne écrite, ou une erreur exploitable. On demande
   toujours la ligne en retour : sans elle, impossible de distinguer un
   enregistrement réussi d'une ligne refusée en silence. */
async function ecrire(table, donnees, id) {
  const envoyer = (contenu) => (id
    ? sb.from(table).update(contenu).eq('id', id).select()
    : sb.from(table).insert({ ...contenu, user_id: uid() }).select());

  const vide = { message: `Aucune ligne enregistrée dans « ${table} ». La base a accepté la requête sans écrire, ce qui vient en général d'une règle RLS incomplète sur cette table.` };

  let { data, error } = await envoyer(donnees);
  if (!error) {
    derniereLigneEcrite = data && data[0] ? data[0] : null;
    return derniereLigneEcrite ? null : vide;
  }

  const colonne = colonneManquante(error);
  if (colonne && Object.prototype.hasOwnProperty.call(donnees, colonne) && COLONNES_OPTIONNELLES.includes(colonne)) {
    const allege = { ...donnees };
    delete allege[colonne];
    const seconde = await envoyer(allege);
    if (!seconde.error) {
      derniereLigneEcrite = seconde.data && seconde.data[0] ? seconde.data[0] : null;
      if (!derniereLigneEcrite) return vide;
      toast(t('common.savedWithout', { c: colonne }), 'neutre');
      return null;
    }
    return seconde.error;
  }

  console.error(`Échec d'écriture sur ${table}`, error);
  return error;
}

/* ====================== Chargement ====================== */

async function charger() {
  const debut = moisPrecedent(etat.mois, 11) + '-01';

  const [profil, charges, revenus, depenses, epargne] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid()).maybeSingle(),
    sb.from('charges').select('*').order('montant', { ascending: false }),
    sb.from('revenus').select('*').order('montant', { ascending: false }),
    sb.from('depenses').select('*').gte('date', debut).order('date', { ascending: false }),
    sb.from('epargne_mouvements').select('*').order('date', { ascending: false })
  ]);

  if (charges.error || revenus.error || depenses.error) {
    console.error(charges.error || revenus.error || depenses.error);
    toast(t('common.loadError'), 'ko');
    return false;
  }

  etat.profil = profil.data || { prenom: null, objectif_epargne: 0, onboarding_done: false, devise: 'EUR', langue: langueCourante(), epargne_initiale: 0 };
  etat.charges = charges.data || [];
  etat.revenus = revenus.data || [];
  etat.depenses = depenses.data || [];
  /* La table épargne peut manquer si la migration n'a pas encore été jouée. */
  etat.epargne = epargne.error ? [] : (epargne.data || []);

  setDevise(etat.profil.devise || 'EUR');
  if (etat.profil.langue && etat.profil.langue !== langueCourante()) setLangue(etat.profil.langue);

  return true;
}

async function rafraichir() {
  try {
    await charger();
  } catch (erreur) {
    console.error('Erreur de chargement', erreur);
    toast(`${t('common.loadError')} ${erreur.message || ''}`.trim(), 'ko');
  }
  rendre();
}

/* ====================== Rendu ====================== */

function rendre() {
  try {
    rendreVues();
  } catch (erreur) {
    console.error('Erreur de rendu', erreur);
    vue.innerHTML = `<div class="conteneur"><div class="alerte alerte-danger" style="margin-top:20px">
      ${ech(t('common.renderError'))}<br><code style="font-size:.82rem">${ech(erreur.message || erreur)}</code>
    </div></div>`;
  }
}

function rendreVues() {
  traduireCoquille();
  document.querySelectorAll('.onglet').forEach((b) => {
    if (b.dataset.vue === etat.onglet) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const vues = { tableau: vueTableau, charges: vueCharges, depenses: vueDepenses, credits: vueCredits, epargne: vueEpargne, reglages: vueProfil };
  vue.innerHTML = `<div class="conteneur">${vues[etat.onglet]()}</div>`;
  brancher();
}

function traduireCoquille() {
  const libelles = {
    tableau: 'nav.dashboard', charges: 'nav.charges', depenses: 'nav.expenses',
    credits: 'nav.credits', epargne: 'nav.savings', reglages: 'nav.profile'
  };
  document.querySelectorAll('.onglet').forEach((b) => { b.textContent = t(libelles[b.dataset.vue]); });
  const ajout = document.getElementById('btnAjoutRapide');
  if (ajout) ajout.textContent = t('nav.addExpense');
  const profil = document.querySelector('.etiquette-profil');
  if (profil) profil.textContent = t('nav.profile');
}

function selecteurMois() {
  const courant = etat.mois === moisCourant();
  return `
  <div class="bloc-mois">
    <div class="selecteur-mois">
      <button data-mois="-1" aria-label="${ech(t('common.prevMonth'))}">‹</button>
      <button class="selecteur-label" data-choisir-mois aria-label="${ech(t('common.chooseMonth'))}">${ech(libelleMois(etat.mois))}</button>
      <button data-mois="1" aria-label="${ech(t('common.nextMonth'))}">›</button>
    </div>
    ${courant ? '' : `<button class="btn btn-fantome btn-sm" data-mois-courant>↺ ${ech(t('common.thisMonth'))}</button>`}
  </div>`;
}

const titrePage = (titre, sousTitre, droite = '') => `
  <div class="app-titre">
    <div><h1>${ech(titre)}</h1><p>${ech(sousTitre)}</p></div>
    <div class="app-actions">${droite}</div>
  </div>`;

const videHtml = (titre, texte) => `<div class="vide"><strong>${ech(titre)}</strong>${ech(texte)}</div>`;

/* ---------------------- Tableau de bord ---------------------- */

function vueTableau() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const moisM1 = moisPrecedent(etat.mois);
  const sM1 = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: moisM1 });

  const base = Math.max(s.totalRevenus, s.totalCharges + s.totalDepenses, 1);
  const pcCharges = (s.totalCharges / base) * 100;
  const pcDepenses = (s.totalDepenses / base) * 100;
  const pcReste = Math.max(0, 100 - pcCharges - pcDepenses);
  const evolution = sM1.totalDepenses > 0 ? ((s.totalDepenses - sM1.totalDepenses) / sM1.totalDepenses) * 100 : null;

  const parts = repartition([...s.chargesMois, ...s.depensesMois]);
  const historique = [];
  for (let i = 5; i >= 0; i--) {
    const cle = moisPrecedent(etat.mois, i);
    historique.push({
      libelle: libelleMoisCourt(cle),
      valeur: synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle }).totalDepenses,
      actif: i === 0
    });
  }

  return `
  ${titrePage(etat.profil.prenom ? t('dash.hello', { n: etat.profil.prenom }) : t('dash.yourMonth'), t('dash.subtitle'), selecteurMois())}
  ${alertes(s, sM1)}

  <div class="carte" style="margin-bottom:16px">
    <div class="regle-entete">
      <div>
        <p class="label">${ech(t('dash.realRest'))}</p>
        <div class="regle-total" style="color:${s.resteReel >= 0 ? 'var(--menthe)' : 'var(--corail)'}">${ech(euro(s.resteReel))}</div>
      </div>
      ${evolution === null ? '' : `<span class="evolution ${evolution > 3 ? 'hausse' : evolution < -3 ? 'baisse' : 'neutre'}">${evolution > 0 ? '▲' : '▼'} ${ech(t('dash.evolution', { p: pourcent(Math.abs(evolution)), m: libelleMoisCourt(moisM1) }))}</span>`}
    </div>
    <div class="barre">
      <div class="barre-seg seg-charges" style="width:${pcCharges.toFixed(1)}%"></div>
      <div class="barre-seg seg-depenses" style="width:${pcDepenses.toFixed(1)}%"></div>
      <div class="barre-seg seg-reste" style="width:${pcReste.toFixed(1)}%"></div>
      ${s.moisEnCours ? `<div class="barre-curseur" style="left:${((s.jour / s.nbJours) * 100).toFixed(1)}%" data-jour="${ech(t('dash.dayMarker', { d: s.jour }))}"></div>` : ''}
    </div>
    <div class="legende">
      <span><i class="pastille" style="background:var(--encre)"></i> ${ech(t('dash.fixed'))} ${ech(euroArrondi(s.totalCharges))}</span>
      <span><i class="pastille" style="background:#6f86b8"></i> ${ech(t('dash.spent'))} ${ech(euroArrondi(s.totalDepenses))}</span>
      <span><i class="pastille" style="background:var(--menthe-fond);border:1px solid var(--ligne)"></i> ${ech(t('dash.left'))} ${ech(euroArrondi(Math.max(0, s.resteReel)))}</span>
    </div>
  </div>

  <div class="grille grille-4" style="margin-bottom:16px">
    <div class="kpi"><p class="label">${ech(t('dash.income'))}</p><div class="kpi-valeur">${ech(euro(s.totalRevenus))}</div><p class="kpi-detail">${ech(t('common.lines', { n: s.revenusMois.length }))}</p></div>
    <div class="kpi"><p class="label">${ech(t('dash.fixed'))}</p><div class="kpi-valeur">${ech(euro(s.totalCharges))}</div><p class="kpi-detail">${ech(t('dash.ofWhichCredits', { m: euroArrondi(s.totalCredits) }))}</p></div>
    <div class="kpi"><p class="label">${ech(t('dash.dailyExpenses'))}</p><div class="kpi-valeur">${ech(euro(s.totalDepenses))}</div><p class="kpi-detail">${ech(t('dash.entries', { n: s.depensesMois.length }))}</p></div>
    <div class="kpi ${s.resteAVivre >= 0 ? 'kpi-vert' : 'kpi-rouge'}"><p class="label">${ech(t('dash.disposable'))}</p><div class="kpi-valeur">${ech(euro(s.resteAVivre))}</div><p class="kpi-detail">${ech(t('dash.beforeExpenses'))}</p></div>
  </div>

  ${s.moisEnCours ? `
  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="carte">
      <p class="label">${ech(t('dash.dailyBudget'))}</p>
      <div class="kpi-valeur" style="color:${s.budgetJournalier >= 0 ? 'var(--encre)' : 'var(--corail)'}">${ech(euro(s.budgetJournalier))}</div>
      <p class="kpi-detail">${ech(t('dash.daysLeft', { n: s.nbJours - s.jour + 1 }))}</p>
    </div>
    <div class="carte">
      <p class="label">${ech(t('dash.projection'))}</p>
      <div class="kpi-valeur" style="color:${s.projection <= s.resteAVivre ? 'var(--menthe)' : 'var(--corail)'}">${ech(euro(s.projection))}</div>
      <p class="kpi-detail">${ech(t('dash.pace', { m: euro(s.rythme) }))}</p>
    </div>
  </div>` : ''}

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('dash.cumulative', { a: libelleMoisCourt(etat.mois), b: libelleMoisCourt(moisM1) }))}</h3></div>
    ${courbeComparaison(
      cumulParJour(etat.depenses, etat.mois).slice(0, s.moisEnCours ? s.jour : joursDuMois(etat.mois)),
      cumulParJour(etat.depenses, moisM1),
      { labelActuel: libelleMois(etat.mois), labelPrecedent: libelleMois(moisM1) }
    )}
  </div>

  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="carte">
      <div class="carte-titre"><h3>${ech(t('dash.whereMoney'))}</h3></div>
      ${parts.length ? donut(parts, parts.reduce((acc, p) => acc + p.montant, 0)) : videHtml(t('dash.nothingToSplit'), t('dash.nothingToSplitHelp'))}
    </div>
    <div class="carte">
      <div class="carte-titre"><h3>${ech(t('dash.nextDebits'))}</h3></div>
      ${prochainsPrelevements(s)}
    </div>
  </div>

  <div class="carte">
    <div class="carte-titre"><h3>${ech(t('dash.last6'))}</h3></div>
    ${barres(historique, { description: t('dash.last6') })}
  </div>`;
}

function alertes(s, sM1) {
  const blocs = [];

  if (s.resteReel < 0) {
    blocs.push(`<div class="alerte alerte-danger">${ech(t('alert.over', { m: euro(Math.abs(s.resteReel)) }))}</div>`);
  } else if (s.moisEnCours && s.projection > s.resteAVivre && s.resteAVivre > 0) {
    blocs.push(`<div class="alerte alerte-attention">${ech(t('alert.pace', { m: euro(s.projection - s.resteAVivre), d: euro(s.budgetJournalier) }))}</div>`);
  } else if (s.moisEnCours && sM1.totalDepenses > 0 && s.totalDepenses < sM1.totalDepenses * 0.85) {
    blocs.push(`<div class="alerte alerte-ok">${ech(t('alert.better'))}</div>`);
  }

  if (s.tauxEndettement > 35) {
    blocs.push(`<div class="alerte alerte-attention">${ech(t('alert.debt', { p: pourcent(s.tauxEndettement) }))}</div>`);
  }

  const bientot = s.chargesMois.filter((c) => {
    const n = mensualitesRestantes(etat.mois, c.date_fin);
    return n !== null && n <= 3;
  });
  if (bientot.length) {
    blocs.push(`<div class="alerte alerte-info">${ech(t('alert.ending', { n: bientot.length, l: bientot.map((c) => c.libelle).join(', '), m: euro(somme(bientot)) }))}</div>`);
  }

  return blocs.join('');
}

function prochainsPrelevements(s) {
  const jourActuel = s.moisEnCours ? s.jour : 1;
  const liste = s.chargesMois
    .filter((c) => c.jour_prelevement && c.jour_prelevement >= jourActuel)
    .sort((a, b) => a.jour_prelevement - b.jour_prelevement)
    .slice(0, 6);

  if (!liste.length) return videHtml(t('dash.noDebits'), t('dash.noDebitsHelp'));

  return `<ul class="liste">
    ${liste.map((c) => `<li class="ligne-item">
      <span class="ligne-nom">${ech(c.libelle)}<span class="ligne-meta">${ech(t('dash.onDay', { d: c.jour_prelevement, m: libelleMoisCourt(etat.mois) }))}</span></span>
      <span class="ligne-montant">${ech(euro(c.montant))}</span></li>`).join('')}
  </ul>
  <p class="aide" style="margin-top:14px">${ech(t('dash.totalUpcoming', { m: euro(somme(liste)) }))}</p>`;
}

/* ---------------------- Charges ---------------------- */

function vueCharges() {
  const duMois = chargesDuMois(etat.charges, etat.mois);
  const filtrees = etat.filtreNature === 'tout' ? duMois : duMois.filter((c) => c.nature === etat.filtreNature);

  const puces = ['tout', ...NATURES_CLES].map((cle) => {
    const libelle = cle === 'tout' ? t('charges.all') : libelleNature(cle);
    const montant = cle === 'tout' ? somme(duMois) : somme(duMois.filter((c) => c.nature === cle));
    return `<button class="puce" data-filtre="${cle}" aria-pressed="${etat.filtreNature === cle}">${ech(libelle)} · ${ech(euroArrondi(montant))}</button>`;
  }).join('');

  return `
  ${titrePage(t('nav.charges'), t('charges.subtitle'), `
    ${selecteurMois()}
    <button class="btn btn-secondaire btn-sm" data-export="charges">${ech(t('common.export'))}</button>
    <button class="btn btn-principal btn-sm" data-nouvelle-charge>${ech(t('charges.new'))}</button>`)}

  <div class="filtres">${puces}</div>

  <div class="carte">
    <div class="carte-titre">
      <h3>${ech(t('charges.count', { n: filtrees.length }))}</h3>
      <span class="montant" style="font-weight:700;font-size:1.15rem">${ech(euro(somme(filtrees)))}</span>
    </div>
    ${filtrees.length ? `<ul class="liste">${filtrees.map(ligneCharge).join('')}</ul>` : videHtml(t('charges.empty'), t('charges.emptyHelp'))}
  </div>`;
}

function ligneCharge(c) {
  const restantes = mensualitesRestantes(etat.mois, c.date_fin);
  const meta = [
    categorie(c.categorie).libelle,
    c.jour_prelevement ? t('dash.onDay', { d: c.jour_prelevement, m: libelleMoisCourt(etat.mois) }) : null,
    c.date_debut ? t('charges.from', { d: dateFr(c.date_debut) }) : null,
    c.date_fin ? `${t('charges.endedOn', { d: dateFr(c.date_fin) })} · ${t('charges.monthsLeft', { n: restantes })}` : null
  ].filter(Boolean).join(' · ');

  return `<li class="ligne-item">
    <span class="ligne-nom">${ech(c.libelle)}
      <span class="tag ${classeNature(c.nature)}">${ech(libelleNature(c.nature))}</span>
      <span class="ligne-meta">${ech(meta)}</span></span>
    <span class="ligne-montant">${ech(euro(c.montant))}</span>
    <span class="actions-ligne">
      <button class="icone-btn" data-modifier-charge="${ech(c.id)}" aria-label="${ech(t('common.edit'))}">✎</button>
      <button class="icone-btn" data-supprimer-charge="${ech(c.id)}" aria-label="${ech(t('common.delete'))}">🗑</button>
    </span></li>`;
}

/* ---------------------- Dépenses ---------------------- */

function vueDepenses() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const parJour = new Map();
  s.depensesMois.forEach((d) => {
    if (!parJour.has(d.date)) parJour.set(d.date, []);
    parJour.get(d.date).push(d);
  });
  const jours = [...parJour.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return `
  ${titrePage(t('nav.expenses'), t('exp.subtitle'), `
    ${selecteurMois()}
    <button class="btn btn-secondaire btn-sm" data-export="depenses">${ech(t('common.export'))}</button>
    <button class="btn btn-principal btn-sm" data-nouvelle-depense>${ech(t('exp.new'))}</button>`)}

  <div class="grille grille-3" style="margin-bottom:18px">
    <div class="kpi"><p class="label">${ech(t('exp.spentMonth'))}</p><div class="kpi-valeur">${ech(euro(s.totalDepenses))}</div></div>
    <div class="kpi ${s.resteReel >= 0 ? 'kpi-vert' : 'kpi-rouge'}"><p class="label">${ech(t('dash.realRest'))}</p><div class="kpi-valeur">${ech(euro(s.resteReel))}</div></div>
    <div class="kpi"><p class="label">${ech(t('exp.avgDay'))}</p><div class="kpi-valeur">${ech(euro(s.rythme))}</div></div>
  </div>

  ${jours.length ? jours.map(([date, lignes]) => `
    <div class="carte" style="margin-bottom:12px">
      <div class="carte-titre">
        <h3 style="font-size:.95rem;color:var(--ardoise)">${ech(dateFr(date))}</h3>
        <span class="montant" style="font-weight:700">${ech(euro(somme(lignes)))}</span>
      </div>
      <ul class="liste">
        ${lignes.map((d) => `<li class="ligne-item">
          <span class="ligne-nom">${ech(categorie(d.categorie).emoji)} ${ech(d.libelle)}<span class="ligne-meta">${ech(categorie(d.categorie).libelle)}</span></span>
          <span class="ligne-montant">${ech(euro(d.montant))}</span>
          <span class="actions-ligne">
            <button class="icone-btn" data-modifier-depense="${ech(d.id)}" aria-label="${ech(t('common.edit'))}">✎</button>
            <button class="icone-btn" data-supprimer-depense="${ech(d.id)}" aria-label="${ech(t('common.delete'))}">🗑</button>
          </span></li>`).join('')}
      </ul>
    </div>`).join('') : `<div class="carte">${videHtml(t('exp.empty'), t('exp.emptyHelp'))}</div>`}`;
}

/* ---------------------- Crédits ---------------------- */

function vueCredits() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const credits = s.chargesMois.filter((c) => c.nature === 'credit');
  const avecFin = credits.filter((c) => c.date_fin);
  const capitalRestant = avecFin.reduce((acc, c) => acc + c.montant * (mensualitesRestantes(etat.mois, c.date_fin) || 0), 0);
  const liberations = avecFin.map((c) => ({ ...c, fin: c.date_fin.slice(0, 7) })).sort((a, b) => (a.fin < b.fin ? -1 : 1));

  return `
  ${titrePage(t('nav.credits'), t('cred.subtitle'), selecteurMois())}

  <div class="grille grille-3" style="margin-bottom:18px">
    <div class="kpi"><p class="label">${ech(t('cred.monthly'))}</p><div class="kpi-valeur">${ech(euro(s.totalCredits))}</div><p class="kpi-detail">${ech(t('cred.inProgress', { n: credits.length }))}</p></div>
    <div class="kpi"><p class="label">${ech(t('cred.remainingDebt'))}</p><div class="kpi-valeur">${ech(euro(capitalRestant))}</div><p class="kpi-detail">${ech(avecFin.length < credits.length ? t('cred.excluded') : t('cred.basisEnd'))}</p></div>
    <div class="kpi ${s.tauxEndettement > 35 ? 'kpi-rouge' : ''}"><p class="label">${ech(t('cred.ratio'))}</p><div class="kpi-valeur">${ech(pourcent(s.tauxEndettement))}</div><p class="kpi-detail">${ech(t('cred.threshold'))}</p></div>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('cred.yours'))}</h3></div>
    ${credits.length ? `<ul class="liste">${credits.map((c) => {
      const n = mensualitesRestantes(etat.mois, c.date_fin);
      return `<li class="ligne-item">
        <span class="ligne-nom">${ech(c.libelle)}<span class="ligne-meta">${ech(c.date_fin ? t('cred.until', { n, d: dateFr(c.date_fin) }) : t('cred.unknown'))}</span></span>
        <span class="ligne-montant">${ech(euro(c.montant))}${c.date_fin ? `<span class="ligne-meta" style="display:block;text-align:right">${ech(t('cred.remains', { m: euroArrondi(c.montant * n) }))}</span>` : ''}</span>
        <span class="actions-ligne"><button class="icone-btn" data-modifier-charge="${ech(c.id)}" aria-label="${ech(t('common.edit'))}">✎</button></span></li>`;
    }).join('')}</ul>` : videHtml(t('cred.none'), t('cred.noneHelp'))}
  </div>

  ${liberations.length ? `
  <div class="carte">
    <div class="carte-titre"><h3>${ech(t('cred.freed'))}</h3></div>
    <ul class="liste">
      ${liberations.map((c) => `<li class="ligne-item">
        <span class="ligne-nom">${ech(libelleMois(c.fin))}<span class="ligne-meta">${ech(t('cred.endOf', { l: c.libelle }))}</span></span>
        <span class="ligne-montant" style="color:var(--menthe)">${ech(t('cred.perMonth', { m: euro(c.montant) }))}</span></li>`).join('')}
    </ul>
    <p class="aide" style="margin-top:14px">${ech(t('cred.afterAll', { m: euro(somme(liberations)) }))}</p>
  </div>` : ''}`;
}

/* ---------------------- Épargne ---------------------- */

function etatEpargne() {
  return soldeEpargne({
    charges: etat.charges,
    mouvements: etat.epargne,
    initial: etat.profil.epargne_initiale || 0,
    jusquA: etat.mois
  });
}

function vueEpargne() {
  const { total, serie } = etatEpargne();
  const moisSerie = serie.find((x) => x.cle === etat.mois) || { auto: 0, manuels: 0 };
  const objectif = Number(etat.profil.objectif_epargne) || 0;
  const verse = moisSerie.auto + Math.max(0, moisSerie.manuels);
  const progression = objectif > 0 ? Math.min(100, (verse / objectif) * 100) : 0;

  const douzeMois = serie.slice(-12).map((x, i, tab) => ({
    libelle: libelleMoisCourt(x.cle), valeur: Math.max(0, x.cumul), actif: i === tab.length - 1
  }));

  const rythme = serie.slice(-3).reduce((acc, x) => acc + x.auto + x.manuels, 0) / Math.min(3, serie.length || 1);

  const mouvementsMois = [...etat.epargne]
    .filter((m) => (m.date || '') >= moisPrecedent(etat.mois, 5) + '-01')
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);

  return `
  ${titrePage(t('nav.savings'), t('sav.subtitle'), `
    ${selecteurMois()}
    <button class="btn btn-secondaire btn-sm" data-corriger-solde>${ech(t('sav.adjust'))}</button>
    <button class="btn btn-principal btn-sm" data-nouveau-mouvement>${ech(t('sav.newMovement'))}</button>`)}

  <div class="grille grille-3" style="margin-bottom:16px">
    <div class="kpi kpi-vert">
      <p class="label">${ech(t('sav.balance'))}</p>
      <div class="kpi-valeur">${ech(euro(total))}</div>
      <p class="kpi-detail">${ech(t('sav.balanceHelp'))}</p>
    </div>
    <div class="kpi">
      <p class="label">${ech(t('sav.monthlyAuto'))}</p>
      <div class="kpi-valeur">${ech(euro(moisSerie.auto))}</div>
      <p class="kpi-detail">${ech(t('sav.monthlyAutoHelp'))}</p>
    </div>
    <div class="kpi">
      <p class="label">${ech(t('sav.goal'))}</p>
      <div class="kpi-valeur">${ech(objectif ? euro(objectif) : '—')}</div>
      <p class="kpi-detail">${ech(objectif ? (verse >= objectif ? t('sav.goalReached') : t('sav.goalMissing', { m: euro(objectif - verse) })) : t('sav.noGoal'))}</p>
    </div>
  </div>

  ${objectif > 0 ? `
  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('sav.goal'))} · ${ech(libelleMois(etat.mois))}</h3><span class="montant" style="font-weight:700">${ech(euro(verse))} / ${ech(euro(objectif))}</span></div>
    <div class="jauge"><i style="width:${progression.toFixed(1)}%;background:${verse >= objectif ? 'var(--menthe)' : 'var(--encre)'}"></i></div>
  </div>` : ''}

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('sav.evolution'))}</h3></div>
    ${barres(douzeMois, { description: t('sav.evolution') })}
    ${rythme > 0 ? `<p class="aide" style="margin-top:12px">${ech(t('sav.projection', { m: euro(total + rythme * 12) }))}</p>` : ''}
  </div>

  <div class="carte">
    <div class="carte-titre">
      <h3>${ech(t('sav.history'))}</h3>
      <button class="btn btn-fantome btn-sm" data-solde-initial>${ech(t('sav.editInitial'))} · ${ech(euro(etat.profil.epargne_initiale || 0))}</button>
    </div>
    ${mouvementsMois.length ? `<ul class="liste">
      ${mouvementsMois.map((m) => `<li class="ligne-item">
        <span class="ligne-nom">${ech(m.libelle || (m.sens === 'retrait' ? t('sav.withdrawal') : t('sav.deposit')))}<span class="ligne-meta">${ech(dateFr(m.date))} · ${ech(m.sens === 'retrait' ? t('sav.withdrawal') : t('sav.deposit'))}</span></span>
        <span class="ligne-montant" style="color:${m.sens === 'retrait' ? 'var(--corail)' : 'var(--menthe)'}">${m.sens === 'retrait' ? '-' : '+'} ${ech(euro(m.montant))}</span>
        <span class="actions-ligne">
          <button class="icone-btn" data-modifier-mouvement="${ech(m.id)}" aria-label="${ech(t('common.edit'))}">✎</button>
          <button class="icone-btn" data-supprimer-mouvement="${ech(m.id)}" aria-label="${ech(t('common.delete'))}">🗑</button>
        </span></li>`).join('')}
    </ul>` : videHtml(t('sav.empty'), t('sav.emptyHelp'))}
  </div>`;
}

/* ---------------------- Profil ---------------------- */

function vueProfil() {
  return `
  ${titrePage(t('nav.profile'), t('prof.subtitle'))}

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('prof.account'))}</h3></div>
    <div class="ligne-item" style="border:none;padding-top:0">
      <span class="ligne-nom">${ech(etat.session.user.email)}<span class="ligne-meta">${ech(etat.profil.prenom ? t('prof.connectedAs', { n: etat.profil.prenom }) : t('prof.connected'))}</span></span>
      <span class="actions-ligne"><button class="btn btn-secondaire btn-sm" data-deconnexion>${ech(t('prof.logout'))}</button></span>
    </div>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('prof.preferences'))}</h3></div>
    <div class="ligne-champs">
      <div class="champ">
        <label for="rgLangue">${ech(t('prof.language'))}</label>
        <select id="rgLangue">${Object.values(LANGUES).map((l) => `<option value="${l.code}" ${langueCourante() === l.code ? 'selected' : ''}>${ech(l.libelle)}</option>`).join('')}</select>
      </div>
      <div class="champ">
        <label for="rgDevise">${ech(t('prof.currency'))}</label>
        <select id="rgDevise">${listeDevises().map((d) => `<option value="${d.code}" ${deviseCourante() === d.code ? 'selected' : ''}>${ech(d.code)} · ${ech(d.nom)}</option>`).join('')}</select>
        <p class="aide">${ech(t('prof.currencyHelp'))}</p>
      </div>
    </div>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre">
      <h3>${ech(t('prof.income'))}</h3>
      <button class="btn btn-principal btn-sm" data-nouveau-revenu>${ech(t('prof.newIncome'))}</button>
    </div>
    ${etat.revenus.length ? `<ul class="liste">${etat.revenus.map((r) => `
      <li class="ligne-item">
        <span class="ligne-nom">${ech(r.libelle)}<span class="ligne-meta">${ech(libelleTypeRevenu(r.type))} · ${ech(r.recurrent ? t('prof.recurring') : t('prof.oneOffOn', { m: (r.mois || '').slice(0, 7) }))}${r.actif ? '' : ' · ' + ech(t('prof.disabled'))}</span></span>
        <span class="ligne-montant">${ech(euro(r.montant))}</span>
        <span class="actions-ligne">
          <button class="icone-btn" data-modifier-revenu="${ech(r.id)}" aria-label="${ech(t('common.edit'))}">✎</button>
          <button class="icone-btn" data-supprimer-revenu="${ech(r.id)}" aria-label="${ech(t('common.delete'))}">🗑</button>
        </span>
      </li>`).join('')}</ul>` : videHtml(t('prof.noIncome'), t('prof.noIncomeHelp'))}
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('prof.card'))}</h3></div>
    <div class="ligne-champs">
      <div class="champ"><label for="rgPrenom">${ech(t('prof.firstName'))}</label><input id="rgPrenom" maxlength="40" value="${ech(etat.profil.prenom || '')}"></div>
      <div class="champ"><label for="rgObjectif">${ech(t('prof.savingsGoal'))}</label><input id="rgObjectif" type="number" step="0.01" min="0" value="${ech(etat.profil.objectif_epargne || 0)}"></div>
    </div>
    <button class="btn btn-secondaire" data-enregistrer-profil>${ech(t('common.save'))}</button>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>${ech(t('prof.security'))}</h3></div>
    <p class="aide" style="margin-bottom:14px">${ech(t('prof.securityText'))}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-principal" data-changer-mdp>${ech(t('prof.changePassword'))}</button>
      <button class="btn btn-secondaire" data-deconnexion>${ech(t('prof.logout'))}</button>
    </div>
  </div>

  <div class="carte">
    <div class="carte-titre"><h3>${ech(t('prof.data'))}</h3></div>
    <p class="aide" style="margin-bottom:14px">${ech(t('prof.dataText'))}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-secondaire" data-export="tout">${ech(t('prof.exportAll'))}</button>
      <button class="btn btn-danger" data-supprimer-compte>${ech(t('prof.deleteAccount'))}</button>
    </div>
  </div>`;
}

/* ====================== Formulaires ====================== */

function ouvrirCharge(charge) {
  const c = charge || { libelle: '', montant: '', nature: 'fixe', categorie: 'autre', jour_prelevement: '', date_debut: '', date_fin: '', actif: true };

  const fond = ouvrirModale(charge ? t('charges.editTitle') : t('charges.newTitle'), `
    <div class="ligne-champs">
      <div class="champ"><label for="fLibelle">${ech(t('common.label'))}</label><input id="fLibelle" maxlength="60" value="${ech(c.libelle)}"></div>
      <div class="champ"><label for="fMontant">${ech(t('common.amount'))}</label><input id="fMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(c.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="fNature">${ech(t('common.nature'))}</label><select id="fNature">${optionsNature(c.nature)}</select></div>
      <div class="champ"><label for="fCategorie">${ech(t('common.category'))}</label><select id="fCategorie">${optionsCategorie(c.categorie)}</select></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="fDebut">${ech(t('charges.start'))}</label><input id="fDebut" type="month" value="${ech((c.date_debut || '').slice(0, 7))}"><p class="aide">${ech(t('charges.startHelp'))}</p></div>
      <div class="champ"><label for="fFin">${ech(t('charges.end'))}</label><input id="fFin" type="month" value="${ech((c.date_fin || '').slice(0, 7))}"><p class="aide">${ech(t('charges.endHelp'))}</p></div>
    </div>
    <div id="fAlertePeriode"></div>
    <div class="champ"><label for="fJour">${ech(t('charges.debitDay'))}</label><input id="fJour" type="number" min="1" max="31" value="${ech(c.jour_prelevement || '')}"></div>
    <label class="case" style="margin-bottom:16px"><input type="checkbox" id="fActif" ${c.actif ? 'checked' : ''}><span>${ech(t('charges.active'))}</span></label>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  const q = (s) => fond.querySelector(s);

  /* Alerte dès la saisie, avant même de valider. */
  const verifierPeriode = () => {
    const debut = q('#fDebut').value;
    const fin = q('#fFin').value;
    const zone = q('#fAlertePeriode');
    if (debut && fin && fin < debut) {
      zone.innerHTML = `<div class="alerte alerte-danger" style="margin:0 0 14px">${ech(t('charges.endBeforeStart', { d: libelleMois(debut), f: libelleMois(fin) }))}</div>`;
    } else {
      zone.innerHTML = '';
    }
  };
  q('#fDebut').addEventListener('change', verifierPeriode);
  q('#fFin').addEventListener('change', verifierPeriode);
  verifierPeriode();

  let natureModifiee = Boolean(charge);
  q('#fNature').addEventListener('change', () => { natureModifiee = true; });
  q('#fLibelle').addEventListener('input', () => {
    const propose = deviner(q('#fLibelle').value);
    if (!natureModifiee) { q('#fNature').value = propose.nature; q('#fCategorie').value = propose.categorie; }
  });

  q('[data-valider]').onclick = async (e) => {
    const libelle = nettoyerLibelle(q('#fLibelle').value);
    const montant = montantValide(q('#fMontant').value);
    if (!libelle) return toast(t('common.labelRequired'), 'ko');
    if (montant === null) return toast(t('common.invalidAmount'), 'ko');

    const jour = Number(q('#fJour').value);
    const debut = q('#fDebut').value;
    const fin = q('#fFin').value;

    /* Une fin antérieure au début rend la charge invisible dans tous les
       mois : le cas le plus fréquent est une année laissée en arrière
       dans le sélecteur de mois. On refuse plutôt que d'enregistrer une
       ligne fantôme. */
    if (debut && fin && fin < debut) {
      return toast(t('charges.endBeforeStart', { d: libelleMois(debut), f: libelleMois(fin) }), 'ko');
    }

    const donnees = {
      libelle, montant,
      nature: q('#fNature').value,
      categorie: q('#fCategorie').value,
      jour_prelevement: jour >= 1 && jour <= 31 ? jour : null,
      date_debut: debut ? `${debut}-01` : null,
      date_fin: fin ? `${fin}-28` : null,
      actif: q('#fActif').checked
    };

    e.target.disabled = true;
    const error = await ecrire('charges', donnees, charge?.id);
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    const enregistree = derniereLigneEcrite;
    fermerModale();
    toast(t('common.saved'));

    /* Une charge qui démarre plus tard n'apparaît pas dans le mois affiché :
       on se place sur son premier mois pour qu'elle soit visible tout de suite. */
    const debutLigne = (enregistree?.date_debut || '').slice(0, 7);
    if (debutLigne && debutLigne > etat.mois) {
      etat.mois = debutLigne;
      toast(t('charges.shownFrom', { m: libelleMois(debutLigne) }), 'neutre');
    }

    await rafraichir();
  };
}

function ouvrirDepense(depense) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const d = depense || { libelle: '', montant: '', categorie: 'alimentation', date: aujourdhui };

  const fond = ouvrirModale(depense ? t('exp.editTitle') : t('exp.newTitle'), `
    <div class="ligne-champs">
      <div class="champ"><label for="dLibelle">${ech(t('common.label'))}</label><input id="dLibelle" maxlength="60" value="${ech(d.libelle)}"></div>
      <div class="champ"><label for="dMontant">${ech(t('common.amount'))}</label><input id="dMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(d.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="dCategorie">${ech(t('common.category'))}</label><select id="dCategorie">${optionsCategorie(d.categorie)}</select></div>
      <div class="champ"><label for="dDate">${ech(t('common.date'))}</label><input id="dDate" type="date" value="${ech(d.date)}" max="${aujourdhui}"></div>
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  const q = (s) => fond.querySelector(s);
  q('#dLibelle').addEventListener('input', () => {
    const propose = deviner(q('#dLibelle').value);
    if (propose.categorie !== 'autre') q('#dCategorie').value = propose.categorie;
  });

  q('[data-valider]').onclick = async (e) => {
    const libelle = nettoyerLibelle(q('#dLibelle').value);
    const montant = montantValide(q('#dMontant').value);
    const date = q('#dDate').value;
    if (!libelle) return toast(t('common.labelRequired'), 'ko');
    if (montant === null || montant === 0) return toast(t('common.invalidAmount'), 'ko');
    if (!date) return toast(t('common.invalidAmount'), 'ko');

    const donnees = { libelle, montant, categorie: q('#dCategorie').value, date };
    e.target.disabled = true;
    const error = await ecrire('depenses', donnees, depense?.id);
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(t('common.saved'));
    if (date.slice(0, 7) !== etat.mois) etat.mois = date.slice(0, 7);
    await rafraichir();
  };
}

function ouvrirRevenu(revenu) {
  const r = revenu || { libelle: '', montant: '', type: 'salaire', recurrent: true, mois: etat.mois + '-01', actif: true };

  const fond = ouvrirModale(revenu ? t('prof.editIncomeTitle') : t('prof.newIncomeTitle'), `
    <div class="ligne-champs">
      <div class="champ"><label for="vLibelle">${ech(t('common.label'))}</label><input id="vLibelle" maxlength="60" value="${ech(r.libelle)}"></div>
      <div class="champ"><label for="vMontant">${ech(t('common.amount'))}</label><input id="vMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(r.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="vType">${ech(t('common.nature'))}</label><select id="vType">${optionsTypeRevenu(r.type)}</select></div>
      <div class="champ"><label for="vRecurrent">${ech(t('prof.frequency'))}</label>
        <select id="vRecurrent"><option value="1" ${r.recurrent ? 'selected' : ''}>${ech(t('prof.recurring'))}</option><option value="0" ${r.recurrent ? '' : 'selected'}>${ech(t('prof.oneOff'))}</option></select>
      </div>
    </div>
    <div class="champ" id="blocMois" ${r.recurrent ? 'hidden' : ''}>
      <label for="vMois">${ech(t('prof.monthConcerned'))}</label>
      <input id="vMois" type="month" value="${ech((r.mois || etat.mois + '-01').slice(0, 7))}">
    </div>
    <label class="case" style="margin-bottom:16px"><input type="checkbox" id="vActif" ${r.actif ? 'checked' : ''}><span>${ech(t('prof.activeIncome'))}</span></label>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  const q = (s) => fond.querySelector(s);
  q('#vRecurrent').addEventListener('change', () => { q('#blocMois').hidden = q('#vRecurrent').value === '1'; });

  q('[data-valider]').onclick = async (e) => {
    const libelle = nettoyerLibelle(q('#vLibelle').value);
    const montant = montantValide(q('#vMontant').value);
    if (!libelle) return toast(t('common.labelRequired'), 'ko');
    if (montant === null || montant === 0) return toast(t('common.invalidAmount'), 'ko');

    const recurrent = q('#vRecurrent').value === '1';
    const donnees = {
      libelle, montant, type: q('#vType').value, recurrent,
      mois: recurrent ? null : `${q('#vMois').value}-01`,
      actif: q('#vActif').checked
    };

    e.target.disabled = true;
    const error = await ecrire('revenus', donnees, revenu?.id);
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(t('common.saved'));
    await rafraichir();
  };
}

function ouvrirMouvement(mouvement) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const m = mouvement || { libelle: '', montant: '', sens: 'depot', date: etat.mois === moisCourant() ? aujourdhui : etat.mois + '-15' };

  const fond = ouvrirModale(t('sav.movementTitle'), `
    <div class="ligne-champs">
      <div class="champ"><label for="eLibelle">${ech(t('common.label'))}</label><input id="eLibelle" maxlength="60" value="${ech(m.libelle || '')}"></div>
      <div class="champ"><label for="eMontant">${ech(t('common.amount'))}</label><input id="eMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(m.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="eSens">${ech(t('sav.type'))}</label>
        <select id="eSens">
          <option value="depot" ${m.sens === 'depot' ? 'selected' : ''}>${ech(t('sav.deposit'))}</option>
          <option value="retrait" ${m.sens === 'retrait' ? 'selected' : ''}>${ech(t('sav.withdrawal'))}</option>
        </select>
      </div>
      <div class="champ"><label for="eDate">${ech(t('common.date'))}</label><input id="eDate" type="date" value="${ech(m.date)}"></div>
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  const q = (s) => fond.querySelector(s);
  q('[data-valider]').onclick = async (e) => {
    const montant = montantValide(q('#eMontant').value);
    if (montant === null || montant === 0) return toast(t('common.invalidAmount'), 'ko');

    const donnees = {
      libelle: nettoyerLibelle(q('#eLibelle').value) || null,
      montant, sens: q('#eSens').value, date: q('#eDate').value
    };

    e.target.disabled = true;
    const error = await ecrire('epargne_mouvements', donnees, mouvement?.id);
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(t('common.saved'));
    await rafraichir();
  };
}

/* Corrige l'écart entre le solde calculé et le solde réel du compte :
   intérêts versés, retrait oublié, erreur de saisie. L'écart devient un
   mouvement daté, jamais une réécriture de l'historique. */
function ouvrirCorrectionSolde() {
  const { total } = etatEpargne();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dateDefaut = etat.mois === moisCourant() ? aujourdhui : `${etat.mois}-15`;

  const fond = ouvrirModale(t('sav.adjustTitle'), `
    <div class="kpi" style="margin-bottom:16px">
      <p class="label">${ech(t('sav.adjustCurrent'))}</p>
      <div class="kpi-valeur">${ech(euro(total))}</div>
    </div>
    <div class="ligne-champs">
      <div class="champ">
        <label for="cReel">${ech(t('sav.adjustReal'))}</label>
        <input id="cReel" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(total)}">
      </div>
      <div class="champ"><label for="cDate">${ech(t('common.date'))}</label><input id="cDate" type="date" value="${ech(dateDefaut)}"></div>
    </div>
    <p class="aide" id="cEcart" style="min-height:20px"></p>
    <p class="aide">${ech(t('sav.adjustHelp'))}</p>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  const q = (sel) => fond.querySelector(sel);

  const ecartCourant = () => {
    const reel = montantValide(q('#cReel').value);
    if (reel === null) return null;
    return Math.round((reel - total) * 100) / 100;
  };

  const afficherEcart = () => {
    const ecart = ecartCourant();
    const zone = q('#cEcart');
    if (ecart === null) { zone.textContent = t('common.invalidAmount'); return; }
    if (Math.abs(ecart) < 0.01) { zone.textContent = t('sav.adjustNone'); zone.style.color = 'var(--ardoise)'; return; }
    zone.textContent = t('sav.adjustGap', { m: (ecart > 0 ? '+ ' : '- ') + euro(Math.abs(ecart)) });
    zone.style.color = ecart > 0 ? 'var(--menthe)' : 'var(--corail)';
  };

  q('#cReel').addEventListener('input', afficherEcart);
  afficherEcart();

  q('[data-valider]').onclick = async (e) => {
    const ecart = ecartCourant();
    if (ecart === null) return toast(t('common.invalidAmount'), 'ko');
    if (Math.abs(ecart) < 0.01) { fermerModale(); return toast(t('sav.adjustNone'), 'neutre'); }

    const donnees = {
      libelle: ecart > 0 ? t('sav.adjustGain') : t('sav.adjustLoss'),
      montant: Math.abs(ecart),
      sens: ecart > 0 ? 'depot' : 'retrait',
      date: q('#cDate').value || aujourdhui
    };

    e.target.disabled = true;
    const error = await ecrire('epargne_mouvements', donnees);
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(t('sav.adjustDone'));
    await rafraichir();
  };
}

function ouvrirSoldeInitial() {
  const fond = ouvrirModale(t('sav.initial'), `
    <div class="champ">
      <label for="sInitial">${ech(t('sav.initial'))}</label>
      <input id="sInitial" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(etat.profil.epargne_initiale || 0)}">
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  fond.querySelector('[data-valider]').onclick = async (e) => {
    const montant = montantValide(fond.querySelector('#sInitial').value);
    if (montant === null) return toast(t('common.invalidAmount'), 'ko');
    e.target.disabled = true;
    const { error } = await sb.from('profiles').update({ epargne_initiale: montant }).eq('id', uid());
    e.target.disabled = false;
    if (error) console.error(error);
    if (error) return toast(messageErreur(error), 'ko');
    fermerModale();
    toast(t('common.saved'));
    await rafraichir();
  };
}

function ouvrirMotDePasse() {
  const fond = ouvrirModale(t('prof.changePassword'), `
    <div class="champ">
      <label for="mNouveau">${ech(t('prof.newPassword'))}</label>
      <input id="mNouveau" type="password" autocomplete="new-password" minlength="10" maxlength="72">
      <p class="aide">${ech(t('prof.passwordHelp'))}</p>
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-valider>${ech(t('common.save'))}</button>
    </div>`);

  fond.querySelector('[data-valider]').onclick = async (e) => {
    const valeur = fond.querySelector('#mNouveau').value;
    if (valeur.length < 10 || !/[a-zA-Z]/.test(valeur) || !/\d/.test(valeur)) return toast(t('prof.passwordWeak'), 'ko');
    e.target.disabled = true;
    const { error } = await sb.auth.updateUser({ password: valeur });
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');
    fermerModale();
    toast(t('prof.passwordUpdated'));
  };
}

/* ---------------------- Sélecteur de mois ---------------------- */

function ouvrirChoixMois() {
  let annee = Number(etat.mois.slice(0, 4));

  const grille = () => {
    const courant = moisCourant();
    return Array.from({ length: 12 }, (_, i) => {
      const cle = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const libelle = moisDepuisCle(cle).toLocaleDateString(document.documentElement.lang || 'fr', { month: 'short' });
      const classes = ['case-mois'];
      if (cle === etat.mois) classes.push('actif');
      if (cle === courant) classes.push('aujourdhui');
      return `<button class="${classes.join(' ')}" data-mois-cible="${cle}">${ech(libelle)}</button>`;
    }).join('');
  };

  const fond = ouvrirModale(t('common.chooseMonth'), `
    <div class="nav-annee">
      <button class="icone-btn" data-annee="-1" aria-label="-1">‹</button>
      <strong id="anneeCourante">${annee}</strong>
      <button class="icone-btn" data-annee="1" aria-label="+1">›</button>
    </div>
    <div class="grille-mois" id="grilleMois">${grille()}</div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>${ech(t('common.cancel'))}</button>
      <button class="btn btn-principal" data-aujourdhui>${ech(t('common.thisMonth'))}</button>
    </div>`);

  const rafraichirGrille = () => {
    fond.querySelector('#anneeCourante').textContent = annee;
    fond.querySelector('#grilleMois').innerHTML = grille();
    brancherGrille();
  };

  const brancherGrille = () => {
    fond.querySelectorAll('[data-mois-cible]').forEach((b) => {
      b.onclick = async () => {
        etat.mois = b.dataset.moisCible;
        fermerModale();
        await rafraichir();
      };
    });
  };

  fond.querySelectorAll('[data-annee]').forEach((b) => {
    b.onclick = () => { annee += Number(b.dataset.annee); rafraichirGrille(); };
  });
  fond.querySelector('[data-aujourdhui]').onclick = async () => {
    etat.mois = moisCourant();
    fermerModale();
    await rafraichir();
  };
  brancherGrille();
}

/* ---------------------- Devise ---------------------- */

async function changerDevise(nouvelle) {
  const ancienne = deviseCourante();
  if (nouvelle === ancienne) return;

  const nbLignes = etat.charges.length + etat.revenus.length + etat.depenses.length + etat.epargne.length;

  /* Retour à la devise précédente : on réutilise l'inverse exact du taux
     appliqué à l'aller, pour retrouver les montants d'origine au centime. */
  const memo = etat.profil.derniere_conversion || null;
  const retourEnArriere = Boolean(memo && memo.de === nouvelle && memo.vers === ancienne && Number(memo.taux));

  let taux = null;
  if (retourEnArriere) {
    taux = 1 / Number(memo.taux);
  } else {
    try {
      taux = await tauxChange(ancienne, nouvelle);
    } catch (erreur) {
      console.warn(erreur);
    }
  }

  const appliquer = async (convertir) => {
    const memoire = convertir && taux && !retourEnArriere ? { de: ancienne, vers: nouvelle, taux } : null;
    await sb.from('profiles').update({ devise: nouvelle, derniere_conversion: memoire }).eq('id', uid());
    etat.profil.derniere_conversion = memoire;
    setDevise(nouvelle);

    if (convertir && taux) {
      const conv = (v) => Math.round(Number(v) * taux * 100) / 100;
      await Promise.all([
        ...etat.charges.map((c) => sb.from('charges').update({ montant: conv(c.montant) }).eq('id', c.id)),
        ...etat.revenus.map((r) => sb.from('revenus').update({ montant: conv(r.montant) }).eq('id', r.id)),
        ...etat.depenses.map((d) => sb.from('depenses').update({ montant: conv(d.montant) }).eq('id', d.id)),
        ...etat.epargne.map((m) => sb.from('epargne_mouvements').update({ montant: conv(m.montant) }).eq('id', m.id)),
        sb.from('profiles').update({
          objectif_epargne: conv(etat.profil.objectif_epargne || 0),
          epargne_initiale: conv(etat.profil.epargne_initiale || 0)
        }).eq('id', uid())
      ]);
      toast(t('prof.converted'));
    }
    fermerModale();
    await rafraichir();
  };

  if (!taux) {
    toast(t('prof.rateError'), 'ko');
    return appliquer(false);
  }

  const fond = ouvrirModale(t('prof.convertTitle'), `
    <p>${ech(t('prof.convertText', { a: ancienne, b: nouvelle, t: taux < 0.01 ? taux.toExponential(3) : taux.toFixed(4), n: nbLignes }))}</p>
    ${retourEnArriere ? `<div class="alerte alerte-ok">${ech(t('prof.backToOrigin'))}</div>` : ''}
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-non>${ech(t('prof.convertNo'))}</button>
      <button class="btn btn-principal" data-oui>${ech(t('prof.convertYes'))}</button>
    </div>`);
  fond.querySelector('[data-non]').onclick = () => appliquer(false);
  fond.querySelector('[data-oui]').onclick = (e) => { e.target.disabled = true; appliquer(true); };
}

/* ====================== Exports ====================== */

function exporter(quoi) {
  if (quoi === 'charges') {
    return telechargerCSV(`ctrl-budget-charges-${etat.mois}.csv`, versCSV([
      { titre: t('common.label'), valeur: (c) => c.libelle },
      { titre: t('common.amount'), valeur: (c) => c.montant },
      { titre: t('common.nature'), valeur: (c) => libelleNature(c.nature) },
      { titre: t('common.category'), valeur: (c) => categorie(c.categorie).libelle },
      { titre: t('charges.debitDay'), valeur: (c) => c.jour_prelevement || '' },
      { titre: t('charges.start'), valeur: (c) => c.date_debut || '' },
      { titre: t('charges.end'), valeur: (c) => c.date_fin || '' }
    ], etat.charges));
  }

  if (quoi === 'depenses') {
    const lignes = etat.depenses.filter((d) => d.date.slice(0, 7) === etat.mois);
    return telechargerCSV(`ctrl-budget-depenses-${etat.mois}.csv`, versCSV([
      { titre: t('common.date'), valeur: (d) => d.date },
      { titre: t('common.label'), valeur: (d) => d.libelle },
      { titre: t('common.amount'), valeur: (d) => d.montant },
      { titre: t('common.category'), valeur: (d) => categorie(d.categorie).libelle }
    ], lignes));
  }

  const tout = [
    ...etat.revenus.map((r) => ({ type: t('prof.income'), date: r.mois || '-', libelle: r.libelle, montant: r.montant, detail: libelleTypeRevenu(r.type) })),
    ...etat.charges.map((c) => ({ type: t('nav.charges'), date: c.date_fin || '-', libelle: c.libelle, montant: c.montant, detail: libelleNature(c.nature) })),
    ...etat.depenses.map((d) => ({ type: t('nav.expenses'), date: d.date, libelle: d.libelle, montant: d.montant, detail: categorie(d.categorie).libelle })),
    ...etat.epargne.map((m) => ({ type: t('nav.savings'), date: m.date, libelle: m.libelle || '-', montant: m.montant, detail: m.sens === 'retrait' ? t('sav.withdrawal') : t('sav.deposit') }))
  ];

  telechargerCSV('ctrl-budget-mes-donnees.csv', versCSV([
    { titre: 'Type', valeur: (l) => l.type },
    { titre: t('common.date'), valeur: (l) => l.date },
    { titre: t('common.label'), valeur: (l) => l.libelle },
    { titre: t('common.amount'), valeur: (l) => l.montant },
    { titre: t('common.nature'), valeur: (l) => l.detail }
  ], tout));
}

async function supprimerCompte() {
  const ok = await confirmer(t('prof.deleteTitle'), t('prof.deleteText'), t('prof.deleteConfirm'));
  if (!ok) return;
  const { error } = await sb.rpc('supprimer_mon_compte');
  if (error) {
    console.error(error);
    return toast(t('prof.deleteFailed'), 'ko');
  }
  await sb.auth.signOut();
  location.replace('/?compte=supprime');
}

/* ====================== Branchement ====================== */

function brancher() {
  const trouver = (liste, id) => liste.find((x) => String(x.id) === id);

  vue.querySelectorAll('[data-mois]').forEach((b) => {
    b.onclick = async () => {
      etat.mois = Number(b.dataset.mois) > 0 ? moisSuivant(etat.mois) : moisPrecedent(etat.mois);
      await rafraichir();
    };
  });

  const choix = vue.querySelector('[data-choisir-mois]');
  if (choix) choix.onclick = ouvrirChoixMois;

  const retourMois = vue.querySelector('[data-mois-courant]');
  if (retourMois) retourMois.onclick = async () => { etat.mois = moisCourant(); await rafraichir(); };

  vue.querySelectorAll('[data-filtre]').forEach((b) => {
    b.onclick = () => { etat.filtreNature = b.dataset.filtre; rendre(); };
  });

  const brancherUn = (selecteur, action) => {
    const el = vue.querySelector(selecteur);
    if (el) el.onclick = action;
  };

  brancherUn('[data-nouvelle-charge]', () => ouvrirCharge(null));
  brancherUn('[data-nouvelle-depense]', () => ouvrirDepense(null));
  brancherUn('[data-nouveau-revenu]', () => ouvrirRevenu(null));
  brancherUn('[data-nouveau-mouvement]', () => ouvrirMouvement(null));
  brancherUn('[data-solde-initial]', ouvrirSoldeInitial);
  brancherUn('[data-corriger-solde]', ouvrirCorrectionSolde);
  brancherUn('[data-changer-mdp]', ouvrirMotDePasse);
  brancherUn('[data-supprimer-compte]', supprimerCompte);

  vue.querySelectorAll('[data-modifier-charge]').forEach((b) => { b.onclick = () => ouvrirCharge(trouver(etat.charges, b.dataset.modifierCharge)); });
  vue.querySelectorAll('[data-modifier-depense]').forEach((b) => { b.onclick = () => ouvrirDepense(trouver(etat.depenses, b.dataset.modifierDepense)); });
  vue.querySelectorAll('[data-modifier-revenu]').forEach((b) => { b.onclick = () => ouvrirRevenu(trouver(etat.revenus, b.dataset.modifierRevenu)); });
  vue.querySelectorAll('[data-modifier-mouvement]').forEach((b) => { b.onclick = () => ouvrirMouvement(trouver(etat.epargne, b.dataset.modifierMouvement)); });

  vue.querySelectorAll('[data-supprimer-charge]').forEach((b) => {
    b.onclick = async () => {
      const charge = trouver(etat.charges, b.dataset.supprimerCharge);
      if (!await confirmer(t('charges.deleteTitle'), t('charges.deleteText', { l: charge.libelle }), t('common.delete'))) return;
      const { error } = await sb.from('charges').delete().eq('id', charge.id);
      if (error) return toast(messageErreur(error), 'ko');
      toast(t('common.deleted'));
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-supprimer-depense]').forEach((b) => {
    b.onclick = async () => {
      const { error } = await sb.from('depenses').delete().eq('id', b.dataset.supprimerDepense);
      if (error) return toast(messageErreur(error), 'ko');
      toast(t('common.deleted'));
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-supprimer-revenu]').forEach((b) => {
    b.onclick = async () => {
      const revenu = trouver(etat.revenus, b.dataset.supprimerRevenu);
      if (!await confirmer(t('prof.deleteIncome'), t('prof.deleteIncomeText', { l: revenu.libelle }), t('common.delete'))) return;
      const { error } = await sb.from('revenus').delete().eq('id', revenu.id);
      if (error) return toast(messageErreur(error), 'ko');
      toast(t('common.deleted'));
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-supprimer-mouvement]').forEach((b) => {
    b.onclick = async () => {
      const { error } = await sb.from('epargne_mouvements').delete().eq('id', b.dataset.supprimerMouvement);
      if (error) return toast(messageErreur(error), 'ko');
      toast(t('common.deleted'));
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-export]').forEach((b) => { b.onclick = () => exporter(b.dataset.export); });

  vue.querySelectorAll('[data-deconnexion]').forEach((b) => {
    b.onclick = async () => { b.disabled = true; await deconnexion(); };
  });

  const langue = vue.querySelector('#rgLangue');
  if (langue) langue.onchange = async () => {
    setLangue(langue.value);
    await sb.from('profiles').update({ langue: langue.value }).eq('id', uid());
    etat.profil.langue = langue.value;
    rendre();
    toast(t('common.saved'));
  };

  const devise = vue.querySelector('#rgDevise');
  if (devise) devise.onchange = () => changerDevise(devise.value);

  brancherUn('[data-enregistrer-profil]', async (e) => {
    const prenom = nettoyerLibelle(vue.querySelector('#rgPrenom').value).slice(0, 40);
    const objectif = montantValide(vue.querySelector('#rgObjectif').value) || 0;
    e.target.disabled = true;
    const { error } = await sb.from('profiles').upsert({ id: uid(), prenom: prenom || null, objectif_epargne: objectif, onboarding_done: true });
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');
    toast(t('common.saved'));
    await rafraichir();
  });
}

/* ====================== Démarrage ====================== */

document.querySelectorAll('.onglet').forEach((b) => {
  b.onclick = () => { etat.onglet = b.dataset.vue; etat.filtreNature = 'tout'; rendre(); window.scrollTo({ top: 0 }); };
});

document.getElementById('btnProfil').onclick = () => {
  etat.onglet = 'reglages';
  rendre();
  window.scrollTo({ top: 0 });
};
document.getElementById('btnAjoutRapide').onclick = () => ouvrirDepense(null);

document.addEventListener('keydown', (e) => {
  const saisie = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (!saisie && e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !document.querySelector('.modale-fond')) {
    e.preventDefault();
    ouvrirDepense(null);
  }
});

(async () => {
  etat.session = await sessionRequise();
  if (!etat.session) return;

  document.getElementById('avatar').textContent = (etat.session.user.email || '?')[0].toUpperCase();

  if (!await charger()) return;
  if (!etat.profil.onboarding_done) return location.replace('/onboarding.html');

  if (etat.profil.prenom) document.getElementById('avatar').textContent = etat.profil.prenom[0].toUpperCase();
  rendre();
})();
