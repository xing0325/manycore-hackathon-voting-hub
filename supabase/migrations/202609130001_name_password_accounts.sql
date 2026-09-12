create table if not exists public.participants (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  normalized_name text not null unique check (char_length(normalized_name) between 2 and 40),
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;

drop policy if exists "participants read own profile" on public.participants;
create policy "participants read own profile" on public.participants for select to authenticated
  using (id = (select auth.uid()));

grant select on public.participants to authenticated;
revoke insert, update, delete on public.participants from anon, authenticated;

create or replace function private.prepare_manycore_name_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  display_name text;
  normalized_name text;
  expected_email text;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', '') <> 'manycore_name_password' then
    return new;
  end if;

  display_name := btrim(new.raw_user_meta_data ->> 'display_name');
  if char_length(btrim(new.raw_user_meta_data ->> 'team_name')) < 2 then
    raise exception '组名长度需为 2–40 个字符';
  end if;
  normalized_name := lower(regexp_replace(display_name, '\\s+', ' ', 'g'));
  if char_length(display_name) < 2 or char_length(display_name) > 40 then
    raise exception '本名长度需为 2–40 个字符';
  end if;

  expected_email := 'u-' || encode(convert_to(normalized_name, 'UTF8'), 'hex') || '@manycore.vote';
  new.email := expected_email;
  new.raw_user_meta_data := jsonb_set(new.raw_user_meta_data, '{normalized_name}', to_jsonb(normalized_name), true);
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

create or replace function private.create_manycore_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', '') = 'manycore_name_password' then
    insert into public.participants(id, display_name, normalized_name)
    values (new.id, new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'normalized_name');
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_manycore_name_account() from public, anon, authenticated;
revoke all on function private.create_manycore_participant() from public, anon, authenticated;

drop trigger if exists prepare_manycore_name_account on auth.users;
create trigger prepare_manycore_name_account
before insert on auth.users
for each row execute function private.prepare_manycore_name_account();

drop trigger if exists create_manycore_participant on auth.users;
create trigger create_manycore_participant
after insert on auth.users
for each row execute function private.create_manycore_participant();

drop policy if exists "authenticated users submit own projects" on public.projects;
create policy "authenticated users submit own projects" on public.projects for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.participants where id = (select auth.uid()))
  );

create unique index if not exists projects_owner_unique_idx on public.projects(owner_id) where owner_id is not null;

drop policy if exists "voters submit own ballot" on public.votes;
create policy "voters submit own ballot" on public.votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (select 1 from public.participants where id = (select auth.uid()))
  );
