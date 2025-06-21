// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Loader2 } from "lucide-react";
import { askiSkylar, type iSkylarInput } from "@/ai/flows/ai-therapy";
import { safetyNetActivation } from "@/ai/flows/safety-net";
import { textToSpeech } from "@/ai/flows/tts";
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
  const transcriptRef = useRef("");
  
  const sessionStartedRef = useRef(sessionStarted);
  const isSpeakingRef = useRef(isSpeaking);
  const isSendingRef = useRef(isSending);

  useEffect(() => {
    sessionStartedRef.current = sessionStarted;
    isSpeakingRef.current = isSpeaking;
    isSendingRef.current = isSending;
  }, [sessionStarted, isSpeaking, isSending]);

  const { toast } = useToast();
  
  const startListening = useCallback(() => {
    if (isSpeakingRef.current || isSendingRef.current || !sessionStartedRef.current) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        toast({ title: "Browser Not Supported", description: "Your browser does not support the Web Speech API.", variant: "destructive" });
        return;
    }

    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    transcriptRef.current = "";

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
        setIsListening(false);
        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript) {
            handleSendMessage(finalTranscript);
        } else {
            if (sessionStartedRef.current && !isSpeakingRef.current && !isSendingRef.current) {
                startListening();
            }
        }
    };
    
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
        transcriptRef.current = event.results[event.results.length - 1][0].transcript;
    };
    
    recognition.start();
  }, [toast]);

  const playAudioResponse = useCallback(async (text: string) => {
    if (!text) {
      if (sessionStartedRef.current) startListening();
      return;
    };
    setIsSpeaking(true);
    try {
        const { audioDataUri } = await textToSpeech(text);
        if (audioRef.current) {
            audioRef.current.src = audioDataUri;
            await audioRef.current.play();
        }
    } catch (error) {
        console.error("Error playing audio response:", error);
        toast({ title: "Audio Error", description: "Could not play iSkylar's response.", variant: "destructive" });
        setIsSpeaking(false);
        if (sessionStartedRef.current) startListening();
    }
  }, [toast, startListening]);
  
  const handleSendMessage = useCallback(async (userInput: string) => {
    const finalUserInput = userInput.trim();
    if (!finalUserInput) return;

    setIsSending(true);
    setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, speaker: "user", text: finalUserInput, icon: User }]);
    
    try {
        const safetyResult = await safetyNetActivation({ userInput: finalUserInput });
        if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
            const safetyMessage = { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle };
            setChatHistory(prev => [...prev, safetyMessage]);
            await playAudioResponse(safetyMessage.text);
        } else {
            const aiResult = await askiSkylar({ userInput: finalUserInput, sessionState });
            setSessionState(aiResult.updatedSessionState);
            const iSkylarMessage = { id: `iskylar-${Date.now()}`, speaker: "iSkylar", text: aiResult.iSkylarResponse, icon: Brain };
            setChatHistory(prev => [...prev, iSkylarMessage]);
            await playAudioResponse(iSkylarMessage.text);
        }
    } catch (error) {
        console.error("Error sending message:", error);
        toast({ title: "AI Error", description: "Could not get a response from iSkylar.", variant: "destructive" });
        setIsSending(false);
        if (sessionStartedRef.current) {
            startListening();
        }
    } finally {
        setIsSending(false);
    }
  }, [sessionState, toast, playAudioResponse, startListening]);

  useEffect(() => {
    if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  useEffect(() => {
    const currentAudio = audioRef.current;
    const onEnded = () => {
        setIsSpeaking(false);
        if (sessionStartedRef.current) {
            startListening();
        }
    };

    if (currentAudio) {
        currentAudio.addEventListener('ended', onEnded);
    }
    return () => {
        if (currentAudio) {
            currentAudio.removeEventListener('ended', onEnded);
        }
    };
  }, [startListening]);
  
  const handleStartSession = useCallback(async () => {
    setIsInitializing(true);
    setSessionStarted(true);
    try {
        const aiInput: iSkylarInput = { userInput: "ISKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await askiSkylar(aiInput);
        setSessionState(aiResult.updatedSessionState);
        const greetingMessage = {
            id: `iskylar-greeting-${Date.now()}`,
            speaker: "iSkylar",
            text: aiResult.iSkylarResponse,
            icon: Brain
        };
        setChatHistory([greetingMessage]);
        await playAudioResponse(greetingMessage.text);
    } catch (error) {
        console.error("Error during session initiation:", error);
        toast({ title: "AI Error", description: "Could not start session.", variant: "destructive" });
        setSessionStarted(false);
    } finally {
        setIsInitializing(false);
    }
  }, [toast, playAudioResponse]);
  
  useEffect(() => {
    return () => {
        recognitionRef.current?.abort();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        setSessionStarted(false);
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
      <audio ref={audioRef} />
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
