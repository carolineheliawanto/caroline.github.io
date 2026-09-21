import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';

const FoodItemInputSchema = z.object({
  name: z.string().min(1),
  portion: z.string().optional(),
  calories: z.number().min(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatG: z.number().min(0).default(0),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  source: z.enum(['ai', 'manual']),
});

const FoodLogInputSchema = z.object({
  date: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  photoUrl: z.string().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(FoodItemInputSchema).min(1),
});

function dayRange(dateStr: string) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const { start, end } = dayRange(dateStr);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = FoodLogInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const log = await prisma.foodLog.create({
    data: {
      userId,
      date,
      mealType: data.mealType,
      photoUrl: data.photoUrl ?? null,
      notes: data.notes ?? null,
      items: {
        create: data.items.map((item) => ({
          name: item.name,
          portion: item.portion ?? null,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          confidence: item.confidence ?? null,
          source: item.source,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ log }, { status: 201 });
}
