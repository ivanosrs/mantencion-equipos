-- El numero de serie ya era UNIQUE (0001), pero distinguia mayusculas y espacios:
-- "ABC-123", "abc-123" y "ABC-123 " convivian como equipos distintos.
-- Se agrega un indice unico sobre la forma normalizada. Sigue aplicando a los
-- equipos desactivados (is_active = false): ocupan su serial hasta que se
-- restauren o se cambie el serial.

-- 1. Si ya hay duplicados al ignorar mayusculas y espacios, el indice no se
--    puede crear. Se aborta con la lista para corregirlos a mano antes.
do $$
declare
  dup record;
  detalle text := '';
begin
  for dup in
    select lower(btrim(serial_number)) as serial, count(*) as total
    from public.equipments
    group by lower(btrim(serial_number))
    having count(*) > 1
  loop
    detalle := detalle || format(E'\n  - "%s" (%s equipos)', dup.serial, dup.total);
  end loop;

  if detalle <> '' then
    raise exception 'Hay numeros de serie duplicados al ignorar mayusculas y espacios. Corrigelos y vuelve a ejecutar:%', detalle;
  end if;
end $$;

-- 2. Recortar los espacios sobrantes de los seriales ya guardados, para que
--    coincidan con lo que el formulario guarda desde ahora.
update public.equipments
set serial_number = btrim(serial_number)
where serial_number <> btrim(serial_number);

-- 3. Unicidad sin distinguir mayusculas ni espacios en los extremos.
create unique index if not exists equipments_serial_number_normalized_key
  on public.equipments (lower(btrim(serial_number)));
