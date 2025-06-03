
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
  const manuallyStoppedRef = useRef(false);
  const sessionInitiatedRef = useRef(false);
  const { toast } = useToast();

  const loadVoices = useCallback(() => {
    if (!speechApiSupported || !window.speechSynthesis) {
      setVoicesLoaded(true); // API not supported, consider voice loading 'complete'
      return;
    }
    const voices = window.speechSynthesis.getVoices();

    if (voices.length === 0) {
      // Voices might not be loaded yet if onvoiceschanged is supported,
      // or if not supported, then there are no voices.
      if (!window.speechSynthesis.onvoiceschanged) {
        console.warn("[LoadVoices] No voices found and onvoiceschanged is not supported.");
        setVoicesLoaded(true); 
      }
      return; // Wait for onvoiceschanged or conclude if not supported
    }
    
    let targetVoice: SpeechSynthesisVoice | null = null;
    const femaleVoiceKeywords = [
      "female", "woman", "girl", "samantha", "allison", "susan", "zoe", "victoria", "tessa",
      "linda", "heather", "eva", "jessa", "zira", "lucy", "anna", "claire", "emily", 
      "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
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
    console.log("[LoadVoices] Selected voice:", targetVoice ? targetVoice.name : "None");
    setVoicesLoaded(true); // Mark voices as processed
  }, [speechApiSupported, setSelectedVoice, setVoicesLoaded]);


  useEffect(() => {
    if (typeof window !== "undefined") {
        const browserSupportsSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        const browserSupportsSpeechSynthesis = !!window.speechSynthesis;

        if (!browserSupportsSpeechRecognition || !browserSupportsSpeechSynthesis) {
            setSpeechApiSupported(false);
            setVoicesLoaded(true); // If APIs not supported, consider "loading" done.
            toast({
                title: "Browser Not Supported",
                description: "Your browser does not support the Web Speech API needed for voice interaction. This app requires voice.",
                variant: "destructive",
                duration: Infinity,
            });
             if (chatHistory.length === 0) {
                setChatHistory([{ id: `system-no-voice-${Date.now()}`, speaker: "system", text: "Voice interaction is not supported by your browser. This app requires voice.", icon: AlertTriangle }]);
            }
            return;
        }
        setSpeechApiSupported(true);

        if (browserSupportsSpeechSynthesis) {
            const initialVoices = window.speechSynthesis.getVoices();
            if (initialVoices.length > 0) { // Voices might be available synchronously
                loadVoices();
            }
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            } else if (initialVoices.length === 0) {
                 // No onvoiceschanged support and no initial voices
                console.warn("[Voices] No voices found initially and onvoiceschanged is not supported.");
                setVoicesLoaded(true); // Consider loading done
            }
        } else {
             setVoicesLoaded(true); // Speech synthesis not supported
        }
    } else {
        setSpeechApiSupported(false);
        setVoicesLoaded(true);
    }

    return () => {
      if (speechApiSupported && typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices, toast, chatHistory.length, setSpeechApiSupported, setVoicesLoaded]);


  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [chatHistory]);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    console.log("[Speak] Called with text:", `"${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
    if (!speechApiSupported || !window.speechSynthesis) {
      console.warn("[Speak] Speech synthesis not supported or not initialized.");
      if (onEndCallback) onEndCallback();
      return;
    }

    if (!text || text.trim() === "") {
      console.warn("[Speak] Attempted to speak empty text.");
      if (onEndCallback) onEndCallback();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang; 
      console.log("[Speak] Using selected voice:", selectedVoice.name, `(${selectedVoice.lang})`);
    } else {
      console.warn("[Speak] selectedVoice is null. Using default lang 'en-US'.");
      utterance.lang = "en-US"; 
    }

    utterance.onstart = () => {
        console.log("[Speak] Utterance started.");
        setIsSkylarSpeaking(true);
    }
    utterance.onend = () => {
      console.log("[Speak] Utterance ended.");
      setIsSkylarSpeaking(false);
      if (onEndCallback) onEndCallback();
      if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
        console.log("[Speak] Skylar finished speaking, attempting to restart recognition.");
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("[Speak] Could not restart recognition after Skylar speech", e);
        }
      }
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      let errorCode: string | SpeechSynthesisErrorCode = 'unknown_error';
      try {
        if (event && typeof event.error === 'string') {
          errorCode = event.error;
        }
      } catch (e) { /* Error accessing event.error */ }

      console.groupCollapsed(`[Speak] SpeechSynthesis Error! Code: ${errorCode}`);
      console.log("  - Event Object (raw):", event);
      console.log("  - Utterance Text (first 100 chars):", `"${text.substring(0,100)}${text.length > 100 ? "..." : ""}"`);
      console.log("  - Utterance Voice:", utterance.voice ? { name: utterance.voice.name, lang: utterance.voice.lang, default: utterance.voice.default } : "Not set (using browser default)");
      console.log("  - Utterance Lang:", utterance.lang);
      console.log("  - Selected System Voice:", selectedVoice ? { name: selectedVoice.name, lang: selectedVoice.lang, default: selectedVoice.default } : "None selected / voices not loaded");
      console.groupEnd();
      
      setIsSkylarSpeaking(false);

      if (errorCode !== 'canceled' && errorCode !== 'interrupted') {
        toast({
          title: "Speech Error",
          description: `Could not play Skylar's response. (Error: ${errorCode})`,
          variant: "destructive",
        });
      }
      
      if (onEndCallback) {
        try {
          onEndCallback();
        } catch (cbError) {
          console.error("[Speak] Error executing onEndCallback after speech synthesis error:", cbError);
        }
      }
    };
    
    if (window.speechSynthesis.speaking) {
      console.log("[Speak] Cancelling existing speech synthesis.");
      window.speechSynthesis.cancel(); 
    }
    try {
      console.log("[Speak] Attempting window.speechSynthesis.speak(utterance)");
      window.speechSynthesis.speak(utterance);
    } catch (speakError) {
      console.error("[Speak] Critical error during window.speechSynthesis.speak() call:", speakError);
      setIsSkylarSpeaking(false);
      toast({
        title: "Critical Speech Error",
        description: "Failed to initiate speech playback. Check console for details.",
        variant: "destructive",
      });
      if (onEndCallback) {
         try { onEndCallback(); } catch (cbError) { console.error("[Speak] Error in onEndCallback after speak() threw an error:", cbError); }
      }
    }
  }, [speechApiSupported, toast, selectedVoice, setIsSkylarSpeaking, isListening]); 
  
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
          if (isListening && speechRecognitionRef.current && !manuallyStoppedRef.current) { 
            try { speechRecognitionRef.current.start(); } catch(e) { 
              console.warn("Could not restart recognition after safety response", e);
            }
          }
        });
        setIsLoadingAIResponse(false);
        return;
      }

      const aiInput: VoiceConversationWithSkylarInput = { userInput, sessionState };
      const aiResult = await voiceConversationWithSkylar(aiInput);
      
      setSessionState(aiResult.updatedSessionState);
      setChatHistory(prev => [...prev, { id: `skylar-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain }]);
      speak(aiResult.skylarResponse); 

    } catch (error) {
      handleGenericError(error, "user speech");
      if (isListening && speechRecognitionRef.current && !manuallyStoppedRef.current) { 
        console.log("Error in handleUserSpeech, attempting to restart recognition.");
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
    if (!speechApiSupported || typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
        return;
    }

    if (!speechRecognitionRef.current) {
        speechRecognitionRef.current = new SpeechRecognitionImpl();
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = true;
        speechRecognitionRef.current.lang = "en-US";
    }
    
    const recognition = speechRecognitionRef.current;

    const onResultHandler = (event: SpeechRecognitionEvent) => {
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
      setCurrentTranscript(finalTranscript); 
      if (finalTranscript.trim()) {
        if (isListening) { 
            try { recognition.stop(); } catch(e) { console.warn("Error stopping recognition on final result:", e); }
        }
        handleUserSpeech(finalTranscript.trim()); 
      }
    };

    const onErrorHandler = (event: SpeechRecognitionErrorEvent) => {
      console.error("SpeechRecognition Error:", event.error, "Full event:", event);
      
      let toastMessage = "An unknown error occurred with speech recognition.";
      let shouldStopGlobalListening = false;
      let autoRestart = false;

      switch (event.error) {
        case 'not-allowed': case 'security':
          toastMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
          shouldStopGlobalListening = true; break;
        case 'audio-capture':
          toastMessage = "Audio capture failed. Please check your microphone.";
          shouldStopGlobalListening = true; break;
        case 'no-speech':
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) autoRestart = true;
          else { toastMessage = "No speech detected. Please try speaking again."; }
          break;
        case 'network':
          toastMessage = "Network error during speech recognition. Please check connection.";
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) autoRestart = true;
          break;
        case 'aborted':
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) autoRestart = true;
          else { setIsListening(false); return; }
          break;
        case 'service-not-allowed':
          toastMessage = "Speech recognition service is not allowed."; shouldStopGlobalListening = true; break;
        case 'bad-grammar': 
          toastMessage = "Speech recognition could not understand the input.";
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) autoRestart = true;
          break;
        case 'language-not-supported':
          toastMessage = "The configured language for speech recognition is not supported."; shouldStopGlobalListening = true; break;
        default: shouldStopGlobalListening = true; break;
      }

      if (autoRestart && recognition) {
          setCurrentTranscript(""); 
          setTimeout(() => {
              try {
                  if (isListening && !manuallyStoppedRef.current) recognition.start();
                  else if (isListening && manuallyStoppedRef.current) setIsListening(false);
              } catch (e) {
                  if (isListening) setIsListening(false); 
              }
          }, 100); 
          // Only show toast for non-auto-restarting 'aborted' or 'no-speech'
          if (event.error === 'no-speech' && !autoRestart) {
             toast({ title: "Speech Recognition", description: toastMessage, variant: "default" });
          } else if (event.error === 'aborted' && !autoRestart) {
             // This is a manual stop, no toast needed.
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
             toast({ title: "Speech Recognition Error", description: toastMessage, variant: "destructive" });
          }

      } else if (!autoRestart) { // If not auto-restarting, always show appropriate toast
        toast({ title: event.error === 'no-speech' ? "Speech Recognition" : "Speech Recognition Error", description: toastMessage, variant: event.error === 'no-speech' ? "default" : "destructive" });
      }
      
      if (shouldStopGlobalListening && isListening) {
        manuallyStoppedRef.current = true;
        setIsListening(false); 
        if (recognition) try { recognition.stop(); } catch (e) { console.warn("Error stopping recognition after critical error:", e); }
      } else if (!isListening && shouldStopGlobalListening) {
         manuallyStoppedRef.current = true;
      }
    };
    
    const onEndHandler = () => {
      if (manuallyStoppedRef.current) {
        if(isListening) setIsListening(false);
        return;
      }
      if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && recognition) {
        try {
          recognition.start();
        } catch (e: any) {
          if (e?.name !== 'InvalidStateError') {
             console.warn("onEndHandler: Error restarting recognition, setting isListening to false.", e);
             setIsListening(false);
          } else {
             console.warn("onEndHandler: InvalidStateError trying to restart recognition, already started or stopped.", e);
          }
        }
      } else if (isListening) {
          // If isListening is true but conditions not met for restart (e.g. Skylar speaking)
          // it might mean recognition stopped prematurely. Consider if setIsListening(false) is needed here.
          // For now, assume other logic handles this transition.
          console.log("onEndHandler: Recognition ended, but not restarting due to Skylar speaking or loading AI response, or already stopped.");
      }
    };

    recognition.onresult = onResultHandler;
    recognition.onerror = onErrorHandler;
    recognition.onend = onEndHandler;
    
    return () => {
      if (speechRecognitionRef.current) {
        manuallyStoppedRef.current = true; 
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        try { speechRecognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (speechApiSupported && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechApiSupported, handleUserSpeech, toast, setIsSkylarSpeaking, setCurrentTranscript, isListening, isLoadingAIResponse]);


  useEffect(() => {
    const initiateSessionAsync = async () => {
      if (sessionInitiatedRef.current || !speechApiSupported || !voicesLoaded || chatHistory.length > 0 || isLoadingAIResponse) {
         return;
      }
      sessionInitiatedRef.current = true; 
      console.log("[Session] Initiating session...");

      setIsLoadingAIResponse(true);
      try {
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await voiceConversationWithSkylar(aiInput);
        
        setSessionState(aiResult.updatedSessionState); 
        
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar" as const, text: aiResult.skylarResponse, icon: Brain };
        setChatHistory([greetingMessage]);
        speak(aiResult.skylarResponse);

      } catch (error) {
        handleGenericError(error, "session initiation");
        sessionInitiatedRef.current = false; 
      } finally {
        setIsLoadingAIResponse(false);
      }
    };
    
    if (voicesLoaded && speechApiSupported && !sessionInitiatedRef.current) { 
        initiateSessionAsync();
    }

  }, [speechApiSupported, voicesLoaded, chatHistory.length, speak, handleGenericError, setSessionState, setIsLoadingAIResponse]);


  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) {
        toast({ title: "Voice Error", description: "Speech recognition is not supported or not initialized.", variant: "destructive"});
        setIsListening(false);
        return;
    }
    const recognition = speechRecognitionRef.current;
  
    if (isListening) { 
      manuallyStoppedRef.current = true; 
      try {
        recognition.stop();
      } catch (e) {
        console.warn("Error stopping speech recognition:", e);
      }
      setIsListening(false); 
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); 
        setIsSkylarSpeaking(false);
      }
    } else { 
      manuallyStoppedRef.current = false; 
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }

      try {
        if (navigator.permissions && navigator.permissions.query) { 
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                 toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
                 setIsListening(false); return;
            }
             if (permissionStatus.state === 'prompt') {
                 toast({ title: "Microphone Access", description: "Please allow microphone access when prompted." });
            }
        }
        recognition.start();
        setIsListening(true);
      } catch (err: any) {
        console.error("Error starting speech recognition in toggleListening:", err);
        let description = "Could not start voice recognition. Check mic and permissions.";
        if (err?.name === "NotAllowedError") description = "Microphone access denied. Enable in browser settings.";
        else if (err?.name === "InvalidStateError") description = "Listening service busy. Wait or try again.";
        // NoSpeechError and AudioCaptureError are typically handled by the onerror handler
        
        toast({ title: "Speech Recognition Start Error", description: description, variant: "destructive" });
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
        {!speechApiSupported && voicesLoaded && (
            <p className="text-xs text-destructive text-center mt-2">
                { chatHistory.length > 0 && chatHistory[0].id.startsWith('system-no-voice-') 
                  ? "Voice interaction is not supported by your browser. This app requires voice functionality."
                  : "Voice APIs are not fully supported by this browser. Please check your browser settings or try a different browser for the best experience."
                }
            </p>
        )}
      </footer>
    </div>
  );
}
    
