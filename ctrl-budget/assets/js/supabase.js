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
export function messageErreur(erreur) {
  const m = (erreur?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirmez votre e-mail avant de vous connecter, le lien est dans votre boîte de réception.';
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('password should be at least')) return 'Le mot de passe est trop court.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (m.includes('failed to fetch')) return 'Connexion au serveur impossible. Vérifiez votre réseau.';
  return "Une erreur est survenue. Réessayez, et si cela persiste contactez le support.";
}
