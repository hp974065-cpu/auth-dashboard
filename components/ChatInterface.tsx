
"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
    id: string;
    role: string;
    content: string;
};

export default function ChatInterface({
    documentId,
    workspaceId,
    initialMessages = []
}: {
    documentId?: string;
    workspaceId?: string;
    initialMessages?: any[]
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [useDeepSearch, setUseDeepSearch] = useState(false);
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
                    documentId,
                    workspaceId,
                    useDeepSearch
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
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">
                    {workspaceId ? "Workspace Chat" : "Document Chat"}
                </h3>
                <label className="flex items-center text-xs text-gray-600 gap-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useDeepSearch}
                        onChange={(e) => setUseDeepSearch(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    Enable Web Search
                </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p>{workspaceId ? "Ask a question across all documents!" : "Ask a question about this document!"}</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg p-3 ${msg.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-800"
                                }`}
                        >
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 rounded-lg p-3 text-gray-500 animate-pulse text-sm">
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask something..."
                        className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
