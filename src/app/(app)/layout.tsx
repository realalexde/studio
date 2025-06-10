
import { AppShell } from "@/components/app-shell";
import type { PropsWithChildren } from 'react';
import { ModelProvider } from "@/contexts/model-context";

export default function AppPagesLayout({ children }: PropsWithChildren) {
  return (
    <ModelProvider>
      <AppShell>{children}</AppShell>
    </ModelProvider>
  );
}
