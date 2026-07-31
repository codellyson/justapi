"use client";

import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";

/** Browser auth client. baseURL defaults to the current origin. */
export const authClient = createAuthClient({
  plugins: [apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
