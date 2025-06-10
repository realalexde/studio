
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

const searchTool = ai.defineTool(
  {
    name: 'internetSearch',
    description: 'Performs a simulated internet search to find up-to-date information or information beyond the AI\'s training data. Returns the content found and its source URL. The tool itself returns plain text content; the LLM must format it as JSON if requested by the user.',
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

    const lowerQuery = input.searchQuery.toLowerCase();
    if (lowerQuery.includes("ubuntu")) {
      content = "Ubuntu is a popular open-source Linux distribution based on Debian. It is developed by Canonical Ltd. and is known for its ease of use, strong community support, and regular release cycle. Ubuntu is widely used for desktops, servers, and cloud computing.";
      source = "simulated-search-engine.com/ubuntu-overview";
    } else if (lowerQuery.includes("next.js")) {
      content = "Next.js is an open-source web development framework created by Vercel, enabling React-based web applications with server-side rendering and static site generation.";
      source = "simulated-search-engine.com/nextjs-framework";
    } else if (lowerQuery.includes("weather in paris")) {
      content = "The simulated weather in Paris is currently sunny with a high of 22°C. Remember, this is not real-time data!";
      source = "simulated-weather-service.com/paris";
    } else if (lowerQuery.includes("linux")) {
        content = "Linux is a family of open-source Unix-like operating systems based on the Linux kernel. Distributions include the Linux kernel and supporting system software and libraries, many of which are provided by the GNU Project. Popular Linux distributions include Debian, Ubuntu, Fedora, CentOS, and Mint.";
        source = "simulated-search-engine.com/linux-general";
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
  prompt: `You are an AI assistant. Your primary goal is to answer the user's LATEST question comprehensively and directly.
Consider the full conversation history for context, especially for follow-up questions or short queries like "search it" or "tell me more".

Conversation History (if any, most recent messages last):
{{#if history}}
{{#each history}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No conversation history provided.
{{/if}}

User's LATEST Question: "{{{query}}}"

Follow these steps precisely:

1.  **Analyze User's LATEST Question & History**:
    *   Understand the user's intent in their latest question: "{{{query}}}".
    *   If the latest question is short or ambiguous (e.g., "search it", "what about that?"), use the conversation history to determine the actual topic of interest.
    *   Determine if the question requires information that is likely outside your general knowledge, needs to be up-to-date (e.g., current events, specific product details), or if the user explicitly asks for a search.

2.  **Use 'internetSearch' Tool (If Necessary)**:
    *   If you decide external information is needed (based on step 1), use the 'internetSearch' tool. Provide a clear and specific 'searchQuery' to the tool based on the user's question and history.
    *   The tool will return an object like: \`{ "content": "information found...", "source": "www.example-source.com" }\`.

3.  **Formulate Your Response (for the 'summary' field)**:
    *   **If you used the 'internetSearch' tool**:
        *   Your response MUST directly incorporate the 'content' from the tool to answer the user's latest question.
        *   You MUST clearly state that the information came from the internet and CITE the 'source' provided by the tool. For example: "According to [source from tool], [summary of content from tool]. This information was retrieved from the internet." or "I found on the internet at [source from tool] that [summary of content from tool]."
        *   Focus on answering the LATEST question. Do not just repeat the tool's output verbatim; summarize or integrate it naturally into your answer. Avoid meta-commentary about your search process (e.g., "I will search for...", "I found this...").
    *   **If you did NOT use the search tool**: Answer the user's latest question based on your general knowledge and the conversation history.
    *   **JSON Formatting**:
        *   By default, the content of the 'summary' field should be plain text.
        *   ONLY if the user's LATEST question *explicitly* asks for the output "in JSON format", "as JSON", or to "output JSON", then the *entire string content* of the 'summary' field must be a valid JSON string representing the answer. Otherwise, it MUST be plain text.
    *   **Conciseness**: Be direct. Avoid unnecessary conversational fluff or explaining your capabilities. The 'summary' field should contain ONLY the answer.

4.  **Final Output:**
    *   Ensure your entire response is a single JSON object: '{ "summary": "YOUR_GENERATED_SUMMARY_STRING_HERE" }'.
    *   If, after considering all information, you cannot provide a meaningful answer or perform the requested search due to ambiguity, your "summary" field should reflect this politely, e.g., "I need more information to help with that. Could you clarify your request?" or "Based on our conversation, I'm unsure what to search for. Please specify." DO NOT RETURN NULL or an invalid structure.

User's LATEST Question: {{{query}}}
Assistant's Response (Remember to structure as {"summary": "..."} and follow all rules above):`,
});

const searchAndSummarizeFlow = ai.defineFlow(
  {
    name: 'searchAndSummarizeFlow',
    inputSchema: SearchAndSummarizeInputSchema,
    outputSchema: SearchAndSummarizeOutputSchema,
  },
  async (input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> => {
    try {
      const promptResponse = await searchAndSummarizePrompt({ query: input.query, history: input.history });

      if (promptResponse && promptResponse.output && typeof promptResponse.output.summary === 'string') {
        // Ensure the summary is not empty, which can sometimes happen if the model fails.
        if (promptResponse.output.summary.trim() === "") {
            console.warn("SearchAndSummarizeFlow: Prompt returned an empty summary. Falling back to default.");
            return { summary: "I received an empty response from the AI. Could you try rephrasing your question?" };
        }
        return promptResponse.output;
      } else {
        console.error("SearchAndSummarizeFlow: Invalid or missing 'output' or 'summary' in promptResponse.", promptResponse);
        return { summary: "I'm having trouble processing that request right now. The AI returned an unexpected result." };
      }
    } catch (flowError) {
      console.error("SearchAndSummarizeFlow: Critical error during flow execution.", flowError);
      // Ensure a valid SearchAndSummarizeOutput object is returned even in case of an unexpected error
      return { summary: "An unexpected error occurred while trying to get a response. Please try again or rephrase your request." };
    }
  }
);
