"use server"

import { YoutubeTranscript } from "youtube-transcript"
import OpenAI from "openai"
import { z } from "zod"

const generateStudyNotesSchema = z.object({
    videoUrl: z.string().url({ message: "Please enter a valid URL" }),
})

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

    const openai = new OpenAI({
        apiKey,
        baseURL: baseURL || undefined
    })

    try {
        // 3. Fetch Transcript
        // extract video ID from URL effectively
        let videoId = ""
        try {
            const urlObj = new URL(videoUrl)
            if (urlObj.hostname.includes("youtube.com")) {
                videoId = urlObj.searchParams.get("v") || ""
            } else if (urlObj.hostname.includes("youtu.be")) {
                videoId = urlObj.pathname.slice(1)
            }
        } catch (e) {
            return { error: "Invalid YouTube URL format." }
        }

        if (!videoId) {
            return { error: "Could not extract video ID." }
        }

        // Try standard YoutubeTranscript first
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error("YoutubeTranscript returned empty array")
        }

        // Join transcript (limit length to avoid token limits if necessary, but 4o handle large context)
        // simplistic join
        const transcriptText = transcriptItems.map(item => item.text).join(" ").slice(0, 20000) // limit to ~20k chars (~5k tokens) to be safe + cost

        if (!transcriptText) {
            throw new Error("Transcript text is empty")
        }

        // 4. Generate Notes with OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI tutor. Your goal is to create clean, structured study notes from video transcripts. Use Markdown formatting: headers, bold concepts, bullet points. Keep it concise but comprehensive.",
                },
                {
                    role: "user",
                    content: `Here is the transcript of a video. Please summarize it into study notes:\n\n${transcriptText}`,
                },
            ],
        })

        const notes = response.choices[0].message.content

        return { notes }

    } catch (error: any) {
        console.error("YoutubeTranscript failed, trying manual fallback...", error.message)
        try {
            // Manual Fallback
            // Fake a browser User-Agent to avoid some blocks
            const pageResponse = await fetch(videoUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
                }
            })
            const html = await pageResponse.text()

            if (html.includes("Sign in to confirm your age")) {
                throw new Error("Video is age-restricted. Please try a different video.")
            }
            if (html.includes("Sign in")) { // Broader check
                // Check if it's just the header sign in (common) vs content sign in.
                // The "captionTracks" check below will ultimately fail if we can't see the video, 
                // but checking for explicit blocking text helps.
            }

            const match = html.match(/"captionTracks":(\[.*?\])/)
            if (!match) {
                if (html.includes("Sign in")) {
                    throw new Error("Video requires sign-in (Age Restricted?). Try another video.")
                }
                throw new Error("Could not find captionTracks in HTML")
            }

            const captionTracks = JSON.parse(match[1])
            // Prefer English, otherwise take the first one
            const track = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0]

            if (!track || !track.baseUrl) {
                throw new Error("No valid caption track found")
            }

            // Fetch the XML transcript
            const transcriptResponse = await fetch(track.baseUrl)
            const transcriptXml = await transcriptResponse.text()

            // Simple regex to extract text from XML
            // <text start="0.2" dur="3.4">Hello world</text>
            const textMatches = transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/g)
            let manualTranscript = ""
            for (const match of textMatches) {
                manualTranscript += match[1] + " "
            }
            // Decode HTML entities (basic)
            manualTranscript = manualTranscript.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')

            if (!manualTranscript) {
                throw new Error("Failed to parse transcript XML")
            }

            // Generate notes with Manual Transcript
            const manualOpenAI = new OpenAI({
                apiKey,
                baseURL: baseURL || undefined
            })

            const manualResponse = await manualOpenAI.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful AI tutor. Your goal is to create clean, structured study notes from video transcripts. Use Markdown formatting: headers, bold concepts, bullet points. Keep it concise but comprehensive.",
                    },
                    {
                        role: "user",
                        content: `Here is the transcript of a video. Please summarize it into study notes:\n\n${manualTranscript.slice(0, 20000)}`,
                    },
                ],
            })

            const notes = manualResponse.choices[0].message.content
            return { notes }

        } catch (manualError: any) {
            console.error("Manual fallback failed:", manualError)
            return { error: `Error: ${error.message}. Fallback failed: ${manualError.message}` }
        }
    }
}
