import { io } from "socket.io-client";

// Falls back to localhost for local dev; set VITE_SOCKET_URL in your
// .env for staging/production builds instead of hardcoding it.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  // Components call socket.connect() themselves once a user is known —
  // autoConnect would instead open an anonymous connection the moment
  // this module is imported, ahead of auth.
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Re-announce the current user to the backend every time a connection is
// (re)established — not just on first connect. Without this, a dropped
// connection (network blip, phone lock, laptop sleep) silently stops the
// user from receiving events until a full page reload, since the server
// loses whatever room/association "join_user" set up.
let currentUserId: string | null = null;

export function setSocketUser(userId: string | null) {
  currentUserId = userId;
  if (userId && socket.connected) {
    socket.emit("join_user", userId);
  }
}

socket.on("connect", () => {
  if (currentUserId) {
    socket.emit("join_user", currentUserId);
  }
});