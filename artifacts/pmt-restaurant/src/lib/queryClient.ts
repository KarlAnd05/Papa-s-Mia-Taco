import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient: QueryClient = new QueryClient({
  // If the staff session expires while using the admin panel, mark the user as signed out
  // so the admin guard sends them back to the login page.
  queryCache: new QueryCache({
    onError: (error, query) => {
      const status = error instanceof ApiError ? error.status : (error as { status?: number })?.status;
      if (status === 401 && query.queryKey[0] !== "auth") {
        queryClient.setQueryData(["auth", "me"], null);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
