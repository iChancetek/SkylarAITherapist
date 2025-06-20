
// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, User, Brain, AlertTriangle, Send, Volume2, Square, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { askiSkylar, type iSkylarInput } from "@/ai/flows/ai-therapy";
import { safetyNetActivation, type SafetyNetActivationInput } from "@/ai/flows/safety-net";
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

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
        setChatHistory([{
          id: `iskylar-greeting-${Date.now()}`,
          speaker: "iSkylar",
          text: aiResult.iSkylarResponse,
          icon: Brain
        }]);
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
  
  const handleSendMessage = async (message?: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
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
      handleToggleTTS(iSkylarMessage.text); // Automatically speak the response
      
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
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Browser Not Supported", description: "Your browser does not support the Web Speech API for voice input.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false; // We want to stop after one utterance

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      let errorMessage = "An unknown error occurred.";
      if (event.error === 'not-allowed') {
        errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
      } else if (event.error === 'no-speech') {
        errorMessage = "No speech was detected. Please try again.";
      } else if (event.error !== 'aborted') {
        toast({ title: "Voice Error", description: errorMessage, variant: "destructive" });
      }
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentFullTranscript = finalTranscript + interimTranscript;
      setInputValue(currentFullTranscript); // Show interim results in textarea

      if (finalTranscript) {
        recognition.stop(); // This will trigger onend
        handleSendMessage(finalTranscript);
      }
    };

    recognition.start();
  };
  
  const handleToggleTTS = (textToSpeak?: string) => {
    if (!('speechSynthesis' in window)) {
        toast({ title: "Browser Not Supported", description: "Your browser does not support Text-to-Speech.", variant: "destructive" });
        return;
    }

    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
    }

    const text = textToSpeak || [...chatHistory].reverse().find(msg => msg.speaker === 'iSkylar')?.text;
    if (!text) {
        toast({ title: "No Message", description: "There is no message from iSkylar to play.", variant: "default" });
        return;
    }

    utteranceRef.current = new SpeechSynthesisUtterance(text);
    const utterance = utteranceRef.current;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
        toast({ title: "Speech Error", description: "Could not play iSkylar's response.", variant: "destructive" });
        setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  const lastAgentMessageExists = [...chatHistory].reverse().find(msg => msg.speaker === 'iSkylar');

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 font-body bg-background text-foreground">
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
                onClick={() => handleToggleTTS()} 
                variant="outline" 
                size="icon" 
                disabled={isSending || isInitializing || !lastAgentMessageExists || isSpeaking}
                aria-label={isSpeaking ? "Stop speaking" : "Read last message"}
            >
                {isSpeaking ? <Square className="fill-current text-destructive" /> : <Volume2 />}
            </Button>
         </div>
      </footer>
    </div>
  );
}
