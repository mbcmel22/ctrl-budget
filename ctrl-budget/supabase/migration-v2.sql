-- =====================================================================
-- CTRL Budget, migration v2
-- À jouer si vous avez DÉJÀ exécuté schema.sql sur votre projet.
-- Ajoute : épargne, devise, langue, solde de départ.
-- Le script est sans risque et ré-exécutable.
-- Supabase > SQL Editor > New query > coller > Run.
-- =====================================================================

-- 1. Nouvelles préférences du profil
alter table public.profiles add column if not exists devise text not null default 'EUR';
alter table public.profiles add column if not exists langue text not null default 'fr';
alter table public.profiles add column if not exists epargne_initiale numeric(12,2) not null default 0;

alter table public.profiles drop constraint if exists profiles_langue_check;
alter table public.profiles add constraint profiles_langue_check check (langue in ('fr','en','es'));

alter table public.profiles drop constraint if exists profiles_devise_check;
alter table public.profiles add constraint profiles_devise_check check (char_length(devise) = 3);

-- 2. Date de début des charges, pour ne pas les compter avant leur existence
alter table public.charges add column if not exists date_debut date;

-- 3. Mouvements d'épargne manuels
create table if not exists public.epargne_mouvements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  libelle text check (char_length(libelle) <= 60),
  montant numeric(12,2) not null check (montant >= 0 and montant <= 10000000),
  sens text not null default 'depot' check (sens in ('depot','retrait')),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_epargne_user_date on public.epargne_mouvements(user_id, date desc);

alter table public.epargne_mouvements enable row level security;

drop policy if exists "lecture epargne" on public.epargne_mouvements;
drop policy if exists "ajout epargne" on public.epargne_mouvements;
drop policy if exists "maj epargne" on public.epargne_mouvements;
drop policy if exists "suppression epargne" on public.epargne_mouvements;

create policy "lecture epargne"     on public.epargne_mouvements for select using (auth.uid() = user_id);
create policy "ajout epargne"       on public.epargne_mouvements for insert with check (auth.uid() = user_id);
create policy "maj epargne"         on public.epargne_mouvements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppression epargne" on public.epargne_mouvements for delete using (auth.uid() = user_id);

-- 4. La suppression de compte doit aussi effacer l'épargne
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Aucune session active';
  end if;

  delete from public.epargne_mouvements where user_id = moi;
  delete from public.depenses          where user_id = moi;
  delete from public.charges           where user_id = moi;
  delete from public.revenus           where user_id = moi;
  delete from public.profiles          where id = moi;
  delete from auth.users               where id = moi;
end $$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
