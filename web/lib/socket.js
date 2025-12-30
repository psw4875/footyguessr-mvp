import { io } from "socket.io-client";

// ✅ Use explicit HTTPS socket URL from environment
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_SERVER_URL || "https://api.footyguessr.io";

// ✅ Ensure HTTPS protocol in browser context
const ensureSecureUrl = (url) => {
  if (typeof window === "undefined") return url;
  // Replace http:// with https:// if page is HTTPS
  if (window.location.protocol === "https:" && url.startsWith("http://")) {
    return url.replace(/^http:\/\//, "https://");
  }
  return url;
};

const secureSocketUrl = ensureSecureUrl(socketUrl);

// ✅ Create socket singleton with secure configuration
export const socket = io(secureSocketUrl, {
  transports: ["websocket", "polling"], // websocket priority, fallback to polling
  autoConnect: true,
  secure: true, // Force WSS/HTTPS
  withCredentials: true, // Include CORS credentials
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
