"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import YouTubePlayer from "@/components/ui/youtube-player";
import NotesDialog from "@/components/notes-dialog";
import {
    Play,
    SkipForward,
    SkipBack,
    Eye,
    CheckCircle,
    ArrowLeft,
    Loader2,
    PlayCircle,
    Users,
    Calendar,
    Target,
    Link as LinkIcon,
    FileText,
    ChevronDown,
    ChevronUp,
    Plus
} from "lucide-react";
import { parseDuration, formatDuration } from '@/lib/utils';



// Function to decode HTML entities and clean up text
function decodeHtmlEntities(text: string | undefined | null): string {
    if (!text) return '';

    return text
        .replace(/<br\s*\/?>/gi, '\n') // Replace <br> tags with newlines
        .replace(/<[^>]*>/g, '') // Remove any other HTML tags
        .replace(/&amp;/g, '&') // Decode common HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&/g, '&') // Handle any remaining & symbols
        .trim();
}

// Component to display pinned comment
function PinnedComment({ comment }: { comment: YouTubeComment }) {
    const cleanText = decodeHtmlEntities(comment.text);

    return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full overflow-hidden bg-muted">
                    {comment.authorProfileImageUrl ? (
                        <img
                            src={comment.authorProfileImageUrl}
                            alt={comment.authorDisplayName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                            {comment.authorDisplayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.authorDisplayName}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Pinned</Badge>
                </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {cleanText}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <span>❤️ {comment.likeCount}</span>
                </div>
                <span>•</span>
                <span>{new Date(comment.publishedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
}

// Component to display video description with essential links
function VideoDescription({ description }: { description: string }) {
    const [showFullDescription, setShowFullDescription] = useState(false);

    // Parse HTML content and extract information
    const parseDescription = (htmlContent: string) => {
        // Extract links from HTML anchor tags
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/g;
        const urlRegex = /(https?:\/\/[^\s<>"]+)/g;

        const links: Array<{ url: string; domain: string; text?: string }> = [];
        let match;

        // Extract links from <a> tags
        while ((match = linkRegex.exec(htmlContent)) !== null) {
            const url = match[1];
            const linkText = match[2];
            try {
                const domain = new URL(url).hostname.replace('www.', '');
                links.push({ url, domain, text: linkText });
            } catch (e) {
                // Invalid URL, skip
            }
        }

        // Extract standalone URLs
        let cleanedContent = htmlContent;
        while ((match = urlRegex.exec(htmlContent)) !== null) {
            const url = match[1];
            // Skip if already found in <a> tags
            if (!links.some(link => link.url === url)) {
                try {
                    const domain = new URL(url).hostname.replace('www.', '');
                    links.push({ url, domain });
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        }

        // Clean up the text content
        cleanedContent = htmlContent
            .replace(/<a[^>]*>([^<]*)<\/a>/g, '$1') // Replace <a> tags with their text content
            .replace(/<br\s*\/?>/gi, '\n') // Replace <br> tags with newlines
            .replace(/<[^>]*>/g, '') // Remove any other HTML tags
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        return { cleanedContent, links };
    };

    const { cleanedContent, links } = parseDescription(description);

    // Split content into paragraphs
    const allParagraphs = cleanedContent.split('\n').filter(p => p.trim());

    // Determine what to show
    const maxLength = 300;
    const isLongContent = cleanedContent.length > maxLength;
    const paragraphsToShow = showFullDescription
        ? allParagraphs
        : allParagraphs.slice(0, 3);

    const truncatedContent = showFullDescription
        ? cleanedContent
        : (cleanedContent.length > maxLength ? cleanedContent.slice(0, maxLength) + '...' : cleanedContent);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-medium">About this video</h4>
                {(isLongContent || allParagraphs.length > 3) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-xs"
                    >
                        {showFullDescription ? 'Show Less' : 'Show More'}
                    </Button>
                )}
            </div>

            {paragraphsToShow.length > 0 && (
                <div className="space-y-2">
                    {paragraphsToShow.map((paragraph, index) => (
                        <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                            {paragraph.trim()}
                        </p>
                    ))}
                </div>
            )}

            {links.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-sm font-medium">Resources</h5>
                    <div className="flex flex-wrap gap-2">
                        {links.slice(0, showFullDescription ? links.length : 4).map((link, index) => (
                            <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded-md text-xs font-medium transition-colors hover:text-primary"
                                title={link.url}
                            >
                                <LinkIcon className="h-3 w-3" />
                                {link.text || link.domain}
                            </a>
                        ))}
                        {!showFullDescription && links.length > 4 && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                                +{links.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    publishedAt: string;
    channelTitle: string;
    viewCount: string;
}

interface YouTubeComment {
    id: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
    text: string;
    likeCount: number;
    publishedAt: string;
    isPinned?: boolean;
}

interface VideoProgress {
    videoId: string;
    watchedDuration: number;
    totalDuration: number;
    completed: boolean;
    lastWatched: string;
}

export default function PlaylistPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const playlistId = params.id as string;

    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState<Record<string, VideoProgress>>({});
    const [initialVideoPositions, setInitialVideoPositions] = useState<Record<string, number>>({});

    // Pagination state
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreVideos, setHasMoreVideos] = useState(true);


    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [autoResumeMessage, setAutoResumeMessage] = useState<string | null>(null);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [comments, setComments] = useState<YouTubeComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showNextVideoPrompt, setShowNextVideoPrompt] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
    const [usageInfo, setUsageInfo] = useState<{ currentCount: number; maxCount: number; remaining: number } | null>(null);
    const [isVideoInfoExpanded, setIsVideoInfoExpanded] = useState(false);
    const savedProgressLoadedRef = useRef(false);

    useEffect(() => {
        // Reset saved progress loading flag when playlist changes
        savedProgressLoadedRef.current = false;
        if (playlistId) {
            fetchPlaylistVideos();
        }
    }, [playlistId]);



    // Load saved progress when session is authenticated and videos are loaded
    useEffect(() => {
        if (sessionStatus === 'authenticated' && session?.user && videos.length > 0 && !savedProgressLoadedRef.current) {
            savedProgressLoadedRef.current = true;
            loadSavedProgress(videos);
        } else if (sessionStatus === 'unauthenticated') {
            savedProgressLoadedRef.current = false;
        }
    }, [sessionStatus, session?.user, videos.length]);

    // Load usage info when session is authenticated
    useEffect(() => {
        if (sessionStatus === 'authenticated' && session?.user) {
            loadUsageInfo();
        }
    }, [sessionStatus, session?.user]);

    const loadUsageInfo = async () => {
        try {
            const response = await fetch('/api/notes/generate');
            if (response.ok) {
                const data = await response.json();
                setUsageInfo(data);
            }
        } catch (error) {
            console.error('Failed to load usage info:', error);
        }
    };





    const fetchVideoComments = async (videoId: string) => {
        setLoadingComments(true);
        try {
            const response = await fetch(`/api/youtube/comments?videoId=${videoId}`);
            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            } else {
                setComments([]);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    const fetchPlaylistVideos = async (pageToken?: string) => {
        try {
            console.log('Fetching playlist videos for ID:', playlistId, pageToken ? `(page: ${pageToken})` : '(first page)');
            const url = pageToken
                ? `/api/youtube/playlist?id=${playlistId}&pageToken=${pageToken}`
                : `/api/youtube/playlist?id=${playlistId}`;

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                console.log('Received playlist data:', data);

                // If this is the first page, replace videos; otherwise append
                const newVideos = data.videos || [];
                if (pageToken) {
                    setVideos(prev => [...prev, ...newVideos]);
                } else {
                    setVideos(newVideos);
                }

                // Update pagination state
                console.log('Pagination state update:', {
                    nextPageToken: data.nextPageToken,
                    hasMoreVideos: !!data.nextPageToken,
                    videosReceived: newVideos.length
                });
                setNextPageToken(data.nextPageToken);
                setHasMoreVideos(!!data.nextPageToken);

                // Initialize progress for new videos only
                const initialProgress: Record<string, VideoProgress> = {};
                const initialPositions: Record<string, number> = {};
                newVideos.forEach((video: YouTubeVideo) => {
                    initialProgress[video.id] = {
                        videoId: video.id,
                        watchedDuration: 0,
                        totalDuration: parseDuration(video.duration),
                        completed: false,
                        lastWatched: new Date().toISOString(),
                    };
                    // Set initial position to 0 for new videos
                    initialPositions[video.id] = 0;
                });

                // Merge with existing progress
                setProgress(prev => ({ ...prev, ...initialProgress }));
                setInitialVideoPositions(prev => ({ ...prev, ...initialPositions }));
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('API error response:', response.status, errorData);
                if (!pageToken) {
                    setVideos([]); // Only clear videos on first page error
                }
            }
        } catch (error) {
            console.error('Error fetching playlist videos:', error);
            if (!pageToken) {
                setVideos([]); // Only clear videos on first page error
            }
        } finally {
            if (!pageToken) {
                setIsLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    };

    // Function to load more videos
    const loadMoreVideos = async () => {
        if (!hasMoreVideos || isLoadingMore || !nextPageToken) return;

        setIsLoadingMore(true);
        await fetchPlaylistVideos(nextPageToken);
    };

    const loadSavedProgress = async (videosList?: YouTubeVideo[]) => {
        try {
            const response = await fetch(`/api/analytics/progress?playlistId=${playlistId}`);
            if (response.ok) {
                const data = await response.json();

                if (data.progress && Array.isArray(data.progress)) {
                    const savedProgress: Record<string, VideoProgress> = {};
                    const initialPositions: Record<string, number> = {};
                    let lastWatchedVideo: any = null;
                    let lastWatchedTime = new Date(0); // Very old date as default

                    data.progress.forEach((progressItem: any) => {
                        const videoId = progressItem.video_id;
                        const watchedSeconds = progressItem.watched_seconds || 0;
                        const lastWatched = new Date(progressItem.last_watched || new Date().toISOString());

                        // Get the video to determine its correct duration
                        const videosToCheck = videosList || videos;
                        const video = videosToCheck.find(v => v.id === videoId);
                        const videoDuration = video ? parseDuration(video.duration) : (progressItem.duration || 0);

                        savedProgress[videoId] = {
                            videoId: videoId,
                            watchedDuration: watchedSeconds,
                            totalDuration: videoDuration,
                            completed: progressItem.completed || false,
                            lastWatched: progressItem.last_watched || new Date().toISOString(),
                        };

                        // Set initial position for resume functionality
                        // Only resume if not completed and has significant progress (more than 30 seconds)
                        if (!progressItem.completed && watchedSeconds > 30) {
                            initialPositions[videoId] = watchedSeconds;
                        } else {
                            initialPositions[videoId] = 0;
                        }

                        // Track the most recently watched video
                        if (lastWatched > lastWatchedTime && !progressItem.completed && watchedSeconds > 30) {
                            lastWatchedTime = lastWatched;
                            lastWatchedVideo = {
                                videoId: videoId,
                                watchedSeconds: watchedSeconds,
                                lastWatched: lastWatched
                            };
                        }
                    });

                    // Update progress by merging with existing progress to maintain video durations
                    setProgress(prev => {
                        const merged = { ...prev };
                        Object.keys(savedProgress).forEach(videoId => {
                            const saved = savedProgress[videoId];
                            const existing = merged[videoId];

                            // Prefer the existing totalDuration if it exists and is valid, otherwise use saved
                            const totalDuration = (existing?.totalDuration && existing.totalDuration > 0)
                                ? existing.totalDuration
                                : saved.totalDuration;

                            merged[videoId] = {
                                ...saved,
                                totalDuration, // Ensure we keep the correct duration
                            };
                        });
                        return merged;
                    });

                    // Auto-resume from last watched video
                    const videosToCheck = videosList || videos;
                    if (lastWatchedVideo && videosToCheck.length > 0) {
                        const videoIndex = videosToCheck.findIndex(video => video.id === lastWatchedVideo.videoId);
                        if (videoIndex !== -1) {
                            const minutes = Math.floor(lastWatchedVideo.watchedSeconds / 60);
                            const seconds = lastWatchedVideo.watchedSeconds % 60;
                            const timeFormat = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                            // Set initial positions for video resume - do this BEFORE setting video index
                            setInitialVideoPositions(prev => ({
                                ...prev,
                                ...initialPositions
                            }));

                            // Set current video index AFTER positions are set
                            setTimeout(() => {
                                setCurrentVideoIndex(videoIndex);

                                // Show auto-resume message
                                setAutoResumeMessage(`Continuing from video ${videoIndex + 1} at ${timeFormat}`);

                                // Show resume toast
                                toast.info("Resuming video", {
                                    description: `Continuing from ${timeFormat}`,
                                    duration: 3000,
                                });

                                // Hide message after 5 seconds
                                setTimeout(() => {
                                    setAutoResumeMessage(null);
                                }, 5000);
                            }, 100);
                        } else {
                            // No last watched video found, just set positions
                            setInitialVideoPositions(prev => ({
                                ...prev,
                                ...initialPositions
                            }));
                        }
                    } else {
                        // No last watched video, just set positions
                        setInitialVideoPositions(prev => ({
                            ...prev,
                            ...initialPositions
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load saved progress:', error);
        }
    };



    const markVideoAsWatched = async (videoId: string) => {
        // Get the video to determine its duration
        const video = videos.find(v => v.id === videoId);
        if (!video || !session?.user) return;

        const videoDuration = parseDuration(video.duration);

        // Update local progress immediately for instant UI feedback
        setProgress(prev => ({
            ...prev,
            [videoId]: {
                videoId,
                totalDuration: videoDuration,
                watchedDuration: videoDuration,
                completed: true,
                lastWatched: new Date().toISOString(),
            }
        }));

        // Save completion to database
        try {
            await fetch('/api/analytics/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlistId: playlistId,
                    videoId: videoId,
                    currentTime: videoDuration,
                    duration: videoDuration,
                    completed: true,
                }),
            });

            // Show success message
            setSaveMessage(`Video marked as completed!`);
            setTimeout(() => {
                setSaveMessage(null);
            }, 3000);

        } catch (error) {
            console.error('Failed to save completion:', error);

            // Revert local state if database save failed
            setProgress(prev => ({
                ...prev,
                [videoId]: {
                    ...prev[videoId],
                    completed: false,
                    watchedDuration: prev[videoId]?.watchedDuration || 0,
                }
            }));
        }
    };

    const updateVideoProgress = (videoId: string, watchedDuration: number) => {
        setProgress(prev => {
            const existingVideo = prev[videoId];

            // If no existing progress, create it from the video data
            if (!existingVideo) {
                const video = videos.find(v => v.id === videoId);
                if (!video) return prev;

                const totalDuration = parseDuration(video.duration);
                const completed = watchedDuration >= totalDuration * 0.9; // 90% watched = completed

                return {
                    ...prev,
                    [videoId]: {
                        videoId,
                        totalDuration,
                        watchedDuration,
                        completed,
                        lastWatched: new Date().toISOString(),
                    }
                };
            }

            // Update existing progress
            const completed = watchedDuration >= existingVideo.totalDuration * 0.9 || existingVideo.completed; // Keep completed status if already completed

            return {
                ...prev,
                [videoId]: {
                    ...existingVideo,
                    watchedDuration,
                    completed,
                    lastWatched: new Date().toISOString(),
                }
            };
        });
    };

    const updateVideoProgressWithDuration = (videoId: string, watchedDuration: number, totalDuration: number) => {
        setProgress(prev => {
            const existingVideo = prev[videoId];
            const completed = watchedDuration >= totalDuration * 0.9 || (existingVideo?.completed ?? false); // Keep completed status if already completed

            return {
                ...prev,
                [videoId]: {
                    videoId,
                    totalDuration,
                    watchedDuration,
                    completed,
                    lastWatched: new Date().toISOString(),
                }
            };
        });
    };

    // Debounced save progress function
    const debouncedSaveProgress = useRef<NodeJS.Timeout | null>(null);
    const lastSaveTime = useRef<number>(0);

    // Real-time progress tracking handlers
    const handleProgressUpdate = async (currentTime: number, duration: number) => {
        if (!currentVideo || !session?.user) return;

        // Ensure we have a valid duration, fallback to parsed video duration
        const validDuration = duration || parseDuration(currentVideo.duration);

        // Update local progress immediately with proper duration
        updateVideoProgressWithDuration(currentVideo.id, currentTime, validDuration);

        // Check if we should show next video prompt (60 seconds or less remaining)
        const timeRemaining = validDuration - currentTime;
        const hasNextVideo = currentVideoIndex < videos.length - 1;

        // Update remaining time
        setRemainingTime(Math.max(0, timeRemaining));

        if (timeRemaining <= 60 && timeRemaining > 0 && hasNextVideo && !showNextVideoPrompt) {
            setShowNextVideoPrompt(true);
        } else if (timeRemaining > 60 && showNextVideoPrompt) {
            setShowNextVideoPrompt(false);
        }

        // Save progress to database every 30 seconds only
        const now = Date.now();
        const timeSinceLastSave = now - lastSaveTime.current;
        const shouldSave = timeSinceLastSave >= 30000 && currentTime > 0; // 30 seconds

        if (shouldSave) {
            // Clear any existing timeout
            if (debouncedSaveProgress.current) {
                clearTimeout(debouncedSaveProgress.current);
            }

            // Set a new timeout to save after a short delay
            debouncedSaveProgress.current = setTimeout(async () => {
                try {
                    await fetch('/api/analytics/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            playlistId: playlistId,
                            videoId: currentVideo.id,
                            currentTime,
                            duration: validDuration,
                        }),
                    });
                    lastSaveTime.current = Date.now();
                } catch (error) {
                    console.error('Failed to save progress:', error);
                }
            }, 1000); // 1 second delay to avoid rapid saves
        }
    };

    const handleVideoEnd = async () => {
        if (!currentVideo || !session?.user) return;

        // Mark video as completed (this will handle database saving)
        await markVideoAsWatched(currentVideo.id);

        // Auto-advance to next video if available
        if (currentVideoIndex < videos.length - 1) {
            setTimeout(() => {
                setCurrentVideoIndex(currentVideoIndex + 1);
            }, 2000); // 2 second delay before auto-advance
        }
    };

    const handleVideoStart = () => {
        setIsPlaying(true);
        // Reset next video prompt when a new video starts
        setShowNextVideoPrompt(false);
    };

    const skipToNextVideo = () => {
        if (currentVideoIndex < videos.length - 1) {
            setCurrentVideoIndex(currentVideoIndex + 1);
            setShowNextVideoPrompt(false);
        }
    };

    // Save progress when switching videos or page unloads
    const saveCurrentProgress = async (videoId: string, currentTime: number, duration: number) => {
        if (!session?.user || currentTime <= 0) return;

        try {
            await fetch('/api/analytics/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlistId: playlistId,
                    videoId: videoId,
                    currentTime,
                    duration,
                }),
            });
        } catch (error) {
            console.error('Failed to save final progress:', error);
        }
    };

    const saveProgressManually = async () => {
        if (!currentVideo || !session?.user || !currentProgress) {
            return;
        }

        try {
            // Show saving state
            setIsSaving(true);

            // Get current time from YouTube player (real-time position)
            let currentTime = currentProgress.watchedDuration; // fallback
            let duration = currentProgress.totalDuration;

            if (youtubePlayer) {
                try {
                    const playerCurrentTime = youtubePlayer.getCurrentTime();
                    const playerDuration = youtubePlayer.getDuration();

                    if (typeof playerCurrentTime === 'number' && !isNaN(playerCurrentTime)) {
                        currentTime = playerCurrentTime;
                    }
                    if (typeof playerDuration === 'number' && !isNaN(playerDuration)) {
                        duration = playerDuration;
                    }
                } catch (e) {
                    console.warn('Could not get current time from player:', e);
                }
            }

            const requestData = {
                playlistId: playlistId,
                videoId: currentVideo.id,
                currentTime: Math.floor(currentTime), // Ensure integer
                duration: Math.floor(duration), // Ensure integer
            };

            const response = await fetch('/api/analytics/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                // Update local progress immediately with proper duration
                updateVideoProgressWithDuration(currentVideo.id, currentTime, duration);

                // Reset last save time to prevent immediate auto-save
                lastSaveTime.current = Date.now();

                // Show success feedback
                const timeFormat = `${Math.floor(currentTime / 60)}:${(Math.floor(currentTime) % 60).toString().padStart(2, '0')}`;
                setSaveMessage(`Progress saved at ${timeFormat}`);

                // Hide success message after 3 seconds
                setTimeout(() => {
                    setSaveMessage(null);
                }, 3000);


            }

        } catch (error) {
            console.error('Failed to save progress manually:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Save progress when switching videos
    useEffect(() => {
        // Reset next video prompt when video changes
        setShowNextVideoPrompt(false);

        // Save progress for the previous video when currentVideoIndex changes
        // Get the actual previous video based on the index change
        const prevVideoIndex = currentVideoIndex;
        const allVideoIndexes = Array.from({ length: videos.length }, (_, i) => i);
        const otherIndexes = allVideoIndexes.filter(i => i !== currentVideoIndex);

        // Find the most likely previous video (check if we have progress for recent videos)
        if (videos.length > 0 && otherIndexes.length > 0) {
            // Save progress for any video that has been watched but isn't the current one
            Object.keys(progress).forEach(videoId => {
                const videoProgress = progress[videoId];
                if (videoProgress && videoProgress.watchedDuration > 0 && videoId !== videos[currentVideoIndex]?.id) {
                    // Only save if it's been more than 30 seconds since last update
                    const lastUpdate = new Date(videoProgress.lastWatched).getTime();
                    const now = new Date().getTime();
                    if (now - lastUpdate > 30000) { // 30 seconds
                        saveCurrentProgress(videoId, videoProgress.watchedDuration, videoProgress.totalDuration);
                    }
                }
            });
        }

        // Clear player reference when video changes
        setYoutubePlayer(null);

        // Fetch comments for the new video
        const currentVideo = videos[currentVideoIndex];
        if (currentVideo) {
            fetchVideoComments(currentVideo.id);
        }
    }, [currentVideoIndex, videos]);

    const getPlaylistProgress = () => {
        const totalVideos = videos.length;
        const completedVideos = Object.values(progress).filter(p => p.completed).length;
        const totalDuration = Object.values(progress).reduce((sum, p) => sum + p.totalDuration, 0);
        const watchedDuration = Object.values(progress).reduce((sum, p) => sum + p.watchedDuration, 0);

        return {
            videosCompleted: completedVideos,
            totalVideos,
            videoProgress: totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0,
            timeProgress: totalDuration > 0 ? (watchedDuration / totalDuration) * 100 : 0,
            totalDuration,
            watchedDuration,
        };
    };



    const currentVideo = videos[currentVideoIndex];
    const currentProgress = currentVideo ? progress[currentVideo.id] : null;

    // Save progress before page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentVideo && currentProgress && currentProgress.watchedDuration > 0) {
                // Use sendBeacon for reliable progress saving on page unload
                const data = JSON.stringify({
                    playlistId: playlistId,
                    videoId: currentVideo.id,
                    currentTime: currentProgress.watchedDuration,
                    duration: currentProgress.totalDuration,
                });

                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/analytics/progress', data);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentVideo, currentProgress, playlistId]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debouncedSaveProgress.current) {
                clearTimeout(debouncedSaveProgress.current);
            }
        };
    }, []);

    const progressData = getPlaylistProgress();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading playlist...</p>
                </div>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
                <Header />
                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <PlayCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <CardTitle>Playlist Not Found</CardTitle>
                            <CardDescription>
                                This playlist could not be loaded or does not exist.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.push('/dashboard')} className="w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
            <Header />
            <main className="flex-1 p-6">
                <div className="container mx-auto max-w-7xl">
                    {/* Auto-resume notification */}
                    {autoResumeMessage && (
                        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">{autoResumeMessage}</span>
                        </div>
                    )}

                    {/* Save success notification */}
                    {saveMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">{saveMessage}</span>
                        </div>
                    )}



                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/dashboard')}
                                className="shadow-sm"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    Learning Playlist
                                </h1>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 text-muted-foreground mt-1">
                                    <div className="flex items-center gap-1">
                                        <PlayCircle className="h-4 w-4" />
                                        {videos.length} videos
                                    </div>
                                    <div className="hidden lg:block">
                                        <Separator orientation="vertical" className="h-4" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {currentVideo?.channelTitle}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                        {/* Video Player Section */}
                        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1">
                                            <CardTitle className="line-clamp-2 text-xl">{currentVideo?.title}</CardTitle>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(currentVideo?.publishedAt || '').toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    {parseInt(currentVideo?.viewCount || '0').toLocaleString()} views
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={currentProgress?.completed ? "default" : "secondary"}
                                            className={`ml-4 ${currentProgress?.completed ? 'bg-green-600 hover:bg-green-600 text-white' : ''}`}
                                        >
                                            {currentProgress?.completed ? "✓ Completed" : "In Progress"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* YouTube Player */}
                                    {currentVideo && (
                                        <div className="relative">
                                            <YouTubePlayer
                                                videoId={currentVideo.id}
                                                startTime={initialVideoPositions[currentVideo.id] || 0}
                                                onProgressUpdate={handleProgressUpdate}
                                                onVideoEnd={handleVideoEnd}
                                                onVideoStart={handleVideoStart}
                                                onPlayerReady={setYoutubePlayer}
                                                className="w-full"
                                            />

                                            {/* Next video overlay popup */}
                                            {showNextVideoPrompt && (
                                                <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                                                    <div className="mb-6 mx-4 bg-black/80 backdrop-blur-sm text-white rounded-lg p-4 shadow-lg border border-white/10 pointer-events-auto max-w-md">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <SkipForward className="h-4 w-4 text-white" />
                                                                <div className="text-sm">
                                                                    <div className="font-medium">Next video ready!</div>
                                                                    <div className="text-xs text-white/80">
                                                                        {Math.ceil(remainingTime)}s remaining
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setShowNextVideoPrompt(false)}
                                                                    className="h-7 px-2 text-xs text-white hover:bg-white/20 hover:text-white"
                                                                >
                                                                    Dismiss
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={skipToNextVideo}
                                                                    className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
                                                                >
                                                                    Next Video
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Video Navigation */}
                                    <div className="flex items-center justify-between gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentVideoIndex(Math.max(0, currentVideoIndex - 1))}
                                            disabled={currentVideoIndex === 0}
                                            className="flex-1 max-w-[120px] lg:max-w-[140px]"
                                        >
                                            <SkipBack className="h-4 w-4 mr-1 lg:mr-2" />
                                            <span className="hidden sm:inline">Previous</span>
                                        </Button>

                                        <div className="text-center flex-1">
                                            <p className="text-sm font-medium">
                                                Video {currentVideoIndex + 1} of {videos.length}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {currentVideo?.duration ? formatDuration(parseDuration(currentVideo.duration)) : '0:00'}
                                            </p>
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentVideoIndex(Math.min(videos.length - 1, currentVideoIndex + 1))}
                                            disabled={currentVideoIndex === videos.length - 1}
                                            className="flex-1 max-w-[120px] lg:max-w-[140px]"
                                        >
                                            <span className="hidden sm:inline">Next</span>
                                            <SkipForward className="h-4 w-4 ml-1 lg:ml-2" />
                                        </Button>
                                    </div>

                                    {/* Video Progress */}
                                    {currentProgress && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Your Progress</span>
                                                <span className="text-muted-foreground">
                                                    {formatDuration(currentProgress.watchedDuration)} / {formatDuration(currentProgress.totalDuration)}
                                                </span>
                                            </div>
                                            <Progress
                                                value={(currentProgress.watchedDuration / currentProgress.totalDuration) * 100}
                                                className="h-2"
                                            />
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Video Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            variant={currentProgress?.completed ? "default" : "outline"}
                                            onClick={() => currentVideo && markVideoAsWatched(currentVideo.id)}
                                            disabled={currentProgress?.completed || isSaving}
                                            className={`flex-1 ${currentProgress?.completed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                        >
                                            <CheckCircle className={`h-4 w-4 mr-1 lg:mr-2 ${currentProgress?.completed ? 'text-white' : ''}`} />
                                            <span className="hidden sm:inline">
                                                {currentProgress?.completed ? "✓ Completed" : "Mark as Watched"}
                                            </span>
                                            <span className="sm:hidden">
                                                {currentProgress?.completed ? "✓ Done" : "Watched"}
                                            </span>
                                        </Button>
                                        <Button
                                            variant="default"
                                            onClick={saveProgressManually}
                                            disabled={!currentVideo || !session?.user || isSaving}
                                            className="flex-1"
                                            title={!youtubePlayer ? "Player loading..." : "Save current playback position"}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-1 lg:mr-2 animate-spin" />
                                                    <span className="hidden sm:inline">Saving...</span>
                                                    <span className="sm:hidden">Save...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Target className="h-4 w-4 mr-1 lg:mr-2" />
                                                    <span className="hidden sm:inline">Save Progress</span>
                                                    <span className="sm:hidden">Save</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Notes and External Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsNotesDialogOpen(true)}
                                            disabled={!currentVideo || !session?.user}
                                            className="flex-1"
                                            title={!session?.user ? "Please log in to generate notes" : "Generate AI-powered study notes"}
                                        >
                                            <FileText className="h-4 w-4 mr-1 lg:mr-2" />
                                            <span className="hidden sm:inline">Notes</span>
                                            <span className="sm:hidden">Notes</span>
                                            {usageInfo && (
                                                <Badge variant="secondary" className="ml-1 lg:ml-2 text-xs">
                                                    {usageInfo.remaining}/3
                                                </Badge>
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.open(`https://www.youtube.com/watch?v=${currentVideo?.id}`, '_blank')}
                                            className="flex-1"
                                        >
                                            <span className="hidden sm:inline">Watch on YouTube</span>
                                            <span className="sm:hidden">YouTube</span>
                                        </Button>
                                    </div>

                                    {/* Mobile Collapsible Video Info Section */}
                                    {(currentVideo?.description || comments.length > 0) && (
                                        <div className="lg:hidden">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsVideoInfoExpanded(!isVideoInfoExpanded)}
                                                className="w-full justify-between"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    About this video
                                                </span>
                                                {isVideoInfoExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>

                                            {isVideoInfoExpanded && (
                                                <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg border">
                                                    {/* Video Description */}
                                                    {currentVideo?.description && (
                                                        <VideoDescription description={currentVideo.description} />
                                                    )}

                                                    {/* Pinned Comment */}
                                                    {comments.length > 0 && (
                                                        <div className="space-y-2">
                                                            <PinnedComment comment={comments[0]} />
                                                        </div>
                                                    )}

                                                    {loadingComments && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Loading comments...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Desktop Video Info Section */}
                                    <div className="hidden lg:block space-y-4">
                                        {/* Video Description */}
                                        {currentVideo?.description && (
                                            <VideoDescription description={currentVideo.description} />
                                        )}

                                        {/* Pinned Comment */}
                                        {comments.length > 0 && (
                                            <div className="space-y-2">
                                                <PinnedComment comment={comments[0]} />
                                            </div>
                                        )}

                                        {loadingComments && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading comments...
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Playlist Sidebar */}
                        <div className="lg:block">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PlayCircle className="h-5 w-5" />
                                        Playlist Videos
                                    </CardTitle>
                                    <CardDescription>
                                        {videos.length} videos • {progressData.videosCompleted} completed
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[400px] lg:h-[600px]">
                                        <div className="space-y-2 p-3">
                                            {videos.map((video, index) => {
                                                const videoProgress = progress[video.id];
                                                const isActive = index === currentVideoIndex;

                                                return (
                                                    <div
                                                        key={video.id}
                                                        className={`group flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/80 ${isActive ? 'bg-primary/10 border border-primary/30 shadow-md ring-1 ring-primary/20' : 'hover:shadow-sm'
                                                            }`}
                                                        onClick={() => setCurrentVideoIndex(index)}
                                                    >
                                                        <div className="relative flex-shrink-0">
                                                            <div className="relative w-24 h-16 lg:w-32 lg:h-20 rounded-lg overflow-hidden bg-muted">
                                                                <img
                                                                    src={video.thumbnail}
                                                                    alt={video.title}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                />

                                                                {/* Duration overlay like YouTube */}
                                                                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                                                                    {video.duration ? formatDuration(parseDuration(video.duration)) : '0:00'}
                                                                </div>

                                                                {/* Completion status */}
                                                                <div className="absolute top-1 right-1">
                                                                    {videoProgress?.completed ? (
                                                                        <div className="bg-green-500 rounded-full p-1">
                                                                            <CheckCircle className="h-3 w-3 text-white fill-current" />
                                                                        </div>
                                                                    ) : videoProgress && videoProgress.watchedDuration > 0 ? (
                                                                        <div className="bg-primary rounded-full p-1">
                                                                            <Play className="h-3 w-3 text-white fill-current" />
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                {/* Play overlay for active video */}
                                                                {isActive && (
                                                                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                                                        <div className="bg-primary rounded-full p-2 shadow-lg">
                                                                            <Play className="h-4 w-4 text-white fill-current" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Progress bar at bottom of thumbnail */}
                                                            {videoProgress && videoProgress.watchedDuration > 0 && (
                                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 rounded-b-lg overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-primary transition-all"
                                                                        style={{ width: `${(videoProgress.watchedDuration / videoProgress.totalDuration) * 100}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 space-y-2">
                                                            <div className="space-y-1">
                                                                <h4 className={`font-medium text-sm line-clamp-2 leading-tight transition-colors ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`}>
                                                                    {video.title}
                                                                </h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                                    {video.channelTitle}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <Eye className="h-3 w-3" />
                                                                    <span>{parseInt(video.viewCount || '0').toLocaleString()} views</span>
                                                                </div>

                                                                <div className="flex items-center gap-1">
                                                                    {videoProgress?.completed && (
                                                                        <Badge variant="secondary" className="text-xs py-0 px-2 h-5 bg-green-100 text-green-800 border-green-200">
                                                                            ✓ Watched
                                                                        </Badge>
                                                                    )}
                                                                    <span className="text-xs text-muted-foreground">
                                                                        #{index + 1}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Time remaining/watched info */}
                                                            {videoProgress && videoProgress.watchedDuration > 0 && !videoProgress.completed && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    <span>{formatDuration(videoProgress.totalDuration - videoProgress.watchedDuration)} left</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Load More Button */}
                                            {hasMoreVideos && (
                                                <div className="p-3 pt-0">
                                                    <Button
                                                        variant="outline"
                                                        onClick={loadMoreVideos}
                                                        disabled={isLoadingMore}
                                                        className="w-full"
                                                    >
                                                        {isLoadingMore ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Loading more videos...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                Load More Videos ({videos.length} loaded)
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}



                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>


                </div>
            </main>

            {/* Notes Dialog */}
            {currentVideo && (
                <NotesDialog
                    isOpen={isNotesDialogOpen}
                    onClose={() => setIsNotesDialogOpen(false)}
                    videoId={currentVideo.id}
                    videoTitle={currentVideo.title}
                    onUsageUpdate={setUsageInfo}
                />
            )}
        </div>
    );
} 