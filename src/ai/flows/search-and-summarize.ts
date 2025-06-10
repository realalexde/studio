
// src/ai/flows/search-and-summarize.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for searching external sources and summarizing the results.
 *
 * - searchAndSummarize - A function that takes a query and returns a summarized response from search results.
 * - SearchAndSummarizeInput - The input type for the searchAndSummarize function.
 * - SearchAndSummarizeOutput - The return type for the searchAndSummarize function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SearchAndSummarizeInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
export type SearchAndSummarizeInput = z.infer<typeof SearchAndSummarizeInputSchema>;

const SearchAndSummarizeOutputSchema = z.object({
  summary: z.string().describe('A summarized response from the search results. This string will be plain text by default. If the user query explicitly asks for JSON output using phrases like "in JSON format" or "as JSON", then this string should be a valid JSON string.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const searchTool = ai.defineTool({
  name: 'search',
  description: 'Performs a web search and returns ONLY PLAIN TEXT information related to the query. This tool NEVER produces JSON.',
  inputSchema: z.object({
    query: z.string().describe('The search query.'),
  }),
  outputSchema: z.string().describe('Textual information found from the web search. This is always plain text.'),
},
async (input) => {
    console.log(`Simulated search for: ${input.query}`);
    // Provide a slightly more content-rich, generic simulated response.
    return `Simulated search findings for "${input.query}": This topic is generally well-documented. Key aspects often include its definition, main features, and common applications. For instance, if the query were about a technology, results would typically cover its purpose and benefits. This simulated information should be used to form the summary.`;
  }
);


const summarizePrompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: {schema: SearchAndSummarizeInputSchema},
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [searchTool],
  prompt: `You are an AI assistant. Your primary task is to summarize information from a search tool to answer the user's question.
The user's question is: "{{{query}}}"

You have one tool available:
- 'search': This tool accepts a query, performs a web search, and returns ONLY PLAIN TEXT information. It NEVER produces JSON.

Your goal is to produce a response object like this: { "summary": "YOUR_GENERATED_CONTENT_HERE" }
The "YOUR_GENERATED_CONTENT_HERE" part is what you need to create.

Instructions for "YOUR_GENERATED_CONTENT_HERE":
1.  Examine the user's question: "{{{query}}}".
2.  If the question requires external information, use the 'search' tool with an appropriate search term. The tool will give you plain text.
3.  Based *solely* on the plain textual information from the 'search' tool (if used), generate a concise summary that directly answers "{{{query}}}".

4.  **Formatting "YOUR_GENERATED_CONTENT_HERE":**
    *   **Default (Plain Text):** By default, "YOUR_GENERATED_CONTENT_HERE" MUST be a plain text, human-readable summary.
        Example if user asks "Tell me about cats": "YOUR_GENERATED_CONTENT_HERE" would be "Cats are small, carnivorous mammals kept as pets. They are known for their agility and purring."

    *   **JSON Format (Conditional):** If the user's question "{{{query}}}" *explicitly includes one of the exact phrases "in JSON format", "as JSON", or "output JSON"*, then and ONLY then, "YOUR_GENERATED_CONTENT_HERE" MUST be a well-formed JSON string.
        Example if user asks "Tell me about cats in JSON format": "YOUR_GENERATED_CONTENT_HERE" would be "{ \"animal\": \"cat\", \"sound\": \"meow\", \"domesticated\": true }".

5.  Do NOT mention your own capabilities, limitations, or the search process in "YOUR_GENERATED_CONTENT_HERE". Focus only on answering the user's question.

User's Question: {{{query}}}`,
});

const searchAndSummarizeFlow = ai.defineFlow(
  {
    name: 'searchAndSummarizeFlow',
    inputSchema: SearchAndSummarizeInputSchema,
    outputSchema: SearchAndSummarizeOutputSchema,
  },
  async input => {
    const {output} = await summarizePrompt(input);
    return output!;
  }
);

