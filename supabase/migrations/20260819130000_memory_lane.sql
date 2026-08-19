-- Memory Lane: keep the keepsake types the UI understands bounded, and make
-- sure a given source (user_id, source_type, source_id) can never write a
-- duplicate keepsake. source_id is nullable; Postgres treats NULLs as distinct
-- in the unique index, so app-level dedup covers the (rare) null-source case.
alter table public.memories
  add constraint memories_memory_type_check
  check (memory_type in ('milestone', 'streak', 'garden', 'journal'));

create unique index memories_source_unique
  on public.memories (user_id, source_type, source_id);