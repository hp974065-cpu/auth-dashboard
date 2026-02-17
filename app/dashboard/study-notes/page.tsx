"use client"

import { useState } from "react"
import { generateStudyNotesAction } from "./actions"

export default function StudyNotesPage() {
    const [notes, setNotes] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)
        setNotes(null)

        const formData = new FormData(event.currentTarget)
        try {
            const result = await generateStudyNotesAction(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setNotes(result.notes ?? null)
            }
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="study-notes-container">
            <h1>AI Study Notes 📝</h1>
            <p className="subtitle">Paste a YouTube video link to get instant study notes.</p>

            <form onSubmit={handleSubmit} className="study-notes-form">
                <input
                    type="url"
                    name="videoUrl"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    className="url-input"
                />
                <button type="submit" disabled={isLoading} className="generate-btn">
                    {isLoading ? "Generating..." : "Generate Notes ✨"}
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            {notes && (
                <div className="notes-result">
                    <h2>Study Notes</h2>
                    <div className="notes-content">
                        {notes.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
            )}

            <p style={{ marginTop: "2rem", color: "#666", fontSize: "0.8rem" }}>v1.7</p>
        </div>
    )
}
