"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Message = {
    id: string;
    role: string;
    content: string;
};

export default function DeepSearchInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMessage.content,
                    useDeepSearch: true // FORCE DEEP SEARCH
                }),
            });

            if (!res.ok) throw new Error("Failed to get answer");

            const data = await res.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.answer,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "assistant", content: "Error: Could not get response." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <div className="relative w-24 h-24 mb-6">
                            <Image
                                src="/assets/deep-search.png"
                                alt="Deep Search"
                                fill
                                className="object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse"
                            />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Deep Search Active</h3>
                        <p className="max-w-md text-gray-400">
                            Ask anything. I will search the live web for the most up-to-date information.
                        </p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl p-4 ${msg.role === "user"
                                ? "bg-blue-600/20 text-blue-100 border border-blue-500/30"
                                : "bg-white/5 text-gray-200 border border-white/10"
                                }`}
                        >
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 rounded-2xl p-4 text-gray-400 animate-pulse text-sm border border-white/5 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                            Searching the web...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-4 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search the web..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all font-semibold"
                    >
                        Search
                    </button>
                </div>
            </form>
        </div>
    );
}
