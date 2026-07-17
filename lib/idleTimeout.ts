// Shared idle-timeout constants — no "server-only", safe to import from the client-side
// IdleTimeoutMonitor as well as from lib/session.ts's server-side enforcement.
export const IDLE_WARNING_MS = 4 * 60 * 1000; // show the warning after 4 minutes idle
export const IDLE_LOGOUT_MS = 5 * 60 * 1000; // force logout after 5 minutes idle
