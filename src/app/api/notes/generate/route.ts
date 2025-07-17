import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseServer } from '@/lib/supabase';
import { auth } from '@/lib/auth';

const STUDY_NOTES_PROMPT = `You are a detailed note-taking assistant. Please create comprehensive study notes from the following transcript. Focus on the main points, use bullet points, and organize the information clearly. The notes should be formatted in Markdown. 

Transcript:`;

interface RequestBody {
    videoId: string;
    transcript: string;
    language?: string;
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if Google Generative AI API key is configured
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json(
                { error: 'Google Generative AI API key is not configured' },
                { status: 500 }
            );
        }

        // Check daily usage limit
        const { data: usageData, error: usageError } = await supabaseServer
            .rpc('check_and_update_notes_usage', { user_id_param: userId });

        if (usageError) {
            console.error('Usage check error:', usageError);
            return NextResponse.json(
                { error: 'Failed to check usage limit' },
                { status: 500 }
            );
        }

        if (!usageData || usageData.length === 0 || !usageData[0].can_use) {
            const currentCount = usageData?.[0]?.current_count || 3;
            return NextResponse.json(
                {
                    error: 'Daily usage limit exceeded',
                    message: `You have used all 3 daily notes generations. The limit resets at midnight IST.`,
                    currentCount,
                    maxCount: 3
                },
                { status: 429 }
            );
        }

        const body = await request.json() as RequestBody;
        const { transcript, videoId } = body;

        if (!transcript) {
            return NextResponse.json(
                { error: 'Transcript is required' },
                { status: 400 }
            );
        }

        // Validate transcript length
        if (transcript.length < 100) {
            return NextResponse.json(
                { error: 'Transcript is too short to generate meaningful notes' },
                { status: 400 }
            );
        }

        if (transcript.length > 50000) {
            return NextResponse.json(
                { error: 'Transcript is too long. Please use a shorter video.' },
                { status: 400 }
            );
        }

        // Initialize Google Generative AI
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Generate study notes
        const prompt = STUDY_NOTES_PROMPT + transcript;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const notes = response.text();

        if (!notes || notes.length < 100) {
            return NextResponse.json(
                { error: 'Failed to generate meaningful study notes' },
                { status: 500 }
            );
        }

        // Get updated usage count
        const { data: newUsageData } = await supabaseServer
            .rpc('get_notes_usage_count', { user_id_param: userId });

        const currentUsageCount = newUsageData || 0;

        return NextResponse.json({
            notes,
            videoId,
            usageInfo: {
                currentCount: currentUsageCount,
                maxCount: 3,
                remaining: Math.max(0, 3 - currentUsageCount)
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Notes generation error:', error);

        if (error instanceof Error) {
            // Handle specific Google AI errors
            if (error.message.includes('quota')) {
                return NextResponse.json(
                    { error: 'AI service quota exceeded. Please try again later.' },
                    { status: 503 }
                );
            }

            if (error.message.includes('safety')) {
                return NextResponse.json(
                    { error: 'Content flagged by safety filters. Please try with different content.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate study notes' },
            { status: 500 }
        );
    }
}

// GET endpoint to check current usage
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Get current usage count
        const { data: usageCount, error } = await supabaseServer
            .rpc('get_notes_usage_count', { user_id_param: userId });

        if (error) {
            console.error('Usage check error:', error);
            return NextResponse.json(
                { error: 'Failed to check usage limit' },
                { status: 500 }
            );
        }

        const currentCount = usageCount || 0;

        return NextResponse.json({
            currentCount,
            maxCount: 3,
            remaining: Math.max(0, 3 - currentCount),
            canUse: currentCount < 3
        });

    } catch (error) {
        console.error('Usage check error:', error);
        return NextResponse.json(
            { error: 'Failed to check usage limit' },
            { status: 500 }
        );
    }
}