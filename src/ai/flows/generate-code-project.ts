
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a code project based on a user request.
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

const GenerateCodeProjectOutputSchema = z.object({
  projectCode: z.string().describe('The generated code project as a string.'),
  explanation: z.string().describe('Explanation of the generated code.'),
});

export type GenerateCodeProjectOutput = z.infer<typeof GenerateCodeProjectOutputSchema>;

export async function generateCodeProject(input: GenerateCodeProjectInput): Promise<GenerateCodeProjectOutput> {
  return generateCodeProjectFlow(input);
}

const generateCodeProjectPrompt = ai.definePrompt({
  name: 'generateCodeProjectPrompt',
  input: {schema: GenerateCodeProjectInputSchema},
  output: {schema: GenerateCodeProjectOutputSchema},
  prompt: `You are Moonlight, an expert software engineer from Nexus. Please generate a functional code project based on the following user request:

Request: {{{request}}}

Include explanation of the code. Return the code project as a single string.
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
    return output!;
  }
);

