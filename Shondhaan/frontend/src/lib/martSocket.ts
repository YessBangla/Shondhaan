import { io, type Socket } from "socket.io-client";

export const MART_SOCKET_URL =
  import.meta.env.VITE_MART_SOCKET_URL ||
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

let martSocket: Socket | null = null;

export function getMartSocket() {
  if (!martSocket) {
    martSocket = io(MART_SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }

  return martSocket;
}

export function emitWithAck<TPayload, TResponse>(
  event: string,
  payload: TPayload,
  timeoutMs = 8000
) {
  return new Promise<TResponse>((resolve, reject) => {
    getMartSocket()
      .timeout(timeoutMs)
      .emit(event, payload, (err: Error | null, response: TResponse) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(response);
      });
  });
}
