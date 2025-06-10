
"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { searchAndSummarize, SearchAndSummarizeInput, SearchAndSummarizeOutput, AiChatMessage } from "@/ai/flows/search-and-summarize";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useModel } from "@/contexts/model-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input as UIDialogInput } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  avatar?: string;
  isLoading?: boolean;
  imageUrl?: string;
  imageError?: boolean;
}

const CHAT_DIALOGS_STORAGE_KEY = "noxGptChatDialogs_v1";
const CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY = "noxGptChatActiveDialogId_v1";
const DEFAULT_DIALOG_ID = "chat-1";

export function ChatInterface() {
  const [dialogs, setDialogs] = useState<Record<string, Message[]>>({});
  const [activeDialogId, setActiveDialogId] = useState<string | null>(null);
  
  const [currentInputText, setCurrentInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { getSelectedModel } = useModel();

  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [uploadAccompanyingText, setUploadAccompanyingText] = useState("");
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);


  const selectedModel = getSelectedModel();
  const modelDisplayName = selectedModel ? selectedModel.name : "";

  useEffect(() => {
    try {
      const savedDialogsJson = localStorage.getItem(CHAT_DIALOGS_STORAGE_KEY);
      const savedActiveDialogId = localStorage.getItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY);

      let loadedDialogs: Record<string, Message[]> = {};
      if (savedDialogsJson) {
        const parsedDialogs = JSON.parse(savedDialogsJson);
        Object.keys(parsedDialogs).forEach(id => {
          if (Array.isArray(parsedDialogs[id])) {
            loadedDialogs[id] = parsedDialogs[id].map((msg: any) => ({
              ...msg,
              isLoading: false,
              imageError: msg.imageError || false, 
              imageUrl: msg.imageError ? undefined : msg.imageUrl,
            })).filter(Boolean);
          }
        });
      }

      let currentActiveId = savedActiveDialogId;

      if (Object.keys(loadedDialogs).length === 0) {
        loadedDialogs = { [DEFAULT_DIALOG_ID]: [] };
        currentActiveId = DEFAULT_DIALOG_ID;
      } else if (!currentActiveId || !loadedDialogs[currentActiveId]) {
        currentActiveId = Object.keys(loadedDialogs)[0];
      }
      
      setDialogs(loadedDialogs);
      setActiveDialogId(currentActiveId);

    } catch (error) {
      console.error("Failed to load chat history from localStorage:", error);
      toast({
        variant: "destructive",
        title: "Chat History Error",
        description: "Could not load previous chat history. Starting fresh.",
      });
      setDialogs({ [DEFAULT_DIALOG_ID]: [] });
      setActiveDialogId(DEFAULT_DIALOG_ID);
      localStorage.removeItem(CHAT_DIALOGS_STORAGE_KEY);
      localStorage.removeItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY);
    }
    setInitialLoadComplete(true);
  }, [toast]);

  useEffect(() => {
    if (!initialLoadComplete || !activeDialogId) return; 

    try {
      const dialogsToSave: Record<string, Message[]> = {};
      Object.entries(dialogs).forEach(([id, msgs]) => {
        dialogsToSave[id] = msgs.map(({ isLoading: _isLoading, ...rest }) => {
           return rest.imageError ? { ...rest, imageUrl: undefined } : rest;
        });
      });

      localStorage.setItem(CHAT_DIALOGS_STORAGE_KEY, JSON.stringify(dialogsToSave));
      localStorage.setItem(CHAT_ACTIVE_DIALOG_ID_STORAGE_KEY, activeDialogId);
    } catch (error) {
      console.error("Failed to save chat history to localStorage:", error);
    }
  }, [dialogs, activeDialogId, initialLoadComplete]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [dialogs, activeDialogId]);

  const currentMessages = activeDialogId ? dialogs[activeDialogId] || [] : [];

  const handleAddDialog = () => {
    const existingDialogNumbers = Object.keys(dialogs)
      .map(id => {
        const match = id.match(/^chat-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null) as number[];
    
    let newDialogNumber = 1;
    if (existingDialogNumbers.length > 0) {
      existingDialogNumbers.sort((a, b) => a - b);
      for (const num of existingDialogNumbers) {
        if (newDialogNumber < num) {
          break; 
        }
        if (newDialogNumber === num) {
          newDialogNumber++; 
        }
      }
    }
    const newDialogId = `chat-${newDialogNumber}`;
    setDialogs(prevDialogs => ({ ...prevDialogs, [newDialogId]: [] }));
    setActiveDialogId(newDialogId);
    setCurrentInputText("");
  };

  const handleDeleteDialog = (dialogIdToDelete: string) => {
    if (Object.keys(dialogs).length <= 1) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "You must have at least one chat open." });
      return;
    }
    const updatedDialogs = { ...dialogs };
    delete updatedDialogs[dialogIdToDelete];
    setDialogs(updatedDialogs);
    if (activeDialogId === dialogIdToDelete) {
      const remainingDialogIds = Object.keys(updatedDialogs);
      setActiveDialogId(remainingDialogIds[0] || null);
      if(remainingDialogIds.length === 0) { handleAddDialog(); }
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!currentInputText.trim() || !activeDialogId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInputText,
      sender: "user",
    };
    setDialogs(prev => ({ ...prev, [activeDialogId]: [...(prev[activeDialogId] || []), userMessage] }));
    
    const botLoadingMessageId = (Date.now() + 1).toString();
    setDialogs(prev => ({ ...prev, [activeDialogId]: [ ...(prev[activeDialogId] || []), { id: botLoadingMessageId, text: "", sender: "bot", isLoading: true }] }));

    setCurrentInputText("");
    setIsLoading(true);

    const historyForAI: AiChatMessage[] = (dialogs[activeDialogId] || [])
      .filter(msg => !msg.isLoading && (msg.text?.trim() !== "" || msg.imageUrl))
      .slice(0, -1) 
      .map(({ sender, text, imageUrl }) => ({ sender, text: text || "", imageUrl }));
          
    try {
      const flowInput: SearchAndSummarizeInput = {
        query: userMessage.text, 
        history: historyForAI
      };
      const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);
      setDialogs(prev => ({ ...prev, [activeDialogId]: (prev[activeDialogId] || []).map(msg =>
          msg.id === botLoadingMessageId ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false, imageError: false } : msg
      )}));
    } catch (error) {
      console.error("AI Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setDialogs(prev => ({ ...prev, [activeDialogId]: (prev[activeDialogId] || []).map(msg =>
          msg.id === botLoadingMessageId ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageUrl: undefined, imageError: true } : msg
      )}));
      toast({ variant: "destructive", title: "Error", description: `Failed to get response: ${errorText}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendUploadedImage = async () => {
    if (!imageToUpload || !activeDialogId) {
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
      setDialogs(prev => ({ ...prev, [activeDialogId]: [...(prev[activeDialogId] || []), userMessage] }));

      const botLoadingMessageId = (Date.now() + 1).toString();
      setDialogs(prev => ({ ...prev, [activeDialogId]: [...(prev[activeDialogId] || []), { id: botLoadingMessageId, text: "", sender: "bot", isLoading: true }] }));
      
      setIsLoading(true); 

      const historyForAI: AiChatMessage[] = (dialogs[activeDialogId] || [])
        .filter(msg => !msg.isLoading && (msg.text?.trim() !== "" || msg.imageUrl))
        .slice(0, -1) 
        .map(({ sender, text, imageUrl }) => ({ sender, text: text || "", imageUrl }));

      try {
        const flowInput: SearchAndSummarizeInput = {
          query: {
            text: uploadAccompanyingText || undefined, 
            imageUrl: imageDataUri,
          },
          history: historyForAI,
        };
        const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);
        setDialogs(prev => ({ ...prev, [activeDialogId]: (prev[activeDialogId] || []).map(msg =>
          msg.id === botLoadingMessageId ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false, imageError: false } : msg
        )}));
        toast({ title: "Image Sent & Processed", description: "AI has received your image."});
      } catch (error) {
        console.error("AI Error with Uploaded Image:", error);
        const errorText = error instanceof Error ? error.message : "An unknown error occurred processing the image.";
        setDialogs(prev => ({ ...prev, [activeDialogId]: (prev[activeDialogId] || []).map(msg =>
          msg.id === botLoadingMessageId ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageError: true } : msg
        )}));
        toast({ variant: "destructive", title: "Processing Error", description: errorText });
      } finally {
        setIsLoading(false);
        setIsProcessingUpload(false);
        setImageToUpload(null);
        setUploadAccompanyingText("");
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.onerror = (error) => {
      console.error("File Reading Error:", error);
      toast({ variant: "destructive", title: "File Error", description: "Could not read the selected image file."});
      setIsProcessingUpload(false);
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
      <Card className="w-full h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] flex flex-col shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
             <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
               <Icons.Chat className="w-7 h-7 text-accent" />
               Chat
               {modelDisplayName && <span className="text-sm font-normal text-muted-foreground ml-1">({modelDisplayName})</span>}
             </CardTitle>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleAddDialog} className="border-input hover:bg-accent/10">
                  <Icons.PlusSquare className="w-4 h-4 mr-2" /> New Chat
                </Button>
                {Object.keys(dialogs).length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => handleDeleteDialog(activeDialogId!)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <Icons.Trash2 className="w-4 h-4 mr-2" /> Delete Chat
                  </Button>
                )}
             </div>
          </div>
          
          <Tabs value={activeDialogId} onValueChange={setActiveDialogId} className="mt-2">
            <TabsList className="w-full justify-start overflow-x-auto">
              {Object.keys(dialogs).map((dialogId) => (
                <TabsTrigger key={dialogId} value={dialogId} className="capitalize text-xs sm:text-sm">
                  {dialogId.replace(/-/g, ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

           {(isLoading || isProcessingUpload) && (
            <Alert className="border-accent text-sm mt-2">
              <Icons.Search className="h-5 w-5 text-accent" />
              <AlertTitle className="text-accent font-semibold">Moonlight is Thinking...</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                The AI may be processing your text or image. This might take a moment.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

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
                                      skeletonElement.innerHTML = '<p class="text-xs text-destructive p-2 text-center flex items-center justify-center h-full">Error loading image</p>';
                                  }
                                  if (!message.imageError) { 
                                    toast({ variant: "destructive", title: "Image Load Error", description: "The image could not be displayed."});
                                    setDialogs(prevDialogs => {
                                      const updatedMsgs = (prevDialogs[activeDialogId!] || []).map(msg =>
                                        msg.id === message.id ? { ...msg, imageError: true, imageUrl: undefined } : msg
                                      );
                                      return {...prevDialogs, [activeDialogId!]: updatedMsgs};
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
        <CardFooter className="p-4 border-t border-border">
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

      <Dialog open={isUploadImageDialogOpen} onOpenChange={setIsUploadImageDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Icons.Paperclip className="w-6 h-6 text-accent"/>
              Upload Image to Chat
            </DialogTitle>
            <DialogDescription>
              Select an image file and add an optional message to send to Moonlight.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-upload-input-dialog" className="text-right text-muted-foreground">
                Image
              </Label>
              <UIDialogInput
                id="image-upload-input-dialog"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageToUpload(e.target.files ? e.target.files[0] : null)}
                className="col-span-3 bg-input border-input file:text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
                disabled={isProcessingUpload}
              />
            </div>
            {imageToUpload && (
             <div className="grid grid-cols-4 items-center gap-4 mt-1">
               <div className="col-start-2 col-span-3">
                 <p className="text-xs text-muted-foreground truncate">
                   Selected: {imageToUpload.name}
                 </p>
               </div>
             </div>
           )}
            {imageToUpload && (
              <div className="col-span-4 flex justify-center mt-2">
                <Image src={URL.createObjectURL(imageToUpload)} alt="Preview" width={100} height={100} className="rounded-md border max-h-32 object-contain"/>
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="upload-accompanying-text" className="text-right text-muted-foreground pt-2">
                Message
              </Label>
              <Textarea
                id="upload-accompanying-text"
                value={uploadAccompanyingText}
                onChange={(e) => setUploadAccompanyingText(e.target.value)}
                placeholder="Optional: Add a message about the image..."
                className="col-span-3 bg-input border-input min-h-[60px]"
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

