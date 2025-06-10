
"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { searchAndSummarize, SearchAndSummarizeInput, SearchAndSummarizeOutput, AiChatMessage } from "@/ai/flows/search-and-summarize";
import { generateEnhancedImage, GenerateEnhancedImageInput, GenerateEnhancedImageOutput } from "@/ai/flows/generate-enhanced-image";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input as UIDialogInput } from "@/components/ui/input"; // Renamed to avoid conflict with chat input state
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  avatar?: string;
  isLoading?: boolean;
  imageUrl?: string;
  imageError?: boolean;
}

const CHAT_HISTORY_LOCAL_STORAGE_KEY = "chatHistory_v2_localStorage";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { getSelectedModel } = useModel();

  // State for image generation dialog
  const [isImageDialogOpgen, setIsImageDialogOpgen] = useState(false);
  const [imageDialogPrompt, setImageDialogPrompt] = useState("");
  const [enhanceDialogPrompt, setEnhanceDialogPrompt] = useState(false);
  const [isGeneratingDialogImage, setIsGeneratingDialogImage] = useState(false);


  const selectedModel = getSelectedModel();
  const modelDisplayName = selectedModel ? selectedModel.name : "";

  useEffect(() => {
    try {
      const savedMessagesJson = localStorage.getItem(CHAT_HISTORY_LOCAL_STORAGE_KEY);
      if (savedMessagesJson) {
        const loadedMessages: Message[] = JSON.parse(savedMessagesJson);
        if (Array.isArray(loadedMessages)) {
          setMessages(
            loadedMessages.filter(msg =>
              typeof msg.id === 'string' &&
              (typeof msg.text === 'string' || typeof msg.imageUrl === 'string' || (msg.imageUrl === undefined && msg.imageError === true)) &&
              (msg.sender === 'user' || msg.sender === 'bot')
            ).map(msg => ({
              ...msg,
              isLoading: false,
              imageUrl: msg.imageError ? undefined : msg.imageUrl,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage:", error);
      localStorage.removeItem(CHAT_HISTORY_LOCAL_STORAGE_KEY);
      toast({
        variant: "destructive",
        title: "Chat History Error",
        description: "Could not load previous chat history. It may have been corrupted.",
      });
    }
    setInitialLoadAttempted(true);
  }, [toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }

    if (!initialLoadAttempted) {
      return;
    }

    try {
      if (messages.length > 0 && !messages.some(msg => msg.isLoading)) {
        const messagesToSave = messages.map(({ isLoading, ...rest }) => {
          return rest.imageError ? { ...rest, imageUrl: undefined } : rest;
        });
        const messagesJson = JSON.stringify(messagesToSave);
        localStorage.setItem(CHAT_HISTORY_LOCAL_STORAGE_KEY, messagesJson);
      } else if (messages.length === 0 && initialLoadAttempted) {
        const currentStorage = localStorage.getItem(CHAT_HISTORY_LOCAL_STORAGE_KEY);
        if (currentStorage && currentStorage !== "[]") {
            localStorage.removeItem(CHAT_HISTORY_LOCAL_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to save chat history to localStorage:", error);
    }
  }, [messages, initialLoadAttempted]);

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      isLoading: false,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const botLoadingMessageId = (Date.now() + 1).toString();
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: botLoadingMessageId,
        text: "",
        sender: "bot",
        isLoading: true,
      },
    ]);

    setInput("");
    setIsLoading(true);

    const historyForAI: AiChatMessage[] = [...messages, userMessage]
      .filter(msg => !msg.isLoading && (msg.text.trim() !== "" || msg.imageUrl))
      .map(({ sender, text }) => ({ sender, text: text || "" }));

    try {
      const flowInput: SearchAndSummarizeInput = {
        query: userMessage.text, // Use the text from the user message
        history: historyForAI.slice(0, -1)
      };
      const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false, imageError: false }
            : msg
        )
      );

    } catch (error) {
      console.error("AI Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageUrl: undefined, imageError: true }
            : msg
        )
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to get response: ${errorText}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImageFromDialog = async () => {
    if (!imageDialogPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Prompt",
        description: "Please enter a prompt for the image.",
      });
      return;
    }
    setIsGeneratingDialogImage(true);
    setIsImageDialogOpgen(false); // Close dialog

    const userMessageText = `Requested image: "${imageDialogPrompt}" ${enhanceDialogPrompt ? "(enhanced)" : ""}`;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);

    const botLoadingMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botLoadingMessageId, text: "", sender: "bot", isLoading: true }]);

    try {
      const genInput: GenerateEnhancedImageInput = {
        prompt: imageDialogPrompt,
        enhance: enhanceDialogPrompt,
      };
      const result: GenerateEnhancedImageOutput = await generateEnhancedImage(genInput);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: `Here's the image for "${imageDialogPrompt}"`, imageUrl: result.imageUrl, isLoading: false }
            : msg
        )
      );
      toast({
        title: "Image Generated",
        description: "Image from dialog added to chat.",
      });
    } catch (error) {
      console.error("Dialog Image Generation Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: `Error generating image: ${errorText}`, isLoading: false, imageError: true }
            : msg
        )
      );
      toast({
        variant: "destructive",
        title: "Image Generation Error",
        description: errorText,
      });
    } finally {
      setIsGeneratingDialogImage(false);
      setImageDialogPrompt(""); // Reset for next time
      setEnhanceDialogPrompt(false);
    }
  };


  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

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
          </div>
           {(isLoading || isGeneratingDialogImage) && (
            <Alert className="border-accent text-sm mt-2">
              <Icons.Search className="h-5 w-5 text-accent" />
              <AlertTitle className="text-accent font-semibold">Moonlight is Thinking...</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                The AI may use simulated internet search or generate an image. This might take a moment.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6">
            <div className="space-y-6">
              {messages.map((message) => (
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
                        ? "bg-primary text-primary-foreground rounded-br-none p-3"
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
                          <div className="mb-2 rounded-md overflow-hidden border border-border">
                             <Skeleton className="w-full aspect-square rounded-md bg-muted/50">
                              <Image
                                src={message.imageUrl}
                                alt={message.text || "Generated AI Image"}
                                width={300}
                                height={300}
                                className="object-contain w-full h-full"
                                onLoadingComplete={(img) => {
                                  const skeletonElement = img.parentElement as HTMLElement | null;
                                  if (skeletonElement && skeletonElement.parentElement) {
                                    (skeletonElement.parentElement as HTMLElement).style.display = 'none';
                                  }
                                }}
                                onError={(e) => {
                                  console.error("Failed to load image:", (e.target as HTMLImageElement).src);
                                  const skeletonElement = (e.target as HTMLImageElement).parentElement?.parentElement as HTMLElement | null;
                                  if (skeletonElement) {
                                      skeletonElement.classList.remove('animate-pulse', 'bg-muted', 'bg-muted/50', '!bg-transparent');
                                      skeletonElement.classList.add('bg-destructive/10');
                                      skeletonElement.style.display = 'flex';
                                  }

                                  if (!message.imageError) {
                                    toast({
                                      variant: "destructive",
                                      title: "Image Load Error",
                                      description: "The generated image could not be displayed."
                                    });
                                    setMessages(prevMessages => prevMessages.map(msg =>
                                      msg.id === message.id ? { ...msg, imageError: true, imageUrl: undefined } : msg
                                    ));
                                  }
                                }}
                                data-ai-hint="generated art"
                              />
                            </Skeleton>
                          </div>
                        )}
                        {(message.text || (!message.text && message.sender === 'bot' && message.imageError)) && <p className="whitespace-pre-wrap">{message.text || (message.imageError ? "Image could not be displayed." : "")}</p>}
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
              onClick={() => setIsImageDialogOpgen(true)}
              disabled={isLoading || isGeneratingDialogImage}
              className="border-input hover:bg-accent/10"
              aria-label="Generate Image"
            >
              <Icons.ImagePlus className="w-5 h-5 text-accent" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Moonlight for information..."
              className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-input border-border focus-visible:ring-accent"
              disabled={isLoading || isGeneratingDialogImage}
              rows={1}
            />
            <Button type="submit" disabled={isLoading || isGeneratingDialogImage || !input.trim()} size="icon" className="bg-accent hover:bg-accent/90">
              {(isLoading || isGeneratingDialogImage) ? (
                <Icons.Spinner className="w-5 h-5 animate-spin" />
              ) : (
                <Icons.Send className="w-5 h-5" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>

      <Dialog open={isImageDialogOpgen} onOpenChange={setIsImageDialogOpgen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Icons.Image className="w-6 h-6 text-accent"/>
              Generate Image with AI
            </DialogTitle>
            <DialogDescription>
              Describe the image you want Moonlight to create. You can also enhance your prompt for more detailed results.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-prompt-dialog" className="text-right text-muted-foreground">
                Prompt
              </Label>
              <UIDialogInput
                id="image-prompt-dialog"
                value={imageDialogPrompt}
                onChange={(e) => setImageDialogPrompt(e.target.value)}
                className="col-span-3 bg-input border-input focus:ring-accent"
                placeholder="e.g., A cat wearing a wizard hat"
                disabled={isGeneratingDialogImage}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="enhance-prompt-dialog" className="text-right text-muted-foreground">
                Enhance
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="enhance-prompt-dialog"
                  checked={enhanceDialogPrompt}
                  onCheckedChange={setEnhanceDialogPrompt}
                  disabled={isGeneratingDialogImage}
                />
                <Label htmlFor="enhance-prompt-dialog" className="text-sm text-muted-foreground">More detailed prompt</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isGeneratingDialogImage}>Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleGenerateImageFromDialog}
              disabled={!imageDialogPrompt.trim() || isGeneratingDialogImage}
              className="bg-accent hover:bg-accent/90"
            >
              {isGeneratingDialogImage ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.Brain className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
