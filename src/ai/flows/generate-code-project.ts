
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a code project based on a user request.
 * The project can consist of multiple files. Includes an option to enhance the user's request.
 *
 * - generateCodeProject - A function that takes a user request and generates a code project.
 * - GenerateCodeProjectInput - The input type for the generateCodeProject function.
 * - GenerateCodeProjectOutput - The return type for the generateCodeProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCodeProjectInputSchema = z.object({
  request: z.string().describe('The user request for the code project.'),
  enhanceRequest: z.boolean().optional().describe('Whether to first enhance the user\'s project request for clarity and detail before generation. Defaults to false.'),
});

export type GenerateCodeProjectInput = z.infer<typeof GenerateCodeProjectInputSchema>;

const FileSchema = z.object({
  fileName: z.string().describe("The full path of the file, including directories if any, relative to a project root (e.g., 'src/components/Button.tsx', 'index.html', or 'styles/main.css'). Avoid absolute paths."),
  code: z.string().describe("The complete code content for this file."),
});

const GenerateCodeProjectOutputSchema = z.object({
  files: z.array(FileSchema).describe("An array of file objects representing the complete code project. If the project is simple and fits in one file, this array should contain one file object. For complex projects, include all necessary files (e.g., HTML, CSS, JavaScript, TypeScript components, configuration files)."),
  explanation: z.string().describe('A detailed explanation of the generated code project. This should include an overview of the project structure, a list of the generated files with a brief description of each file\'s purpose, and how they work together. Also, mention any key libraries or frameworks used and setup instructions if applicable.'),
});

export type GenerateCodeProjectOutput = z.infer<typeof GenerateCodeProjectOutputSchema>;

export async function generateCodeProject(input: GenerateCodeProjectInput): Promise<GenerateCodeProjectOutput> {
  return generateCodeProjectFlow(input);
}

// Schema for enhancing the project request
const EnhanceProjectRequestInputSchema = z.object({
  originalRequest: z.string().describe('The user\'s original, potentially brief, project request.'),
});

const EnhanceProjectRequestOutputSchema = z.object({
  enhancedRequest: z.string().describe('A highly detailed and descriptive project request, expanded from the user\'s original request, suitable for better code generation.'),
});

// Prompt to enhance the project request
const enhanceProjectRequestPrompt = ai.definePrompt({
  name: 'enhanceProjectRequestPrompt',
  input: { schema: EnhanceProjectRequestInputSchema },
  output: { schema: EnhanceProjectRequestOutputSchema },
  prompt: `You are Moonlight, an expert software architect and project planner.
The user has provided the following initial project request:
"{{{originalRequest}}}"

Your task is to expand this user's request into a much more detailed and descriptive project plan. This enhanced plan will be used to generate the actual code.
Focus on:
- **Clarifying Scope:** Identify the core goal and main features. If the request is vague, make reasonable assumptions or suggest options.
- **Technology Stack (Implicit):** Assume the project will use Next.js (App Router, Server Components), React, TypeScript, Tailwind CSS, and ShadCN UI components. Frame your enhanced request with these in mind.
- **File Structure & Components:** Briefly outline a logical file structure or key components needed. For example, "A Next.js page for the main view, a React component for the To-Do item, and a Server Action for adding/deleting tasks."
- **Functionality Breakdown:** Describe the main functionalities in more detail. For example, "The To-Do list should allow adding new tasks, marking tasks as complete, and deleting tasks. Task data should be managed client-side for this simple version."
- **User Experience (Briefly):** Mention any key UX considerations if obvious from the request.

The final enhanced request should be a clear, actionable paragraph or a short list of detailed requirements.
Return ONLY the enhanced request text itself. Do not include any conversational lead-in, explanations about your role, or markdown formatting.

Enhanced Project Request:`,
});


const generateCodeProjectPrompt = ai.definePrompt({
  name: 'generateCodeProjectPrompt',
  input: {schema: z.object({ request: z.string() }) }, // Input is now just the (potentially enhanced) request
  output: {schema: GenerateCodeProjectOutputSchema},
  prompt: `You are Moonlight, an expert software engineer. Please generate a functional code project based on the following user request.
The project may consist of one or more files.
The project MUST use Next.js (App Router with Server Components by default), React, TypeScript, Tailwind CSS, and ShadCN UI components where appropriate.

User Request: {{{request}}}

**Output Instructions:**
1.  **Files:**
    *   Your primary output should be an array named 'files'.
    *   Each element in the 'files' array must be an object containing:
        *   'fileName': A string representing the full relative path of the file (e.g., 'src/app/page.tsx', 'src/components/MyComponent.tsx', 'public/index.html', 'styles/app.css'). Use standard Next.js App Router conventions where applicable.
        *   'code': A string containing the complete code for that file.
    *   Ensure all necessary files for a functional project are included. For example, a Next.js component might need a corresponding type definition file or a server action.
    *   Do NOT include comments like "File: index.html" inside the 'code' property. The 'code' property should only contain the raw file content.
    *   Prioritize functional components, hooks, and modern React patterns.
    *   Ensure Server Components are used by default for Next.js pages/layouts unless client-side interactivity specifically requires 'use client'.
    *   Use Tailwind CSS for styling. Do not use inline styles or other CSS frameworks.
    *   If forms are involved, prefer Next.js Server Actions for data mutations.

2.  **Explanation:**
    *   Provide a clear and concise explanation of the generated project.
    *   This explanation MUST include:
        *   An overview of the project structure and technologies used (Next.js App Router, React, TypeScript, Tailwind, ShadCN).
        *   A list of all generated 'fileName's and a brief description of each file's purpose.
        *   How the files work together.
        *   Any key libraries or frameworks used (beyond the defaults).
        *   Basic setup or usage instructions (e.g., "run 'npm run dev' and open your browser").

**Example of desired output structure (for a simple Next.js component):**
\`\`\`json
{
  "files": [
    {
      "fileName": "src/app/page.tsx",
      "code": "import { MyButton } from '@/components/my-button';\\n\\nexport default function HomePage() {\\n  return (\\n    <main className=\\"p-4\\">\\n      <h1 className=\\"text-2xl font-bold mb-4\\">Welcome</h1>\\n      <MyButton />\\n    </main>\\n  );\\n}"
    },
    {
      "fileName": "src/components/my-button.tsx",
      "code": "'use client';\\n\\nimport { Button } from '@/components/ui/button';\\nimport { useState } from 'react';\\n\\nexport function MyButton() {\\n  const [count, setCount] = useState(0);\\n  return <Button onClick={() => setCount(count + 1)}>Clicked {count} times</Button>;\\n}"
    }
  ],
  "explanation": "This project creates a simple Next.js application. 'src/app/page.tsx' is the main page that imports and uses 'src/components/my-button.tsx'. The button component ('my-button.tsx') is a client component that maintains a click count. It uses ShadCN's Button component. To run, ensure Next.js is set up and run 'npm run dev'."
}
\`\`\`

Generate the code project now.
`,
});

const generateCodeProjectFlow = ai.defineFlow(
  {
    name: 'generateCodeProjectFlow',
    inputSchema: GenerateCodeProjectInputSchema,
    outputSchema: GenerateCodeProjectOutputSchema,
  },
  async (input: GenerateCodeProjectInput): Promise<GenerateCodeProjectOutput> => {
    let finalRequest = input.request;

    if (input.enhanceRequest) {
      console.log("Enhancing project request...");
      try {
        const { output: enhancedRequestResult } = await enhanceProjectRequestPrompt({ originalRequest: input.request });
        if (enhancedRequestResult?.enhancedRequest) {
          finalRequest = enhancedRequestResult.enhancedRequest;
          console.log("Using enhanced project request:", finalRequest);
        } else {
          console.warn("Request enhancement did not return an enhanced request. Using original request.");
        }
      } catch (enhancementError) {
        console.warn("Error during request enhancement, using original request:", enhancementError);
      }
    }

    const {output} = await generateCodeProjectPrompt({ request: finalRequest });

    if (!output || !output.files || !Array.isArray(output.files) || output.files.length === 0) {
      const explanation = output?.explanation || "No explanation provided.";
      console.error("generateCodeProjectFlow: AI did not return the expected files array or it was empty.", output);
      return {
         files: [{ fileName: "error.txt", code: `// Error: AI did not return any files. Original request: ${input.request}\n// Enhanced request (if used): ${input.enhanceRequest ? finalRequest: 'N/A'}` }],
         explanation: `The AI failed to generate the project files in the expected format. Please try rephrasing your request or be more specific about the files needed.\n\nOriginal Explanation (if any):\n${explanation}`,
      }
    }
    
    for (const file of output.files) {
        if (typeof file.fileName !== 'string' || typeof file.code !== 'string') {
            console.error("generateCodeProjectFlow: AI returned a file object with missing or invalid fileName/code.", file);
             return {
                files: [{ fileName: "error.txt", code: `// Error: AI returned an invalid file object.\n// Offending file data: ${JSON.stringify(file)}\n// Original request: ${input.request}\n// Enhanced request (if used): ${input.enhanceRequest ? finalRequest: 'N/A'}` }],
                explanation: "The AI returned one or more files with missing or invalid names/content. Please try again."
            };
        }
    }
    return output;
  }
);


    