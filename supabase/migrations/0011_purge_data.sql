-- Purga total de datos operacion y de usuarios no administradores.
--
-- Ordenobligatorio por las foreign keys (todas ON DELETE RESTRICT salvo
-- work_order_parts, que sale por CASCADE):
--   1. work_order_parts  (huerfanas, por si alguna quedo suelta)
--   2. work_orders
--   3. equipments
--   4. profiles
--
-- Que sobrevive: solo los dos administradores de servicio, filtres por email
-- (no por rol), para que tambien caiga cualquier otro admin que existiera.
--
-- next_ot_number() no necesita reset: es MAX(ot_number::bigint) + 1
-- (0005_ot_number_overflow_fix.sql), no una secuencia. Al vaciar work_orders,
-- la proxima OT arranca en 00001 sola.
--
-- ESTA MIGRACION NO ES REVERSIBLE. Pegala en el SQL Editor de Supabase y
-- revisá el bloque de preview antes de correr el DELETE.

-- =========================================================================
-- PREVIEW: correr esto solo. No modifica nada.
-- =========================================================================

select 'profiles' as tabla, count(*) as filas from public.profiles
union all
select 'equipments', count(*) from public.equipments
union all
select 'work_orders', count(*) from public.work_orders
union all
select 'work_order_parts', count(*) from public.work_order_parts;

-- Quien se va a perder.
select p.id, u.email, p.full_name, p.role, p.is_active, p.is_hidden
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) not in (
  'diegop.salas@gmail.com',
  'ivanvidalsepulveda@gmail.com'
)
order by u.email;

-- Quien sobrevive.
select p.id, u.email, p.full_name, p.role, p.is_active, p.is_hidden
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) in (
  'diegop.salas@gmail.com',
  'ivanvidalsepulveda@gmail.com'
);

-- =========================================================================
-- PURGA: correr recien despues de revisar el preview de arriba.
-- =========================================================================

begin;

-- Guardar por si el listado de preview quedo viejo.
create temporary table purge_survivors as
select p.id
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) in (
  'diegop.salas@gmail.com',
  'ivanvidalsepulveda@gmail.com'
);

-- Si el preview noadro 2 filas, no seguir: aborta aca.
do $$
declare
  encontrados integer;
begin
  select count(*) into encontrados from purge_survivors;
  if encontrados < 2 then
    raise exception 'Se esperaban 2 administradores, se encontraron %. Abortando purga.', encontrados;
  end if;
end $$;

delete from public.work_order_parts;
delete from public.work_orders;
delete from public.equipments;

delete from public.profiles
where id not in (select id from purge_survivors);

-- Verificacion antes de confirmar.
select 'profiles' as tabla, count(*) as filas from public.profiles
union all
select 'equipments', count(*) from public.equipments
union all
select 'work_orders', count(*) from public.work_orders
union all
select 'work_order_parts', count(*) from public.work_order_parts;

-- Primera corrida: dejar en rollback para deshacer todo.
-- rollback;

-- Cuando los conteos de arriba esten bien, cambiar por commit;
commit;
