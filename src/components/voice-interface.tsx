
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
  const [sessionState, setSessionState] =useState<string | undefined>(undefined);
  const [isLoadingAIResponse, setIsLoadingAIResponse] = useState(false);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const manuallyStoppedRef = useRef(false);
  const sessionInitiatedRef = useRef(false);
  const voicesLoadedRef = useRef(voicesLoaded); 
  const { toast } = useToast();

  useEffect(() => {
    voicesLoadedRef.current = voicesLoaded;
  }, [voicesLoaded]);

  useEffect(() => {
    console.log("[VoiceDebug] selectedVoice state changed to:", selectedVoice ? selectedVoice.name : "null");
  }, [selectedVoice]);

  const loadVoices = useCallback(() => {
    if (!speechApiSupported || !window.speechSynthesis) {
      console.warn("[LoadVoices] Speech synthesis not supported or API not available. Marking voices as loaded to allow fallbacks.");
      setVoicesLoaded(true);
      return;
    }
    const allAvailableVoices = window.speechSynthesis.getVoices();
    console.log(`[LoadVoices] Attempting to load voices. Found ${allAvailableVoices.length} voices initially.`);

    if (allAvailableVoices.length === 0) {
      if (window.speechSynthesis.onvoiceschanged === undefined) {
        console.warn("[LoadVoices] No voices found yet, and onvoiceschanged event not supported. App will try to use system default. Marking voices as loaded.");
        setVoicesLoaded(true); 
      } else {
        console.log("[LoadVoices] No voices found yet, but onvoiceschanged is supported. Waiting for event to populate voices.");
      }
      return;
    }

    let targetVoice: SpeechSynthesisVoice | null = null;
    const femaleVoiceKeywords = [
      "female", "woman", "girl", "samantha", "allison", "susan", "zoe", "victoria", "tessa",
      "linda", "heather", "eva", "jessa", "zira", "lucy", "anna", "claire", "emily",
      "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
    ];

    const enUSVoices = allAvailableVoices.filter(v => v.lang.startsWith("en-US"));
    console.log(`[LoadVoices] Found ${enUSVoices.length} en-US voices.`);
    targetVoice = enUSVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;

    if (!targetVoice && enUSVoices.length > 0) {
      targetVoice = enUSVoices.find(v => v.default) || enUSVoices[0];
      console.log(`[LoadVoices] No specific female en-US voice found. Selected default or first en-US voice: ${targetVoice?.name}`);
    }

    if (!targetVoice) {
      const enVoices = allAvailableVoices.filter(v => v.lang.startsWith("en"));
      console.log(`[LoadVoices] No en-US voice match. Found ${enVoices.length} 'en' (any region) voices.`);
      targetVoice = enVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
      if (!targetVoice && enVoices.length > 0) {
        targetVoice = enVoices.find(v => v.default) || enVoices[0];
        console.log(`[LoadVoices] No specific female 'en' voice found. Selected default or first 'en' voice: ${targetVoice?.name}`);
      }
    }
    
    if (!targetVoice && allAvailableVoices.length > 0) {
        targetVoice = allAvailableVoices.find(v => v.default) || allAvailableVoices[0];
        console.log(`[LoadVoices] No English voice match. Selected system default or first available voice: ${targetVoice?.name}`);
    }

    setSelectedVoice(targetVoice);
    console.log("[LoadVoices] Final selected voice by loadVoices:", targetVoice ? targetVoice.name : "None (will use browser default/fallback)");
    setVoicesLoaded(true);
  }, [speechApiSupported, setSelectedVoice, setVoicesLoaded]);


  useEffect(() => { // VoiceInitEffect
    console.log("[VoiceInitEffect] Running voice initialization effect.");
    let voiceLoadTimeoutId: NodeJS.Timeout | null = null;

    if (typeof window === "undefined") {
      console.log("[VoiceInitEffect] Window is undefined. Setting speechApiSupported=false, voicesLoaded=true (to unblock).");
      setSpeechApiSupported(false);
      setVoicesLoaded(true);
      return;
    }

    const browserSupportsSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const browserSupportsSpeechSynthesis = !!window.speechSynthesis;

    if (!browserSupportsSpeechRecognition || !browserSupportsSpeechSynthesis) {
      console.warn("[VoiceInitEffect] Browser does not support required Speech APIs. speechApiSupported=false, voicesLoaded=true.");
      setSpeechApiSupported(false);
      setVoicesLoaded(true); 
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the Web Speech API needed for voice interaction. This app requires voice.",
        variant: "destructive",
        duration: Infinity,
      });
      return;
    }

    console.log("[VoiceInitEffect] Browser supports Speech APIs. speechApiSupported=true.");
    setSpeechApiSupported(true);

    if (browserSupportsSpeechSynthesis) {
      console.log("[VoiceInitEffect] Attempting initial voice load by calling loadVoices() directly.");
      loadVoices(); 
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        console.log("[VoiceInitEffect] Setting onvoiceschanged handler.");
        window.speechSynthesis.onvoiceschanged = loadVoices;
      } else {
         console.warn("[VoiceInitEffect] onvoiceschanged not supported by browser. Relied on initial loadVoices call.");
      }
      
      voiceLoadTimeoutId = setTimeout(() => {
        if (!voicesLoadedRef.current) { // Check ref here
          console.warn("[VoiceInitEffect TIMEOUT] Voices not loaded after 3 seconds. Forcing voicesLoaded=true to unblock.");
          setVoicesLoaded(true); // This will trigger the voicesLoadedRef.current update via its own useEffect
        }
      }, 3000);

    } else {
      console.warn("[VoiceInitEffect] Speech synthesis explicitly not supported by browser. Setting voicesLoaded=true.");
      setVoicesLoaded(true);
    }

    return () => {
      if (voiceLoadTimeoutId) {
        clearTimeout(voiceLoadTimeoutId);
      }
      if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        console.log("[VoiceInitEffectCleanup] Removing onvoiceschanged handler.");
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices, setSpeechApiSupported, toast]); 


  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [chatHistory]);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!text || text.trim() === "") {
      console.warn("[Speak] Attempted to speak empty text. Aborting.");
      if (onEndCallback) onEndCallback();
      return;
    }
    
    console.log(`[Speak] Attempting to speak. Text (first 50 chars): "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}". Voices loaded (state): ${voicesLoaded}, Voices loaded (ref): ${voicesLoadedRef.current}. Selected voice (state): ${selectedVoice?.name || "None"}`);
    
    if (!speechApiSupported || !window.speechSynthesis) {
      console.warn("[Speak] Speech synthesis not supported or not initialized. Aborting.");
      toast({ title: "Speech Error", description: "Cannot play audio, speech synthesis not available.", variant: "destructive" });
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      console.log("[Speak] Unconditionally cancelling any existing speech synthesis.");
      window.speechSynthesis.cancel(); 
    } catch (cancelError) {
      console.warn("[Speak] Error during unconditional cancel:", cancelError);
    }

    let recognitionWasActiveAndWillBeRestarted = false;
    if (speechRecognitionRef.current && isListening) {
        console.log("[Speak] Recognition is active. Temporarily stopping it before TTS playback.");
        manuallyStoppedRef.current = true; 
        recognitionWasActiveAndWillBeRestarted = true;
        try {
            speechRecognitionRef.current.stop();
        } catch (e) {
            console.warn("[Speak] Error stopping recognition before speech:", e);
        }
    }
    
    let voiceForUtterance: SpeechSynthesisVoice | null = selectedVoice;

    if (!voiceForUtterance) {
        console.warn("[Speak] selectedVoice (from state) is null. Attempting direct lookup for a fallback voice.");
        const allVoicesNow = window.speechSynthesis.getVoices();
        console.log(`[Speak] Direct lookup: Found ${allVoicesNow.length} voices at this moment.`);
        if (allVoicesNow.length === 0) {
            console.warn("[Speak] CRITICAL during direct lookup: No speech synthesis voices available. Playback will likely fail.");
        } else {
            const femaleVoiceKeywords = [
              "female", "woman", "girl", "samantha", "allison", "susan", "zoe", "victoria", "tessa",
              "linda", "heather", "eva", "jessa", "zira", "lucy", "anna", "claire", "emily",
              "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
            ];
            const enUSVoices = allVoicesNow.filter(v => v.lang.startsWith("en-US"));
            let foundDirectly = enUSVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
            if (!foundDirectly && enUSVoices.length > 0) {
              foundDirectly = enUSVoices.find(v => v.default) || enUSVoices[0];
            }
            if (!foundDirectly) {
              const enVoices = allVoicesNow.filter(v => v.lang.startsWith("en"));
              foundDirectly = enVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
              if(!foundDirectly && enVoices.length > 0) {
                  foundDirectly = enVoices.find(v => v.default) || enVoices[0];
              }
            }
            if (!foundDirectly && allVoicesNow.length > 0) { 
                foundDirectly = allVoicesNow.find(v => v.default) || allVoicesNow[0];
            }
            if (foundDirectly) {
                console.log(`[Speak] Direct lookup successful. Using voice: ${foundDirectly.name}`);
                voiceForUtterance = foundDirectly;
            } else {
                console.warn("[Speak] Direct lookup failed to find any suitable voice.");
            }
        }
    }
        
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (voiceForUtterance) {
      utterance.voice = voiceForUtterance;
      utterance.lang = voiceForUtterance.lang; 
    } else {
      utterance.lang = "en-US"; 
      console.warn(`[Speak] No voiceForUtterance (neither from state nor direct lookup). Utterance lang explicitly set to '${utterance.lang}'. Attempting to use a system default voice.`);
    }

    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
        console.log("[Speak] Utterance started successfully.");
        setIsSkylarSpeaking(true);
    }

    const handleSpeakEndOrError = () => {
        manuallyStoppedRef.current = false; 
        if (recognitionWasActiveAndWillBeRestarted && speechRecognitionRef.current && isListening) {
            console.log("[Speak] Skylar finished or errored, attempting to restart recognition.");
            try {
                speechRecognitionRef.current.start();
            } catch (e) {
                console.warn("[Speak] Could not restart recognition after Skylar speech/error", e);
            }
        }
        if (onEndCallback) onEndCallback();
    };

    utterance.onend = () => {
      console.log("[Speak] Utterance ended successfully.");
      setIsSkylarSpeaking(false);
      handleSpeakEndOrError();
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      setIsSkylarSpeaking(false);
      let errorCode: string | SpeechSynthesisErrorCode = 'unknown_error';
      try {
        if (event && typeof event.error === 'string') {
          errorCode = event.error;
        }
      } catch (e) { /* Error accessing event.error */ }

      console.groupCollapsed(`[Speak] SpeechSynthesis Error! Code: ${errorCode}`);
      console.log("  - Event Object (raw):", event);
      try { console.log("  - Event Object (JSON):", JSON.stringify(event)); } catch (e) { console.log("  - Event Object (JSON): Not stringifiable"); }
      console.log("  - Utterance Text (first 100 chars):", `"${text.substring(0,100)}${text.length > 100 ? "..." : ""}"`);
      console.log("  - Utterance Voice (at time of error):", utterance.voice ? { name: utterance.voice.name, lang: utterance.voice.lang, default: utterance.voice.default } : "Not set (using browser default)");
      console.log("  - Utterance Lang (at time of error):", utterance.lang);
      console.log("  - Global Selected System Voice (state at time of error):", selectedVoice ? { name: selectedVoice.name, lang: selectedVoice.lang, default: selectedVoice.default } : "None selected / voices not loaded");
      console.log("  - Voice used for this utterance attempt:", voiceForUtterance ? { name: voiceForUtterance.name, lang: voiceForUtterance.lang, default: voiceForUtterance.default } : "None / Fallback Lang");
      console.groupEnd();
      
      if (errorCode !== 'canceled' && errorCode !== 'interrupted') {
        toast({
          title: "Speech Error",
          description: `Could not play Skylar's response. (Error: ${errorCode})`,
          variant: "destructive",
        });
      }
      handleSpeakEndOrError();
    };
    
    console.log(`[Speak] Preparing to call window.speechSynthesis.speak(). Utterance details - Text: "${utterance.text.substring(0,30)}...", Lang: ${utterance.lang}, Voice: ${utterance.voice?.name || 'Default'}, Volume: ${utterance.volume}, Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);
    console.log(`[Speak] SpeechSynthesis state before speak(): speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}`);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (speakError: any) {
      console.error("[Speak] Critical error during window.speechSynthesis.speak() call:", speakError);
      setIsSkylarSpeaking(false);
      manuallyStoppedRef.current = false; 
      toast({
        title: "Critical Speech Error",
        description: `Failed to initiate speech playback. ${speakError.message || ''}`.trim(),
        variant: "destructive",
      });
       if (recognitionWasActiveAndWillBeRestarted && speechRecognitionRef.current && isListening) {
            console.log("[Speak] Critical speak() error, attempting to restart recognition.");
            try { speechRecognitionRef.current.start(); } catch (e) { console.warn("[Speak] Could not restart recognition after critical speak() error", e); }
        }
      if (onEndCallback) {
         try { onEndCallback(); } catch (cbError) { console.error("[Speak] Error in onEndCallback after speak() threw an error:", cbError); }
      }
    }
  }, [speechApiSupported, toast, selectedVoice, setIsSkylarSpeaking, isListening, voicesLoaded]);

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

  const initiateSessionAsyncInternal = useCallback(async () => {
      console.log("[SessionInitFunc] Entered initiateSessionAsyncInternal.");
      if (!voicesLoadedRef.current) {
        console.log("[SessionInitFunc] Aborting: Voices not loaded yet (checked via ref).");
        toast({ title: "Voice System Not Ready", description: "Skylar's voice system is still initializing. Please wait a moment.", variant: "default"});
        return;
      }
      
      console.log("[SessionInitFunc] Conditions met. Proceeding with AI call for greeting...");
      
      sessionInitiatedRef.current = true; 
      setIsLoadingAIResponse(true);
      try {
        console.log("[SessionInitFunc] Calling voiceConversationWithSkylar for SKYLAR_SESSION_START.");
        const aiInput: VoiceConversationWithSkylarInput = { userInput: "SKYLAR_SESSION_START", sessionState: undefined };
        const aiResult = await voiceConversationWithSkylar(aiInput);
        console.log("[SessionInitFunc] AI call successful. Response:", aiResult.skylarResponse.substring(0,50)+"...");

        setSessionState(aiResult.updatedSessionState);

        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar" as const, text: aiResult.skylarResponse, icon: Brain };
        setChatHistory(prev => {
            if (prev.some(msg => msg.id.startsWith('skylar-greeting-'))) {
                console.warn("[SessionInitFunc] Duplicate greeting detected by ID. Not adding again.");
                return prev;
            }
            return [...prev, greetingMessage];
        });
        
        console.log(`[SessionInitFunc] Attempting to speak greeting: "${aiResult.skylarResponse.substring(0,30)}..."`);
        speak(aiResult.skylarResponse);

      } catch (error) {
        console.error("[SessionInitFunc] Error during session initiation AI call:", error);
        handleGenericError(error, "session initiation");
        sessionInitiatedRef.current = false; 
      } finally {
        setIsLoadingAIResponse(false);
        console.log("[SessionInitFunc] Finished. isLoadingAIResponse set to false.");
      }
    }, [speak, handleGenericError, setSessionState, setIsLoadingAIResponse, setChatHistory, toast]); 


  const handleUserSpeech = useCallback(async (userInput: string) => {
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
      handleGenericError(error, "user speech");
      if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
         console.log("Error in handleUserSpeech, ensuring recognition attempts to restart if speak() didn't.");
         manuallyStoppedRef.current = false; 
         try { speechRecognitionRef.current.start(); } catch(e) { console.warn("Could not restart recognition after AI error (from handleUserSpeech)", e); }
      }
    } finally {
      setIsLoadingAIResponse(false);
    }
  }, [sessionState, speak, handleGenericError, isListening, setChatHistory, setSessionState, setIsLoadingAIResponse, setCurrentTranscript]);


  useEffect(() => { // SpeechRecognitionEffect
    if (!speechApiSupported) {
      console.log("[SpeechRecEffect] Speech API not supported, skipping SpeechRecognition setup.");
      return;
    }

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      console.warn("[SpeechRecEffect] SpeechRecognition implementation not found in browser.");
      return;
    }

    if (!speechRecognitionRef.current) {
        console.log("[SpeechRecEffect] Initializing new SpeechRecognition instance.");
        speechRecognitionRef.current = new SpeechRecognitionImpl();
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = true;
        speechRecognitionRef.current.lang = "en-US";
    }

    const recognition = speechRecognitionRef.current;

    const onResultHandler = (event: SpeechRecognitionEvent) => {
      console.log("[SR onresult] Received result. Skylar speaking:", window.speechSynthesis.speaking);
      if (window.speechSynthesis.speaking) {
        console.log("[SR onresult] Skylar is speaking, cancelling her speech.");
        window.speechSynthesis.cancel(); 
        setIsSkylarSpeaking(false);
        manuallyStoppedRef.current = false;
      }
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (interimTranscript.trim()) {
        setCurrentTranscript(interimTranscript.trim());
      }

      if (finalTranscript.trim()) {
        console.log("[SR onresult] Final transcript received:", finalTranscript.trim());
        setCurrentTranscript(finalTranscript.trim()); 
        if (isListening) { 
            manuallyStoppedRef.current = true; 
            try { recognition.stop(); } catch(e) { console.warn("[SR onresult] Error stopping recognition:", e); }
        }
        handleUserSpeech(finalTranscript.trim());
      }
    };

    const onErrorHandler = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SR onerror] SpeechRecognition Error:", event.error, "Full event:", event);

      let toastMessage = "An unknown error occurred with speech recognition.";
      let shouldStopGlobalListening = false;
      let autoRestart = false;
      const currentRecognition = speechRecognitionRef.current;


      switch (event.error) {
        case 'not-allowed': case 'security':
          toastMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
          shouldStopGlobalListening = true; break;
        case 'audio-capture':
          toastMessage = "Audio capture failed. Please check your microphone.";
          shouldStopGlobalListening = true; break;
        case 'no-speech':
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) {
            console.log("[SR onerror] No speech detected, attempting auto-restart."); autoRestart = true;
          } else { 
            toastMessage = "No speech detected. Please try speaking again."; 
            console.log("[SR onerror] No speech detected, but not auto-restarting (state check failed or manually stopped).");
          }
          break;
        case 'network':
          toastMessage = "Network error during speech recognition. Please check connection.";
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) {
            console.log("[SR onerror] Network error, attempting auto-restart."); autoRestart = true;
          }
          break;
        case 'aborted':
          if (manuallyStoppedRef.current) {
             console.log("[SR onerror] Recognition aborted (likely manual stop or stop for TTS).");
             return; 
          } else if (isListening && !isSkylarSpeaking && !isLoadingAIResponse) {
            console.log("[SR onerror] Recognition aborted unexpectedly, attempting auto-restart."); autoRestart = true;
          } else {
            console.log("[SR onerror] Recognition aborted, but not auto-restarting (state check failed).");
            if (isListening) setIsListening(false); return;
          }
          break;
        case 'service-not-allowed':
          toastMessage = "Speech recognition service is not allowed."; shouldStopGlobalListening = true; break;
        case 'bad-grammar':
          toastMessage = "Speech recognition could not understand the input.";
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) {
            console.log("[SR onerror] Bad grammar, attempting auto-restart."); autoRestart = true;
          }
          break;
        case 'language-not-supported':
          toastMessage = "The configured language for speech recognition is not supported."; shouldStopGlobalListening = true; break;
        default: 
          console.log("[SR onerror] Default error case, will stop listening if flag set.");
          shouldStopGlobalListening = true; break;
      }

      if (autoRestart && currentRecognition) {
          console.log("[SR onerror] Auto-restarting recognition.");
          setCurrentTranscript("");
          manuallyStoppedRef.current = false; 
          setTimeout(() => { 
              try {
                  if (isListening && !manuallyStoppedRef.current) {
                    console.log("[SR onerror] Calling recognition.start() for auto-restart.");
                    currentRecognition.start();
                  } else {
                    console.log("[SR onerror] Auto-restart conditions changed during timeout or manuallyStoppedRef is true. Not starting.");
                    if (isListening && manuallyStoppedRef.current) setIsListening(false);
                  }
              } catch (e) {
                  console.warn("[SR onerror] Error during auto-restart recognition.start():", e);
                  if (isListening) setIsListening(false);
              }
          }, 100);
          if (event.error === 'no-speech' && toastMessage.includes("No speech detected.")) { 
            // Avoid toast if it's just "No speech detected" and we are auto-restarting silently.
          } else if (event.error !== 'no-speech') {
             toast({ title: "Speech Recognition", description: toastMessage, variant: "default" });
          }
      } else if (!autoRestart && event.error !== 'aborted') { 
        toast({ title: event.error === 'no-speech' ? "Speech Recognition" : "Speech Recognition Error", description: toastMessage, variant: event.error === 'no-speech' ? "default" : "destructive" });
      }


      if (shouldStopGlobalListening && isListening) {
        console.log("[SR onerror] Critical error, setting manuallyStoppedRef=true, isListening=false.");
        manuallyStoppedRef.current = true;
        setIsListening(false);
        if (currentRecognition) try { currentRecognition.stop(); } catch (e) { console.warn("[SR onerror] Error stopping recognition after critical error:", e); }
      } else if (!isListening && shouldStopGlobalListening) {
         manuallyStoppedRef.current = true;
      }
    };

    const onEndHandler = () => {
      const currentRecognition = speechRecognitionRef.current;
      console.log("[SR onend] Recognition ended. Manually stopped:", manuallyStoppedRef.current, "IsListening:", isListening, "Skylar Speaking:", isSkylarSpeaking, "Loading AI:", isLoadingAIResponse);
      
      if (manuallyStoppedRef.current) {
        console.log("[SR onend] Recognition was stopped intentionally (by user, for TTS, or after final result). No auto-restart from here. isListening state:", isListening);
        return;
      }

      if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && currentRecognition) {
        console.log("[SR onend] Conditions met for auto-restart (e.g. after no-speech error, or unexpected end). Calling recognition.start().");
        manuallyStoppedRef.current = false; 
        try {
          currentRecognition.start();
        } catch (e: any) {
          if (e?.name !== 'InvalidStateError') { 
             console.warn("[SR onend] Error restarting recognition, setting isListening to false.", e);
             setIsListening(false);
          } else {
            console.log("[SR onend] InvalidStateError during restart, likely benign (already started/stopping). Current isListening:", isListening);
          }
        }
      } else {
          console.log("[SR onend] Recognition ended, but not auto-restarting based on current conditions (e.g., Skylar speaking, AI loading, or user stopped listening).");
      }
    };

    recognition.onresult = onResultHandler;
    recognition.onerror = onErrorHandler;
    recognition.onend = onEndHandler;

    return () => {
      if (speechRecognitionRef.current) {
        console.log("[SpeechRecEffectCleanup] Cleaning up SpeechRecognition listeners and stopping recognition.");
        manuallyStoppedRef.current = true; 
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        try { speechRecognitionRef.current.stop(); } catch (e) { console.warn("[SpeechRecEffectCleanup] Error stopping recognition on cleanup:", e); }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechApiSupported, handleUserSpeech, toast, isListening, isSkylarSpeaking, isLoadingAIResponse, setIsListening, setIsSkylarSpeaking, setCurrentTranscript]); 


  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) {
        toast({ title: "Voice Error", description: "Speech recognition is not supported or not initialized.", variant: "destructive"});
        setIsListening(false);
        return;
    }
    const recognition = speechRecognitionRef.current;

    if (isListening) {
      console.log("[ToggleListening] Stopping listening (isListening was true). Setting manuallyStoppedRef=true.");
      manuallyStoppedRef.current = true;
      try {
        recognition.stop();
      } catch (e) {
        console.warn("[ToggleListening] Error stopping speech recognition:", e);
      }
      setIsListening(false); 
      if (window.speechSynthesis.speaking) {
        console.log("[ToggleListening] Skylar was speaking, cancelling her speech.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
    } else { 
      console.log("[ToggleListening] Starting listening (isListening was false). Setting manuallyStoppedRef=false.");
      manuallyStoppedRef.current = false;
      if (window.speechSynthesis.speaking) {
         console.log("[ToggleListening] Skylar was speaking, cancelling her speech before starting mic.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
      setCurrentTranscript(""); 

      console.log(`[ToggleListening] Checking conditions for initial greeting: sessionInitiatedRef.current=${sessionInitiatedRef.current}, voicesLoaded (state)=${voicesLoaded}, voicesLoaded (ref)=${voicesLoadedRef.current}`);
      if (!sessionInitiatedRef.current && voicesLoadedRef.current) { 
        console.log("[ToggleListening] Conditions met (using ref for voicesLoaded): Initiating session (greeting).");
        await initiateSessionAsyncInternal(); 
      } else if (!sessionInitiatedRef.current && !voicesLoadedRef.current) {
        console.warn("[ToggleListening] First mic click, but voices not loaded yet (checked via ref). Greeting will be skipped or delayed.");
        toast({title: "Voice System Initializing", description: "Skylar's voice is still warming up. Please try clicking the mic again in a moment.", variant: "default"})
      }


      try {
        if (navigator.permissions && navigator.permissions.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                 toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
                 console.log("[ToggleListening] Microphone permission denied. Not starting.");
                 setIsListening(false); return;
            }
             if (permissionStatus.state === 'prompt') {
                 toast({ title: "Microphone Access", description: "Please allow microphone access when prompted." });
                 console.log("[ToggleListening] Microphone permission is 'prompt'.");
            }
        }
        console.log("[ToggleListening] Calling recognition.start().");
        recognition.start();
        setIsListening(true);
      } catch (err: any) {
        console.error("[ToggleListening] Error starting speech recognition:", err);
        let description = "Could not start voice recognition. Check mic and permissions.";
        if (err?.name === "NotAllowedError") description = "Microphone access denied. Enable in browser settings.";
        else if (err?.name === "InvalidStateError") description = "Listening service busy. Wait or try again.";
        else if (err?.message?.toLowerCase().includes("already started")) description = "Listening service is already active.";

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
          {isLoadingAIResponse ? "Skylar is thinking..." : isSkylarSpeaking ? "Skylar is speaking..." : isListening ? "Listening..." : (speechApiSupported && voicesLoadedRef.current) ? "Press mic to talk" : (!speechApiSupported ? "Voice not supported" : "Loading voices...")}
        </div>
        <Button
          onClick={toggleListening}
          size="lg"
          variant={isListening ? "destructive" : "default"}
          className={`rounded-full p-0 w-20 h-20 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-primary/50
            ${isListening ? 'animate-pulse-lg bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}
            ${(!speechApiSupported || !voicesLoadedRef.current) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          disabled={!speechApiSupported || !voicesLoadedRef.current || (isLoadingAIResponse && !isListening && !isSkylarSpeaking) }
        >
          {isLoadingAIResponse && !isListening && !isSkylarSpeaking ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
        {(!speechApiSupported && voicesLoadedRef.current) && ( 
             <p className="text-xs text-destructive text-center mt-2">
                Voice interaction is not supported by your browser. This app requires voice functionality.
            </p>
        )}
         {(!speechApiSupported && !voicesLoadedRef.current) && ( 
            <p className="text-xs text-destructive text-center mt-2">
                Voice interaction is not supported by your browser or voices are still loading. This app requires voice functionality.
            </p>
        )}
      </footer>
    </div>
  );
}
    

    



    

