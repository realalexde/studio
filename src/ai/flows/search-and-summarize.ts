
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
  summary: z.string().describe('A summarized response. This string will be plain text by default. If the user query explicitly asks for JSON output using phrases like "in JSON format" or "as JSON", then this string should be a valid JSON string. This field should ONLY contain the direct answer, with no meta-commentary about the search process or AI capabilities.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const searchTool = ai.defineTool({
  name: 'search',
  description: 'Performs a web search and returns ONLY PLAIN TEXT information related to the query. This tool NEVER produces JSON. Use this tool if the user asks a question that requires up-to-date information or knowledge beyond your training data.',
  inputSchema: z.object({
    query: z.string().describe('The search query, potentially refined using conversation history for context.'),
  }),
  outputSchema: z.string().describe('Plain textual information found from the web search. This is always plain text and should be used to formulate the summary.'),
},
async (input) => {
    console.log(`Simulated search for: ${input.query}`);
    // Simulate more realistic search results
    return `Simulated search findings for "${input.query}": Key aspects often include its definition, main features, common applications, and recent developments. For example, if searching for a technology, results would typically cover its purpose, benefits, and comparisons to alternatives. This simulated information should be used to form the summary. For instance, 'Ubuntu' is a popular Linux distribution known for its ease of use and strong community support. 'Installing it' can be beneficial for development, server hosting, or as a desktop OS. Whether 'it is worth it' depends on individual needs and technical comfort.`;
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
  prompt: `You are an AI assistant. Your primary task is to answer the user's question. If necessary, you will use a search tool to gather information. You will then provide a concise summary as the answer, taking into account the full conversation history.

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

Your goal is to produce a response object that STRICTLY ADHERES to this JSON schema:
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "description": "This field contains your complete and direct answer to the user's LATEST question. It should be concise. Do NOT include any explanations about your process, tools used, or decision-making within this 'summary' string. It is ONLY the answer."
    }
  },
  "required": ["summary"]
}

Follow these instructions precisely to construct the content for the "summary" field:
1.  Analyze the user's LATEST question: "{{{query}}}".
2.  Consider the ENTIRE conversation history for context.
3.  If external information is needed to answer the LATEST question:
    a. Formulate an effective search query for the 'search' tool, using the LATEST question and history for relevance.
    b. Invoke the 'search' tool. It will return plain text.
4.  Based *only* on the information from the 'search' tool (if used) and the conversation history, generate the content for the "summary" field. This content MUST be a direct and concise answer to the user's LATEST question: "{{{query}}}".

5.  **Formatting the "summary" field's content:**
    *   **Default (Plain Text):** The content of the "summary" field MUST be plain text.
        Example (User: "Tell me about cats"): The "summary" content would be "Cats are small, carnivorous mammals kept as pets. They are known for their agility and purring."
    *   **JSON Format (Conditional):** If the user's LATEST question "{{{query}}}" *explicitly includes one of the exact phrases "in JSON format", "as JSON", or "output JSON"*, then and ONLY then, the content of the "summary" field MUST be a well-formed JSON string.
        Example (User: "Tell me about cats in JSON format"): The "summary" content would be "{ \"animal\": \"cat\", \"sound\": \"meow\", \"domesticated\": true }".

6.  **VERY IMPORTANT:** The content of the "summary" field itself MUST NOT contain any meta-commentary about your capabilities, limitations, the search process, or your reasoning. It must ONLY be the direct answer to the user's LATEST question. No conversational fluff.

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

