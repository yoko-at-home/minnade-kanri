"use client";

import { AuthGate } from "@/components/AuthGate";
import { AppProvider } from "@/context/AppContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AuthGate>{children}</AuthGate>
    </AppProvider>
  );
}
