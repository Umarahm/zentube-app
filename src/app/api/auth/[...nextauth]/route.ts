import { authOptions } from '@/lib/auth';

// NextAuth import workaround for Next.js 15 TypeScript issue
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const NextAuth = (require('next-auth') as any).default || require('next-auth');

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
