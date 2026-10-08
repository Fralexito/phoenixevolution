-- 088 · Libro del dinero de cada club de la Liga Máster.
-- Todo cambio de lm_clubes.presupuesto queda registrado automáticamente (trigger): saldo antes, después, motivo, quién.
-- No modifica ninguna función existente: el motivo se deduce, o una función puede fijarlo con
--   perform set_config('lm.motivo', 'premio_jornada', true); perform set_config('lm.ref', '<id>', true);
create table if not exists public.lm_club_libro (
  id bigserial primary key,
  club_id bigint not null references public.lm_clubes(id) on delete cascade,
  delta bigint not null,
  saldo_antes bigint not null,
  saldo_despues bigint not null,
  motivo text not null check (char_length(motivo) <= 40),
  referencia text check (char_length(referencia) <= 80),
  actor uuid,                                  -- auth.uid() de quien disparó el cambio (null = sistema)
  created_at timestamptz not null default now()
);
create index if not exists lm_club_libro_club on public.lm_club_libro (club_id, created_at desc);
alter table public.lm_club_libro enable row level security;
drop policy if exists lm_libro_lectura on public.lm_club_libro;
create policy lm_libro_lectura on public.lm_club_libro for select to authenticated
  using (private.es_moderador() or exists (select 1 from public.lm_clubes c where c.id = club_id and c.dueno = auth.uid()));
-- Sin políticas de escritura: solo el trigger (security definer) escribe. Nadie puede editar ni borrar el historial.

create or replace function private.lm_registrar_dinero() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_motivo text := nullif(current_setting('lm.motivo', true), '');
begin
  if new.presupuesto is not distinct from old.presupuesto then return new; end if;
  if v_motivo is null then
    v_motivo := case
      when old.dueno is distinct from new.dueno then 'activacion_club'
      when exists (select 1 from lm_movimientos m where m.created_at = now() and (m.de_club = new.id or m.a_club = new.id)) then 'traspaso'
      when private.es_moderador() then 'ajuste_staff'
      else 'traspaso' end;
  end if;
  insert into lm_club_libro (club_id, delta, saldo_antes, saldo_despues, motivo, referencia, actor)
  values (new.id, new.presupuesto - old.presupuesto, old.presupuesto, new.presupuesto, v_motivo,
          nullif(current_setting('lm.ref', true), ''), auth.uid());
  return new;
end $$;

drop trigger if exists lm_clubes_libro on public.lm_clubes;
create trigger lm_clubes_libro after update of presupuesto on public.lm_clubes
  for each row execute function private.lm_registrar_dinero();

-- Saldo inicial de los clubes que ya tienen dinero (para que el libro cuadre desde hoy).
insert into public.lm_club_libro (club_id, delta, saldo_antes, saldo_despues, motivo)
select id, presupuesto, 0, presupuesto, 'saldo_inicial' from public.lm_clubes c
where presupuesto <> 0 and not exists (select 1 from public.lm_club_libro l where l.club_id = c.id);
