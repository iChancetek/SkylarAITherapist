
// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Loader2, MessageSquare, X } from "lucide-react";
import { getSpokenResponse } from "@/ai/flows/get-spoken-response";
import { getTextResponse } from "@/ai/flows/get-text-response";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/lib/auth";

interface ChatMessage {
  id: string;
  speaker: "user" | "iSkylar" | "system";
  text: string;
  icon?: React.ElementType;
}

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [sessionState, setSessionState] = useState<string | undefined>(undefined);
  const [isVoiceQuotaReached, setIsVoiceQuotaReached] = useState(false);
  
  const { userProfile } = useAuthContext();
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

  const playAudio = useCallback(async (audioDataUri: string, sessionShouldEnd: boolean = false) => {
    if (!audioDataUri) {
      if (sessionShouldEnd) {
        setSessionStarted(false);
        setShowChat(false);
        setSessionState(undefined);
        setChatHistory(prev => [...prev, { id: 'system-end', speaker: 'system', text: 'Session ended.', icon: Brain }]);
      }
      return;
    }
    
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
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
                    setSessionStarted(false);
                    setShowChat(false);
                    setSessionState(undefined);
                    setChatHistory(prev => [...prev, { id: 'system-end', speaker: 'system', text: 'Session ended.', icon: Brain }]);
                }
            }
        };

        source.start(0);

    } catch (e) {
        console.error("Audio playback error:", e);
        toast({ title: "Playback Error", description: "Could not play the voice.", variant: "destructive" });
        setIsSpeaking(false);
    }
  }, [toast]);
  
  const handleTextOnlyResponse = useCallback(async (userInput: string) => {
    try {
        const textResponse = await getTextResponse({ userInput, sessionState, language });
        setSessionState(textResponse.updatedSessionState);

        const message = {
            id: `${textResponse.isSafetyResponse ? 'safety' : 'iskylar'}-${Date.now()}`,
            speaker: textResponse.isSafetyResponse ? "system" : "iSkylar",
            text: textResponse.responseText,
            icon: textResponse.isSafetyResponse ? AlertTriangle : Brain
        };
        setChatHistory(prev => [...prev, message]);

        if (textResponse.sessionShouldEnd) {
            setSessionStarted(false);
            setShowChat(false);
            setSessionState(undefined);
            setChatHistory(prev => [...prev, { id: 'system-end', speaker: 'system', text: 'Session ended.', icon: Brain }]);
        }
    } catch (fallbackError) {
        console.error("Error during text-only fallback:", fallbackError);
        toast({ title: "AI Error", description: "Could not get a text response from iSkylar.", variant: "destructive" });
    }
  }, [sessionState, toast, language]);

  const handleSendMessage = useCallback(async (userInput: string) => {
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
        const response = await getSpokenResponse({ userInput: finalUserInput, sessionState, language });
        setSessionState(response.updatedSessionState);
        
        const message = {
            id: `${response.isSafetyResponse ? 'safety' : 'iskylar'}-${Date.now()}`,
            speaker: response.isSafetyResponse ? "system" : "iSkylar",
            text: response.responseText,
            icon: response.isSafetyResponse ? AlertTriangle : Brain
        };
        setChatHistory(prev => [...prev, message]);
        
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
  }, [sessionState, toast, sessionStarted, playAudio, isVoiceQuotaReached, handleTextOnlyResponse, language]);

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
  
  useEffect(() => {
    const shouldBeListening = sessionStarted && !isSpeaking && !isSending && !isInitializing && !isListening;
    if (shouldBeListening) {
      startListening();
    }
  }, [sessionStarted, isSpeaking, isSending, isListening, startListening, isInitializing]);
  
  const handleStartSession = useCallback(async () => {
    initializeAudioContext();

    setIsInitializing(true);
    setChatHistory([]);
    setShowChat(true);
    setSessionStarted(true);
    try {
        const response = await getSpokenResponse({ userInput: "ISKYLAR_SESSION_START", sessionState: undefined, language });
        setSessionState(response.updatedSessionState);

        const greetingMessage = {
            id: `iskylar-greeting-${Date.now()}`,
            speaker: "iSkylar",
            text: response.responseText,
            icon: Brain
        };
        setChatHistory([greetingMessage]);
        
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
        try { sourceNodeRef.current.stop(); } catch(e) {}
    }
    if (!isListening) {
        startListening();
    }
  }, [isSpeaking, isListening, startListening, initializeAudioContext]);
  
  useEffect(() => {
    if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
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
    <div className="relative flex flex-col h-full w-full items-center justify-between font-body text-foreground overflow-hidden">
     
      <div className="relative z-10 flex flex-col w-full max-w-2xl mx-auto p-4">
        <header className="w-full flex flex-col items-center text-center text-white pt-8">
          <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg">iSkylar</h1>
          <p className="text-white/80 drop-shadow-md">Your AI Voice Therapist</p>
        </header>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4">
        <footer className="w-full pt-4 flex flex-col items-center justify-center space-y-3 h-32">
        {!sessionStarted ? (
            <Button onClick={handleStartSession} disabled={isInitializing} size="lg" className="bg-white/30 text-white backdrop-blur-md border border-white/40 hover:bg-white/40 h-14 text-lg">
            {isInitializing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Start Session
            </Button>
        ) : (
            <Button onClick={handleMicClick} variant="ghost" size="icon" className="rounded-full h-24 w-24 bg-white/30 hover:bg-white/40 backdrop-blur-md border-2 border-white/50 shadow-2xl">
            <Mic className={cn("size-12 text-white transition-all", isListening ? "scale-110 drop-shadow-lg" : "opacity-80")} />
            </Button>
        )}
        <p className="text-sm text-white/80 h-5 text-center drop-shadow-md">{getStatusText()}</p>
        </footer>
      </div>

       {sessionStarted && (
        <>
            <Button variant="outline" size="icon" className="absolute top-4 left-4 z-20 bg-white/30 text-white backdrop-blur-md border-white/40 hover:bg-white/40" onClick={() => setShowChat(true)}>
                <MessageSquare />
            </Button>
            <div className={cn(
                "absolute inset-0 z-20 h-full w-full bg-black/50 backdrop-blur-md transition-opacity duration-300",
                showChat ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                <div className="relative flex flex-col h-full max-w-2xl mx-auto p-4 pt-16">
                     <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-30 text-white hover:bg-white/20 hover:text-white" onClick={() => setShowChat(false)}>
                        <X />
                    </Button>
                    <ScrollArea className="flex-grow mb-4 pr-4" ref={chatHistoryRef}>
                    <div className="space-y-4">
                      {chatHistory.map((msg) => (
                        <Card
                          key={msg.id}
                          className={`w-fit max-w-[85%] rounded-xl shadow-md ${
                            msg.speaker === "user" ? "ml-auto bg-primary/90 text-primary-foreground" :
                            msg.speaker === "iSkylar" ? "bg-card/90 text-card-foreground" : 
                            "bg-destructive/90 text-destructive-foreground mx-auto" 
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start space-x-2">
                              {msg.icon && <msg.icon className={`mt-1 size-5 shrink-0 ${
                                msg.speaker === "user" ? "text-primary-foreground" :
                                msg.speaker === "iSkylar" ? "text-primary" :
                                "text-destructive"
                              }`} />}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                        {(isSending || (isInitializing && sessionStarted)) && (
                        <div className="flex items-center space-x-2 p-4 bg-background/50 rounded-lg">
                            <Loader2 className="size-5 shrink-0 text-primary animate-spin" />
                            <p className="text-sm italic text-muted-foreground">{getStatusText()}</p>
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
