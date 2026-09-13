-- Enable event delivery for the live dashboard. The frontend also keeps an
-- 8-second polling fallback, so the dashboard remains current if a workspace
-- has not enabled Realtime yet.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
     ) then
    alter publication supabase_realtime add table public.projects;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
     ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end;
$$;
