"use client";

import DeepSearchInterface from "@/components/DeepSearchInterface";
import Link from "next/link";
import Image from "next/image";

export default function DeepSearchPage() {

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <header className="p-6 border-b border-white/10 bg-black/20 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        ←
                    </Link>
                    <div className="relative w-10 h-10">
                        <Image
                            src="/assets/deep-search.png"
                            alt="Deep Search"
                            fill
                            className="object-contain drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                        />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white neon-text">Deep Search Console</h1>
                        <p className="text-xs text-blue-400/80">Live Web Access • Powered by Firecrawl</p>
                    </div>
                </div>
                <div className="text-xs text-gray-500 font-mono border border-white/10 px-3 py-1 rounded-full">
                    MODE: GLOBAL_SEARCH
                </div>
            </header>

            <div className="p-6" style={{ height: "calc(100vh - 100px)" }}>
                <div className="h-full max-w-5xl mx-auto">
                    <DeepSearchInterface />
                </div>
            </div>
        </div>
    );
}
