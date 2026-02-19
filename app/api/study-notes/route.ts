import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { YoutubeTranscript } from "youtube-transcript";

export const runtime = 'nodejs';

// Allow up to 50MB uploads
export const maxDuration = 60;

function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = req.headers.get("content-type") || "";

        let transcript = "";
        let videoTitle = "";
        let source = "";

        if (contentType.includes("multipart/form-data")) {
            // Handle file upload (transcript file)
            const formData = await req.formData();
            const file = formData.get("file") as File | null;

            if (!file) {
                return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
            }

            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 });
            }

            transcript = await file.text();
            videoTitle = file.name.replace(/\.[^/.]+$/, "");
            source = "file_upload";
        } else {
            // Handle JSON body (YouTube URL or pasted transcript)
            const body = await req.json();
            const { url, pastedTranscript } = body;

            if (pastedTranscript) {
                // User pasted transcript directly
                transcript = pastedTranscript;
                videoTitle = "Pasted Transcript";
                source = "pasted";
            } else if (url) {
                // Fetch from YouTube
                const videoId = extractVideoId(url);
                if (!videoId) {
                    return NextResponse.json({ error: "Invalid YouTube URL. Please provide a valid link." }, { status: 400 });
                }

                videoTitle = `YouTube Video (${videoId})`;
                source = "youtube";

                try {
                    console.log(`Fetching transcript for video: ${videoId}`);
                    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

                    if (!transcriptItems || transcriptItems.length === 0) {
                        return NextResponse.json({
                            error: "No transcript available for this video. Try uploading a transcript file or pasting it manually.",
                            fallback: true
                        }, { status: 422 });
                    }

                    transcript = transcriptItems.map(item => item.text).join(" ");
                    console.log(`Transcript fetched: ${transcript.length} characters`);
                } catch (ytError: any) {
                    console.error("YouTube transcript fetch failed:", ytError.message);
                    return NextResponse.json({
                        error: "Could not fetch transcript. The video may be age-restricted, private, or have no captions. Try uploading a transcript file or pasting it manually.",
                        fallback: true
                    }, { status: 422 });
                }
            } else {
                return NextResponse.json({ error: "Please provide a YouTube URL, paste a transcript, or upload a file." }, { status: 400 });
            }
        }

        if (!transcript || transcript.trim().length < 20) {
            return NextResponse.json({ error: "Transcript is too short to generate study notes." }, { status: 400 });
        }

        // Truncate very long transcripts to avoid token limits
        const maxChars = 60000;
        const truncatedTranscript = transcript.length > maxChars
            ? transcript.slice(0, maxChars) + "\n\n[Transcript truncated due to length]"
            : transcript;

        // Generate study notes via AI
        const systemPrompt = `You are an expert study notes generator. Given a video transcript, create comprehensive, well-organized study notes.

Your output must follow this EXACT format:

## 📋 Summary
A concise 2-3 paragraph summary of the entire video content.

## 🔑 Key Points
- Bullet points of the most important takeaways
- Each point should be clear and actionable

## 📝 Detailed Study Notes
Organized by topic/section with headers. Include:
- Key concepts and definitions
- Important examples mentioned
- Any formulas, frameworks, or methodologies
- Quotes or notable statements

## 💡 Key Takeaways
1. Numbered list of the top 5-10 things to remember

## ❓ Review Questions
- Generate 5 questions that test understanding of the material

Be thorough, clear, and well-structured. Use markdown formatting.`;

        const openai = getOpenAIClient();
        let studyNotes: string;

        try {
            const response = await openai.chat.completions.create({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Generate study notes from this video transcript:\n\n${truncatedTranscript}` }
                ]
            });
            studyNotes = response.choices[0]?.message?.content || "Failed to generate study notes.";
        } catch (aiError: any) {
            console.error("AI study notes generation failed:", aiError.message);
            return NextResponse.json({ error: "AI model error: " + aiError.message }, { status: 502 });
        }

        return NextResponse.json({
            studyNotes,
            transcript: truncatedTranscript,
            videoTitle,
            source,
            transcriptLength: transcript.length,
        });
    } catch (error: any) {
        console.error("Study Notes API error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
    }
}
