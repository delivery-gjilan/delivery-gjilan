'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { GET_PROMOTIONS } from '@/graphql/operations/promotions/queries';
import { DELETE_PROMOTION } from '@/graphql/operations/promotions/mutations';
import { GetPromotionsQuery } from '@/gql/graphql';

export default function PromotionsPage() {
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  const { data, loading, error, refetch } = useQuery(GET_PROMOTIONS, {
    variables: { isActive },
  });

  const [deletePromotion] = useMutation(DELETE_PROMOTION, {
    onCompleted: () => refetch(),
  });

  const promotions = data?.getAllPromotions || [];

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    await deletePromotion({ variables: { id } });
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Promotions</h1>
        <Link href="/admin/promos/create">
          <Button>Create</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button 
          variant={isActive === undefined ? 'default' : 'outline'}
          onClick={() => setIsActive(undefined)}
        >
          All
        </Button>
        <Button 
          variant={isActive === true ? 'default' : 'outline'}
          onClick={() => setIsActive(true)}
        >
          Active
        </Button>
        <Button 
          variant={isActive === false ? 'default' : 'outline'}
          onClick={() => setIsActive(false)}
        >
          Inactive
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {promotions.map((promo: NonNullable<GetPromotionsQuery['getAllPromotions']>[number]) => (
            <TableRow key={promo.id}>
              <TableCell className="font-medium">{promo.code || 'Auto'}</TableCell>
              <TableCell>{promo.name}</TableCell>
              <TableCell>
                {promo.type === 'PERCENTAGE'
                  ? `${promo.discountValue}%`
                  : `€${promo.discountValue}`}
              </TableCell>
              <TableCell>
                <Badge variant={promo.isActive ? 'default' : 'secondary'}>
                  {promo.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
