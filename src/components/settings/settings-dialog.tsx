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
import { Settings, User, Monitor, Clock, Mic, Languages, Shield, LogOut, Check } from "lucide-react";

export function SettingsDialog({ children }: { children: React.ReactNode }) {
    const { preferences, updatePreferences, remainingMinutes } = useUserPreferences();
    const { preferences, updatePreferences, remainingMinutes } = useUserPreferences();
    const { user, handleLogout } = useFirebaseAuthOps(); // Need access to logout
    const [open, setOpen] = useState(false);

    // Local state for immediate feedback inside dialog if needed, 
    // but using global state directly for "Changes apply instantly" requirement.

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-black/80 backdrop-blur-xl border-white/10 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
                    <DialogTitle className="text-xl font-light tracking-wide flex items-center gap-2">
                        <Settings className="w-5 h-5 text-white/60" />
                        iSkylar Settings
                    </DialogTitle>
                    <DialogDescription className="text-white/40">
                        Customize your therapeutic environment.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="account" className="flex h-full">
                        <div className="w-48 bg-white/5 border-r border-white/10 p-4 space-y-2">
                            <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0">
                                <SettingsTabTrigger value="account" icon={User} label="Account" />
                                <SettingsTabTrigger value="appearance" icon={Monitor} label="Appearance" />
                                <SettingsTabTrigger value="session" icon={Clock} label="Session" />
                                <SettingsTabTrigger value="voice" icon={Mic} label="Voice & Text" />
                                <SettingsTabTrigger value="language" icon={Languages} label="Language" />
                                <SettingsTabTrigger value="privacy" icon={Shield} label="Privacy" />
                            </TabsList>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto bg-black/20">
                            {/* Account Tab */}
                            <TabsContent value="account" className="space-y-6 mt-0">
                                <SectionHeader title="Your Account" description="Manage your identity settings." />

                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>User Name</Label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Your Name"
                                                value={preferences.userName}
                                                onChange={(e) => updatePreferences({ userName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <Button
                                            variant="destructive"
                                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                            onClick={() => window.location.href = '/login'} // Fallback logout
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Sign Out
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Appearance Tab */}
                            <TabsContent value="appearance" className="space-y-6 mt-0">
                                <SectionHeader title="Appearance" description="Review how iSkylar looks on your device." />

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                    <div className="space-y-1">
                                        <Label className="text-base">Color Theme</Label>
                                        <p className="text-xs text-white/50">Switch between Light, Dark, or System Sync.</p>
                                    </div>
                                    <Select
                                        value={preferences.theme}
                                        onValueChange={(val: any) => updatePreferences({ theme: val })}
                                    >
                                        <SelectTrigger className="w-[140px] bg-white/10 border-white/10 text-white">
                                            <SelectValue placeholder="Select theme" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>

                            {/* Session Tab */}
                            <TabsContent value="session" className="space-y-6 mt-0">
                                <SectionHeader title="Session Preferences" description="Configure your daily therapy limits." />

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label>Default Session Length</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[10, 15, 20].map((mins) => (
                                                <Button
                                                    key={mins}
                                                    variant={preferences.defaultDuration === mins ? "default" : "outline"}
                                                    className={preferences.defaultDuration === mins
                                                        ? "bg-purple-600 hover:bg-purple-500 border-0"
                                                        : "bg-transparent border-white/10 hover:bg-white/5 text-white/70"}
                                                    onClick={() => updatePreferences({ defaultDuration: mins as SessionDuration })}
                                                >
                                                    {mins} mins
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label>Daily Usage</Label>
                                            <span className="text-sm text-purple-300 font-mono">{remainingMinutes} mins remaining</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                                                style={{ width: `${Math.min(100, (preferences.dailyUsageMinutes / 20) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-white/40">
                                            iSkylar limits sessions to 20 minutes per day to ensure healthy engagement.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Voice & Text Tab */}
                            <TabsContent value="voice" className="space-y-6 mt-0">
                                <SectionHeader title="Voice & Text" description="Control how iSkylar communicates." />

                                <div className="space-y-4">
                                    <SettingToggle
                                        label="Enable Voice"
                                        description="Hear iSkylar speak responses aloud."
                                        checked={preferences.voiceEnabled}
                                        onCheckedChange={(c: boolean) => updatePreferences({ voiceEnabled: c })}
                                    />
                                    <SettingToggle
                                        label="Enable Transcription"
                                        description="Show text captions while iSkylar speaks."
                                        checked={preferences.transcriptionEnabled}
                                        onCheckedChange={(c: boolean) => updatePreferences({ transcriptionEnabled: c })}
                                    />
                                    <SettingToggle
                                        label="Auto-Scroll Transcription"
                                        description="Automatically scroll to the newest text."
                                        checked={preferences.autoScroll}
                                        onCheckedChange={(c: boolean) => updatePreferences({ autoScroll: c })}
                                        disabled={!preferences.transcriptionEnabled}
                                    />
                                </div>
                            </TabsContent>

                            {/* Language Tab */}
                            <TabsContent value="language" className="space-y-6 mt-0">
                                <SectionHeader title="Language" description="Choose your preferred language for voice and text." />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <Label>Voice Language</Label>
                                        <LanguageSelector
                                            value={preferences.voiceLanguage}
                                            onChange={(val) => updatePreferences({ voiceLanguage: val })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <Label>Text Language</Label>
                                        <LanguageSelector
                                            value={preferences.textLanguage}
                                            onChange={(val) => updatePreferences({ textLanguage: val })}
                                        />
                                    </div>

                                    <p className="text-xs text-center text-white/40 italic mt-4">
                                        *Changes apply instantly. iSkylar will adapt naturally.*
                                    </p>
                                </div>
                            </TabsContent>

                            {/* Privacy Tab */}
                            <TabsContent value="privacy" className="space-y-6 mt-0">
                                <SectionHeader title="Privacy & Data" description="Manage your local session data." />

                                <div className="space-y-3">
                                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-white">
                                        Download Session Transcripts
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-white">
                                        Clear Local Data
                                    </Button>
                                </div>
                            </TabsContent>

                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="p-4 border-t border-white/10 bg-white/5 sm:justify-between items-center">
                    <span className="text-xs text-white/30 hidden sm:block">v1.2.0 • Secure Session</span>
                    <Button onClick={() => setOpen(false)} className="bg-white text-black hover:bg-white/90 shadow-md transform hover:scale-105 transition-all">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
