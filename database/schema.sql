-- Enable RLS (Row Level Security)
alter table if exists public.users enable row level security;
alter table if exists public.playlists enable row level security;
alter table if exists public.notes_usage enable row level security;
alter table if exists public.video_progress enable row level security;

-- Drop dependent functions first to avoid errors on re-run
drop function if exists public.check_and_update_notes_usage(text);
drop function if exists public.get_notes_usage_count(text);
drop function if exists public.get_ist_date();

-- Create users table
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create playlists table
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  youtube_playlist_id text not null,
  playlist_id text not null, -- YouTube playlist ID (duplicate for API compatibility)
  thumbnail_url text,
  channel_id text,
  channel_title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notes_usage table for tracking daily usage limits
create table if not exists public.notes_usage (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete cascade not null,
  usage_date date not null,
  usage_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, usage_date)
);

-- Create video_progress table for tracking video watch progress
create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete cascade not null,
  playlist_id text not null,
  video_id text not null,
  watched_seconds integer default 0 not null,
  duration integer default 0 not null,
  completed boolean default false not null,
  last_watched timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, playlist_id, video_id)
);

-- Create RLS policies for users table
drop policy if exists "Users can view own data" on public.users;
create policy "Users can view own data" on public.users
  for select using (auth.uid()::text = id);

drop policy if exists "Users can update own data" on public.users;
create policy "Users can update own data" on public.users
  for update using (auth.uid()::text = id);

drop policy if exists "Users can insert own data" on public.users;
create policy "Users can insert own data" on public.users
  for insert with check (auth.uid()::text = id);

-- Create RLS policies for playlists table
drop policy if exists "Users can view own playlists" on public.playlists;
create policy "Users can view own playlists" on public.playlists
  for select using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own playlists" on public.playlists;
create policy "Users can insert own playlists" on public.playlists
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "Users can update own playlists" on public.playlists;
create policy "Users can update own playlists" on public.playlists
  for update using (auth.uid()::text = user_id);

drop policy if exists "Users can delete own playlists" on public.playlists;
create policy "Users can delete own playlists" on public.playlists
  for delete using (auth.uid()::text = user_id);

-- Create RLS policies for notes_usage table
drop policy if exists "Users can view own notes usage" on public.notes_usage;
create policy "Users can view own notes usage" on public.notes_usage
  for select using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own notes usage" on public.notes_usage;
create policy "Users can insert own notes usage" on public.notes_usage
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "Users can update own notes usage" on public.notes_usage;
create policy "Users can update own notes usage" on public.notes_usage
  for update using (auth.uid()::text = user_id);

-- Create RLS policies for video_progress table
drop policy if exists "Users can view own video progress" on public.video_progress;
create policy "Users can view own video progress" on public.video_progress
  for select using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own video progress" on public.video_progress;
create policy "Users can insert own video progress" on public.video_progress
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "Users can update own video progress" on public.video_progress;
create policy "Users can update own video progress" on public.video_progress
  for update using (auth.uid()::text = user_id);

drop policy if exists "Users can delete own video progress" on public.video_progress;
create policy "Users can delete own video progress" on public.video_progress
  for delete using (auth.uid()::text = user_id);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
drop trigger if exists handle_users_updated_at on public.users;
create trigger handle_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

drop trigger if exists handle_playlists_updated_at on public.playlists;
create trigger handle_playlists_updated_at
  before update on public.playlists
  for each row execute function public.handle_updated_at();

drop trigger if exists handle_notes_usage_updated_at on public.notes_usage;
create trigger handle_notes_usage_updated_at
  before update on public.notes_usage
  for each row execute function public.handle_updated_at();

drop trigger if exists handle_video_progress_updated_at on public.video_progress;
create trigger handle_video_progress_updated_at
  before update on public.video_progress
  for each row execute function public.handle_updated_at();

-- Create function to get current IST date
create or replace function public.get_ist_date()
returns date as $$
begin
  return (now() at time zone 'Asia/Kolkata')::date;
end;
$$ language plpgsql;

-- Create function to get current usage count
create or replace function public.get_notes_usage_count(user_id_param text)
returns integer as $$
declare
  current_date_ist date := public.get_ist_date();
  current_usage_count integer := 0;
begin
  select coalesce(usage_count, 0) into current_usage_count
  from public.notes_usage
  where user_id = user_id_param and usage_date = current_date_ist;
  
  return current_usage_count;
end;
$$ language plpgsql;

-- Create function to check and update daily usage limit
create or replace function public.check_and_update_notes_usage(user_id_param text)
returns table(can_use boolean, current_count integer) as $$
declare
  current_date_ist date := public.get_ist_date();
  usage_record public.notes_usage;
begin
  -- First, ensure a row exists for today for the user.
  insert into public.notes_usage (user_id, usage_date, usage_count)
  values (user_id_param, current_date_ist, 0)
  on conflict (user_id, usage_date) do nothing;
  
  -- Now, select the row for update, which locks it to prevent race conditions.
  select * into usage_record
  from public.notes_usage
  where user_id = user_id_param and usage_date = current_date_ist
  for update;
  
  -- Check if they can use the feature
  if usage_record.usage_count < 3 then
    -- They can, so increment and return success
    update public.notes_usage
    set usage_count = usage_record.usage_count + 1, updated_at = now()
    where id = usage_record.id
    returning usage_count into usage_record.usage_count;
    
    return query select true, usage_record.usage_count;
  else
    -- They can't, so just return the current state
    return query select false, usage_record.usage_count;
  end if;
end;
$$ language plpgsql security definer;

-- Grant execute permissions on the functions
grant execute on function public.get_ist_date() to authenticated, service_role;
grant execute on function public.get_notes_usage_count(text) to authenticated, service_role;
grant execute on function public.check_and_update_notes_usage(text) to authenticated, service_role; 