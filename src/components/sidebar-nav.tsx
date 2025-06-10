
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

const navItems = [
  { href: "/chat", label: "Chat", icon: Icons.Chat },
  { href: "/visual-code", label: "Visual Code", icon: Icons.Code },
  { href: "/image-generator", label: "Image Generator", icon: Icons.Image },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [currentModel, setCurrentModel] = React.useState("moonlight"); // Default to moonlight

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
    console.log("Model changed to:", modelId);
    // Note: This UI change doesn't alter the actual Genkit model used for generation yet.
    // The Genkit instance in src/ai/genkit.ts is still configured with a single model.
  };


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
         <ModelSelector currentModel={currentModel} onModelChange={handleModelChange} />
        <Button variant="outline" size="sm" className="w-full">
          <Icons.Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </SidebarFooter>
    </>
  );
}
