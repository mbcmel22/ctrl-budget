-- =====================================================================
-- CTRL Budget, migration v3
-- À jouer après migration-v2.sql.
-- Ajoute la mémoire de la dernière conversion de devise, qui permet de
-- revenir à la devise précédente en retrouvant les montants d'origine.
-- Supabase > SQL Editor > New query > coller > Run.
-- =====================================================================

alter table public.profiles add column if not exists derniere_conversion jsonb;

comment on column public.profiles.derniere_conversion is
  'Dernière conversion appliquée : {"de":"EUR","vers":"JPY","taux":171.23}. Sert à rendre l''aller-retour exact.';
