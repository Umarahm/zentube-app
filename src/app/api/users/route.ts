import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')

        if (userId) {
            const { data: user, error } = await supabaseServer
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error

            return NextResponse.json({ user })
        }

        const { data: users, error } = await supabaseServer
            .from('users')
            .select('*')

        if (error) throw error

        return NextResponse.json({ users })
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, email, name, avatar_url } = body

        const { data: user, error } = await supabaseServer
            .from('users')
            .upsert({
                id,
                email,
                name,
                avatar_url,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ user })
    } catch {
        return NextResponse.json(
            { error: 'Failed to create/update user' },
            { status: 500 }
        )
    }
} 