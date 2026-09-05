import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

/**
 * Standalone builds (e.g. the Android APK assembled from this repo) may ship
 * without VITE_CONVEX_URL, so no ConvexAuthProvider is mounted. In that mode
 * auth is simply unavailable: report a stable signed-out state and no-op the
 * auth actions so pages render without a provider. The env var is a
 * compile-time constant, so the hook order is stable across renders.
 */
function useStandaloneAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    user: null,
    signIn: async () => {
      throw new Error("Sign-in is unavailable in this build.");
    },
    signOut: async () => {
      throw new Error("Sign-in is unavailable in this build.");
    },
  };
}

export function useAuth() {
  if (!CONVEX_URL) return useStandaloneAuth();

  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  // Derive isLoading directly from the dependencies instead of managing separate state
  const isLoading = isAuthLoading || user === undefined;

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
