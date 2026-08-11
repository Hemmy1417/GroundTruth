"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WalletProvider } from "@/lib/wallet";
import { TxProvider } from "@/lib/tx";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Calm defaults on purpose: StudioNet rate-limits per IP, so no focus
  // refetch storms, one retry, and a real stale window.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TxProvider>{children}</TxProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
