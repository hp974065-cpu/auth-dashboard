
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Send, Upload, Globe, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Document {
    id: string;
    title: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export default function WorkspaceDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [workspace, setWorkspace] = useState<any>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [useDeepSearch, setUseDeepSearch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) fetchWorkspace();
    }, [id]);

    const fetchWorkspace = async () => {
        try {
            const res = await fetch(`/api/workspaces/${id}`);
            if (res.ok) {
                const data = await res.json();
                setWorkspace(data);
                setDocuments(data.documents || []);
                setMessages(data.messages || []);
                scrollToBottom();
            }
        } catch (error) {
            console.error("Failed to fetch workspace", error);
        }
    };

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMsg.content,
                    workspaceId: id,
                    useDeepSearch
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: data.answer }]);
            }
        } catch (error) {
            console.error("Chat failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const file = files[0]; // TODO: Support multiple at once loop
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", id);

        try {
            const res = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                fetchWorkspace(); // Refresh list
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (!workspace) return <div className="p-8">Loading...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar - Document List */}
            <div className="w-80 border-r bg-gray-50/40 p-4 flex flex-col">
                <div className="mb-4">
                    <h2 className="font-semibold text-lg truncate" title={workspace.title}>{workspace.title}</h2>
                    <p className="text-xs text-muted-foreground">{documents.length} documents</p>
                </div>

                <Button variant="outline" className="mb-4 w-full justify-start" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />

                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <div key={doc.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 text-sm">
                                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="truncate">{doc.title}</span>
                            </div>
                        ))}
                        {documents.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                                No documents yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="pt-4 border-t mt-2">
                    <div className="flex items-center space-x-2">
                        <Switch id="deep-search" checked={useDeepSearch} onCheckedChange={setUseDeepSearch} />
                        <Label htmlFor="deep-search" className="flex items-center cursor-pointer">
                            <Globe className="h-4 w-4 mr-2 text-indigo-500" />
                            Deep Search Mode
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Enable to allow AI to search the web for answers not in your documents.
                    </p>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <h3 className="text-xl font-semibold mb-2">Workspace Chat</h3>
                                <p>Ask questions across all {documents.length} documents.</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg p-3 flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={useDeepSearch ? "Ask a question (Docs + Web Search)..." : "Ask a question about your documents..."}
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
