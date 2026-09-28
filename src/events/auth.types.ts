// Auth event names and payload types. This file has no imports, so both
// lib/events.ts and events/auth.events.ts can depend on it without a circular import.

// ── Define the event names as constants ─────────────
export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth:user-registered',
  USER_LOGGED_IN: 'auth:user-logged-in',
  USER_LOGGED_OUT: 'auth:user-logged-out',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  LOGIN_FAILED: 'auth:login-failed',
} as const;

// ── Event payloads ──────────────────────────────────
export interface UserRegisteredEvent {
  id: string;
  email: string;
  tier: string;
}

export interface UserLoggedInEvent {
  userId: string;
  deviceInfo?: string;
}

export interface UserSessionEvent {
  userId: string;
}

export interface LoginFailedEvent {
  email: string;
  reason: 'user_not_found' | 'wrong_password';
  deviceInfo?: string;
}

// Event name -> listener arguments. Used to type `appEvents`.
export type AuthEventMap = {
  [AUTH_EVENTS.USER_REGISTERED]: [UserRegisteredEvent];
  [AUTH_EVENTS.USER_LOGGED_IN]: [UserLoggedInEvent];
  [AUTH_EVENTS.USER_LOGGED_OUT]: [UserSessionEvent];
  [AUTH_EVENTS.TOKEN_REFRESHED]: [UserSessionEvent];
  [AUTH_EVENTS.LOGIN_FAILED]: [LoginFailedEvent];
};
