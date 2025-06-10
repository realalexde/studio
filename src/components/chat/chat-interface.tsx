
"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { generateEnhancedResponse, GenerateEnhancedResponseInput } from "@/ai/flows/generate-enhanced-response";
import { searchAndSummarize, SearchAndSummarizeInput } from "@/ai/flows/search-and-summarize";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  avatar?: string;
  isLoading?: boolean;
}

export type AiChatMessage = {
  sender: "user" | "bot";
  text: string;
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !useSearch) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };
    
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    
    const botLoadingMessageId = (Date.now() + 1).toString();
    const botLoadingMessage: Message = {
      id: botLoadingMessageId,
      text: "",
      sender: "bot",
      isLoading: true,
    };
    setMessages((prev) => [...prev, botLoadingMessage]);

    setInput("");
    setIsLoading(true);

    const historyForAI: AiChatMessage[] = currentMessages
      .filter(msg => !msg.isLoading && msg.text.trim() !== "") // Don't send loading or empty messages
      .map(({ sender, text }) => ({ sender, text }));

    try {
      let botResponseText = "";
      if (useSearch) {
        const searchInput: SearchAndSummarizeInput = { 
          query: input || "Provide general information based on search.",
          history: historyForAI.slice(-10) // Send last 10 messages for context
        };
        const result = await searchAndSummarize(searchInput);
        botResponseText = result.summary;
      } else {
        const enhancedResponseInput: GenerateEnhancedResponseInput = { 
          query: input,
          history: historyForAI.slice(-10) // Send last 10 messages for context
        };
        const result = await generateEnhancedResponse(enhancedResponseInput);
        botResponseText = result.enhancedResponse;
      }
      
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: botResponseText, isLoading: false }
            : msg
        )
      );

    } catch (error) {
      console.error("AI Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: `Error: ${errorText}`, isLoading: false }
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
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] flex flex-col shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
           <CardTitle className="font-headline text-2xl text-foreground">Enhanced AI Chat</CardTitle>
           <div className="flex items-center space-x-2">
            <Switch
                id="search-mode"
                checked={useSearch}
                onCheckedChange={setUseSearch}
                disabled={isLoading}
            />
            <Label htmlFor="search-mode" className="text-sm text-muted-foreground flex items-center gap-1">
                <Icons.Search className="h-4 w-4"/> Use Web Search
            </Label>
            </div>
        </div>
        {isLoading && useSearch && (
          <Alert className="mt-4 border-accent text-sm">
            <Icons.Search className="h-5 w-5 text-accent" />
            <AlertTitle className="text-accent font-semibold">Web Search Active</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              The AI is currently performing a web search to gather the latest information. 
              This helps provide a more comprehensive and up-to-date response. Please allow a moment.
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
                  <Avatar className="w-8 h-8 border border-accent">
                    <AvatarImage src={message.avatar} />
                    <AvatarFallback>
                      <Icons.Bot className="w-5 h-5 text-accent" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-xl shadow ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Icons.Spinner className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
                {message.sender === "user" && (
                  <Avatar className="w-8 h-8 border border-primary">
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
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or search query..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-input border-border focus-visible:ring-accent"
            disabled={isLoading}
            rows={1}
          />
          <Button type="submit" disabled={isLoading || (!input.trim() && !useSearch)} size="icon" className="bg-accent hover:bg-accent/90">
            {isLoading ? (
              <Icons.Spinner className="w-5 h-5 animate-spin" />
            ) : (
              <Icons.Send className="w-5 h-5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
