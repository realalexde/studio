
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-background text-foreground">
      <main className="container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 font-headline">
          Welcome to <span className="text-accent">NoxGPT</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
          Your intelligent assistant for chat, visual code generation, and stunning image creation. Explore the power of AI with NoxGPT.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Chat Card */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="items-center text-center">
              <Icons.Chat className="w-16 h-16 text-accent mb-4 mx-auto" />
              <CardTitle className="text-2xl font-semibold">Intelligent Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-base text-muted-foreground">
                Engage in dynamic conversations, get answers, and brainstorm ideas with our advanced AI chat.
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-lg py-6 text-accent-foreground">
                <Link href="/chat">Start Chatting</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Visual Code Card */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="items-center text-center">
              <Icons.Code className="w-16 h-16 text-accent mb-4 mx-auto" />
              <CardTitle className="text-2xl font-semibold">Visual Code Studio</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-base text-muted-foreground">
                Describe your project, and let our AI generate the code and explain it, simplifying your development.
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-lg py-6 text-accent-foreground">
                <Link href="/visual-code">Generate Code</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Image Generator Card */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="items-center text-center">
              <Icons.Image className="w-16 h-16 text-accent mb-4 mx-auto" />
              <CardTitle className="text-2xl font-semibold">Image Studio</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-base text-muted-foreground">
                Create stunning, unique images from text prompts with our powerful AI image generation tool.
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-lg py-6 text-accent-foreground">
                <Link href="/image-generator">Create Images</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
