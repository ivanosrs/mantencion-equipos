-- Ocultar usuarios de la pantalla de gestion sin desactivar su cuenta.
-- is_hidden es independiente de is_active: un usuario oculto sigue
-- autenticandose, creando ordenes y apareciendo con su nombre en los PDF.
-- Solo deja de listarse en /dashboard/usuarios.

alter table public.profiles
  add column if not exists is_hidden boolean not null default false;

create index if not exists idx_profiles_is_hidden on public.profiles (is_hidden);

-- Cuentas de servicio del equipo: quedan activas pero ocultas.
-- El email vive en auth.users, por eso el update es contra el join.
-- is_active = true explicito para que la cuenta quede usable.
update public.profiles p
set is_hidden = true,
    is_active = true
from auth.users u
where u.id = p.id
  and lower(u.email) in (
    'diegop.salas@gmail.com',
    'ivanvidalsepulveda@gmail.com'
  );
