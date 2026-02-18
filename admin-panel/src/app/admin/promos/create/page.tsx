'use client';

import React from 'react';
import { PromotionForm } from '../PromotionForm';

export default function CreatePromotionPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Create New Promotion</h1>
                <p className="text-gray-600 mt-2">Set up a new promotion campaign</p>
            </div>
            <PromotionForm />
        </div>
    );
}
