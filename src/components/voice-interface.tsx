// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2, User, Brain, AlertTriangle } from "lucide-react";
import { voiceConversationWithSkylar, type VoiceConversationWithSkylarInput } from "@/ai/flows/ai-therapy";
import { safetyNetActivation, type SafetyNetActivationInput } from "@/ai/flows/safety-net";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  speaker: "user" | "skylar" | "system";
  text: string;
  icon?: React.ElementType;
}

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSkylarSpeaking, setIsSkylarSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessionState, setSessionState] = useState<string | undefined>(undefined);
  const [isLoadingAIResponse, setIsLoadingAIResponse] = useState(false);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [chatHistory]);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!speechApiSupported || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback(); // Ensure callback fires even if speech is not supported
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onstart = () => setIsSkylarSpeaking(true);
    utterance.onend = () => {
      setIsSkylarSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = (event) => {
      console.error("SpeechSynthesis Error:", event);
      setIsSkylarSpeaking(false);
      toast({
        title: "Speech Error",
        description: "Could not play audio response.",
        variant: "destructive",
      });
       if (onEndCallback) onEndCallback();
    };
    window.speechSynthesis.speak(utterance);
  }, [speechApiSupported, toast]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition || !window.speechSynthesis) {
        setSpeechApiSupported(false);
        toast({
          title: "Browser Not Supported",
          description: "Your browser does not support the Web Speech API needed for voice interaction.",
          variant: "destructive",
          duration: Infinity,
        });
        setChatHistory([{ id: `system-no-voice-${Date.now()}`, speaker: "system", text: "Voice interaction is not supported by your browser. This app requires voice.", icon: AlertTriangle }]);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSkylarSpeaking(false);
        }
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setCurrentTranscript(interimTranscript);
        if (finalTranscript.trim()) {
          handleUserSpeech(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("SpeechRecognition Error:", event.error);
        let errorMessage = "An unknown error occurred with speech recognition.";
        if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please try speaking again.";
        } else if (event.error === 'network') {
          errorMessage = "Network error during speech recognition.";
        } else if (event.error === 'audio-capture') {
          errorMessage = "Audio capture failed. Please check your microphone.";
        }
        
        toast({
          title: "Speech Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsListening(false);
      };
      
      recognition.onend = () => {
        // if (isListening && speechRecognitionRef.current) { // Check isListening before restarting
           // recognition.start(); // Automatically restart if still supposed to be listening
        // } else {
          // setIsListening(false); // Ensure state is correct if stopped externally
        // }
      };
      speechRecognitionRef.current = recognition;
    }

    const initiateSession = async () => {
      setIsLoadingAIResponse(true);
      try {
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await voiceConversationWithSkylar(aiInput);
        
        setSessionState(aiResult.updatedSessionState); 
        
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain };
        setChatHistory([greetingMessage]);
        speak(aiResult.skylarResponse);

      } catch (error) {
        console.error("Error initiating session with Skylar:", error);
        const errorMessage = "Sorry, I couldn't start our session properly. Please try refreshing.";
        setChatHistory([{ id: `error-init-${Date.now()}`, speaker: "system", text: errorMessage, icon: AlertTriangle }]);
        // speak(errorMessage); // Avoid speaking if initial greeting failed, user can see message.
        toast({
          title: "Session Start Error",
          description: "Could not get initial greeting from Skylar. Please check your connection or refresh.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAIResponse(false);
      }
    };

    if (speechApiSupported && typeof window !== "undefined") { // Check window as speechApiSupported might be true initially
        initiateSession();
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechApiSupported]); // Dependencies are minimal to avoid re-triggering session initiation.

  const handleUserSpeech = async (userInput: string) => {
    setCurrentTranscript("");
    setChatHistory(prev => [...prev, { id: Date.now().toString(), speaker: "user", text: userInput, icon: User }]);
    setIsLoadingAIResponse(true);

    try {
      const safetyInput: SafetyNetActivationInput = { userInput };
      const safetyResult = await safetyNetActivation(safetyInput);

      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        setChatHistory(prev => [...prev, { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle }]);
        speak(safetyResult.safetyResponse);
        setIsLoadingAIResponse(false);
        return;
      }

      const aiInput: VoiceConversationWithSkylarInput = { userInput, sessionState };
      const aiResult = await voiceConversationWithSkylar(aiInput);
      
      setSessionState(aiResult.updatedSessionState);
      setChatHistory(prev => [...prev, { id: `skylar-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain }]);
      speak(aiResult.skylarResponse);

    } catch (error) {
      console.error("AI Flow Error:", error);
      const errorMessage = "Sorry, I encountered an issue. Please try again.";
      setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, speaker: "system", text: errorMessage, icon: AlertTriangle }]);
      speak(errorMessage);
      toast({
        title: "AI Error",
        description: "Could not get response from Skylar.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAIResponse(false);
    }
  };

  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) return;

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true }); 
        }
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        toast({
          title: "Microphone Access",
          description: "Could not access microphone. Please ensure permission is granted and try again.",
          variant: "destructive",
        });
        setIsListening(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 font-body">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">Skylar</h1>
        <p className="text-muted-foreground">Your AI Voice Therapist</p>
      </header>

      <ScrollArea className="flex-grow mb-4 pr-4" ref={chatHistoryRef}>
        <div className="space-y-4">
          {chatHistory.map((msg) => (
            <Card 
              key={msg.id} 
              className={`w-fit max-w-[85%] rounded-xl shadow-md ${
                msg.speaker === "user" ? "ml-auto bg-accent text-accent-foreground" : 
                msg.speaker === "skylar" ? "bg-card text-card-foreground" :
                "bg-destructive/20 text-destructive-foreground mx-auto border-destructive"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  {msg.icon && <msg.icon className={`mt-1 size-5 shrink-0 ${
                    msg.speaker === "user" ? "text-accent-foreground" : 
                    msg.speaker === "skylar" ? "text-primary" :
                    "text-destructive"
                  }`} />}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {currentTranscript && (
            <Card className="ml-auto w-fit max-w-[85%] bg-accent/50 text-accent-foreground/80 rounded-xl shadow-md opacity-70">
              <CardContent className="p-3">
                 <div className="flex items-start space-x-2">
                  <User className="mt-1 size-5 shrink-0 text-accent-foreground/80" />
                  <p className="text-sm italic leading-relaxed whitespace-pre-wrap">{currentTranscript}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <footer className="flex flex-col items-center space-y-3 pt-4 border-t">
        <div className="h-6 text-sm text-muted-foreground">
          {isLoadingAIResponse ? "Skylar is thinking..." : isSkylarSpeaking ? "Skylar is speaking..." : isListening ? "Listening..." : speechApiSupported ? "Press mic to talk" : "Voice not supported"}
        </div>
        <Button
          onClick={toggleListening}
          size="lg"
          variant={isListening ? "destructive" : "default"}
          className={`rounded-full p-0 w-20 h-20 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-primary/50
            ${isListening ? 'animate-pulse-lg bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}
            ${!speechApiSupported ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          disabled={!speechApiSupported || isLoadingAIResponse}
        >
          {isLoadingAIResponse ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
        {!speechApiSupported && chatHistory.length > 0 && chatHistory[0].id.startsWith('system-no-voice') && (
            <p className="text-xs text-destructive text-center">Voice interaction is not supported by your browser. This app requires voice functionality to work as intended.</p>
        )}
      </footer>
    </div>
  );
}
