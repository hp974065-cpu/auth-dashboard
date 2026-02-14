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

        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

        // Join transcript (limit length to avoid token limits if necessary, but 4o handle large context)
        // simplistic join
        const transcriptText = transcriptItems.map(item => item.text).join(" ").slice(0, 20000) // limit to ~20k chars (~5k tokens) to be safe + cost

        if (!transcriptText) {
            return { error: "No transcript found for this video. It might not have captions." }
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
        console.error("Error generating notes:", error)
        if (error.message?.includes("rendering")) {
            return { error: "Could not retrieve transcript. The video might have disabled captions." }
        }
        return { error: "An error occurred while generating notes. Please try again." }
    }
}
