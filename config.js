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

export const SUPABASE_URL = 'https://toorvoldfgavojpsmifi.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3J2b2xkZmdhdm9qcHNtaWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDY1NDIsImV4cCI6MjEwMzA4MjU0Mn0.6u5WMB-Jg5C9sq2r5VILgrPgK-2uj7eh1tR9mewS5M0';

/* Adresse du site en production, utilisée pour les liens de confirmation
   d'e-mail et de réinitialisation de mot de passe. */
export const SITE_URL = window.location.origin;
