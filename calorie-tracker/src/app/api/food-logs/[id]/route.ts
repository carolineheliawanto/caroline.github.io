import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';

const FoodItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  portion: z.string().optional(),
  calories: z.number().min(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatG: z.number().min(0).default(0),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  source: z.enum(['ai', 'manual']),
});

const FoodLogUpdateSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  items: z.array(FoodItemInputSchema).min(1),
});

async function assertOwnership(id: string, userId: string) {
  const log = await prisma.foodLog.findUnique({ where: { id } });
  return log && log.userId === userId ? log : null;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await assertOwnership(params.id, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = FoodLogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Replace items wholesale to keep edit logic simple and consistent.
  await prisma.$transaction([
    prisma.foodItem.deleteMany({ where: { foodLogId: params.id } }),
    prisma.foodLog.update({
      where: { id: params.id },
      data: {
        mealType: data.mealType ?? existing.mealType,
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
    }),
  ]);

  const updated = await prisma.foodLog.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  return NextResponse.json({ log: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await assertOwnership(params.id, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.foodLog.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
