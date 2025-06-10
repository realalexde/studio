
"use client";

import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { generateCodeProject, GenerateCodeProjectInput, GenerateCodeProjectOutput } from "@/ai/flows/generate-code-project";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GeneratedCode {
  projectCode: string;
  explanation: string;
}

export function CodeGenerator() {
  const [request, setRequest] = useState("");
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!request.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Request",
        description: "Please enter a description for your code project.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedCode(null);

    try {
      const input: GenerateCodeProjectInput = { request };
      const result: GenerateCodeProjectOutput = await generateCodeProject(input);
      setGeneratedCode(result);
      toast({
        title: "Code Generated",
        description: "Your project code has been successfully generated.",
      });
    } catch (error) {
      console.error("AI Code Generation Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setGeneratedCode({ projectCode: `// Error: ${errorText}`, explanation: "Failed to generate code. Please try again." });
      toast({
        variant: "destructive",
        title: "Generation Error",
        description: `Failed to generate code: ${errorText}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
          <Icons.Code className="w-7 h-7 text-accent" /> AI Visual Code Generator
        </CardTitle>
        <CardDescription>
          Describe the project you want to build, and the AI will generate the code and an explanation.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="project-request" className="text-base">Project Request</Label>
            <Textarea
              id="project-request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g., A simple Next.js app with a button that shows a random quote."
              className="min-h-[100px] mt-1 bg-input border-border focus-visible:ring-accent"
              disabled={isLoading}
              rows={4}
            />
          </div>

          {isLoading && (
             <Alert className="border-accent text-sm">
                <Icons.Brain className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent font-semibold">AI Code Generation in Progress</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Our AI is working on your project request. This can take a few moments, 
                  especially for complex projects. Thanks for your patience!
                </AlertDescription>
            </Alert>
          )}

          {generatedCode && !isLoading && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Generated Code:</h3>
                <ScrollArea className="h-[300px] w-full rounded-md border border-border bg-muted p-4">
                  <pre className="text-sm font-code whitespace-pre-wrap">{generatedCode.projectCode}</pre>
                </ScrollArea>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Explanation:</h3>
                <ScrollArea className="h-[150px] w-full rounded-md border border-border bg-muted p-4">
                  <p className="text-sm whitespace-pre-wrap">{generatedCode.explanation}</p>
                </ScrollArea>
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
            {isLoading ? (
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Brain className="mr-2 h-4 w-4" />
            )}
            Generate Code
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
