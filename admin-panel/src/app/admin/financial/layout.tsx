'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DollarSign, Scale, Tag, TrendingUp } from 'lucide-react';

const tabs = [
  { name: 'Settlements', href: '/admin/financial/settlements', icon: DollarSign },
  { name: 'Settlement Rules', href: '/admin/financial/rules', icon: Scale },
  { name: 'Product Pricing', href: '/admin/financial/pricing', icon: Tag },
  { name: 'Dynamic Pricing', href: '/admin/financial/dynamic-pricing', icon: TrendingUp },
];

export default function FinancialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex space-x-1 px-6">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'group inline-flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-all',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
