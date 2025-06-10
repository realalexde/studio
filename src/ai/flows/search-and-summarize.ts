
// src/ai/flows/search-and-summarize.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for searching external sources and summarizing the results, considering conversation history.
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
  history: z.array(ChatMessageSchema).optional().describe('The conversation history to provide context. The last message in history is the current query by the user if not empty.'),
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
    query: z.string().describe('The search query, potentially refined using conversation history for context.'),
  }),
  outputSchema: z.string().describe('Textual information found from the web search. This is always plain text.'),
},
async (input) => {
    console.log(`Simulated search for: ${input.query}`);
    return `Simulated search findings for "${input.query}": This topic is generally well-documented. Key aspects often include its definition, main features, common applications, and recent developments. For instance, if the query were about a technology, results would typically cover its purpose, benefits, and comparisons to alternatives. This simulated information should be used to form the summary.`;
  }
);

const SummarizePromptInputSchema = z.object({
  query: z.string().describe('The current user query.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history.'),
});

const summarizePrompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: {schema: SummarizePromptInputSchema},
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [searchTool],
  prompt: `You are an AI assistant. Your primary task is to summarize information from a search tool to answer the user's question, taking into account the full conversation history.

Conversation History (if available, most recent messages last):
{{#if history}}
{{#each history}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No conversation history provided.
{{/if}}

The user's LATEST question is: "{{{query}}}"

You have one tool available:
- 'search': This tool accepts a query, performs a web search, and returns ONLY PLAIN TEXT information. It NEVER produces JSON.

Your goal is to produce a response object like this: { "summary": "YOUR_GENERATED_CONTENT_HERE" }
The "YOUR_GENERATED_CONTENT_HERE" part is what you need to create.

Instructions for "YOUR_GENERATED_CONTENT_HERE":
1.  Examine the user's LATEST question: "{{{query}}}".
2.  Use the ENTIRE conversation history (if provided) to understand the full context of the LATEST question. This is crucial if the latest question is short, uses pronouns (e.g., "it", "that", "them"), or is a follow-up to a previous topic.
3.  If the latest question requires external information to be answered properly:
    a. Formulate an effective search query for the 'search' tool. This search query should be based on the LATEST user question and informed by the conversation history to make it specific and relevant. For example, if the user asks "what about its performance?" and the history indicates "it" refers to "Ubuntu 24.04", your search query for the tool should be something like "Ubuntu 24.04 performance".
    b. Use the 'search' tool with this formulated search query. The tool will return plain text.
4.  Based *solely* on the plain textual information from the 'search' tool (if used) and the context derived from the conversation history, generate a concise summary that directly answers the user's LATEST question: "{{{query}}}".

5.  **Formatting "YOUR_GENERATED_CONTENT_HERE":**
    *   **Default (Plain Text):** "YOUR_GENERATED_CONTENT_HERE" MUST be a plain text, human-readable summary.
        Example if user asks "Tell me about cats": "YOUR_GENERATED_CONTENT_HERE" would be "Cats are small, carnivorous mammals kept as pets. They are known for their agility and purring."
    *   **JSON Format (Conditional):** If the user's LATEST question "{{{query}}}" *explicitly includes one of the exact phrases "in JSON format", "as JSON", or "output JSON"*, then and ONLY then, "YOUR_GENERATED_CONTENT_HERE" MUST be a well-formed JSON string.
        Example if user asks "Tell me about cats in JSON format": "YOUR_GENERATED_CONTENT_HERE" would be "{ \"animal\": \"cat\", \"sound\": \"meow\", \"domesticated\": true }".

6.  Do NOT mention your own capabilities, limitations, or the search process itself in "YOUR_GENERATED_CONTENT_HERE". Focus only on answering the user's LATEST question.

User's LATEST Question: {{{query}}}`,
});

const searchAndSummarizeFlow = ai.defineFlow(
  {
    name: 'searchAndSummarizeFlow',
    inputSchema: SearchAndSummarizeInputSchema,
    outputSchema: SearchAndSummarizeOutputSchema,
  },
  async (input: SearchAndSummarizeInput) => {
    const {output} = await summarizePrompt({ query: input.query, history: input.history });
    if (!output) {
      throw new Error("Failed to get a summary from the AI model.");
    }
    return output;
  }
);
