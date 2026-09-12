alter table public.projects add column if not exists vote_count bigint not null default 0;
create index if not exists projects_owner_idx on public.projects(owner_id);

revoke update on public.projects from authenticated;
grant update (name, team_name, track, tagline, description, repo_url, video_url, cover_url, deck_url, updated_at)
  on public.projects to authenticated;

drop policy if exists "voters submit own ballot" on public.votes;
create policy "voters submit own ballot" on public.votes for insert to authenticated
  with check (voter_id = (select auth.uid()));
grant insert on public.votes to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.require_three_vote_statement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from inserted_votes) <> 3 then
    raise exception '每次必须同时提交三票';
  end if;
  return null;
end;
$$;

drop trigger if exists require_three_vote_statement on public.votes;
create trigger require_three_vote_statement
after insert on public.votes
referencing new table as inserted_votes
for each statement execute function private.require_three_vote_statement();

create or replace function private.increment_project_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects set vote_count = vote_count + 1 where id = new.project_id;
  return new;
end;
$$;

revoke all on function private.increment_project_vote_count() from public, anon, authenticated;
drop trigger if exists increment_project_vote_count on public.votes;
create trigger increment_project_vote_count
after insert on public.votes
for each row execute function private.increment_project_vote_count();

create or replace function public.submit_ballot(project_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  voter uuid := auth.uid();
begin
  if voter is null then raise exception '请先登录'; end if;
  if cardinality(project_ids) <> 3 or (select count(distinct x) from unnest(project_ids) x) <> 3 then
    raise exception '必须选择三个不同的作品';
  end if;
  if exists (select 1 from public.votes where voter_id = voter) then
    raise exception '你已经提交过选票';
  end if;
  if (select count(*) from public.projects where id = any(project_ids) and status = 'published') <> 3 then
    raise exception '选票中包含无效作品';
  end if;
  insert into public.votes(voter_id, project_id, rank)
  values (voter, project_ids[1], 1), (voter, project_ids[2], 2), (voter, project_ids[3], 3);
end;
$$;

revoke all on function public.submit_ballot(uuid[]) from public, anon;
grant execute on function public.submit_ballot(uuid[]) to authenticated;

create or replace function public.get_leaderboard()
returns table (
  id uuid, name text, team_name text, track text, tagline text, description text,
  repo_url text, video_url text, cover_url text, deck_url text, created_at timestamptz, vote_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.name, p.team_name, p.track, p.tagline, p.description,
         p.repo_url, p.video_url, p.cover_url, p.deck_url, p.created_at, p.vote_count
  from public.projects p
  where p.status = 'published'
  order by p.vote_count desc, p.created_at asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
