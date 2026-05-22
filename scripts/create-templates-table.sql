-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists message_templates (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  step        smallint    not null check (step in (1, 2, 3)),
  subject     text        not null,
  body        text        not null,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists message_templates_user_id_idx on message_templates(user_id);
create index if not exists message_templates_step_idx    on message_templates(step);

-- Row-level security (the backend uses service role, but good practice)
alter table message_templates enable row level security;

create policy "Users manage their own templates"
  on message_templates for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
