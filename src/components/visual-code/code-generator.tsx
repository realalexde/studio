
"use client";

import React, { useState, FormEvent } from "react";
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; 

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
import { Switch } from "@/components/ui/switch";

interface GeneratedFile {
  fileName: string;
  code: string;
}

interface GeneratedProject {
  files: GeneratedFile[];
  explanation: string;
}

export function CodeGenerator() {
  const [request, setRequest] = useState("");
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enhanceRequest, setEnhanceRequest] = useState(false);
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
    setGeneratedProject(null);

    try {
      const input: GenerateCodeProjectInput = { 
        request,
        enhanceRequest: enhanceRequest 
      };
      const result: GenerateCodeProjectOutput = await generateCodeProject(input);
      
      if (!result.files || result.files.length === 0) {
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: "The AI did not return any files. Please try again.",
        });
        setGeneratedProject({
          files: [],
          explanation: result.explanation || "The AI did not return any files. Please check the explanation or try again."
        });
      } else {
        setGeneratedProject(result);
        toast({
          title: "Project Generated",
          description: `Your project with ${result.files.length} file(s) has been successfully generated ${enhanceRequest ? 'using an enhanced request' : ''}.`,
        });
      }
    } catch (error) {
      console.error("AI Code Generation Error:", error);
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      setGeneratedProject({ 
        files: [{ fileName: "error.txt", code: `// Error generating project:\n// ${errorText}` }], 
        explanation: `Failed to generate project. ${errorText}\nPlease try rephrasing your request or try again later.` 
      });
      toast({
        variant: "destructive",
        title: "Generation Error",
        description: `Failed to generate project: ${errorText}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedProject || !generatedProject.files || generatedProject.files.length === 0) {
      toast({
        variant: "destructive",
        title: "No Files to Download",
        description: "There are no files to include in the ZIP archive.",
      });
      return;
    }

    const zip = new JSZip();
    generatedProject.files.forEach(file => {
      zip.file(file.fileName, file.code);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "noxstudio-project.zip"); 
      toast({
        title: "Download Started",
        description: "Your project ZIP archive is being downloaded.",
      });
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      toast({
        variant: "destructive",
        title: "ZIP Creation Error",
        description: "Could not create the ZIP archive.",
      });
    }
  };


  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
          <Icons.Code className="w-7 h-7 text-accent" /> NoxStudio
        </CardTitle>
        <CardDescription>
          Describe the project you want to build. The AI will generate the necessary files and an explanation. Optionally, enhance your request for more detailed output.
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
              placeholder="e.g., A simple To-Do list app with HTML, CSS, and JavaScript."
              className="min-h-[120px] mt-2 bg-input border-border focus-visible:ring-accent text-base"
              disabled={isLoading}
              rows={5}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enhance-request-toggle"
              checked={enhanceRequest}
              onCheckedChange={setEnhanceRequest}
              disabled={isLoading}
            />
            <Label htmlFor="enhance-request-toggle" className="text-sm">Enhance</Label>
          </div>


          {isLoading && (
             <Alert className="border-accent text-sm mt-4">
                <Icons.Brain className="h-5 w-5 text-accent animate-pulse" />
                <AlertTitle className="text-accent font-semibold">Moonlight is Crafting Your Project...</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Please wait while the AI processes your request {enhanceRequest ? ' (including enhancement) ' : ''}and generates the files. Complex projects may take a bit longer.
                </AlertDescription>
            </Alert>
          )}

          {!isLoading && generatedProject && (
            <Tabs defaultValue="explanation" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-[auto_1fr]">
                 <TabsTrigger value="explanation" className="whitespace-nowrap">
                  <Icons.Search className="mr-2 h-4 w-4" /> Explanation
                </TabsTrigger>
                {generatedProject.files && generatedProject.files.length > 0 && (
                  <ScrollArea className="w-full whitespace-nowrap overflow-x-auto">
                    <div className="flex">
                    {generatedProject.files.map((file, index) => (
                      <TabsTrigger key={index} value={`file-${index}`} className="text-xs px-2 py-1 h-auto">
                        <Icons.Code className="mr-1 h-3 w-3" /> {file.fileName}
                      </TabsTrigger>
                    ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsList>
              
              <TabsContent value="explanation" className="mt-4">
                 <Card className="border-border bg-muted/50">
                   <CardHeader>
                    <CardTitle className="text-lg">AI Explanation & Project Overview</CardTitle>
                    <CardDescription>Understand how the generated project and its files work.</CardDescription>
                   </CardHeader>
                   <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-background p-4 shadow">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedProject.explanation}</p>
                    </ScrollArea>
                   </CardContent>
                 </Card>
              </TabsContent>

              {generatedProject.files && generatedProject.files.map((file, index) => (
                <TabsContent key={index} value={`file-${index}`} className="mt-4">
                  <Card className="border-border bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icons.Code className="w-5 h-5"/> File: {file.fileName}
                      </CardTitle>
                       <CardDescription>Content of the generated file.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-background p-4 shadow">
                        <pre className="text-sm font-code whitespace-pre-wrap">{file.code}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-base">
            {isLoading ? (
              <>
                <Icons.Spinner className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icons.Brain className="mr-2 h-5 w-5" />
                Generate Project
              </>
            )}
          </Button>
          {generatedProject && generatedProject.files && generatedProject.files.length > 0 && !isLoading && (
            <Button
              type="button"
              onClick={handleDownloadZip}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Icons.Download className="mr-2 h-5 w-5" />
              Download Project (.zip)
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

    
