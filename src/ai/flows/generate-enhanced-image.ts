
'use server';

/**
 * @fileOverview Image generation flow. Can generate a base image or an enhanced image using a two-step process.
 *
 * - generateEnhancedImage - A function that generates an image based on a text prompt, with an option for enhancement.
 * - GenerateEnhancedImageInput - The input type for the generateEnhancedImage function.
 * - GenerateEnhancedImageOutput - The return type for the generateEnhancedImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEnhancedImageInputSchema = z.object({
  prompt: z.string().describe('The prompt for generating the image.'),
  enhance: z.boolean().optional().describe('Whether to apply a second enhancement pass to the image. Defaults to false.'),
});
export type GenerateEnhancedImageInput = z.infer<typeof GenerateEnhancedImageInputSchema>;

const GenerateEnhancedImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateEnhancedImageOutput = z.infer<typeof GenerateEnhancedImageOutputSchema>;

export async function generateEnhancedImage(input: GenerateEnhancedImageInput): Promise<GenerateEnhancedImageOutput> {
  return generateEnhancedImageFlow(input);
}

// These prompt definitions are not directly used by the flow below,
// but are kept for potential future use or direct invocation.
const refineImagePrompt = ai.definePrompt({
  name: 'refineImagePrompt',
  input: {schema: z.object({baseImage: z.string().describe('Base64 encoded image'), prompt: z.string()})},
  output: {schema: z.object({imageUrl: z.string()})},
  prompt: [
    {media: {url: '{{{baseImage}}}'}},
    {text: 'Refine the details and improve the overall quality of this image based on the following prompt: {{{prompt}}}. Focus on photorealism, intricate textures, and dynamic lighting.'},
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

const generateBaseImagePrompt = ai.definePrompt({
  name: 'generateBaseImagePrompt',
  input: {schema: GenerateEnhancedImageInputSchema}, // Note: this schema includes `enhance` but it's not used by this specific prompt directly
  output: {schema: z.object({imageUrl: z.string()})},
  prompt: 'Generate an image based on the following prompt: {{{prompt}}}.',
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

const generateEnhancedImageFlow = ai.defineFlow(
  {
    name: 'generateEnhancedImageFlow',
    inputSchema: GenerateEnhancedImageInputSchema,
    outputSchema: GenerateEnhancedImageOutputSchema,
  },
  async (input: GenerateEnhancedImageInput) => {
    // Generate initial image
    const baseImageResult = await ai.generate({
      prompt: input.prompt,
      model: 'googleai/gemini-2.0-flash-exp',
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!baseImageResult.media?.url) {
      throw new Error('Failed to generate base image.');
    }

    if (input.enhance) {
      // Refine the image
      const refinedImageResult = await ai.generate({
        prompt: [
          {media: {url: baseImageResult.media.url}},
          {text: `Refine the details and improve the overall quality of this image based on the following prompt: ${input.prompt}. Focus on photorealism, intricate textures, and dynamic lighting.`},
        ],
        model: 'googleai/gemini-2.0-flash-exp',
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!refinedImageResult.media?.url) {
        throw new Error('Failed to generate refined image.');
      }
      return {imageUrl: refinedImageResult.media.url};
    } else {
      // If not enhancing, return the base image
      return {imageUrl: baseImageResult.media.url};
    }
  }
);

