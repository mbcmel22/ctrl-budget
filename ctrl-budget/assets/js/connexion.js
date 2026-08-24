import { sb, messageErreur } from './supabase.js';
import { toast, ech } from './ui.js';
import { t, LANGUES, langueCourante, setLangue } from './i18n.js';

const form = document.getElementById('formAuth');
const email = document.getElementById('email');
const mdp = document.getElementById('motdepasse');
const prenom = document.getElementById('prenom');
const consentement = document.getElementById('consentement');
const btn = document.getElementById('btnAuth');
const zoneMessage = document.getElementById('messageAuth');
const ongletConnexion = document.getElementById('ongletConnexion');
const ongletInscription = document.getElementById('ongletInscription');
const force = document.getElementById('forceMdp');
const aideMdp = document.getElementById('aideMdp');

/* Sélecteur de langue, avant même la création du compte. */
const barreLangue = document.getElementById('barreLangue');
function rendreLangues() {
  if (!barreLangue) return;
  barreLangue.innerHTML = Object.values(LANGUES)
    .map((l) => `<button class="puce" data-langue="${l.code}" aria-pressed="${langueCourante() === l.code}">${ech(l.libelle)}</button>`)
    .join('');
  barreLangue.querySelectorAll('[data-langue]').forEach((b) => {
    b.onclick = () => { setLangue(b.dataset.langue); rendreLangues(); appliquerMode(); };
  });
}

let mode = new URLSearchParams(location.search).get('mode') === 'inscription' ? 'inscription' : 'connexion';
let modeRecuperation = false;

/* ------------------------- Affichage du mode ------------------------- */
function appliquerMode() {
  const inscription = mode === 'inscription';
  ongletConnexion.setAttribute('aria-selected', String(!inscription));
  ongletInscription.setAttribute('aria-selected', String(inscription));
  ongletConnexion.textContent = t('auth.signIn');
  ongletInscription.textContent = t('auth.signUp');
  document.getElementById('titreAuth').textContent = inscription ? t('auth.createTitle') : t('auth.welcomeBack');
  document.getElementById('sousTitreAuth').textContent = inscription ? t('auth.createText') : t('auth.welcomeBackText');
  btn.textContent = inscription ? t('auth.signUp') : t('auth.signIn');

  document.querySelector('label[for="email"]').textContent = t('auth.email');
  document.querySelector('label[for="motdepasse"]').textContent = t('auth.password');
  mdp.placeholder = t('auth.passwordPlaceholder');
  document.getElementById('voirMdp').textContent = mdp.type === 'password' ? t('auth.show') : t('auth.hide');
  document.querySelector('label[for="prenom"]').textContent = t('prof.firstName');
  document.getElementById('aideMdp').textContent = t('prof.passwordHelp');
  document.getElementById('lienOubli').textContent = t('auth.forgot');
  document.querySelector('.auth-visuel h2').textContent = t('auth.tagline');
  document.querySelector('.auth-visuel p').textContent = t('auth.taglineText');
  document.getElementById('blocPrenom').hidden = !inscription;
  document.getElementById('blocConsentement').hidden = !inscription;
  force.hidden = !inscription;
  aideMdp.hidden = !inscription;
  mdp.setAttribute('autocomplete', inscription ? 'new-password' : 'current-password');
  zoneMessage.innerHTML = '';
}

ongletConnexion.onclick = () => { mode = 'connexion'; appliquerMode(); };
ongletInscription.onclick = () => { mode = 'inscription'; appliquerMode(); };

document.getElementById('voirMdp').onclick = (e) => {
  const visible = mdp.type === 'text';
  mdp.type = visible ? 'password' : 'text';
  e.target.textContent = visible ? t('auth.show') : t('auth.hide');
};

/* ------------------------- Force du mot de passe ------------------------- */
const FAIBLES = ['password', 'motdepasse', '123456', 'azerty', 'qwerty', 'bonjour', 'iloveyou', 'admin1234', 'ctrlbudget'];

function evaluer(valeur) {
  let score = 0;
  if (valeur.length >= 10) score++;
  if (valeur.length >= 14) score++;
  if (/[a-z]/.test(valeur) && /[A-Z]/.test(valeur)) score++;
  if (/\d/.test(valeur)) score++;
  if (/[^\w\s]/.test(valeur)) score++;
  const bas = valeur.toLowerCase();
  if (FAIBLES.some((f) => bas.includes(f))) score = Math.min(score, 1);
  return score;
}

mdp.addEventListener('input', () => {
  if (mode !== 'inscription') return;
  const score = evaluer(mdp.value);
  const barre = force.querySelector('i');
  const largeurs = ['8%', '25%', '45%', '65%', '85%', '100%'];
  const couleurs = ['#c74436', '#c74436', '#b8820c', '#b8820c', '#17876b', '#17876b'];
  barre.style.width = largeurs[score];
  barre.style.background = couleurs[score];
});

/* ------------------------- Validations ------------------------- */
function afficherErreur(texte) {
  zoneMessage.innerHTML = `<div class="alerte alerte-danger">${ech(texte)}</div>`;
  zoneMessage.scrollIntoView({ block: 'nearest' });
}
function afficherInfo(texte) {
  zoneMessage.innerHTML = `<div class="alerte alerte-info">${ech(texte)}</div>`;
}

function emailValide(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
}

/* ------------------------- Soumission ------------------------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  zoneMessage.innerHTML = '';

  if (modeRecuperation) return definirNouveauMotDePasse();

  const adresse = email.value.trim().toLowerCase();
  const secret = mdp.value;

  if (!emailValide(adresse)) return afficherErreur(t('auth.badEmail'));
  if (secret.length < 10) return afficherErreur(t('auth.shortPassword'));

  if (mode === 'inscription') {
    if (!/[a-zA-Z]/.test(secret) || !/\d/.test(secret)) {
      return afficherErreur(t('auth.needLetterDigit'));
    }
    if (evaluer(secret) <= 1) {
      return afficherErreur(t('auth.tooCommon'));
    }
    if (!consentement.checked) {
      return afficherErreur(t('auth.consentNeeded'));
    }
  }

  btn.disabled = true;
  btn.textContent = mode === 'inscription' ? t('auth.creating') : t('auth.signingIn');

  try {
    if (mode === 'inscription') {
      const { data, error } = await sb.auth.signUp({
        email: adresse,
        password: secret,
        options: {
          emailRedirectTo: `${location.origin}/app.html`,
          data: { prenom: (prenom.value || '').trim().slice(0, 40) }
        }
      });
      if (error) throw error;

      if (data.session) {
        location.replace('/onboarding.html');
      } else {
        afficherInfo(t('auth.checkEmail'));
        form.reset();
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: adresse, password: secret });
      if (error) throw error;
      location.replace('/app.html');
    }
  } catch (erreur) {
    afficherErreur(messageErreur(erreur));
  } finally {
    btn.disabled = false;
    btn.textContent = mode === 'inscription' ? t('auth.signUp') : t('auth.signIn');
  }
});

/* ------------------------- Mot de passe oublié ------------------------- */
document.getElementById('lienOubli').onclick = async () => {
  const adresse = email.value.trim().toLowerCase();
  if (!emailValide(adresse)) {
    return afficherErreur(t('auth.enterEmailFirst'));
  }
  const { error } = await sb.auth.resetPasswordForEmail(adresse, { redirectTo: `${location.origin}/connexion.html` });
  /* Réponse identique dans tous les cas : on ne révèle pas si le compte existe. */
  if (error) console.warn(error);
  afficherInfo(t('auth.resetSent'));
};

/* ------------------------- Retour depuis l'e-mail ------------------------- */
sb.auth.onAuthStateChange((evenement) => {
  if (evenement === 'PASSWORD_RECOVERY') {
    modeRecuperation = true;
    document.querySelector('.onglets-auth').hidden = true;
    document.getElementById('titreAuth').textContent = t('auth.newPasswordTitle');
    document.getElementById('sousTitreAuth').textContent = t('auth.newPasswordText');
    email.closest('.champ').hidden = true;
    document.getElementById('lienOubli').hidden = true;
    force.hidden = false;
    aideMdp.hidden = false;
    mdp.value = '';
    mdp.setAttribute('autocomplete', 'new-password');
    btn.textContent = t('auth.savePassword');
    mdp.focus();
  }
});

async function definirNouveauMotDePasse() {
  const secret = mdp.value;
  if (secret.length < 10 || !/[a-zA-Z]/.test(secret) || !/\d/.test(secret)) {
    return afficherErreur(t('prof.passwordHelp'));
  }
  btn.disabled = true;
  const { error } = await sb.auth.updateUser({ password: secret });
  btn.disabled = false;
  if (error) return afficherErreur(messageErreur(error));
  toast(t('prof.passwordUpdated'));
  setTimeout(() => location.replace('/app.html'), 800);
}

/* ------------------------- Déjà connecté ------------------------- */
(async () => {
  const { data } = await sb.auth.getSession();
  const params = new URLSearchParams(location.search);
  const recuperation = location.hash.includes('type=recovery') || params.get('type') === 'recovery';
  if (data.session && !recuperation) location.replace('/app.html');
})();

rendreLangues();
appliquerMode();
