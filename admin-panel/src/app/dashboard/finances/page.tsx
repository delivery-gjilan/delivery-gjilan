'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function FinancesRedirectPage() {
    const router = useRouter();
    const { admin, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        const role = admin?.role;
        if (role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE') {
            router.replace('/dashboard/business-settlements');
            return;
        }

        if (role === 'SUPER_ADMIN') {
            router.replace('/admin/financial/settlements');
            return;
        }

        router.replace('/dashboard');
    }, [admin?.role, loading, router]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center text-zinc-500">
            Redirecting...
        </div>
    );
}
