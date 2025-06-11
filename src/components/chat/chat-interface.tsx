
"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { searchAndSummarize, SearchAndSummarizeInput, SearchAndSummarizeOutput, AiChatMessage } from "@/ai/flows/search-and-summarize";
import { SYSTEM_INSTRUCTIONS } from "@/ai/prompts/chat-system-instructions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useModel } from "@/contexts/model-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc, 
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent as TabsContentUI } from "@/components/ui/tabs"; 
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input"; 
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  avatar?: string;
  isLoading?: boolean;
  imageUrl?: string;
  imageError?: boolean;
}

interface DialogData {
  messages: Message[];
  name: string;
}

const CHAT_DATA_STORAGE_KEY = "noxGptChatData_v2"; 
const CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY = "noxGptChatActiveDialogId_v1"; 
const DEFAULT_DIALOG_ID = "chat-1";
const STUDIO_MODE_STORAGE_KEY = "noxGptStudioMode_v1";
const STUDIO_TEMPERATURE_STORAGE_KEY = "noxGptStudioTemperature_v1";

export function ChatInterface() {
  const [dialogsData, setDialogsData] = useState<Record<string, DialogData>>({});
  const [activeDialogId, setActiveDialogId] = useState<string | null>(null);
  
  const [currentInputText, setCurrentInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [triggerFocus, setTriggerFocus] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const { toast } = useToast();
  const { getSelectedModel } = useModel();

  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [uploadAccompanyingText, setUploadAccompanyingText] = useState("");
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [editingDialogId, setEditingDialogId] = useState<string | null>(null);
  const [currentRenameValue, setCurrentRenameValue] = useState<string>("");

  const [studioMode, setStudioMode] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [studioSystemPrompt, setStudioSystemPrompt] = useState<string>("");
  const [lastRequestDebug, setLastRequestDebug] = useState<object | null>(null);
  const [lastResponseDebug, setLastResponseDebug] = useState<object | null>(null);


  const selectedModel = getSelectedModel();
  const modelDisplayName = selectedModel ? selectedModel.name : "";

  useEffect(() => {
    const savedStudioMode = localStorage.getItem(STUDIO_MODE_STORAGE_KEY);
    if (savedStudioMode) setStudioMode(JSON.parse(savedStudioMode));
    const savedTemperature = localStorage.getItem(STUDIO_TEMPERATURE_STORAGE_KEY);
    if (savedTemperature) setTemperature(parseFloat(savedTemperature));
    
    try {
      const savedDataJson = localStorage.getItem(CHAT_DATA_STORAGE_KEY);
      const savedActiveDialogId = localStorage.getItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY);

      let loadedData: Record<string, DialogData> = {};
      if (savedDataJson) {
        const parsedData = JSON.parse(savedDataJson);
        Object.keys(parsedData).forEach(id => {
          if (parsedData[id] && Array.isArray(parsedData[id].messages) && typeof parsedData[id].name === 'string') {
            loadedData[id] = {
              name: parsedData[id].name,
              messages: parsedData[id].messages.map((msg: any) => ({
                ...msg,
                isLoading: false,
                imageError: msg.imageError || false, 
                imageUrl: msg.imageError ? undefined : msg.imageUrl,
              })).filter(Boolean),
            };
          }
        });
      }

      let currentActiveId = savedActiveDialogId;
      const defaultName = DEFAULT_DIALOG_ID.replace(/-/g, ' ');
      const capitalizedDefaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);


      if (Object.keys(loadedData).length === 0) {
        loadedData = { [DEFAULT_DIALOG_ID]: { messages: [], name: capitalizedDefaultName } };
        currentActiveId = DEFAULT_DIALOG_ID;
      } else if (!currentActiveId || !loadedData[currentActiveId]) {
        currentActiveId = Object.keys(loadedData)[0];
      }
      
      setDialogsData(loadedData);
      setActiveDialogId(currentActiveId);

    } catch (error) {
      console.error("Failed to load chat data from localStorage:", error);
      toast({
        variant: "destructive",
        title: "Chat History Error",
        description: "Could not load previous chat data. Starting fresh.",
      });
      const defaultName = DEFAULT_DIALOG_ID.replace(/-/g, ' ');
      const capitalizedDefaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      setDialogsData({ [DEFAULT_DIALOG_ID]: { messages: [], name: capitalizedDefaultName } });
      setActiveDialogId(DEFAULT_DIALOG_ID);
      localStorage.removeItem(CHAT_DATA_STORAGE_KEY);
      localStorage.removeItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY);
    }
    setInitialLoadComplete(true);
  }, [toast]);

  useEffect(() => {
    if (!initialLoadComplete) return; 

    localStorage.setItem(STUDIO_MODE_STORAGE_KEY, JSON.stringify(studioMode));
    localStorage.setItem(STUDIO_TEMPERATURE_STORAGE_KEY, temperature.toString());
    // Note: studioSystemPrompt is not saved to localStorage for now

    try {
      const dataToSave: Record<string, DialogData> = {};
      Object.entries(dialogsData).forEach(([id, data]) => {
        dataToSave[id] = {
          name: data.name,
          messages: data.messages.map(({ isLoading: _isLoading, ...rest }) => {
             return rest.imageError ? { ...rest, imageUrl: undefined } : rest;
          }),
        };
      });

      localStorage.setItem(CHAT_DATA_STORAGE_KEY, JSON.stringify(dataToSave));
      if (activeDialogId) {
        localStorage.setItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY, activeDialogId);
      } else {
        localStorage.removeItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save chat data to localStorage:", error);
    }
  }, [dialogsData, activeDialogId, initialLoadComplete, studioMode, temperature]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [dialogsData, activeDialogId]);

 useEffect(() => {
    if (triggerFocus && textareaRef.current) {
      textareaRef.current.focus();
      if (typeof textareaRef.current.click === 'function') {
        // Attempt to trigger click to help with mobile keyboard
        textareaRef.current.click();
      }
      setTriggerFocus(false);
    }
  }, [triggerFocus]);

  const currentMessages = activeDialogId ? dialogsData[activeDialogId]?.messages || [] : [];

  const handleAddDialog = () => {
    const existingDialogNumbers = Object.keys(dialogsData)
      .map(id => {
        const match = id.match(/^chat-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null) as number[];
    
    let newDialogNumber = 1;
    if (existingDialogNumbers.length > 0) {
      existingDialogNumbers.sort((a, b) => a - b);
      for (const num of existingDialogNumbers) {
        if (newDialogNumber < num) break; 
        if (newDialogNumber === num) newDialogNumber++; 
      }
    }
    const newDialogId = `chat-${newDialogNumber}`;
    const newDialogName = `Chat ${newDialogNumber}`;

    setDialogsData(prevData => ({
      ...prevData,
      [newDialogId]: { messages: [], name: newDialogName }
    }));
    setActiveDialogId(newDialogId);
    setCurrentInputText("");
  };

  const handleDeleteDialog = (dialogIdToDelete: string) => {
    if (Object.keys(dialogsData).length <= 1) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "You must have at least one chat open." });
      return;
    }
    const updatedData = { ...dialogsData };
    delete updatedData[dialogIdToDelete];
    setDialogsData(updatedData);

    if (activeDialogId === dialogIdToDelete) {
      const remainingDialogIds = Object.keys(updatedData);
      if (remainingDialogIds.length > 0) {
        setActiveDialogId(remainingDialogIds[0]);
      } else {
        const defaultName = DEFAULT_DIALOG_ID.replace(/-/g, ' ');
        const capitalizedDefaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        setDialogsData({ [DEFAULT_DIALOG_ID]: { messages: [], name: capitalizedDefaultName } });
        setActiveDialogId(DEFAULT_DIALOG_ID);
      }
    }
  };

  const handleRenameSubmit = () => {
    if (editingDialogId && currentRenameValue.trim() !== "") {
      setDialogsData(prev => ({
        ...prev,
        [editingDialogId]: {
          ...(prev[editingDialogId] || { messages: [], name: '' }), 
          name: currentRenameValue.trim(),
        }
      }));
    }
    setEditingDialogId(null);
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!currentInputText.trim() || !activeDialogId || !dialogsData[activeDialogId]) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInputText,
      sender: "user",
    };
    
    setDialogsData(prev => ({
      ...prev,
      [activeDialogId]: {
        ...prev[activeDialogId],
        messages: [...(prev[activeDialogId]?.messages || []), userMessage],
      }
    }));
    
    const botLoadingMessageId = (Date.now() + 1).toString();
    setDialogsData(prev => ({
      ...prev,
      [activeDialogId]: {
        ...prev[activeDialogId],
        messages: [...(prev[activeDialogId]?.messages || []), { id: botLoadingMessageId, text: "", sender: "bot", isLoading: true }],
      }
    }));

    setCurrentInputText("");
    setIsLoading(true);

    const historyForAI: AiChatMessage[] = (dialogsData[activeDialogId]?.messages || [])
      .filter(msg => !msg.isLoading && (msg.text?.trim() !== "" || msg.imageUrl))
      .slice(0, -1) 
      .map(({ sender, text, imageUrl }) => ({ sender, text: text || "", imageUrl }));
          
    try {
      const flowInput: SearchAndSummarizeInput = {
        query: userMessage.text, 
        history: historyForAI,
        ...(studioMode && { 
          temperature: temperature,
          customSystemInstructions: studioSystemPrompt.trim() || undefined,
        }),
      };
      if (studioMode) setLastRequestDebug(flowInput);

      const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);
      if (studioMode) setLastResponseDebug(result);

      setDialogsData(prev => {
        const currentDialog = prev[activeDialogId!];
        if (!currentDialog) return prev;
        return {
          ...prev,
          [activeDialogId!]: {
            ...currentDialog,
            messages: currentDialog.messages.map(msg =>
              msg.id === botLoadingMessageId ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false, imageError: false } : msg
            ),
          }
        };
      });
    } catch (error) {
      console.error("AI Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      if (studioMode) setLastResponseDebug({ error: errorText });
      setDialogsData(prev => {
        const currentDialog = prev[activeDialogId!];
        if (!currentDialog) return prev;
        return {
          ...prev,
          [activeDialogId!]: {
            ...currentDialog,
            messages: currentDialog.messages.map(msg =>
              msg.id === botLoadingMessageId ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageUrl: undefined, imageError: true } : msg
            ),
          }
        };
      });
      toast({ variant: "destructive", title: "Error", description: `Failed to get response: ${errorText}` });
    } finally {
      setIsLoading(false);
      setTriggerFocus(true);
    }
  };
  
  const processFileForUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setImageToUpload(file);
    } else {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select a valid image file." });
      setImageToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFileForUpload(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  const handleSendUploadedImage = async () => {
    if (!imageToUpload || !activeDialogId || !dialogsData[activeDialogId]) {
      toast({ variant: "destructive", title: "No Image Selected", description: "Please select an image to upload."});
      return;
    }
    setIsProcessingUpload(true);
    setIsUploadImageDialogOpen(false);

    const reader = new FileReader();
    reader.readAsDataURL(imageToUpload);
    reader.onload = async () => {
      const imageDataUri = reader.result as string;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: uploadAccompanyingText,
        sender: "user",
        imageUrl: imageDataUri,
      };
      setDialogsData(prev => ({
        ...prev,
        [activeDialogId]: {
          ...prev[activeDialogId],
          messages: [...(prev[activeDialogId]?.messages || []), userMessage],
        }
      }));

      const botLoadingMessageId = (Date.now() + 1).toString();
      setDialogsData(prev => ({
        ...prev,
        [activeDialogId]: {
          ...prev[activeDialogId],
          messages: [...(prev[activeDialogId]?.messages || []), { id: botLoadingMessageId, text: "", sender: "bot", isLoading: true }],
        }
      }));
      
      setIsLoading(true); 

      const historyForAI: AiChatMessage[] = (dialogsData[activeDialogId]?.messages || [])
        .filter(msg => !msg.isLoading && (msg.text?.trim() !== "" || msg.imageUrl))
        .slice(0, -1) 
        .map(({ sender, text, imageUrl }) => ({ sender, text: text || "", imageUrl }));

      try {
        const queryPayload = {
            text: uploadAccompanyingText || undefined, 
            imageUrl: imageDataUri,
        };
        const flowInput: SearchAndSummarizeInput = {
          query: queryPayload,
          history: historyForAI,
          ...(studioMode && { 
            temperature: temperature,
            customSystemInstructions: studioSystemPrompt.trim() || undefined,
          }),
        };
        if (studioMode) setLastRequestDebug(flowInput);

        const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);
        if (studioMode) setLastResponseDebug(result);

        setDialogsData(prev => {
          const currentDialog = prev[activeDialogId!];
          if (!currentDialog) return prev;
          return {
            ...prev,
            [activeDialogId!]: {
              ...currentDialog,
              messages: currentDialog.messages.map(msg =>
                msg.id === botLoadingMessageId ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false, imageError: false } : msg
              ),
            }
          };
        });
        toast({ title: "Image Sent & Processed", description: "AI has received your image."});
      } catch (error) {
        console.error("AI Error with Uploaded Image:", error);
        const errorText = error instanceof Error ? error.message : "An unknown error occurred processing the image.";
        if (studioMode) setLastResponseDebug({ error: errorText });
        setDialogsData(prev => {
          const currentDialog = prev[activeDialogId!];
          if (!currentDialog) return prev;
          return {
            ...prev,
            [activeDialogId!]: {
              ...currentDialog,
              messages: currentDialog.messages.map(msg =>
                msg.id === botLoadingMessageId ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageError: true } : msg
              ),
            }
          };
        });
        toast({ variant: "destructive", title: "Processing Error", description: errorText });
      } finally {
        setIsLoading(false);
        setIsProcessingUpload(false);
        setImageToUpload(null);
        setUploadAccompanyingText("");
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        setTriggerFocus(true);
      }
    };
    reader.onerror = (error) => {
      console.error("File Reading Error:", error);
      toast({ variant: "destructive", title: "File Error", description: "Could not read the selected image file."});
      setIsProcessingUpload(false);
      setTriggerFocus(true);
    };
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (!initialLoadComplete || !activeDialogId) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Spinner className="w-8 h-8 animate-spin text-accent" />
        <p className="ml-2">Loading chats...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="font-headline text-2xl text-foreground flex items-center gap-2 shrink-0">
          <Icons.Chat className="w-7 h-7 text-accent" />
          Chat
          {modelDisplayName && <span className="text-sm font-normal text-muted-foreground ml-1">({modelDisplayName})</span>}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <Button variant="outline" size="sm" onClick={handleAddDialog} className="border-input hover:bg-accent/10">
            <Icons.PlusSquare className="w-4 h-4 mr-2" /> New Chat
          </Button>
          {Object.keys(dialogsData).length > 1 && (
            <Button variant="outline" size="sm" onClick={() => handleDeleteDialog(activeDialogId!)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <Icons.Trash2 className="w-4 h-4 mr-2" /> Delete Chat
            </Button>
          )}
           <div className="flex items-center space-x-2">
            <Switch
              id="studio-mode-toggle"
              checked={studioMode}
              onCheckedChange={setStudioMode}
              disabled={isLoading || isProcessingUpload}
            />
            <Label htmlFor="studio-mode-toggle" className="text-sm text-muted-foreground">Studio Mode</Label>
          </div>
        </div>
      </div>
          
      <Tabs value={activeDialogId} onValueChange={setActiveDialogId} className="w-full flex flex-col flex-1">
        <TabsList className="w-full justify-start overflow-x-auto mb-4 shrink-0">
          {Object.keys(dialogsData).map((dialogId) => {
            const dialogName = dialogsData[dialogId]?.name || dialogId.replace(/-/g, ' ');
            return (
              <TabsTrigger
                key={dialogId}
                value={dialogId}
                className="capitalize text-xs sm:text-sm relative"
                onDoubleClick={() => {
                  setEditingDialogId(dialogId);
                  setCurrentRenameValue(dialogName);
                }}
                title="Double-click to rename"
              >
                {editingDialogId === dialogId ? (
                  <input
                    type="text"
                    value={currentRenameValue}
                    onChange={(e) => setCurrentRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRenameSubmit();
                      }
                      if (e.key === 'Escape') {
                        setEditingDialogId(null);
                        setCurrentRenameValue(''); 
                      }
                    }}
                    autoFocus
                    className="text-xs sm:text-sm font-medium bg-transparent outline-none border-b border-accent text-foreground h-full p-0 m-0"
                    style={{ minWidth: '50px', maxWidth: '150px' }}
                    size={Math.max(10, currentRenameValue.length > 0 ? currentRenameValue.length : dialogName.length)}
                  />
                ) : (
                  dialogName
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {studioMode && (
          <Accordion type="single" collapsible className="w-full mb-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border p-2">
            <AccordionItem value="studio-settings">
              <AccordionTrigger className="text-sm px-2 py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Icons.Settings className="w-4 h-4 text-accent" />
                  Studio Mode Settings
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-2 space-y-4">
                <Card className="bg-background/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Temperature</CardTitle>
                    <CardDescription className="text-xs">Controls randomness. Lower is more deterministic, higher is more creative. (Current: {temperature.toFixed(2)})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      defaultValue={[temperature]}
                      value={[temperature]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={(value) => setTemperature(value[0])}
                      disabled={isLoading || isProcessingUpload}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/70">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">System Instructions</CardTitle>
                        <CardDescription className="text-xs">
                            Edit the system prompt below. Leave empty to use default Moonlight instructions.
                            Default instructions can be found in <code className="text-xs bg-muted p-1 rounded">src/ai/prompts/chat-system-instructions.ts</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={studioSystemPrompt}
                            onChange={(e) => setStudioSystemPrompt(e.target.value)}
                            placeholder="Default Moonlight instructions will be used if this is empty..."
                            className="min-h-[100px] text-xs bg-muted/30 border-input focus-visible:ring-accent"
                            disabled={isLoading || isProcessingUpload}
                        />
                    </CardContent>
                </Card>

                {lastRequestDebug && (
                    <Card className="bg-background/70">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Last AI Request</CardTitle>
                            <CardDescription className="text-xs">Data sent to the AI flow for the last message.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-32 w-full rounded-md border bg-muted/30 p-2">
                                <pre className="text-xs whitespace-pre-wrap font-mono">{JSON.stringify(lastRequestDebug, null, 2)}</pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
                {lastResponseDebug && (
                     <Card className="bg-background/70">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Last AI Response</CardTitle>
                             <CardDescription className="text-xs">Raw data received from the AI flow for the last message.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-32 w-full rounded-md border bg-muted/30 p-2">
                                <pre className="text-xs whitespace-pre-wrap font-mono">{JSON.stringify(lastResponseDebug, null, 2)}</pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Card className="w-full flex-1 flex flex-col shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6">
              <div className="space-y-6">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-3 ${
                      message.sender === "user" ? "justify-end" : ""
                    }`}
                  >
                    {message.sender === "bot" && (
                      <Avatar className="w-8 h-8 border border-accent self-start">
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>
                          <Icons.Moon className="w-5 h-5 text-accent" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[70%] rounded-xl shadow ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-secondary text-secondary-foreground rounded-bl-none"
                      } ${message.imageUrl && !message.imageError ? "p-2" : "p-3"}`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center space-x-2 p-3">
                          <Icons.Spinner className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      ) : (
                        <>
                          {message.imageUrl && !message.imageError && (
                            <div className="mb-2 rounded-md overflow-hidden border border-border relative bg-muted/50" style={{aspectRatio: '1/1', width: '300px', maxWidth: '100%'}}>
                              <Skeleton className="absolute inset-0 w-full h-full rounded-md bg-muted/50 z-0" />
                              <Image
                                  src={message.imageUrl}
                                  alt={message.text || (message.sender === "user" ? "Uploaded image" : "Generated AI Image")}
                                  layout="fill"
                                  objectFit="contain"
                                  className="relative z-10"
                                  onLoadingComplete={(img) => {
                                    const skeletonElement = img.parentElement?.querySelector('.absolute.inset-0.w-full.h-full.rounded-md.bg-muted\\/50.z-0') as HTMLElement | null;
                                    if (skeletonElement) {
                                      skeletonElement.style.display = 'none';
                                    }
                                  }}
                                  onError={(e) => {
                                    console.error("Failed to load image:", (e.target as HTMLImageElement).src);
                                    const skeletonElement = (e.target as HTMLImageElement).parentElement?.parentElement as HTMLElement | null;
                                    if (skeletonElement) {
                                        skeletonElement.classList.remove('animate-pulse', 'bg-muted', 'bg-muted/50', '!bg-transparent');
                                        skeletonElement.classList.add('bg-destructive/10');
                                        skeletonElement.innerHTML = '<p class="text-xs text-destructive p-2 text-center">Error loading image</p>';
                                    }
                                    if (!message.imageError && activeDialogId && dialogsData[activeDialogId]) { 
                                      toast({ variant: "destructive", title: "Image Load Error", description: "The image could not be displayed."});
                                      setDialogsData(prevDialogs => {
                                        const currentDialog = prevDialogs[activeDialogId!];
                                        if (!currentDialog) return prevDialogs;
                                        const updatedMsgs = currentDialog.messages.map(msg =>
                                          msg.id === message.id ? { ...msg, imageError: true, imageUrl: undefined } : msg
                                        );
                                        return {...prevDialogs, [activeDialogId!]: {...currentDialog, messages: updatedMsgs}};
                                      });
                                    }
                                  }}
                                  data-ai-hint={message.sender === "user" ? "user content" : "generated art"}
                                />
                            </div>
                          )}
                          {(message.text || (!message.text && message.sender === 'bot' && message.imageError) || (!message.text && message.sender === 'user' && message.imageError)) && 
                            <p className="whitespace-pre-wrap">{message.text || (message.imageError ? (message.sender === 'user' ? "Image could not be displayed." : "AI response image could not be displayed.") : "")}</p>
                          }
                        </>
                      )}
                    </div>
                    {message.sender === "user" && (
                      <Avatar className="w-8 h-8 border border-primary self-start">
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>
                          <Icons.User className="w-5 h-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t border-border shrink-0">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsUploadImageDialogOpen(true)}
                disabled={isLoading || isProcessingUpload}
                className="border-input hover:bg-accent/10"
                aria-label="Upload Image"
              >
                <Icons.Paperclip className="w-5 h-5 text-accent" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={currentInputText}
                onChange={(e) => setCurrentInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Moonlight for information..."
                className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-input border-border focus-visible:ring-accent"
                disabled={isLoading || isProcessingUpload}
                rows={1}
              />
              <Button type="submit" disabled={isLoading || isProcessingUpload || !currentInputText.trim()} size="icon" className="bg-accent hover:bg-accent/90">
                {(isLoading || isProcessingUpload) ? (
                  <Icons.Spinner className="w-5 h-5 animate-spin" />
                ) : (
                  <Icons.Send className="w-5 h-5" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </Tabs>

      <Dialog open={isUploadImageDialogOpen} onOpenChange={setIsUploadImageDialogOpen}>
        <DialogContent 
            className="sm:max-w-lg bg-card border-border"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Icons.Paperclip className="w-6 h-6 text-accent"/>
              Upload Image to Chat
            </DialogTitle>
            <DialogDesc>
              Select an image file by clicking below, or drag and drop an image onto this dialog.
            </DialogDesc>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 items-center gap-4">
              <Label htmlFor="image-upload-input-dialog" className="sr-only">
                Image Upload
              </Label>
              <input
                id="image-upload-input-dialog"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && e.target.files.length > 0 && processFileForUpload(e.target.files[0])}
                className="sr-only" 
                disabled={isProcessingUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  isDragging ? "border-accent bg-accent/10" : "border-input",
                  imageToUpload ? "border-primary" : ""
                )}
              >
                <Icons.UploadCloud className={cn("w-10 h-10 mb-3", isDragging ? "text-accent" : "text-muted-foreground")} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-accent">Click to browse</span> or drag & drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>

            {imageToUpload && (
             <div className="mt-2">
               <p className="text-sm text-muted-foreground truncate">
                 Selected: <span className="font-medium text-foreground">{imageToUpload.name}</span>
               </p>
             </div>
           )}
            {imageToUpload && (
              <div className="col-span-4 flex justify-center mt-2 border rounded-md p-2 bg-muted/20">
                <Image src={URL.createObjectURL(imageToUpload)} alt="Preview" width={100} height={100} className="rounded-md max-h-32 object-contain"/>
              </div>
            )}
            <div className="grid grid-cols-1 items-start gap-2 mt-2">
              <Label htmlFor="upload-accompanying-text" className="text-muted-foreground">
                Optional Message
              </Label>
              <Textarea
                id="upload-accompanying-text"
                value={uploadAccompanyingText}
                onChange={(e) => setUploadAccompanyingText(e.target.value)}
                placeholder="Add a message about the image..."
                className="bg-input border-input min-h-[60px]"
                rows={2}
                disabled={isProcessingUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingUpload} onClick={() => {setImageToUpload(null); setUploadAccompanyingText(""); if(fileInputRef.current) fileInputRef.current.value = "";}}>Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSendUploadedImage}
              disabled={!imageToUpload || isProcessingUpload}
              className="bg-accent hover:bg-accent/90"
            >
              {isProcessingUpload ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.Send className="mr-2 h-4 w-4" />
              )}
              Send with Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
    

      

    


    



