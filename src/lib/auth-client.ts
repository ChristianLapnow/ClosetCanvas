import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// VITE_BACKEND_URL is injected at build time via vite.config.ts
// In dev: points to localhost:3000
// In production: Vibecode injects the real backend URL at build time
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BACKEND_URL || undefined,
  fetchOptions: { credentials: "include" },
  plugins: [emailOTPClient()],
});

export const { useSession, signOut, signIn, signUp } = authClient;
