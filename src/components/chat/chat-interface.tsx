
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

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  avatar?: string;
  isLoading?: boolean;
  imageUrl?: string;
}

const CHAT_HISTORY_COOKIE = "chatHistory";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialCookieLoadAttempted, setInitialCookieLoadAttempted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { getSelectedModel } = useModel();

  const selectedModel = getSelectedModel();
  const modelDisplayName = selectedModel ? selectedModel.name : "";

  // Load messages from cookie on component mount
  useEffect(() => {
    const savedMessagesCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${CHAT_HISTORY_COOKIE}=`));

    if (savedMessagesCookie) {
      try {
        const savedMessagesJson = savedMessagesCookie.split('=')[1];
        const loadedMessages: Message[] = JSON.parse(decodeURIComponent(savedMessagesJson));
        if (Array.isArray(loadedMessages)) {
          setMessages(
            loadedMessages.filter(msg =>
              typeof msg.id === 'string' &&
              typeof msg.text === 'string' &&
              (msg.sender === 'user' || msg.sender === 'bot') &&
              !msg.isLoading
            )
          );
        }
      } catch (error) {
        console.error("Failed to load chat history from cookie:", error);
        document.cookie = `${CHAT_HISTORY_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
    setInitialCookieLoadAttempted(true); // Signal that initial load attempt is done
  }, []);

  // Scroll to bottom and save messages to cookie when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }

    if (!initialCookieLoadAttempted) {
      // Don't save or clear cookies until the initial load attempt from cookies is complete.
      // This prevents an initial empty 'messages' array (before loading from cookie)
      // from inadvertently clearing a pre-existing cookie.
      return;
    }

    if (messages.length > 0 && !messages.some(msg => msg.isLoading)) {
      try {
        const messagesToSave = messages.map(({ id, text, sender, avatar, imageUrl }) => ({
          id, text, sender, avatar, imageUrl
        }));
        const messagesJson = encodeURIComponent(JSON.stringify(messagesToSave));
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry
        document.cookie = `${CHAT_HISTORY_COOKIE}=${messagesJson}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      } catch (error) {
        console.error("Failed to save chat history to cookie:", error);
      }
    } else if (messages.length === 0 && initialCookieLoadAttempted) {
      // Only clear the cookie if messages are empty AND we've already attempted to load from the cookie.
      const existingCookie = document.cookie.split('; ').find(row => row.startsWith(`${CHAT_HISTORY_COOKIE}=`));
      if (existingCookie) {
        document.cookie = `${CHAT_HISTORY_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
  }, [messages, initialCookieLoadAttempted]);

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
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
      .filter(msg => !msg.isLoading && msg.text.trim() !== "")
      .map(({ sender, text }) => ({ sender, text }));

    try {
      const flowInput: SearchAndSummarizeInput = {
        query: input,
        history: historyForAI.slice(0, -1)
      };
      const result: SearchAndSummarizeOutput = await searchAndSummarize(flowInput);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: result.summary, imageUrl: result.imageUrl, isLoading: false }
            : msg
        )
      );

    } catch (error) {
      console.error("AI Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botLoadingMessageId
            ? { ...msg, text: `Error: ${errorText}`, isLoading: false, imageUrl: undefined }
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
           <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
             <Icons.Chat className="w-7 h-7 text-accent" />
             Chat
             {modelDisplayName && <span className="text-sm font-normal text-muted-foreground ml-1">({modelDisplayName})</span>}
           </CardTitle>
        </div>
         {isLoading && (
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
                  } ${message.imageUrl ? "p-2" : "p-3"}`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center space-x-2 p-3">
                      <Icons.Spinner className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <>
                      {message.imageUrl && (
                        <div className="mb-2 rounded-md overflow-hidden border border-border">
                           <Skeleton className="w-full aspect-square rounded-md bg-muted/50">
                            <Image
                              src={message.imageUrl}
                              alt={message.text || "Generated AI Image"}
                              width={300}
                              height={300}
                              className="object-contain w-full h-full"
                              onLoadingComplete={(img) => img.parentElement?.classList.remove('bg-muted/50')}
                              data-ai-hint="generated art"
                            />
                          </Skeleton>
                        </div>
                      )}
                      {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
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
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Moonlight for information or to generate an image..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-input border-border focus-visible:ring-accent"
            disabled={isLoading}
            rows={1}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="bg-accent hover:bg-accent/90">
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
