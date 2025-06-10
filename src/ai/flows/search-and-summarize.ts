
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
  summary: z.string().describe('A summarized response from the search results. If the user query requests JSON, this string should be a valid JSON string.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const searchTool = ai.defineTool({
  name: 'search',
  description: 'Performs a web search and returns TEXTUAL information related to the query. This tool does not produce JSON.',
  inputSchema: z.object({
    query: z.string().describe('The search query.'),
  }),
  outputSchema: z.string().describe('Textual information found from the web search.'),
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
  prompt: `You are an AI assistant. Your primary task is to generate a summary based on information from a search tool.
The user's question is: "{{{query}}}"

You have one tool available:
- 'search': This tool accepts a query, performs a web search, and returns TEXTUAL information. It DOES NOT produce JSON.

Your goal is to produce a response that fits the following structure: { "summary": "YOUR_GENERATED_SUMMARY_HERE" }

Instructions:
1.  Examine the user's question: "{{{query}}}".
2.  If the question requires external information, use the 'search' tool with an appropriate search term derived from "{{{query}}}". The tool will provide you with textual information.
3.  Based *solely* on the textual information from the 'search' tool (if used), generate a concise summary that directly answers "{{{query}}}".
4.  The content you generate will be the value for the "summary" field.
    -   **If the user's question "{{{query}}}" explicitly requests the output in JSON format**: The string you provide for the "summary" field MUST be a well-formed JSON string. For example, if asked for a JSON summary about a cat, your output for the "summary" field could be: "{ \\"animal\\": \\"cat\\", \\"sound\\": \\"meow\\", \\"habitat\\": \\"domestic\\" }".
    -   **Otherwise**: The string you provide for the "summary" field should be a plain text summary.
5.  Do NOT mention your own capabilities, limitations, or the search process in your summary. Focus only on answering the user's question with the summary.

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

