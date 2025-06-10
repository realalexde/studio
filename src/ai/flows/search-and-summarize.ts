'use server';
/**
 * @fileOverview This file defines a Genkit flow for searching external sources (simulated)
 * and summarizing the results, considering conversation history and citing sources.
 *
 * - searchAndSummarize - A function that takes a query and history, returns a summarized response.
 * - SearchAndSummarizeInput - The input type for the searchAndSummarize function.
 * - SearchAndSummarizeOutput - The return type for the searchAndSummarize function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  sender: z.enum(["user", "bot"]),
  text: z.string(),
});
export type AiChatMessage = z.infer<typeof ChatMessageSchema>;

const SearchAndSummarizeInputSchema = z.object({
  query: z.string().describe('The current search query from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history to provide context.'),
});
export type SearchAndSummarizeInput = z.infer<typeof SearchAndSummarizeInputSchema>;

const SearchAndSummarizeOutputSchema = z.object({
  summary: z.string().describe('A summarized response that incorporates search results if a search was performed. Includes attribution if information is from the internet.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const searchTool = ai.defineTool(
  {
    name: 'internetSearch',
    description: 'Performs a simulated internet search to find up-to-date information or information beyond the AI\'s training data. Returns the content found and its source URL.',
    inputSchema: z.object({
      searchQuery: z.string().describe('The query to search the internet for.'),
    }),
    outputSchema: z.object({
      content: z.string().describe('The textual content found by the search.'),
      source: z.string().describe('The simulated URL or source of the information.'),
    }),
  },
  async (input) => {
    console.log(`Simulated internet search for: ${input.searchQuery}`);
    let content = `This is a general simulated search result for "${input.searchQuery}". Specific details would require a real search.`;
    let source = `simulated-search-engine.com/search?q=${encodeURIComponent(input.searchQuery)}`;

    if (input.searchQuery.toLowerCase().includes("ubuntu")) {
      content = "Ubuntu is a popular open-source Linux distribution based on Debian. It is developed by Canonical Ltd. and is known for its ease of use, strong community support, and regular release cycle. Ubuntu is widely used for desktops, servers, and cloud computing.";
      source = "simulated-search-engine.com/ubuntu-overview";
    } else if (input.searchQuery.toLowerCase().includes("next.js")) {
      content = "Next.js is an open-source web development framework created by Vercel, enabling React-based web applications with server-side rendering and static site generation.";
      source = "simulated-search-engine.com/nextjs-framework";
    } else if (input.searchQuery.toLowerCase().includes("weather in paris")) {
      content = "The simulated weather in Paris is currently sunny with a high of 22°C. Remember, this is not real-time data!";
      source = "simulated-weather-service.com/paris";
    }

    return {
      content: content,
      source: source,
    };
  }
);

const searchAndSummarizePrompt = ai.definePrompt({
  name: 'searchAndSummarizePrompt',
  input: {schema: SearchAndSummarizeInputSchema},
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [searchTool],
  prompt: `You are an AI assistant. Your goal is to answer the user's LATEST question.
Consider the conversation history for context.
Conversation History (if any, most recent messages last):
{{#if history}}
{{#each history}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No conversation history provided.
{{/if}}

User's LATEST question: "{{{query}}}"

1.  **Analyze the Query**: Determine if the user's latest question requires information that is likely outside your general knowledge or needs to be up-to-date (e.g., current events, specific product details, highly specific facts).

2.  **Use Search Tool (If Necessary)**:
    *   If you need external information, use the 'internetSearch' tool.
    *   The tool will return an object like: \`{ "content": "information found...", "source": "www.example-source.com" }\`.

3.  **Formulate Your Response**:
    *   **If you used the 'internetSearch' tool**:
        *   Your response MUST incorporate the 'content' from the tool.
        *   You MUST clearly state that the information came from the internet and CITE the 'source' provided by the tool.
        *   For example: "According to [source from tool], [summary of content from tool]. This information was retrieved from the internet." or "I found on the internet at [source from tool] that [summary of content from tool]."
        *   Do not just repeat the tool's output verbatim; summarize or integrate it naturally into your answer.
    *   **If you did NOT use the search tool**: Answer based on your general knowledge.

4.  **Output**: Your entire response should be a single string in the 'summary' field.

User's LATEST Question: {{{query}}}
Assistant's Response (ensure to follow sourcing rules if search tool is used):`,
});

const searchAndSummarizeFlow = ai.defineFlow(
  {
    name: 'searchAndSummarizeFlow',
    inputSchema: SearchAndSummarizeInputSchema,
    outputSchema: SearchAndSummarizeOutputSchema,
  },
  async (input: SearchAndSummarizeInput) => {
    const {output} = await searchAndSummarizePrompt({ query: input.query, history: input.history });
    if (!output || typeof output.summary !== 'string') {
      console.error("SearchAndSummarizeFlow: searchAndSummarizePrompt returned invalid output or null.", output);
      return { summary: "I encountered an issue processing your request. Please try rephrasing or try again later." };
    }
    return output;
  }
);
