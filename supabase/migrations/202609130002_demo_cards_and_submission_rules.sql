alter table public.projects add column if not exists is_demo boolean not null default false;
alter table public.projects add column if not exists team_key uuid;
create unique index if not exists projects_team_unique_idx on public.projects (lower(btrim(team_name))) where owner_id is not null and is_demo = false;

update public.projects
set is_demo = true,
    name = case id
      when '11111111-1111-4111-8111-111111111111' then '示例卡片 · 作品怎么提交'
      when '22222222-2222-4222-8222-222222222222' then '示例卡片 · GitHub + PPT'
      when '33333333-3333-4333-8333-333333333333' then '示例卡片 · 视频链接可选'
      when '44444444-4444-4444-8444-444444444444' then '示例卡片 · 没有封面也可以'
      else name end,
    tagline = case id
      when '11111111-1111-4111-8111-111111111111' then '占位示例：队名、作品名、GitHub 和 PPT 都是必填项。'
      when '22222222-2222-4222-8222-222222222222' then '占位示例：仓库填 URL，PPT 上传到本平台。'
      when '33333333-3333-4333-8333-333333333333' then '占位示例：演示视频可以留空，提交后仍可编辑。'
      when '44444444-4444-4444-8444-444444444444' then '占位示例：不上传封面时自动生成群核海报封面。'
      else tagline end,
    description = case id
      when '11111111-1111-4111-8111-111111111111' then '这是教学用占位卡片，不代表真实参赛作品。每个账号/参赛组限提交一份作品，提交后只能编辑自己的作品。'
      when '22222222-2222-4222-8222-222222222222' then '这是教学用占位卡片：GitHub 仓库必须填写，PPT 必须上传，视频链接可选。'
      when '33333333-3333-4333-8333-333333333333' then '这是教学用占位卡片：赛道支持自定义，也可以填写“其他”。'
      when '44444444-4444-4444-8444-444444444444' then '这是教学用占位卡片：封面可选，缺少封面时系统会使用群核海报并叠加作品名。'
      else description end
where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444');

drop policy if exists "authenticated users submit own projects" on public.projects;
create policy "authenticated users submit own projects" on public.projects for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.participants where id = (select auth.uid()))
    and not exists (select 1 from public.projects where owner_id = (select auth.uid()))
  );

drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public" on public.projects for select
  using (status = 'published' or owner_id = (select auth.uid()));
