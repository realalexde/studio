
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModelSelector } from "./model-selector";
import React from "react";
import { useModel } from "@/contexts/model-context";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/chat", label: "Chat", icon: Icons.Chat },
  { href: "/visual-code", label: "Visual Code", icon: Icons.Code },
  { href: "/image-generator", label: "Image Generator", icon: Icons.Image },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { setCurrentModelId } = useModel(); // currentModelId is managed by ModelSelector via context

  // The ModelSelector now directly uses and updates context.
  // The handleModelChange function is no longer needed here for simple context update.
  // If more complex logic were needed on model change within SidebarNav, it could be reinstated.


  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Icons.Logo className="w-8 h-8 text-accent" />
          <h1 className="text-xl font-semibold text-foreground font-headline">Nexus AI</h1>
        </div>
      </SidebarHeader>
      <Separator className="my-2" />
      <SidebarMenu className="flex-1 p-4">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              className="w-full justify-start"
              tooltip={item.label}
            >
              <Link href={item.href}>
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <Separator className="my-2" />
      <SidebarFooter className="p-4 space-y-4">
         <ModelSelector />
        <div className="flex items-center justify-between w-full p-2 rounded-md border border-border bg-input hover:bg-muted/50 cursor-pointer text-sm">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-sm text-xs font-bold">
                    N
                </div>
                <span className="font-medium text-foreground">Nexus AI</span>
            </div>
            <div className="flex items-center gap-1">
                <Badge variant="destructive" className="h-5 px-1.5 py-0 text-xs">1 Issue</Badge>
                <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground hover:text-foreground">
                    <Icons.Close className="w-3 h-3" />
                </Button>
            </div>
        </div>
      </SidebarFooter>
    </>
  );
}
