import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Video, Circle, Square, RotateCcw, Upload, AlertCircle, Camera } from "lucide-react";
import { toast } from "sonner";

interface VideoRecorderProps {
  bn: boolean;
  onRecordingComplete?: (blob: Blob) => void;
  maxDurationSeconds?: number; // default 60
}

// Safari/iOS doesn't support 'video/webm' at all — MediaRecorder throws
// synchronously if you pass an unsupported mimeType. This picks the first
// one the current browser actually supports, falling back to letting the
// browser choose its own default if none of our preferred options work.
function pickSupportedMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4", // Safari/iOS records mp4, not webm
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return undefined; // let the browser pick its own default
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Many Windows laptops (Windows Hello) expose TWO cameras: a normal RGB
// one and an infrared (IR) one used for face login. Browsers sometimes
// default to the IR camera, which renders as a dark green/grayscale
// image — that's the "green view" bug, not a code issue. IR camera
// labels usually contain "IR", "Infrared", or "Windows Hello".
function isLikelyIrCamera(label: string) {
  const l = label.toLowerCase();
  return l.includes("ir") || l.includes("infrared") || l.includes("windows hello");
}

export default function VideoRecorder({ bn, onRecordingComplete, maxDurationSeconds = 60 }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isPreviewing, setIsPreviewing] = useState(false); // live preview before recording starts

  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount — stops the camera light and revokes the object URL
  // so we don't leak either across navigations.
  useEffect(() => {
    return () => {
      stopAllTracks();
      clearTimer();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [stopAllTracks, clearTimer]);

  // Lists available cameras once the user has granted permission at least
  // once (device labels are blank until then, by browser design). Picks a
  // non-IR camera as the default selection when possible.
  const refreshCameraList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);

      if (videoInputs.length > 0) {
        setSelectedCameraId((prev) => {
          if (prev && videoInputs.some((d) => d.deviceId === prev)) return prev;
          const nonIr = videoInputs.find((d) => !isLikelyIrCamera(d.label));
          return (nonIr || videoInputs[0]).deviceId;
        });
      }
    } catch {
      // enumerateDevices failing isn't fatal — we just won't show a picker
    }
  }, []);

  const openPreview = async (deviceId?: string) => {
    setPermissionError(null);

    if (!window.isSecureContext) {
      setPermissionError(
        bn
          ? "ক্যামেরা ব্যবহার করতে HTTPS প্রয়োজন। এই ডিভাইসে সাইটটি নিরাপদ সংযোগে (https) খুলুন।"
          : "Camera access requires HTTPS. Please open this site over a secure (https) connection on this device."
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError(
        bn ? "আপনার ব্রাউজার ক্যামেরা রেকর্ডিং সমর্থন করে না।" : "Your browser doesn't support camera recording."
      );
      return;
    }

    setIsStarting(true);
    try {
      // Stop whatever camera is currently open before switching — two
      // getUserMedia streams open at once is how you end up with a stuck
      // camera light or a NotReadableError on some hardware.
      stopAllTracks();

      const videoConstraint: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // avoid feedback while previewing live
        await videoRef.current.play();
      }
      setIsPreviewing(true);

      // Now that permission is granted, device labels are populated —
      // refresh the list so the picker shows real camera names.
      await refreshCameraList();
    } catch (err: any) {
      handleGetUserMediaError(err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleGetUserMediaError = (err: any) => {
    // Different failure modes need different messages — "no camera
    // plugged in" and "you clicked Deny" are not the same problem for
    // the user to solve.
    if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
      setPermissionError(
        bn
          ? "ক্যামেরা/মাইক্রোফোন অ্যাক্সেসের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।"
          : "Camera/microphone permission was denied. Please allow access in your browser settings."
      );
    } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
      setPermissionError(
        bn ? "কোনো ক্যামেরা খুঁজে পাওয়া যায়নি।" : "No camera was found on this device."
      );
    } else if (err?.name === "NotReadableError") {
      setPermissionError(
        bn
          ? "ক্যামেরাটি অন্য কোনো অ্যাপ ব্যবহার করছে। অন্য অ্যাপ বন্ধ করে আবার চেষ্টা করুন।"
          : "The camera is already in use by another app. Close it and try again."
      );
    } else {
      setPermissionError(bn ? "ক্যামেরা অ্যাক্সেস পাওয়া যায়নি" : "Could not access camera");
    }
    toast.error(bn ? "ক্যামেরা অ্যাক্সেস পাওয়া যায়নি" : "Could not access camera");
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (isPreviewing || isRecording) {
      await openPreview(deviceId);
    }
  };

  const startRecording = async () => {
    // If the live preview isn't already open (e.g. camera picker flow was
    // skipped), open it first using whichever camera is currently selected.
    if (!streamRef.current) {
      await openPreview(selectedCameraId || undefined);
      if (!streamRef.current) return; // openPreview failed; error already shown
    }

    const stream = streamRef.current;
    const mimeType = pickSupportedMimeType();
    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // Use a clean, codec-free base type ("video/webm" not
      // "video/webm;codecs=vp9,opus") for the final Blob. Some browsers
      // don't reliably preserve a Blob's full type string — including the
      // ";codecs=..." part — when it's sent through FormData, and fall
      // back to something generic like "text/plain" on the server side
      // instead. A simple type avoids that entirely.
      const baseMimeType = (mimeType || "video/webm").split(";")[0].trim();
      const blob = new Blob(chunksRef.current, { type: baseMimeType });
      setRecordedBlob(blob);
      onRecordingComplete?.(blob);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.muted = false;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        videoRef.current.src = objectUrlRef.current;
      }

      stopAllTracks();
      clearTimer();
      setIsPreviewing(false);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const reRecord = () => {
    setRecordedBlob(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (videoRef.current) videoRef.current.src = "";
    setElapsed(0);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          playsInline // required on iOS or it force-fullscreens the video
          controls={!!recordedBlob}
          className="w-full h-full object-cover"
        />

        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />
            {formatTime(elapsed)} / {formatTime(maxDurationSeconds)}
          </div>
        )}

        {!isRecording && !recordedBlob && !isPreviewing && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <Video className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Camera picker — only shown once we know about more than one
          camera, and only before/during preview (not after recording is
          done). This is the actual fix for the "green view" problem: if
          the auto-picked camera is the wrong (IR) one, switch it here. */}
      {cameras.length > 1 && !recordedBlob && (
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs"
          >
            {cameras.map((cam, i) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `${bn ? "ক্যামেরা" : "Camera"} ${i + 1}`}
              </option>
            ))}
          </select>
          {isPreviewing && !isRecording && (
            <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
              {bn ? "ভিডিও সবুজ দেখালে অন্য ক্যামেরা বেছে নিন" : "Video looks green? Try another camera"}
            </span>
          )}
        </div>
      )}

      {permissionError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{permissionError}</span>
        </div>
      )}

      <div className="flex gap-2">
        {!isPreviewing && !isRecording && !recordedBlob && (
          <Button onClick={() => openPreview(selectedCameraId || undefined)} disabled={isStarting} variant="outline" className="flex-1 gap-1.5">
            <Camera className="h-4 w-4" />
            {isStarting ? (bn ? "খুলছে..." : "Opening...") : bn ? "ক্যামেরা চালু করুন" : "Open Camera"}
          </Button>
        )}

        {isPreviewing && !isRecording && !recordedBlob && (
          <Button onClick={startRecording} className="flex-1 gap-1.5">
            <Video className="h-4 w-4" />
            {bn ? "রেকর্ডিং শুরু করুন" : "Start Recording"}
          </Button>
        )}

        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1 gap-1.5">
            <Square className="h-4 w-4" />
            {bn ? "রেকর্ডিং বন্ধ করুন" : "Stop Recording"}
          </Button>
        )}

        {recordedBlob && !isRecording && (
          <Button onClick={reRecord} variant="outline" className="flex-1 gap-1.5">
            <RotateCcw className="h-4 w-4" />
            {bn ? "আবার রেকর্ড করুন" : "Re-record"}
          </Button>
        )}
      </div>
    </div>
  );
}