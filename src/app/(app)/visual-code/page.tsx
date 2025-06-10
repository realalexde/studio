
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const CodeGenerator = dynamic(() =>
  import("@/components/visual-code/code-generator").then(mod => mod.CodeGenerator),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto py-8">
        <Skeleton className="w-full max-w-4xl h-[700px] mx-auto rounded-lg" />
      </div>
    )
  }
);

export default function AIVisualCodePage() {
  return (
    <div className="container mx-auto py-8">
      <CodeGenerator />
    </div>
  );
}
