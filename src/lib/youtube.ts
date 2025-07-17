import { google } from 'googleapis';

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    publishedAt: string;
    channelTitle: string;
    viewCount: string;
}

export interface YouTubeThumbnail {
    url: string;
    width: number;
    height: number;
}

export interface YouTubePlaylist {
    id: string;
    title: string;
    description: string;
    thumbnails: {
        default?: YouTubeThumbnail;
        medium?: YouTubeThumbnail;
        high?: YouTubeThumbnail;
    };
    channelId: string;
    channelTitle: string;
    itemCount?: number;
}

export interface YouTubeComment {
    id: string;
    text: string;
    authorName: string;
    authorProfileImageUrl: string;
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
    replies?: YouTubeComment[];
}

export async function getPlaylistDetails(playlistId: string): Promise<YouTubePlaylist | null> {
    try {
        const response = await youtube.playlists.list({
            part: ['snippet', 'contentDetails'],
            id: [playlistId],
        });

        const playlist = response.data.items?.[0];
        if (!playlist?.snippet) return null;

        const { snippet } = playlist;
        return {
            id: playlist.id || playlistId,
            title: snippet.title || 'Untitled Playlist',
            description: snippet.description || '',
            thumbnails: {
                default: snippet.thumbnails?.default ? {
                    url: snippet.thumbnails.default.url || '',
                    width: snippet.thumbnails.default.width || 120,
                    height: snippet.thumbnails.default.height || 90,
                } : undefined,
                medium: snippet.thumbnails?.medium ? {
                    url: snippet.thumbnails.medium.url || '',
                    width: snippet.thumbnails.medium.width || 320,
                    height: snippet.thumbnails.medium.height || 180,
                } : undefined,
                high: snippet.thumbnails?.high ? {
                    url: snippet.thumbnails.high.url || '',
                    width: snippet.thumbnails.high.width || 480,
                    height: snippet.thumbnails.high.height || 360,
                } : undefined,
            },
            channelId: snippet.channelId || '',
            channelTitle: snippet.channelTitle || 'Unknown Channel',
            itemCount: playlist.contentDetails?.itemCount || 0,
        };
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return null;
    }
}

export async function getPlaylistVideos(
    playlistId: string,
    pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
    try {
        console.log(`Fetching 50 videos from playlist ${playlistId}${pageToken ? ` (page token: ${pageToken})` : ''}`);

        const response = await youtube.playlistItems.list({
            part: ['snippet', 'contentDetails'],
            playlistId: playlistId,
            maxResults: 50, // YouTube API maximum per request
            pageToken,
        });

        if (!response.data.items || response.data.items.length === 0) {
            return { videos: [] };
        }

        console.log(`Fetched ${response.data.items.length} video items`);

        // Get video IDs for batch processing
        const videoIds = response.data.items
            .map(item => item.contentDetails?.videoId)
            .filter((id): id is string => !!id);

        if (videoIds.length === 0) {
            return { videos: [] };
        }

        // Fetch video details in batch
        const videoResponse = await youtube.videos.list({
            part: ['contentDetails', 'statistics'],
            id: videoIds,
        });

        const videoDetails = videoResponse.data.items || [];
        const videoDetailsMap = new Map(
            videoDetails.map(video => [video.id, video])
        );

        // Process videos
        const videos = response.data.items
            .map(item => {
                if (!item.snippet) return null;

                const videoId = item.contentDetails?.videoId;
                if (!videoId) return null;

                const videoDetail = videoDetailsMap.get(videoId);
                if (!videoDetail) return null;

                return {
                    id: videoId,
                    title: item.snippet.title || 'Untitled Video',
                    description: item.snippet.description || '',
                    thumbnail: item.snippet.thumbnails?.high?.url ||
                        item.snippet.thumbnails?.medium?.url ||
                        item.snippet.thumbnails?.default?.url || '',
                    duration: videoDetail.contentDetails?.duration || 'PT0S',
                    publishedAt: item.snippet.publishedAt || new Date().toISOString(),
                    channelTitle: item.snippet.channelTitle || 'Unknown Channel',
                    viewCount: videoDetail.statistics?.viewCount?.toString() || '0',
                };
            })
            .filter((v): v is YouTubeVideo => v !== null);

        // Remove duplicates based on video ID
        const uniqueVideos = videos.filter((video, index, array) =>
            array.findIndex(v => v.id === video.id) === index
        );

        console.log(`Successfully processed ${videos.length} videos (${uniqueVideos.length} unique)`);

        return {
            videos: uniqueVideos,
            nextPageToken: response.data.nextPageToken || undefined,
        };
    } catch (error) {
        console.error('Error fetching playlist videos:', error);
        return { videos: [] };
    }
}

export async function getVideoComments(videoId: string, maxResults = 20): Promise<YouTubeComment[]> {
    try {
        const response = await youtube.commentThreads.list({
            part: ['snippet', 'replies'],
            videoId: videoId,
            maxResults: maxResults,
            order: 'relevance',
        });

        const comments = (response.data.items || []).map(thread => {
            const comment = thread.snippet?.topLevelComment?.snippet;
            if (!comment) return null;

            const replies = thread.replies?.comments?.map(reply => {
                if (!reply.snippet) return null;
                return {
                    id: reply.id || '',
                    text: reply.snippet.textDisplay || '',
                    authorName: reply.snippet.authorDisplayName || '',
                    authorProfileImageUrl: reply.snippet.authorProfileImageUrl || '',
                    likeCount: reply.snippet.likeCount || 0,
                    publishedAt: reply.snippet.publishedAt || '',
                    updatedAt: reply.snippet.updatedAt || '',
                } as YouTubeComment;
            }).filter((r): r is YouTubeComment => r !== null) || [];

            const result: YouTubeComment = {
                id: thread.id || '',
                text: comment.textDisplay || '',
                authorName: comment.authorDisplayName || '',
                authorProfileImageUrl: comment.authorProfileImageUrl || '',
                likeCount: comment.likeCount || 0,
                publishedAt: comment.publishedAt || '',
                updatedAt: comment.updatedAt || '',
                replies,
            };

            return result;
        });

        return comments.filter((c): c is YouTubeComment => c !== null);
    } catch (error) {
        console.error('Error fetching video comments:', error);
        return [];
    }
}

export function extractPlaylistId(url: string): string | null {
    const patterns = [
        /[?&]list=([^#\&\?]+)/,
        /youtube.com\/playlist\/([^#\&\?]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match?.[1]) return match[1];
    }

    return null;
}