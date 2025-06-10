"use client";

import React, { useState, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { generateEnhancedImage, GenerateEnhancedImageInput, GenerateEnhancedImageOutput } from "@/ai/flows/generate-enhanced-image";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Prompt",
        description: "Please enter a prompt for the image.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImageUrl(null);

    try {
      const input: GenerateEnhancedImageInput = { prompt };
      const result: GenerateEnhancedImageOutput = await generateEnhancedImage(input);
      setGeneratedImageUrl(result.imageUrl);
      toast({
        title: "Image Generated",
        description: "Your image has been successfully generated.",
      });
    } catch (error) {
      console.error("AI Image Generation Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      // You might want to set a placeholder error image or message here
      toast({
        variant: "destructive",
        title: "Generation Error",
        description: `Failed to generate image: ${errorText}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
          <Icons.Image className="w-7 h-7 text-accent" /> AI Image Generator
        </CardTitle>
        <CardDescription>
          Describe the image you want to create, and the AI will generate it using an enhanced process.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="image-prompt" className="text-base">Image Prompt</Label>
            <Input
              id="image-prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A futuristic cityscape at sunset, cyberpunk style"
              className="mt-1 bg-input border-border focus-visible:ring-accent"
              disabled={isLoading}
            />
          </div>

          <div className="w-full aspect-square rounded-lg border border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center text-muted-foreground">
                <Icons.Spinner className="w-12 h-12 animate-spin text-accent mb-4" />
                <p>Generating your masterpiece...</p>
                <Skeleton className="h-[300px] w-[300px] rounded-md mt-2" />
              </div>
            ) : generatedImageUrl ? (
              <Image
                src={generatedImageUrl}
                alt={prompt || "Generated AI Image"}
                width={512}
                height={512}
                className="object-contain w-full h-full"
                data-ai-hint="generated art"
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Icons.Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Your generated image will appear here.</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
            {isLoading ? (
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
               <Icons.Brain className="mr-2 h-4 w-4" />
            )}
            Generate Image
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
