import { sb, sessionRequise, deconnexion, messageErreur } from './supabase.js';
import { toast, ech, ouvrirModale, fermerModale, confirmer } from './ui.js';
import {
  CATEGORIES, NATURES, TYPES_REVENU, deviner, euro, euroArrondi, pourcent, dateFr,
  cleMois, libelleMois, libelleMoisCourt, moisPrecedent, joursDuMois, mensualitesRestantes,
  synthese, cumulParJour, repartition, chargesDuMois, revenusDuMois, somme,
  montantValide, nettoyerLibelle, versCSV, telechargerCSV
} from './helpers.js';
import { courbeComparaison, donut, barres } from './charts.js';

const vue = document.getElementById('vue');

const etat = {
  session: null,
  profil: null,
  charges: [],
  revenus: [],
  depenses: [],
  mois: cleMois(new Date()),
  onglet: 'tableau',
  filtreNature: 'tout'
};

/* ====================== Chargement des données ====================== */

async function charger() {
  const uid = etat.session.user.id;
  const debut = moisPrecedent(etat.mois, 11) + '-01';

  const [profil, charges, revenus, depenses] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('charges').select('*').order('montant', { ascending: false }),
    sb.from('revenus').select('*').order('montant', { ascending: false }),
    sb.from('depenses').select('*').gte('date', debut).order('date', { ascending: false })
  ]);

  if (charges.error || revenus.error || depenses.error) {
    console.error(charges.error || revenus.error || depenses.error);
    toast('Impossible de charger vos données. Rechargez la page.', 'ko');
    return false;
  }

  etat.profil = profil.data || { prenom: null, objectif_epargne: 0, onboarding_done: false };
  etat.charges = charges.data || [];
  etat.revenus = revenus.data || [];
  etat.depenses = depenses.data || [];
  return true;
}

/* ====================== Rendu ====================== */

function rendre() {
  document.querySelectorAll('.onglet').forEach((b) => {
    if (b.dataset.vue === etat.onglet) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const vues = { tableau: vueTableau, charges: vueCharges, depenses: vueDepenses, credits: vueCredits, reglages: vueReglages };
  vue.innerHTML = `<div class="conteneur">${vues[etat.onglet]()}</div>`;
  brancher();
}

function selecteurMois() {
  return `
  <div class="selecteur-mois">
    <button data-mois="-1" aria-label="Mois précédent">‹</button>
    <strong>${ech(libelleMois(etat.mois))}</strong>
    <button data-mois="1" aria-label="Mois suivant">›</button>
  </div>`;
}

function titrePage(titre, sousTitre, droite = '') {
  return `<div class="app-titre">
    <div><h1>${ech(titre)}</h1><p>${ech(sousTitre)}</p></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${droite}</div>
  </div>`;
}

/* ---------------------- Vue : tableau de bord ---------------------- */

function vueTableau() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const moisM1 = moisPrecedent(etat.mois);
  const sM1 = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: moisM1 });

  const base = Math.max(s.totalRevenus, s.totalCharges + s.totalDepenses, 1);
  const pcCharges = (s.totalCharges / base) * 100;
  const pcDepenses = (s.totalDepenses / base) * 100;
  const pcReste = Math.max(0, 100 - pcCharges - pcDepenses);
  const pcJour = (s.jour / s.nbJours) * 100;

  const evolution = sM1.totalDepenses > 0 ? ((s.totalDepenses - sM1.totalDepenses) / sM1.totalDepenses) * 100 : null;
  const bonjour = etat.profil.prenom ? `Bonjour ${etat.profil.prenom}` : 'Votre mois';

  const parts = repartition([...s.chargesMois, ...s.depensesMois]);
  const historique = [];
  for (let i = 5; i >= 0; i--) {
    const cle = moisPrecedent(etat.mois, i);
    const sm = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle });
    historique.push({ libelle: libelleMoisCourt(cle), valeur: sm.totalDepenses, actif: i === 0 });
  }

  return `
  ${titrePage(bonjour, `Mise à jour permanente de votre reste à vivre`, selecteurMois())}

  ${alertes(s, sM1)}

  <div class="carte" style="margin-bottom:16px">
    <div class="regle-entete">
      <div>
        <p class="label">Reste réel après dépenses</p>
        <div class="regle-total" style="color:${s.resteReel >= 0 ? 'var(--menthe)' : 'var(--corail)'}">${ech(euro(s.resteReel))}</div>
      </div>
      ${evolution === null ? '' : `<span class="evolution ${evolution > 3 ? 'hausse' : evolution < -3 ? 'baisse' : 'neutre'}">${evolution > 0 ? '▲' : '▼'} ${ech(pourcent(Math.abs(evolution)))} de dépenses vs ${ech(libelleMoisCourt(moisM1))}</span>`}
    </div>
    <div class="barre">
      <div class="barre-seg seg-charges" style="width:${pcCharges.toFixed(1)}%"></div>
      <div class="barre-seg seg-depenses" style="width:${pcDepenses.toFixed(1)}%"></div>
      <div class="barre-seg seg-reste" style="width:${pcReste.toFixed(1)}%"></div>
      ${s.moisEnCours ? `<div class="barre-curseur" style="left:${pcJour.toFixed(1)}%" data-jour="jour ${s.jour}"></div>` : ''}
    </div>
    <div class="legende">
      <span><i class="pastille" style="background:var(--encre)"></i> Charges fixes ${ech(euroArrondi(s.totalCharges))}</span>
      <span><i class="pastille" style="background:#6f86b8"></i> Dépensé ${ech(euroArrondi(s.totalDepenses))}</span>
      <span><i class="pastille" style="background:var(--menthe-fond);border:1px solid var(--ligne)"></i> Reste ${ech(euroArrondi(Math.max(0, s.resteReel)))}</span>
    </div>
  </div>

  <div class="grille grille-4" style="margin-bottom:16px">
    <div class="kpi"><p class="label">Entrées du mois</p><div class="kpi-valeur">${ech(euro(s.totalRevenus))}</div><p class="kpi-detail">${s.revenusMois.length} ligne${s.revenusMois.length > 1 ? 's' : ''}</p></div>
    <div class="kpi"><p class="label">Charges fixes</p><div class="kpi-valeur">${ech(euro(s.totalCharges))}</div><p class="kpi-detail">dont ${ech(euroArrondi(s.totalCredits))} de crédits</p></div>
    <div class="kpi"><p class="label">Dépenses courantes</p><div class="kpi-valeur">${ech(euro(s.totalDepenses))}</div><p class="kpi-detail">${s.depensesMois.length} saisie${s.depensesMois.length > 1 ? 's' : ''}</p></div>
    <div class="kpi ${s.resteAVivre >= 0 ? 'kpi-vert' : 'kpi-rouge'}"><p class="label">Reste à vivre</p><div class="kpi-valeur">${ech(euro(s.resteAVivre))}</div><p class="kpi-detail">avant dépenses courantes</p></div>
  </div>

  ${s.moisEnCours ? `
  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="carte">
      <p class="label">Budget restant par jour</p>
      <div class="kpi-valeur" style="color:${s.budgetJournalier >= 0 ? 'var(--encre)' : 'var(--corail)'}">${ech(euro(s.budgetJournalier))}</div>
      <p class="kpi-detail">Pour tenir jusqu'au ${s.nbJours} ${ech(libelleMois(etat.mois))}, il vous reste ${s.nbJours - s.jour + 1} jour${s.nbJours - s.jour + 1 > 1 ? 's' : ''}.</p>
    </div>
    <div class="carte">
      <p class="label">Projection de fin de mois</p>
      <div class="kpi-valeur" style="color:${s.projection <= s.resteAVivre ? 'var(--menthe)' : 'var(--corail)'}">${ech(euro(s.projection))}</div>
      <p class="kpi-detail">Au rythme de ${ech(euro(s.rythme))} par jour depuis le 1er.</p>
    </div>
  </div>` : ''}

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>Dépenses cumulées, ${ech(libelleMoisCourt(etat.mois))} contre ${ech(libelleMoisCourt(moisM1))}</h3></div>
    ${courbeComparaison(
      cumulParJour(etat.depenses, etat.mois).slice(0, s.moisEnCours ? s.jour : joursDuMois(etat.mois)),
      cumulParJour(etat.depenses, moisM1),
      { labelActuel: libelleMois(etat.mois), labelPrecedent: libelleMois(moisM1) }
    )}
  </div>

  <div class="grille grille-2" style="margin-bottom:16px">
    <div class="carte">
      <div class="carte-titre"><h3>Où part votre argent</h3></div>
      ${parts.length ? donut(parts, parts.reduce((t, p) => t + p.montant, 0)) : videHtml('Rien à répartir', 'Ajoutez vos charges pour voir la répartition.')}
    </div>
    <div class="carte">
      <div class="carte-titre"><h3>Prochains prélèvements</h3></div>
      ${prochainsPrelevements(s)}
    </div>
  </div>

  <div class="carte">
    <div class="carte-titre"><h3>Dépenses courantes des 6 derniers mois</h3></div>
    ${barres(historique, { description: 'Dépenses courantes par mois' })}
  </div>`;
}

function alertes(s, sM1) {
  const blocs = [];

  if (s.resteReel < 0) {
    blocs.push(`<div class="alerte alerte-danger">Vous avez dépassé votre budget de ${ech(euro(Math.abs(s.resteReel)))} ce mois-ci. Regardez la répartition pour trouver le poste responsable.</div>`);
  } else if (s.moisEnCours && s.projection > s.resteAVivre && s.resteAVivre > 0) {
    blocs.push(`<div class="alerte alerte-attention">À ce rythme, vous finirez le mois avec ${ech(euro(s.projection - s.resteAVivre))} de trop. Il faudrait rester sous ${ech(euro(s.budgetJournalier))} par jour.</div>`);
  } else if (s.moisEnCours && sM1.totalDepenses > 0 && s.totalDepenses < sM1.totalDepenses * 0.85) {
    blocs.push(`<div class="alerte alerte-ok">Vous dépensez moins vite que le mois dernier. Continuez comme ça.</div>`);
  }

  if (s.tauxEndettement > 35) {
    blocs.push(`<div class="alerte alerte-attention">Vos crédits pèsent ${ech(pourcent(s.tauxEndettement))} de vos entrées, au dessus du seuil de 35 % retenu par les banques.</div>`);
  }

  const bientot = s.chargesMois.filter((c) => {
    const n = mensualitesRestantes(etat.mois, c.date_fin);
    return n !== null && n <= 3;
  });
  if (bientot.length) {
    const libere = somme(bientot);
    blocs.push(`<div class="alerte alerte-info">${bientot.length} charge${bientot.length > 1 ? 's se terminent' : ' se termine'} dans les 3 mois : ${ech(bientot.map((c) => c.libelle).join(', '))}. Cela libérera ${ech(euro(libere))} par mois.</div>`);
  }

  return blocs.join('');
}

function prochainsPrelevements(s) {
  const jourActuel = s.moisEnCours ? s.jour : 1;
  const liste = s.chargesMois
    .filter((c) => c.jour_prelevement)
    .sort((a, b) => a.jour_prelevement - b.jour_prelevement)
    .filter((c) => c.jour_prelevement >= jourActuel)
    .slice(0, 6);

  if (!liste.length) return videHtml('Aucun prélèvement à venir', 'Renseignez le jour de prélèvement de vos charges pour les voir arriver.');

  const total = somme(liste);
  return `<ul class="liste">
    ${liste.map((c) => `
      <li class="ligne-item">
        <span class="ligne-nom">${ech(c.libelle)}<span class="ligne-meta">le ${c.jour_prelevement} ${ech(libelleMoisCourt(etat.mois))}</span></span>
        <span class="ligne-montant">${ech(euro(c.montant))}</span>
      </li>`).join('')}
  </ul>
  <p class="aide" style="margin-top:14px">Total à venir d'ici la fin du mois : <strong>${ech(euro(total))}</strong></p>`;
}

function videHtml(titre, texte) {
  return `<div class="vide"><strong>${ech(titre)}</strong>${ech(texte)}</div>`;
}

/* ---------------------- Vue : charges fixes ---------------------- */

function vueCharges() {
  const duMois = chargesDuMois(etat.charges, etat.mois);
  const filtrees = etat.filtreNature === 'tout' ? duMois : duMois.filter((c) => c.nature === etat.filtreNature);
  const total = somme(filtrees);

  const puces = ['tout', ...Object.keys(NATURES)].map((cle) => {
    const libelle = cle === 'tout' ? 'Toutes' : NATURES[cle].libelle;
    const montant = cle === 'tout' ? somme(duMois) : somme(duMois.filter((c) => c.nature === cle));
    return `<button class="puce" data-filtre="${cle}" aria-pressed="${etat.filtreNature === cle}">${ech(libelle)} · ${ech(euroArrondi(montant))}</button>`;
  }).join('');

  return `
  ${titrePage('Charges fixes', 'Tout ce qui part chaque mois, classé par nature', `
    ${selecteurMois()}
    <button class="btn btn-secondaire btn-sm" data-export="charges">Exporter</button>
    <button class="btn btn-principal btn-sm" data-nouvelle-charge>+ Charge</button>`)}

  <div class="filtres">${puces}</div>

  <div class="carte">
    <div class="carte-titre">
      <h3>${filtrees.length} charge${filtrees.length > 1 ? 's' : ''}</h3>
      <span class="montant" style="font-weight:700;font-size:1.15rem">${ech(euro(total))}</span>
    </div>
    ${filtrees.length ? `<ul class="liste">${filtrees.map(ligneCharge).join('')}</ul>`
      : videHtml('Aucune charge ici', 'Changez de filtre ou ajoutez une charge avec le bouton en haut.')}
  </div>`;
}

function ligneCharge(c) {
  const restantes = mensualitesRestantes(etat.mois, c.date_fin);
  const meta = [
    CATEGORIES[c.categorie]?.libelle || 'Autre',
    c.jour_prelevement ? `le ${c.jour_prelevement}` : null,
    c.date_fin ? `fin ${dateFr(c.date_fin)}${restantes !== null ? ` · ${restantes} mensualité${restantes > 1 ? 's' : ''}` : ''}` : null
  ].filter(Boolean).join(' · ');

  return `
  <li class="ligne-item">
    <span class="ligne-nom">
      ${ech(c.libelle)}
      <span class="tag ${NATURES[c.nature]?.classe || 'tag-fixe'}">${ech(NATURES[c.nature]?.libelle || 'Charge fixe')}</span>
      <span class="ligne-meta">${ech(meta)}</span>
    </span>
    <span class="ligne-montant">${ech(euro(c.montant))}</span>
    <span class="actions-ligne">
      <button class="icone-btn" data-modifier-charge="${ech(c.id)}" aria-label="Modifier ${ech(c.libelle)}">✎</button>
      <button class="icone-btn" data-supprimer-charge="${ech(c.id)}" aria-label="Supprimer ${ech(c.libelle)}">🗑</button>
    </span>
  </li>`;
}

/* ---------------------- Vue : dépenses ---------------------- */

function vueDepenses() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const parJour = new Map();
  s.depensesMois.forEach((d) => {
    if (!parJour.has(d.date)) parJour.set(d.date, []);
    parJour.get(d.date).push(d);
  });

  const jours = [...parJour.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return `
  ${titrePage('Dépenses du quotidien', 'Courses, essence, sorties, imprévus', `
    ${selecteurMois()}
    <button class="btn btn-secondaire btn-sm" data-export="depenses">Exporter</button>
    <button class="btn btn-principal btn-sm" data-nouvelle-depense>+ Dépense</button>`)}

  <div class="grille grille-3" style="margin-bottom:18px">
    <div class="kpi"><p class="label">Dépensé ce mois</p><div class="kpi-valeur">${ech(euro(s.totalDepenses))}</div></div>
    <div class="kpi ${s.resteReel >= 0 ? 'kpi-vert' : 'kpi-rouge'}"><p class="label">Reste réel</p><div class="kpi-valeur">${ech(euro(s.resteReel))}</div></div>
    <div class="kpi"><p class="label">Moyenne par jour</p><div class="kpi-valeur">${ech(euro(s.rythme))}</div></div>
  </div>

  ${jours.length ? jours.map(([date, lignes]) => `
    <div class="carte" style="margin-bottom:12px">
      <div class="carte-titre">
        <h3 style="font-size:.95rem;color:var(--ardoise)">${ech(dateFr(date))}</h3>
        <span class="montant" style="font-weight:700">${ech(euro(somme(lignes)))}</span>
      </div>
      <ul class="liste">
        ${lignes.map((d) => `
          <li class="ligne-item">
            <span class="ligne-nom">${ech(CATEGORIES[d.categorie]?.emoji || '📦')} ${ech(d.libelle)}<span class="ligne-meta">${ech(CATEGORIES[d.categorie]?.libelle || 'Autre')}</span></span>
            <span class="ligne-montant">${ech(euro(d.montant))}</span>
            <span class="actions-ligne">
              <button class="icone-btn" data-modifier-depense="${ech(d.id)}" aria-label="Modifier">✎</button>
              <button class="icone-btn" data-supprimer-depense="${ech(d.id)}" aria-label="Supprimer">🗑</button>
            </span>
          </li>`).join('')}
      </ul>
    </div>`).join('')
    : `<div class="carte">${videHtml('Aucune dépense saisie', 'Ajoutez votre première dépense du mois, le reste à vivre se met à jour aussitôt.')}</div>`}`;
}

/* ---------------------- Vue : crédits ---------------------- */

function vueCredits() {
  const s = synthese({ charges: etat.charges, revenus: etat.revenus, depenses: etat.depenses, cle: etat.mois });
  const credits = s.chargesMois.filter((c) => c.nature === 'credit');
  const avecFin = credits.filter((c) => c.date_fin);
  const capitalRestant = avecFin.reduce((t, c) => t + c.montant * (mensualitesRestantes(etat.mois, c.date_fin) || 0), 0);

  const liberations = avecFin
    .map((c) => ({ ...c, fin: c.date_fin.slice(0, 7) }))
    .sort((a, b) => (a.fin < b.fin ? -1 : 1));

  return `
  ${titrePage('Crédits et engagements', 'Ce qui vous reste à payer, et quand cela s\'arrête', selecteurMois())}

  <div class="grille grille-3" style="margin-bottom:18px">
    <div class="kpi"><p class="label">Mensualités du mois</p><div class="kpi-valeur">${ech(euro(s.totalCredits))}</div><p class="kpi-detail">${credits.length} crédit${credits.length > 1 ? 's' : ''} en cours</p></div>
    <div class="kpi"><p class="label">Reste à rembourser estimé</p><div class="kpi-valeur">${ech(euro(capitalRestant))}</div><p class="kpi-detail">${avecFin.length < credits.length ? 'Hors crédits sans date de fin' : 'Sur la base des dates de fin'}</p></div>
    <div class="kpi ${s.tauxEndettement > 35 ? 'kpi-rouge' : ''}"><p class="label">Taux d'endettement</p><div class="kpi-valeur">${ech(pourcent(s.tauxEndettement))}</div><p class="kpi-detail">Seuil bancaire courant : 35 %</p></div>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>Vos crédits</h3></div>
    ${credits.length ? `<ul class="liste">${credits.map((c) => {
      const n = mensualitesRestantes(etat.mois, c.date_fin);
      return `
      <li class="ligne-item">
        <span class="ligne-nom">${ech(c.libelle)}
          <span class="ligne-meta">${c.date_fin ? `${n} mensualité${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}, jusqu'au ${ech(dateFr(c.date_fin))}` : 'Durée non renseignée'}</span>
        </span>
        <span class="ligne-montant">${ech(euro(c.montant))}${c.date_fin ? `<span class="ligne-meta" style="display:block;text-align:right">reste ${ech(euroArrondi(c.montant * n))}</span>` : ''}</span>
        <span class="actions-ligne"><button class="icone-btn" data-modifier-charge="${ech(c.id)}" aria-label="Modifier">✎</button></span>
      </li>`;
    }).join('')}</ul>` : videHtml('Aucun crédit enregistré', 'Une charge devient un crédit quand vous choisissez la nature « Crédit ».')}
  </div>

  ${liberations.length ? `
  <div class="carte">
    <div class="carte-titre"><h3>Budget libéré à la fin de chaque crédit</h3></div>
    <ul class="liste">
      ${liberations.map((c) => `
        <li class="ligne-item">
          <span class="ligne-nom">${ech(libelleMois(c.fin))}<span class="ligne-meta">fin de ${ech(c.libelle)}</span></span>
          <span class="ligne-montant" style="color:var(--menthe)">+ ${ech(euro(c.montant))} par mois</span>
        </li>`).join('')}
    </ul>
    <p class="aide" style="margin-top:14px">Une fois ces crédits terminés, votre reste à vivre augmentera de ${ech(euro(somme(liberations)))} par mois.</p>
  </div>` : ''}`;
}

/* ---------------------- Vue : réglages ---------------------- */

function vueReglages() {
  const revenus = etat.revenus;
  return `
  ${titrePage('Mon profil', 'Votre compte, vos entrées d\'argent et vos données')}

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>Compte</h3></div>
    <div class="ligne-item" style="border:none;padding-top:0">
      <span class="ligne-nom">${ech(etat.session.user.email)}<span class="ligne-meta">Connecté${etat.profil.prenom ? ' en tant que ' + ech(etat.profil.prenom) : ''}</span></span>
      <span class="actions-ligne"><button class="btn btn-secondaire btn-sm" data-deconnexion>Se déconnecter</button></span>
    </div>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre">
      <h3>Entrées d'argent</h3>
      <button class="btn btn-principal btn-sm" data-nouveau-revenu>+ Entrée</button>
    </div>
    ${revenus.length ? `<ul class="liste">${revenus.map((r) => `
      <li class="ligne-item">
        <span class="ligne-nom">${ech(r.libelle)}<span class="ligne-meta">${ech(TYPES_REVENU[r.type] || 'Autre entrée')} · ${r.recurrent ? 'tous les mois' : 'ponctuel ' + ech((r.mois || '').slice(0, 7))}${r.actif ? '' : ' · désactivée'}</span></span>
        <span class="ligne-montant">${ech(euro(r.montant))}</span>
        <span class="actions-ligne">
          <button class="icone-btn" data-modifier-revenu="${ech(r.id)}" aria-label="Modifier">✎</button>
          <button class="icone-btn" data-supprimer-revenu="${ech(r.id)}" aria-label="Supprimer">🗑</button>
        </span>
      </li>`).join('')}</ul>` : videHtml('Aucune entrée', 'Ajoutez votre salaire pour calculer le reste à vivre.')}
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>Profil</h3></div>
    <div class="ligne-champs">
      <div class="champ"><label for="rgPrenom">Prénom</label><input id="rgPrenom" maxlength="40" value="${ech(etat.profil.prenom || '')}"></div>
      <div class="champ"><label for="rgObjectif">Objectif d'épargne mensuel</label><input id="rgObjectif" type="number" step="0.01" min="0" value="${ech(etat.profil.objectif_epargne || 0)}"></div>
    </div>
    <button class="btn btn-secondaire" data-enregistrer-profil>Enregistrer</button>
  </div>

  <div class="carte" style="margin-bottom:16px">
    <div class="carte-titre"><h3>Sécurité</h3></div>
    <p class="aide" style="margin-bottom:14px">Votre mot de passe est stocké sous forme chiffrée par notre prestataire d'authentification, il n'est lisible par personne, pas même par l'éditeur du site.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-principal" data-changer-mdp>Changer de mot de passe</button>
      <button class="btn btn-secondaire" data-deconnexion>Se déconnecter</button>
    </div>
  </div>

  <div class="carte">
    <div class="carte-titre"><h3>Vos données</h3></div>
    <p class="aide" style="margin-bottom:14px">Conformément au RGPD, vous pouvez récupérer vos données à tout moment et supprimer définitivement votre compte.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-secondaire" data-export="tout">Exporter toutes mes données</button>
      <button class="btn btn-danger" data-supprimer-compte>Supprimer mon compte</button>
    </div>
  </div>`;
}

/* ====================== Formulaires ====================== */

function formulaireCharge(charge) {
  const c = charge || { libelle: '', montant: '', nature: 'fixe', categorie: 'autre', jour_prelevement: '', date_fin: '', actif: true };
  return `
  <div class="ligne-champs">
    <div class="champ"><label for="fLibelle">Libellé</label><input id="fLibelle" maxlength="60" value="${ech(c.libelle)}" placeholder="Prêt voiture"></div>
    <div class="champ"><label for="fMontant">Montant mensuel</label><input id="fMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(c.montant)}"></div>
  </div>
  <div class="ligne-champs">
    <div class="champ"><label for="fNature">Nature</label>
      <select id="fNature">${Object.entries(NATURES).map(([k, v]) => `<option value="${k}" ${c.nature === k ? 'selected' : ''}>${ech(v.libelle)}</option>`).join('')}</select>
    </div>
    <div class="champ"><label for="fCategorie">Catégorie</label>
      <select id="fCategorie">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${c.categorie === k ? 'selected' : ''}>${ech(v.emoji + ' ' + v.libelle)}</option>`).join('')}</select>
    </div>
  </div>
  <div class="ligne-champs">
    <div class="champ"><label for="fJour">Jour de prélèvement</label><input id="fJour" type="number" min="1" max="31" value="${ech(c.jour_prelevement || '')}"></div>
    <div class="champ"><label for="fFin">Fin de l'engagement</label><input id="fFin" type="month" value="${ech((c.date_fin || '').slice(0, 7))}"><p class="aide">Facultatif</p></div>
  </div>
  <label class="case" style="margin-bottom:16px"><input type="checkbox" id="fActif" ${c.actif ? 'checked' : ''}><span>Charge active, à compter dans le budget</span></label>
  <div class="onb-actions">
    <button class="btn btn-secondaire" data-fermer>Annuler</button>
    <button class="btn btn-principal" data-valider>Enregistrer</button>
  </div>`;
}

function ouvrirCharge(charge) {
  const fond = ouvrirModale(charge ? 'Modifier la charge' : 'Nouvelle charge fixe', formulaireCharge(charge));
  const q = (s) => fond.querySelector(s);

  let natureModifiee = Boolean(charge);
  q('#fNature').addEventListener('change', () => { natureModifiee = true; });
  q('#fLibelle').addEventListener('input', () => {
    const propose = deviner(q('#fLibelle').value);
    if (!natureModifiee) { q('#fNature').value = propose.nature; q('#fCategorie').value = propose.categorie; }
  });

  q('[data-valider]').onclick = async (e) => {
    const libelle = nettoyerLibelle(q('#fLibelle').value);
    const montant = montantValide(q('#fMontant').value);
    if (!libelle) return toast('Le libellé est obligatoire', 'ko');
    if (montant === null) return toast('Montant invalide', 'ko');
    const jour = Number(q('#fJour').value);
    const fin = q('#fFin').value;

    const donnees = {
      libelle, montant,
      nature: q('#fNature').value,
      categorie: q('#fCategorie').value,
      jour_prelevement: jour >= 1 && jour <= 31 ? jour : null,
      date_fin: fin ? `${fin}-28` : null,
      actif: q('#fActif').checked
    };

    e.target.disabled = true;
    const requete = charge
      ? sb.from('charges').update(donnees).eq('id', charge.id)
      : sb.from('charges').insert({ ...donnees, user_id: etat.session.user.id });
    const { error } = await requete;
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(charge ? 'Charge modifiée' : 'Charge ajoutée');
    await rafraichir();
  };
}

function ouvrirDepense(depense) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const d = depense || { libelle: '', montant: '', categorie: 'alimentation', date: aujourdhui };

  const fond = ouvrirModale(depense ? 'Modifier la dépense' : 'Nouvelle dépense', `
    <div class="ligne-champs">
      <div class="champ"><label for="dLibelle">Libellé</label><input id="dLibelle" maxlength="60" value="${ech(d.libelle)}" placeholder="Courses"></div>
      <div class="champ"><label for="dMontant">Montant</label><input id="dMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(d.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="dCategorie">Catégorie</label>
        <select id="dCategorie">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${d.categorie === k ? 'selected' : ''}>${ech(v.emoji + ' ' + v.libelle)}</option>`).join('')}</select>
      </div>
      <div class="champ"><label for="dDate">Date</label><input id="dDate" type="date" value="${ech(d.date)}" max="${aujourdhui}"></div>
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>Annuler</button>
      <button class="btn btn-principal" data-valider>Enregistrer</button>
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
    if (!libelle) return toast('Le libellé est obligatoire', 'ko');
    if (montant === null || montant === 0) return toast('Montant invalide', 'ko');
    if (!date) return toast('Choisissez une date', 'ko');

    const donnees = { libelle, montant, categorie: q('#dCategorie').value, date };
    e.target.disabled = true;
    const requete = depense
      ? sb.from('depenses').update(donnees).eq('id', depense.id)
      : sb.from('depenses').insert({ ...donnees, user_id: etat.session.user.id });
    const { error } = await requete;
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast(depense ? 'Dépense modifiée' : 'Dépense ajoutée');
    if (date.slice(0, 7) !== etat.mois) etat.mois = date.slice(0, 7);
    await rafraichir();
  };
}

function ouvrirRevenu(revenu) {
  const r = revenu || { libelle: '', montant: '', type: 'salaire', recurrent: true, mois: etat.mois + '-01', actif: true };
  const fond = ouvrirModale(revenu ? "Modifier l'entrée" : "Nouvelle entrée d'argent", `
    <div class="ligne-champs">
      <div class="champ"><label for="vLibelle">Libellé</label><input id="vLibelle" maxlength="60" value="${ech(r.libelle)}" placeholder="Salaire"></div>
      <div class="champ"><label for="vMontant">Montant</label><input id="vMontant" type="number" step="0.01" min="0" inputmode="decimal" value="${ech(r.montant)}"></div>
    </div>
    <div class="ligne-champs">
      <div class="champ"><label for="vType">Nature</label>
        <select id="vType">${Object.entries(TYPES_REVENU).map(([k, v]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${ech(v)}</option>`).join('')}</select>
      </div>
      <div class="champ"><label for="vRecurrent">Fréquence</label>
        <select id="vRecurrent"><option value="1" ${r.recurrent ? 'selected' : ''}>Tous les mois</option><option value="0" ${r.recurrent ? '' : 'selected'}>Un seul mois</option></select>
      </div>
    </div>
    <div class="champ" id="blocMois" ${r.recurrent ? 'hidden' : ''}>
      <label for="vMois">Mois concerné</label>
      <input id="vMois" type="month" value="${ech((r.mois || etat.mois + '-01').slice(0, 7))}">
    </div>
    <label class="case" style="margin-bottom:16px"><input type="checkbox" id="vActif" ${r.actif ? 'checked' : ''}><span>Entrée active</span></label>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>Annuler</button>
      <button class="btn btn-principal" data-valider>Enregistrer</button>
    </div>`);

  const q = (s) => fond.querySelector(s);
  q('#vRecurrent').addEventListener('change', () => {
    q('#blocMois').hidden = q('#vRecurrent').value === '1';
  });

  q('[data-valider]').onclick = async (e) => {
    const libelle = nettoyerLibelle(q('#vLibelle').value);
    const montant = montantValide(q('#vMontant').value);
    if (!libelle) return toast('Le libellé est obligatoire', 'ko');
    if (montant === null || montant === 0) return toast('Montant invalide', 'ko');

    const recurrent = q('#vRecurrent').value === '1';
    const donnees = {
      libelle, montant, type: q('#vType').value, recurrent,
      mois: recurrent ? null : `${q('#vMois').value}-01`,
      actif: q('#vActif').checked
    };

    e.target.disabled = true;
    const requete = revenu
      ? sb.from('revenus').update(donnees).eq('id', revenu.id)
      : sb.from('revenus').insert({ ...donnees, user_id: etat.session.user.id });
    const { error } = await requete;
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');

    fermerModale();
    toast('Entrée enregistrée');
    await rafraichir();
  };
}

function ouvrirMotDePasse() {
  const fond = ouvrirModale('Changer de mot de passe', `
    <div class="champ">
      <label for="mNouveau">Nouveau mot de passe</label>
      <input id="mNouveau" type="password" autocomplete="new-password" minlength="10" maxlength="72">
      <p class="aide">10 caractères minimum, avec au moins une lettre et un chiffre.</p>
    </div>
    <div class="onb-actions">
      <button class="btn btn-secondaire" data-fermer>Annuler</button>
      <button class="btn btn-principal" data-valider>Enregistrer</button>
    </div>`);

  fond.querySelector('[data-valider]').onclick = async (e) => {
    const valeur = fond.querySelector('#mNouveau').value;
    if (valeur.length < 10 || !/[a-zA-Z]/.test(valeur) || !/\d/.test(valeur)) {
      return toast('Mot de passe trop simple', 'ko');
    }
    e.target.disabled = true;
    const { error } = await sb.auth.updateUser({ password: valeur });
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');
    fermerModale();
    toast('Mot de passe mis à jour');
  };
}

/* ====================== Exports ====================== */

function exporter(quoi) {
  if (quoi === 'charges') {
    const contenu = versCSV(
      [
        { titre: 'Libellé', valeur: (c) => c.libelle },
        { titre: 'Montant', valeur: (c) => c.montant },
        { titre: 'Nature', valeur: (c) => NATURES[c.nature]?.libelle },
        { titre: 'Catégorie', valeur: (c) => CATEGORIES[c.categorie]?.libelle },
        { titre: 'Jour de prélèvement', valeur: (c) => c.jour_prelevement || '' },
        { titre: 'Fin', valeur: (c) => c.date_fin || '' },
        { titre: 'Active', valeur: (c) => (c.actif ? 'oui' : 'non') }
      ],
      etat.charges
    );
    return telechargerCSV(`ctrl-budget-charges-${etat.mois}.csv`, contenu);
  }

  if (quoi === 'depenses') {
    const lignes = etat.depenses.filter((d) => d.date.slice(0, 7) === etat.mois);
    const contenu = versCSV(
      [
        { titre: 'Date', valeur: (d) => d.date },
        { titre: 'Libellé', valeur: (d) => d.libelle },
        { titre: 'Montant', valeur: (d) => d.montant },
        { titre: 'Catégorie', valeur: (d) => CATEGORIES[d.categorie]?.libelle }
      ],
      lignes
    );
    return telechargerCSV(`ctrl-budget-depenses-${etat.mois}.csv`, contenu);
  }

  const tout = [
    ...etat.revenus.map((r) => ({ type: 'Entrée', date: r.mois || 'récurrent', libelle: r.libelle, montant: r.montant, detail: TYPES_REVENU[r.type] })),
    ...etat.charges.map((c) => ({ type: 'Charge', date: c.date_fin ? 'jusqu\'au ' + c.date_fin : 'récurrente', libelle: c.libelle, montant: c.montant, detail: NATURES[c.nature]?.libelle })),
    ...etat.depenses.map((d) => ({ type: 'Dépense', date: d.date, libelle: d.libelle, montant: d.montant, detail: CATEGORIES[d.categorie]?.libelle }))
  ];
  const contenu = versCSV(
    [
      { titre: 'Type', valeur: (l) => l.type },
      { titre: 'Date', valeur: (l) => l.date },
      { titre: 'Libellé', valeur: (l) => l.libelle },
      { titre: 'Montant', valeur: (l) => l.montant },
      { titre: 'Détail', valeur: (l) => l.detail }
    ],
    tout
  );
  telechargerCSV('ctrl-budget-mes-donnees.csv', contenu);
}

/* ====================== Suppression du compte ====================== */

async function supprimerCompte() {
  const ok = await confirmer(
    'Supprimer votre compte',
    'Toutes vos entrées, charges et dépenses seront effacées définitivement. Cette action est irréversible. Pensez à exporter vos données avant.',
    'Supprimer définitivement'
  );
  if (!ok) return;

  const { error } = await sb.rpc('supprimer_mon_compte');
  if (error) {
    console.error(error);
    return toast("La suppression a échoué. Réessayez ou écrivez à l'adresse de contact.", 'ko');
  }
  await sb.auth.signOut();
  location.replace('/?compte=supprime');
}

/* ====================== Branchement des événements ====================== */

function brancher() {
  const trouverCharge = (id) => etat.charges.find((c) => String(c.id) === id);
  const trouverDepense = (id) => etat.depenses.find((d) => String(d.id) === id);
  const trouverRevenu = (id) => etat.revenus.find((r) => String(r.id) === id);

  vue.querySelectorAll('[data-mois]').forEach((b) => {
    b.onclick = async () => {
      const d = new Date(Number(etat.mois.slice(0, 4)), Number(etat.mois.slice(5, 7)) - 1 + Number(b.dataset.mois), 1);
      etat.mois = cleMois(d);
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-filtre]').forEach((b) => {
    b.onclick = () => { etat.filtreNature = b.dataset.filtre; rendre(); };
  });

  const nouvelleCharge = vue.querySelector('[data-nouvelle-charge]');
  if (nouvelleCharge) nouvelleCharge.onclick = () => ouvrirCharge(null);

  const nouvelleDepense = vue.querySelector('[data-nouvelle-depense]');
  if (nouvelleDepense) nouvelleDepense.onclick = () => ouvrirDepense(null);

  const nouveauRevenu = vue.querySelector('[data-nouveau-revenu]');
  if (nouveauRevenu) nouveauRevenu.onclick = () => ouvrirRevenu(null);

  vue.querySelectorAll('[data-modifier-charge]').forEach((b) => {
    b.onclick = () => ouvrirCharge(trouverCharge(b.dataset.modifierCharge));
  });
  vue.querySelectorAll('[data-modifier-depense]').forEach((b) => {
    b.onclick = () => ouvrirDepense(trouverDepense(b.dataset.modifierDepense));
  });
  vue.querySelectorAll('[data-modifier-revenu]').forEach((b) => {
    b.onclick = () => ouvrirRevenu(trouverRevenu(b.dataset.modifierRevenu));
  });

  vue.querySelectorAll('[data-supprimer-charge]').forEach((b) => {
    b.onclick = async () => {
      const charge = trouverCharge(b.dataset.supprimerCharge);
      const ok = await confirmer('Supprimer la charge', `« ${charge.libelle} » sera retirée de tous vos mois. Pour la garder dans l'historique, décochez plutôt « charge active ».`, 'Supprimer');
      if (!ok) return;
      const { error } = await sb.from('charges').delete().eq('id', charge.id);
      if (error) return toast(messageErreur(error), 'ko');
      toast('Charge supprimée');
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-supprimer-depense]').forEach((b) => {
    b.onclick = async () => {
      const { error } = await sb.from('depenses').delete().eq('id', b.dataset.supprimerDepense);
      if (error) return toast(messageErreur(error), 'ko');
      toast('Dépense supprimée');
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-supprimer-revenu]').forEach((b) => {
    b.onclick = async () => {
      const revenu = trouverRevenu(b.dataset.supprimerRevenu);
      const ok = await confirmer("Supprimer l'entrée", `« ${revenu.libelle} » ne sera plus comptée dans vos budgets.`, 'Supprimer');
      if (!ok) return;
      const { error } = await sb.from('revenus').delete().eq('id', revenu.id);
      if (error) return toast(messageErreur(error), 'ko');
      toast('Entrée supprimée');
      await rafraichir();
    };
  });

  vue.querySelectorAll('[data-export]').forEach((b) => {
    b.onclick = () => exporter(b.dataset.export);
  });

  const enregistrerProfil = vue.querySelector('[data-enregistrer-profil]');
  if (enregistrerProfil) enregistrerProfil.onclick = async (e) => {
    const prenom = nettoyerLibelle(vue.querySelector('#rgPrenom').value).slice(0, 40);
    const objectif = montantValide(vue.querySelector('#rgObjectif').value) || 0;
    e.target.disabled = true;
    const { error } = await sb.from('profiles').upsert({ id: etat.session.user.id, prenom: prenom || null, objectif_epargne: objectif, onboarding_done: true });
    e.target.disabled = false;
    if (error) return toast(messageErreur(error), 'ko');
    toast('Profil enregistré');
    await rafraichir();
  };

  const changerMdp = vue.querySelector('[data-changer-mdp]');
  if (changerMdp) changerMdp.onclick = ouvrirMotDePasse;

  vue.querySelectorAll('[data-deconnexion]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      b.textContent = 'Déconnexion';
      await deconnexion();
    };
  });

  const supprCompte = vue.querySelector('[data-supprimer-compte]');
  if (supprCompte) supprCompte.onclick = supprimerCompte;
}

async function rafraichir() {
  await charger();
  rendre();
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

/* Raccourci clavier : touche « d » pour saisir une dépense */
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

  const initiale = (etat.session.user.email || '?')[0].toUpperCase();
  document.getElementById('avatar').textContent = initiale;

  const ok = await charger();
  if (!ok) return;

  if (!etat.profil.onboarding_done) {
    return location.replace('/onboarding.html');
  }

  const prenom = etat.profil.prenom;
  if (prenom) document.getElementById('avatar').textContent = prenom[0].toUpperCase();

  rendre();
})();
