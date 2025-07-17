import { NextRequest, NextResponse } from 'next/server';
import { getVideoComments } from '@/lib/youtube';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const comments = await getVideoComments(videoId);

        return NextResponse.json({ comments });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video comments. Comments may be disabled for this video.' },
            { status: 500 }
        );
    }
} 