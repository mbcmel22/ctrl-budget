/* Utilitaires d'interface partagés par toutes les pages. */

/* ---------- Sécurité d'affichage : jamais d'injection HTML ---------- */
export function ech(valeur) {
  return String(valeur ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ---------- Messages courts ---------- */
export function toast(message, ton = 'ok') {
  let zone = document.querySelector('.toast-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.className = 'toast-zone';
    zone.setAttribute('role', 'status');
    zone.setAttribute('aria-live', 'polite');
    document.body.appendChild(zone);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (ton === 'ko' ? 'ko' : ton === 'neutre' ? '' : 'ok');
  el.textContent = message;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ---------- Modale accessible ---------- */
export function ouvrirModale(titre, contenuHtml, surOuverture) {
  fermerModale();
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML = `
    <div class="modale" role="dialog" aria-modal="true" aria-label="${ech(titre)}">
      <div class="modale-entete">
        <h3>${ech(titre)}</h3>
        <button class="icone-btn" data-fermer aria-label="Fermer">✕</button>
      </div>
      <div class="modale-corps"></div>
    </div>`;
  fond.querySelector('.modale-corps').innerHTML = contenuHtml;
  document.body.appendChild(fond);
  document.body.style.overflow = 'hidden';

  fond.addEventListener('click', (e) => {
    if (e.target === fond || e.target.hasAttribute('data-fermer')) fermerModale();
  });
  document.addEventListener('keydown', echapper);
  const premier = fond.querySelector('input, select, textarea, button:not([data-fermer])');
  if (premier) premier.focus();
  if (surOuverture) surOuverture(fond);
  return fond;
}

function echapper(e) { if (e.key === 'Escape') fermerModale(); }

export function fermerModale() {
  const fond = document.querySelector('.modale-fond');
  if (fond) fond.remove();
  document.body.style.overflow = '';
  document.removeEventListener('keydown', echapper);
}

/* ---------- Confirmation ---------- */
export function confirmer(titre, texte, libelleAction = 'Confirmer') {
  return new Promise((resoudre) => {
    const fond = ouvrirModale(titre, `
      <p>${ech(texte)}</p>
      <div class="onb-actions">
        <button class="btn btn-secondaire" data-non>Annuler</button>
        <button class="btn btn-danger" data-oui>${ech(libelleAction)}</button>
      </div>`);
    fond.querySelector('[data-non]').onclick = () => { fermerModale(); resoudre(false); };
    fond.querySelector('[data-oui]').onclick = () => { fermerModale(); resoudre(true); };
  });
}

/* ---------- Retour en haut ---------- */
function brancherRetourHaut() {
  const bouton = document.getElementById('retourHaut');
  if (!bouton) return;
  const cible = document.querySelector('main.app') ? window : window;
  const basculer = () => bouton.classList.toggle('visible', window.scrollY > 320);
  window.addEventListener('scroll', basculer, { passive: true });
  basculer();
  bouton.addEventListener('click', () => {
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cible.scrollTo({ top: 0, behavior: doux ? 'smooth' : 'auto' });
    const ancre = document.querySelector('h1, .marque');
    if (ancre) ancre.setAttribute('tabindex', '-1'), ancre.focus({ preventScroll: true });
  });
}

/* ---------- Année du pied de page ---------- */
function majAnnee() {
  const el = document.getElementById('annee');
  if (el) el.textContent = String(new Date().getFullYear());
}

brancherRetourHaut();
majAnnee();
