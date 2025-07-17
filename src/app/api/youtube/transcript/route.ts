import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { auth } from '@/lib/auth';

interface RequestBody {
    videoId: string;
    language?: string;
}

interface TranscriptSegment {
    text: string;
    duration: number;
    offset: number;
}

// Multiple methods to fetch transcript
async function fetchTranscript(videoId: string): Promise<string> {
    const methods = [
        () => fetchTranscriptFromYouTubeTranscriptPackage(videoId),
        () => fetchTranscriptFromYouTubeTranscriptAPI(videoId),
        () => fetchTranscriptFromPageScraping(videoId),
    ];

    let lastError: Error | null = null;

    for (const method of methods) {
        try {
            const transcript = await method();
            if (transcript && transcript.length > 50) {
                return transcript;
            }
        } catch (error) {
            console.log('Transcript method failed, trying next method:', error);
            if (error instanceof Error) {
                lastError = error;
            }
        }
    }

    // Provide a more helpful error message based on the last error
    if (lastError && lastError.message.includes('captions available')) {
        throw new Error('This video does not have captions available or they are disabled. Please try a different video with captions enabled.');
    }

    // If all methods failed, provide a comprehensive error message
    throw new Error('Unable to fetch transcript for this video. This could be because: 1) The video does not have captions/subtitles, 2) Captions are disabled by the video owner, 3) The video is private or restricted, 4) The video is too new and captions haven\'t been generated yet.');
}

// Method 1: Use youtube-transcript package (most reliable)
async function fetchTranscriptFromYouTubeTranscriptPackage(videoId: string): Promise<string> {
    try {
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcriptArray || transcriptArray.length === 0) {
            throw new Error('No transcript found');
        }

        // Combine all transcript segments into a single string
        const transcript = transcriptArray
            .map(item => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (transcript.length < 50) {
            throw new Error('Transcript too short');
        }

        return transcript;
    } catch (error) {
        console.error('YouTube Transcript package failed:', error);

        // Handle specific error cases
        if (error instanceof Error) {
            if (error.message.includes('No transcript found') ||
                error.message.includes('Could not get transcripts') ||
                error.message.includes('Transcripts disabled')) {
                throw new Error('This video does not have captions available or they are disabled.');
            }
        }

        throw error;
    }
}



// Method 2: Try to use youtube-transcript-api equivalent
async function fetchTranscriptFromYouTubeTranscriptAPI(videoId: string): Promise<string> {
    try {
        // This is a simplified version - in a real implementation, you'd use the youtube-transcript-api package
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);

        if (!response.ok) {
            throw new Error('Failed to fetch video page');
        }

        const html = await response.text();

        // Look for transcript data in the page with better regex patterns
        const transcriptPatterns = [
            /"captions":\s*({[^}]+})/,
            /"playerCaptionsTracklistRenderer":\s*({[^}]+})/,
            /"captionTracks":\s*(\[[^\]]+\])/,
        ];

        for (const pattern of transcriptPatterns) {
            try {
                const transcriptMatch = html.match(pattern);
                if (transcriptMatch) {
                    let jsonStr = transcriptMatch[1];

                    // Try to fix common JSON issues before parsing
                    jsonStr = jsonStr.replace(/,\s*}/g, '}'); // Remove trailing commas
                    jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
                    jsonStr = jsonStr.replace(/\\"/g, '"'); // Fix escaped quotes
                    jsonStr = jsonStr.replace(/\\\\/g, '\\'); // Fix double escaped backslashes

                    try {
                        const captionsData = JSON.parse(jsonStr);

                        // Handle different data structures
                        if (captionsData.playerCaptionsTracklistRenderer) {
                            const tracks = captionsData.playerCaptionsTracklistRenderer.captionTracks;
                            if (tracks && tracks.length > 0) {
                                // Find English track or first available
                                const englishTrack = tracks.find((track: any) =>
                                    track.languageCode === 'en' || track.languageCode === 'en-US'
                                ) || tracks[0];

                                if (englishTrack && englishTrack.baseUrl) {
                                    const transcriptResponse = await fetch(englishTrack.baseUrl);
                                    if (transcriptResponse.ok) {
                                        const transcriptXml = await transcriptResponse.text();
                                        return parseTranscriptXml(transcriptXml);
                                    }
                                }
                            }
                        } else if (Array.isArray(captionsData)) {
                            // Handle array format
                            const englishTrack = captionsData.find((track: any) =>
                                track.languageCode === 'en' || track.languageCode === 'en-US'
                            ) || captionsData[0];

                            if (englishTrack && englishTrack.baseUrl) {
                                const transcriptResponse = await fetch(englishTrack.baseUrl);
                                if (transcriptResponse.ok) {
                                    const transcriptXml = await transcriptResponse.text();
                                    return parseTranscriptXml(transcriptXml);
                                }
                            }
                        }
                    } catch (jsonError) {
                        console.error('JSON parsing error in transcript API method:', jsonError);
                        // Continue to next pattern instead of throwing
                        continue;
                    }
                }
            } catch (patternError) {
                console.error('Error processing transcript pattern:', patternError);
                // Continue to next pattern
                continue;
            }
        }

        throw new Error('No transcript found using YouTube Transcript API method');
    } catch (error) {
        console.error('YouTube Transcript API method failed:', error);
        throw error;
    }
}

// Method 3: Page scraping fallback
async function fetchTranscriptFromPageScraping(videoId: string): Promise<string> {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch video page');
        }

        const html = await response.text();

        // Look for various transcript patterns with better error handling
        const patterns = [
            /"text":"([^"]+)"/g,
            /"simpleText":"([^"]+)"/g,
            /\{"text":"([^"]+)"\}/g,
            /"captionTracks":\s*\[([^\]]+)\]/g,
            /"captions":\s*\{([^}]+)\}/g,
        ];

        for (const pattern of patterns) {
            try {
                const matches = html.match(pattern);
                if (matches && matches.length > 10) { // Need a reasonable amount of text
                    const transcript = matches
                        .map(match => {
                            try {
                                const textMatch = match.match(/"(?:text|simpleText)":"([^"]+)"/);
                                return textMatch ? textMatch[1] : '';
                            } catch (matchError) {
                                console.error('Error processing transcript match:', matchError);
                                return '';
                            }
                        })
                        .filter(text => text.length > 3) // Filter out very short text
                        .join(' ')
                        .replace(/\\n/g, ' ')
                        .replace(/\\"/g, '"')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (transcript.length > 100) {
                        return transcript;
                    }
                }
            } catch (patternError) {
                console.error('Error processing transcript pattern:', patternError);
                // Continue to next pattern
            }
        }

        throw new Error('No transcript found using page scraping');
    } catch (error) {
        console.error('Page scraping method failed:', error);
        throw error;
    }
}

// Helper function to parse XML transcript
function parseTranscriptXml(xml: string): string {
    try {
        // Remove XML tags and decode HTML entities
        const text = xml
            .replace(/<[^>]*>/g, '') // Remove XML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    } catch (error) {
        console.error('Error parsing transcript XML:', error);
        throw error;
    }
}



export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        // Validate video ID format (YouTube video IDs are 11 characters)
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return NextResponse.json(
                { error: 'Invalid video ID format' },
                { status: 400 }
            );
        }

        // Note: We don't actually need YouTube API key for transcript fetching
        // The methods we use work without it

        const transcript = await fetchTranscript(videoId);

        if (!transcript || transcript.length < 50) {
            return NextResponse.json(
                { error: 'No meaningful transcript found for this video. The video may not have captions or they may be disabled.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            transcript,
            videoId,
            length: transcript.length
        });

    } catch (error) {
        console.error('Transcript API error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transcript';

        // Provide more helpful error messages based on the error type
        if (errorMessage.includes('No transcript found') || errorMessage.includes('captions')) {
            return NextResponse.json(
                {
                    error: 'No transcript available for this video. This could be because:',
                    details: [
                        'The video does not have captions/subtitles',
                        'Captions are disabled by the video owner',
                        'The video is private or restricted',
                        'The video is too new and captions haven\'t been generated yet'
                    ]
                },
                { status: 404 }
            );
        } else if (errorMessage.includes('private') || errorMessage.includes('unavailable')) {
            return NextResponse.json(
                { error: 'This video is private or unavailable' },
                { status: 403 }
            );
        } else {
            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as RequestBody;
        const { videoId, language } = body;

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const transcripts = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: language || 'en'
        });

        if (!transcripts || transcripts.length === 0) {
            return NextResponse.json(
                { error: 'No transcript found for this video' },
                { status: 404 }
            );
        }

        // Format the transcript segments
        const formattedTranscript = transcripts
            .map((segment: TranscriptSegment) => segment.text)
            .join(' ');

        return NextResponse.json({
            transcript: formattedTranscript,
            segments: transcripts,
        });
    } catch (error) {
        console.error('Error fetching transcript:', error);
        if (error instanceof Error && error.message.includes('could not find any transcripts')) {
            return NextResponse.json(
                { error: 'No transcript available for this video' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to fetch transcript' },
            { status: 500 }
        );
    }
}