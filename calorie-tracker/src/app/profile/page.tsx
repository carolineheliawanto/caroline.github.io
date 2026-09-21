import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/ProfileForm';
import { Nav } from '@/components/Nav';

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) redirect('/onboarding');

  const initial = {
    gender: profile.gender as 'male' | 'female',
    birthDate: profile.birthDate.toISOString().slice(0, 10),
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel as
      | 'sedentary'
      | 'light'
      | 'moderate'
      | 'active'
      | 'very_active',
    goalPaceKg: profile.goalPaceKg,
    units: profile.units as 'metric' | 'imperial',
  };

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Your profile</h1>
        <p className="mb-6 text-sm text-gray-500">Update your details and your target recalculates.</p>
        <ProfileForm mode="edit" initial={initial} />
      </div>
      <Nav />
    </div>
  );
}
