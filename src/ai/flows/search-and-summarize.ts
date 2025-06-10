
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
  summary: z.string().describe('A summarized response from the search results.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const searchTool = ai.defineTool({
  name: 'search',
  description: 'Performs a web search and returns information related to the query.',
  inputSchema: z.object({
    query: z.string().describe('The search query.'),
  }),
  outputSchema: z.string().describe('Information found from the web search.'),
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
  prompt: `You are an AI assistant. Your task is to answer the user's question: "{{{query}}}"

To do this, you have access to a search tool.
1. If the question requires external information, you MUST use the 'search' tool.
2. The 'search' tool will provide you with information.
3. Your final response MUST be a summary based *solely* on the information provided by the 'search' tool to answer "{{{query}}}".
   Do not mention your own capabilities or limitations regarding accessing specific URLs or search engines.
   Directly present the summarized answer to the user's question based on the tool's output.

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

