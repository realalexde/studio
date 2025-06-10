
"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Icons } from "./icons";

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

// Define available models with Moonlight branding
const availableModels = [
  { id: "moonlight-go", name: "Moonlight Go (Gemini 1.5 Flash)", icon: Icons.Brain },
  { id: "moonlight-lite", name: "Moonlight Lite (Gemini 1.5 Pro)", icon: Icons.Brain },
  { id: "moonlight", name: "Moonlight (Gemini 2.0 Flash)", icon: Icons.Brain },
  { id: "moonlight-flash", name: "Moonlight Flash (Gemini 2.0 Flash lite)", icon: Icons.Brain },
  { id: "moonlight-pro", name: "Moonlight Pro (Gemini 2.5 Flash preview)", icon: Icons.Brain },
];

export function ModelSelector({ currentModel, onModelChange, disabled }: ModelSelectorProps) {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor="model-select" className="text-sm font-medium text-muted-foreground">
        AI Model
      </Label>
      <Select
        value={currentModel}
        onValueChange={onModelChange}
        disabled={disabled} // Removed availableModels.length <= 1 as we now have multiple options
      >
        <SelectTrigger id="model-select" className="w-full md:w-[200px] bg-input border-border">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <model.icon className="h-4 w-4 text-muted-foreground" />
                <span>{model.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
