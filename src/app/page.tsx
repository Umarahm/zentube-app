"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LinkIcon, Activity, Target, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <Activity className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render the homepage (will redirect)
  if (status === "authenticated") {
    return null;
  }

  // Only show homepage to unauthenticated users
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Master Your Learning Flow
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Transform your YouTube learning experience with real-time tracking, habit formation,
              and intelligent playlist management. Turn watching into achieving.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mb-12">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="pl-10"
                  disabled
                />
              </div>
              <Link href="/login">
                <Button type="submit" size="lg">
                  Start Tracking
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Sign in to start tracking your learning progress
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything you need to accelerate your learning
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit">
                    <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Real-time Tracking</CardTitle>
                  <CardDescription>
                    Monitor your learning progress as it happens. See detailed analytics,
                    time spent, completion rates, and learning velocity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Live progress monitoring</li>
                    <li>• Detailed time analytics</li>
                    <li>• Performance insights</li>
                    <li>• Learning velocity tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
                    <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Habit Tracking</CardTitle>
                  <CardDescription>
                    Build consistent learning habits with streak tracking, daily goals,
                    and personalized reminders that keep you motivated.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Daily learning streaks</li>
                    <li>• Goal setting & tracking</li>
                    <li>• Smart reminders</li>
                    <li>• Habit formation insights</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-fit">
                    <PlayCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Playlist Management</CardTitle>
                  <CardDescription>
                    Organize, prioritize, and manage your YouTube playlists with ease.
                    Create learning paths and track progress across multiple topics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Smart playlist organization</li>
                    <li>• Learning path creation</li>
                    <li>• Progress synchronization</li>
                    <li>• Content recommendations</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to supercharge your learning?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of learners who are already using ZenTube to achieve their educational goals faster and more efficiently.
            </p>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
