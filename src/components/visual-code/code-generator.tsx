
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      // Keep the error message in a format that can be displayed
      setGeneratedCode({ 
        projectCode: `// Error generating code:\n// ${errorText}`, 
        explanation: `Failed to generate code. ${errorText}\nPlease try rephrasing your request or try again later.` 
      });
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
          <Icons.Code className="w-7 h-7 text-accent" /> NoxStudio
        </CardTitle>
        <CardDescription>
          Describe the project you want to build. The AI will generate the code and an explanation.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="project-request" className="text-base font-medium">Your Project Idea</Label>
            <Textarea
              id="project-request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g., A React component for a countdown timer."
              className="min-h-[120px] mt-2 bg-input border-border focus-visible:ring-accent text-base"
              disabled={isLoading}
              rows={5}
            />
          </div>

          {isLoading && (
             <Alert className="border-accent text-sm mt-4">
                <Icons.Brain className="h-5 w-5 text-accent animate-pulse" />
                <AlertTitle className="text-accent font-semibold">Moonlight is Crafting Your Code...</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Please wait while the AI processes your request. Complex projects may take a bit longer.
                </AlertDescription>
            </Alert>
          )}

          {!isLoading && generatedCode && (
            <Tabs defaultValue="code" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">
                  <Icons.Code className="mr-2 h-4 w-4" /> Generated Code
                </TabsTrigger>
                <TabsTrigger value="explanation">
                  <Icons.Search className="mr-2 h-4 w-4" /> Explanation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="mt-4">
                <Card className="border-border bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Code Output</CardTitle>
                     <CardDescription>Review the generated code below. You can copy and paste it into your project.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-background p-4 shadow">
                      <pre className="text-sm font-code whitespace-pre-wrap">{generatedCode.projectCode}</pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="explanation" className="mt-4">
                 <Card className="border-border bg-muted/50">
                   <CardHeader>
                    <CardTitle className="text-lg">AI Explanation</CardTitle>
                    <CardDescription>Understand how the generated code works with this explanation.</CardDescription>
                   </CardHeader>
                   <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-background p-4 shadow">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedCode.explanation}</p>
                    </ScrollArea>
                   </CardContent>
                 </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-base">
            {isLoading ? (
              <>
                <Icons.Spinner className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icons.Brain className="mr-2 h-5 w-5" />
                Generate Project Code
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
