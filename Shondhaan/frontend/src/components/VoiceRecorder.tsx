import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
  buttonClassName?: string;
}

const VoiceRecorder = ({ onRecordingComplete, disabled, buttonClassName }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        onRecordingComplete(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Permission denied or no mic
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-medium text-red-500 tabular-nums min-w-[32px]">{formatTime(duration)}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white transition-all hover:bg-red-600 shrink-0"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={buttonClassName || "flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40"}
    >
      <Mic className="h-4 w-4" />
    </button>
  );
};

export default VoiceRecorder;
