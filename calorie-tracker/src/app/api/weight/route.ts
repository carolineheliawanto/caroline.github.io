import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';

const WeightEntrySchema = z.object({
  date: z.string(),
  weightKg: z.number().positive(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entries = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ entries });
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

  const parsed = WeightEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existingForDay = await prisma.weightEntry.findFirst({
    where: { userId, date: { gte: dayStart, lt: dayEnd } },
  });

  const entry = existingForDay
    ? await prisma.weightEntry.update({
        where: { id: existingForDay.id },
        data: { weightKg: parsed.data.weightKg },
      })
    : await prisma.weightEntry.create({
        data: { userId, date, weightKg: parsed.data.weightKg },
      });

  // If this is the most recent entry, keep the profile's current weight in
  // sync so TDEE/calorie target recalculates automatically.
  const latest = await prisma.weightEntry.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (latest && latest.id === entry.id && profile) {
    profile = await prisma.profile.update({
      where: { userId },
      data: { currentWeightKg: entry.weightKg },
    });
  }

  return NextResponse.json({ entry, profile });
}
