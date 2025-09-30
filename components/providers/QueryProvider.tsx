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
            staleTime: 30_000,
            refetchOnWindowFocus: false,
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
