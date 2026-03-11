'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FinancialPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/financial/settlements');
  }, [router]);

  return null;
}
