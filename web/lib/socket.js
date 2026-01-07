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

// ✅ Lazy socket singleton: not created until explicitly connected
let socketInstance = null;
let isConnecting = false;

/**
 * Get or lazily create the socket instance.
 * Does not auto-connect; call connectSocket() to connect.
 */
export const getSocket = () => {
  if (!socketInstance && typeof window !== "undefined") {
    socketInstance = io(socketUrl, {
      autoConnect: false, // Lazy: do not connect on creation
      transports: ["polling", "websocket"], // Polling first for firewall/proxy compatibility
      upgrade: true, // Allow upgrade from polling to websocket
      rememberUpgrade: true, // Remember successful upgrade
      withCredentials: true, // Include CORS credentials (cookies, auth headers)
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000, // Increased from 10s for slow connections
      // Force polling path to be explicit
      path: "/socket.io/",
    });

    setupSocketLogging(socketInstance);
  }
  return socketInstance;
};

/**
 * Lazily connect socket for PvP and multiplayer features.
 * Safe to call multiple times.
 */
export const connectSocket = () => {
  if (typeof window === "undefined") return;
  const socket = getSocket();
  if (socket && !socket.connected && !isConnecting) {
    isConnecting = true;
    console.log("[SOCKET] connecting to", socketUrl);
    socket.connect();
    setTimeout(() => {
      isConnecting = false;
    }, 500);
  }
};

/**
 * Disconnect socket and clean up for Single/Daily play.
 */
export const disconnectSocket = () => {
  const socket = getSocket();
  if (socket && socket.connected) {
    console.log("[SOCKET] disconnecting");
    socket.disconnect();
  }
};

/**
 * Export singleton with lazy getters for backward compatibility.
 * Accessing socket.on, socket.emit, etc. auto-creates but does NOT auto-connect.
 */
export const socket = new Proxy(
  {},
  {
    get: (target, prop) => {
      const sock = getSocket();
      if (sock && typeof sock[prop] === "function") {
        return sock[prop].bind(sock);
      }
      return sock?.[prop];
    },
  }
);

/**
 * Setup logging for socket events.
 */
function setupSocketLogging(socket) {
  if (typeof window === "undefined") return;

  // Development logging
  if (process.env.NODE_ENV !== "production") {
    socket.on("connect", () => {
      const transport = socket.io?.engine?.transport?.name || "unknown";
      console.info("[SOCKET] connected", { id: socket.id, transport, url: socketUrl });
    });

    socket.on("disconnect", (reason) => {
      console.info("[SOCKET] disconnected", { reason });
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

  // Production + Development logging for connection errors
  socket.on("connect_error", (err) => {
    const transport = socket.io?.engine?.transport?.name || "unknown";
    console.warn("[SOCKET] connect_error", {
      message: err?.message,
      transport,
      url: socketUrl,
    });
  });
}
