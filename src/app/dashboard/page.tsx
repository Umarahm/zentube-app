"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PlayCircle,
    Plus,
    Link as LinkIcon,
    Video,
    Calendar,
    User,
    Loader2,
    AlertCircle,
    CheckCircle,
    BookOpen,
    Trophy,
    Zap,
    Clock,
    Eye,
    Target,
    Rocket,
    Sparkles,
    Brain,
    Award,
    Activity
} from "lucide-react";

interface Playlist {
    id: string;
    title: string;
    description: string;
    youtube_playlist_id: string;
    created_at: string;
}

interface PlaylistDetails {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    itemCount: number;
    publishedAt: string;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [playlistDetails, setPlaylistDetails] = useState<Record<string, PlaylistDetails>>({});
    const [playlistUrl, setPlaylistUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (status === "loading") return;
        if (!session) {
            router.push("/login");
            return;
        }
        fetchPlaylists();
    }, [session, status, router]);

    const fetchPlaylists = async () => {
        if (!session?.user?.email) return;

        try {
            const response = await fetch(`/api/playlists?user_id=${(session.user as any).id || session.user.email}`);
            if (response.ok) {
                const data = await response.json();
                setPlaylists(data.playlists || []);

                // Fetch details for each playlist
                for (const playlist of data.playlists || []) {
                    fetchPlaylistDetails(playlist.youtube_playlist_id);
                }
            }
        } catch (error) {
            console.error('Error fetching playlists:', error);
        }
    };

    const fetchPlaylistDetails = async (playlistId: string) => {
        try {
            const response = await fetch(`/api/youtube/playlist?id=${playlistId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.videos && data.videos.length > 0) {
                    // Create mock playlist details from first video
                    const firstVideo = data.videos[0];
                    setPlaylistDetails(prev => ({
                        ...prev,
                        [playlistId]: {
                            id: playlistId,
                            title: playlists.find(p => p.youtube_playlist_id === playlistId)?.title || 'Unknown Playlist',
                            description: playlists.find(p => p.youtube_playlist_id === playlistId)?.description || '',
                            thumbnail: firstVideo.thumbnail,
                            channelTitle: firstVideo.channelTitle,
                            itemCount: data.totalResults,
                            publishedAt: firstVideo.publishedAt,
                        }
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching playlist details:', error);
        }
    };

    const handleAddPlaylist = async () => {
        if (!playlistUrl.trim()) return;

        setIsLoading(true);
        setError("");
        setWarning("");
        setSuccess("");

        try {
            const response = await fetch('/api/youtube/playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: playlistUrl }),
            });

            const data = await response.json();
            console.log('API Response:', data); // Debug log

            if (response.ok) {
                setPlaylistUrl("");

                if (data.success) {
                    setSuccess(data.message || 'Playlist added successfully!');
                    toast.success("Playlist added successfully!", {
                        description: "Your playlist is ready to explore!",
                        duration: 4000,
                    });
                    // Refresh the playlists since it was saved
                    await fetchPlaylists();
                } else if (data.warning) {
                    setWarning(data.warning);
                } else {
                    // Even if not saved to database, show success for fetching
                    toast.success("Playlist added successfully!", {
                        description: "Your playlist is ready to explore!",
                        duration: 4000,
                    });
                }

                // Show playlist details even if not saved
                if (data.playlistDetails) {
                    const details = data.playlistDetails;
                    setPlaylistDetails(prev => ({
                        ...prev,
                        [details.id]: details
                    }));
                }
            } else {
                setError(data.error || 'Failed to add playlist');
            }
        } catch (error) {
            console.error('Network error:', error);
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaylistClick = (playlistId: string) => {
        router.push(`/playlist/${playlistId}`);
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-foreground">Loading your learning space...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const totalVideos = Object.values(playlistDetails).reduce((sum, details) => sum + details.itemCount, 0);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
            <Header />
            <main className="flex-1 p-6">
                <div className="container mx-auto max-w-7xl">
                    {/* Hero Welcome Section */}
                    <div className="relative mb-12 p-8 rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
                        {/* Background decorations - subtle dark theme */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-24 -translate-x-24"></div>
                        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-primary/5 rounded-full"></div>

                        <div className="relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                            <Brain className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                                Welcome back, {session.user?.name?.split(' ')[0] || 'Learner'}!
                                                <span className="ml-2"></span>
                                            </h1>
                                            <p className="text-muted-foreground text-lg mt-2">
                                                Your knowledge journey continues here. Ready to unlock new insights?
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 pt-4">
                                        <div className="text-center">
                                            <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                                                <BookOpen className="h-6 w-6 text-primary" />
                                                {playlists.length}
                                            </div>
                                            <p className="text-muted-foreground text-sm">Playlists</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                                                <Video className="h-6 w-6 text-primary" />
                                                {totalVideos}
                                            </div>
                                            <p className="text-muted-foreground text-sm">TotalVideos</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                                                <Rocket className="h-6 w-6 text-primary" />
                                                {playlists.length > 0 ? "Ready!" : "Start"}
                                            </div>
                                            <p className="text-muted-foreground text-sm">Status</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden lg:block">
                                    <div className="relative">
                                        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                            <Trophy className="h-16 w-16 text-primary" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="playlists" className="space-y-8">
                        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto h-12 p-1 bg-card border border-border">
                            <TabsTrigger value="playlists" className="flex items-center gap-2 text-sm font-medium">
                                <PlayCircle className="h-4 w-4" />
                                My Playlists
                            </TabsTrigger>
                            <TabsTrigger value="add" className="flex items-center gap-2 text-sm font-medium">
                                <Plus className="h-4 w-4" />
                                Add New
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="add" className="space-y-6">
                            {/* Enhanced Add Playlist Section */}
                            <Card className="border-2 border-dashed border-primary/20 bg-card/80 shadow-lg">
                                <CardHeader className="text-center pb-6">
                                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                                        <Plus className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                        Add YouTube Playlist
                                    </CardTitle>
                                    <CardDescription className="text-lg">
                                        Transform any YouTube playlist into your personal learning journey
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="relative flex-1">
                                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                type="url"
                                                placeholder="https://www.youtube.com/playlist?list=..."
                                                className="h-14 pl-12 text-lg border-2 border-border focus:border-primary bg-background/50"
                                                value={playlistUrl}
                                                onChange={(e) => setPlaylistUrl(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddPlaylist()}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleAddPlaylist}
                                            disabled={isLoading || !playlistUrl.trim()}
                                            className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                            size="lg"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-5 w-5 mr-3" />
                                                    Add Playlist
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Status Messages */}
                                    {success && (
                                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                            <div className="p-2 bg-green-500/10 rounded-full">
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-green-500">{success}</p>
                                                <p className="text-sm text-green-500/80">Your playlist is ready to explore!</p>
                                            </div>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                                            <div className="p-2 bg-destructive/10 rounded-full">
                                                <AlertCircle className="h-5 w-5 text-destructive" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-destructive">{error}</p>
                                                <p className="text-sm text-destructive/80">Please check the URL and try again.</p>
                                            </div>
                                        </div>
                                    )}
                                    {warning && (
                                        <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                            <div className="p-2 bg-orange-500/10 rounded-full">
                                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-orange-500">{warning}</p>
                                                <p className="text-sm text-orange-500/80">We found the playlist but couldn't save it.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pro Tips */}
                                    <div className="grid md:grid-cols-3 gap-4 pt-4">
                                        <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                                            <h4 className="font-semibold text-foreground">Focused Learning</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Track progress on specific topics</p>
                                        </div>
                                        <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                                            <h4 className="font-semibold text-foreground">Smart Analytics</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Understand your learning patterns</p>
                                        </div>
                                        <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                                            <h4 className="font-semibold text-foreground">Achievement System</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Celebrate your milestones</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="playlists" className="space-y-6">
                            {/* Enhanced Playlists Grid */}
                            {playlists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {playlists.map((playlist, index) => {
                                        const details = playlistDetails[playlist.youtube_playlist_id];

                                        return (
                                            <Card
                                                key={playlist.id}
                                                className="group cursor-pointer border border-border shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm overflow-hidden"
                                                onClick={() => handlePlaylistClick(playlist.youtube_playlist_id)}
                                            >
                                                <CardHeader className="p-0 relative">
                                                    {details?.thumbnail ? (
                                                        <div className="relative h-48 overflow-hidden">
                                                            <img
                                                                src={details.thumbnail}
                                                                alt={playlist.title}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                                <div className="text-center text-white">
                                                                    <PlayCircle className="h-16 w-16 mx-auto mb-2" />
                                                                    <p className="font-semibold">Start Learning</p>
                                                                </div>
                                                            </div>
                                                            <div className="absolute top-3 left-3">
                                                                <Badge className="bg-background/90 text-foreground hover:bg-background">
                                                                    <Video className="h-3 w-3 mr-1" />
                                                                    {details.itemCount} videos
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-48 bg-muted/50 flex items-center justify-center border-b border-border">
                                                            <div className="text-center text-muted-foreground">
                                                                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                                                <p className="text-lg font-semibold">Loading...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardHeader>
                                                <CardContent className="p-6 space-y-4">
                                                    <div>
                                                        <h3 className="font-bold text-xl mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                                            {playlist.title}
                                                        </h3>
                                                        {details && (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                                    <div className="flex items-center gap-1">
                                                                        <User className="h-4 w-4 text-primary" />
                                                                        <span className="font-medium">{details.channelTitle}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="h-4 w-4" />
                                                                        {new Date(playlist.created_at).toLocaleDateString()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock className="h-4 w-4" />
                                                                        <span>In Progress</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                                                        <PlayCircle className="h-5 w-5 mr-2" />
                                                        Continue Learning
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Enhanced Getting Started Section */
                                <div className="text-center space-y-8">
                                    <div className="mx-auto max-w-md">
                                        <div className="relative mx-auto w-32 h-32 mb-6">
                                            <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                                <Rocket className="h-16 w-16 text-primary" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center animate-bounce">
                                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Learning?</h2>
                                        <p className="text-lg text-muted-foreground mb-8">
                                            Your learning adventure begins with adding your first playlist. Let&apos;s make it amazing!
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                        <Card className="p-6 border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:shadow-lg transition-all duration-300">
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                                                    <Plus className="h-8 w-8 text-primary-foreground" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">1. Add Playlist</h3>
                                                <p className="text-muted-foreground">
                                                    Find any YouTube playlist that sparks your curiosity and paste the URL
                                                </p>
                                            </div>
                                        </Card>

                                        <Card className="p-6 border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:shadow-lg transition-all duration-300">
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                                                    <Eye className="h-8 w-8 text-primary-foreground" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">2. Watch & Learn</h3>
                                                <p className="text-muted-foreground">
                                                    Dive into your content with our enhanced player and progress tracking
                                                </p>
                                            </div>
                                        </Card>

                                        <Card className="p-6 border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:shadow-lg transition-all duration-300">
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                                                    <Trophy className="h-8 w-8 text-primary-foreground" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">3. Track Progress</h3>
                                                <p className="text-muted-foreground">
                                                    Build learning streaks and celebrate your knowledge milestones
                                                </p>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="pt-8">
                                        <Button
                                            onClick={() => {
                                                const tabsList = document.querySelector('[role="tablist"]');
                                                const addTab = tabsList?.querySelector('[value="add"]') as HTMLElement;
                                                addTab?.click();
                                            }}
                                            className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <Rocket className="h-6 w-6 mr-3" />
                                            Start Your Learning Journey
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
} 