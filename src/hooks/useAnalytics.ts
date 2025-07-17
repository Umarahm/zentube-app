import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface DailyProgress {
    date: string;
    day: string;
    videos: number;
    minutes: number;
    totalMinutes: number;
}

interface AnalyticsData {
    progress: Array<{
        video_id: string;
        watched_seconds: number;
        total_seconds: number;
        completed: boolean;
        last_watched: string;
    }>;
    analytics: {
        totalVideos: number;
        completedVideos: number;
        totalWatchTime: number;
        totalDuration: number;
        completionRate: number;
        dailyProgress: DailyProgress[];
    };
}

export function useAnalytics(playlistId?: string) {
    const { data: session } = useSession();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalyticsData = useCallback(async () => {
        if (!session?.user) return;

        setIsLoading(true);
        setError(null);

        try {
            // If no playlistId is provided, fetch overall analytics for all playlists
            const url = playlistId
                ? `/api/analytics/progress?playlistId=${playlistId}`
                : `/api/analytics/progress`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setAnalyticsData(data);
            } else {
                setError('Failed to fetch analytics data');
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError('Failed to fetch analytics data');
        } finally {
            setIsLoading(false);
        }
    }, [session?.user, playlistId]);

    useEffect(() => {
        if (session?.user) {
            fetchAnalyticsData();
        }
    }, [session?.user, fetchAnalyticsData]);

    const refreshAnalytics = useCallback(() => {
        if (session?.user) {
            fetchAnalyticsData();
        }
    }, [session?.user, fetchAnalyticsData]);

    return {
        analyticsData,
        isLoading,
        error,
        refreshAnalytics,
    };
}