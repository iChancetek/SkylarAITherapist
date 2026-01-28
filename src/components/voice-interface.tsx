
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserPreferences } from "@/lib/user-preferences";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Settings, Mic, User, Brain, AlertTriangle, Loader2, MessageSquare, X, RefreshCw, Keyboard, Square, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { getSpokenResponse } from "@/ai/flows/get-spoken-response";
import { getTextResponse } from "@/ai/flows/get-text-response";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/lib/auth";
import { saveSessionMemory, extractSessionSummary } from "@/lib/session-memory";
import { usePersistedState } from "@/hooks/use-persisted-state";

import { AgentSidebar } from "@/components/agent-sidebar";
import { UserMenu } from "@/components/user-menu";
import { AgentId, AGENTS } from "@/ai/personas";

// --- Type Definitions for Web Speech API & Legacy Audio Context ---

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}


interface ChatMessage {
  id: string;
  speaker: "user" | "system" | string;
  text: string;
  icon?: React.ElementType;
}

export default function VoiceInterface() {
  // Persistent State
  const [sessionStarted, setSessionStarted, isSessionStartedHydrated, clearSessionStarted] = usePersistedState('iskylar_session_started', false);
  const [chatHistory, setChatHistory, isChatHistoryHydrated, clearChatHistory] = usePersistedState<ChatMessage[]>('iskylar_chat_history', []);
  const [sessionState, setSessionState, isSessionStateHydrated, clearSessionState] = usePersistedState<string | undefined>('iskylar_session_state', undefined);

  // Preferences
  const { preferences, incrementUsage, isDailyLimitReached, remainingMinutes } = useUserPreferences();
  const { user, userProfile } = useAuthContext();

  // Ephemeral State
  const [currentAgent, setCurrentAgent] = useState<AgentId>('skylar');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isVoiceQuotaReached, setIsVoiceQuotaReached] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [isFirstSession, setIsFirstSession] = useState(true);
  const sessionStartTimeRef = useRef<number>(0);

  const isHydrated = isSessionStartedHydrated && isChatHistoryHydrated && isSessionStateHydrated;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const language = preferences.voiceLanguage;

  // Session Duration Timer
  useEffect(() => {
    if (!sessionStarted || !sessionStartTimeRef.current) return;

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - sessionStartTimeRef.current) / 1000;
      const limitSec = preferences.defaultDuration * 60;

      // Soft ending logic or warning could go here
      // For now, we rely on the user or the AI to wrap up, but we could enforce a hard limit if desired.
      // The prompt says "Soft reminders only, No abrupt cutoffs". 
      // We will just let the user know if they exceed significantly? 
      // Or maybe just let the AI handle it via context injection (user has 5 mins left).
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionStarted, preferences.defaultDuration]);


  const initializeAudioContext = useCallback(() => {
    if (window.AudioContext || window.webkitAudioContext) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } else {
      toast({ title: "Browser Not Supported", description: "Web Audio API is not available.", variant: "destructive" });
    }
  }, [toast]);

  const handleSessionEnd = useCallback(async () => {
    if (user && sessionState && sessionStartTimeRef.current) {
      const durationSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const summary = extractSessionSummary(sessionState);

      // usage tracking (round up to nearest minute)
      incrementUsage(Math.ceil(durationSec / 60));

      const transcript = chatHistory.map(msg => {
        const parts = msg.id.split('-');
        const timestamp = parseInt(parts[parts.length - 1]) || Date.now();
        return {
          speaker: msg.speaker,
          text: msg.text,
          timestamp
        };
      });

      try {
        await saveSessionMemory(user.uid, {
          ...summary,
          duration: durationSec,
          transcript
        });
      } catch (error) {
        console.error('Failed to save session memory:', error);
      }
    }

    // Clear persistent state on proper session end
    clearSessionStarted();
    setChatHistory(prev => [...prev, { id: 'system-end', speaker: 'system', text: 'Session ended.', icon: Brain }]);
    clearSessionState();

    setShowChat(false);
    sessionStartTimeRef.current = 0;
  }, [sessionState, user, clearSessionStarted, clearSessionState, setChatHistory, incrementUsage, chatHistory]);

  const playAudio = useCallback(async (audioDataUri: string, sessionShouldEnd: boolean = false) => {
    // Check preference
    if (!preferences.voiceEnabled) {
      if (sessionShouldEnd) await handleSessionEnd();
      return;
    }

    if (!audioDataUri) {
      if (sessionShouldEnd) {
        await handleSessionEnd();
      }
      return;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
    }

    if (!audioContextRef.current) {
      // toast({ title: "Audio Error", description: "Audio system not ready.", variant: "destructive" });
      return; // Silent fail or retry?
    }

    setIsSpeaking(true);

    try {
      const response = await fetch(audioDataUri);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      sourceNodeRef.current = source;

      source.onended = () => {
        if (sourceNodeRef.current === source) {
          setIsSpeaking(false);
          sourceNodeRef.current = null;
          if (sessionShouldEnd) {
            handleSessionEnd();
          }
        }
      };

      source.start(0);

    } catch (e) {
      console.error("Audio playback error:", e);
      // toast({ title: "Playback Error", description: "Could not play the voice.", variant: "destructive" });
      setIsSpeaking(false);
    }
  }, [toast, handleSessionEnd, preferences.voiceEnabled]);

  const handleTextOnlyResponse = useCallback(async (userInput: string) => {
    try {
      // Pass the current agent to the text response flow
      const textResponse = await getTextResponse({
        userInput,
        sessionState,
        language,
        agentId: currentAgent,
        userId: user?.uid
      });

      setSessionState(textResponse.updatedSessionState);

      const message: ChatMessage = {
        id: `${textResponse.isSafetyResponse ? 'safety' : currentAgent}-${Date.now()}`,
        speaker: textResponse.isSafetyResponse ? "system" : AGENTS[currentAgent].name as any,
        text: textResponse.responseText,
        icon: textResponse.isSafetyResponse ? AlertTriangle : Brain
      };
      setChatHistory(prev => [...prev, message]);


      if (textResponse.sessionShouldEnd) {
        await handleSessionEnd();
      }
    } catch (fallbackError) {
      console.error("Error during text-only fallback:", fallbackError);
      toast({ title: "AI Error", description: "Could not get a text response from iSkylar.", variant: "destructive" });
    }
  }, [sessionState, toast, language, handleSessionEnd]);

  const handleSendMessage = useCallback(async (userInput: string, interrupted: boolean = false) => {
    const finalUserInput = userInput.trim();
    if (!finalUserInput || !sessionStarted) return;

    setIsSending(true);
    setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, speaker: "user", text: finalUserInput, icon: User }]);

    // Pass preferences to AI for context awareness if needed? 
    // For now we just use language.

    if (isVoiceQuotaReached) {
      await handleTextOnlyResponse(finalUserInput);
      setIsSending(false);
      return;
    }

    try {
      const response = await getSpokenResponse({
        userInput: finalUserInput,
        sessionState,
        language, // Use preference language
        wasInterrupted: interrupted,
        interruptedDuring: interrupted ? currentResponse : undefined,
        agentId: currentAgent,
        agentId: currentAgent,
        userId: user?.uid
      });

      if (response.error) {
        throw new Error(response.error);
      }
      setSessionState(response.updatedSessionState);

      const message: ChatMessage = {
        id: `${response.isSafetyResponse ? 'safety' : currentAgent}-${Date.now()}`,
        speaker: response.isSafetyResponse ? "system" : AGENTS[currentAgent].name as any, // Cast to match ChatMessage string literal or update type
        text: response.responseText,
        icon: response.isSafetyResponse ? AlertTriangle : Brain
      };
      setChatHistory(prev => [...prev, message]);
      setCurrentResponse(response.responseText);
      setWasInterrupted(false);

      await playAudio(response.audioDataUri, response.sessionShouldEnd);

    } catch (error: any) {
      console.error("Error sending message:", error);

      const isQuotaError = error.message && (error.message.includes("429") || error.message.includes("quota"));

      if (isQuotaError) {
        console.warn("Voice quota reached. Switching to text-only responses.");
        setIsVoiceQuotaReached(true);
        toast({
          title: "Voice Limit Reached",
          description: "Switching to text-only responses.",
          variant: "destructive"
        });
        await handleTextOnlyResponse(finalUserInput);
      } else {
        toast({ title: "AI Error", description: "Could not get a response.", variant: "destructive" });
      }
    } finally {
      setIsSending(false);
    }
  }, [sessionState, toast, sessionStarted, playAudio, isVoiceQuotaReached, handleTextOnlyResponse, language, currentResponse, user, currentAgent]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Browser Not Supported", description: "Your browser does not support the Web Speech API.", variant: "destructive" });
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    // IMPORTANT: Use the language from preferences
    recognition.lang = preferences.voiceLanguage;

    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'no-speech' || event.error === 'aborted') { return; }
      const errorMsg = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? "Microphone access denied."
        : `Voice recognition error: ${event.error}`;
      // toast({ title: "Voice Error", description: errorMsg, variant: "destructive" });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) handleSendMessage(transcript);
    };

    recognition.start();
  }, [toast, handleSendMessage, isListening, preferences.voiceLanguage]);

  // Resume session / Autostart logic
  // ... (keep existing useEffects largely same, just updated deps if needed)
  useEffect(() => {
    if (isHydrated && sessionStarted) {
      // setShowChat(true); // Don't force show chat on resume, respect user action? 
      // ACTUALLY: "Live transcription (when enabled)"
      if (preferences.transcriptionEnabled) {
        setShowChat(true);
      }
    }
  }, [isHydrated, sessionStarted, preferences.transcriptionEnabled]);

  useEffect(() => {
    const shouldBeListening = sessionStarted && !isSpeaking && !isSending && !isInitializing && !isListening;
    if (shouldBeListening) {
      startListening();
    }
  }, [sessionStarted, isSpeaking, isSending, isListening, startListening, isInitializing]);

  const handleStartSession = useCallback(async () => {
    if (isDailyLimitReached) {
      toast({ title: "Daily Limit Reached", description: "You have used your 20 minutes for today. Take a rest and come back tomorrow!", variant: "destructive" });
      return;
    }

    initializeAudioContext();

    setIsInitializing(true);
    clearChatHistory();
    if (preferences.transcriptionEnabled) setShowChat(true);
    setSessionStarted(true);
    sessionStartTimeRef.current = Date.now();

    const startSessionWithRetry = async (attempts = 1): Promise<any> => {
      try {
        return await getSpokenResponse({
          userInput: "ISKYLAR_SESSION_START",
          sessionState: undefined,
          language,
          agentId: currentAgent,
          userId: user?.uid
        });
      } catch (error) {
        if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return startSessionWithRetry(attempts - 1);
        }
        throw error;
      }
    };

    try {
      const response = await startSessionWithRetry();

      if (response.error) {
        throw new Error(response.error);
      }

      setSessionState(response.updatedSessionState);

      const greetingMessage: ChatMessage = {
        id: `${currentAgent}-greeting-${Date.now()}`,
        speaker: AGENTS[currentAgent].name,
        text: response.responseText,
        icon: Brain
      };
      setChatHistory([greetingMessage]);

      if (isFirstSession) {
        setTimeout(() => {
          toast({
            title: "💡 Pro Tip",
            description: "Tap the orange button to interrupt me.",
            duration: 5000,
          });
          setIsFirstSession(false);
        }, 3000);
      }

      await playAudio(response.audioDataUri, response.sessionShouldEnd);
    } catch (error: any) {
      console.error("Failed to start session:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to start session. Please try again.",
        variant: "destructive"
      });
      setSessionStarted(false);
    } finally {
      setIsInitializing(false);
    }
  }, [toast, playAudio, handleTextOnlyResponse, initializeAudioContext, language, isDailyLimitReached, preferences.transcriptionEnabled, user, currentAgent]);

  const handleMicClick = useCallback(() => {
    initializeAudioContext();
    if (isSpeaking && sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
    }
    if (!isListening) {
      startListening();
    }
  }, [isSpeaking, isListening, startListening, initializeAudioContext]);

  const handleInterrupt = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
    }
    setIsSpeaking(false);
    setWasInterrupted(true);
    toast({ title: "I'm listening.", duration: 1500 });
    if (!isListening) startListening();
  }, [startListening, isListening, toast]);

  // Auto-scroll logic
  useEffect(() => {
    if (preferences.autoScroll && chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory, preferences.autoScroll]);

  // Clean up
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch (e) { } }
      if (audioContextRef.current) { audioContextRef.current.close(); }
    };
  }, []);

  const getStatusText = () => {
    if (!sessionStarted && !isInitializing) return "Click 'Start Session' to begin.";
    if (isInitializing) return "Contacting iSkylar...";
    if (isSending) return "Thinking...";
    if (isSpeaking) return "Speaking...";
    if (isListening) return "Listening...";
    return "Ready.";
  }

  return (
    <div className="relative flex flex-col h-full min-h-screen w-full items-center justify-between overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* Settings Entry Point & User Menu - Top Right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <SettingsDialog onResumeSession={(session) => {
          const resumedHistory: ChatMessage[] = session.transcript.map((t: any, i: number) => ({
            id: `resumed-${i}-${t.timestamp}`,
            speaker: t.speaker === 'system' ? 'system' : t.speaker === 'user' ? 'user' : 'iSkylar',
            text: t.text,
            icon: t.speaker === 'user' ? User : Brain
          }));
          setChatHistory(resumedHistory);
          setSessionStarted(true);
          toast({ title: "Session Resumed", description: "Context loaded from history." });
        }}>
          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-full w-10 h-10">
            <Settings className="w-5 h-5" />
          </Button>
        </SettingsDialog>
        <UserMenu />
      </div>

      {/* Ambient light effects (Unchanged) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Agent Sidebar (Left) */}
      <AgentSidebar
        currentAgent={currentAgent}
        onAgentChange={(id) => {
          setCurrentAgent(id);
          toast({ title: `Switched to ${AGENTS[id].name}`, description: AGENTS[id].role });
        }}
      />

      {/* Header (Simplified/Unchanged) */}
      <div className="relative z-10 flex flex-col w-full max-w-4xl mx-auto p-6 flex-grow justify-start">
        <header className="w-full flex flex-col items-center text-center pt-12 pb-8">
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl glow-purple breathe">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/50 animate-ping"></div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-6xl font-bold tracking-tight gradient-text">iSkylar</h1>
          </div>
          <p className="text-lg text-white/80 font-medium tracking-wide">Your AI Voice Therapist</p>
        </header>
      </div>

      {/* Main interaction area */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6 flex-shrink-0 mb-12">
        <footer className="w-full flex flex-col items-center justify-center space-y-6">
          {!sessionStarted ? (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleStartSession}
                disabled={isInitializing}
                size="lg"
                className="relative group h-16 px-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-2xl glow-purple transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                {isInitializing && <Loader2 className="mr-3 h-6 w-6 animate-spin" />}
                <span className="relative z-10">{isInitializing ? "Connecting..." : "Start Session"}</span>
              </Button>
              {isDailyLimitReached && <p className="text-red-400 text-sm">Daily limit reached</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {isSpeaking && (
                <Button onClick={handleInterrupt} size="sm" className="relative px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-lg animate-pulse border-0">
                  <span className="relative z-10">⚡ Interrupt</span>
                </Button>
              )}
              {/* Controls */}
              <div className="flex items-center gap-6 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all duration-300"
                  onClick={() => setIsTextMode(!isTextMode)}
                >
                  <Keyboard className="h-6 w-6" />
                </Button>

                <div className="relative group">
                  <div
                    className={cn(
                      "absolute -inset-1 rounded-full blur opacity-40 transition-all duration-1000 group-hover:opacity-75",
                      isSpeaking ? "bg-primary animate-pulse" : "bg-white"
                    )}
                  />
                  <Button
                    size="lg"
                    className={cn(
                      "relative h-20 w-20 rounded-full shadow-xl transition-all duration-300 border-4 border-white/10",
                      isSpeaking
                        ? "bg-amber-500 hover:bg-amber-600 animate-pulse"
                        : "bg-gradient-to-tr from-indigo-500 to-purple-600 hover:scale-105"
                    )}
                    onClick={handleMicClick}
                  >
                    {isSpeaking ? (
                      <Square className="h-8 w-8 text-white fill-current" />
                    ) : (
                      <Mic className="h-8 w-8 text-white" />
                    )}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-100 backdrop-blur-md transition-all duration-300"
                  onClick={handleEndSession}
                  title="End Session"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="glass-dark px-6 py-3 rounded-full">
                <p className="text-white font-medium text-center flex items-center gap-2">{getStatusText()}</p>
              </div>
            </div>
          )}
        </footer>
      </div>

      {/* Chat / Transcription History (Embedded below interface) */}
      {(preferences.transcriptionEnabled || (!sessionStarted && chatHistory.length > 0)) && (
        <div className="w-full max-w-3xl mx-auto px-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-black/40 backdrop-blur-sm rounded-3xl p-6 border border-white/5 shadow-2xl space-y-6" ref={chatHistoryRef}>
            {chatHistory.length === 0 && (
              <div className="text-center text-white/40 italic py-8">
                Conversation transcript will appear here...
              </div>
            )}
            {chatHistory.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col gap-2", msg.speaker === 'user' ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 opacity-60 text-xs uppercase font-bold tracking-wider text-white/70 px-1">
                  {msg.speaker === 'iSkylar' ? (
                    <>
                      <Brain className="w-3 h-3 text-purple-400" />
                      <span>iSkylar</span>
                    </>
                  ) : (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3 text-blue-400" />
                    </>
                  )}
                </div>
                <div
                  className={cn(
                    "px-5 py-3 text-base leading-relaxed max-w-[85%]",
                    msg.speaker === 'user'
                      ? "bg-blue-600/20 text-blue-50 border border-blue-500/30 rounded-2xl rounded-tr-sm"
                      : "bg-purple-600/20 text-purple-50 border border-purple-500/30 rounded-2xl rounded-tl-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-start gap-2 animate-pulse">
                <div className="bg-purple-600/10 p-3 rounded-2xl rounded-tl-sm border border-purple-500/20">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animation-delay-200" />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animation-delay-400" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* We removed the full screen detailed chat history toggle button from the main UI 
          to satisfy "No settings icons floating in view" / "Minimal". 
          But "Live transcription" implies seeing what is being said NOW. 
          The overlay above serves that purpose cleanly.
      */}

    </div >
  );
}

