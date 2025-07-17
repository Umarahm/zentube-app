"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Award,
    Flame,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
    Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDuration } from '@/lib/utils';

interface DailyProgressItem {
    date: string;
    videos: number;
    minutes: number;
    day?: string;
}

interface AnalyticsData {
    analytics?: {
        dailyProgress?: DailyProgressItem[];
        completedVideos?: number;
        totalVideos?: number;
        totalDuration?: number;
        totalWatchTime?: number;
    };
}

// Component to display daily streaks
function DailyStreaks({ analyticsData }: { analyticsData: AnalyticsData }) {
    const calculateStreaks = () => {
        if (!analyticsData?.analytics?.dailyProgress) {
            return { currentStreak: 0, longestStreak: 0, streakDays: [] };
        }

        const dailyData = analyticsData.analytics.dailyProgress;
        const sortedDates = dailyData
            .map((item: DailyProgressItem) => ({
                date: new Date(item.date),
                videos: item.videos
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        const streakDays = [];

        // Calculate streaks
        for (let i = 0; i < sortedDates.length; i++) {
            if (sortedDates[i].videos > 0) {
                tempStreak++;
                streakDays.push(sortedDates[i].date);
            } else {
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 0;
            }
        }

        // Check if current streak is still active (today or yesterday)
        const today = new Date();
        const lastActiveDate = streakDays[streakDays.length - 1];
        const daysDiff = lastActiveDate ? Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;

        currentStreak = daysDiff <= 1 ? tempStreak : 0;
        longestStreak = Math.max(longestStreak, tempStreak);

        return { currentStreak, longestStreak, streakDays: streakDays.slice(-7) };
    };

    const { currentStreak, longestStreak, streakDays } = calculateStreaks();

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Daily Streak</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">{currentStreak}</div>
                    <div className="text-sm text-muted-foreground">Current Streak</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{longestStreak}</div>
                    <div className="text-sm text-muted-foreground">Longest Streak</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-sm font-medium">Last 7 Days</div>
                <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, index) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - index));
                        const hasActivity = streakDays.some(streakDay =>
                            streakDay.toDateString() === date.toDateString()
                        );

                        return (
                            <div
                                key={index}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${hasActivity
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                                title={date.toDateString()}
                            >
                                {date.getDate()}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}

interface AnalyticsPopupProps {
    analyticsData: AnalyticsData | null;
    isLoading?: boolean;
}

export default function AnalyticsPopup({ analyticsData, isLoading }: AnalyticsPopupProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-muted-foreground">No analytics data available</p>
                    <p className="text-sm text-muted-foreground mt-1">Start watching videos to see your progress!</p>
                </div>
            </div>
        );
    }

    const getAnalyticsData = () => {
        const progressData = analyticsData.analytics || {};

        const dailyProgress = analyticsData?.analytics?.dailyProgress || [];

        const completionData = [
            { name: 'Completed', value: progressData.completedVideos || 0, color: '#3b82f6' },
            { name: 'Remaining', value: (progressData.totalVideos || 0) - (progressData.completedVideos || 0), color: '#64748b' },
        ];

        return {
            dailyProgress,
            completionData,
            progressData: {
                videosCompleted: progressData.completedVideos || 0,
                totalVideos: progressData.totalVideos || 0,
                videoProgress: (progressData.totalVideos || 0) > 0 ? ((progressData.completedVideos || 0) / (progressData.totalVideos || 0)) * 100 : 0,
                timeProgress: (progressData.totalDuration || 0) > 0 ? ((progressData.totalWatchTime || 0) / (progressData.totalDuration || 0)) * 100 : 0,
                totalDuration: progressData.totalDuration || 0,
                watchedDuration: progressData.totalWatchTime || 0,
            }
        };
    };

    const { dailyProgress, completionData, progressData } = getAnalyticsData();

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Your Progress</h2>
                <p className="text-muted-foreground">See how you're doing with your learning goals</p>
            </div>

            {/* Video Completion Stats */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Your Videos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                            {progressData.videosCompleted}/{progressData.totalVideos}
                        </div>
                        <div className="text-sm text-muted-foreground">Videos Completed</div>
                        <div className="mt-2">
                            <Progress value={progressData.videoProgress} className="h-2" />
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            {formatDuration(progressData.watchedDuration)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Watch Time</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            of {formatDuration(progressData.totalDuration)}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                            {Math.round(progressData.timeProgress)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Time Completion</div>
                        <div className="mt-2">
                            <Progress value={progressData.timeProgress} className="h-2" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Charts and Streaks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Hours Chart */}
                <Card className="lg:col-span-1 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold">Daily Hours</h3>
                    </div>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyProgress}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis
                                    dataKey="day"
                                    fontSize={12}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis
                                    fontSize={12}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px'
                                    }}
                                />
                                <Bar
                                    dataKey="minutes"
                                    fill="hsl(var(--primary))"
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Videos Watched Pie Chart */}
                <Card className="lg:col-span-1 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Videos Status</h3>
                    </div>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={completionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {completionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        {completionData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {entry.name}: {entry.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Daily Streaks */}
                <div className="lg:col-span-1">
                    <DailyStreaks analyticsData={analyticsData} />
                </div>
            </div>

            {/* Weekly Summary */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">This Week's Activity</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                            {dailyProgress.reduce((sum: number, day: DailyProgressItem) => sum + (day.videos || 0), 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Videos Watched</div>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                            {Math.round(dailyProgress.reduce((sum: number, day: DailyProgressItem) => sum + (day.minutes || 0), 0) / 60 * 10) / 10}h
                        </div>
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                            {dailyProgress.filter((day: DailyProgressItem) => day.videos > 0).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Active Days</div>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                            {dailyProgress.length > 0 ? Math.round(dailyProgress.reduce((sum: number, day: DailyProgressItem) => sum + (day.minutes || 0), 0) / dailyProgress.filter((day: DailyProgressItem) => day.videos > 0).length) : 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Minutes/Day</div>
                    </div>
                </div>
            </Card>
        </div>
    );
} 