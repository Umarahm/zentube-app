"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, BarChart3 } from "lucide-react";
import NavbarStreaks from "@/components/navbar-streaks";
import AnalyticsPopup from "@/components/analytics-popup";
import { useAnalytics } from "@/hooks/useAnalytics";
import { toast } from "sonner";
import { useEffect } from "react";

export default function Header() {
    const { data: session } = useSession();
    const user = session?.user;
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    // For global analytics, we'll fetch data without a specific playlist ID
    // This will show overall user statistics across all playlists
    const { analyticsData, isLoading } = useAnalytics();

    // Daily streak toast - show only once per day
    useEffect(() => {
        if (!analyticsData || !user) return;

        const today = new Date().toDateString();
        const lastStreakToastDate = localStorage.getItem(`streakToast_${(user as any).id}`);

        // Only show if we haven't shown it today
        if (lastStreakToastDate !== today) {
            const dailyProgress = analyticsData.analytics?.dailyProgress || [];
            const hasToday = dailyProgress.some((day: any) =>
                new Date(day.date).toDateString() === today && day.videos > 0
            );

            if (hasToday) {
                // Calculate current streak
                const sortedDates = dailyProgress
                    .filter((day: any) => day.videos > 0)
                    .map((day: any) => new Date(day.date))
                    .sort((a, b) => b.getTime() - a.getTime());

                let currentStreak = 0;
                const todayDate = new Date();

                for (let i = 0; i < sortedDates.length; i++) {
                    const daysDiff = Math.floor((todayDate.getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24));
                    if (daysDiff === i) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }

                if (currentStreak > 0) {
                    setTimeout(() => {
                        toast.success(`Streak day ${currentStreak}! 🔥`, {
                            description: "Keep up the great learning momentum!",
                            duration: 5000,
                        });
                    }, 2000); // Delay to avoid overwhelming on page load

                    // Mark that we've shown the toast today
                    localStorage.setItem(`streakToast_${(user as any).id}`, today);
                }
            }
        }
    }, [analyticsData, user]);

    return (
        <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold text-primary">
                    ZenTube
                </Link>

                <div className="flex items-center gap-4">
                    {user && (
                        <>
                            {/* Daily Streaks Display */}
                            <NavbarStreaks analyticsData={analyticsData} />

                            {/* Analytics Popup Button */}
                            <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                                <DialogTrigger asChild>
                                    <div className="relative group">
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <BarChart3 className="h-4 w-4" />
                                            Analytics
                                        </Button>

                                        {/* Hover Tooltip with Quick Stats */}
                                        {analyticsData && !isLoading && (
                                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-popover border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                                <div className="text-sm font-medium mb-2">Quick Stats</div>
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Videos Completed:</span>
                                                        <span className="font-medium">
                                                            {analyticsData.analytics?.completedVideos || 0}/{analyticsData.analytics?.totalVideos || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Watch Time:</span>
                                                        <span className="font-medium">
                                                            {Math.round((analyticsData.analytics?.totalWatchTime || 0) / 3600 * 10) / 10}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Current Streak:</span>
                                                        <span className="font-medium text-orange-500">
                                                            {(() => {
                                                                const dailyProgress = analyticsData.analytics?.dailyProgress || [];
                                                                const today = new Date();
                                                                const yesterday = new Date(today);
                                                                yesterday.setDate(yesterday.getDate() - 1);

                                                                const hasToday = dailyProgress.some((day: any) =>
                                                                    new Date(day.date).toDateString() === today.toDateString() && day.videos > 0
                                                                );
                                                                const hasYesterday = dailyProgress.some((day: any) =>
                                                                    new Date(day.date).toDateString() === yesterday.toDateString() && day.videos > 0
                                                                );

                                                                return hasToday || hasYesterday ? '🔥' : '0';
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                                    Click to view detailed analytics
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground hover:scrollbar-thumb-primary">
                                    <DialogHeader>
                                        <DialogTitle>Your Progress</DialogTitle>
                                    </DialogHeader>
                                    <AnalyticsPopup analyticsData={analyticsData} isLoading={isLoading} />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}

                    <div>
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                                            <AvatarFallback>
                                                {user.name
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {user.name}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard">Dashboard</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Sign In
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
} 