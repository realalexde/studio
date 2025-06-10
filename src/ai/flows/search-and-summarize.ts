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
  description: 'Performs a web search and returns the results.',
  inputSchema: z.object({
    query: z.string().describe('The search query.'),
  }),
  outputSchema: z.string(),
},
async (input) => {
    // In a real application, this would call a search API like Google or DuckDuckGo.
    // For this example, we'll just return a canned response.
    console.log(`Searching for: ${input.query}`);
    return `Simulated search results for query: ${input.query}.  The results indicate that the query is related to the following topics. This information should be summarized.`
  }
);


const summarizePrompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: {schema: SearchAndSummarizeInputSchema},
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [searchTool],
  prompt: `You are an AI assistant that answers user questions.

  If the question requires retrieving information from the internet, use the available search tool to find relevant information.
  Summarize the information from the search results to answer the question.

  Question: {{{query}}}`,
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
