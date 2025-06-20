// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Send, Volume2, Square, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { askiSkylar, type iSkylarInput } from "@/ai/flows/ai-therapy";
import { safetyNetActivation } from "@/ai/flows/safety-net";
import { textToSpeech } from "@/ai/flows/tts";
import { useToast } from "@/hooks/use-toast";

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
  const manuallyStoppedRef = useRef(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  useEffect(() => {
    const initiateSession = async () => {
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
        toast({
          title: "AI Error",
          description: "Could not start the session with iSkylar. Please refresh.",
          variant: "destructive"
        });
      } finally {
        setIsInitializing(false);
      }
    };
    initiateSession();
  }, [toast]);
  
  const playAudioResponse = async (text: string) => {
    if (!text) return;
    try {
      const { audioDataUri } = await textToSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Error playing audio response:", error);
      toast({ title: "Audio Error", description: "Could not play iSkylar's response.", variant: "destructive" });
    }
  };

  const handleSendMessage = async (message?: string) => {
    if (isSpeaking) {
      audioRef.current?.pause();
      setIsSpeaking(false);
    }
    const userInput = (message || inputValue).trim();
    if (!userInput || isSending) return;

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
      await playAudioResponse(iSkylarMessage.text); // Automatically speak the response
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "AI Error", description: "Could not get a response from iSkylar.", variant: "destructive" });
      setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, speaker: 'system', text: 'Sorry, I encountered an issue. Please try again.', icon: AlertTriangle }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceInput = () => {
    if (isSpeaking) {
      audioRef.current?.pause();
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Browser Not Supported", description: "Your browser does not support the Web Speech API for voice input.", variant: "destructive" });
      return;
    }

    if (isListening) {
      manuallyStoppedRef.current = true;
      recognitionRef.current?.stop();
      return;
    }
    
    manuallyStoppedRef.current = false;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Restart if not manually stopped
      if (!manuallyStoppedRef.current) {
        setTimeout(() => handleVoiceInput(), 100); 
      }
    };
    recognition.onerror = (event) => {
      let errorMessage = "An unknown error occurred.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
      } else if (event.error === 'no-speech') {
        errorMessage = "No speech was detected.";
      } else if (event.error !== 'aborted') {
        toast({ title: "Voice Error", description: errorMessage, variant: "destructive" });
      }
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        manuallyStoppedRef.current = true; // Stop after a successful utterance.
        recognition.stop();
        handleSendMessage(finalTranscript);
      }
    };

    recognition.start();
  };
  
  const handleToggleTTS = () => {
    if (isSpeaking) {
        audioRef.current?.pause();
    } else {
        const lastAgentMessage = [...chatHistory].reverse().find(msg => msg.speaker === 'iSkylar');
        if (lastAgentMessage?.text) {
             if (audioRef.current?.src) {
                audioRef.current.play();
             } else {
                playAudioResponse(lastAgentMessage.text);
             }
        } else {
            toast({ title: "No Message", description: "There is no message from iSkylar to play.", variant: "default" });
        }
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (isSpeaking) {
      audioRef.current?.pause();
    }
  }

  useEffect(() => {
    const currentAudio = audioRef.current;
    const onPlay = () => setIsSpeaking(true);
    const onPause = () => setIsSpeaking(false);
    const onEnded = () => setIsSpeaking(false);

    if (currentAudio) {
      currentAudio.addEventListener('play', onPlay);
      currentAudio.addEventListener('pause', onPause);
      currentAudio.addEventListener('ended', onEnded);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentAudio) {
        currentAudio.removeEventListener('play', onPlay);
        currentAudio.removeEventListener('pause', onPause);
        currentAudio.removeEventListener('ended', onEnded);
        currentAudio.pause();
      }
    };
  }, []);
  
  const lastAgentMessageExists = [...chatHistory].reverse().find(msg => msg.speaker === 'iSkylar');

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
           {isSending && (
             <div className="flex items-center space-x-2 p-4">
                <Brain className="size-5 shrink-0 text-primary animate-pulse" />
                <p className="text-sm italic text-muted-foreground">iSkylar is thinking...</p>
             </div>
           )}
           {isInitializing && (
             <div className="flex items-center space-x-2 p-4">
                <Loader2 className="size-5 shrink-0 text-primary animate-spin" />
                <p className="text-sm italic text-muted-foreground">Contacting iSkylar...</p>
             </div>
           )}
        </div>
      </ScrollArea>

      <footer className="flex flex-col items-center space-y-3 pt-4 border-t border-border">
         <div className="w-full flex items-center space-x-2">
            <Textarea
                placeholder="Type your message or use the microphone..."
                value={inputValue}
                onChange={handleTextChange}
                rows={1}
                className="flex-1 resize-none"
                disabled={isSending || isInitializing}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
            />
            <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isSending || isInitializing}>
                {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                <span className="sr-only">Send Message</span>
            </Button>
         </div>
         <div className="flex items-center space-x-2">
            <Button 
                onClick={handleVoiceInput} 
                variant="outline" 
                size="icon" 
                disabled={isSending || isInitializing}
                aria-label={isListening ? "Stop listening" : "Start listening"}
            >
                {isListening ? <Square className="fill-current text-destructive" /> : <Mic />}
            </Button>
            <Button 
                onClick={handleToggleTTS} 
                variant="outline" 
                size="icon" 
                disabled={isSending || isInitializing || !lastAgentMessageExists}
                aria-label={isSpeaking ? "Stop speaking" : "Read last message"}
            >
                {isSpeaking ? <Square className="fill-current text-destructive" /> : <Volume2 />}
            </Button>
         </div>
      </footer>
    </div>
  );
}
