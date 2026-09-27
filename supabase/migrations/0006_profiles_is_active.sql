-- Baja logica de usuarios: is_active en lugar de borrar filas.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Backfill por si la columna existia sin default en algun ambiente.
update public.profiles set is_active = true where is_active is null;

create index if not exists idx_profiles_is_active on public.profiles (is_active);
