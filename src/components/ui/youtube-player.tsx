"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { YouTubePlayerProps } from '@/types/youtube';

// Extend Window interface to include YouTube API
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

export default function YouTubePlayer({
    videoId,
    startTime = 0,
    onStateChange,
    onProgress,
    onPlayerReady
}: YouTubePlayerProps) {
    const playerElementRef = useRef<HTMLDivElement>(null);
    const playerInstanceRef = useRef<any>(null);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const currentVideoIdRef = useRef<string>('');
    const cleanupInProgressRef = useRef(false);

    // Track if component is mounted to prevent state updates after unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Load YouTube iframe API once globally
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const loadAPI = () => {
            if (typeof window === 'undefined') return;

            // Check if API is already loaded
            if (window.YT && window.YT.Player) {
                if (mountedRef.current) setIsAPIReady(true);
                return;
            }

            // Check if script already exists
            if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                // Script exists, wait for it to load
                timeoutId = setTimeout(() => {
                    if (window.YT && window.YT.Player) {
                        if (mountedRef.current) setIsAPIReady(true);
                    } else if (mountedRef.current) {
                        loadAPI(); // Retry
                    }
                }, 100);
                return;
            }

            // Create and add script
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            document.head.appendChild(script);

            // Set global callback
            window.onYouTubeIframeAPIReady = () => {
                if (mountedRef.current) setIsAPIReady(true);
            };
        };

        loadAPI();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    // Safe cleanup function
    const cleanupPlayer = useCallback(() => {
        if (cleanupInProgressRef.current) return;
        cleanupInProgressRef.current = true;

        try {
            // Clear progress tracking interval
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }

            // Destroy player instance
            if (playerInstanceRef.current) {
                try {
                    playerInstanceRef.current.destroy();
                } catch (e) {
                    console.error('Error destroying player:', e);
                }
                playerInstanceRef.current = null;
            }
        } finally {
            cleanupInProgressRef.current = false;
        }
    }, []);

    // Initialize and update player
    useEffect(() => {
        if (!isAPIReady || !playerElementRef.current || !videoId) return;

        if (videoId === currentVideoIdRef.current && playerInstanceRef.current) {
            // Same video, just seek if needed
            if (startTime > 0) {
                try {
                    playerInstanceRef.current.seekTo(startTime, true);
                } catch (e) {
                    console.error('Error seeking to time:', e);
                }
            }
            return;
        }

        // Cleanup existing player
        cleanupPlayer();

        // Save new video ID
        currentVideoIdRef.current = videoId;

        // Create new player
        try {
            playerInstanceRef.current = new window.YT.Player(playerElementRef.current, {
                videoId: videoId,
                playerVars: {
                    start: Math.floor(startTime),
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1
                },
                events: {
                    onReady: () => {
                        if (!mountedRef.current) return;
                        setIsPlayerReady(true);
                        onPlayerReady?.(playerInstanceRef.current);

                        // Set up progress tracking
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current);
                        }
                        progressIntervalRef.current = setInterval(() => {
                            if (playerInstanceRef.current?.getCurrentTime && onProgress) {
                                const currentTime = playerInstanceRef.current.getCurrentTime();
                                onProgress(currentTime);
                            }
                        }, 1000) as unknown as NodeJS.Timeout;
                    },
                    onStateChange: (event: { data: number }) => {
                        if (!mountedRef.current) return;
                        onStateChange?.(event);
                    },
                    onError: (error: any) => {
                        if (!mountedRef.current) return;
                        console.error('YouTube Player Error:', error);
                        setError(`Error playing video: ${error?.data || 'Unknown error'}`);
                    }
                }
            });
        } catch (e) {
            console.error('Error creating YouTube player:', e);
            setError(`Error creating player: ${e}`);
        }

        return cleanupPlayer;
    }, [isAPIReady, videoId, startTime, cleanupPlayer, onPlayerReady, onProgress, onStateChange]);

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-black text-white">
                <p>{error}</p>
            </div>
        );
    }

    return <div ref={playerElementRef} className="aspect-video w-full" />;
}

