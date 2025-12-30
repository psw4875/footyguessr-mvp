# Frontend HTTPS Refactor Summary

## Overview
Refactored frontend to use HTTPS environment variables and secure socket.io connections. All hardcoded HTTP URLs replaced with secure environment-based configuration.

## Files Modified

### 1. **web/lib/socket.js**
**Changes:**
- Added `NEXT_PUBLIC_SOCKET_URL` environment variable (defaults to `NEXT_PUBLIC_SERVER_URL`)
- Added `ensureSecureUrl()` helper to convert `http://` → `https://` in HTTPS context
- Updated socket.io client options:
  - `secure: true` (force WSS/HTTPS)
  - `withCredentials: true` (CORS credentials)
  - `transports: ["websocket", "polling"]` (websocket priority with polling fallback)

**Before:**
```javascript
const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
export const socket = io(url, {
  transports: ["websocket"],
  autoConnect: true,
  secure: isSecure,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

**After:**
```javascript
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_SERVER_URL || "https://api.footyguessr.io";
const secureSocketUrl = ensureSecureUrl(socketUrl);
export const socket = io(secureSocketUrl, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  secure: true,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### 2. **web/pages/game.js**
**Changes:**
- Updated `SERVER_URL` initialization to ensure HTTPS
- Added auto-conversion of `http://` → `https://` for REST API calls
- Defaults to production backend: `https://api.footyguessr.io`

**Before:**
```javascript
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
```

**After:**
```javascript
const SERVER_URL = (() => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "https://api.footyguessr.io";
  if (typeof window !== "undefined" && window.location.protocol === "https:" && baseUrl.startsWith("http://")) {
    return baseUrl.replace(/^http:\/\//, "https://");
  }
  return baseUrl;
})();
```

### 3. **web/.env.local.example** (New)
**Created template for environment variables:**
```env
NEXT_PUBLIC_SERVER_URL=https://api.footyguessr.io
NEXT_PUBLIC_SOCKET_URL=https://api.footyguessr.io
```

## Environment Variables

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `NEXT_PUBLIC_SERVER_URL` | REST API endpoint | `https://api.footyguessr.io` | `https://api.footyguessr.io` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket endpoint | Falls back to `NEXT_PUBLIC_SERVER_URL` | `https://api.footyguessr.io` |

## Security Improvements

✅ **Mixed Content Fix**: All HTTP requests auto-converted to HTTPS in secure context  
✅ **WSS Enforcement**: Socket.io forced to use secure WebSocket (wss://)  
✅ **Credentials Included**: CORS requests include credentials for authenticated endpoints  
✅ **Fallback Support**: Polling transport available if WebSocket fails  
✅ **Production Ready**: Defaults to production backend (https://api.footyguessr.io)  

## Backward Compatibility

Local development still works:
- Set `NEXT_PUBLIC_SERVER_URL=http://localhost:4000` in `.env.local`
- Auto-conversion only applies in HTTPS context (prevents localhost double-conversion)

## Testing

1. **Production (Vercel HTTPS)**:
   ```bash
   # No env setup needed, uses defaults
   # Should connect to wss://api.footyguessr.io
   ```

2. **Local Development**:
   ```bash
   # .env.local
   NEXT_PUBLIC_SERVER_URL=http://localhost:4000
   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
   ```

3. **Verify WebSocket Connection**:
   - Open DevTools → Network tab
   - Look for `io/?...` connection
   - Should be `wss://` (secure) in production
   - Should be `ws://` (unencrypted) in local dev

## No Code Breakage

- All REST API calls (`/api/questions`, etc.) continue to work
- Socket.io event handlers unchanged
- All existing functionality preserved
