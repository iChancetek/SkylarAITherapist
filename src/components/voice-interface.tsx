
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
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadVoices = useCallback(() => {
    if (!speechApiSupported || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prefer a standard female US voice if available
      let femaleUSVoice = voices.find(
        (voice) => voice.lang.startsWith("en-US") && (voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("samantha") || voice.name.toLowerCase().includes("allison") || voice.name.toLowerCase().includes("susan") || voice.name.toLowerCase().includes("zoe"))
      );

      if (!femaleUSVoice) {
        // Fallback to any US English voice if no specifically "female" one is found
        femaleUSVoice = voices.find((voice) => voice.lang.startsWith("en-US"));
      }
      
      if (femaleUSVoice) {
        setSelectedVoice(femaleUSVoice);
      } else if (voices.length > 0) {
        // Fallback to the first available voice if no US English voice is found
        setSelectedVoice(voices[0]);
      }
    }
  }, [speechApiSupported]);


  useEffect(() => {
    if (speechApiSupported && window.speechSynthesis) {
      loadVoices(); 
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    return () => {
      if (speechApiSupported && window.speechSynthesis) {
         if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = null;
         }
      }
    };
  }, [speechApiSupported, loadVoices]);

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [chatHistory]);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!speechApiSupported || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice?.lang || "en-US";
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

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
    window.speechSynthesis.cancel(); // Cancel any ongoing speech before speaking new
    window.speechSynthesis.speak(utterance);
  }, [speechApiSupported, toast, selectedVoice]);

  const handleGenericError = (error: any, context: "session initiation" | "user speech") => {
    console.error(`Error during ${context}:`, error);
    let errorMessage = "Sorry, I encountered an issue. Please try again.";
    let errorTitle = "AI Error";

    if (error instanceof Error) {
      if (error.message.includes("Service Unavailable") || error.message.includes("overloaded") || (error.message.includes("503") && error.message.includes("model"))) {
        errorMessage = "Skylar is currently experiencing high demand and is temporarily unavailable. Please try again in a few moments.";
        errorTitle = "Service Temporarily Busy";
      } else if (error.message.includes("API key not valid")) {
          errorMessage = "There seems to be an issue with the AI service configuration. Please contact support.";
          errorTitle = "Configuration Error";
      } else if (error.message.toLowerCase().includes("networkerror when attempting to fetch resource")) {
          errorMessage = "A network error occurred. Please check your internet connection and try again.";
          errorTitle = "Network Error";
      }
    }
    
    setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, speaker: "system", text: errorMessage, icon: AlertTriangle }]);
    // Avoid speaking the error message if TTS might also be affected or if it's a network issue.
    // speak(errorMessage); 
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: "destructive",
    });
  };


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
           // Add a system message indicating interruption if desired
           // setChatHistory(prev => [...prev, { id: `system-interrupt-${Date.now()}`, speaker: "system", text: "Skylar was interrupted.", icon: AlertTriangle }]);
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
          // Stop listening before processing speech to prevent feedback loops
          if (speechRecognitionRef.current && isListening) {
            speechRecognitionRef.current.stop();
            // setIsListening(false); // We might want to re-enable listening after Skylar speaks
          }
          handleUserSpeech(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("SpeechRecognition Error:", event.error);
        let errorMessage = "An unknown error occurred with speech recognition.";
        if (event.error === 'not-allowed' || event.error === 'security') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please try speaking again.";
        } else if (event.error === 'network') {
          errorMessage = "Network error during speech recognition. Please check your connection.";
        } else if (event.error === 'audio-capture') {
          errorMessage = "Audio capture failed. Please check your microphone settings and ensure it's working.";
        } else if (event.error === 'aborted') {
            errorMessage = "Speech recognition was aborted. If you didn't stop it, please try again."
        }
        
        toast({
          title: "Speech Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsListening(false); // Ensure listening state is false on error
      };
      
      recognition.onend = () => {
        // setIsListening(false); // More robustly manage listening state here if not handled by toggle.
        // If isListening is true, it means it stopped unexpectedly (e.g. no speech timeout)
        // Or if user explicitly stopped it. We want to allow explicit stop.
      };
      speechRecognitionRef.current = recognition;
    }

    const initiateSession = async () => {
      setIsLoadingAIResponse(true);
      try {
        // The AI flow will provide the greeting.
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await voiceConversationWithSkylar(aiInput);
        
        setSessionState(aiResult.updatedSessionState); 
        
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain };
        setChatHistory([greetingMessage]);
        speak(aiResult.skylarResponse);

      } catch (error) {
        handleGenericError(error, "session initiation");
      } finally {
        setIsLoadingAIResponse(false);
      }
    };
    
    if (speechApiSupported && typeof window !== "undefined") {
        if (window.speechSynthesis.getVoices().length === 0) {
          if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
              loadVoices();
              initiateSession();
              window.speechSynthesis.onvoiceschanged = null; 
            };
          } else { // Browsers that don't support onvoiceschanged might load voices directly
            loadVoices();
            initiateSession();
          }
        } else {
          loadVoices(); 
          initiateSession();
        }
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        if (isListening) { 
            speechRecognitionRef.current.stop();
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechApiSupported, loadVoices]); 

  const handleUserSpeech = async (userInput: string) => {
    setCurrentTranscript("");
    // No need to stop listening here, onresult already handles it before calling this.
    setChatHistory(prev => [...prev, { id: Date.now().toString(), speaker: "user", text: userInput, icon: User }]);
    setIsLoadingAIResponse(true);

    try {
      const safetyInput: SafetyNetActivationInput = { userInput };
      const safetyResult = await safetyNetActivation(safetyInput);

      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        setChatHistory(prev => [...prev, { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle }]);
        speak(safetyResult.safetyResponse, () => {
            if (isListening && speechRecognitionRef.current) { // Re-enable listening if it was on
                 try { speechRecognitionRef.current.start(); } catch(e) { console.warn("Could not restart recognition", e); }
            }
        });
        setIsLoadingAIResponse(false);
        return;
      }

      const aiInput: VoiceConversationWithSkylarInput = { userInput, sessionState };
      const aiResult = await voiceConversationWithSkylar(aiInput);
      
      setSessionState(aiResult.updatedSessionState);
      setChatHistory(prev => [...prev, { id: `skylar-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain }]);
      speak(aiResult.skylarResponse, () => {
         if (isListening && speechRecognitionRef.current) { // Check isListening state
            try {
                 speechRecognitionRef.current.start();
            } catch(e) {
                console.warn("Could not restart recognition after Skylar speech", e);
            }
         }
      });

    } catch (error) {
      handleGenericError(error, "user speech");
      // If an error occurs, and we were listening, try to restart listening.
      if (isListening && speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch(e) {
          console.warn("Could not restart recognition after AI error", e);
        }
      }
    } finally {
      setIsLoadingAIResponse(false);
    }
  };

  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) return;
  
    if (isListening) { // If currently listening, stop it.
      speechRecognitionRef.current.stop();
      setIsListening(false); // Manually update state
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); 
        setIsSkylarSpeaking(false);
      }
    } else { // If not listening, start it.
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
      try {
        // Check for permissions first, then start recognition
        // This might be redundant if browser auto-prompts, but good for explicit check
        if (navigator.permissions && navigator.permissions.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                 toast({
                    title: "Microphone Access Denied",
                    description: "Please allow microphone access in your browser settings to use voice input.",
                    variant: "destructive",
                 });
                 setIsListening(false);
                 return;
            }
        }
        // If permission is granted or prompt, start recognition
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        let description = "Could not start voice recognition. Please check your microphone and permissions.";
        if (err && err.name === "NotAllowedError") {
            description = "Microphone access was denied. Please enable it in your browser settings.";
        }
        toast({
          title: "Speech Recognition Start Error",
          description: description,
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
                "bg-destructive/20 text-destructive-foreground mx-auto border-destructive" // System critical messages
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
          disabled={!speechApiSupported || (isLoadingAIResponse && !isListening && !isSkylarSpeaking) } 
        >
          {isLoadingAIResponse && !isListening && !isSkylarSpeaking ? ( 
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
    