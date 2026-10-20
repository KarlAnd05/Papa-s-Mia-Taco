import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import type { StaffUser } from "@/lib/types";

export const AUTH_QUERY_KEY = ["auth", "me"];

// Current staff user, or null when signed out.
export function useStaffUser() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return (await apiFetch<{ user: StaffUser }>("/auth/me")).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useStaffAuthActions() {
  const queryClient = useQueryClient();
  return {
    login: async (username: string, password: string) => {
      const { user } = await apiFetch<{ user: StaffUser }>("/auth/login", { body: { username, password } });
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    logout: async () => {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    },
  };
}
