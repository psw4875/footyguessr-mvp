/**
 * GA4 Event Tracking Utility
 * 
 * Safely tracks user actions with Google Analytics 4.
 * Checks if gtag exists before calling and handles SSR.
 */

/**
 * Track a GA4 event
 * @param {string} eventName - Event name (must match GA4 events)
 * @param {object} params - Optional event parameters
 * 
 * Example:
 *   trackEvent('click_daily_challenge');
 *   trackEvent('answer_submit', { mode: 'pvp', round_number: 1 });
 * 
 * Debug Mode:
 *   - Automatically enabled in development (NODE_ENV !== "production")
 *   - Can be enabled in production via URL: ?debug_mode=true
 *   - Events appear instantly in GA4 DebugView when enabled
 */
export function trackEvent(eventName, params = {}) {
  // Only run in browser
  if (typeof window === "undefined") {
    return;
  }

  // Check if gtag exists (GA4 scripts loaded)
  if (!window.gtag) {
    return;
  }

  try {
    // Determine if debug mode should be enabled
    const isDevEnvironment = process.env.NODE_ENV !== "production";
    const hasDebugQueryParam = typeof window !== "undefined" && 
      new URLSearchParams(window.location.search).get("debug_mode") === "true";
    const debugModeEnabled = isDevEnvironment || hasDebugQueryParam;

    // Merge debug_mode into params (don't overwrite if already set)
    const finalParams = debugModeEnabled
      ? { debug_mode: true, ...params }
      : params;

    window.gtag("event", eventName, finalParams);
  } catch (err) {
    // Silently fail - don't break app if gtag has issues
    // Optional: log in development only
    if (process.env.NODE_ENV === "development") {
      console.debug("[GA4] Event tracking error:", err);
    }
  }
}

/**
 * Track page view (called automatically by next/router in _app.js)
 * This is a convenience wrapper, but gtag('config') is already handled in _app.js
 */
export function trackPageView(pathname) {
  trackEvent("page_view", {
    page_path: pathname,
  });
}
