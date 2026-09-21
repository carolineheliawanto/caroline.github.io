import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function RootPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect('/login');
  }

  const profile = await prisma.profile.findUnique({ where: { userId } });

  if (!profile) {
    redirect('/onboarding');
  }

  redirect('/today');
}
