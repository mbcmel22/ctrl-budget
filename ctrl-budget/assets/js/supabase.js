import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

/* Renvoie la session ou redirige vers la page de connexion. */
export async function sessionRequise() {
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) {
    window.location.replace('/connexion.html');
    return null;
  }
  return data.session;
}

export async function deconnexion() {
  /* La session locale est effacée quoi qu'il arrive : même si le serveur
     ne répond pas, l'utilisateur ne doit pas rester bloqué connecté. */
  try {
    await Promise.race([
      sb.auth.signOut(),
      new Promise((r) => setTimeout(r, 3000))
    ]);
  } catch (erreur) {
    console.warn('Déconnexion serveur impossible', erreur);
  }
  try {
    await sb.auth.signOut({ scope: 'local' });
  } catch (erreur) { /* session déjà effacée */ }
  window.location.replace('/');
}

/* Traduction des messages d'erreur Supabase en français, sans détail
   technique inutile pour l'utilisateur. */
/* Nom de la colonne absente de la base, quand c'est la cause de l'échec. */
export function colonneManquante(erreur) {
  const texte = `${erreur?.message || ''} ${erreur?.details || ''} ${erreur?.hint || ''}`;
  const trouve = texte.match(/'([a-z_]+)' column|column "?([a-z_]+)"? (?:of|does not exist)/i);
  return trouve ? (trouve[1] || trouve[2]) : null;
}

export function messageErreur(erreur) {
  const m = (erreur?.message || '').toLowerCase();
  const code = erreur?.code || '';

  /* Colonne absente : la migration SQL n'a pas été jouée sur ce projet. */
  const colonne = colonneManquante(erreur);
  if (colonne || code === 'PGRST204') {
    return `La base de données ne connaît pas la colonne « ${colonne || '?'} ». Jouez les fichiers supabase/migration-v2.sql puis migration-v3.sql dans le SQL Editor, puis réessayez.`;
  }

  if (code === '42501' || m.includes('row-level security') || m.includes('violates row-level')) {
    return "Enregistrement refusé par la sécurité de la base. Vérifiez que la table a bien ses règles RLS, et que vous êtes toujours connecté.";
  }
  if (code === '23514' || m.includes('violates check constraint')) {
    return "Une valeur saisie n'est pas acceptée par la base, par exemple un montant trop grand ou une nature inconnue.";
  }
  if (code === '23502' || m.includes('null value in column')) {
    return "Un champ obligatoire est vide.";
  }
  if (m.includes('jwt') || m.includes('expired')) {
    return 'Votre session a expiré. Reconnectez-vous puis recommencez.';
  }
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirmez votre e-mail avant de vous connecter, le lien est dans votre boîte de réception.';
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('password should be at least')) return 'Le mot de passe est trop court.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (m.includes('failed to fetch')) return 'Connexion au serveur impossible. Vérifiez votre réseau.';
  /* Dernier recours : on montre le message technique, c'est toujours plus
     utile qu'un « une erreur est survenue » qui n'aide personne. */
  return erreur?.message
    ? `Échec de l'enregistrement : ${erreur.message}`
    : "Une erreur est survenue. Réessayez, et si cela persiste contactez le support.";
}
