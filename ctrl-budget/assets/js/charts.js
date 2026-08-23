/* Graphiques en SVG, sans librairie externe.
   Chaque fonction renvoie une chaîne HTML prête à insérer. */

import { euroArrondi, euro } from './helpers.js';
import { ech } from './ui.js';

const ENCRE = '#16274a';
const CLAIR = '#b9c4da';
const LIGNE = '#e3e8f2';
const ARDOISE = '#64708c';

/* ---------- Courbe cumulée : mois en cours vs mois précédent ---------- */
export function courbeComparaison(actuel, precedent, options = {}) {
  const L = 700, H = 260, gG = 52, gD = 14, gH = 18, gB = 30;
  const n = Math.max(actuel.length, precedent.length, 2);
  const max = Math.max(10, ...actuel, ...precedent) * 1.12;
  const x = (i) => gG + (i * (L - gG - gD)) / (n - 1);
  const y = (v) => H - gB - (v / max) * (H - gH - gB);

  const chemin = (serie) => serie.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const aire = (serie) => `${chemin(serie)} L${x(serie.length - 1).toFixed(1)},${H - gB} L${x(0).toFixed(1)},${H - gB} Z`;

  const grilles = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const yy = y(max * p);
    return `<line x1="${gG}" y1="${yy.toFixed(1)}" x2="${L - gD}" y2="${yy.toFixed(1)}" stroke="${LIGNE}"/>
            <text x="${gG - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${ARDOISE}">${ech(euroArrondi(max * p))}</text>`;
  }).join('');

  const pasJour = n > 20 ? 5 : 2;
  const jours = [];
  for (let i = 0; i < n; i += pasJour) {
    jours.push(`<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${ARDOISE}">${i + 1}</text>`);
  }

  const dernier = actuel.length - 1;
  const pointFinal = actuel.length
    ? `<circle cx="${x(dernier).toFixed(1)}" cy="${y(actuel[dernier]).toFixed(1)}" r="4.5" fill="${ENCRE}" stroke="#fff" stroke-width="2"/>`
    : '';

  return `
  <svg class="graph" viewBox="0 0 ${L} ${H}" role="img" aria-label="${ech(options.description || 'Cumul des dépenses du mois comparé au mois précédent')}">
    ${grilles}${jours}
    ${precedent.length ? `<path d="${chemin(precedent)}" fill="none" stroke="${CLAIR}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>` : ''}
    ${actuel.length ? `<path d="${aire(actuel)}" fill="rgba(22,39,74,.07)"/><path d="${chemin(actuel)}" fill="none" stroke="${ENCRE}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${pointFinal}
  </svg>
  <div class="graph-legende">
    <span><i class="pastille" style="background:${ENCRE}"></i> ${ech(options.labelActuel || 'Mois en cours')}</span>
    <span><i class="pastille" style="background:${CLAIR}"></i> ${ech(options.labelPrecedent || 'Mois précédent')}</span>
    <span style="margin-left:auto">Cumul jour par jour</span>
  </div>`;
}

/* ---------- Donut de répartition ---------- */
export function donut(parts, total) {
  const taille = 200, r = 74, ep = 24, c = taille / 2;
  const circonference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = parts.map((p) => {
    const part = total > 0 ? p.montant / total : 0;
    const longueur = part * circonference;
    const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.couleur}" stroke-width="${ep}"
      stroke-dasharray="${longueur.toFixed(2)} ${(circonference - longueur).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${c} ${c})"><title>${ech(p.libelle)} : ${ech(euro(p.montant))}</title></circle>`;
    offset += longueur;
    return el;
  }).join('');

  return `
  <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
    <svg class="graph" style="width:200px;flex:0 0 200px" viewBox="0 0 ${taille} ${taille}" role="img" aria-label="Répartition par catégorie">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${LIGNE}" stroke-width="${ep}"/>
      ${arcs}
      <text x="${c}" y="${c - 2}" text-anchor="middle" font-size="20" font-weight="700" fill="${ENCRE}">${ech(euroArrondi(total))}</text>
      <text x="${c}" y="${c + 18}" text-anchor="middle" font-size="11" fill="${ARDOISE}">au total</text>
    </svg>
    <ul class="donut-liste" style="flex:1;min-width:220px">
      ${parts.slice(0, 7).map((p) => `
        <li>
          <i class="pastille" style="background:${p.couleur}"></i>
          <span>${ech(p.emoji)} ${ech(p.libelle)}</span>
          <span class="montant">${ech(euro(p.montant))}</span>
          <span style="color:var(--ardoise);font-size:.82rem;width:44px;text-align:right">${total > 0 ? Math.round((p.montant / total) * 100) : 0} %</span>
        </li>`).join('')}
    </ul>
  </div>`;
}

/* ---------- Barres : historique des derniers mois ---------- */
export function barres(series, options = {}) {
  const L = 700, H = 220, gG = 52, gD = 10, gH = 18, gB = 34;
  const n = series.length || 1;
  const max = Math.max(10, ...series.map((s) => s.valeur)) * 1.15;
  const largeurZone = (L - gG - gD) / n;
  const largeur = Math.min(56, largeurZone * 0.55);
  const y = (v) => H - gB - (v / max) * (H - gH - gB);

  const grilles = [0, 0.5, 1].map((p) => {
    const yy = y(max * p);
    return `<line x1="${gG}" y1="${yy.toFixed(1)}" x2="${L - gD}" y2="${yy.toFixed(1)}" stroke="${LIGNE}"/>
            <text x="${gG - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${ARDOISE}">${ech(euroArrondi(max * p))}</text>`;
  }).join('');

  const barresHtml = series.map((s, i) => {
    const cx = gG + largeurZone * i + largeurZone / 2;
    const hauteur = Math.max(2, H - gB - y(s.valeur));
    const couleur = s.actif ? ENCRE : '#9fadc9';
    return `<g>
      <rect x="${(cx - largeur / 2).toFixed(1)}" y="${y(s.valeur).toFixed(1)}" width="${largeur.toFixed(1)}" height="${hauteur.toFixed(1)}" rx="5" fill="${couleur}"><title>${ech(s.libelle)} : ${ech(euro(s.valeur))}</title></rect>
      <text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="${ARDOISE}">${ech(s.libelle)}</text>
    </g>`;
  }).join('');

  return `<svg class="graph" viewBox="0 0 ${L} ${H}" role="img" aria-label="${ech(options.description || 'Historique mensuel')}">${grilles}${barresHtml}</svg>`;
}
