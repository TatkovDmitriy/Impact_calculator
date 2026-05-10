'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/calculators', label: 'Калькуляторы' },
  { href: '/scenarios', label: 'Сценарии' },
  { href: '/research', label: 'Исследования' },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-lp-border bg-white px-6 shadow-sm">
      <div className="flex flex-1 items-center gap-10">
        <Logo width={110} height={28} />

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-lp-yellow/20 text-lp-dark'
                    : 'text-lp-text-muted hover:bg-lp-muted hover:text-lp-dark'
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
