import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOff, PhoneIncoming, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";

interface IncomingCall {
  id: string;
  caller_name: string;
  caller_phone: string;
  status: string;
  created_at: string;
}

const IncomingCallUI = () => {
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const { status, formatDuration, answerCall, endCall, rejectCall, remoteAudioRef } = useWebRTCCall();
  const [activeCallInfo, setActiveCallInfo] = useState<IncomingCall | null>(null);

  const fetchRingingCalls = useCallback(async () => {
    const { data } = await supabase.from("calls" as any).select("*").eq("status", "ringing").order("created_at", { ascending: false });
    if (data) setIncomingCalls(data as any);
  }, []);

  useEffect(() => {
    fetchRingingCalls();
    const channel = supabase.channel("incoming-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        fetchRingingCalls();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchRingingCalls]);

  const handleAnswer = async (call: IncomingCall) => {
    setActiveCallInfo(call);
    await answerCall(call.id);
  };

  const handleReject = async (callId: string) => {
    await rejectCall(callId);
    fetchRingingCalls();
  };

  const handleEnd = async () => {
    await endCall();
    setActiveCallInfo(null);
    fetchRingingCalls();
  };

  return (
    <>
      <audio ref={remoteAudioRef as any} autoPlay playsInline />

      {/* Active call overlay */}
      <AnimatePresence>
        {status === "active" && activeCallInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 rounded-xl border-2 border-green-500/30 bg-green-500/5 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white animate-pulse">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeCallInfo.caller_name}</p>
                  <p className="text-xs text-muted-foreground">{activeCallInfo.caller_phone}</p>
                  <p className="text-xs font-mono text-green-600">{formatDuration()}</p>
                </div>
              </div>
              <button
                onClick={handleEnd}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming calls list */}
      <AnimatePresence>
        {incomingCalls.length > 0 && status !== "active" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-2"
          >
            <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
              <PhoneIncoming className="h-3.5 w-3.5 animate-pulse" />
              ইনকামিং কল ({incomingCalls.length})
            </p>
            {incomingCalls.map((call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-3 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                    <UserIcon className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{call.caller_name}</p>
                    <p className="text-xs text-muted-foreground">{call.caller_phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAnswer(call)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 active:scale-95 transition-all"
                    title="রিসিভ"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleReject(call.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
                    title="রিজেক্ট"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default IncomingCallUI;
