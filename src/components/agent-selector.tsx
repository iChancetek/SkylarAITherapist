
"use client";

import { cn } from "@/lib/utils";
import { AGENTS, AgentId } from "@/ai/personas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface AgentSelectorProps {
    currentAgent: AgentId;
    onAgentChange: (agentId: AgentId) => void;
    className?: string;
}

export function AgentSelector({ currentAgent, onAgentChange, className }: AgentSelectorProps) {
    return (
        <div className={cn("flex gap-3 overflow-x-auto p-2 pb-4 scrollbar-none", className)}>
            {(Object.keys(AGENTS) as AgentId[]).map((agentId) => {
                const agent = AGENTS[agentId];
                const isActive = currentAgent === agentId;

                return (
                    <motion.button
                        key={agentId}
                        onClick={() => onAgentChange(agentId)}
                        className={cn(
                            "flex flex-col items-center gap-2 min-w-[72px] shrink-0 transition-all",
                            isActive ? "opacity-100 scale-105" : "opacity-60 hover:opacity-90 hover:scale-105"
                        )}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className={cn(
                            "relative rounded-full p-[2px] transition-all",
                            isActive ? "bg-gradient-to-br from-purple-500 to-blue-500" : "bg-transparent"
                        )}>
                            <Avatar className="h-14 w-14 border-2 border-background">
                                {/* 
                  In a real app, these would be mapped to specific image assets. 
                  For now, we use colorful gradients or placeholders.
                */}
                                <AvatarImage src={`/agents/${agentId}.jpg`} alt={agent.name} className="object-cover" />
                                <AvatarFallback className={cn(
                                    "text-xs font-bold text-white",
                                    agentId === 'skylar' ? "bg-purple-600" :
                                        agentId === 'chancellor' ? "bg-slate-700" :
                                            agentId === 'sydney' ? "bg-yellow-500" :
                                                agentId === 'hailey' ? "bg-pink-600" :
                                                    "bg-emerald-600"
                                )}>
                                    {agent.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            {isActive && (
                                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                            )}
                        </div>

                        <span className={cn(
                            "text-xs font-medium tracking-wide transition-colors",
                            isActive ? "text-white" : "text-white/60"
                        )}>
                            {agent.name}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}
