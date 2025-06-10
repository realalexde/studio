import { AppShell } from "@/components/app-shell";
import type { PropsWithChildren } from 'react';

export default function AppPagesLayout({ children }: PropsWithChildren) {
  return <AppShell>{children}</AppShell>;
}
