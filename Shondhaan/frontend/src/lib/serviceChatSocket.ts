import { io, type Socket } from "socket.io-client";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getServiceChatToken, getServiceChatVisitorId } from "@/lib/serviceChatApi";

const SERVICE_SOCKET_URL =
  import.meta.env.VITE_SERVICE_SOCKET_URL ||
  import.meta.env.VITE_SERVICE_API_BASE_URL ||
  INDIVIDUAL_API_BASE_URL ||
  "http://localhost:3000";

let serviceChatSocket: Socket | null = null;

export function getServiceChatSocket() {
  if (!serviceChatSocket) {
    serviceChatSocket = io(SERVICE_SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }

  return serviceChatSocket;
}

export function emitServiceChatWithAck<TPayload, TResponse>(
  event: string,
  payload: TPayload,
  timeoutMs = 8000
) {
  return new Promise<TResponse>((resolve, reject) => {
    getServiceChatSocket()
      .timeout(timeoutMs)
      .emit(
        event,
        {
          ...payload,
          token: getServiceChatToken(),
          visitor_id: getServiceChatVisitorId(),
        },
        (err: Error | null, response: TResponse) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(response);
        }
      );
  });
}
