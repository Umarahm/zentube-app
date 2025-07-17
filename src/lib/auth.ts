import GoogleProvider from 'next-auth/providers/google';
import { supabaseServer } from './supabase';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })
    ],
    callbacks: {
        async signIn({ user, account }: any) {
            if (account?.provider === 'google') {
                try {
                    const { error } = await supabaseServer
                        .from('users')
                        .upsert({
                            id: user.id,
                            email: user.email!,
                            name: user.name,
                            avatar_url: user.image,
                            updated_at: new Date().toISOString(),
                        })
                        .select();
                    if (error) return false;
                    return true;
                } catch {
                    return false;
                }
            }
            return true;
        },
        async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
            if (url.startsWith(baseUrl)) return `${baseUrl}/dashboard`;
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            return `${baseUrl}/dashboard`;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.id = token.sub!;
            }
            return session;
        },
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
};

// NextAuth import workaround for Next.js 15 TypeScript issue
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const NextAuth = (require('next-auth') as any).default || require('next-auth');

export const auth = async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { getServerSession } = require('next-auth/next');
    return await getServerSession(authOptions);
};
