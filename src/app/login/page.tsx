"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function GoogleIcon(props: React.ComponentProps<"svg">) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="24px"
            height="24px"
        >
            <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
	c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
	s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
	C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
	c-5.223,0-9.651-3.657-11.303-8.653l-6.571,4.82C9.656,39.663,16.318,44,24,44z"
            />
            <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.089,5.571
	l6.19,5.238C44.438,36.338,48,31.026,48,24C48,22.659,47.862,21.35,47.611,20.083z"
            />
        </svg>
    );
}

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        // Redirect to dashboard if already logged in
        if (status === 'authenticated' && session) {
            console.log('User is authenticated, redirecting to dashboard...');
            router.replace('/dashboard');
        }
    }, [session, status, router]);

    // Show loading while checking authentication
    if (status === "loading") {
        return (
            <main className="flex items-center justify-center min-h-screen">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    // Show loading if authenticated (while redirecting)
    if (status === 'authenticated') {
        return (
            <main className="flex items-center justify-center min-h-screen">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Redirecting to dashboard...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">
                        Welcome to ZenTube
                    </CardTitle>
                    <CardDescription>
                        Sign in to continue to your personal video sanctuary.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => signIn("google", {
                            callbackUrl: "/dashboard",
                            redirect: true
                        })}
                    >
                        <GoogleIcon className="mr-2 h-4 w-4" />
                        Login with Google
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
} 