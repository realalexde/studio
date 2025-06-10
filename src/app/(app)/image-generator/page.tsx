
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const ImageStudio = dynamic(() =>
  import("@/components/image-generator/image-studio").then(mod => mod.ImageStudio),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto py-8">
        <Skeleton className="w-full max-w-2xl h-[600px] mx-auto rounded-lg" />
      </div>
    )
  }
);

export default function AIImageGeneratorPage() {
  return (
    <div className="container mx-auto py-8">
      <ImageStudio />
    </div>
  );
}
