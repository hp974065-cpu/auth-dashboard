"use server"

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

// Parse transcript XML - supports both <text> and <p><s> formats
function parseTranscriptXml(xml: string): string {
    let transcript = ""

    // Format 1: <text start="..." dur="...">content</text>
    const textMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g)
    for (const match of textMatches) {
        transcript += match[1] + " "
    }

    // Format 2: <p><s>content</s></p> (used by Android client)
    if (!transcript.trim()) {
        const segMatches = xml.matchAll(/<s[^>]*>(.*?)<\/s>/g)
        for (const match of segMatches) {
            if (match[1].trim()) {
                transcript += match[1] + " "
            }
        }
    }

    return transcript
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

// Method 1: youtube-transcript library (fastest when it works)
async function tryYoutubeTranscript(videoId: string): Promise<string | null> {
    try {
        const { YoutubeTranscript } = await import("youtube-transcript")
        const items = await YoutubeTranscript.fetchTranscript(videoId)
        if (!items || items.length === 0) return null
        const text = items.map(item => item.text).join(" ").slice(0, 8000)
        return text || null
    } catch {
        return null
    }
}

// Method 2: Android InnerTube API (most reliable - bypasses most restrictions)
async function tryAndroidInnerTube(videoId: string): Promise<string | null> {
    try {
        const playerResponse = await fetch(
            "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
                    "X-YouTube-Client-Name": "3",
                    "X-YouTube-Client-Version": "19.09.37",
                },
                body: JSON.stringify({
                    videoId,
                    context: {
                        client: {
                            clientName: "ANDROID",
                            clientVersion: "19.09.37",
                            androidSdkVersion: 34,
                            hl: "en",
                            gl: "US",
                            userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
                        },
                    },
                    contentCheckOk: true,
                    racyCheckOk: true,
                }),
            }
        )

        const playerData = await playerResponse.json()
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks

        if (!captionTracks || captionTracks.length === 0) return null

        const track = captionTracks.find((t: any) => t.languageCode === "en") || captionTracks[0]
        if (!track?.baseUrl) return null

        const transcriptResponse = await fetch(track.baseUrl, {
            headers: {
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
            },
        })
        const xml = await transcriptResponse.text()
        if (!xml || xml.length === 0) return null

        const transcript = parseTranscriptXml(xml)
        return transcript.length > 0 ? transcript.slice(0, 8000) : null
    } catch {
        return null
    }
}

// Method 3: HTML scraping with cookie consent bypass
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

        // Fetch with Android user-agent (more reliable for getting caption content)
        const transcriptResponse = await fetch(track.baseUrl, {
            headers: {
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
            },
        })
        const xml = await transcriptResponse.text()
        if (!xml || xml.length === 0) return null

        const transcript = parseTranscriptXml(xml)
        return transcript.length > 0 ? transcript.slice(0, 8000) : null
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
    console.log(`[Study Notes v1.7] Fetching transcript for: ${videoId}`)

    let transcript: string | null = null
    let methodUsed = ""

    // Method 1: youtube-transcript library
    console.log("[Study Notes] Method 1: youtube-transcript library...")
    transcript = await tryYoutubeTranscript(videoId)
    if (transcript) {
        methodUsed = "youtube-transcript"
        console.log(`[Study Notes] ✅ Method 1 succeeded (${transcript.length} chars)`)
    }

    // Method 2: Android InnerTube API (most reliable)
    if (!transcript) {
        console.log("[Study Notes] Method 2: Android InnerTube API...")
        transcript = await tryAndroidInnerTube(videoId)
        if (transcript) {
            methodUsed = "android-innertube"
            console.log(`[Study Notes] ✅ Method 2 succeeded (${transcript.length} chars)`)
        }
    }

    // Method 3: HTML scraping
    if (!transcript) {
        console.log("[Study Notes] Method 3: HTML scraping fallback...")
        transcript = await tryHTMLScraping(videoId)
        if (transcript) {
            methodUsed = "html-scraping"
            console.log(`[Study Notes] ✅ Method 3 succeeded (${transcript.length} chars)`)
        }
    }

    if (!transcript) {
        console.log("[Study Notes] ❌ All methods failed")
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
        console.log(`[Study Notes] ✅ Notes generated via ${methodUsed}`)
        return { notes }
    } catch (error: any) {
        console.error("[Study Notes] OpenAI error:", error.message)
        return { error: `AI generation failed: ${error.message}` }
    }
}
