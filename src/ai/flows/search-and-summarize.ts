
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
  description: 'Performs a web search and returns ONLY PLAIN TEXT information related to the query. This tool NEVER produces JSON. Use this tool if the user asks a question that requires up-to-date information or knowledge beyond your training data. This tool is essential for answering questions about current events or specific entities the AI might not know about.',
  inputSchema: z.object({
    query: z.string().describe('The search query, which should be derived from the user\'s latest question and relevant conversation history.'),
  }),
  outputSchema: z.string().describe('Plain textual information found from the web search. This is always plain text and should be used to formulate the summary.'),
},
async (input) => {
    console.log(`Simulated search for: ${input.query}`);
    // Simulate more realistic search results based on the query
    if (input.query.toLowerCase().includes("ubuntu")) {
      return `Simulated search findings for "${input.query}": Ubuntu is a popular open-source Linux distribution based on Debian. It is developed by Canonical Ltd. and is known for its ease of use, strong community support, and regular release cycle. Ubuntu is widely used for desktops, servers, and cloud computing. Key features include a user-friendly interface (GNOME by default), a vast software repository, and robust security features. It's a good choice for beginners and experienced users alike.`;
    }
    return `Simulated search findings for "${input.query}": This topic generally covers aspects like its definition, main features, common applications, and recent developments. For example, if searching for a technology, results would typically cover its purpose, benefits, and comparisons to alternatives. This simulated information should be used to form the summary.`;
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
  prompt: `You are an AI assistant. Your primary task is to answer the user's LATEST question based on the provided conversation history and, if necessary, information gathered using the 'search' tool. You MUST ALWAYS produce a response object adhering to the JSON schema: { "properties": { "summary": { "type": "string" } }, "required": ["summary"] }.

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
- 'search': Accepts a search query string. Performs a web search and returns ONLY PLAIN TEXT information. It NEVER produces JSON. Use this tool if the user's LATEST question requires up-to-date information or knowledge beyond your training data.

Follow these steps:

1.  **Analyze Intent:**
    *   Carefully examine the user's LATEST question: "{{{query}}}".
    *   Consider the ENTIRE conversation history for context. If the LATEST question is short (e.g., "search it", "tell me more", "yes"), the history is CRUCIAL to determine the actual topic of interest. For instance, if the previous message was about "Ubuntu", and the user says "search it", you should search for "Ubuntu".
    *   Determine if the 'search' tool is needed. If the question can be answered from your general knowledge and the history, you might not need the tool. However, if it asks for current information, specific details you wouldn't know, or explicitly asks to search, use the tool.

2.  **Tool Use (If Necessary):**
    *   If you decide to use the 'search' tool:
        a.  Formulate an effective search query for the tool. This query should be based on the user's LATEST question and relevant context from the history.
        b.  Invoke the 'search' tool with this query.
    *   If you do not use the search tool, proceed to step 3.

3.  **Generate Summary:**
    *   Based on the information from the 'search' tool (if used), your general knowledge, and the conversation history, generate the content for the "summary" field.
    *   The content of the "summary" field MUST be a direct and concise answer to the user's LATEST question: "{{{query}}}".
    *   **Formatting the "summary" field's content:**
        *   **Default (Plain Text):** The content of the "summary" field MUST be plain text.
            Example (User: "Tell me about cats"): The "summary" content would be "Cats are small, carnivorous mammals kept as pets. They are known for their agility and purring."
        *   **JSON Format (Conditional):** If the user's LATEST question "{{{query}}}" *explicitly includes one of the exact phrases "in JSON format", "as JSON", or "output JSON"*, then and ONLY then, the content of the "summary" field MUST be a well-formed JSON string.
            Example (User: "Tell me about cats in JSON format"): The "summary" content would be "{ \"animal\": \"cat\", \"sound\": \"meow\", \"domesticated\": true }".
    *   **VERY IMPORTANT:** The content of the "summary" field itself MUST NOT contain any meta-commentary about your capabilities, limitations, the search process, your decision-making, or confirmations like "Okay, I will search for X." It must ONLY be the direct answer.

4.  **Final Output:**
    *   Ensure your entire response is a single JSON object: '{ "summary": "YOUR_GENERATED_SUMMARY_STRING_HERE" }'.
    *   If, after considering all information, you cannot provide a meaningful answer or perform the requested search due to ambiguity, your "summary" field should reflect this politely, e.g., "I need more information to help with that. Could you clarify your request?" or "Based on our conversation, I'm unsure what to search for. Please specify." DO NOT RETURN NULL or an invalid structure.

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
    if (!output || typeof output.summary !== 'string') { // Check if output is null or summary is not a string
      console.error("SearchAndSummarizeFlow: summarizePrompt returned invalid output or null.", output);
      // Return a valid error summary instead of throwing, to ensure schema compliance
      return { summary: "I encountered an issue processing your request. Please try rephrasing or try again later." };
    }
    return output;
  }
);

