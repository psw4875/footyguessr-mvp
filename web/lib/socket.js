import { io } from "socket.io-client";

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

// ✅ Create socket singleton with secure configuration
export const socket = io(socketUrl, {
  transports: ["websocket", "polling"], // websocket priority, fallback to polling
  autoConnect: true,
  withCredentials: true, // Include CORS credentials
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
