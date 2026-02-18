
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ workspaceId }: { workspaceId?: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);
        if (workspaceId) {
            formData.append("workspaceId", workspaceId);
        }

        try {
            const res = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            setFile(null);
            // Reset file input
            (document.getElementById("file-upload") as HTMLInputElement).value = "";
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                    Select PDF or Text File
                </label>
                <div className="flex gap-2">
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                    />
                    <button
                        type="submit"
                        disabled={!file || loading}
                        className="px-6 py-2 bg-green-600 text-white rounded font-medium disabled:opacity-50 hover:bg-green-700 transition"
                    >
                        {loading ? "Uploading..." : "Upload"}
                    </button>
                </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
    );
}
