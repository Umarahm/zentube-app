'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function PWARegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration)

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New content is available
                                    toast.info('New version available!', {
                                        description: 'Refresh to get the latest features',
                                        action: {
                                            label: 'Refresh',
                                            onClick: () => window.location.reload()
                                        },
                                        duration: 10000,
                                    })
                                }
                            })
                        }
                    })
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError)
                })

            // Handle PWA install prompt
            let deferredPrompt: any

            window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault()
                // Stash the event so it can be triggered later
                deferredPrompt = e

                // Show install toast after a delay
                setTimeout(() => {
                    toast.success('Install ZenTube!', {
                        description: 'Add to your home screen for the best experience',
                        action: {
                            label: 'Install',
                            onClick: async () => {
                                if (deferredPrompt) {
                                    deferredPrompt.prompt()
                                    const { outcome } = await deferredPrompt.userChoice
                                    console.log(`User response to the install prompt: ${outcome}`)
                                    deferredPrompt = null
                                }
                            }
                        },
                        duration: 8000,
                    })
                }, 5000) // Show after 5 seconds
            })

            // Handle successful installation
            window.addEventListener('appinstalled', () => {
                console.log('PWA was installed')
                toast.success('ZenTube installed!', {
                    description: 'You can now use ZenTube from your home screen',
                    duration: 4000,
                })
                deferredPrompt = null
            })
        }
    }, [])

    return null
}