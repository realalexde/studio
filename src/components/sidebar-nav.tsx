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
import { ModelSelector } from "./model-selector"; // Placeholder for model selection
import React from "react";

const navItems = [
  { href: "/chat", label: "AI Chat", icon: Icons.Chat },
  { href: "/visual-code", label: "AI Visual Code", icon: Icons.Code },
  { href: "/image-generator", label: "AI Image Generator", icon: Icons.Image },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [currentModel, setCurrentModel] = React.useState("gemini"); // Default model

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
    // In a real app, this would also trigger backend changes or flow reconfigurations
    // For G4F, this is conceptual as it's a Python library.
    console.log("Model changed to:", modelId);
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
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="w-full justify-start"
                tooltip={item.label}
              >
                <a>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
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
