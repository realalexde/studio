
'use server';
/**
 * @fileOverview This file defines a Genkit flow for searching external sources (simulated),
 * generating images, and summarizing results, considering conversation history.
 *
 * - searchAndSummarize - A function that takes a query and history, returns a summarized response which may include text and/or an image.
 * - SearchAndSummarizeInput - The input type for the searchAndSummarize function.
 * - SearchAndSummarizeOutput - The return type for the searchAndSummarize function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import Image from 'next/image'; // Not used here, but often in UI

const ChatMessageSchema = z.object({
  sender: z.enum(["user", "bot"]),
  text: z.string(),
});
export type AiChatMessage = z.infer<typeof ChatMessageSchema>;

const SearchAndSummarizeInputSchema = z.object({
  query: z.string().describe('The current search query or image generation request from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history to provide context. The last message in history is the current query by the user if not empty.'),
});
export type SearchAndSummarizeInput = z.infer<typeof SearchAndSummarizeInputSchema>;

const SearchAndSummarizeOutputSchema = z.object({
  summary: z.string().describe('A summarized textual response, or a caption if an image was generated. This string will be plain text by default. If the user query explicitly asks for JSON output using phrases like "in JSON format" or "as JSON", then this string should be a valid JSON string. This field should ONLY contain the direct answer or caption, with no meta-commentary about the search process or AI capabilities.'),
  imageUrl: z.string().optional().describe('The data URI of the generated image, if an image was requested and successfully generated.'),
});
export type SearchAndSummarizeOutput = z.infer<typeof SearchAndSummarizeOutputSchema>;

export async function searchAndSummarize(input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> {
  return searchAndSummarizeFlow(input);
}

const internetSearchTool = ai.defineTool(
  {
    name: 'internetSearch',
    description: 'Performs a simulated internet search to find up-to-date information or information beyond the AI\'s training data for textual answers. Returns the content found and its source URL. The tool itself returns plain text content; the LLM must format it as JSON if requested by the user for the summary field.',
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
    return { content, source };
  }
);

const generateImageTool = ai.defineTool(
  {
    name: 'generateImageTool',
    description: 'Generates an image based on a textual prompt. Use this tool when the user explicitly asks to create or draw an image.',
    inputSchema: z.object({
      imagePrompt: z.string().describe('A detailed description of the image to be generated.'),
    }),
    outputSchema: z.object({
      imageUrl: z.string().describe('The data URI of the generated image.'),
    }),
  },
  async (input) => {
    console.log(`Generating image with prompt: ${input.imagePrompt}`);
    const imageResult = await ai.generate({
      prompt: input.imagePrompt,
      model: 'googleai/gemini-2.0-flash-exp', // Must use a model capable of image generation
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });

    if (!imageResult.media?.url) {
      throw new Error('Image generation failed: Model did not return an image URL.');
    }
    return { imageUrl: imageResult.media.url };
  }
);


const searchAndSummarizePrompt = ai.definePrompt({
  name: 'searchAndSummarizePrompt',
  input: {schema: SearchAndSummarizeInputSchema},
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [internetSearchTool, generateImageTool],
  prompt: `You are Moonlight, an AI assistant from Nexus. When asked who you are, you should identify yourself as such.

**Language Matching:**
You MUST detect the language of the User's LATEST Question/Request ("{{{query}}}").
Your entire response, including the 'summary' field and any conversational text (greetings, explanations, image captions, error messages), MUST be in the *same language* as that LATEST Question/Request.
If the LATEST Question/Request is in Russian, your entire response must be in Russian. If it's in English, your response must be in English, and so on.
This applies to both simple greetings and complex queries.

Consider the full conversation history for context.

Conversation History (if any, most recent messages last):
{{#if history}}
{{#each history}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No conversation history provided.
{{/if}}

User's LATEST Question/Request: "{{{query}}}"

**Special Handling for Greetings/Pleasantries:**
If the user's LATEST Question/Request ("{{{query}}}") is primarily a simple greeting (e.g., "hello", "hi", "привет", "hola", "good morning"), a polite closing (e.g., "thank you", "bye", "good night"), or a similar conversational pleasantry:
  - Respond naturally, friendly, and in character as Moonlight, *in the detected language*. Acknowledge the greeting or pleasantry. You can ask how you can help if appropriate.
  - Your 'summary' field in the output MUST contain this conversational response.
  - The 'imageUrl' field in the output MUST be OMITTED.
  - You do NOT need to follow the detailed "Analyze / Use Tool" steps below for these simple conversational turns. Your response should be a single JSON object: \`{ "summary": "Your conversational reply here, in the detected language." }\`.

**For all other types of LATEST Questions/Requests (information, image generation, etc.):**
  Your primary goal is to comprehensively and directly answer the user's LATEST question or fulfill their image generation request, *in the detected language*.
  Follow these steps precisely:

  1.  **Analyze User's LATEST Question/Request & History**:
      *   Determine the user's primary intent: Are they asking for textual information/summary, OR are they asking you to generate/draw/create an image?
      *   If the latest query is short or ambiguous (e.g., "what about that?"), use the conversation history to determine the actual topic of interest or intent.

  2.  **If the user is asking to GENERATE AN IMAGE** (e.g., "draw a ...", "make a picture of ...", "generate an image of ...", "create an image showing ..."):
      *   Use the 'generateImageTool'. Provide a clear and descriptive 'imagePrompt' to the tool based on the user's request.
      *   The tool will return an object like: '{ "imageUrl": "data:image/png;base64,..." }'.
      *   Your 'summary' field in the output should be a short, relevant caption for the image, *in the detected language* (e.g., if the query was Russian, the caption should be in Russian like "Вот ваше изображение кота.").
      *   Your 'imageUrl' field in the output should be the URL from the tool.
      *   DO NOT use the 'internetSearch' tool if the primary intent is image generation.

  3.  **If the user is asking for INFORMATION or a SUMMARY** (and NOT primarily an image):
      *   Determine if the question requires information that is likely outside your general knowledge, needs to be up-to-date, or if the user explicitly asks for a search.
      *   If you decide external information is needed, use the 'internetSearch' tool. Provide a clear and specific 'searchQuery' to the tool.
      *   The 'internetSearch' tool will return an object like: '{ "content": "information found...", "source": "www.example-source.com" }'.
      *   Formulate your 'summary' field:
          *   If you used 'internetSearch': Your response MUST directly incorporate the 'content' from the tool to answer the user's latest question, *all in the detected language*. You MUST clearly state that the information came from the internet and CITE the 'source' provided by the tool (e.g., "According to [source from tool], [summary of content from tool]."). Remember, this entire statement must be in the detected language of the user's query.
          *   If you did NOT use 'internetSearch': Provide a comprehensive answer based on your general knowledge and history, *in the detected language*.
      *   The 'imageUrl' field in your output should be OMITTED in this case.
      *   **JSON Formatting for 'summary'**: By default, 'summary' is plain text. ONLY if the user's LATEST question *explicitly* asks for the output "in JSON format", "as JSON", or "output JSON", then the *entire string content* of the 'summary' field must be a valid JSON string. Otherwise, it MUST be plain text.

  4.  **Final Output Structure (applies to information/image requests from steps 2 & 3 only):**
      *   Your response MUST be a single JSON object.
      *   This JSON object MUST have a key named "summary" with a non-empty string value (in the detected language).
      *   If an image was generated, the JSON object MUST also have a key named "imageUrl" with the image data URI as a string value. If no image was generated, this key should be OMITTED from the JSON object.
      *   Example structure if no image: \`{ "summary": "Your textual answer here, in the detected language." }\`
      *   Example structure with an image: \`{ "summary": "Your image caption here, in the detected language.", "imageUrl": "data:image/png;base64,..." }\`
      *   If, after considering all information and tool outputs (or tool failures), you cannot provide a meaningful answer or perform the requested action due to ambiguity or limitations, your "summary" field should reflect this politely, *in the detected language* (e.g., "I need more information for that request."). You MUST still return this polite message within the valid JSON structure described above (e.g., \`{ "summary": "I'm sorry, I cannot fulfill that request, in the detected language." }\`).
      *   DO NOT return null for the entire output. DO NOT return a malformed JSON. DO NOT return an empty string for the "summary" field.

User's LATEST Question/Request: {{{query}}}
Assistant's Response (Remember to structure as a valid JSON object with a "summary" string (in the detected language), and optionally "imageUrl" string, following all rules above):`,
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
        if (promptResponse.output.summary.trim() === "") {
            console.warn("SearchAndSummarizeFlow: Prompt returned an empty summary. Falling back to default.");
            return { summary: "I received an empty response from the AI. Could you try rephrasing your question?" };
        }
        // Ensure imageUrl is either a string or undefined, not null, to match schema expectations if model returns null
        return {
          summary: promptResponse.output.summary,
          imageUrl: promptResponse.output.imageUrl || undefined,
        };
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

