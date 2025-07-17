'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import PWARegister from './pwa-register'

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <Toaster
                position="top-right"
                richColors
                closeButton
                theme="dark"
                toastOptions={{
                    style: {
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--popover-foreground))',
                    },
                }}
            />
            <PWARegister />
        </SessionProvider>
    )
} 