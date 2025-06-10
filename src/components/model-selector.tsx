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

// Define available models - G4F is conceptual for this JS-based Genkit setup
const availableModels = [
  { id: "gemini", name: "Gemini (Default)", icon: Icons.Brain },
  { id: "g4f", name: "G4F (Conceptual)", icon: Icons.Brain },
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
        disabled={disabled}
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
