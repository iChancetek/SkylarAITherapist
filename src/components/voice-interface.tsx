
// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Loader2 } from "lucide-react";
import { getSpokenResponse } from "@/ai/flows/get-spoken-response";
import type { SpokenResponseInput } from "@/ai/schema/spoken-response";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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
  const [sessionState, setSessionState] = useState<string | undefined>(undefined);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const handleSendMessage = useCallback(async (userInput: string) => {
    const finalUserInput = userInput.trim();
    if (!finalUserInput || !sessionStarted) return;

    setIsSending(true);
    setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, speaker: "user", text: finalUserInput, icon: User }]);
    
    try {
        const response = await getSpokenResponse({ userInput: finalUserInput, sessionState });
        setSessionState(response.updatedSessionState);
        
        const message = {
            id: `${response.isSafetyResponse ? 'safety' : 'iskylar'}-${Date.now()}`,
            speaker: response.isSafetyResponse ? "system" : "iSkylar",
            text: response.responseText,
            icon: response.isSafetyResponse ? AlertTriangle : Brain
        };
        setChatHistory(prev => [...prev, message]);
        
        setIsSpeaking(true);
        if (audioRef.current) {
            audioRef.current.src = response.audioDataUri;
            audioRef.current.load();
            
            await audioRef.current.play();

            await new Promise<void>((resolve, reject) => {
              const onEnded = () => {
                audioRef.current?.removeEventListener('ended', onEnded);
                audioRef.current?.removeEventListener('error', onError);
                resolve();
              };
              const onError = (e) => {
                 audioRef.current?.removeEventListener('ended', onEnded);
                 audioRef.current?.removeEventListener('error', onError);
                 console.error("Audio playback error:", e);
                 toast({ title: "Audio Error", description: "Could not play iSkylar's voice.", variant: "destructive" });
                 reject(e);
              }

              if (audioRef.current) {
                audioRef.current.addEventListener('ended', onEnded);
                audioRef.current.addEventListener('error', onError);
              } else {
                resolve();
              }
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        toast({ title: "AI Error", description: "Could not get a response from iSkylar.", variant: "destructive" });
    } finally {
        setIsSending(false);
        setIsSpeaking(false);
    }
  }, [sessionState, toast, sessionStarted]);

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
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false; 

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            toast({ title: "Voice Error", description: "Microphone access denied.", variant: "destructive" });
            setSessionStarted(false);
        } else {
            toast({ title: "Voice Error", description: `Voice recognition error: ${event.error}`, variant: "destructive" });
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            handleSendMessage(transcript);
        }
    };
    
    recognition.start();
  }, [toast, handleSendMessage, isListening]);
  
  useEffect(() => {
    const shouldBeListening = sessionStarted && !isSpeaking && !isSending && !isInitializing;
    if (shouldBeListening && !isListening) {
      startListening();
    } else if (!shouldBeListening && isListening) {
      recognitionRef.current?.stop();
    }
  }, [sessionStarted, isSpeaking, isSending, isListening, startListening, isInitializing]);
  
  const handleStartSession = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      audioRef.current.muted = true;
      try {
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
      } catch (e) {
        console.error("Audio unlock failed, will attempt playback anyway.", e);
        toast({ title: "Audio Error", description: "Could not initialize audio. Please tap the screen and try again.", variant: "destructive" });
      }
    }

    setIsInitializing(true);
    setSessionStarted(true);
    try {
        const response = await getSpokenResponse({ userInput: "ISKYLAR_SESSION_START", sessionState: undefined });
        setSessionState(response.updatedSessionState);

        const greetingMessage = {
            id: `iskylar-greeting-${Date.now()}`,
            speaker: "iSkylar",
            text: response.responseText,
            icon: Brain
        };
        setChatHistory([greetingMessage]);
        
        setIsSpeaking(true);
        if (audioRef.current) {
          audioRef.current.src = response.audioDataUri;
          audioRef.current.load();
          await audioRef.current.play();

          await new Promise<void>((resolve, reject) => {
              const onEnded = () => {
                audioRef.current?.removeEventListener('ended', onEnded);
                audioRef.current?.removeEventListener('error', onError);
                resolve();
              };
               const onError = (e) => {
                 audioRef.current?.removeEventListener('ended', onEnded);
                 audioRef.current?.removeEventListener('error', onError);
                 console.error("Audio playback error:", e);
                 toast({ title: "Audio Error", description: "Could not play iSkylar's voice.", variant: "destructive" });
                 reject(e);
              }

              if (audioRef.current) {
                audioRef.current.addEventListener('ended', onEnded);
                audioRef.current.addEventListener('error', onError);
              } else {
                resolve();
              }
          });
        }
    } catch (error) {
        console.error("Error during session initiation:", error);
        toast({ title: "AI Error", description: "Could not start session.", variant: "destructive" });
        setSessionStarted(false);
    } finally {
        setIsInitializing(false);
        setIsSpeaking(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const getStatusText = () => {
    if (!sessionStarted && !isInitializing) return "Click 'Start Session' to begin.";
    if (isInitializing) return "Contacting iSkylar...";
    if (isSending) return "iSkylar is thinking...";
    if (isSpeaking) return "iSkylar is speaking...";
    if (isListening) return "Listening...";
    return "Ready.";
  }
  
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 font-body bg-background text-foreground">
      <audio ref={audioRef} playsInline />
      <header className="mb-4 flex flex-col items-center text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">iSkylar</h1>
        <p className="text-muted-foreground">Your AI Voice Therapist</p>
      </header>
      
      <ScrollArea className="flex-grow mb-4 pr-4" ref={chatHistoryRef}>
        <div className="space-y-4">
          {chatHistory.map((msg) => (
            <Card
              key={msg.id}
              className={`w-fit max-w-[85%] rounded-xl shadow-md ${
                msg.speaker === "user" ? "ml-auto bg-accent text-accent-foreground" :
                msg.speaker === "iSkylar" ? "bg-card text-card-foreground border border-primary/30" : 
                "bg-destructive/20 text-destructive-foreground mx-auto border-destructive" 
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  {msg.icon && <msg.icon className={`mt-1 size-5 shrink-0 ${
                    msg.speaker === "user" ? "text-accent-foreground" :
                    msg.speaker === "iSkylar" ? "text-primary" :
                    "text-destructive"
                  }`} />}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
            {(isSending || (isInitializing && sessionStarted)) && (
              <div className="flex items-center space-x-2 p-4">
                <Loader2 className="size-5 shrink-0 text-primary animate-spin" />
                <p className="text-sm italic text-muted-foreground">{getStatusText()}</p>
              </div>
            )}
        </div>
      </ScrollArea>
      <footer className="pt-4 border-t border-border flex flex-col items-center justify-center space-y-2 h-24">
        {!sessionStarted ? (
          <Button onClick={handleStartSession} disabled={isInitializing} size="lg">
            {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Session
          </Button>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Mic className={`size-8 text-primary ${isListening ? 'animate-pulse-lg' : 'opacity-70'}`} />
          </div>
        )}
        <p className="text-sm text-muted-foreground h-4">{getStatusText()}</p>
      </footer>
    </div>
  );
}
