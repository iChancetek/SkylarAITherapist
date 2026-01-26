
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Loader2, MessageSquare, X, RefreshCw } from "lucide-react";
import { getSpokenResponse } from "@/ai/flows/get-spoken-response";
import { getTextResponse } from "@/ai/flows/get-text-response";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/lib/auth";
import { saveSessionMemory, extractSessionSummary } from "@/lib/session-memory";
import { usePersistedState } from "@/hooks/use-persisted-state";

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
  speaker: "user" | "iSkylar" | "system";
  text: string;
  icon?: React.ElementType;
}

export default function VoiceInterface() {
  // Persistent State
  const [sessionStarted, setSessionStarted, isSessionStartedHydrated, clearSessionStarted] = usePersistedState('iskylar_session_started', false);
  const [chatHistory, setChatHistory, isChatHistoryHydrated, clearChatHistory] = usePersistedState<ChatMessage[]>('iskylar_chat_history', []);
  const [sessionState, setSessionState, isSessionStateHydrated, clearSessionState] = usePersistedState<string | undefined>('iskylar_session_state', undefined);

  // Ephemeral State
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

  const { user, userProfile } = useAuthContext();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const language = userProfile?.language || 'en';
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
      const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000); // seconds
      const summary = extractSessionSummary(sessionState);

      try {
        await saveSessionMemory(user.uid, {
          ...summary,
          duration,
        });
      } catch (error) {
        console.error('Failed to save session memory:', error);
      }
    }

    // Clear persistent state on proper session end
    clearSessionStarted();
    setChatHistory(prev => [...prev, { id: 'system-end', speaker: 'system', text: 'Session ended.', icon: Brain }]);
    // We keep history visible for review, but "end" the active session flag.
    // clearChatHistory(); // Optional: decided to keep history visible until new session
    clearSessionState();

    setShowChat(false);
    sessionStartTimeRef.current = 0;
  }, [sessionState, user, clearSessionStarted, clearSessionState, setChatHistory]);

  const playAudio = useCallback(async (audioDataUri: string, sessionShouldEnd: boolean = false) => {
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
      toast({ title: "Audio Error", description: "Audio system not ready. Please tap a button to enable it.", variant: "destructive" });
      return;
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
      toast({ title: "Playback Error", description: "Could not play the voice.", variant: "destructive" });
      setIsSpeaking(false);
    }
  }, [toast, handleSessionEnd]);

  const handleTextOnlyResponse = useCallback(async (userInput: string) => {
    try {
      const textResponse = await getTextResponse({ userInput, sessionState, language });
      setSessionState(textResponse.updatedSessionState);

      const message: ChatMessage = {
        id: `${textResponse.isSafetyResponse ? 'safety' : 'iskylar'}-${Date.now()}`,
        speaker: textResponse.isSafetyResponse ? "system" : "iSkylar",
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

    if (isVoiceQuotaReached) {
      await handleTextOnlyResponse(finalUserInput);
      setIsSending(false);
      return;
    }

    try {
      const response = await getSpokenResponse({
        userInput: finalUserInput,
        sessionState,
        language,
        wasInterrupted: interrupted,
        interruptedDuring: interrupted ? currentResponse : undefined
      });
      setSessionState(response.updatedSessionState);

      const message: ChatMessage = {
        id: `${response.isSafetyResponse ? 'safety' : 'iskylar'}-${Date.now()}`,
        speaker: response.isSafetyResponse ? "system" : "iSkylar",
        text: response.responseText,
        icon: response.isSafetyResponse ? AlertTriangle : Brain
      };
      setChatHistory(prev => [...prev, message]);
      setCurrentResponse(response.responseText); // Track current response
      setWasInterrupted(false); // Reset interruption flag

      await playAudio(response.audioDataUri, response.sessionShouldEnd);

    } catch (error: any) {
      console.error("Error sending message:", error);

      const isQuotaError = error.message && (error.message.includes("429") || error.message.includes("quota"));

      if (isQuotaError) {
        console.warn("Voice quota reached. Switching to text-only responses.");
        setIsVoiceQuotaReached(true);
        toast({
          title: "Voice Limit Reached",
          description: "The daily limit for voice generation has been reached. Switching to text-only responses for now.",
          variant: "destructive"
        });
        await handleTextOnlyResponse(finalUserInput);
      } else {
        toast({ title: "AI Error", description: "Could not get a response from iSkylar.", variant: "destructive" });
      }
    } finally {
      setIsSending(false);
    }
  }, [sessionState, toast, sessionStarted, playAudio, isVoiceQuotaReached, handleTextOnlyResponse, language, currentResponse]);

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
    recognition.lang = language;
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
      toast({ title: "Voice Error", description: errorMsg, variant: "destructive" });
      if (errorMsg.includes("denied")) setSessionStarted(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) handleSendMessage(transcript);
    };

    recognition.start();
  }, [toast, handleSendMessage, isListening, language]);

  // Resume session on hydration if active
  useEffect(() => {
    if (isHydrated && sessionStarted) {
      setShowChat(true);
      // Optional: Add a "Resumed" system message or toast
      // toast({ title: "Session Resumed", description: "Welcome back." });
    }
  }, [isHydrated, sessionStarted]);

  useEffect(() => {
    const shouldBeListening = sessionStarted && !isSpeaking && !isSending && !isInitializing && !isListening;
    if (shouldBeListening) {
      startListening();
    }
  }, [sessionStarted, isSpeaking, isSending, isListening, startListening, isInitializing]);

  const handleStartSession = useCallback(async () => {
    initializeAudioContext();

    setIsInitializing(true);
    setIsInitializing(true);
    clearChatHistory(); // Clear previous history on NEW session
    setShowChat(true);
    setSessionStarted(true);
    sessionStartTimeRef.current = Date.now(); // Track session start time

    const startSessionWithRetry = async (attempts = 1): Promise<any> => {
      try {
        return await getSpokenResponse({ userInput: "ISKYLAR_SESSION_START", sessionState: undefined, language });
      } catch (error) {
        if (attempts > 0) {
          console.warn("Session start failed, retrying in 1.5s (Cold Start Protection)...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          return startSessionWithRetry(attempts - 1);
        }
        throw error;
      }
    };

    try {
      const response = await startSessionWithRetry();
      setSessionState(response.updatedSessionState);

      const greetingMessage: ChatMessage = {
        id: `iskylar-greeting-${Date.now()}`,
        speaker: "iSkylar",
        text: response.responseText,
        icon: Brain
      };
      setChatHistory([greetingMessage]);

      // Show first-session hint about interruption
      if (isFirstSession) {
        setTimeout(() => {
          toast({
            title: "💡 Pro Tip",
            description: "You can interrupt me at any time while I'm speaking—just tap the orange button!",
            duration: 5000,
          });
          setIsFirstSession(false);
        }, 3000); // Show hint 3 seconds after greeting
      }

      await playAudio(response.audioDataUri, response.sessionShouldEnd);
    } catch (error) {
      const isQuotaError = error.message && (error.message.includes("429") || error.message.includes("quota"));
      if (isQuotaError) {
        console.warn("Voice quota reached on session start. Switching to text-only mode.");
        setIsVoiceQuotaReached(true);
        toast({
          title: "Voice Limit Reached",
          description: "The daily limit for voice generation has been reached. Starting in text-only mode.",
          variant: "destructive"
        });
        await handleTextOnlyResponse("ISKYLAR_SESSION_START");
      } else {
        console.error("Error during session initiation:", error);
        toast({ title: "AI Error", description: "Could not start session.", variant: "destructive" });
        setSessionStarted(false);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [toast, playAudio, handleTextOnlyResponse, initializeAudioContext, language]);

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
    // Stop iSkylar from speaking
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { }
    }
    setIsSpeaking(false);
    setWasInterrupted(true);

    // Start listening for the user's interruption input
    toast({
      title: "You interrupted",
      description: "Go ahead, I'm listening.",
      duration: 2000,
    });

    // Automatically start listening
    if (!isListening) {
      startListening();
    }
  }, [startListening, isListening, toast]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) { }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getStatusText = () => {
    if (!sessionStarted && !isInitializing) return "Click 'Start Session' to begin.";
    if (isInitializing) return "Contacting iSkylar...";
    if (isSending) return "iSkylar is thinking...";
    if (isSpeaking) return "iSkylar is speaking...";
    if (isListening) return "Listening...";
    return "Ready. Tap the microphone to speak.";
  }

  return (
    <div className="relative flex flex-col h-full min-h-screen w-full items-center justify-between overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* Ambient light effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col w-full max-w-4xl mx-auto p-6 flex-grow justify-start">
        <header className="w-full flex flex-col items-center text-center pt-12 pb-8">
          {/* Logo/Avatar placeholder with breathing animation */}
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-2xl glow-purple breathe">
              <Brain className="w-12 h-12 text-white" />
            </div>
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/50 animate-ping"></div>
          </div>

          <h1 className="text-6xl font-bold tracking-tight mb-3 gradient-text">
            iSkylar
          </h1>
          <p className="text-lg text-white/80 font-medium tracking-wide">
            Your AI Voice Therapist
          </p>
          <div className="mt-2 px-4 py-1.5 glass-dark rounded-full">
            <p className="text-sm text-white/60">Empathetic • Intelligent • Always Here</p>
          </div>
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
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {isInitializing && <Loader2 className="mr-3 h-6 w-6 animate-spin" />}
                <span className="relative z-10">{isInitializing ? "Connecting..." : "Start Session"}</span>
              </Button>
              <p className="text-white/60 text-sm">Click to begin your therapeutic journey</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {/* Interrupt button with stunning design */}
              {isSpeaking && (
                <Button
                  onClick={handleInterrupt}
                  size="sm"
                  className="relative px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold shadow-lg transition-all duration-300 animate-pulse border-0"
                >
                  <div className="absolute inset-0 bg-white/30 blur-xl animate-pulse"></div>
                  <span className="relative z-10">⚡ Interrupt</span>
                </Button>
              )}

              {/* Microphone button with premium design */}
              <div className="relative">
                {/* Outer glow ring */}
                {(isListening || isSpeaking) && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-50 blur-2xl animate-pulse scale-150"></div>
                )}

                <Button
                  onClick={handleMicClick}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative h-32 w-32 rounded-full transition-all duration-500 border-4",
                    isSpeaking
                      ? "glass-dark border-purple-400/50 shadow-2xl glow-purple animate-pulse scale-110"
                      : isListening
                        ? "glass-dark border-blue-400/50 shadow-2xl glow-blue scale-110"
                        : "glass-dark border-white/20 hover:border-white/40 hover:scale-110 hover:shadow-2xl"
                  )}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30"></div>
                  <Mic
                    className={cn(
                      "relative z-10 transition-all duration-300",
                      isListening ? "w-16 h-16 text-blue-300 animate-pulse" :
                        isSpeaking ? "w-16 h-16 text-purple-300" :
                          "w-14 h-14 text-white/70 group-hover:text-white"
                    )}
                  />
                </Button>
              </div>

              {/* Status text with modern styling */}
              <div className="glass-dark px-6 py-3 rounded-full">
                <p className="text-white font-medium text-center flex items-center gap-2">
                  {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {getStatusText()}
                </p>
              </div>
            </div>
          )}
        </footer>
      </div>

      {/* Chat history overlay with glassmorphism */}
      {sessionStarted && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-6 left-6 z-30 glass-dark border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all"
            onClick={() => setShowChat(true)}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <div
            className={cn(
              "fixed inset-0 z-40 transition-all duration-500",
              showChat ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl"></div>

            <div className="relative flex flex-col h-full max-w-3xl mx-auto p-6 pt-20">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 z-50 text-white hover:bg-white/10 hover:scale-110 transition-all"
                onClick={() => setShowChat(false)}
              >
                <X className="w-6 h-6" />
              </Button>

              <ScrollArea className="flex-grow pr-4" ref={chatHistoryRef}>
                <div className="space-y-4">
                  {chatHistory.map((msg) => (
                    <Card
                      key={msg.id}
                      className={cn(
                        "w-fit max-w-[85%] rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] border-0",
                        msg.speaker === "user"
                          ? "ml-auto glass-dark"
                          : msg.speaker === "iSkylar"
                            ? "glass-dark"
                            : "mx-auto glass-dark"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {msg.icon && (
                            <msg.icon
                              className={cn(
                                "mt-1 w-5 h-5 shrink-0",
                                msg.speaker === "user" ? "text-blue-300" :
                                  msg.speaker === "iSkylar" ? "text-purple-300" :
                                    "text-orange-300"
                              )}
                            />
                          )}
                          <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {(isSending || (isInitializing && sessionStarted)) && (
                    <div className="flex items-center space-x-3 p-4 glass-dark rounded-2xl w-fit">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      <p className="text-sm text-white/70 italic">{getStatusText()}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
