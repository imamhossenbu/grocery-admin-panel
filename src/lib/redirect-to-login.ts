/**
 * Called by the client UI when an API answers 401/403: the session has
 * expired, was signed out, or is not an admin's. A full navigation lets the
 * proxy refresh or clear the auth cookies on the way to /login.
 */
export function redirectToLogin() {
  // A hard navigation on purpose: the request must go through proxy.ts so
  // stale auth cookies are refreshed or cleared, and all client state is dropped.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/login');
}
