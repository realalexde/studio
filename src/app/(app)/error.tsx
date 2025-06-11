
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error("App Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center bg-card/90 shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="hsl(var(--destructive))" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-destructive">Oops! Something Went Wrong</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            We've encountered an unexpected issue. Please try to refresh or attempt the action again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {process.env.NODE_ENV === 'development' && error?.message && (
            <div className="mt-4 text-left text-sm bg-muted/50 p-4 rounded-md border border-border">
              <p className="font-semibold text-foreground mb-1">Error Details (Development Mode):</p>
              <p className="whitespace-pre-wrap text-destructive-foreground/80 font-mono text-xs">{error.message}</p>
              {error.digest && <p className="mt-2 font-mono text-xs text-destructive-foreground/70">Digest: {error.digest}</p>}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => reset()} className="w-full bg-accent hover:bg-accent/90 text-lg py-6">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
