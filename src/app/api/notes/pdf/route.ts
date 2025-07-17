import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { auth } from '@/lib/auth';

// Function to parse markdown-like content and convert to PDF
function parseMarkdownToPDF(doc: jsPDF, content: string, startY: number = 20): number {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let currentY = startY;

    // Split content into lines
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
            currentY += 5; // Small gap for empty lines
            continue;
        }

        // Check if we need a new page
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 20;
            addWatermark(doc); // Add watermark to new page
        }

        // Handle different markdown elements
        if (line.startsWith('# ')) {
            // Main heading
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            const text = line.substring(2);
            const splitText = doc.splitTextToSize(text, maxWidth);
            doc.text(splitText, margin, currentY);
            currentY += splitText.length * 8 + 10;

        } else if (line.startsWith('## ')) {
            // Sub heading
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            const text = line.substring(3);
            const splitText = doc.splitTextToSize(text, maxWidth);
            doc.text(splitText, margin, currentY);
            currentY += splitText.length * 6 + 8;

        } else if (line.startsWith('### ')) {
            // Sub-sub heading
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const text = line.substring(4);
            const splitText = doc.splitTextToSize(text, maxWidth);
            doc.text(splitText, margin, currentY);
            currentY += splitText.length * 5 + 6;

        } else if (line.startsWith('**') && line.endsWith('**')) {
            // Bold text
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            const text = line.substring(2, line.length - 2);
            const splitText = doc.splitTextToSize(text, maxWidth);
            doc.text(splitText, margin, currentY);
            currentY += splitText.length * 5 + 4;

        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            // Bullet points
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const text = line.substring(2);
            const splitText = doc.splitTextToSize(`• ${text}`, maxWidth);
            doc.text(splitText, margin + 5, currentY);
            currentY += splitText.length * 4 + 3;

        } else if (/^\d+\.\s/.test(line)) {
            // Numbered list
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitText = doc.splitTextToSize(line, maxWidth);
            doc.text(splitText, margin + 5, currentY);
            currentY += splitText.length * 4 + 3;

        } else {
            // Regular text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitText = doc.splitTextToSize(line, maxWidth);
            doc.text(splitText, margin, currentY);
            currentY += splitText.length * 4 + 3;
        }
    }

    return currentY;
}

// Function to add watermark to PDF page
function addWatermark(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Save current state
    const currentFontSize = doc.getFontSize();
    const currentFont = doc.getFont();

    // Set watermark properties
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 230, 230); // Light gray color

    // Calculate position for center of page
    const text = 'Zentube 2025';
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    const y = pageHeight / 2;

    // Add watermark at 45-degree angle
    doc.text(text, x, y, { angle: 45 });

    // Restore previous state
    doc.setFontSize(currentFontSize);
    doc.setFont(currentFont.fontName, currentFont.fontStyle);
    doc.setTextColor(0, 0, 0); // Reset to black
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { notes, videoTitle, videoId } = body;

        if (!notes) {
            return NextResponse.json(
                { error: 'Notes content is required' },
                { status: 400 }
            );
        }

        // Create PDF
        const doc = new jsPDF();

        // Add title page
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Study Notes', 20, 30);

        if (videoTitle) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            const titleLines = doc.splitTextToSize(videoTitle, 170);
            doc.text(titleLines, 20, 50);
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 80);
        doc.text(`Video ID: ${videoId || 'N/A'}`, 20, 90);

        // Add watermark to first page
        addWatermark(doc);

        // Add content starting from page 2 or continue on same page
        let startY = 110;
        if (startY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            startY = 20;
            addWatermark(doc);
        }

        // Parse and add the notes content
        parseMarkdownToPDF(doc, notes, startY);

        // Generate PDF as buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Create filename
        const sanitizedTitle = videoTitle
            ? videoTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50)
            : 'study_notes';
        const filename = `${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

        // Return PDF as downloadable file
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('PDF generation error:', error);

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
} 