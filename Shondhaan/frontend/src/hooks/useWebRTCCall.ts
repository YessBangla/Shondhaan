import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CallStatus = "idle" | "ringing" | "active" | "ended" | "missed" | "error";

interface UseWebRTCCallOptions {
  onStatusChange?: (status: CallStatus) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTCCall(options?: UseWebRTCCallOptions) {
  const [callId, setCallId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback((s: CallStatus) => {
    setStatus(s);
    options?.onStatusChange?.(s);
  }, [options]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null; }
  }, []);

  // Start a call (caller side)
  const startCall = useCallback(async (callerName: string, callerPhone: string, conversationId?: string) => {
    try {
      updateStatus("ringing");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // Create call record
      const { data: call, error } = await supabase.from("calls" as any).insert({
        caller_name: callerName,
        caller_phone: callerPhone,
        conversation_id: conversationId || null,
        status: "ringing",
      } as any).select("id").single();

      if (error || !call) { updateStatus("error"); cleanup(); return; }
      const newCallId = (call as any).id;
      setCallId(newCallId);

      // Collect ICE candidates
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await supabase.from("call_ice_candidates" as any).insert({
            call_id: newCallId,
            sender: "caller",
            candidate: e.candidate.toJSON(),
          } as any);
        }
      };

      // Handle remote audio
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await supabase.from("calls" as any).update({ sdp_offer: offer } as any).eq("id", newCallId);

      // Listen for answer via realtime
      const channel = supabase.channel(`call-${newCallId}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${newCallId}`,
        }, async (payload: any) => {
          const updated = payload.new;
          if (updated.status === "active" && updated.sdp_answer && pc.signalingState !== "closed") {
            await pc.setRemoteDescription(new RTCSessionDescription(updated.sdp_answer));
            updateStatus("active");
            setDuration(0);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          }
          if (updated.status === "ended" || updated.status === "missed") {
            updateStatus(updated.status as CallStatus);
            cleanup();
            channel.unsubscribe();
          }
        })
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "call_ice_candidates",
          filter: `call_id=eq.${newCallId}`,
        }, async (payload: any) => {
          const data = payload.new;
          if (data.sender === "callee" && pc.signalingState !== "closed") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch {}
          }
        })
        .subscribe();

      // Auto-timeout after 60 seconds
      setTimeout(async () => {
        if (pcRef.current && status === "ringing") {
          await supabase.from("calls" as any).update({ status: "missed", ended_at: new Date().toISOString() } as any).eq("id", newCallId);
          updateStatus("missed");
          cleanup();
          channel.unsubscribe();
        }
      }, 60000);

    } catch (err) {
      console.error("Call error:", err);
      updateStatus("error");
      cleanup();
    }
  }, [cleanup, updateStatus, status]);

  // Answer a call (callee/call center side)
  const answerCall = useCallback(async (incomingCallId: string) => {
    try {
      // Get call data
      const { data: callData } = await supabase.from("calls" as any).select("*").eq("id", incomingCallId).single();
      if (!callData) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      setCallId(incomingCallId);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await supabase.from("call_ice_candidates" as any).insert({
            call_id: incomingCallId,
            sender: "callee",
            candidate: e.candidate.toJSON(),
          } as any);
        }
      };

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription((callData as any).sdp_offer));

      // Add existing ICE candidates from caller
      const { data: candidates } = await supabase.from("call_ice_candidates" as any)
        .select("*").eq("call_id", incomingCallId).eq("sender", "caller");
      if (candidates) {
        for (const c of candidates) {
          try { await pc.addIceCandidate(new RTCIceCandidate((c as any).candidate)); } catch {}
        }
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("calls" as any).update({
        sdp_answer: answer,
        status: "active",
        answered_at: new Date().toISOString(),
        call_center_user_id: (await supabase.auth.getUser()).data.user?.id,
      } as any).eq("id", incomingCallId);

      updateStatus("active");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Listen for new ICE candidates from caller
      const channel = supabase.channel(`call-answer-${incomingCallId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "call_ice_candidates",
          filter: `call_id=eq.${incomingCallId}`,
        }, async (payload: any) => {
          const data = payload.new;
          if (data.sender === "caller" && pc.signalingState !== "closed") {
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
          }
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${incomingCallId}`,
        }, async (payload: any) => {
          if (payload.new.status === "ended") {
            updateStatus("ended");
            cleanup();
            channel.unsubscribe();
          }
        })
        .subscribe();

    } catch (err) {
      console.error("Answer error:", err);
      updateStatus("error");
      cleanup();
    }
  }, [cleanup, updateStatus]);

  // End call
  const endCall = useCallback(async () => {
    if (callId) {
      await supabase.from("calls" as any).update({
        status: "ended",
        ended_at: new Date().toISOString(),
      } as any).eq("id", callId);
    }
    updateStatus("ended");
    cleanup();
    setCallId(null);
    setDuration(0);
  }, [callId, cleanup, updateStatus]);

  // Reject call
  const rejectCall = useCallback(async (rejectedCallId: string) => {
    await supabase.from("calls" as any).update({
      status: "missed",
      ended_at: new Date().toISOString(),
    } as any).eq("id", rejectedCallId);
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return {
    callId,
    status,
    duration,
    formatDuration: () => formatDuration(duration),
    startCall,
    answerCall,
    endCall,
    rejectCall,
    remoteAudioRef,
    cleanup,
  };
}
