
"use client";

import React, { createContext, useContext, useState, ReactNode, ElementType } from 'react';
import { Icons } from '@/components/icons';

export interface AiModel {
  id: string;
  name: string;
  icon: ElementType;
}

// Define available models with Moonlight branding - This is the single source of truth
export const availableModelsList: AiModel[] = [
  { id: "moonlight-go", name: "moonlight go", icon: Icons.Brain },
  { id: "moonlight-lite", name: "moonlight lite", icon: Icons.Brain },
  { id: "moonlight", name: "moonlight", icon: Icons.Brain }, // Default
  { id: "moonlight-flash", name: "moonlight flash", icon: Icons.Brain },
  { id: "moonlight-pro", name: "moonlight pro", icon: Icons.Brain },
];

interface ModelContextType {
  currentModelId: string;
  setCurrentModelId: (modelId: string) => void;
  models: AiModel[];
  getSelectedModel: () => AiModel | undefined;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider = ({ children }: { children: ReactNode }) => {
  const [currentModelId, setCurrentModelId] = useState<string>("moonlight"); // Default model ID

  const getSelectedModel = () => {
    return availableModelsList.find(m => m.id === currentModelId);
  };

  const value = {
    currentModelId,
    setCurrentModelId,
    models: availableModelsList,
    getSelectedModel,
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};
