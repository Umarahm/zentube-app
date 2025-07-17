-- Migration to add missing columns and tables
-- Run this script to update your existing database

-- Add missing columns to playlists table
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS playlist_id text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS channel_id text,
ADD COLUMN IF NOT EXISTS channel_title text;

-- Update playlist_id to match youtube_playlist_id for existing records
UPDATE public.playlists 
SET playlist_id = youtube_playlist_id 
WHERE playlist_id IS NULL;

-- Make playlist_id NOT NULL after updating existing records
ALTER TABLE public.playlists 
ALTER COLUMN playlist_id SET NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.playlists.playlist_id IS 'YouTube playlist ID (duplicate of youtube_playlist_id for API compatibility)';

-- Create video_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_progress (
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

-- Enable RLS for video_progress table
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_progress table
DROP POLICY IF EXISTS "Users can view own video progress" ON public.video_progress;
CREATE POLICY "Users can view own video progress" ON public.video_progress
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own video progress" ON public.video_progress;
CREATE POLICY "Users can insert own video progress" ON public.video_progress
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own video progress" ON public.video_progress;
CREATE POLICY "Users can update own video progress" ON public.video_progress
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own video progress" ON public.video_progress;
CREATE POLICY "Users can delete own video progress" ON public.video_progress
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create trigger for video_progress updated_at
DROP TRIGGER IF EXISTS handle_video_progress_updated_at ON public.video_progress;
CREATE TRIGGER handle_video_progress_updated_at
  BEFORE UPDATE ON public.video_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();