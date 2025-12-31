import { io } from "socket.io-client";

// Module load logging
if (typeof window !== "undefined") {
  if (process.env.NODE_ENV !== "production") {
    console.log("[SOCKET] module loaded", {
      href: window.location.href,
      protocol: window.location.protocol,
    });
  }
}

// ✅ Unified API base URL: localhost detection for dev, production for others
const getApiBase = () => {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }
  // Auto-detect: localhost/127.0.0.1 = dev, otherwise = production
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }
  // Production default
  return "https://api.footyguessr.io";
};

const socketUrl = getApiBase();

// Log socketUrl for debugging
if (typeof window !== "undefined") {
  if (process.env.NODE_ENV !== "production") {
    console.log("[SOCKET] socketUrl =", socketUrl);
  }
}

// ✅ Create socket singleton with secure configuration
export const socket = io(socketUrl, {
  transports: ["websocket", "polling"], // websocket priority, fallback to polling
  autoConnect: true,
  withCredentials: true, // Include CORS credentials
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 20000,
});

// Socket.io event logging
if (typeof window !== "undefined") {
  // Development logging
  if (process.env.NODE_ENV !== "production") {
    socket.on("connect", () => {
      console.info("[SOCKET] connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.info("[SOCKET] disconnected", reason);
    });

    socket.on("error", (err) => {
      console.info("[SOCKET] error", err);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.info("[SOCKET] reconnect success after attempt", attemptNumber);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.info("[SOCKET] reconnect_attempt", attemptNumber);
    });
  }

  // Production + Development logging
  socket.on("connect_error", (err) => {
    console.info("[SOCKET] connect_error", err?.message, err);
  });
}
