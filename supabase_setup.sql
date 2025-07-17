-- Drop existing table if it exists (with CASCADE to drop dependent objects)
DROP TABLE IF EXISTS video_progress CASCADE;

-- Create video_progress table for tracking video watch progress
CREATE TABLE video_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Changed from UUID to TEXT for OAuth compatibility
    playlist_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    watched_seconds INTEGER NOT NULL DEFAULT 0, -- Current playback time in seconds
    duration INTEGER NOT NULL DEFAULT 0, -- Total video duration in seconds
    completed BOOLEAN NOT NULL DEFAULT false,
    last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS video_progress_user_id_idx ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS video_progress_playlist_id_idx ON video_progress(playlist_id);
CREATE INDEX IF NOT EXISTS video_progress_video_id_idx ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS video_progress_last_watched_idx ON video_progress(last_watched);

-- Create unique constraint to prevent duplicate progress entries
CREATE UNIQUE INDEX IF NOT EXISTS video_progress_unique_user_playlist_video 
ON video_progress(user_id, playlist_id, video_id);

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_progress_updated_at 
    BEFORE UPDATE ON video_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 