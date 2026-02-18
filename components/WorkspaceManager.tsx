
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Workspace = {
    id: string;
    title: string;
    _count?: { documents: number };
};

export default function WorkspaceManager({
    workspaces,
    activeWorkspaceId
}: {
    workspaces: Workspace[],
    activeWorkspaceId?: string
}) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id) {
            router.push(`/dashboard/documents?workspaceId=${id}`);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
            });

            if (res.ok) {
                const workspace = await res.json();
                setNewTitle("");
                setIsCreating(false);
                router.push(`/dashboard/documents?workspaceId=${workspace.id}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to create workspace", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active Workspace
                </label>
                <div className="flex gap-2">
                    <select
                        value={activeWorkspaceId || ""}
                        onChange={handleSelect}
                        className="block w-64 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                    >
                        <option value="" disabled>Select a workspace</option>
                        {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>
                                {ws.title} ({ws._count?.documents || 0} docs)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                {isCreating ? (
                    <form onSubmit={handleCreate} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Workspace Name"
                            className="border rounded px-2 py-1 text-sm"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="text-gray-500 text-sm hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
                    >
                        + New Workspace
                    </button>
                )}
            </div>
        </div>
    );
}
