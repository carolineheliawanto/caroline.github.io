import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const MODEL = 'claude-sonnet-5';

export const FoodItemSchema = z.object({
  name: z.string(),
  portion: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const FoodAnalysisSchema = z.object({
  items: z.array(FoodItemSchema),
  total_calories: z.number(),
  notes: z.string(),
});

export type FoodAnalysisResult = z.infer<typeof FoodAnalysisSchema>;

const SYSTEM_PROMPT = `You are a nutrition estimation assistant embedded in a calorie-tracking app. \
A user has uploaded a photo of a meal. Identify each distinct food item visible, estimate its \
portion size, and estimate calories and macronutrients (protein, carbs, fat in grams) for that portion.

The user may often be eating Indonesian or other Asian dishes (e.g. nasi goreng, rendang, soto, \
gado-gado, sate, bakso, mie goreng, nasi padang, ayam geprek), so pay close attention to identifying \
these accurately and estimating realistic portion sizes and calorie counts for them, including rice, \
oil, and sauce/coconut milk content which is often underestimated.

If the image does not contain food (e.g. it's a person, a receipt, a blank wall, or unclear), return \
an empty "items" array, "total_calories": 0, and explain briefly in "notes" why nothing could be identified.

Respond with STRICT JSON only, no markdown code fences, no commentary before or after, matching exactly \
this shape:
{
  "items": [
    { "name": string, "portion": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "low" | "medium" | "high" }
  ],
  "total_calories": number,
  "notes": string
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  const candidate = start !== -1 && end !== -1 ? withoutFences.slice(start, end + 1) : withoutFences;
  return JSON.parse(candidate);
}

async function callClaude(
  client: Anthropic,
  imageBase64: string,
  mediaType: string,
  retryHint?: string
): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: retryHint
              ? `Analyze this meal photo and respond with STRICT JSON only. ${retryHint}`
              : 'Analyze this meal photo and respond with STRICT JSON only, matching the required shape exactly.',
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from model');
  }
  return textBlock.text;
}

export class FoodAnalysisError extends Error {}

export async function analyzeFoodPhoto(
  imageBase64: string,
  mediaType: string
): Promise<FoodAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new FoodAnalysisError('ANTHROPIC_API_KEY is not configured on the server.');
  }

  const client = new Anthropic({ apiKey });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude(
        client,
        imageBase64,
        mediaType,
        attempt > 0
          ? 'Your previous response could not be parsed as valid JSON matching the required schema. Return ONLY the JSON object, with no extra text.'
          : undefined
      );
      const parsed = extractJson(raw);
      const result = FoodAnalysisSchema.parse(parsed);
      return result;
    } catch (err) {
      lastError = err;
    }
  }

  throw new FoodAnalysisError(
    lastError instanceof Error
      ? `Could not analyze the photo: ${lastError.message}`
      : 'Could not analyze the photo.'
  );
}
