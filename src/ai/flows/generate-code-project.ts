
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a code project based on a user request.
 * The project can consist of multiple files.
 *
 * - generateCodeProject - A function that takes a user request and generates a code project.
 * - GenerateCodeProjectInput - The input type for the generateCodeProject function.
 * - GenerateCodeProjectOutput - The return type for the generateCodeProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCodeProjectInputSchema = z.object({
  request: z.string().describe('The user request for the code project.'),
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

const generateCodeProjectPrompt = ai.definePrompt({
  name: 'generateCodeProjectPrompt',
  input: {schema: GenerateCodeProjectInputSchema},
  output: {schema: GenerateCodeProjectOutputSchema},
  prompt: `You are Moonlight, an expert software engineer. Please generate a functional code project based on the following user request.
The project may consist of one or more files.

User Request: {{{request}}}

**Output Instructions:**
1.  **Files:**
    *   Your primary output should be an array named 'files'.
    *   Each element in the 'files' array must be an object containing:
        *   'fileName': A string representing the full relative path of the file (e.g., 'src/components/MyComponent.tsx', 'public/index.html', 'styles/app.css'). Use standard naming conventions.
        *   'code': A string containing the complete code for that file.
    *   Ensure all necessary files for a functional project are included. For example, a Next.js component might need a corresponding CSS module or type definition file. A simple HTML/CSS/JS project would need all three.
    *   Do NOT include comments like "File: index.html" inside the 'code' property. The 'code' property should only contain the raw file content.

2.  **Explanation:**
    *   Provide a clear and concise explanation of the generated project.
    *   This explanation MUST include:
        *   An overview of the project structure.
        *   A list of all generated 'fileName's and a brief description of each file's purpose.
        *   How the files work together.
        *   Any key libraries or frameworks used.
        *   Basic setup or usage instructions if necessary (e.g., "save these files and open index.html in a browser", or "ensure you have Node.js installed").

**Example of desired output structure (for a simple HTML/CSS project):**
\`\`\`json
{
  "files": [
    {
      "fileName": "index.html",
      "code": "<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>My Page</title>\\n  <link rel=\\"stylesheet\\" href=\\"style.css\\">\\n</head>\\n<body>\\n  <h1>Hello</h1>\\n  <script src=\\"script.js\\"></script>\\n</body>\\n</html>"
    },
    {
      "fileName": "style.css",
      "code": "body { font-family: sans-serif; }\\nh1 { color: blue; }"
    },
    {
      "fileName": "script.js",
      "code": "console.log('Page loaded');"
    }
  ],
  "explanation": "This project is a simple static website consisting of three files: index.html (the main page structure), style.css (for basic styling), and script.js (for client-side interactivity). The HTML file links to the CSS and JS files. To run it, save all files in the same directory and open index.html in your browser."
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
  async input => {
    const {output} = await generateCodeProjectPrompt(input);
    if (!output || !output.files || !Array.isArray(output.files) || output.files.length === 0) {
      // Attempt to recover if the AI only returned a single code string in projectCode (legacy behavior)
      // or if files array is missing/empty but explanation might contain code.
      const singleCode = (output as any)?.projectCode as string;
      const explanation = output?.explanation || "No explanation provided.";

      if (singleCode && typeof singleCode === 'string') {
        console.warn("generateCodeProjectFlow: AI returned single 'projectCode' string. Wrapping it into a file.");
        return {
          files: [{ fileName: "project.txt", code: singleCode }],
          explanation: `The AI returned a single block of code instead of a file structure. It has been placed in 'project.txt'.\n\nOriginal Explanation:\n${explanation}`,
        };
      }
      console.error("generateCodeProjectFlow: AI did not return the expected files array or it was empty.", output);
      throw new Error("The AI failed to generate the project files in the expected format. Please try rephrasing your request or be more specific about the files needed.");
    }
    // Ensure all file objects have fileName and code properties
    for (const file of output.files) {
        if (typeof file.fileName !== 'string' || typeof file.code !== 'string') {
            console.error("generateCodeProjectFlow: AI returned a file object with missing or invalid fileName/code.", file);
            throw new Error("The AI returned one or more files with missing or invalid names/content. Please try again.");
        }
    }
    return output;
  }
);

