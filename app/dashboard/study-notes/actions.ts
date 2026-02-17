"use server"

import { YoutubeTranscript } from "youtube-transcript"
import OpenAI from "openai"
import { z } from "zod"

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

// Method 1: youtube-transcript library
async function tryYoutubeTranscript(videoId: string): Promise<string | null> {
    try {
        const items = await YoutubeTranscript.fetchTranscript(videoId)
        if (!items || items.length === 0) return null
        const text = items.map(item => item.text).join(" ").slice(0, 20000)
        return text || null
    } catch {
        return null
    }
}

// Method 2: YouTube InnerTube API (bypasses some restrictions)
async function tryInnerTubeAPI(videoId: string): Promise<string | null> {
    try {
        // Step 1: Get player data via InnerTube API
        const playerResponse = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                videoId: videoId,
                context: {
                    client: {
                        clientName: "WEB",
                        clientVersion: "2.20240101.00.00",
                        hl: "en",
                    },
                },
            }),
        })

        const playerData = await playerResponse.json()
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks

        if (!captionTracks || captionTracks.length === 0) return null

        // Prefer English
        const track = captionTracks.find((t: any) => t.languageCode === "en") || captionTracks[0]
        if (!track?.baseUrl) return null

        // Step 2: Fetch the transcript XML
        const transcriptResponse = await fetch(track.baseUrl)
        const xml = await transcriptResponse.text()

        // Step 3: Parse XML to extract text
        const textMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g)
        let transcript = ""
        for (const match of textMatches) {
            transcript += match[1] + " "
        }

        // Decode HTML entities
        transcript = transcript
            .replace(/&amp;/g, "&")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\n/g, " ")
            .trim()

        return transcript.length > 0 ? transcript.slice(0, 20000) : null
    } catch {
        return null
    }
}

// Method 3: HTML scraping (original fallback)
async function tryHTMLScraping(videoId: string): Promise<string | null> {
    try {
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": "CONSENT=YES+1",
            },
        })
        const html = await pageResponse.text()

        const match = html.match(/"captionTracks":(\[.*?\])/)
        if (!match) return null

        const captionTracks = JSON.parse(match[1])
        const track = captionTracks.find((t: any) => t.languageCode === "en") || captionTracks[0]
        if (!track?.baseUrl) return null

        const transcriptResponse = await fetch(track.baseUrl)
        const xml = await transcriptResponse.text()

        const textMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g)
        let transcript = ""
        for (const match of textMatches) {
            transcript += match[1] + " "
        }

        transcript = transcript
            .replace(/&amp;/g, "&")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\n/g, " ")
            .trim()

        return transcript.length > 0 ? transcript.slice(0, 20000) : null
    } catch {
        return null
    }
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

    // 4. Try all transcript methods in order
    console.log(`[Study Notes] Trying transcript for video: ${videoId}`)

    let transcript: string | null = null
    let methodUsed = ""

    // Method 1: youtube-transcript library
    console.log("[Study Notes] Method 1: youtube-transcript library...")
    transcript = await tryYoutubeTranscript(videoId)
    if (transcript) {
        methodUsed = "youtube-transcript"
        console.log(`[Study Notes] ✅ Method 1 succeeded (${transcript.length} chars)`)
    }

    // Method 2: InnerTube API
    if (!transcript) {
        console.log("[Study Notes] Method 2: InnerTube API...")
        transcript = await tryInnerTubeAPI(videoId)
        if (transcript) {
            methodUsed = "innertube-api"
            console.log(`[Study Notes] ✅ Method 2 succeeded (${transcript.length} chars)`)
        }
    }

    // Method 3: HTML scraping
    if (!transcript) {
        console.log("[Study Notes] Method 3: HTML scraping...")
        transcript = await tryHTMLScraping(videoId)
        if (transcript) {
            methodUsed = "html-scraping"
            console.log(`[Study Notes] ✅ Method 3 succeeded (${transcript.length} chars)`)
        }
    }

    if (!transcript) {
        return {
            error: "Could not retrieve transcript for this video. This can happen if:\n• The video has no captions/subtitles\n• The video is age-restricted or private\n• YouTube is blocking automated access\n\nPlease try a different video with captions enabled."
        }
    }

    // 5. Generate Notes with OpenAI
    try {
        const openai = new OpenAI({
            apiKey,
            baseURL: baseURL || undefined,
        })

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI tutor. Your goal is to create clean, structured study notes from video transcripts. Use Markdown formatting: headers, bold concepts, bullet points. Keep it concise but comprehensive.",
                },
                {
                    role: "user",
                    content: `Here is the transcript of a video. Please summarize it into study notes:\n\n${transcript}`,
                },
            ],
        })

        const notes = response.choices[0].message.content
        console.log(`[Study Notes] ✅ Notes generated via ${methodUsed}`)
        return { notes }
    } catch (error: any) {
        console.error("[Study Notes] OpenAI error:", error.message)
        return { error: `AI generation failed: ${error.message}` }
    }
}
