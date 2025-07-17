"use client";

import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NavbarStreaksProps {
    analyticsData?: any;
}

export default function NavbarStreaks({ analyticsData }: NavbarStreaksProps) {
    const calculateStreaks = () => {
        if (!analyticsData?.analytics?.dailyProgress) {
            return { currentStreak: 0, longestStreak: 0, streakDays: [] };
        }

        const dailyData = analyticsData.analytics.dailyProgress;
        const sortedDates = dailyData
            .map((item: any) => ({
                date: new Date(item.date),
                videos: item.videos
            }))
            .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

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

    const { currentStreak, longestStreak } = calculateStreaks();

    if (!analyticsData) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <div className="flex items-center gap-1">
                <Badge variant={currentStreak > 0 ? "default" : "secondary"} className="px-2 py-1 text-xs">
                    {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                </Badge>
                {longestStreak > currentStreak && (
                    <span className="text-xs text-muted-foreground">
                        (best: {longestStreak})
                    </span>
                )}
            </div>
        </div>
    );
} 