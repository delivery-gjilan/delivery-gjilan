'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { PromotionForm } from '../../PromotionForm';
import { GET_PROMOTION } from '@/graphql/operations/promotions/queries';

export default function EditPromotionPage({ params }: { params: { id: string } }) {
    const { data, loading, error } = useQuery(GET_PROMOTION, {
        variables: { id: params.id },
    });

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    const promotion = data?.getPromotion;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Edit Promotion</h1>
                <p className="text-gray-600 mt-2">{promotion?.name}</p>
            </div>
            {promotion && <PromotionForm initialData={promotion} isEdit={true} />}
        </div>
    );
}
