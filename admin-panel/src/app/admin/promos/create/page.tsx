'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function CreatePromotionPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Create New Promotion</h1>
                <p className="text-gray-600 mt-2">The promotion form was moved to the dashboard modal.</p>
            </div>
            <Link href="/dashboard/promotions">
                <Button>Open Promotions Dashboard</Button>
            </Link>
        </div>
    );
}
