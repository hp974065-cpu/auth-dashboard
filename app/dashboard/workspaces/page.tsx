
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Folder, Trash2 } from "lucide-react";

interface Workspace {
    id: string;
    title: string;
    createdAt: string;
    _count: {
        documents: number;
    };
}

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWorkspaceTitle, setNewWorkspaceTitle] = useState("");
    const router = useRouter();

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch("/api/workspaces");
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceTitle.trim()) return;

        try {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newWorkspaceTitle }),
            });

            if (res.ok) {
                setNewWorkspaceTitle("");
                setShowCreateModal(false);
                fetchWorkspaces();
            }
        } catch (error) {
            console.error("Failed to create workspace", error);
        }
    };

    const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        if (!confirm("Are you sure you want to delete this workspace?")) return;

        try {
            const res = await fetch(`/api/workspaces/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchWorkspaces();
            }
        } catch (error) {
            console.error("Failed to delete workspace", error);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
                    <p className="text-muted-foreground mt-1">Manage your document collections.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Workspace
                </Button>
            </div>

            {/* Create Modal (Simple inline for now) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Create Workspace</CardTitle>
                            <CardDescription>Give your new workspace a name.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateWorkspace} className="space-y-4">
                                <Input
                                    placeholder="e.g., Q3 Financial Reports"
                                    value={newWorkspaceTitle}
                                    onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                    <Button type="submit">Create</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : workspaces.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Folder className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-lg font-medium">No workspaces yet</h3>
                    <p className="text-gray-500">Create one to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {workspaces.map((workspace) => (
                        <Link href={`/dashboard/workspaces/${workspace.id}`} key={workspace.id}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-medium truncate pr-4">
                                        {workspace.title}
                                    </CardTitle>
                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{workspace._count.documents}</div>
                                    <p className="text-xs text-muted-foreground">Documents</p>
                                    <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
