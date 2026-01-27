"use client";

import { useState } from "react";
import { AGENTS, AgentId } from "@/ai/personas";
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
                "fixed left-0 top-1/2 -translate-y-1/2 z-[100] flex flex-col transition-all duration-500 ease-out", // Increased z-index to 100
                isHovered ? "w-72" : "w-6" // Increased collapsed width trigger from w-2 to w-6
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Trigger Area (Invisible or minimal) */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-full cursor-pointer transition-opacity",
                isHovered ? "opacity-0" : "opacity-0 hover:bg-white/5" // kept invisible but check if user wants visual cue? "invisible" was requested.
            )} />

            {/* The Sidebar Content */}
            <div className={cn(
                "h-screen bg-background/90 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 transform origin-left",
                isHovered ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
            )}>
                <div className="h-full overflow-y-auto p-6 flex flex-col space-y-6">
                    <div className="text-center border-b border-white/10 pb-4">
                        <h3 className="text-lg font-bold text-white tracking-wide">Select Agent</h3>
                        <p className="text-xs text-white/40">Choose your companion</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {(Object.entries(AGENTS) as [AgentId, typeof AGENTS[AgentId]][]).map(([id, agent]) => {
                            const Icon = AGENT_ICONS[id] || User;
                            const isSelected = currentAgent === id;

                            return (
                                <button
                                    key={id}
                                    onClick={() => onAgentChange(id)}
                                    className={cn(
                                        "relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group text-left",
                                        isSelected
                                            ? "bg-white/10 border border-white/20 shadow-lg"
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                                        isSelected ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white" : "bg-white/5 text-white/50"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1">
                                        <p className={cn("font-medium text-sm transition-colors", isSelected ? "text-white" : "text-white/70 group-hover:text-white")}>
                                            {agent.name}
                                        </p>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                                            {agent.role}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
