
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
          <h1 className="text-xl font-semibold text-foreground font-headline">Moonlight AI</h1>
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
      </SidebarFooter>
    </>
  );
}
