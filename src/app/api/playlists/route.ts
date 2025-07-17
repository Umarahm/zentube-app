import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('user_id')

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const { data: playlists, error } = await supabaseServer
            .from('playlists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ playlists })
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch playlists' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, title, description, youtube_playlist_id } = body

        if (!user_id || !title || !youtube_playlist_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const { data: playlist, error } = await supabaseServer
            .from('playlists')
            .insert({
                user_id,
                title,
                description,
                youtube_playlist_id,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ playlist })
    } catch {
        return NextResponse.json(
            { error: 'Failed to create playlist' },
            { status: 500 }
        )
    }
} 