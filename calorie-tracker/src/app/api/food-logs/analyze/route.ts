import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/session';
import { analyzeFoodPhoto, FoodAnalysisError } from '@/lib/food-analysis';

const AnalyzeSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const MAX_BASE64_BYTES = 8 * 1024 * 1024; // ~8MB base64 (~6MB binary), generous after client-side compression

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Photo analysis is not configured. Add ANTHROPIC_API_KEY to your server environment.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  if (parsed.data.imageBase64.length > MAX_BASE64_BYTES) {
    return NextResponse.json({ error: 'Image is too large. Please try a smaller photo.' }, { status: 413 });
  }

  try {
    const result = await analyzeFoodPhoto(parsed.data.imageBase64, parsed.data.mediaType);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FoodAnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'Unexpected error analyzing photo' }, { status: 500 });
  }
}
