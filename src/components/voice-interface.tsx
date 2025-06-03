
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
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadVoices = useCallback(() => {
    if (!speechApiSupported || !window.speechSynthesis) {
      if (!voicesLoaded) setVoicesLoaded(true);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      let targetVoice: SpeechSynthesisVoice | null = null;
      const femaleVoiceKeywords = [
        "female", "woman", "girl",
        "samantha", "allison", "susan", "zoe", "victoria", "tessa", "linda", "heather", "eva",
        "jessa", "zira", "lucy", "anna", "claire", "emily", "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
      ];

      const enUSVoices = voices.filter(v => v.lang.startsWith("en-US"));
      targetVoice = enUSVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;

      if (!targetVoice && enUSVoices.length > 0) {
        targetVoice = enUSVoices.find(v => v.default) || enUSVoices[0];
      }

      if (!targetVoice) {
        const enVoices = voices.filter(v => v.lang.startsWith("en"));
        targetVoice = enVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
        if(!targetVoice && enVoices.length > 0) {
            targetVoice = enVoices.find(v => v.default) || enVoices[0];
        }
      }
      
      if (!targetVoice && voices.length > 0) {
        targetVoice = voices.find(v => v.default) || voices[0];
      }
      setSelectedVoice(targetVoice);
    } else {
      setSelectedVoice(null); 
    }
    if (!voicesLoaded) setVoicesLoaded(true);
  }, [speechApiSupported, voicesLoaded]); // Removed setSelectedVoice, setVoicesLoaded as they are setters

  useEffect(() => {
    if (speechApiSupported && window.speechSynthesis) {
      const initialVoices = window.speechSynthesis.getVoices();
      if (initialVoices.length > 0 || !window.speechSynthesis.onvoiceschanged) {
          loadVoices();
      }
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      if (!voicesLoaded) setVoicesLoaded(true); 
    }
    return () => {
      if (speechApiSupported && window.speechSynthesis) {
         if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = null;
         }
      }
    };
  }, [speechApiSupported, loadVoices, voicesLoaded]);

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

    if (!text || text.trim() === "") {
      console.warn("Attempted to speak empty text.");
      if (onEndCallback) onEndCallback();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang; // Set lang from selected voice if available
    } else {
      console.warn("Speaking with default voice/lang as selectedVoice is null.");
      utterance.lang = "en-US"; // Fallback lang
    }

    utterance.onstart = () => setIsSkylarSpeaking(true);
    utterance.onend = () => {
      setIsSkylarSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      let errorCode: string | SpeechSynthesisErrorCode = 'unknown_error';
      try {
        if (event && typeof event.error === 'string') {
          errorCode = event.error;
        }
      } catch (e) {
        // This catch is for accessing event.error, not for the main error logging
      }

      console.groupCollapsed(`[SpeechSynthesis Error] Code: ${errorCode} (Click to expand details)`);
      console.log("Error Event Object:", event);
      console.log("Error Code from event.error:", event.error);
      console.log("Utterance Text (first 100 chars):", `"${text.substring(0,100)}${text.length > 100 ? "..." : ""}"`);
      console.log("Utterance Voice:", utterance.voice ? { name: utterance.voice.name, lang: utterance.voice.lang, default: utterance.voice.default } : "Not set (using browser default)");
      console.log("Utterance Lang:", utterance.lang);
      console.log("Utterance Rate:", utterance.rate);
      console.log("Utterance Pitch:", utterance.pitch);
      console.log("Utterance Volume:", utterance.volume);
      console.log("Selected System Voice:", selectedVoice ? { name: selectedVoice.name, lang: selectedVoice.lang, default: selectedVoice.default } : "None selected");
      console.groupEnd();

      setIsSkylarSpeaking(false);

      if (errorCode === 'canceled' || errorCode === 'interrupted') {
        console.log(`Speech synthesis was ${errorCode}. This is often normal (e.g., user interruption).`);
      } else {
        toast({
          title: "Speech Error",
          description: `Could not play Skylar's response. (Details: ${errorCode})`,
          variant: "destructive",
        });
      }
      
      if (onEndCallback) {
        try {
          onEndCallback();
        } catch (cbError) {
          console.error("Error executing onEndCallback after speech synthesis error:", cbError);
        }
      }
    };
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); 
    }
    try {
      window.speechSynthesis.speak(utterance);
    } catch (speakError) {
      console.error("Critical error during window.speechSynthesis.speak() call:", speakError);
      setIsSkylarSpeaking(false);
      toast({
        title: "Critical Speech Error",
        description: "Failed to initiate speech playback. Check console for details.",
        variant: "destructive",
      });
      if (onEndCallback) {
         try { onEndCallback(); } catch (cbError) { console.error("Error in onEndCallback after speak() threw an error:", cbError); }
      }
    }
  }, [speechApiSupported, toast, selectedVoice, setIsSkylarSpeaking]);

  const handleGenericError = useCallback((error: any, context: "session initiation" | "user speech") => {
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
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast, setChatHistory]);
  
  const handleUserSpeech = useCallback(async (userInput: string) => {
    setCurrentTranscript("");
    setChatHistory(prev => [...prev, { id: Date.now().toString(), speaker: "user", text: userInput, icon: User }]);
    setIsLoadingAIResponse(true);

    try {
      const safetyInput: SafetyNetActivationInput = { userInput };
      const safetyResult = await safetyNetActivation(safetyInput);

      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        setChatHistory(prev => [...prev, { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle }]);
        speak(safetyResult.safetyResponse, () => {
            if (isListening && speechRecognitionRef.current) { 
                 try { speechRecognitionRef.current.start(); } catch(e) { console.warn("Could not restart recognition after safety response", e); }
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
         if (isListening && speechRecognitionRef.current) { 
            try {
                 speechRecognitionRef.current.start();
            } catch(e) {
                console.warn("Could not restart recognition after Skylar speech", e);
            }
         }
      });

    } catch (error) {
      handleGenericError(error, "user speech");
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
  }, [sessionState, speak, handleGenericError, isListening, setChatHistory, setSessionState, setIsLoadingAIResponse, setCurrentTranscript]);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition || !window.speechSynthesis) {
        setSpeechApiSupported(false);
        if (! (window.SpeechRecognition || window.webkitSpeechRecognition) || !window.speechSynthesis) {
            toast({
                title: "Browser Not Supported",
                description: "Your browser does not support the Web Speech API needed for voice interaction.",
                variant: "destructive",
                duration: Infinity,
            });
             setChatHistory(prev => prev.length === 0 ? [{ id: `system-no-voice-${Date.now()}`, speaker: "system", text: "Voice interaction is not supported by your browser. This app requires voice.", icon: AlertTriangle }] : prev);
        }
        return;
      }
      setSpeechApiSupported(true);

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
          if (speechRecognitionRef.current && isListening) {
             try { speechRecognitionRef.current.stop(); } catch(e) { console.warn("Error stopping recognition on final result:", e); }
          }
          handleUserSpeech(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("SpeechRecognition Error:", event.error, event);
        
        let toastMessage = "An unknown error occurred with speech recognition.";
        let shouldStopGlobalListening = false;
        let autoRestart = false;

        switch (event.error) {
          case 'not-allowed':
          case 'security':
            toastMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
            shouldStopGlobalListening = true;
            break;
          case 'audio-capture':
            toastMessage = "Audio capture failed. Please check your microphone and ensure it's working.";
            shouldStopGlobalListening = true;
            break;
          case 'no-speech':
            if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
              autoRestart = true; 
            } else if (!isListening) {
              // If not actively listening, it might be a deliberate stop or an initial failure
              // toastMessage = "No speech detected. Please try speaking again."; // Potentially too noisy
              return; // Avoid toast for no-speech if not in an active listening loop expecting input
            } else {
              // Still listening, but skylar or AI is busy, so no-speech is less critical
              console.log("No speech detected while system was busy or user wasn't expected to speak.");
              return; // Suppress toast
            }
            break;
          case 'network':
             toastMessage = "Network error during speech recognition. Please check connection.";
             if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
               autoRestart = true; // Attempt to restart if in active listening state
            }
            break;
          case 'aborted':
            console.log("Speech recognition aborted (potentially by application).");
            if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
                autoRestart = true; // If aborted but still in listening mode, try to restart
            } else {
                return; // If not in listening mode, or skylar/AI busy, this is likely an expected stop.
            }
            break;
          default: // For 'service-not-allowed', 'bad-grammar', 'language-not-supported' or unknown errors
            shouldStopGlobalListening = true;
            break;
        }

        if (autoRestart) {
            console.log(`Attempting to auto-restart recognition due to: ${event.error}`);
            setCurrentTranscript(""); // Clear any partial transcript
            setTimeout(() => {
                try {
                    if (isListening && speechRecognitionRef.current) speechRecognitionRef.current.start();
                } catch (e) {
                    console.warn(`Could not auto-restart recognition after ${event.error}:`, e);
                    if (isListening) setIsListening(false); 
                }
            }, 100); 
             // Suppress toast for these auto-restarting cases.
            if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') return;
        }
        
        toast({
            title: "Speech Recognition Error",
            description: toastMessage,
            variant: "destructive",
        });

        if (shouldStopGlobalListening && isListening) {
          setIsListening(false);
        }
      };
      
      recognition.onend = () => {
        // This onend is for SpeechRecognition, not SpeechSynthesis
        if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && speechRecognitionRef.current) {
          console.log("SpeechRecognition service ended. Attempting restart if still in listening mode.");
          try {
            speechRecognitionRef.current.start();
          } catch (e) {
            if (e && e.name !== 'InvalidStateError') { 
                console.warn("Could not restart recognition from onend:", e);
            } else if (e && e.name === 'InvalidStateError') {
                console.log("Recognition already started or in invalid state, not restarting from onend.");
            }
          }
        }
      };
      
      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        if (speechRecognitionRef.current.stop) { 
             try { speechRecognitionRef.current.stop(); } catch (e) { console.warn("Error stopping recognition on unmount:", e); }
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechApiSupported, toast, handleUserSpeech, isListening, isSkylarSpeaking, isLoadingAIResponse]); // Added dependencies from handleUserSpeech for correctness

  useEffect(() => {
    const initiateSession = async () => {
      if (isLoadingAIResponse || chatHistory.length > 0 || !voicesLoaded || !speechApiSupported) return;

      setIsLoadingAIResponse(true);
      try {
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await voiceConversationWithSkylar(aiInput);
        
        setSessionState(aiResult.updatedSessionState); 
        
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar" as const, text: aiResult.skylarResponse, icon: Brain };
        setChatHistory([greetingMessage]);
        speak(aiResult.skylarResponse, () => {
            // After initial greeting, if still in listening mode (though it shouldn't be active yet)
            if (isListening && speechRecognitionRef.current) {
                try { speechRecognitionRef.current.start(); } catch(e) {console.warn("Could not start recognition after initial greeting", e);}
            }
        });

      } catch (error) {
        handleGenericError(error, "session initiation");
      } finally {
        setIsLoadingAIResponse(false);
      }
    };
    
    if (speechApiSupported && voicesLoaded && chatHistory.length === 0 && !isLoadingAIResponse) { // Added !isLoadingAIResponse to prevent re-trigger
      initiateSession();
    }
  }, [speechApiSupported, voicesLoaded, chatHistory.length, speak, handleGenericError, isLoadingAIResponse, setSessionState, isListening]); 


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
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
      try {
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
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        let description = "Could not start voice recognition. Please check your microphone and permissions.";
        if (err && err.name === "NotAllowedError") { 
            description = "Microphone access was denied. Please enable it in your browser settings.";
        } else if (err && err.name === "InvalidStateError"){ 
            description = "Listening already started or in an invalid state. Please wait or try refreshing.";
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
    

    

    

    

    