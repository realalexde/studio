import { config } from 'dotenv';
config();

import '@/ai/flows/generate-code-project.ts';
import '@/ai/flows/search-and-summarize.ts'; // Re-added search and summarize
import '@/ai/flows/generate-enhanced-image.ts';
// import '@/ai/flows/generate-enhanced-response.ts'; // Replaced by search-and-summarize for chat
