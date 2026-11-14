-- EAS v5.6: the adaptive-alif tile mode.
-- games.tile_mode was created with an inline CHECK ('expanded','basic'). The new mode id is 'adaptive', so the constraint is replaced.
-- Nothing else changes: the match chat lives in the existing games.ext jsonb column (no new column, no new table), and the adaptive alif is a tile
-- of the bag like any other (racks and the board are jsonb).
-- Safe to run more than once.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.games'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%tile_mode%'
  loop
    execute format('alter table public.games drop constraint %I', c);
  end loop;
  alter table public.games add constraint games_tile_mode_check check (tile_mode in ('expanded','basic','adaptive'));
end $$;
