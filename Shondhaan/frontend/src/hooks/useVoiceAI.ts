import { useState, useRef, useCallback, useEffect } from "react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const SILENCE_TIMEOUT = 2000;
const MAX_RESTART_ATTEMPTS = 5;
const AI_RESPONSE_TIMEOUT = 15000;
const TTS_SAFETY_TIMEOUT = 30000;

export type VoiceCallStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type Msg = { role: "user" | "assistant"; content: string };

interface UseVoiceAIOptions {
  userInfo: { name: string; email: string; phone: string; service: string };
  language?: string;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onCallEnd?: (transcript: Msg[]) => void;
}

function detectLanguage(text: string): "bn" | "en" {
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return bengaliChars >= latinChars ? "bn" : "en";
}

export function useVoiceAI({ userInfo, language = "bn", onTranscript, onCallEnd }: UseVoiceAIOptions) {
  const [status, setStatus] = useState<VoiceCallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string>(language);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(0));

  // Refs for mutable state accessible across closures
  const messagesRef = useRef<Msg[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const detectedLangRef = useRef<string>(language);
  const processingRef = useRef(false);
  const restartCountRef = useRef(0);

  // Audio analyser refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const ttsWaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Status helper ───
  const updateStatus = useCallback((s: VoiceCallStatus) => {
    setStatus(s);
  }, []);

  // ─── Silence timer helpers ───
  const clearSilence = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ─── Audio analyser ───
  const stopAudioAnalyser = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (ttsWaveRef.current) { clearInterval(ttsWaveRef.current); ttsWaveRef.current = null; }
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevels(new Array(16).fill(0));
  }, []);

  const startAudioAnalyser = useCallback(async (stream: MediaStream) => {
    try {
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      // Resume if suspended (Chrome autoplay policy)
      if (ctx.state === "suspended") await ctx.resume();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current || !activeRef.current) return;
        analyser.getByteFrequencyData(data);
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(data.length / 16));
        for (let i = 0; i < 16; i++) {
          bars.push(Math.min((data[i * step] || 0) / 200, 1));
        }
        setAudioLevels(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("Audio analyser failed:", e);
    }
  }, []);

  // ─── Cleanup ───
  const cleanup = useCallback(() => {
    activeRef.current = false;
    processingRef.current = false;
    restartCountRef.current = 0;
    setIsActive(false);
    clearSilence();
    stopAudioAnalyser();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    updateStatus("idle");
    setDuration(0);
    messagesRef.current = [];
  }, [updateStatus, stopAudioAnalyser, clearSilence]);

  // ─── Voice selection ───
  const pickBestVoice = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const candidates = voices.filter(v => v.lang.startsWith(langCode));
    const preferredVendors = ["google", "microsoft", "wavenet", "neural"];
    const premium = candidates.find(v =>
      preferredVendors.some(vendor => v.name.toLowerCase().includes(vendor))
    );
    if (premium) return premium;

    const female = candidates.find(v => /female|woman|zira|samantha|priya/i.test(v.name));
    if (female) return female;

    const online = candidates.find(v => !v.localService);
    if (online) return online;

    if (candidates.length) return candidates[0];
    if (langCode !== "en") return pickBestVoice("en");
    return voices[0] || null;
  }, []);

  // ─── TTS Speak ───
  const speak = useCallback((text: string, overrideLang?: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const lang = overrideLang || detectedLangRef.current;
      const isBn = lang === "bn";
      utterance.lang = isBn ? "bn-BD" : "en-US";
      utterance.rate = isBn ? 0.85 : 0.92;
      utterance.pitch = isBn ? 1.05 : 1.0;
      utterance.volume = 1;

      const voice = pickBestVoice(isBn ? "bn" : "en");
      if (voice) utterance.voice = voice;

      // Chrome long-utterance fix
      let keepAlive: ReturnType<typeof setInterval> | null = null;
      if (/chrome/i.test(navigator.userAgent)) {
        keepAlive = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      }

      // TTS waveform simulation
      if (ttsWaveRef.current) clearInterval(ttsWaveRef.current);
      ttsWaveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) return;
        const bars: number[] = [];
        for (let i = 0; i < 16; i++) {
          bars.push(0.15 + Math.random() * 0.6);
        }
        setAudioLevels(bars);
      }, 80);

      // Safety timeout — if TTS hangs, resolve anyway
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);
        if (keepAlive) clearInterval(keepAlive);
        if (ttsWaveRef.current) { clearInterval(ttsWaveRef.current); ttsWaveRef.current = null; }
        setAudioLevels(new Array(16).fill(0));
        resolve();
      };

      const safetyTimer = setTimeout(() => {
        console.warn("TTS safety timeout triggered");
        window.speechSynthesis.cancel();
        done();
      }, TTS_SAFETY_TIMEOUT);

      utterance.onend = () => done();
      utterance.onerror = (e) => {
        console.warn("TTS error:", e);
        done();
      };

      window.speechSynthesis.speak(utterance);

      // Extra safety: check if speech actually started
      setTimeout(() => {
        if (!window.speechSynthesis.speaking && !resolved) {
          console.warn("TTS did not start, resolving.");
          done();
        }
      }, 800);
    });
  }, [pickBestVoice]);

  // ─── AI Response ───
  const getAIResponse = useCallback(async (userText: string): Promise<string> => {
    messagesRef.current.push({ role: "user", content: userText });
    onTranscript?.(userText, "user");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_RESPONSE_TIMEOUT);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messagesRef.current,
          userInfo,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const fallback = err.error || (detectedLangRef.current === "bn"
          ? "দুঃখিত, একটি সমস্যা হয়েছে। আবার বলুন।"
          : "Sorry, there was a problem. Please try again.");
        messagesRef.current.push({ role: "assistant", content: fallback });
        onTranscript?.(fallback, "assistant");
        return fallback;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content
        || (detectedLangRef.current === "bn" ? "দুঃখিত, উত্তর পাওয়া যায়নি।" : "Sorry, no response received.");
      messagesRef.current.push({ role: "assistant", content });
      onTranscript?.(content, "assistant");
      return content;
    } catch (e: any) {
      clearTimeout(timeout);
      const isTimeout = e?.name === "AbortError";
      const fallback = detectedLangRef.current === "bn"
        ? (isTimeout ? "দুঃখিত, উত্তর পেতে দেরি হচ্ছে। আবার বলুন।" : "নেটওয়ার্ক সমস্যা হয়েছে, আবার চেষ্টা করুন।")
        : (isTimeout ? "Sorry, the response is taking too long. Please try again." : "Network error, please try again.");
      messagesRef.current.push({ role: "assistant", content: fallback });
      onTranscript?.(fallback, "assistant");
      return fallback;
    }
  }, [userInfo, onTranscript]);

  // ─── Process user speech ───
  const processUserSpeech = useCallback(async (userText: string) => {
    if (!activeRef.current) { processingRef.current = false; return; }

    const detected = detectLanguage(userText);
    detectedLangRef.current = detected;
    setDetectedLang(detected);

    updateStatus("thinking");
    const aiResponse = await getAIResponse(userText);

    if (!activeRef.current) { processingRef.current = false; return; }

    const responseLang = detectLanguage(aiResponse);
    updateStatus("speaking");
    await speak(aiResponse, responseLang);

    processingRef.current = false;
    restartCountRef.current = 0;

    if (activeRef.current) {
      // Delay to let browser release audio resources before restarting recognition
      updateStatus("listening");
      setTimeout(() => {
        if (activeRef.current && !processingRef.current) {
          console.log("Restarting recognition after AI response");
          startListeningInternal();
        }
      }, 400);
    }
  }, [getAIResponse, speak, updateStatus]);

  // ─── Speech Recognition ───
  const startListeningInternal = useCallback(() => {
    if (!activeRef.current || processingRef.current) return;

    // Check restart limit
    if (restartCountRef.current >= MAX_RESTART_ATTEMPTS) {
      console.warn("Max recognition restart attempts reached. Resetting.");
      restartCountRef.current = 0;
      // Wait longer before trying again
      setTimeout(() => {
        if (activeRef.current && !processingRef.current) {
          startListeningInternal();
        }
      }, 2000);
      return;
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition API not available");
      updateStatus("error");
      return;
    }

    const recognition = new SpeechRecognition();
    const currentLang = detectedLangRef.current;
    recognition.lang = currentLang === "bn" ? "bn-BD" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    let finalTranscript = "";
    let hasReceivedFinal = false;

    const scheduleSilenceCheck = () => {
      clearSilence();
      silenceTimerRef.current = setTimeout(() => {
        if (!activeRef.current || !finalTranscript.trim() || processingRef.current) return;

        processingRef.current = true;
        const userText = finalTranscript.trim();
        finalTranscript = "";
        hasReceivedFinal = false;

        // Stop recognition before processing
        try { recognition.abort(); } catch {}
        recognitionRef.current = null;

        processUserSpeech(userText);
      }, SILENCE_TIMEOUT);
    };

    recognition.onstart = () => {
      if (activeRef.current && !processingRef.current) {
        updateStatus("listening");
        restartCountRef.current = 0; // Reset on successful start
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!activeRef.current || processingRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          if (transcript.trim()) {
            finalTranscript += transcript + " ";
            hasReceivedFinal = true;
            scheduleSilenceCheck();
          }
        } else {
          // Interim result — user is still speaking, reset silence timer
          if (hasReceivedFinal) {
            clearSilence();
            scheduleSilenceCheck();
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilence();
      if (!activeRef.current) return;

      const err = event.error;
      console.warn("Speech recognition error:", err);

      if (err === "not-allowed" || err === "service-not-allowed") {
        updateStatus("error");
        return;
      }

      if (err === "aborted") return; // We aborted intentionally

      if (err === "no-speech" || err === "network") {
        restartCountRef.current++;
        const delay = err === "network" ? 2000 : 500;
        setTimeout(() => {
          if (activeRef.current && !processingRef.current) startListeningInternal();
        }, delay);
        return;
      }

      // Other errors
      restartCountRef.current++;
      setTimeout(() => {
        if (activeRef.current && !processingRef.current) startListeningInternal();
      }, 1000);
    };

    recognition.onend = () => {
      clearSilence();

      // If we have pending speech, process it
      if (finalTranscript.trim() && activeRef.current && !processingRef.current) {
        processingRef.current = true;
        const userText = finalTranscript.trim();
        finalTranscript = "";
        recognitionRef.current = null;
        processUserSpeech(userText);
        return;
      }

      recognitionRef.current = null;

      // Auto-restart if still in a call
      if (activeRef.current && !processingRef.current) {
        restartCountRef.current++;
        setTimeout(() => {
          if (activeRef.current && !processingRef.current) startListeningInternal();
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition start failed:", e);
      recognitionRef.current = null;
      restartCountRef.current++;
      setTimeout(() => {
        if (activeRef.current && !processingRef.current) startListeningInternal();
      }, 500);
    }
  }, [processUserSpeech, updateStatus, clearSilence]);

  // ─── Start Call ───
  const startCall = useCallback(async () => {
    try {
      // Request microphone permission
      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micErr) {
        console.error("Microphone permission denied:", micErr);
        updateStatus("error");
        return;
      }

      updateStatus("connecting");
      activeRef.current = true;
      processingRef.current = false;
      restartCountRef.current = 0;
      setIsActive(true);

      // Use the already-granted stream for audio analyser (don't request again)
      await startAudioAnalyser(micStream);

      messagesRef.current = [];
      detectedLangRef.current = language;
      setDetectedLang(language);

      const greeting = language === "bn"
        ? `আসসালামু আলাইকুম ${userInfo.name}! আমি Yess Bangla। আপনাকে কীভাবে সাহায্য করতে পারি? আপনি বলুন, আমি শুনছি।`
        : `Hello ${userInfo.name}! I'm Yess Bangla. How can I help you today? Please go ahead, I'm listening.`;

      messagesRef.current.push({ role: "assistant", content: greeting });
      onTranscript?.(greeting, "assistant");

      updateStatus("speaking");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      await speak(greeting);

      if (activeRef.current) {
        startListeningInternal();
      }
    } catch (err) {
      console.error("Voice call error:", err);
      updateStatus("error");
      cleanup();
    }
  }, [language, userInfo, speak, startListeningInternal, cleanup, onTranscript, updateStatus, startAudioAnalyser]);

  // ─── End Call ───
  const endCall = useCallback(() => {
    const transcript = [...messagesRef.current];
    cleanup();
    if (transcript.length > 1) {
      onCallEnd?.(transcript);
    }
  }, [cleanup, onCallEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const formatDuration = useCallback(() => {
    const m = Math.floor(duration / 60);
    const s = duration % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [duration]);

  // Pre-load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

  return {
    status,
    isActive,
    duration,
    detectedLang,
    audioLevels,
    formatDuration,
    startCall,
    endCall,
  };
}
