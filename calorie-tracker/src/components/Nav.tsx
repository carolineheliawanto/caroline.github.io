'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const TABS = [
  { href: '/today', label: 'Today', icon: '🍽️' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/profile', label: 'Profile', icon: '⚙️' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active ? 'text-brand-700' : 'text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-gray-400"
        >
          <span className="text-lg leading-none">🚪</span>
          Log out
        </button>
      </div>
    </nav>
  );
}
