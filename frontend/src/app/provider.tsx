"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider as ReduxProvider } from "react-redux";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { store } from "@/store";

export default function Provider({ children }: { children: React.ReactNode }) {
  // useState ensures a new QueryClient per request in SSR — do NOT use a module-level constant
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60,
            staleTime: 1000 * 60 * 10,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
