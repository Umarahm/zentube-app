"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    FileText,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    Sparkles
} from "lucide-react";

interface NotesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
    videoTitle: string;
    onUsageUpdate?: (usage: { currentCount: number; maxCount: number; remaining: number }) => void;
}

type Step = 'transcript' | 'generating' | 'pdf' | 'complete';

interface StepInfo {
    id: Step;
    title: string;
    description: string;
    icon: React.ReactNode;
}

const steps: StepInfo[] = [
    {
        id: 'transcript',
        title: 'Fetching Transcript',
        description: 'Extracting text from YouTube video',
        icon: <FileText className="h-4 w-4" />
    },
    {
        id: 'generating',
        title: 'Generating Notes',
        description: 'Creating study notes with AI',
        icon: <Sparkles className="h-4 w-4" />
    },
    {
        id: 'pdf',
        title: 'Creating PDF',
        description: 'Converting notes to PDF format',
        icon: <Download className="h-4 w-4" />
    },
    {
        id: 'complete',
        title: 'Complete',
        description: 'Your study notes are ready!',
        icon: <CheckCircle className="h-4 w-4" />
    }
];

export default function NotesDialog({ isOpen, onClose, videoId, videoTitle, onUsageUpdate }: NotesDialogProps) {
    const [currentStep, setCurrentStep] = useState<Step>('transcript');
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedNotes, setGeneratedNotes] = useState<string | null>(null);
    const [usageInfo, setUsageInfo] = useState<{ currentCount: number; maxCount: number; remaining: number } | null>(null);

    const getCurrentStepIndex = () => {
        return steps.findIndex(step => step.id === currentStep);
    };

    const getProgressPercentage = () => {
        const stepIndex = getCurrentStepIndex();
        const baseProgress = (stepIndex / steps.length) * 100;
        return Math.min(baseProgress + (progress / steps.length), 100);
    };

    const handleGenerateNotes = async () => {
        setIsLoading(true);
        setError(null);
        setCurrentStep('transcript');
        setProgress(0);

        try {
            // Step 1: Fetch transcript
            setProgress(25);
            const transcriptResponse = await fetch(`/api/youtube/transcript?videoId=${videoId}`);

            if (!transcriptResponse.ok) {
                const errorData = await transcriptResponse.json();
                let errorMessage = errorData.error || 'Failed to fetch transcript';

                // Handle detailed error messages
                if (errorData.details && Array.isArray(errorData.details)) {
                    errorMessage += '\n\nPossible reasons:\n' + errorData.details.map((detail: string) => `• ${detail}`).join('\n');
                }

                throw new Error(errorMessage);
            }

            const transcriptData = await transcriptResponse.json();
            setProgress(100);

            // Step 2: Generate notes
            setCurrentStep('generating');
            setProgress(0);

            const notesResponse = await fetch('/api/notes/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript: transcriptData.transcript,
                    videoTitle,
                    videoId
                }),
            });

            if (!notesResponse.ok) {
                const errorData = await notesResponse.json();
                if (notesResponse.status === 429) {
                    setError(`Daily limit exceeded: ${errorData.message}`);
                } else {
                    throw new Error(errorData.error || 'Failed to generate notes');
                }
                return;
            }

            const notesData = await notesResponse.json();
            setGeneratedNotes(notesData.notes);
            setUsageInfo(notesData.usageInfo);
            onUsageUpdate?.(notesData.usageInfo);
            setProgress(100);

            // Step 3: Prepare PDF
            setCurrentStep('pdf');
            setProgress(100);

            // Step 4: Complete
            setCurrentStep('complete');

        } catch (err) {
            console.error('Notes generation error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!generatedNotes) return;

        try {
            setIsLoading(true);

            const response = await fetch('/api/notes/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notes: generatedNotes,
                    videoTitle,
                    videoId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate PDF');
            }

            // Create blob from response
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `study_notes_${videoTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error('PDF download error:', err);
            setError(err instanceof Error ? err.message : 'Failed to download PDF');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentStep('transcript');
        setProgress(0);
        setError(null);
        setGeneratedNotes(null);
        setUsageInfo(null);
        onClose();
    };

    const renderStepIndicator = () => {
        const currentIndex = getCurrentStepIndex();

        return (
            <div className="flex items-center justify-between mb-6">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${index < currentIndex
                                ? 'bg-primary border-primary text-primary-foreground'
                                : index === currentIndex
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                                }`}
                        >
                            {index < currentIndex ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                step.icon
                            )}
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`w-12 h-0.5 mx-2 ${index < currentIndex ? 'bg-primary' : 'bg-muted'
                                    }`}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (error) {
            return (
                <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Error</h3>
                    <div className="text-muted-foreground mb-4 text-left max-w-md mx-auto">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{error}</pre>
                    </div>
                    <Button onClick={handleClose} variant="outline">
                        Close
                    </Button>
                </div>
            );
        }

        if (currentStep === 'complete' && generatedNotes) {
            return (
                <div className="space-y-6">
                    <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Notes Generated Successfully!</h3>
                        <p className="text-muted-foreground">
                            Your study notes are ready for download.
                        </p>
                        {usageInfo && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Usage: {usageInfo.currentCount}/{usageInfo.maxCount}
                                        ({usageInfo.remaining} remaining today)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2">Preview</h4>
                        <ScrollArea className="h-40">
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {generatedNotes.substring(0, 500)}...
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={handleDownloadPDF}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating PDF...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </>
                            )}
                        </Button>
                        <Button onClick={handleClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </div>
            );
        }

        // Initial state or processing
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">
                            {isLoading ? steps[getCurrentStepIndex()].title : 'Generate Study Notes'}
                        </h3>
                        <p className="text-muted-foreground">
                            {isLoading
                                ? steps[getCurrentStepIndex()].description
                                : 'Create comprehensive study notes from this video using AI'
                            }
                        </p>
                    </div>

                    {isLoading && (
                        <div className="mb-4">
                            <Progress value={getProgressPercentage()} className="mb-2" />
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={handleGenerateNotes}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Notes
                            </>
                        )}
                    </Button>
                    <Button onClick={handleClose} variant="outline" disabled={isLoading}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Study Notes Generator
                    </DialogTitle>
                    <DialogDescription>
                        Convert "{videoTitle}" into comprehensive study notes with AI
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {renderStepIndicator()}
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
} 