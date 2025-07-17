import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// POST: Save video progress
export async function POST(request: NextRequest) {
    try {
        console.log('=== Save Progress API Called ===');

        // Get user session
        const session = await auth();
        console.log('Session:', session);

        if (!session?.user?.id) {
            console.log('Unauthorized - no valid session');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        const body = await request.json();
        console.log('Request body:', body);

        const {
            playlistId,
            videoId,
            currentTime,
            duration,
            completed = false
        } = body;

        if (!playlistId || !videoId || currentTime === undefined || duration === undefined) {
            console.log('Missing required fields:', { playlistId, videoId, currentTime, duration });
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if progress record exists
        console.log('Checking for existing progress...');
        const { data: existingProgress, error: selectError } = await supabaseServer
            .from('video_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('playlist_id', playlistId)
            .eq('video_id', videoId)
            .single();

        console.log('Existing progress check result:', { existingProgress, selectError });

        const progressData = {
            user_id: userId,
            playlist_id: playlistId,
            video_id: videoId,
            watched_seconds: Math.round(currentTime),
            duration: Math.round(duration),
            completed: completed || (currentTime / duration) >= 0.9, // 90% watched = completed
            last_watched: new Date().toISOString(),
        };

        console.log('Progress data to save:', progressData);

        let result;
        if (existingProgress) {
            // Update existing progress
            console.log('Updating existing progress...');
            const { data, error } = await supabaseServer
                .from('video_progress')
                .update(progressData)
                .eq('id', existingProgress.id)
                .select()
                .single();

            result = { data, error };
        } else {
            // Create new progress record
            console.log('Creating new progress record...');
            const { data, error } = await supabaseServer
                .from('video_progress')
                .insert(progressData)
                .select()
                .single();

            result = { data, error };
        }

        console.log('Database operation result:', result);

        if (result.error) {
            console.error('Database error:', result.error);
            return NextResponse.json(
                { error: 'Failed to save progress', details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            progress: result.data,
        });

    } catch (error) {
        console.error('API error:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET: Retrieve video progress for a playlist
export async function GET(request: NextRequest) {
    try {
        // Get user session
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        const { searchParams } = new URL(request.url);
        const playlistId = searchParams.get('playlistId');

        // Get all progress for the user (optionally filtered by playlist)
        let query = supabaseServer
            .from('video_progress')
            .select('*')
            .eq('user_id', userId);

        if (playlistId) {
            query = query.eq('playlist_id', playlistId);
        }

        const { data: progressData, error } = await query
            .order('last_watched', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch progress' },
                { status: 500 }
            );
        }

        // Calculate analytics
        const totalVideos = progressData.length;
        const completedVideos = progressData.filter(p => p.completed).length;
        const totalWatchTime = progressData.reduce((sum, p) => sum + p.watched_seconds, 0);
        const totalDuration = progressData.reduce((sum, p) => sum + p.duration, 0);

        // Daily progress (group by date)
        const dailyProgress = progressData.reduce((acc: any[], progress) => {
            const date = new Date(progress.last_watched).toDateString();
            const existing = acc.find(d => d.date === date);

            if (existing) {
                existing.videos += 1;
                existing.minutes += Math.round(progress.watched_seconds / 60);
            } else {
                acc.push({
                    date,
                    day: new Date(progress.last_watched).toLocaleDateString('en-US', { weekday: 'short' }),
                    videos: 1,
                    minutes: Math.round(progress.watched_seconds / 60),
                });
            }

            return acc;
        }, []).slice(0, 7); // Last 7 days

        return NextResponse.json({
            progress: progressData,
            analytics: {
                totalVideos,
                completedVideos,
                totalWatchTime,
                totalDuration,
                completionRate: totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0,
                dailyProgress,
            }
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 