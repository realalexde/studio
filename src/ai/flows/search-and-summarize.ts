
'use server';
/**
 * @fileOverview This file defines a Genkit flow for searching external sources (simulated),
 * generating images, and summarizing results, considering conversation history and user-uploaded images.
 * It also includes functionality for a "Studio Mode" allowing temperature control and custom system prompts.
 *
 * - searchAndSummarize - A function that takes a query (text or image+text) and history, returns a summarized response.
 * - SearchAndSummarizeInput - The input type for the searchAndSummarize function.
 * - SearchAndSummarizeOutput - The output type for the searchAndSummarize function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SYSTEM_INSTRUCTIONS } from '@/ai/prompts/chat-system-instructions';

const ChatMessageSchema = z.object({
  sender: z.enum(["user", "bot"]),
  text: z.string(),
  imageUrl: z.string().optional().describe('A data URI of an image sent in the chat message, if any.'),
});
export type AiChatMessage = z.infer<typeof ChatMessageSchema>;

const SearchAndSummarizeInputSchema = z.object({
  query: z.union([
    z.string().describe('A standard text query from the user.'),
    z.object({
      text: z.string().optional().describe('Optional text accompanying the image.'),
      imageUrl: z.string().describe("A data URI of an image uploaded by the user for the current query. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
    }).describe('An image query from the user, with optional accompanying text.')
  ]).describe('The current query from the user, which can be text or an image with optional text.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history to provide context. The last message in history is the current query by the user if not empty.'),
  temperature: z.number().min(0).max(1).optional().describe('Optional temperature setting for the AI model. Controls randomness. (0.0-1.0)'),
  customSystemInstructions: z.string().optional().describe('Optional custom system instructions to override the default behavior.'),
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
    description: "Generates a NEW image based on a textual prompt. You MUST use this tool when the user explicitly asks to create/draw/generate a NEW image, OR when a NEW image would visually enhance a textual answer about a suitable subject (and the user has NOT uploaded their own image for the current turn). If this tool is used successfully, your final JSON output MUST include the 'imageUrl' field. DO NOT use this tool if the user has uploaded their own image in the current turn and is asking about that uploaded image, unless they specifically ask you to *modify* or *generate a new version* of their image.",
    inputSchema: z.object({
      imagePrompt: z.string().describe('A detailed description of the NEW image to be generated.'),
    }),
    outputSchema: z.object({
      imageUrl: z.string().describe('The data URI of the generated image.'),
    }),
  },
  async (input) => { 
    console.log(`Generating image with prompt: ${input.imagePrompt}`);
    const imageResult = await ai.generate({
      prompt: input.imagePrompt,
      model: 'googleai/gemini-2.0-flash-exp',
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
    
    const MIN_IMAGE_DATA_URL_LENGTH = 500; 
    if (imageResult.media.url.startsWith('data:image/') && imageResult.media.url.length < MIN_IMAGE_DATA_URL_LENGTH) {
        console.warn(`Image generation returned a very small image (length: ${imageResult.media.url.length}). Treating as failure. Prompt: ${input.imagePrompt}`);
        throw new Error('Image generation failed: Model returned a minimal or placeholder image.');
    }
    return { imageUrl: imageResult.media.url };
  }
);

const searchAndSummarizePrompt = ai.definePrompt({
  name: 'searchAndSummarizePrompt',
  input: {schema: SearchAndSummarizeInputSchema}, 
  output: {schema: SearchAndSummarizeOutputSchema},
  tools: [internetSearchTool, generateImageTool],
  prompt: (input: SearchAndSummarizeInput): Array<any> => { 
    const systemInstructionsToUse = (input.customSystemInstructions && input.customSystemInstructions.trim() !== "")
      ? input.customSystemInstructions
      : SYSTEM_INSTRUCTIONS;

    const historyMessages = (input.history || [])
      .map(h => `${h.sender}: ${h.text || ''}${h.imageUrl ? ' (User sent an image attachment)' : ''}`)
      .join('\n') || 'No conversation history provided.';

    let latestQuerySection = "User's LATEST Question/Request: ";
    if (typeof input.query === 'string') {
      latestQuerySection += `"${input.query}"`;
    } else { 
      if (input.query.text) {
        latestQuerySection += `"${input.query.text}" `;
      }
      latestQuerySection += `{{media url=query.imageUrl}} (User uploaded this image)`;
    }

    return [{
      text:
`${systemInstructionsToUse}

Conversation History (if any, most recent messages last):
${historyMessages}

${latestQuerySection}

Assistant's Response (Remember to structure as a valid JSON object with a "summary" string (in the detected language), and optionally "imageUrl" string, following all rules above):`
    }];
  },
  config: (input: SearchAndSummarizeInput) => { 
    const configOptions: { temperature?: number; safetySettings?: any[] } = {};
    if (input.temperature !== undefined) {
      configOptions.temperature = input.temperature;
    }
    configOptions.safetySettings = [ 
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ];
    return configOptions;
  },
});

const searchAndSummarizeFlow = ai.defineFlow(
  {
    name: 'searchAndSummarizeFlow',
    inputSchema: SearchAndSummarizeInputSchema,
    outputSchema: SearchAndSummarizeOutputSchema,
  },
  async (input: SearchAndSummarizeInput): Promise<SearchAndSummarizeOutput> => {
    try {
      const promptResponse = await searchAndSummarizePrompt(input);

      if (promptResponse && promptResponse.output && typeof promptResponse.output.summary === 'string') {
        if (promptResponse.output.summary.trim() === "") {
            console.warn("SearchAndSummarizeFlow: Prompt returned an empty summary. Falling back to default.");
            return { summary: "I received an empty response from the AI. Could you try rephrasing your question?" };
        }
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
      return { summary: "An unexpected error occurred while trying to get a response. Please try again or rephrase your request." };
    }
  }
);
