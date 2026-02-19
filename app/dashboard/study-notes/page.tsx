"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type StudyNotesResult = {
    studyNotes: string;
    transcript: string;
    videoTitle: string;
    source: string;
    transcriptLength: number;
};

export default function StudyNotesPage() {
    const [url, setUrl] = useState("");
    const [pastedTranscript, setPastedTranscript] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<StudyNotesResult | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [activeTab, setActiveTab] = useState<"url" | "paste" | "upload">("url");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || loading) return;
        setError("");
        setResult(null);
        setLoading(true);
        setShowFallback(false);

        try {
            const res = await fetch("/api/study-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.fallback) {
                    setShowFallback(true);
                }
                throw new Error(data.error);
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate study notes.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pastedTranscript.trim() || loading) return;
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const res = await fetch("/api/study-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pastedTranscript }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate study notes.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || loading) return;

        if (file.size > 50 * 1024 * 1024) {
            setError("File too large. Maximum size is 50MB.");
            return;
        }

        setError("");
        setResult(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/study-notes", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate study notes.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="p-6 border-b border-white/10 bg-black/20 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer">
                        ←
                    </Link>
                    <div className="text-4xl">📚</div>
                    <div>
                        <h1 className="text-xl font-bold text-white" style={{ textShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
                            Study Notes Generator
                        </h1>
                        <p className="text-xs text-purple-400/80">YouTube → AI Study Notes</p>
                    </div>
                </div>
                <div className="text-xs text-gray-500 font-mono border border-white/10 px-3 py-1 rounded-full">
                    MODE: STUDY_NOTES
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-6">
                {/* Input Section */}
                {!result && (
                    <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => { setActiveTab("url"); setError(""); setShowFallback(false); }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === "url"
                                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                🔗 YouTube URL
                            </button>
                            <button
                                onClick={() => { setActiveTab("paste"); setError(""); setShowFallback(false); }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === "paste"
                                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                📋 Paste Transcript
                            </button>
                            <button
                                onClick={() => { setActiveTab("upload"); setError(""); setShowFallback(false); }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === "upload"
                                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                📁 Upload File (50MB)
                            </button>
                        </div>

                        {/* YouTube URL Tab */}
                        {activeTab === "url" && (
                            <form onSubmit={handleUrlSubmit}>
                                <label className="block text-sm text-gray-400 mb-2">Paste a YouTube video link</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                        disabled={loading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !url.trim()}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold cursor-pointer hover:shadow-lg hover:shadow-purple-500/20"
                                    >
                                        {loading ? "⏳ Generating..." : "📝 Generate Notes"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Paste Transcript Tab */}
                        {activeTab === "paste" && (
                            <form onSubmit={handlePasteSubmit}>
                                <label className="block text-sm text-gray-400 mb-2">Paste the video transcript text</label>
                                <textarea
                                    value={pastedTranscript}
                                    onChange={(e) => setPastedTranscript(e.target.value)}
                                    placeholder="Paste the full transcript here..."
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[200px] resize-y"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !pastedTranscript.trim()}
                                    className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold cursor-pointer hover:shadow-lg hover:shadow-purple-500/20"
                                >
                                    {loading ? "⏳ Generating..." : "📝 Generate Notes"}
                                </button>
                            </form>
                        )}

                        {/* Upload File Tab */}
                        {activeTab === "upload" && (
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Upload a transcript file (.txt, .srt, .vtt) — Max 50MB</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                                >
                                    <div className="text-4xl mb-3">📄</div>
                                    <p className="text-gray-400">Click to select a transcript file</p>
                                    <p className="text-xs text-gray-600 mt-2">Supports .txt, .srt, .vtt files up to 50MB</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.srt,.vtt,.text"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Fallback Suggestion */}
                        {showFallback && (
                            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                                💡 <strong>Tip:</strong> Switch to the{" "}
                                <button onClick={() => setActiveTab("paste")} className="underline cursor-pointer">Paste Transcript</button>{" "}
                                or{" "}
                                <button onClick={() => setActiveTab("upload")} className="underline cursor-pointer">Upload File</button>{" "}
                                tab to manually provide the transcript.
                            </div>
                        )}

                        {/* Loading Animation */}
                        {loading && (
                            <div className="mt-6 flex items-center gap-3 text-purple-400 animate-pulse">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                                <span className="ml-2">Fetching transcript & generating study notes...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="space-y-6">
                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white">{result.videoTitle}</h2>
                                <p className="text-xs text-gray-500">
                                    Source: {result.source} • Transcript: {(result.transcriptLength / 1000).toFixed(1)}k characters
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTranscript(!showTranscript)}
                                    className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    {showTranscript ? "📝 Hide Transcript" : "📄 Show Transcript"}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(result.studyNotes)}
                                    className="px-4 py-2 rounded-xl text-sm bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-all cursor-pointer"
                                >
                                    📋 Copy Notes
                                </button>
                                <button
                                    onClick={() => { setResult(null); setShowTranscript(false); }}
                                    className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    ✨ New
                                </button>
                            </div>
                        </div>

                        {/* Transcript Panel */}
                        {showTranscript && (
                            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 max-h-[400px] overflow-y-auto">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-gray-300">📄 Full Transcript</h3>
                                    <button
                                        onClick={() => copyToClipboard(result.transcript)}
                                        className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10 cursor-pointer"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <pre className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed font-sans">
                                    {result.transcript}
                                </pre>
                            </div>
                        )}

                        {/* Study Notes */}
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
                            <div
                                className="prose prose-invert prose-sm max-w-none study-notes-content"
                                dangerouslySetInnerHTML={{ __html: formatMarkdown(result.studyNotes) }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple markdown to HTML converter
function formatMarkdown(md: string): string {
    let html = md
        // Headers
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-purple-300 mt-6 mb-2">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-purple-200 mt-8 mb-3 pb-2 border-b border-white/10">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-4 mb-4">$1</h1>')
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Numbered lists
        .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-3 ml-4 mb-2"><span class="text-purple-400 font-bold">$1.</span><span class="text-gray-300">$2</span></div>')
        // Bullet points
        .replace(/^- (.+)$/gm, '<div class="flex gap-3 ml-4 mb-2"><span class="text-purple-400">•</span><span class="text-gray-300">$1</span></div>')
        // Line breaks
        .replace(/\n\n/g, '<div class="mb-4"></div>')
        .replace(/\n/g, '<br/>');

    return html;
}
