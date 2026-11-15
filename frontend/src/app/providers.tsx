import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ServicesProvider } from "@/services";

/* App-wide providers. Server data → TanStack Query over the services layer; client state → Zustand stores (no provider). */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={client}>
      <ServicesProvider>{children}</ServicesProvider>
    </QueryClientProvider>
  );
}
