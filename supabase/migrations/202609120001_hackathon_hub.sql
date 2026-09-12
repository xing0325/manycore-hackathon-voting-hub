create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  team_name text not null check (char_length(team_name) between 2 and 100),
  track text not null default '开放创新',
  tagline text not null default '',
  description text not null default '',
  repo_url text,
  video_url text,
  cover_url text,
  deck_url text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id bigint generated always as identity primary key,
  voter_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  created_at timestamptz not null default now(),
  unique (voter_id, project_id),
  unique (voter_id, rank)
);

create index if not exists projects_status_created_idx on public.projects(status, created_at desc);
create index if not exists votes_project_idx on public.votes(project_id);

alter table public.projects enable row level security;
alter table public.votes enable row level security;

drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public" on public.projects for select
  using (status = 'published' or owner_id = (select auth.uid()));

drop policy if exists "authenticated users submit own projects" on public.projects;
create policy "authenticated users submit own projects" on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners update projects" on public.projects;
create policy "owners update projects" on public.projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "voters read own ballot" on public.votes;
create policy "voters read own ballot" on public.votes for select to authenticated
  using (voter_id = (select auth.uid()));

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant select on public.votes to authenticated;
revoke insert, update, delete on public.votes from anon, authenticated;

create or replace function public.submit_ballot(project_ids uuid[])
returns void
language plpgsql
security definer
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
security definer
set search_path = ''
as $$
  select p.id, p.name, p.team_name, p.track, p.tagline, p.description,
         p.repo_url, p.video_url, p.cover_url, p.deck_url, p.created_at, count(v.id) as vote_count
  from public.projects p
  left join public.votes v on v.project_id = p.id
  where p.status = 'published'
  group by p.id
  order by vote_count desc, p.created_at asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-assets', 'project-assets', true, 52428800,
  array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads project assets" on storage.objects;
create policy "public reads project assets" on storage.objects for select
  using (bucket_id = 'project-assets');

drop policy if exists "users upload own project assets" on storage.objects;
create policy "users upload own project assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users update own project assets" on storage.objects;
create policy "users update own project assets" on storage.objects for update to authenticated
  using (bucket_id = 'project-assets' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users delete own project assets" on storage.objects;
create policy "users delete own project assets" on storage.objects for delete to authenticated
  using (bucket_id = 'project-assets' and owner_id = (select auth.uid())::text);

insert into public.projects (id, name, team_name, track, tagline, description, repo_url, video_url, cover_url)
values
('11111111-1111-4111-8111-111111111111','NeuralSpace Architect','空间魔法师团队','空间智能','一句话生成可编辑的沉浸式空间。','结合多模态模型与程序化建模，将自然语言快速转化为可编辑的三维场景。','https://github.com/ManyCore-research','https://www.bilibili.com/','https://xing0325.github.io/manycore-hackathon-voting-hub/assets/hosted-b752385f33d6181e.jpg'),
('22222222-2222-4222-8222-222222222222','RenderMesh Turbo','Photon Chasers','实时渲染','浏览器端实时神经渲染与网格重建。','通过 GPU 并行与轻量级神经场，让高质量空间重建直接运行在浏览器中。','https://github.com/ManyCore-research','https://www.youtube.com/','https://xing0325.github.io/manycore-hackathon-voting-hub/assets/hosted-6274787d68edd039.jpg'),
('33333333-3333-4333-8333-333333333333','Coohom Copilot','Inspiration Lab','生成式 AI','懂设计规范的空间智能助手。','将大语言模型与空间设计 API 结合，完成方案生成、检查和迭代。','https://github.com/ManyCore-research','https://drive.google.com/','https://xing0325.github.io/manycore-hackathon-voting-hub/assets/hosted-9a2a104b7a064ac4.jpg'),
('44444444-4444-4444-8444-444444444444','SpatialFlow OS','Vector Forge','开放创新','面向空间应用的可组合智能工作流。','通过可视化节点连接感知、推理和渲染模块，快速构建空间智能应用。','https://github.com/ManyCore-research',null,'https://xing0325.github.io/manycore-hackathon-voting-hub/assets/hosted-308893c902705ee2.jpg')
on conflict (id) do nothing;
