"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useUserPreferences, LanguageCode, SessionDuration } from "@/lib/user-preferences";
import { useAuthContext } from "@/lib/auth";
import { Settings, User, Monitor, Clock, Mic, Languages, Shield, LogOut, Check, History, MessageSquare, Calendar } from "lucide-react";
import { getAllUserMemories, getSessionDetails, SessionMemory } from '@/lib/session-memory';

export function SettingsDialog({ children, onResumeSession }: { children: React.ReactNode, onResumeSession?: (session: SessionMemory) => void }) {
    const { preferences, updatePreferences, remainingMinutes } = useUserPreferences();
    const { user, handleLogout } = useFirebaseAuthOps();
    const [open, setOpen] = useState(false);

    const handleResumeWrapper = (session: SessionMemory) => {
        if (onResumeSession) {
            onResumeSession(session);
            setOpen(false); // Close dialog
        }
    };




    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-black/60 backdrop-blur-3xl border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden h-[85vh] p-0 flex flex-col">
                {/* Close / Save Bar (Mobile/Desktop friendly) */}
                <div className="absolute top-4 right-4 z-50">
                    <Button
                        onClick={async () => {
                            try {
                                await useUserPreferences().savePreferences();
                            } catch (e) {
                                console.error("Save failed", e);
                            } finally {
                                setOpen(false);
                            }
                        }}
                        className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-md"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Save & Exit
                    </Button>
                </div>
                <Tabs defaultValue="account" className="flex w-full h-full">
                    {/* Sidebar */}
                    <div className="w-64 bg-white/5 border-r border-white/5 flex flex-col p-6 space-y-6">
                        <div className="flex items-center gap-3 px-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                                <Settings className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight">Settings</span>
                        </div>

                        <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0 w-full">
                            <SettingsTabTrigger value="account" icon={User} label="Profile" />
                            <SettingsTabTrigger value="appearance" icon={Monitor} label="Appearance" />
                            <SettingsTabTrigger value="voice" icon={Mic} label="Voice & Audio" />
                            <SettingsTabTrigger value="language" icon={Languages} label="Language" />
                            <SettingsTabTrigger value="history" icon={History} label="Memory & History" />
                            <SettingsTabTrigger value="privacy" icon={Shield} label="Privacy & Security" />
                        </TabsList>

                        <div className="mt-auto px-2">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-purple-300" />
                                    <span className="text-xs font-medium text-purple-200">Daily Limit</span>
                                </div>
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                        style={{ width: `${Math.min(100, (preferences.dailyUsageMinutes / 20) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-white/50">{remainingMinutes} mins left today</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-transparent p-8">
                        {/* Account Tab */}
                        <TabsContent value="account" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Profile</h2>
                                <p className="text-white/50">Manage your identity and account settings.</p>
                            </header>

                            <div className="grid gap-6">
                                <section className="space-y-4">
                                    <Label>Display Name</Label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                        placeholder="How should iSkylar call you?"
                                        value={preferences.userName}
                                        onChange={(e) => updatePreferences({ userName: e.target.value })}
                                    />
                                </section>

                                <div className="pt-8 border-t border-white/5">
                                    <Button
                                        variant="destructive"
                                        onClick={handleLogout}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Appearance Tab */}
                        <TabsContent value="appearance" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Appearance</h2>
                                <p className="text-white/50">Customize the look and feel of your experience.</p>
                            </header>

                            <div className="grid gap-4">
                                <Label className="text-lg">Theme</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['light', 'dark', 'system'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => updatePreferences({ theme: t as any })}
                                            className={`p-4 rounded-xl border transition-all ${preferences.theme === t
                                                ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                                        >
                                            <span className="capitalize font-medium">{t}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Voice Tab */}
                        <TabsContent value="voice" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Voice & Audio</h2>
                                <p className="text-white/50">Configure voice synthesis and recognition.</p>
                            </header>

                            <div className="space-y-6">
                                <SettingToggle
                                    label="Voice Output"
                                    description="Hear agents speak responses aloud."
                                    checked={preferences.voiceEnabled}
                                    onCheckedChange={(c: boolean) => updatePreferences({ voiceEnabled: c })}
                                />
                                <SettingToggle
                                    label="Live Transcription"
                                    description="See real-time text captions during conversation."
                                    checked={preferences.transcriptionEnabled}
                                    onCheckedChange={(c: boolean) => updatePreferences({ transcriptionEnabled: c })}
                                />
                                <SettingToggle
                                    label="Auto-Scroll"
                                    description="Automatically follow the conversation flow."
                                    checked={preferences.autoScroll}
                                    onCheckedChange={(c: boolean) => updatePreferences({ autoScroll: c })}
                                    disabled={!preferences.transcriptionEnabled}
                                />
                            </div>
                        </TabsContent>

                        {/* Language Tab */}
                        <TabsContent value="language" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Language</h2>
                                <p className="text-white/50">iSkylar speaks many languages fluently.</p>
                            </header>

                            <div className="grid gap-6">
                                <div className="space-y-3">
                                    <Label>Speaking Language</Label>
                                    <LanguageSelector
                                        value={preferences.voiceLanguage}
                                        onChange={(val) => updatePreferences({ voiceLanguage: val })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label>Reading Language</Label>
                                    <LanguageSelector
                                        value={preferences.textLanguage}
                                        onChange={(val) => updatePreferences({ textLanguage: val })}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* History Tab (New!) */}
                        <TabsContent value="history" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Memory & History</h2>
                                <p className="text-white/50">Review your past sessions and what iSkylar remembers.</p>
                            </header>

                            <HistoryView userId={user?.uid} />
                        </TabsContent>

                        {/* Privacy Tab */}
                        <TabsContent value="privacy" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                            <header>
                                <h2 className="text-3xl font-light mb-2">Privacy</h2>
                                <p className="text-white/50">Your data is secure and private.</p>
                            </header>

                            <div className="space-y-4">
                                <Button variant="outline" className="w-full justify-between h-14 px-6 border-white/10 hover:bg-white/5 hover:text-white">
                                    <span>Download My Data</span>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded">JSON</span>
                                </Button>
                                <Button variant="outline" className="w-full justify-between h-14 px-6 border-red-500/20 text-red-300 hover:bg-red-500/10">
                                    <span>Delete All History</span>
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Sub-components


import { ScrollArea } from '@/components/ui/scroll-area';


function HistoryView({ userId }: { userId: string | undefined }) {
    const [memories, setMemories] = useState<SessionMemory[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMemory, setSelectedMemory] = useState<SessionMemory | null>(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        getAllUserMemories(userId)
            .then(m => {
                setMemories(m);
            })
            .catch(err => {
                console.error("Failed to load memories", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [userId]);

    const formatDate = (ts: any) => {
        try {
            if (!ts) return 'Unknown Date';
            if (typeof ts === 'string') return new Date(ts).toLocaleDateString();
            if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString();
            if (ts instanceof Date) return ts.toLocaleDateString();
            // Fallback for seconds/nanoseconds object from Firestore if not automatically converted
            if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
            return 'Unknown Date';
        } catch (e) {
            console.error("Date formatting error", e);
            return 'Error';
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-white/50 space-y-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin"></div>
            <p>Loading your journey...</p>
        </div>
    );

    if (selectedMemory) {
        return (
            <div className="h-full flex flex-col animate-in slide-in-from-right-4">
                <Button variant="ghost" onClick={() => setSelectedMemory(null)} className="self-start mb-4 text-white/50 hover:text-white pl-0">
                    ← Back to List
                </Button>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold mb-2">Session Transcript</h3>
                    <p className="text-sm text-white/50 mb-4">{formatDate(selectedMemory.timestamp)}</p>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                            {selectedMemory.keyInsights.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-purple-300 mb-2">Key Insights</h4>
                                    <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                                        {selectedMemory.keyInsights.map((k, i) => <li key={i}>{k}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                <p className="text-purple-200 mb-3">Want to continue this conversation?</p>
                                <Button className="bg-purple-600 hover:bg-purple-500 text-white border-0 w-full" onClick={() => {
                                    // Todo: Implement resume logic via callback
                                    alert("Resume feature coming in next step!");
                                }}>
                                    Resume Session
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {memories.length === 0 && !loading && (
                <div className="text-center py-12 text-white/50">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No past sessions found.</p>
                </div>
            )}
            {memories.map(m => (
                <button
                    key={m.sessionId}
                    onClick={() => setSelectedMemory(m)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-300">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                                {m.keyInsights[0] || "Therapy Session"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(m.timestamp)}</span>
                                <span>•</span>
                                <span>{Math.ceil(m.duration / 60)} mins</span>
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}


// Helper Components

function SectionHeader({ title, description }: { title: string, description: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <p className="text-sm text-white/50">{description}</p>
        </div>
    );
}

function SettingsTabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
    return (
        <TabsTrigger
            value={value}
            className="w-full justify-start px-3 py-2 text-sm text-white/60 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-l-2 data-[state=active]:border-purple-500 rounded-none transition-all"
        >
            <Icon className="w-4 h-4 mr-3" />
            {label}
        </TabsTrigger>
    );
}

function SettingToggle({ label, description, checked, onCheckedChange, disabled }: any) {
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 ${disabled ? 'opacity-50' : ''}`}>
            <div className="space-y-0.5">
                <Label className="text-base">{label}</Label>
                <p className="text-xs text-white/50">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        </div>
    );
}

function LanguageSelector({ value, onChange }: { value: LanguageCode, onChange: (val: LanguageCode) => void }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[140px] bg-white/10 border-white/10 text-white">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="en">English (en)</SelectItem>
                <SelectItem value="es">Español (es)</SelectItem>
                <SelectItem value="zh">Mandarin (zh)</SelectItem>
                <SelectItem value="fr">Français (fr)</SelectItem>
                <SelectItem value="ar">Arabic (ar)</SelectItem>
            </SelectContent>
        </Select>
    );
}


// Mock hook for auth ops since real usage might vary in simple comp
function useFirebaseAuthOps() {
    const { user } = useAuthContext();
    return { user, handleLogout: () => window.location.href = '/login' };
}
