
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
import { useModel } from "@/contexts/model-context";

interface ModelSelectorProps {
  disabled?: boolean;
}

export function ModelSelector({ disabled }: ModelSelectorProps) {
  const { currentModelId, setCurrentModelId, models } = useModel();

  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor="model-select" className="text-sm font-medium text-muted-foreground">
        AI Model
      </Label>
      <Select
        value={currentModelId}
        onValueChange={setCurrentModelId}
        disabled={disabled}
      >
        <SelectTrigger id="model-select" className="w-full md:w-[200px] bg-input border-border">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
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
