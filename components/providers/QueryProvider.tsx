"use client";

import { ReactNode, useState } from "react";
import {
  DehydratedState,
  HydrationBoundary as RQHydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // Data fresh for 30 seconds
            gcTime: 5 * 60 * 1000, // Cache for 5 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: 1000,
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}

type HydrateProps = {
  state: DehydratedState | undefined;
  children: ReactNode;
};

export function Hydrate({ state, children }: HydrateProps) {
  return <RQHydrationBoundary state={state}>{children}</RQHydrationBoundary>;
}
