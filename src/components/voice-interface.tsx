
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
  const manuallyStoppedRef = useRef(false); // To distinguish programmatic stops from errors/natural ends
  const sessionInitiatedRef = useRef(false); // To ensure greeting happens only once
  const voicesLoadedRef = useRef(voicesLoaded); // Ref to track voicesLoaded state for timeouts/callbacks

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
        // Prioritize known good female-sounding English voices if possible
        const femaleVoiceKeywords = [
          "female", "woman", "girl", "samantha", "allison", "susan", "zoe", "victoria", "tessa",
          "linda", "heather", "eva", "jessa", "zira", "lucy", "anna", "claire", "emily",
          "olivia", "sophia", "google us english", "microsoft zira", "microsoft jessa"
        ];

        // Prefer en-US voices
        const enUSVoices = allAvailableVoices.filter(v => v.lang.startsWith("en-US"));
        console.log(`[LoadVoices] Found ${enUSVoices.length} en-US voices.`);
        targetVoice = enUSVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;

        if (!targetVoice && enUSVoices.length > 0) {
          targetVoice = enUSVoices.find(v => v.default) || enUSVoices[0]; // Fallback to default or first en-US
          console.log(`[LoadVoices] No specific female en-US voice found. Selected default or first en-US voice: ${targetVoice?.name}`);
        }

        // If no en-US match, try any English voice
        if (!targetVoice) {
          const enVoices = allAvailableVoices.filter(v => v.lang.startsWith("en"));
          console.log(`[LoadVoices] No en-US voice match. Found ${enVoices.length} 'en' (any region) voices.`);
          targetVoice = enVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
          if (!targetVoice && enVoices.length > 0) {
            targetVoice = enVoices.find(v => v.default) || enVoices[0]; // Fallback to default or first 'en'
            console.log(`[LoadVoices] No specific female 'en' voice found. Selected default or first 'en' voice: ${targetVoice?.name}`);
          }
        }
        
        // If still no voice, pick any default or first available
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
      setVoicesLoaded(true); // Ensure this is always called
    }
  }, [speechApiSupported, setSelectedVoice, setVoicesLoaded]);


  useEffect(() => { // VoiceInitEffect: Initialize Web Speech APIs and load voices
    console.log("[VoiceInitEffect] Running voice initialization effect.");
    let voiceLoadTimeoutId: NodeJS.Timeout | null = null;

    if (typeof window === "undefined") {
      console.log("[VoiceInitEffect] Window is undefined. Setting speechApiSupported=false, voicesLoaded=true (to unblock).");
      setSpeechApiSupported(false);
      setVoicesLoaded(true); // Unblock UI if in non-browser environment
      return;
    }

    const browserSupportsSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const browserSupportsSpeechSynthesis = !!window.speechSynthesis;

    if (!browserSupportsSpeechRecognition || !browserSupportsSpeechSynthesis) {
      console.warn("[VoiceInitEffect] Browser does not support required Speech APIs. speechApiSupported=false, voicesLoaded=true.");
      setSpeechApiSupported(false);
      setVoicesLoaded(true); // Unblock UI
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the Web Speech API needed for voice interaction. This app requires voice.",
        variant: "destructive",
        duration: Infinity, // Keep this message until dismissed
      });
      return;
    }

    console.log("[VoiceInitEffect] Browser supports Speech APIs. speechApiSupported=true.");
    setSpeechApiSupported(true);

    // Attempt to load voices
    if (browserSupportsSpeechSynthesis) {
      console.log("[VoiceInitEffect] Attempting initial voice load by calling loadVoices() directly.");
      loadVoices(); // Initial attempt

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        console.log("[VoiceInitEffect] Setting onvoiceschanged handler.");
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("[VoiceInitEffect] onvoiceschanged event fired. Calling loadVoices().");
            loadVoices();
        };
      } else {
         console.warn("[VoiceInitEffect] onvoiceschanged not supported by browser. Relied on initial loadVoices call and timeout.");
      }
      
      // Fallback timeout to ensure voicesLoaded is eventually true
      voiceLoadTimeoutId = setTimeout(() => {
        console.warn(`[VoiceInitEffect TIMEOUT] 3 seconds reached. Forcing voicesLoaded=true as a fallback.`);
        setVoicesLoaded(true); // Unconditionally set to true to unblock
      }, 3000);

    } else {
      // Should not happen if browserSupportsSpeechSynthesis was true, but as a safeguard
      console.warn("[VoiceInitEffect] Speech synthesis explicitly not supported by browser. Setting voicesLoaded=true.");
      setVoicesLoaded(true); // Unblock UI
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
      window.speechSynthesis.cancel(); // Unconditionally cancel previous speech
    } catch (cancelError) {
      console.warn("[Speak] Error during unconditional cancel:", cancelError);
    }

    let recognitionWasActiveAndWillBeRestarted = false;
    if (speechRecognitionRef.current && isListening) {
        console.log("[Speak] Recognition is active. Temporarily stopping it before TTS playback. Setting manuallyStoppedRef=true.");
        manuallyStoppedRef.current = true; // Signal that this stop is for TTS
        recognitionWasActiveAndWillBeRestarted = true;
        try {
            speechRecognitionRef.current.stop();
        } catch (e) {
            console.warn("[Speak] Error stopping recognition before speech:", e);
        }
    }
    
    let voiceForUtterance: SpeechSynthesisVoice | null = null;
    console.log(`[Speak] Voice selection: Initial check - selectedVoice (state): ${selectedVoice ? selectedVoice.name : "null"}, voicesLoadedRef.current: ${voicesLoadedRef.current}`);

    if (selectedVoice && voicesLoadedRef.current) { // Prioritize state if voices considered loaded
        console.log(`[Speak] Voice selection: Using selectedVoice from state: ${selectedVoice.name}`);
        voiceForUtterance = selectedVoice;
    }


    // If no voice from state or voices not yet "loaded", try direct dynamic lookup
    if (!voiceForUtterance) {
        console.log(`[Speak] Voice selection: voiceForUtterance is still null. Attempting direct dynamic lookup.`);
        const allVoicesNow = window.speechSynthesis.getVoices();
        console.log(`[Speak] Voice selection: Direct lookup found ${allVoicesNow.length} voices.`);

        if (allVoicesNow.length === 0) {
            console.warn("[Speak] Voice selection: CRITICAL during direct dynamic lookup: No speech synthesis voices available.");
        } else {
            const femaleVoiceKeywords = [ // Re-define for local scope or import
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
            if (!foundDirectly) { // If no en-US, try any 'en'
              const enVoices = allVoicesNow.filter(v => v.lang.startsWith("en"));
              foundDirectly = enVoices.find(v => femaleVoiceKeywords.some(kw => v.name.toLowerCase().includes(kw))) || null;
              if(!foundDirectly && enVoices.length > 0) {
                  foundDirectly = enVoices.find(v => v.default) || enVoices[0];
              }
            }
            if (!foundDirectly && allVoicesNow.length > 0) { // If still none, take system default or first
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
      utterance.lang = voiceForUtterance.lang; // Set lang from voice if available
      console.log(`[Speak] Utterance voice set to: ${utterance.voice.name}, lang: ${utterance.lang}`);
    } else {
      utterance.lang = "en-US"; // Fallback language if no voice object found
      console.warn(`[Speak] No specific voice selected for utterance. Utterance lang explicitly set to '${utterance.lang}'. Attempting to use a system default voice.`);
    }

    // Explicitly set properties to prevent silent playback from zeroed values
    utterance.volume = 1; // Max volume
    utterance.rate = 1;   // Normal rate
    utterance.pitch = 1;  // Normal pitch

    utterance.onstart = () => {
        console.log("[Speak] Utterance started successfully.");
        setIsSkylarSpeaking(true);
    }

    const handleSpeakEndOrError = () => {
        console.log(`[Speak handleSpeakEndOrError] Called. recognitionWasActiveAndWillBeRestarted: ${recognitionWasActiveAndWillBeRestarted}, isListening (state): ${isListening}`);
        manuallyStoppedRef.current = false; // Reset flag, TTS has finished its attempt
        if (recognitionWasActiveAndWillBeRestarted && speechRecognitionRef.current && isListening) {
            console.log("[Speak handleSpeakEndOrError] Skylar finished or errored, attempting to restart recognition after a short delay.");
            // Short delay to allow audio system to settle before restarting STT
            setTimeout(() => {
                if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) { // Check again if still listening and not manually stopped for another reason
                    console.log("[Speak handleSpeakEndOrError] Delay complete, calling recognition.start().");
                    try {
                        speechRecognitionRef.current.start();
                    } catch (e) {
                        console.warn("[Speak handleSpeakEndOrError] Could not restart recognition after Skylar speech/error", e);
                    }
                } else {
                     console.log("[Speak handleSpeakEndOrError] Conditions for restarting recognition no longer met after delay.");
                }
            }, 100); // 100ms delay
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
      
      // Avoid toasting for common "interruptions" unless it's a persistent problem
      if (errorCode !== 'canceled' && errorCode !== 'interrupted' && errorCode !== 'not-allowed') { 
        toast({
          title: "Speech Error",
          description: `Could not play Skylar's response. (Error: ${errorCode})`,
          variant: "destructive",
        });
      }
      handleSpeakEndOrError();
    };
    
    // Brief delay before speaking, can sometimes help with race conditions in browser audio systems
    setTimeout(() => {
      try {
        console.log(`[Speak] Preparing to call window.speechSynthesis.speak(). Utterance details - Text: "${utterance.text.substring(0,30)}...", Lang: ${utterance.lang}, Voice: ${utterance.voice?.name || 'Default'}, Volume: ${utterance.volume}, Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);
        console.log(`[Speak] SpeechSynthesis state before speak(): speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}`);
        window.speechSynthesis.speak(utterance);
      } catch (speakError: any) {
        console.error("[Speak] Critical error during window.speechSynthesis.speak() call:", speakError);
        setIsSkylarSpeaking(false);
        manuallyStoppedRef.current = false; // Reset flag
        toast({
          title: "Critical Speech Error",
          description: `Failed to initiate speech playback. ${speakError.message || ''}`.trim(),
          variant: "destructive",
        });
         // Try to restart recognition if it was active
         if (recognitionWasActiveAndWillBeRestarted && speechRecognitionRef.current && isListening) {
              console.log("[Speak] Critical speak() error, attempting to restart recognition.");
              setTimeout(() => { // Add delay here too
                  if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                      try { speechRecognitionRef.current.start(); } catch (e) { console.warn("[Speak] Could not restart recognition after critical speak() error", e); }
                  }
              }, 100); 
          }
        if (onEndCallback) {
           try { onEndCallback(); } catch (cbError) { console.error("[Speak] Error in onEndCallback after speak() threw an error:", cbError); }
        }
      }
    }, 50); // 50ms delay
  }, [speechApiSupported, toast, selectedVoice, setIsSkylarSpeaking, isListening, voicesLoadedRef]); // voicesLoadedRef added to dependencies


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
      if (!voicesLoadedRef.current) { // Check ref for most up-to-date status
        console.log("[SessionInitFunc] Aborting: Voices not loaded yet (checked via ref).");
        // Optionally, inform user or retry after a short delay if this happens often
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

        // Add greeting to chat history
        const greetingMessage = { id: `skylar-greeting-${Date.now()}`, speaker: "skylar" as const, text: aiResult.skylarResponse, icon: Brain };
        setChatHistory(prev => {
            // Prevent duplicate greetings if this function were somehow called multiple times rapidly
            if (prev.some(msg => msg.id.startsWith('skylar-greeting-'))) {
                console.warn("[SessionInitFunc] Duplicate greeting detected by ID. Not adding again.");
                return prev;
            }
            return [...prev, greetingMessage];
        });
        
        console.log(`[SessionInitFunc] Attempting to speak greeting: "${aiResult.skylarResponse.substring(0,30)}..."`);
        speak(aiResult.skylarResponse); // TTS for the greeting

      } catch (error) {
        console.error("[SessionInitFunc] Error during session initiation AI call:", error);
        handleGenericError(error, "session initiation");
        sessionInitiatedRef.current = false; // Allow re-initiation on next attempt if this failed
      } finally {
        setIsLoadingAIResponse(false);
        console.log("[SessionInitFunc] Finished. isLoadingAIResponse set to false.");
      }
    }, [speak, handleGenericError, setSessionState, setIsLoadingAIResponse, setChatHistory, voicesLoadedRef]); // voicesLoadedRef added


  const handleUserSpeech = useCallback(async (userInput: string) => {
    setCurrentTranscript(""); // Clear interim transcript
    setChatHistory(prev => [...prev, { id: Date.now().toString(), speaker: "user", text: userInput, icon: User }]);
    setIsLoadingAIResponse(true);

    try {
      // 1. Safety Net Check
      const safetyInput: SafetyNetActivationInput = { userInput };
      const safetyResult = await safetyNetActivation(safetyInput);

      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        // Safety response needed
        setChatHistory(prev => [...prev, { id: `safety-${Date.now()}`, speaker: "system", text: safetyResult.safetyResponse, icon: AlertTriangle }]);
        speak(safetyResult.safetyResponse); // Speak the safety response
        setIsLoadingAIResponse(false);
        return; // Stop further processing if safety net activated
      }

      // 2. Main AI Therapy Conversation
      const aiInput: VoiceConversationWithSkylarInput = { userInput, sessionState };
      const aiResult = await voiceConversationWithSkylar(aiInput);

      setSessionState(aiResult.updatedSessionState);
      setChatHistory(prev => [...prev, { id: `skylar-${Date.now()}`, speaker: "skylar", text: aiResult.skylarResponse, icon: Brain }]);
      
      // Speak Skylar's response and then try to re-enable listening
      speak(aiResult.skylarResponse, () => {
          console.log("[handleUserSpeech speak callback] Skylar finished speaking response. Ensuring recognition attempts to restart if conditions met.");
          // This callback runs after speak() finishes (either onend or onerror)
          if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
              console.log("[handleUserSpeech speak callback] Conditions appear met. Attempting to start recognition via setTimeout for safety.");
              setTimeout(() => { // Short delay before restarting recognition
                  if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                      try {
                          console.log("[handleUserSpeech speak callback] setTimeout: Calling recognition.start().");
                          speechRecognitionRef.current.start();
                      } catch(e: any) {
                          if (e.name !== 'InvalidStateError') { // Ignore common benign error if already started
                             console.warn("[handleUserSpeech speak callback] setTimeout: Could not restart recognition after AI response.", e);
                          } else {
                             console.log("[handleUserSpeech speak callback] setTimeout: InvalidStateError on restart, likely benign (already started or stopping).");
                          }
                      }
                  } else {
                      console.log("[handleUserSpeech speak callback] setTimeout: Conditions for restarting recognition no longer met.");
                  }
              }, 100); // 100ms delay
          } else {
              console.log("[handleUserSpeech speak callback] Conditions not met for restarting recognition automatically.");
          }
      });


    } catch (error) {
      handleGenericError(error, "user speech");
      // If an error occurred during AI processing, still try to re-enable listening if appropriate
      if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
         console.log("Error in handleUserSpeech, ensuring recognition attempts to restart if speak() didn't or if error before speak.");
         manuallyStoppedRef.current = false; // Ensure it's false if error happened before speak could set it
         setTimeout(() => { // Short delay
            if (speechRecognitionRef.current && isListening && !manuallyStoppedRef.current) {
                try { speechRecognitionRef.current.start(); } catch(e) { console.warn("Could not restart recognition after AI error (from handleUserSpeech)", e); }
            }
         }, 100);
      }
    } finally {
      setIsLoadingAIResponse(false);
    }
  }, [sessionState, speak, handleGenericError, isListening, setChatHistory, setSessionState, setIsLoadingAIResponse, setCurrentTranscript]);


  useEffect(() => { // SpeechRecognitionEffect: Setup and manage STT
    if (!speechApiSupported) {
      console.log("[SpeechRecEffect] Speech API not supported, skipping SpeechRecognition setup.");
      return;
    }

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      console.warn("[SpeechRecEffect] SpeechRecognition implementation not found in browser.");
      // setSpeechApiSupported(false); // This could also be an option
      return;
    }

    if (!speechRecognitionRef.current) {
        console.log("[SpeechRecEffect] Initializing new SpeechRecognition instance.");
        speechRecognitionRef.current = new SpeechRecognitionImpl();
        speechRecognitionRef.current.continuous = true; // Keep listening even after pauses
        speechRecognitionRef.current.interimResults = true; // Get results as they come
        speechRecognitionRef.current.lang = "en-US"; // Set language
    }

    const recognition = speechRecognitionRef.current;

    // Detailed lifecycle event logging
    recognition.onstart = () => { console.log("[SR onstart] Recognition service reported as started."); };
    recognition.onaudiostart = () => { console.log("[SR onaudiostart] Audio capture reported as started by recognition service."); };
    recognition.onsoundstart = () => { console.log("[SR onsoundstart] Sound detected by recognition service."); };
    recognition.onspeechstart = () => { console.log("[SR onspeechstart] Speech detected by recognition service."); };
    
    recognition.onaudioend = () => { console.log("[SR onaudioend] Audio capture reported as ended by recognition service."); };
    recognition.onsoundend = () => { console.log("[SR onsoundend] Sound detection reported as ended by recognition service."); };
    recognition.onspeechend = () => { console.log("[SR onspeechend] Speech detection reported as ended by recognition service."); };


    const onResultHandler = (event: SpeechRecognitionEvent) => {
      console.log("[SR onresult] Received result. Skylar speaking:", window.speechSynthesis.speaking);
      // If Skylar is speaking, interrupt her
      if (window.speechSynthesis.speaking) {
        console.log("[SR onresult] Skylar is speaking, cancelling her speech due to user input (interruption).");
        window.speechSynthesis.cancel(); // Stop Skylar's TTS
        setIsSkylarSpeaking(false);
        manuallyStoppedRef.current = false; // Allow recognition to naturally restart or be handled
        // Send an "USER_INTERRUPTED" message to the AI flow
        // This part is tricky: we need the AI to respond to the interruption, then process the *new* speech.
        // For now, we'll let the current transcript process. The AI prompt has USER_INTERRUPTED logic if needed.
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
        setCurrentTranscript(finalTranscript.trim()); // Show final transcript briefly
        if (isListening) { // Check if still in listening mode
            manuallyStoppedRef.current = true; // Signal programmatic stop for processing
            try { recognition.stop(); } catch(e) { console.warn("[SR onresult] Error stopping recognition after final transcript:", e); }
        }
        handleUserSpeech(finalTranscript.trim()); // Process the final transcript
      }
    };

    const onErrorHandler = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SR onerror] SpeechRecognition Error:", event.error, "Full event:", event);
      let toastMessage = "An unknown error occurred with speech recognition.";
      let shouldStopGlobalListening = false; // Flag to stop listening entirely on critical errors
      let autoRestart = false; // Flag to attempt auto-restart for transient errors
      const currentRecognition = speechRecognitionRef.current; // Capture for closure

      switch (event.error) {
        case 'not-allowed': case 'security':
          toastMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
          shouldStopGlobalListening = true; break;
        case 'audio-capture':
          toastMessage = "Audio capture failed. Please check your microphone.";
          shouldStopGlobalListening = true; break; // Often critical
        case 'no-speech':
          // Only auto-restart if user is actively listening and Skylar isn't speaking/loading
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
             // No toast needed, this is often part of normal flow
             return; // Don't proceed with further error handling for intentional aborts
          } else if (isListening && !isSkylarSpeaking && !isLoadingAIResponse) {
            // If aborted unexpectedly while actively listening
            console.log("[SR onerror] Recognition aborted unexpectedly, attempting auto-restart."); autoRestart = true;
          } else {
            console.log("[SR onerror] Recognition aborted, but not auto-restarting (state check failed).");
            if (isListening) setIsListening(false); // If it was listening but conditions changed
            return;
          }
          break;
        case 'service-not-allowed':
          toastMessage = "Speech recognition service is not allowed by the browser or system."; shouldStopGlobalListening = true; break;
        case 'bad-grammar': // This usually means the speech was unintelligible
          toastMessage = "Speech recognition could not understand the input. Please try speaking more clearly.";
          // Auto-restart might be useful here to give the user another chance quickly
          if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && !manuallyStoppedRef.current) {
            console.log("[SR onerror] Bad grammar, attempting auto-restart."); autoRestart = true;
          }
          break;
        case 'language-not-supported':
          toastMessage = "The configured language for speech recognition is not supported."; shouldStopGlobalListening = true; break;
        default:
          console.log("[SR onerror] Default error case, assuming critical and stopping listening if flag set.");
          shouldStopGlobalListening = true; // Default to critical for unknown errors
          break;
      }

      if (autoRestart && currentRecognition) {
          console.log("[SR onerror] Auto-restarting recognition.");
          setCurrentTranscript(""); // Clear any partial transcript
          manuallyStoppedRef.current = false; // Ensure it's false for restart
          setTimeout(() => { // Give a moment before restarting
              try {
                  // Double check conditions before restarting
                  if (isListening && !manuallyStoppedRef.current && currentRecognition) {
                    console.log("[SR onerror] Calling recognition.start() for auto-restart.");
                    currentRecognition.start();
                  } else {
                    console.log("[SR onerror] Auto-restart conditions changed during timeout or manuallyStoppedRef is true. Not starting.");
                    if (isListening && manuallyStoppedRef.current) setIsListening(false); // Correct state if stop was manual
                  }
              } catch (e) {
                  console.warn("[SR onerror] Error during auto-restart recognition.start():", e);
                  if (isListening) setIsListening(false); // Stop if restart fails
              }
          }, 100);
          // Only toast for errors other than 'no-speech' if auto-restarting, 'no-speech' is common
          if (event.error === 'no-speech' && toastMessage.includes("No speech detected.")) {
            // Avoid toast for no-speech if auto-restarting, it's disruptive
          } else if (event.error !== 'no-speech') { // Toast for other auto-restarted errors
             toast({ title: "Speech Recognition", description: toastMessage, variant: "default" });
          }
      } else if (!autoRestart && event.error !== 'aborted') { // Don't toast for intentional aborts
        // For non-restarting errors (or if 'aborted' wasn't handled as intentional)
        toast({ title: event.error === 'no-speech' ? "Speech Recognition" : "Speech Recognition Error", description: toastMessage, variant: event.error === 'no-speech' ? "default" : "destructive" });
      }

      if (shouldStopGlobalListening && isListening) {
        console.log("[SR onerror] Critical error, setting manuallyStoppedRef=true, isListening=false.");
        manuallyStoppedRef.current = true; // Prevent any further auto-restarts from onend
        setIsListening(false);
        if (currentRecognition) try { currentRecognition.stop(); } catch (e) { console.warn("[SR onerror] Error stopping recognition after critical error:", e); }
      } else if (!isListening && shouldStopGlobalListening) {
         // Ensure flag is set even if already not listening, to prevent onend restarts
         manuallyStoppedRef.current = true;
      }
    };

    const onEndHandler = () => {
      const currentRecognition = speechRecognitionRef.current;
      console.log("[SR onend] Recognition ended. Manually stopped:", manuallyStoppedRef.current, "IsListening:", isListening, "Skylar Speaking:", isSkylarSpeaking, "Loading AI:", isLoadingAIResponse);
      
      // If recognition was stopped intentionally (e.g., by user, for TTS, or after final result), don't auto-restart here.
      if (manuallyStoppedRef.current) {
        console.log("[SR onend] Recognition was stopped intentionally. No auto-restart from onEnd handler.");
        // The logic in speak() or toggleListening() or onResultHandler should handle restarting if needed.
        return;
      }

      // If it ended unexpectedly (not manually stopped) while still supposed to be listening, and Skylar isn't busy
      if (isListening && !isSkylarSpeaking && !isLoadingAIResponse && currentRecognition) {
        console.log("[SR onend] Conditions met for auto-restart from onEnd (e.g., after a short pause or non-critical error not handled by onerror). Calling recognition.start().");
        manuallyStoppedRef.current = false; // Ensure it's false for this restart path
        try {
          currentRecognition.start();
        } catch (e: any) {
          // Handle common error if recognition is already in the process of starting
          if (e?.name !== 'InvalidStateError') {
             console.warn("[SR onend] Error restarting recognition, setting isListening to false.", e);
             setIsListening(false); // If restart fails critically, stop listening state
          } else {
            console.log("[SR onend] InvalidStateError during restart from onEnd, likely benign (already starting or stopping).");
          }
        }
      } else {
          console.log("[SR onend] Recognition ended, but not auto-restarting based on current conditions (e.g. user stopped, Skylar speaking, etc.).");
          // If it's not listening but ended, it might be a natural stop after an error handled by onError, or user toggled off.
          // If isListening is false here, it means user explicitly stopped or a critical error occurred.
      }
    };

    recognition.onresult = onResultHandler;
    recognition.onerror = onErrorHandler;
    recognition.onend = onEndHandler;

    // Cleanup function for the effect
    return () => {
      if (speechRecognitionRef.current) {
        console.log("[SpeechRecEffectCleanup] Cleaning up SpeechRecognition listeners and stopping recognition.");
        manuallyStoppedRef.current = true; // Ensure it's marked as manually stopped for cleanup
        // Remove all event listeners
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
        // speechRecognitionRef.current = null; // Optional: nullify the ref if re-creation is desired on next mount
      }
      // Also cancel any ongoing speech synthesis
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechApiSupported, handleUserSpeech, toast, isListening, isSkylarSpeaking, isLoadingAIResponse, setIsListening, setIsSkylarSpeaking, setCurrentTranscript]); // Key state dependencies


  const toggleListening = async () => {
    if (!speechApiSupported || !speechRecognitionRef.current) {
        toast({ title: "Voice Error", description: "Speech recognition is not supported or not initialized.", variant: "destructive"});
        setIsListening(false); // Ensure state reflects unavailability
        return;
    }
    const recognition = speechRecognitionRef.current;

    if (isListening) {
      // User is stopping listening
      console.log("[ToggleListening] Stopping listening (isListening was true). Setting manuallyStoppedRef=true.");
      manuallyStoppedRef.current = true; // Signal user-initiated stop
      try {
        recognition.stop();
      } catch (e) {
        console.warn("[ToggleListening] Error stopping speech recognition:", e);
      }
      setIsListening(false);
      // If Skylar was speaking, cancel her speech too
      if (window.speechSynthesis.speaking) {
        console.log("[ToggleListening] Skylar was speaking, cancelling her speech as user turned off mic.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
    } else {
      // User is starting listening
      console.log("[ToggleListening] Starting listening (isListening was false). Setting manuallyStoppedRef=false.");
      manuallyStoppedRef.current = false; // Reset flag for a new listening session
      // If Skylar is speaking, interrupt her to allow user to speak
      if (window.speechSynthesis.speaking) {
         console.log("[ToggleListening] Skylar was speaking, cancelling her speech because user wants to talk.");
        window.speechSynthesis.cancel();
        setIsSkylarSpeaking(false);
      }
      setCurrentTranscript(""); // Clear any old interim transcript

      // Check for initial greeting
      console.log(`[ToggleListening] Checking conditions for initial greeting: sessionInitiatedRef.current=${sessionInitiatedRef.current}, voicesLoaded (ref)=${voicesLoadedRef.current}, voicesLoaded (state)=${voicesLoaded}`);
      if (!sessionInitiatedRef.current) { // If session not yet started
        if (voicesLoadedRef.current) { // And voices are loaded
            console.log("[ToggleListening] Conditions met (using ref for voicesLoaded): Initiating session (greeting).");
            await initiateSessionAsyncInternal(); // This will make Skylar speak the greeting
        } else {
            console.warn("[ToggleListening] First mic click, but voices not loaded yet (checked via ref). Greeting will be skipped or delayed.");
            toast({title: "Voice System Initializing", description: "Skylar's voice is still warming up. Please try clicking the mic again in a moment.", variant: "default"})
            // Do not start recognition yet if voices critical for greeting are not ready
            // User will have to click again.
            return; 
        }
      }


      try {
        // Check microphone permission before starting (modern browsers)
        if (navigator.permissions && navigator.permissions.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                 toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
                 console.log("[ToggleListening] Microphone permission denied. Not starting.");
                 setIsListening(false); // Ensure isListening is false if permission denied
                 return;
            }
             if (permissionStatus.state === 'prompt') {
                 // Browser will prompt user. STT might error if denied.
                 toast({ title: "Microphone Access", description: "Please allow microphone access when prompted." });
                 console.log("[ToggleListening] Microphone permission is 'prompt'. Recognition will attempt to start.");
            }
        }
        console.log("[ToggleListening] Attempting to call recognition.start(). Current recognition object:", recognition);
        recognition.start();
        setIsListening(true); // Set listening state true
      } catch (err: any) {
        console.error("[ToggleListening] Error starting speech recognition:", err);
        let description = "Could not start voice recognition. Check mic and permissions.";
        if (err?.name === "NotAllowedError") description = "Microphone access denied. Enable in browser settings.";
        else if (err?.name === "InvalidStateError") {
            // This can happen if .start() is called when it's already started or in a transient state.
            // It's often benign if isListening is already true or becomes true shortly.
            description = "Listening service busy or already started. Try again if it doesn't activate.";
            console.warn("[ToggleListening] InvalidStateError caught. This might mean recognition was already started or in a process of starting/stopping. Current isListening state:", isListening);
            // If it's an InvalidStateError and we are trying to start, it might already be starting.
            // We'll set isListening to true optimistically or let the onstart handler confirm.
        } else if (err?.message?.toLowerCase().includes("already started")) {
           description = "Listening service is already active.";
           setIsListening(true); // Correct state if it was already started
        }

        toast({ title: "Speech Recognition Start Error", description: description, variant: "destructive" });
        // Only set isListening to false if it's not an "already started" type error.
        if (!err?.message?.toLowerCase().includes("already started") && err?.name !== "InvalidStateError") {
          setIsListening(false);
        }
      }
    }
  };
  
  // Determine footer message based on current state
  let footerMessage = "";
  if (isLoadingAIResponse) {
    footerMessage = "Skylar is thinking...";
  } else if (isSkylarSpeaking) {
    footerMessage = "Skylar is speaking...";
  } else if (isListening) {
    footerMessage = "Listening...";
  } else {
    // Not loading AI, not speaking, not listening
    if (!speechApiSupported) {
      footerMessage = "Voice not supported by browser";
    } else if (voicesLoadedRef.current) { // Check ref for most up-to-date status
      footerMessage = "Press mic to talk";
    } else {
      footerMessage = "Loading voices..."; 
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 font-body bg-background text-foreground">
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
                msg.speaker === "skylar" ? "bg-card text-card-foreground border border-primary/30" : // Skylar's card
                "bg-destructive/20 text-destructive-foreground mx-auto border-destructive" // System/error card
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
          {/* Display interim transcript with some opacity */}
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
          // Disable button if API not supported, voices not loaded, or if AI is responding and user is not currently listening (to prevent interrupting AI mid-thought before it speaks)
          disabled={!speechApiSupported || !voicesLoadedRef.current || (isLoadingAIResponse && !isListening && !isSkylarSpeaking) }
        >
          {/* Show loader if AI is working and mic is effectively "off" for user input */}
          {isLoadingAIResponse && !isListening && !isSkylarSpeaking ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
        {/* Informative messages for unsupported browser or ongoing voice loading */}
        {(!speechApiSupported && voicesLoadedRef.current) && ( // voicesLoadedRef might be true if timeout fired but API support is still false
             <p className="text-xs text-destructive text-center mt-2">
                Voice interaction is not supported by your browser. This app requires voice functionality.
            </p>
        )}
         {(!speechApiSupported && !voicesLoadedRef.current) && ( // Both false, e.g. during initial SSR or if detection is slow
            <p className="text-xs text-destructive text-center mt-2">
                Voice interaction is not supported by your browser or voices are still loading. This app requires voice functionality.
            </p>
        )}
      </footer>
    </div>
  );
}
