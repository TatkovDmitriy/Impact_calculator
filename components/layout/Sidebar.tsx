'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calculator, BookOpen, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/calculators', label: 'Калькуляторы', icon: Calculator },
  { href: '/scenarios', label: 'Сценарии', icon: BookOpen },
  { href: '/dev-check', label: 'Dev Check', icon: Activity, devOnly: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-lp-border bg-white lg:flex lg:flex-col">
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const devOnly = 'devOnly' in rest ? rest.devOnly : false;
          if (devOnly && process.env.NODE_ENV === 'production') return null;
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-lp-yellow bg-lp-yellow/10 text-lp-dark'
                  : 'text-lp-text-muted hover:bg-lp-muted hover:text-lp-dark'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
