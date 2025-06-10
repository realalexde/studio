
'use server';

/**
 * @fileOverview Image generation flow.
 * Can generate an image directly from a prompt, or enhance the user's prompt
 * first for more detailed image generation before creating the image.
 *
 * - generateEnhancedImage - A function that generates an image based on a text prompt, with an option for prompt enhancement.
 * - GenerateEnhancedImageInput - The input type for the generateEnhancedImage function.
 * - GenerateEnhancedImageOutput - The return type for the generateEnhancedImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEnhancedImageInputSchema = z.object({
  prompt: z.string().describe('The prompt for generating the image.'),
  enhance: z.boolean().optional().describe('Whether to first enhance the prompt for more detailed image generation. Defaults to false.'),
});
export type GenerateEnhancedImageInput = z.infer<typeof GenerateEnhancedImageInputSchema>;

const GenerateEnhancedImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateEnhancedImageOutput = z.infer<typeof GenerateEnhancedImageOutputSchema>;

export async function generateEnhancedImage(input: GenerateEnhancedImageInput): Promise<GenerateEnhancedImageOutput> {
  return generateEnhancedImageFlow(input);
}

const EnhanceUserPromptInputSchema = z.object({
  originalPrompt: z.string().describe('The user\'s original, potentially brief, prompt for image generation.'),
});

const EnhanceUserPromptOutputSchema = z.object({
  enhancedPrompt: z.string().describe('A highly detailed and descriptive prompt, expanded from the user\'s original prompt, suitable for high-quality image generation.'),
});

const enhanceUserPromptPrompt = ai.definePrompt({
  name: 'enhanceUserPromptPrompt',
  input: { schema: EnhanceUserPromptInputSchema },
  output: { schema: EnhanceUserPromptOutputSchema },
  prompt: `You are Moonlight, an AI assistant from Nexus, specializing in crafting highly detailed image generation prompts.
The user has provided the following initial prompt:
"{{{originalPrompt}}}"

Your task is to expand this user's prompt into a much more detailed and descriptive prompt. This enhanced prompt will be fed into an advanced AI image generation model.
Focus on elaborating and adding details related to:
- **Visual Style:** (e.g., photorealistic, oil painting, watercolor, 3D render, pixel art, anime, cyberpunk, fantasy, art deco, impressionistic, etc.)
- **Subject Details:** (Describe the main subject(s) with specificity. Include features, colors, textures, clothing, expressions, poses, and any important characteristics.)
- **Setting/Background:** (Describe the environment. Is it indoors, outdoors, abstract? What are the key elements of the background? Time of day?)
- **Composition & Framing:** (e.g., close-up, portrait, landscape, wide shot, worms-eye view, bird's-eye view, rule of thirds, symmetrical, dynamic angle.)
- **Lighting:** (e.g., soft lighting, dramatic cinematic lighting, studio lighting, volumetric lighting, neon glow, golden hour, moody, bright and airy.)
- **Color Palette:** (e.g., vibrant, monochrome, pastel, sepia, cool tones, warm tones, specific color combinations.)
- **Artistic Elements & Mood:** (e.g., influence of specific artists, specific textures, overall mood like serene, chaotic, joyful, mysterious, epic.)
- **Level of Detail:** (e.g., intricate details, hyperrealistic, stylized.)
- **Negative Prompts (Optional but helpful):** Briefly mention what to avoid if it's critical (e.g., "no text", "avoid blurry").

The final enhanced prompt should be a rich paragraph or a series of descriptive phrases.
Return ONLY the enhanced prompt text itself. Do not include any conversational lead-in, explanations, or markdown formatting.

Enhanced Prompt:`,
});


const generateEnhancedImageFlow = ai.defineFlow(
  {
    name: 'generateEnhancedImageFlow',
    inputSchema: GenerateEnhancedImageInputSchema,
    outputSchema: GenerateEnhancedImageOutputSchema,
  },
  async (input: GenerateEnhancedImageInput) => {
    let finalPrompt = input.prompt;

    if (input.enhance) {
      const { output: enhancedPromptResult } = await enhanceUserPromptPrompt({ originalPrompt: input.prompt });
      if (!enhancedPromptResult?.enhancedPrompt) {
        console.warn("Prompt enhancement failed, using original prompt.");
        // Potentially throw an error or use original prompt as fallback
      } else {
        finalPrompt = enhancedPromptResult.enhancedPrompt;
        console.log("Using enhanced prompt:", finalPrompt);
      }
    }

    const imageResult = await ai.generate({
      prompt: finalPrompt,
      model: 'googleai/gemini-2.0-flash-exp',
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
         safetySettings: [ // Added safety settings to be less restrictive for creative content
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });

    if (!imageResult.media?.url) {
      throw new Error('Failed to generate image. The model did not return an image URL.');
    }

    return {imageUrl: imageResult.media.url};
  }
);

