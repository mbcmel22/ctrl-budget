/* =========================================================================
   Configuration CTRL Budget
   -------------------------------------------------------------------------
   Remplacez les deux valeurs ci-dessous par celles de VOTRE projet Supabase
   (Dashboard Supabase > Project Settings > API).

   IMPORTANT, à lire une fois :
   - La clé "anon public" est faite pour être visible dans le navigateur.
     Elle ne donne accès à rien toute seule : c'est la sécurité au niveau des
     lignes (RLS) définie dans supabase/schema.sql qui autorise chaque
     utilisateur à voir uniquement ses propres données.
   - Ne collez JAMAIS ici la clé "service_role" ni le mot de passe de la base.
     Ces clés contournent la RLS. Elles restent dans le dashboard Supabase.
   - Les mots de passe des utilisateurs ne transitent jamais par ce fichier :
     Supabase Auth les hache (bcrypt) sur son serveur. Ni vous ni le code
     n'y avez accès.
   ========================================================================= */

export const SUPABASE_URL = 'https://VOTRE-PROJET.supabase.co';
export const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON_PUBLIC';

/* Adresse du site en production, utilisée pour les liens de confirmation
   d'e-mail et de réinitialisation de mot de passe. */
export const SITE_URL = window.location.origin;
