import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/ProfileForm';

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) redirect('/today');

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Let&apos;s set up your goal</h1>
      <p className="mb-6 text-sm text-gray-500">
        We&apos;ll use this to calculate your personalised daily calorie target.
      </p>
      <ProfileForm mode="create" />
    </div>
  );
}
