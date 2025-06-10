// 'use server';

/**
 * @fileOverview Enhanced image generation flow using a two-step process.
 *
 * - generateEnhancedImage - A function that generates an enhanced image based on a text prompt.
 * - GenerateEnhancedImageInput - The input type for the generateEnhancedImage function.
 * - GenerateEnhancedImageOutput - The return type for the generateEnhancedImage function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEnhancedImageInputSchema = z.object({
  prompt: z.string().describe('The prompt for generating the image.'),
});
export type GenerateEnhancedImageInput = z.infer<typeof GenerateEnhancedImageInputSchema>;

const GenerateEnhancedImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateEnhancedImageOutput = z.infer<typeof GenerateEnhancedImageOutputSchema>;

export async function generateEnhancedImage(input: GenerateEnhancedImageInput): Promise<GenerateEnhancedImageOutput> {
  return generateEnhancedImageFlow(input);
}

const refineImagePrompt = ai.definePrompt({
  name: 'refineImagePrompt',
  input: {schema: z.object({baseImage: z.string().describe('Base64 encoded image'), prompt: z.string()})},
  output: {schema: z.object({imageUrl: z.string()})},
  prompt: [
    {media: {url: '{{{baseImage}}}'}},
    {text: 'Refine the details and improve the overall quality of this image based on the following prompt: {{{prompt}}}.'},
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

const generateBaseImagePrompt = ai.definePrompt({
  name: 'generateBaseImagePrompt',
  input: {schema: GenerateEnhancedImageInputSchema},
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
  async input => {
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

    // Refine the image
    const refinedImageResult = await ai.generate({
      prompt: [
        {media: {url: baseImageResult.media.url}},
        {text: `Refine the details and improve the overall quality of this image based on the following prompt: ${input.prompt}.`},
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
  }
);
