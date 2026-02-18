import React, { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const GET_ALL_PROMOTIONS = gql`
    query GetAllPromotions($isActive: Boolean) {
        getAllPromotions(isActive: $isActive) {
            id
            code
            name
            type
            target
            isActive
            discountValue
            startDate: startsAt
            endDate: endsAt
            maxGlobalUsage
            currentGlobalUsage
            totalUsageCount
            totalRevenue
        }
    }
`;

const DELETE_PROMOTION = gql`
    mutation DeletePromotion($id: ID!) {
        deletePromotion(id: $id)
    }
`;

export default function PromotionsPage() {
    const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
    const { data, loading, error, refetch } = useQuery(GET_ALL_PROMOTIONS, {
        variables: { isActive },
    });
    const [deletePromotion] = useMutation(DELETE_PROMOTION, {
        onCompleted: async () => {
            await refetch();
        },
    });

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this promotion?')) {
            await deletePromotion({ variables: { id } });
        }
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            FIXED_AMOUNT: 'bg-blue-100 text-blue-800',
            PERCENTAGE: 'bg-green-100 text-green-800',
            FREE_DELIVERY: 'bg-purple-100 text-purple-800',
            WALLET_CREDIT: 'bg-yellow-100 text-yellow-800',
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    if (loading) return <div className="p-6">Loading promotions...</div>;
    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    const promotions = data?.getAllPromotions || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Promotions</h1>
                    <p className="text-gray-600 mt-2">{promotions.length} total promotions</p>
                </div>
                <Link href="/admin/promos/create">
                    <Button>+ Create Promotion</Button>
                </Link>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setIsActive(undefined)}
                    className={`px-4 py-2 rounded ${isActive === undefined ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setIsActive(true)}
                    className={`px-4 py-2 rounded ${isActive === true ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    Active
                </button>
                <button
                    onClick={() => setIsActive(false)}
                    className={`px-4 py-2 rounded ${isActive === false ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    Inactive
                </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {promotions.map((promo: any) => (
                            <TableRow key={promo.id}>
                                <TableCell className="font-mono">{promo.code || 'Auto'}</TableCell>
                                <TableCell>{promo.name}</TableCell>
                                <TableCell>
                                    <Badge className={getTypeColor(promo.type)}>
                                        {promo.type}
                                    </Badge>
                                </TableCell>
                                <TableCell>{promo.target}</TableCell>
                                <TableCell>
                                    {promo.type === 'PERCENTAGE' ? `${promo.discountValue}%` : `€${promo.discountValue}`}
                                </TableCell>
                                <TableCell>
                                    {promo.currentGlobalUsage}/{promo.maxGlobalUsage || '∞'}
                                </TableCell>
                                <TableCell>€{(promo.totalRevenue || 0).toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant={promo.isActive ? 'default' : 'outline'}>
                                        {promo.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="space-x-2">
                                    <Link href={`/admin/promos/${promo.id}/edit`}>
                                        <Button size="sm" variant="outline">Edit</Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(promo.id)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
