"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "group rounded-xl border border-gray-200 bg-white text-sm text-foreground shadow-md",
            title: "font-medium",
            description: "text-muted-foreground",
            closeButton: "text-muted-foreground",
          },
        }}
      />
    </QueryClientProvider>
  );
}
