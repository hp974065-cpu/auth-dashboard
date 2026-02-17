"use server"

import OpenAI from "openai"
import { z } from "zod"
import YtDlpWrap from 'yt-dlp-exec';
import fs from 'fs';
import path from 'path';

const generateStudyNotesSchema = z.object({
    videoUrl: z.string().url({ message: "Please enter a valid URL" }),
})

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
    try {
        const urlObj = new URL(url)
        if (urlObj.hostname.includes("youtube.com")) {
            return urlObj.searchParams.get("v") || null
        } else if (urlObj.hostname.includes("youtu.be")) {
            return urlObj.pathname.slice(1).split("?")[0] || null
        }
    } catch {
        return null
    }
    return null
}

// Production: Call Python Serverless Function
async function startVercelPythonTranscript(videoUrl: string): Promise<string | null> {
    console.log(`[Study Notes] Calling Python API for ${videoUrl}`);
    try {
        // Construct full URL. VERCEL_URL is provided by Vercel
        // If testing locally with 'vercel dev', it might be localhost:3000
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const apiUrl = `${host}/api/py-transcript?url=${encodeURIComponent(videoUrl)}`;

        console.log(`[Study Notes] Fetching ${apiUrl}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                // Optional: Add a secret if you want to protect this endpoint
            }
        });

        if (!response.ok) {
            console.error(`[Study Notes] Python API failed: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error(`[Study Notes] Error details: ${errorText}`);
            return null;
        }

        const data = await response.json();
        return data.transcript || null;

    } catch (e: any) {
        console.error(`[Study Notes] Exception calling Python API: ${e.message}`);
        return null;
    }
}

// Development: Run yt-dlp locally via Node wrapper
async function tryYtDlpLocal(url: string): Promise<string | null> {
    console.log(`[Study Notes] Attempting local yt-dlp execution for ${url}`);

    // Create a unique temporary file path for the transcript
    const tempId = Math.random().toString(36).substring(7);
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    // Base filename without extension
    const outputBase = `transcript-${tempId}`;
    const outputPath = path.join(tempDir, outputBase);

    try {
        await YtDlpWrap(url, {
            writeAutoSub: true,
            writeSub: true, // Try manual subs too
            skipDownload: true,
            subLang: 'en,en-US,en-orig', // Prefer English
            output: outputPath,
            noWarnings: true,
            noCheckCertificate: true,
            // noCheckCertificate: true, // Duplicate key issue fixed in thought process, handled by exec
        });

        // Find the generated VTT file
        const files = fs.readdirSync(tempDir);
        // Look for files starting with our base name and ending in .vtt
        const vttFile = files.find(f => f.startsWith(outputBase) && f.endsWith('.vtt'));

        if (vttFile) {
            const fullPath = path.join(tempDir, vttFile);
            console.log(`[Study Notes] yt-dlp success. Reading file: ${vttFile}`);
            const content = fs.readFileSync(fullPath, 'utf-8');

            // Cleanup
            try {
                fs.unlinkSync(fullPath);
            } catch (e) {
                console.warn("Failed to cleanup temp file", e);
            }

            return cleanVtt(content);
        } else {
            console.warn(`[Study Notes] yt-dlp did not create a VTT file. Checked in ${tempDir}`);
            return null;
        }
    } catch (e: any) {
        console.error(`[Study Notes] yt-dlp error: ${e.message}`);
    }
    return null;
}

function cleanVtt(vttContent: string): string {
    // Basic VTT cleanup
    const lines = vttContent.split('\n');
    const cleanedLines = lines.filter(line => {
        // Filter out metadata, timestamps, and empty lines
        return !line.startsWith('WEBVTT') &&
            !line.startsWith('NOTE') &&
            !line.includes('-->') &&
            line.trim() !== '' &&
            !/^\d+$/.test(line.trim()); // Filter out index numbers
    });

    // Remove duplicates (captions often repeat) and join
    // Using a Set to remove exact duplicate lines
    return [...new Set(cleanedLines)].join(' ').slice(0, 15000); // Increased limit as yt-dlp is accurate
}


export async function generateStudyNotesAction(formData: FormData) {
    const videoUrl = formData.get("videoUrl") as string

    // 1. Validate URL
    const result = generateStudyNotesSchema.safeParse({ videoUrl })
    if (!result.success) {
        return { error: result.error.issues[0].message }
    }

    // 2. Check OpenAI Key
    const apiKey = process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_BASE_URL

    if (!apiKey) {
        return { error: "OpenAI API Key is missing. Please add it to your .env file." }
    }

    // 3. Extract video ID
    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
        return { error: "Could not extract video ID. Please use a valid YouTube URL." }
    }

    // 4. Fetch Transcript via yt-dlp
    // Use the provided URL directly if valid, or reconstruct it
    console.log(`[Study Notes v2.1] Fetching transcript for: ${videoId} using yt-dlp`)

    let transcript: string | null = null;
    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // DETECT ENVIRONMENT
    // Vercel sets NODE_ENV=production. local dev sets NODE_ENV=development
    const isProduction = process.env.NODE_ENV === 'production';

    try {
        if (isProduction) {
            transcript = await startVercelPythonTranscript(fullUrl);
        } else {
            transcript = await tryYtDlpLocal(fullUrl);
        }
    } catch (e) {
        console.error("Critical error in tryYtDlp", e);
    }

    if (!transcript) {
        console.log("[Study Notes] ❌ yt-dlp failed")
        return {
            error: "Could not retrieve transcript. Please ensure the video has English captions (auto-generated or manual)."
        }
    }

    console.log(`[Study Notes] ✅ Transcript retrieved (${transcript.length} chars)`);

    // 5. Generate Notes with OpenAI
    try {
        const openai = new OpenAI({
            apiKey,
            baseURL: baseURL || undefined,
        })

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 2000,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI tutor. Create concise, structured study notes from this video transcript. Use Markdown: headers, bold concepts, bullet points.",
                },
                {
                    role: "user",
                    content: `Summarize into study notes:\n\n${transcript}`,
                },
            ],
        })

        const notes = response.choices[0].message.content
        console.log(`[Study Notes] ✅ Notes generated`)
        return { notes }
    } catch (error: any) {
        console.error("[Study Notes] OpenAI error:", error.message)
        return { error: `AI generation failed: ${error.message}` }
    }
}
