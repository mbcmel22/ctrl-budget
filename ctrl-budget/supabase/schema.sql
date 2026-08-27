-- =====================================================================
-- CTRL Budget, schéma de base de données
-- A coller dans Supabase > SQL Editor > New query, puis Run.
-- Le script est ré-exécutable sans casser une base existante.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profils
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  prenom text check (char_length(prenom) <= 40),
  objectif_epargne numeric(10,2) not null default 0 check (objectif_epargne >= 0),
  epargne_initiale numeric(12,2) not null default 0 check (epargne_initiale >= 0),
  devise text not null default 'EUR' check (char_length(devise) = 3),
  langue text not null default 'fr' check (langue in ('fr','en','es')),
  derniere_conversion jsonb,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Entrées d'argent
-- ---------------------------------------------------------------------
create table if not exists public.revenus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  libelle text not null check (char_length(libelle) between 1 and 60),
  montant numeric(10,2) not null check (montant >= 0 and montant <= 1000000),
  type text not null default 'salaire'
    check (type in ('salaire','prime','aide','freelance','loyer','autre')),
  recurrent boolean not null default true,
  mois date,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Charges fixes
-- ---------------------------------------------------------------------
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  libelle text not null check (char_length(libelle) between 1 and 60),
  montant numeric(10,2) not null check (montant >= 0 and montant <= 1000000),
  nature text not null default 'fixe'
    check (nature in ('fixe','credit','abonnement','variable','epargne')),
  categorie text not null default 'autre'
    check (categorie in ('logement','energie','telecom','assurance','transport','alimentation',
                         'sante','loisirs','banque','credit','impots','enfants','epargne','autre')),
  jour_prelevement smallint check (jour_prelevement between 1 and 31),
  date_debut date,
  date_fin date,
  actif boolean not null default true,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Dépenses du quotidien
-- ---------------------------------------------------------------------
create table if not exists public.depenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  libelle text not null check (char_length(libelle) between 1 and 60),
  montant numeric(10,2) not null check (montant >= 0 and montant <= 1000000),
  categorie text not null default 'autre'
    check (categorie in ('logement','energie','telecom','assurance','transport','alimentation',
                         'sante','loisirs','banque','credit','impots','enfants','epargne','autre')),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4 bis. Mouvements d'épargne manuels
-- ---------------------------------------------------------------------
create table if not exists public.epargne_mouvements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  libelle text check (char_length(libelle) <= 60),
  montant numeric(12,2) not null check (montant >= 0 and montant <= 10000000),
  sens text not null default 'depot' check (sens in ('depot','retrait')),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Index
-- ---------------------------------------------------------------------
create index if not exists idx_revenus_user on public.revenus(user_id);
create index if not exists idx_charges_user on public.charges(user_id);
create index if not exists idx_depenses_user_date on public.depenses(user_id, date desc);
create index if not exists idx_epargne_user_date on public.epargne_mouvements(user_id, date desc);

-- ---------------------------------------------------------------------
-- 6. Sécurité au niveau des lignes (RLS)
--    Chaque utilisateur ne voit et ne modifie QUE ses propres lignes.
--    Sans ces règles, la clé publique du navigateur donnerait accès
--    aux données de tout le monde.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.revenus  enable row level security;
alter table public.charges  enable row level security;
alter table public.depenses enable row level security;
alter table public.epargne_mouvements enable row level security;

drop policy if exists "profil lecture" on public.profiles;
drop policy if exists "profil ecriture" on public.profiles;
drop policy if exists "profil maj" on public.profiles;

create policy "profil lecture"  on public.profiles for select using (auth.uid() = id);
create policy "profil ecriture" on public.profiles for insert with check (auth.uid() = id);
create policy "profil maj"      on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['revenus','charges','depenses','epargne_mouvements'] loop
    execute format('drop policy if exists "lecture %1$s" on public.%1$I', t);
    execute format('drop policy if exists "ajout %1$s" on public.%1$I', t);
    execute format('drop policy if exists "maj %1$s" on public.%1$I', t);
    execute format('drop policy if exists "suppression %1$s" on public.%1$I', t);

    execute format('create policy "lecture %1$s" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('create policy "ajout %1$s" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "maj %1$s" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "suppression %1$s" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, prenom)
  values (new.id, nullif(new.raw_user_meta_data->>'prenom', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ---------------------------------------------------------------------
-- 8. Droit à l'effacement (RGPD)
--    Si votre projet refuse la suppression dans auth.users, retirez la
--    dernière ligne de la fonction et supprimez le compte depuis
--    Authentication > Users, les données métier étant déjà effacées.
--    L'utilisateur connecté supprime lui-même son compte et ses données.
--    La suppression en cascade nettoie les quatre tables.
-- ---------------------------------------------------------------------
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
  delete from public.depenses where user_id = moi;
  delete from public.charges  where user_id = moi;
  delete from public.revenus  where user_id = moi;
  delete from public.profiles where id = moi;
  delete from auth.users      where id = moi;
end $$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
