import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistDetails, getPlaylistVideos, extractPlaylistId } from '@/lib/youtube';
import { supabaseServer } from '@/lib/supabase';
import { auth } from '@/lib/auth';

interface RequestBody {
    url: string;
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as RequestBody;
        const playlistId = extractPlaylistId(body.url);

        if (!playlistId) {
            return NextResponse.json(
                { error: 'Invalid playlist URL' },
                { status: 400 }
            );
        }

        // Fetch playlist details and videos in parallel
        const [playlistDetails, playlistVideosResult] = await Promise.all([
            getPlaylistDetails(playlistId),
            getPlaylistVideos(playlistId)
        ]);

        if (!playlistDetails) {
            return NextResponse.json(
                { error: 'Failed to fetch playlist details' },
                { status: 404 }
            );
        }

        // Add the playlist to the database
        const { error: dbError } = await supabaseServer
            .from('playlists')
            .insert({
                user_id: session.user.id,
                youtube_playlist_id: playlistId,
                playlist_id: playlistId, // Keep both for compatibility
                title: playlistDetails.title,
                description: playlistDetails.description,
                thumbnail_url: playlistDetails.thumbnails.high?.url ||
                    playlistDetails.thumbnails.medium?.url ||
                    playlistDetails.thumbnails.default?.url || '',
                channel_id: playlistDetails.channelId,
                channel_title: playlistDetails.channelTitle,
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json(
                { error: 'Failed to save playlist' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            playlist: playlistDetails,
            videos: playlistVideosResult.videos
        });
    } catch (error) {
        console.error('Error adding playlist:', error);
        return NextResponse.json(
            { error: 'Failed to add playlist' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const playlistId = searchParams.get('id');
        const pageToken = searchParams.get('pageToken');

        if (!playlistId) {
            return NextResponse.json(
                { error: 'Playlist ID is required' },
                { status: 400 }
            );
        }

        // Fetch playlist videos with pagination support
        const playlistVideosResult = await getPlaylistVideos(playlistId, pageToken || undefined);

        if (!playlistVideosResult.videos || playlistVideosResult.videos.length === 0) {
            // If no videos found and it's the first page, try to get playlist details to check if playlist exists
            if (!pageToken) {
                const playlistDetails = await getPlaylistDetails(playlistId);
                if (!playlistDetails) {
                    return NextResponse.json(
                        { error: 'Playlist not found' },
                        { status: 404 }
                    );
                }
                // Playlist exists but has no videos
                return NextResponse.json({
                    playlistDetails,
                    videos: [],
                    totalResults: 0,
                    nextPageToken: undefined
                });
            } else {
                // No more videos for pagination
                return NextResponse.json({
                    videos: [],
                    totalResults: 0,
                    nextPageToken: undefined
                });
            }
        }

        // For first page, also get playlist details
        let playlistDetails = null;
        if (!pageToken) {
            playlistDetails = await getPlaylistDetails(playlistId);
        }

        return NextResponse.json({
            playlistDetails,
            videos: playlistVideosResult.videos,
            totalResults: playlistVideosResult.videos.length,
            nextPageToken: playlistVideosResult.nextPageToken
        });
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return NextResponse.json(
            { error: 'Failed to fetch playlist' },
            { status: 500 }
        );
    }
}
