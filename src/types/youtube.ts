// types.ts
export interface VideoProgress {
    watched_seconds: number;
    total_seconds: number;
    completed: boolean;
    last_watched: string;
}

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    publishedAt: string;
    channelTitle: string;
    viewCount: string;
    playlistTitle?: string;
}

export interface YouTubeComment {
    id: string;
    text: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
    authorChannelUrl: string;
    replies?: YouTubeComment[];
}

export interface YouTubePlayerProps {
    videoId: string;
    startTime: number;
    onPlayerReady: (player: any) => void;
    onStateChange?: (event: { data: number }) => void;
    onProgress?: (currentTime: number) => void;
    onProgressUpdate?: (currentTime: number, duration: number) => Promise<void>;
    onVideoEnd?: () => Promise<void>;
    onVideoStart?: () => void;
    className?: string;
}

// utils.ts
export function parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}
