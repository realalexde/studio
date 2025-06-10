"use client";

import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarContent,
  SidebarRail
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true); // Default to open sidebar

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar 
        variant="sidebar" 
        collapsible="icon" 
        className="border-r border-sidebar-border shadow-md"
      >
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 h-16 bg-background/80 backdrop-blur-sm border-b border-border md:hidden">
          <div className="flex items-center gap-2">
            {/* Mobile Logo/Title if needed */}
          </div>
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
