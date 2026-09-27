-- Regla de negocio: no permitir una nueva OT para un equipo si la ultima OT
-- fue hace menos de 180 dias. Aplica a todos los usuarios, no solo a la UI.
create or replace function public.enforce_work_order_periodicity()
returns trigger
language plpgsql
as $$
declare
  v_last date;
  v_days integer;
begin
  select max(intervention_date) into v_last
  from public.work_orders
  where equipment_id = new.equipment_id
    and id is distinct from new.id;

  -- Primer OT del equipo: siempre permitido.
  if v_last is null then
    return new;
  end if;

  v_days := (new.intervention_date - v_last)::integer;

  if v_days < 180 then
    raise exception
      'No se puede crear una nueva OT para el equipo %: la ultima fue hace % dias (minimo 180). Faltan % dias.',
      new.equipment_id, v_days, (180 - v_days)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_work_order_periodicity on public.work_orders;

create trigger trg_work_order_periodicity
before insert on public.work_orders
for each row execute function public.enforce_work_order_periodicity();
