import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      currentGlobalUsage
      maxGlobalUsage
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
        <Button onClick={() => setIsActive(undefined)}>All</Button>
        <Button onClick={() => setIsActive(true)}>Active</Button>
        <Button onClick={() => setIsActive(false)}>Inactive</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {promotions.map((promo: any) => (
            <TableRow key={promo.id}>
              <TableCell>{promo.code || 'Auto'}</TableCell>
              <TableCell>{promo.name}</TableCell>
              <TableCell>
                {promo.type === 'PERCENTAGE'
                  ? `${promo.discountValue}%`
                  : `€${promo.discountValue}`}
              </TableCell>
              <TableCell>
                <Badge>{promo.isActive ? 'Active' : 'Inactive'}</Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/promos/${promo.id}/edit`}>
                  <Button size="sm">Edit</Button>
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
  );
}
