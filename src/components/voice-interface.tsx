
// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const voicesLoadedRef = useRef(voicesLoaded); 

  const { toast } = useToast();

  useEffect(() => {
    voicesLoadedRef.current = voicesLoaded;
     console.log(`[voicesLoadedEffect] voicesLoaded state updated to: ${voicesLoaded}, ref updated to: ${voicesLoadedRef.current}`);
  }, [voicesLoaded]);

  const loadVoices = useCallback(() => {
    console.log("[LoadVoices] Attempting to load voices...");
    let voiceSelectionAttempted = false;
    try {
      if (!speechApiSupported || !window.speechSynthesis) {
        console.warn("[LoadVoices] Speech synthesis not supported or API not available.");
        return;
      }
      const allAvailableVoices = window.speechSynthesis.getVoices();
      console.log(`[LoadVoices] Found ${allAvailableVoices.length} voices initially.`);

      if (allAvailableVoices.length === 0) {
        if (window.speechSynthesis.onvoiceschanged === undefined) {
          console.warn("[LoadVoices] No voices found, and onvoiceschanged not supported. Will rely on system default or timeout.");
        } else {
          console.log("[LoadVoices] No voices found yet, onvoiceschanged is supported. Waiting for event or timeout.");
        }
      } else {
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
      }
      voiceSelectionAttempted = true;
    } catch (error) {
      console.error("[LoadVoices CATCH] Error during voice fetching/selection:", error);
    } finally {
      console.log(`[LoadVoices FINALLY] Setting voicesLoaded to true. Voice selection attempted: ${voiceSelectionAttempted}`);
      setVoicesLoaded(true); 
    }
  }, [speechApiSupported, setSelectedVoice, setVoicesLoaded]);


  useEffect(() => { 
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
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("[VoiceInitEffect] onvoiceschanged event fired. Calling loadVoices().");
            loadVoices();
        };
      } else {
         console.warn("[VoiceInitEffect] onvoiceschanged not supported by browser. Relied on initial loadVoices call and timeout.");
      }
      
      voiceLoadTimeoutId = setTimeout(() => {
        console.warn(`[VoiceInitEffect TIMEOUT] 3 seconds reached. Forcing voicesLoaded=true as a fallback.`);
        if (!voicesLoadedRef.current) { 
          setVoicesLoaded(true);
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
    
    console.log(`[Speak] Attempting to speak. Text (first 50 chars): "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}". voicesLoadedRef.current: ${voicesLoadedRef.current}`);
    
    if (!speechApiSupported || !window.speechSynthesis) {
      console.warn("[Speak] Speech synthesis not supported or not initialized. Aborting.");
      toast({ title: "Speech Error", description: "Cannot play audio, speech synthesis not available.", variant: "destructive" });
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.warn("[Speak] Speech synthesis was already speaking or pending. Pre-emptively cancelling.");
      }
      window.speechSynthesis.cancel(); 
    } catch (cancelError) {
      console.warn("[Speak] Error during unconditional cancel:", cancelError);
    }

    let recognitionWasActiveAndWillBeRestarted = false;
    if (speechRecognitionRef.current && isListening) {
        console.log("[Speak] Recognition is active. Temporarily stopping it before TTS playback. Setting manuallyStoppedRef=true.");
        manuallyStoppedRef.current = true; 
        recognitionWasActiveAndWillBeRestarted = true;
        try {
            speechRecognitionRef.current.stop();
        } catch (e) {
            console.warn("[Speak] Error stopping recognition before speech:", e);
        }
    }
    
    let voiceForUtterance: SpeechSynthesisVoice | null = null;
    console.log(`[Speak] Voice selection: Initial check - selectedVoice (state): ${selectedVoice ? selectedVoice.name : "null"}, voicesLoadedRef.current: ${voicesLoadedRef.current}`);

    if (selectedVoice && voicesLoadedRef.current) { 
        console.log(`[Speak] Voice selection: Using selectedVoice from state: ${selectedVoice.name}`);
        voiceForUtterance = selectedVoice;
    }


    if (!voiceForUtterance) {
        console.log(`[Speak] Voice selection: voiceForUtterance is still null. Attempting direct dynamic lookup.`);
        const allVoicesNow = window.speechSynthesis.getVoices();
        console.log(`[Speak] Voice selection: Direct lookup found ${allVoicesNow.length} voices.`);

        if (allVoicesNow.length === 0) {
            console.warn("[Speak] Voice selection: CRITICAL during direct dynamic lookup: No speech synthesis voices available.");
        } else {
            const femaleVoiceKeywords = [ 
              "female", "woman", "girl", "samantha", "allison", "susan", "zoe", "victoria", "tessa",
              "linda", "heather", "eva", "jessa", "zira", "lucy", "anna", "claire", "emily",
              "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
            ];
            let foundDirectly: SpeechSynthesisVoice | null = null;
            const enUSVoices = allVoicesNow.filter(v => v.lang.startsWith("en-US"));
            foundDirectly = enUSVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
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
                console.log(`[Speak] Voice selection: Direct dynamic lookup successful. Using voice: ${foundDirectly.name}`);
                voiceForUtterance = foundDirectly;
            } else {
                console.warn("[Speak] Voice selection: Direct dynamic lookup failed to find any suitable voice.");
            }
        }
    }
        
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (voiceForUtterance) {
      utterance.voice = voiceForUtterance;
      utterance.lang = voiceForUtterance.lang; 
      console.log(`[Speak] Utterance voice set to: ${utterance.voice.name}, lang: ${utterance.lang}`);
    } else {
      utterance.lang = "en-US"; 
      console.warn(`[Speak] No specific voice selected for utterance. Utterance lang explicitly set to '${utterance.lang}'. Attempting to use a system default voice.`);
    }

    utterance.volume = 1; 
    utterance.rate = 1;   
    utterance.pitch = 1;  

    utterance.onstart = () => {
        console.log("[Speak] Utterance started successfully.");
        setIsSkylarSpeaking(true);
    }

    const handleSpeakEndOrError = () => {
        console.log(`[Speak handleSpeakEndOrError] Called. recognitionWasActiveAndWillBeRestarted: ${recognitionWasActiveAndWillBeRestarted}, isListening (state): ${isListening}`);
        manuallyStoppedRef.current = false; 
        if (recognitionWasActiveAndWillBeRestarted && speechRecognitionRef.current && isListening) {
            console.log("[Speak handleSpeakEndOrError] Skylar finished or errored, attempting to restart recognition after a short delay.");
            setTimeout(() => {
                if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) { 
                    console.log("[Speak handleSpeakEndOrError] Delay complete, calling recognition.start().");
                    try {
                        speechRecognitionRef.current.start();
                    } catch (e) {
                        console.warn("[Speak handleSpeakEndOrError] Could not restart recognition after Skylar speech/error", e);
                    }
                } else {
                     console.log("[Speak handleSpeakEndOrError] Conditions for restarting recognition no longer met after delay.");
                }
            }, 100); 
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
      
      if (errorCode !== 'canceled' && errorCode !== 'interrupted' && errorCode !== 'not-allowed') { 
        toast({
          title: "Speech Error",
          description: `Could not play Skylar's response. (Error: ${errorCode})`,
          variant: "destructive",
        });
      } else if (errorCode === 'not-allowed') {
         toast({
          title: "Speech Playback Issue",
          description: `Skylar's voice may be blocked by your browser. Try interacting with the page first (e.g., click). (Error: ${errorCode})`,
          variant: "destructive",
        });
      }
      handleSpeakEndOrError();
    };
    
    setTimeout(() => {
      try {
        console.log(`[Speak] Preparing to call window.speechSynthesis.speak(). Utterance details - Text: "${utterance.text.substring(0,30)}...", Lang: ${utterance.lang}, Voice: ${utterance.voice?.name || 'Default'}, Volume: ${utterance.volume}, Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);
        console.log(`[Speak] SpeechSynthesis state before speak(): speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}`);
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
              setTimeout(() => { 
                  if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                      try { speechRecognitionRef.current.start(); } catch (e) { console.warn("[Speak] Could not restart recognition after critical speak() error", e); }
                  }
              }, 100); 
          }
        if (onEndCallback) {
           try { onEndCallback(); } catch (cbError) { console.error("[Speak] Error in onEndCallback after speak() threw an error:", cbError); }
        }
      }
    }, 50); 
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

  const initiateSessionAsyncInternal = useCallback(async () => {
      console.log(`[SessionInitFunc] Entered initiateSessionAsyncInternal. voicesLoadedRef.current: ${voicesLoadedRef.current}`);
      if (!voicesLoadedRef.current) { 
        console.log("[SessionInitFunc] Aborting: Voices not loaded yet (checked via ref).");
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
    }, [speak, handleGenericError, setSessionState, setIsLoadingAIResponse, setChatHistory]); 


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
      
      speak(aiResult.skylarResponse, () => {
          console.log("[handleUserSpeech speak callback] Skylar finished speaking response. Ensuring recognition attempts to restart if conditions met.");
          if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
              console.log("[handleUserSpeech speak callback] Conditions appear met. Attempting to start recognition via setTimeout for safety.");
              setTimeout(() => { 
                  if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                      try {
                          console.log("[handleUserSpeech speak callback] setTimeout: Calling recognition.start().");
                          speechRecognitionRef.current.start();
                      } catch(e: any) {
                          if (e.name !== 'InvalidStateError') { 
                             console.warn("[handleUserSpeech speak callback] setTimeout: Could not restart recognition after AI response.", e);
                          } else {
                             console.log("[handleUserSpeech speak callback] setTimeout: InvalidStateError on restart, likely benign (already started or stopping).");
                          }
                      }
                  } else {
                      console.log("[handleUserSpeech speak callback] setTimeout: Conditions for restarting recognition no longer met.");
                  }
              }, 100); 
          } else {
              console.log("[handleUserSpeech speak callback] Conditions not met for restarting recognition automatically.");
          }
      });


    } catch (error) {
      handleGenericError(error, "user speech");
      if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
         console.log("Error in handleUserSpeech, ensuring recognition attempts to restart if speak() didn't or if error before speak.");
         manuallyStoppedRef.current = false; 
         setTimeout(() => { 
            if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                try { speechRecognitionRef.current.start(); } catch(e) { console.warn("Could not restart recognition after AI error (from handleUserSpeech)", e); }
            }
         }, 100);
      }
    } finally {
      setIsLoadingAIResponse(false);
    }
  }, [sessionState, speak, handleGenericError, isListening, setChatHistory, setSessionState, setIsLoadingAIResponse, setCurrentTranscript]);


  useEffect(() => { 
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

    recognition.onstart = () => { console.log("[SR onstart] Recognition service reported as started."); };
    recognition.onaudiostart = () => { console.log("[SR onaudiostart] Audio capture reported as started by recognition service."); };
    recognition.onsoundstart = () => { console.log("[SR onsoundstart] Sound detected by recognition service."); };
    recognition.onspeechstart = () => { console.log("[SR onspeechstart] Speech detected by recognition service."); };
    
    recognition.onaudioend = () => { console.log("[SR onaudioend] Audio capture reported as ended by recognition service."); };
    recognition.onsoundend = () => { console.log("[SR onsoundend] Sound detection reported as ended by recognition service."); };
    recognition.onspeechend = () => { console.log("[SR onspeechend] Speech detection reported as ended by recognition service."); };


    const onResultHandler = (event: SpeechRecognitionEvent) => {
      console.log("[SR onresult] Received result. Skylar speaking:", window.speechSynthesis.speaking);
      if (window.speechSynthesis.speaking) {
        console.log("[SR onresult] Skylar is speaking, cancelling her speech due to user input (interruption).");
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
        console.log("[SR onresult] Final transcript received:", finalTranscript.trim(), "Setting manuallyStoppedRef=true before stopping recognition for processing.");
        setCurrentTranscript(finalTranscript.trim()); 
        if (isListening) { 
            manuallyStoppedRef.current = true; 
            try { recognition.stop(); } catch(e) { console.warn("[SR onresult] Error stopping recognition after final transcript:", e); }
        }
        handleUserSpeech(finalTranscript.trim()); 
      }
    };

    const onErrorHandler = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SR onerror] SpeechRecognition Error:", event.error, "Full event:", event);
      let toastMessage = "An unknown error occurred with speech recognition.";
      let shouldStopGlobalListening = false; 
      let autoRestart = false; 
      const currentRecognitionOnError = speechRecognitionRef.current; 

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
             console.log("[SR onerror] Recognition aborted (likely manual stop, stop for TTS, or after final result). This is expected.");
             return; 
          } else if (isListening && !isSkylarSpeaking && !isLoadingAIResponse) {
            console.log("[SR onerror] Recognition aborted unexpectedly, attempting auto-restart."); autoRestart = true;
          } else {
            console.log("[SR onerror] Recognition aborted, but not auto-restarting (state check failed).");
            if (isListening) setIsListening(false); 
            return;
          }
          break;
        case 'service-not-allowed':
          toastMessage = "Speech recognition service is not allowed by the browser or system."; shouldStopGlobalListening = true; break;
        case 'bad-grammar': 
          toastMessage = "Speech recognition could not understand the input. Please try speaking more clearly.";
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) {
            console.log("[SR onerror] Bad grammar, attempting auto-restart."); autoRestart = true;
          }
          break;
        case 'language-not-supported':
          toastMessage = "The configured language for speech recognition is not supported."; shouldStopGlobalListening = true; break;
        default:
          console.log("[SR onerror] Default error case, assuming critical and stopping listening if flag set.");
          shouldStopGlobalListening = true; 
          break;
      }

      if (autoRestart && currentRecognitionOnError) {
          console.log("[SR onerror] Auto-restarting recognition.");
          setCurrentTranscript(""); 
          manuallyStoppedRef.current = false; 
          setTimeout(() => { 
              try {
                  if (isListening && !manuallyStoppedRef.current && speechRecognitionRef.current) { 
                    console.log("[SR onerror] Calling recognition.start() for auto-restart.");
                    speechRecognitionRef.current.start();
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
          } else if (event.error !== 'no-speech') { 
             toast({ title: "Speech Recognition", description: toastMessage, variant: "default" });
          }
      } else if (!manuallyStoppedRef.current && event.error !== 'aborted') { 
          console.log(`[SR onerror] Error '${event.error}' occurred and no auto-restart. Setting isListening to false.`);
          setIsListening(false); 
          if (event.error !== 'aborted') { 
              toast({ title: event.error === 'no-speech' ? "Speech Recognition" : "Speech Recognition Error", description: toastMessage, variant: event.error === 'no-speech' ? "default" : "destructive" });
          }
      }


      if (shouldStopGlobalListening) {
        if (isListening) {
            console.log("[SR onerror] Critical error (shouldStopGlobalListening), ensuring isListening=false.");
            setIsListening(false);
        }
        manuallyStoppedRef.current = true; 
        if (currentRecognitionOnError) {
            try { currentRecognitionOnError.stop(); } catch (e) { console.warn("[SR onerror] Error stopping recognition after critical error:", e); }
        }
      }
    };

    const onEndHandler = () => {
      const currentRecognitionOnEnd = speechRecognitionRef.current;
      console.log("[SR onend] Recognition ended. Manually stopped:", manuallyStoppedRef.current, "IsListening:", isListening, "Skylar Speaking:", isSkylarSpeaking, "Loading AI:", isLoadingAIResponse);
      
      if (manuallyStoppedRef.current) {
        console.log("[SR onend] Recognition was stopped intentionally. No auto-restart from onEnd handler.");
        return;
      }

      if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && currentRecognitionOnEnd) {
        console.log("[SR onend] Conditions met for auto-restart from onEnd (e.g., after a short pause or non-critical error not handled by onerror). Calling recognition.start().");
        manuallyStoppedRef.current = false; 
        try {
          currentRecognitionOnEnd.start();
        } catch (e: any) {
          if (e?.name !== 'InvalidStateError') {
             console.warn("[SR onend] Error restarting recognition, setting isListening to false.", e);
             setIsListening(false); 
          } else {
            console.log("[SR onend] InvalidStateError during restart from onEnd, likely benign (already starting or stopping).");
          }
        }
      } else {
          console.log("[SR onend] Recognition ended, but not auto-restarting based on current conditions (e.g. user stopped, Skylar speaking, etc.).");
      }
    };

    recognition.onresult = onResultHandler;
    recognition.onerror = onErrorHandler;
    recognition.onend = onEndHandler;

    return () => {
      if (speechRecognitionRef.current) {
        console.log("[SpeechRecEffectCleanup] Cleaning up SpeechRecognition listeners and stopping recognition.");
        manuallyStoppedRef.current = true; 
        speechRecognitionRef.current.onstart = null;
        speechRecognitionRef.current.onaudiostart = null;
        speechRecognitionRef.current.onsoundstart = null;
        speechRecognitionRef.current.onspeechstart = null;
        speechRecognitionRef.current.onaudioend = null;
        speechRecognitionRef.current.onsoundend = null;
        speechRecognitionRef.current.onspeechend = null;
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
        console.log("[ToggleListening] Skylar was speaking, cancelling her speech as user turned off mic.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
    } else {
      console.log("[ToggleListening] Starting listening (isListening was false). Setting manuallyStoppedRef=false.");
      manuallyStoppedRef.current = false; 
      if (window.speechSynthesis.speaking) {
         console.log("[ToggleListening] Skylar was speaking, cancelling her speech because user wants to talk.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
      setCurrentTranscript(""); 

      console.log(`[ToggleListening] Checking conditions for initial greeting: sessionInitiatedRef.current=${sessionInitiatedRef.current}, voicesLoaded (ref)=${voicesLoadedRef.current}, voicesLoaded (state)=${voicesLoaded}`);
      if (!sessionInitiatedRef.current) { 
        if (voicesLoadedRef.current) { 
            console.log("[ToggleListening] Conditions met (using ref for voicesLoaded): Initiating session (greeting).");
            await initiateSessionAsyncInternal(); 
        } else {
            console.warn("[ToggleListening] First mic click, but voices not loaded yet (checked via ref). Greeting will be skipped or delayed.");
            toast({title: "Voice System Initializing", description: "Skylar's voice is still warming up. Please try clicking the mic again in a moment.", variant: "default"})
            return; 
        }
      }


      try {
        if (navigator.permissions && navigator.permissions.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                 toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
                 console.log("[ToggleListening] Microphone permission denied. Not starting.");
                 setIsListening(false); 
                 return;
            }
             if (permissionStatus.state === 'prompt') {
                 toast({ title: "Microphone Access", description: "Please allow microphone access when prompted." });
                 console.log("[ToggleListening] Microphone permission is 'prompt'. Recognition will attempt to start.");
            }
        }
        console.log("[ToggleListening] Attempting to call recognition.start(). Current recognition object:", recognition);
        recognition.start();
        setIsListening(true); 
      } catch (err: any) {
        console.error("[ToggleListening] Error starting speech recognition:", err);
        let description = "Could not start voice recognition. Check mic and permissions.";
        if (err?.name === "NotAllowedError") description = "Microphone access denied. Enable in browser settings.";
        else if (err?.name === "InvalidStateError") {
            description = "Listening service busy or already started. Try again if it doesn't activate.";
            console.warn("[ToggleListening] InvalidStateError caught. This might mean recognition was already started or in a process of starting/stopping. Current isListening state:", isListening);
        } else if (err?.message?.toLowerCase().includes("already started")) {
           description = "Listening service is already active.";
           setIsListening(true); 
        }

        toast({ title: "Speech Recognition Start Error", description: description, variant: "destructive" });
        if (!err?.message?.toLowerCase().includes("already started") && err?.name !== "InvalidStateError") {
          setIsListening(false);
        }
      }
    }
  };
  
  let footerMessage = "";
  if (isLoadingAIResponse) {
    footerMessage = "Skylar is thinking...";
  } else if (isSkylarSpeaking) {
    footerMessage = "Skylar is speaking...";
  } else if (isListening) {
    footerMessage = "Listening...";
  } else {
    if (!speechApiSupported) {
      footerMessage = "Voice not supported by browser";
    } else if (voicesLoadedRef.current) { 
      footerMessage = "Press mic to talk";
    } else {
      footerMessage = "Loading voices..."; 
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 font-body bg-background text-foreground">
      <header className="mb-6 flex flex-col items-center text-center">
        <Avatar className="w-24 h-24 mb-4 border-2 border-primary shadow-lg">
          <AvatarImage
            src="https://placehold.co/200x200.png"
            alt="Skylar, AI Voice Therapist"
            data-ai-hint="therapist african-american woman" 
          />
          <AvatarFallback>
            <Brain className="w-12 h-12 text-primary" />
          </AvatarFallback>
        </Avatar>
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
                msg.speaker === "skylar" ? "bg-card text-card-foreground border border-primary/30" : 
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

      <footer className="flex flex-col items-center space-y-3 pt-4 border-t border-border">
        <div className="h-6 text-sm text-muted-foreground">
          {footerMessage}
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

