'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function EditPromotionPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Edit Promotion</h1>
                <p className="text-gray-600 mt-2">Promotion editing is available in the dashboard modal.</p>
            </div>
            <Link href="/dashboard/promotions">
                <Button>Open Promotions Dashboard</Button>
            </Link>
        </div>
    );
}
