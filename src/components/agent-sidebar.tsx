"use client";

import { useState } from "react";
import { AGENTS, AgentId } from "@/ai/agent-config";
import { cn } from "@/lib/utils";
import { Brain, Sparkles, User, Heart, Zap, Coffee } from "lucide-react";

interface AgentSidebarProps {
    currentAgent: AgentId;
    onAgentChange: (id: AgentId) => void;
}

// Map agent IDs to icons for a richer visual
const AGENT_ICONS: Record<string, any> = {
    skylar: Brain,
    chancellor: Zap,
    sydney: Sparkles,
    hailey: Heart,
    chris: Coffee,
};

export function AgentSidebar({ currentAgent, onAgentChange }: AgentSidebarProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cn(
                "fixed left-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col transition-all duration-700 ease-out",
                isHovered ? "w-80" : "w-12 h-96" // Initial "sliver" state
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Floating Glass Blade */}
            <div className={cn(
                "relative h-full flex flex-col overflow-hidden transition-all duration-700 ease-out",
                // Glassmorphism Base
                "backdrop-blur-3xl bg-black/40 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
                // Shape & Size
                isHovered ? "rounded-[2rem] w-full max-h-[80vh]" : "rounded-full w-2 max-h-48 my-auto opacity-50 hover:opacity-100 hover:w-3" // Collapsed is just a tiny indicator
            )}>

                {/* Expanded Content */}
                <div className={cn(
                    "flex flex-col h-full w-80 p-6 space-y-8 transition-opacity duration-500 delay-100",
                    isHovered ? "opacity-100" : "opacity-0 pointer-events-none absolute"
                )}>
                    {/* Header */}
                    <div className="text-center space-y-1 pt-2">
                        <h3 className="text-sm font-medium text-white/90 tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                            Companion
                        </h3>
                    </div>

                    {/* Agent List */}
                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {(Object.entries(AGENTS) as [AgentId, typeof AGENTS[AgentId]][]).map(([id, agent]) => {
                            const Icon = AGENT_ICONS[id] || User;
                            const isSelected = currentAgent === id;

                            return (
                                <button
                                    key={id}
                                    onClick={() => onAgentChange(id)}
                                    className={cn(
                                        "group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 text-left overflow-hidden",
                                        isSelected
                                            ? "bg-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border border-white/10"
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    {/* Active Glow Background */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-50" />
                                    )}

                                    {/* Icon Container */}
                                    <div className={cn(
                                        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                        isSelected
                                            ? "bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-110"
                                            : "bg-white/5 text-white/40 group-hover:text-white/80 group-hover:scale-105"
                                    )}>
                                        <Icon className="w-5 h-5 relative z-10" />
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex-1 relative z-10">
                                        <p className={cn(
                                            "font-medium text-sm tracking-wide transition-colors duration-300",
                                            isSelected ? "text-white" : "text-white/60 group-hover:text-white"
                                        )}>
                                            {agent.name}
                                        </p>
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mt-0.5">
                                            {agent.role}
                                        </p>
                                    </div>

                                    {/* Active Dot */}
                                    {isSelected && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Collapsed State Visual Cue (Vertical Pill) */}
                {!isHovered && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-50">
                        <div className="w-1 h-12 bg-white/20 rounded-full" />
                    </div>
                )}
            </div>
        </div>
    );
}
