
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const ChatInterface = dynamic(() => 
  import("@/components/chat/chat-interface").then(mod => mod.ChatInterface),
  { 
    ssr: false,
    loading: () => (
      <div className="container mx-auto h-full flex flex-col items-center justify-center p-4">
        <Skeleton className="w-full h-[calc(100vh-12rem)] rounded-lg" />
      </div>
    )
  }
);

export default function AIChatPage() {
  return (
    <div className="container mx-auto h-full flex flex-col items-center justify-center">
      <ChatInterface />
    </div>
  );
}
