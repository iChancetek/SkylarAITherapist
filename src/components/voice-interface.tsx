
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
  }, [speechApiSupported, voicesLoaded]); // voicesLoaded dependency is important here

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
      utterance.lang = selectedVoice.lang; 
    } else {
      console.warn("Speaking with default voice/lang as selectedVoice is null.");
      utterance.lang = "en-US"; 
    }

    utterance.onstart = () => setIsSkylarSpeaking(true);
    utterance.onend = () => {
      setIsSkylarSpeaking(false);
      if (onEndCallback) onEndCallback();
      if (isListening && speechRecognitionRef.current) {
        console.log("Skylar finished speaking, attempting to restart recognition.");
        manuallyStoppedRef.current = false; 
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("Could not restart recognition after Skylar speech", e);
          setIsListening(false); 
        }
      }
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      let errorCode: string | SpeechSynthesisErrorCode = 'unknown_error';
      try {
        if (event && typeof event.error === 'string') {
          errorCode = event.error;
        }
      } catch (e) {
        // Error accessing event.error
      }

      console.groupCollapsed(`[SpeechSynthesis Error] Code: ${errorCode} (Click to expand details)`);
      console.log("Error Event Object:", event);
      console.log("Error Code from event.error:", errorCode);
      console.log("Utterance Text (first 100 chars):", `"${text.substring(0,100)}${text.length > 100 ? "..." : ""}"`);
      console.log("Utterance Voice:", utterance.voice ? { name: utterance.voice.name, lang: utterance.voice.lang, default: utterance.voice.default } : "Not set (using browser default)");
      console.log("Utterance Lang:", utterance.lang);
      console.log("Utterance Rate:", utterance.rate);
      console.log("Utterance Pitch:", utterance.pitch);
      console.log("Utterance Volume:", utterance.volume);
      console.log("Selected System Voice:", selectedVoice ? { name: selectedVoice.name, lang: selectedVoice.lang, default: selectedVoice.default } : "None selected");
      console.groupEnd();

      setIsSkylarSpeaking(false);

      if (errorCode !== 'canceled' && errorCode !== 'interrupted') {
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
            if (isListening && speechRecognitionRef.current) { 
                 manuallyStoppedRef.current = false;
                 try { speechRecognitionRef.current.start(); } catch(e) { 
                    console.warn("Could not restart recognition after safety response", e);
                    setIsListening(false);
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
      if (isListening && speechRecognitionRef.current) { 
        console.log("Error in handleUserSpeech, attempting to restart recognition.");
        manuallyStoppedRef.current = false; 
        try {
          speechRecognitionRef.current.start();
        } catch(e) {
          console.warn("Could not restart recognition after AI error", e);
          setIsListening(false);
        }
      }
    } finally {
      setIsLoadingAIResponse(false);
    }
  }, [sessionState, speak, handleGenericError, isListening, setChatHistory, setSessionState, setIsLoadingAIResponse, setCurrentTranscript]);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionImpl || !window.speechSynthesis) {
        setSpeechApiSupported(false);
        if (!voicesLoaded) { // ensure voicesLoaded is set if API is not supported
            setVoicesLoaded(true);
        }
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

      const recognition = new SpeechRecognitionImpl();
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
        console.error("SpeechRecognition Error:", event.error, "Full event:", event);
        
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
            toastMessage = "No speech detected. Please try speaking again.";
            if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
              autoRestart = true; 
            }
            break;
          case 'network':
             toastMessage = "Network error during speech recognition. Please check connection.";
             if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
               autoRestart = true; 
            }
            break;
          case 'aborted':
            console.log("Speech recognition aborted.");
            if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) { 
                autoRestart = true; 
            } else {
                setIsListening(false); // Ensure state consistency if aborted and not restarting
                return; 
            }
            break;
          case 'service-not-allowed':
            toastMessage = "Speech recognition service is not allowed. Your browser or a policy might be blocking it.";
            shouldStopGlobalListening = true;
            break;
          case 'bad-grammar': 
            toastMessage = "Speech recognition could not understand the input due to grammar issues.";
             if (isListening && speechRecognitionRef.current && !isSkylarSpeaking && !isLoadingAIResponse) {
               autoRestart = true; 
            }
            break;
          case 'language-not-supported':
            toastMessage = "The configured language for speech recognition is not supported.";
            shouldStopGlobalListening = true;
            break;
          default: 
            shouldStopGlobalListening = true; 
            break;
        }

        if (autoRestart) {
            console.log(`Attempting to auto-restart recognition due to: ${event.error}`);
            setCurrentTranscript(""); 
            manuallyStoppedRef.current = false;
            setTimeout(() => {
                try {
                    if (isListening && speechRecognitionRef.current) {
                         speechRecognitionRef.current.start();
                    }
                } catch (e) {
                    console.warn(`Could not auto-restart recognition after ${event.error}:`, e);
                    if (isListening) setIsListening(false); 
                }
            }, 100); 
            if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted' || event.error === 'bad-grammar') {
                 if(event.error === 'no-speech') console.log("No speech detected, restarting listening."); 
                 return;
            }
        }
        
        toast({
            title: "Speech Recognition Error",
            description: toastMessage,
            variant: "destructive",
        });

        if (shouldStopGlobalListening && isListening) {
          setIsListening(false);
          manuallyStoppedRef.current = true; // Treat as if manually stopped to prevent onend restart
          if (speechRecognitionRef.current) {
            try {
                speechRecognitionRef.current.stop();
            } catch (e) {
                console.warn("Error stopping recognition after critical error:", e);
            }
          }
        }
      };
      
      recognition.onend = () => {
        console.log("SpeechRecognition service ended. manuallyStoppedRef:", manuallyStoppedRef.current, "isListening:", isListening, "isSkylarSpeaking:", isSkylarSpeaking, "isLoadingAIResponse:", isLoadingAIResponse);
        if (manuallyStoppedRef.current) {
          console.log("Recognition ended due to manual stop. Not restarting.");
          setIsListening(false); 
          return;
        }
        
        if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && speechRecognitionRef.current) {
          console.log("Attempting restart from onend as conditions met (not a manual stop).");
          try {
            speechRecognitionRef.current.start();
          } catch (e: any) {
            if (e && e.name !== 'InvalidStateError') { 
                console.warn("Could not restart recognition from onend:", e);
                setIsListening(false);
            } else if (e && e.name === 'InvalidStateError') {
                console.log("Recognition already started or in invalid state, not restarting from onend.");
            }
          }
        } else {
            console.log("Not restarting recognition from onend (conditions not met or manual stop was processed). Current isListening:", isListening);
            if(isListening && (isSkylarSpeaking || isLoadingAIResponse)) {
              // If listening was true, but we didn't restart because Skylar is busy,
              // it implies we expect it to be restarted by speak's onEnd or handleUserSpeech's finally block.
              // No action needed here, just logging.
            } else if (isListening) {
              // isListening is true but other conditions not met, and not a manual stop. This is an anomaly.
              console.warn("onend: isListening is true, but not restarting and not a manual stop. Setting isListening to false.");
              setIsListening(false);
            }
        }
      };
      
      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (speechRecognitionRef.current) {
        manuallyStoppedRef.current = true; // Ensure it stops on unmount
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
  }, [speechApiSupported, voicesLoaded, toast, handleUserSpeech, isListening, isSkylarSpeaking, isLoadingAIResponse]); 

  useEffect(() => {
    const initiateSession = async () => {
      if (isLoadingAIResponse || chatHistory.length > 0 || !voicesLoaded || !speechApiSupported) return;

      setIsLoadingAIResponse(true);
      try {
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        console.log("Initiating session with AI...");
        const aiResult = await voiceConversationWithSkylar(aiInput);
        console.log("AI session initiated, response:", aiResult.skylarResponse);
        
        setSessionState(aiResult.updatedSessionState); 
        
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar" as const, text: aiResult.skylarResponse, icon: Brain };
        setChatHistory([greetingMessage]);
        speak(aiResult.skylarResponse);

      } catch (error) {
        console.error("Error during session initiation in useEffect:", error);
        handleGenericError(error, "session initiation");
      } finally {
        setIsLoadingAIResponse(false);
      }
    };
    
    if (speechApiSupported && voicesLoaded && chatHistory.length === 0 && !isLoadingAIResponse) { 
      initiateSession();
    }
  // Dependencies for initial session: ensure it only runs when truly ready and hasn't run yet.
  // speak, handleGenericError, setSessionState are stable or wrapped in useCallback.
  }, [speechApiSupported, voicesLoaded, chatHistory.length, isLoadingAIResponse, speak, handleGenericError, setSessionState]);


  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) {
        toast({ title: "Voice Error", description: "Speech recognition is not supported or not initialized.", variant: "destructive"});
        setIsListening(false);
        return;
    }
  
    if (isListening) { 
      console.log("Manually stopping listening.");
      manuallyStoppedRef.current = true; 
      try {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
        }
      } catch (e) {
        console.warn("Error stopping speech recognition:", e);
      }
      setIsListening(false); // Set state immediately
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); 
        setIsSkylarSpeaking(false);
      }
    } else { 
      console.log("Attempting to start listening manually.");
      manuallyStoppedRef.current = false; 
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
             if (permissionStatus.state === 'prompt') {
                 toast({
                    title: "Microphone Access",
                    description: "Please allow microphone access when prompted by your browser.",
                 });
            }
        }
        speechRecognitionRef.current.start();
        setIsListening(true);
        console.log("Speech recognition started by toggleListening.");
      } catch (err: any) {
        console.error("Error starting speech recognition in toggleListening:", err);
        let description = "Could not start voice recognition. Please check your microphone and permissions.";
        if (err && err.name === "NotAllowedError") { 
            description = "Microphone access was denied. Please enable it in your browser settings.";
        } else if (err && err.name === "InvalidStateError"){ 
            description = "Listening service is busy or in an invalid state. Please wait or try again.";
            try {
                if (speechRecognitionRef.current) {
                    // Attempt to abort and restart might be too aggressive here,
                    // let's just ensure the state is correct.
                    console.warn("InvalidStateError encountered when trying to start listening.");
                }
            } catch (abortErr) {
                console.warn("Could not handle InvalidStateError:", abortErr);
            }
        } else if (err && err.name === "NoSpeechError") {
            description = "No speech was detected. Make sure your microphone is working and try speaking clearly.";
        } else if (err && err.name === "AudioCaptureError") {
            description = "Microphone not found or not working. Please check your microphone connection and settings.";
        }
        
        toast({
          title: "Speech Recognition Start Error",
          description: description,
          variant: "destructive",
        });
        setIsListening(false); // Ensure UI reflects failure to start
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
    

    

    

    

    

    

    

    