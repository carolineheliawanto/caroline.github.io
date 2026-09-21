import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { computeTargetForProfile } from '@/lib/profile-calc';

const ProfileSchema = z.object({
  gender: z.enum(['male', 'female']),
  birthDate: z.string(), // ISO date string
  heightCm: z.number().positive(),
  currentWeightKg: z.number().positive(),
  targetWeightKg: z.number().positive(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goalPaceKg: z.number().min(0),
  units: z.enum(['metric', 'imperial']),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ profile: null, target: null });

  const target = computeTargetForProfile(profile);
  return NextResponse.json({ profile, target });
}

async function upsertProfile(userId: string, request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const birthDate = new Date(data.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 });
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      gender: data.gender,
      birthDate,
      heightCm: data.heightCm,
      currentWeightKg: data.currentWeightKg,
      targetWeightKg: data.targetWeightKg,
      activityLevel: data.activityLevel,
      goalPaceKg: data.goalPaceKg,
      units: data.units,
    },
    update: {
      gender: data.gender,
      birthDate,
      heightCm: data.heightCm,
      currentWeightKg: data.currentWeightKg,
      targetWeightKg: data.targetWeightKg,
      activityLevel: data.activityLevel,
      goalPaceKg: data.goalPaceKg,
      units: data.units,
    },
  });

  // Seed/update a matching weight entry for today so the weight chart starts
  // from the profile's stated current weight.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existingToday = await prisma.weightEntry.findFirst({
    where: { userId, date: { gte: startOfToday } },
  });
  if (!existingToday) {
    await prisma.weightEntry.create({
      data: { userId, date: new Date(), weightKg: data.currentWeightKg },
    });
  }

  const target = computeTargetForProfile(profile);
  return NextResponse.json({ profile, target });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return upsertProfile(userId, request);
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return upsertProfile(userId, request);
}
