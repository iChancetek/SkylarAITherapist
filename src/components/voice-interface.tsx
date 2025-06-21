// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Loader2, Send, Square } from "lucide-react";
import { askiSkylar, type iSkylarInput } from "@/ai/flows/ai-therapy";
import { safetyNetActivation } from "@/ai/flows/safety-net";
import { textToSpeech } from "@/ai/flows/tts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [isInitializing, setIsInitializing] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessionState, setSessionState] = useState<string | undefined>(undefined);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef("");

  const { toast } = useToast();

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  const playAudioResponse = useCallback(async (text: string) => {
    if (!text) return;
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
    }
  }, [toast]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;
    
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);

    setIsSending(true);
    setInputValue("");
    setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, speaker: "user", text: userInput, icon: User }]);
    
    try {
      const safetyResult = await safetyNetActivation({ userInput });
      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        setChatHistory(prev => [...prev, { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle }]);
        setIsSending(false);
        return;
      }

      const aiResult = await askiSkylar({ userInput, sessionState });
      setSessionState(aiResult.updatedSessionState);
      const iSkylarMessage = { id: `iskylar-${Date.now()}`, speaker: "iSkylar", text: aiResult.iSkylarResponse, icon: Brain };
      setChatHistory(prev => [...prev, iSkylarMessage]);
      await playAudioResponse(iSkylarMessage.text);

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "AI Error", description: "Could not get a response from iSkylar.", variant: "destructive" });
      setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, speaker: 'system', text: 'Sorry, I encountered an issue. Please try again.', icon: AlertTriangle }]);
    } finally {
      setIsSending(false);
    }
  }, [sessionState, toast, playAudioResponse]);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Browser Not Supported", description: "Your browser does not support the Web Speech API.", variant: "destructive" });
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event) => {
      let errorMessage = "An unknown error occurred with voice recognition.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
      } else if (event.error === 'no-speech') {
        errorMessage = "No speech was detected. Please try again.";
      }
      toast({ title: "Voice Error", description: errorMessage, variant: "destructive" });
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInputValue(transcriptRef.current + interimTranscript);
    };
    
    transcriptRef.current = "";
    recognition.start();
  }, [isListening, toast]);
  
  const startSession = useCallback(async () => {
    setIsInitializing(true);
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
      toast({ title: "AI Error", description: "Could not start the session with iSkylar. Please refresh.", variant: "destructive" });
    } finally {
      setIsInitializing(false);
    }
  }, [toast, playAudioResponse]);
  
  useEffect(() => {
    startSession();
  }, [startSession]);

  useEffect(() => {
    const currentAudio = audioRef.current;
    const onEnded = () => setIsSpeaking(false);

    if (currentAudio) {
      currentAudio.addEventListener('ended', onEnded);
      currentAudio.addEventListener('pause', onEnded);
    }

    return () => {
      recognitionRef.current?.abort();
      if (currentAudio) {
        currentAudio.removeEventListener('ended', onEnded);
        currentAudio.removeEventListener('pause', onEnded);
        currentAudio.pause();
      }
    };
  }, []);
  
  const getStatusText = () => {
    if (isInitializing) return "Contacting iSkylar...";
    if (isSending) return "iSkylar is thinking...";
    if (isSpeaking) return "iSkylar is speaking...";
    if (isListening) return "Listening...";
    return "Ready";
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
            {(isSending || isInitializing) && (
              <div className="flex items-center space-x-2 p-4">
                <Loader2 className="size-5 shrink-0 text-primary animate-spin" />
                <p className="text-sm italic text-muted-foreground">{getStatusText()}</p>
              </div>
            )}
        </div>
      </ScrollArea>
      <footer className="pt-4 border-t border-border">
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message, or use the mic..."
            className="pr-24"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
             <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                disabled={isSending || isInitializing || isSpeaking}
              >
                {isListening ? <Square className="text-destructive" /> : <Mic />}
              </Button>
              <Button
                size="icon"
                onClick={() => handleSendMessage(inputValue)}
                disabled={isSending || isInitializing || !inputValue.trim() || isSpeaking}
              >
                <Send />
              </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 h-4">{getStatusText()}</p>
      </footer>
    </div>
  );
}
