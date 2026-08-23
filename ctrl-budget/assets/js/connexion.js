import { sb, messageErreur } from './supabase.js';
import { toast, ech } from './ui.js';

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

let mode = new URLSearchParams(location.search).get('mode') === 'inscription' ? 'inscription' : 'connexion';
let modeRecuperation = false;

/* ------------------------- Affichage du mode ------------------------- */
function appliquerMode() {
  const inscription = mode === 'inscription';
  ongletConnexion.setAttribute('aria-selected', String(!inscription));
  ongletInscription.setAttribute('aria-selected', String(inscription));
  document.getElementById('titreAuth').textContent = inscription ? 'Créer votre compte' : 'Bon retour';
  document.getElementById('sousTitreAuth').textContent = inscription
    ? 'Deux champs, et vous passez à la mise en route de votre budget.'
    : 'Entrez vos identifiants pour retrouver votre tableau de bord.';
  btn.textContent = inscription ? 'Créer mon compte' : 'Se connecter';
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
  e.target.textContent = visible ? 'Voir' : 'Cacher';
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

  if (!emailValide(adresse)) return afficherErreur("Cette adresse e-mail n'est pas valide.");
  if (secret.length < 10) return afficherErreur('Le mot de passe doit contenir au moins 10 caractères.');

  if (mode === 'inscription') {
    if (!/[a-zA-Z]/.test(secret) || !/\d/.test(secret)) {
      return afficherErreur('Ajoutez au moins une lettre et un chiffre à votre mot de passe.');
    }
    if (evaluer(secret) <= 1) {
      return afficherErreur('Ce mot de passe est trop courant. Choisissez une phrase de passe personnelle.');
    }
    if (!consentement.checked) {
      return afficherErreur('Cochez la case pour continuer, elle autorise l\'enregistrement de vos données budgétaires.');
    }
  }

  btn.disabled = true;
  btn.textContent = mode === 'inscription' ? 'Création en cours' : 'Connexion en cours';

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
        afficherInfo('Compte créé. Ouvrez votre boîte e-mail et cliquez sur le lien de confirmation pour activer votre accès.');
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
    btn.textContent = mode === 'inscription' ? 'Créer mon compte' : 'Se connecter';
  }
});

/* ------------------------- Mot de passe oublié ------------------------- */
document.getElementById('lienOubli').onclick = async () => {
  const adresse = email.value.trim().toLowerCase();
  if (!emailValide(adresse)) {
    return afficherErreur('Entrez votre adresse e-mail dans le champ ci-dessus, puis cliquez à nouveau.');
  }
  const { error } = await sb.auth.resetPasswordForEmail(adresse, { redirectTo: `${location.origin}/connexion.html` });
  /* Réponse identique dans tous les cas : on ne révèle pas si le compte existe. */
  if (error) console.warn(error);
  afficherInfo('Si un compte existe avec cette adresse, un lien de réinitialisation vient de partir. Vérifiez aussi vos indésirables.');
};

/* ------------------------- Retour depuis l'e-mail ------------------------- */
sb.auth.onAuthStateChange((evenement) => {
  if (evenement === 'PASSWORD_RECOVERY') {
    modeRecuperation = true;
    document.querySelector('.onglets-auth').hidden = true;
    document.getElementById('titreAuth').textContent = 'Nouveau mot de passe';
    document.getElementById('sousTitreAuth').textContent = 'Choisissez un mot de passe que vous n\'utilisez nulle part ailleurs.';
    email.closest('.champ').hidden = true;
    document.getElementById('lienOubli').hidden = true;
    force.hidden = false;
    aideMdp.hidden = false;
    mdp.value = '';
    mdp.setAttribute('autocomplete', 'new-password');
    btn.textContent = 'Enregistrer le mot de passe';
    mdp.focus();
  }
});

async function definirNouveauMotDePasse() {
  const secret = mdp.value;
  if (secret.length < 10 || !/[a-zA-Z]/.test(secret) || !/\d/.test(secret)) {
    return afficherErreur('10 caractères minimum, avec au moins une lettre et un chiffre.');
  }
  btn.disabled = true;
  const { error } = await sb.auth.updateUser({ password: secret });
  btn.disabled = false;
  if (error) return afficherErreur(messageErreur(error));
  toast('Mot de passe enregistré');
  setTimeout(() => location.replace('/app.html'), 800);
}

/* ------------------------- Déjà connecté ------------------------- */
(async () => {
  const { data } = await sb.auth.getSession();
  const params = new URLSearchParams(location.search);
  const recuperation = location.hash.includes('type=recovery') || params.get('type') === 'recovery';
  if (data.session && !recuperation) location.replace('/app.html');
})();

appliquerMode();
