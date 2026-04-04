'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_ALL_BUSINESSES_FOR_FEATURED } from '@/graphql/operations/businesses/queries';
import { SET_BUSINESS_FEATURED } from '@/graphql/operations/businesses/mutations';
import { toast } from 'sonner';
import { Star, StarOff, GripVertical, Store } from 'lucide-react';

interface BusinessRow {
  id: string;
  name: string;
  imageUrl?: string | null;
  businessType: string;
  isActive: boolean;
  isFeatured: boolean;
  featuredSortOrder: number;
}

export default function FeaturedBusinessesPage() {
  const { data, loading, error } = useQuery(GET_ALL_BUSINESSES_FOR_FEATURED, {
    fetchPolicy: 'cache-and-network',
  });

  const [setBusinessFeatured, { loading: saving }] = useMutation(SET_BUSINESS_FEATURED, {
    onCompleted: () => toast.success('Featured status updated'),
    onError: (e) => toast.error(e.message),
    // Write the updated isFeatured / featuredSortOrder directly into the cached
    // businesses list so the UI reflects the change immediately without a refetch.
    update(cache, { data: mutationData }) {
      const updated = (mutationData as any)?.setBusinessFeatured;
      if (!updated) return;
      cache.modify({
        id: cache.identify({ __typename: 'Business', id: updated.id }),
        fields: {
          isFeatured: () => updated.isFeatured,
          featuredSortOrder: () => updated.featuredSortOrder,
        },
      });
    },
  });

  const [sortOrderEdits, setSortOrderEdits] = useState<Record<string, string>>({});

  const businesses: BusinessRow[] = (data as any)?.businesses ?? [];

  const featured = [...businesses]
    .filter((b) => b.isFeatured)
    .sort((a, b) => a.featuredSortOrder - b.featuredSortOrder);

  const notFeatured = businesses.filter((b) => !b.isFeatured);

  const handleToggle = async (biz: BusinessRow) => {
    const currentOrder = sortOrderEdits[biz.id];
    const sortOrder = currentOrder !== undefined ? parseInt(currentOrder, 10) : biz.featuredSortOrder;
    await setBusinessFeatured({
      variables: {
        id: biz.id,
        isFeatured: !biz.isFeatured,
        sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
      },
    });
  };

  const handleSortOrderSave = async (biz: BusinessRow) => {
    const raw = sortOrderEdits[biz.id];
    if (raw === undefined) return;
    const sortOrder = parseInt(raw, 10);
    await setBusinessFeatured({
      variables: { id: biz.id, isFeatured: true, sortOrder: isNaN(sortOrder) ? 0 : sortOrder },
    });
    setSortOrderEdits((prev) => { const n = { ...prev }; delete n[biz.id]; return n; });
  };

  if (loading) return <div className="p-6 text-white">Loading…</div>;
  if (error) return <div className="p-6 text-red-500">{error.message}</div>;

  const BusinessCard = ({ biz, showOrder }: { biz: BusinessRow; showOrder: boolean }) => (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {biz.imageUrl ? (
          <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store size={20} className="text-white/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{biz.name}</p>
        <p className="text-white/50 text-sm">{biz.businessType}</p>
      </div>

      {/* Sort order (only for featured) */}
      {showOrder && (
        <div className="flex items-center gap-2">
          <GripVertical size={16} className="text-white/30" />
          <input
            type="number"
                className="w-16 text-center bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-yellow-500"
            value={sortOrderEdits[biz.id] ?? biz.featuredSortOrder}
            onChange={(e) => setSortOrderEdits((prev) => ({ ...prev, [biz.id]: e.target.value }))}
            onBlur={() => handleSortOrderSave(biz)}
            onKeyDown={(e) => e.key === 'Enter' && handleSortOrderSave(biz)}
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        disabled={saving}
        onClick={() => handleToggle(biz)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
          biz.isFeatured
            ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50 hover:bg-red-600/30 hover:text-red-300 hover:border-red-600/50'
            : 'bg-white/10 text-white/60 border border-white/20 hover:bg-yellow-600/30 hover:text-yellow-300 hover:border-yellow-600/50'
        }`}
      >
        {biz.isFeatured ? (
          <><StarOff size={14} /> Remove</>
        ) : (
          <><Star size={14} /> Feature</>
        )}
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Featured Businesses</h1>
        <p className="text-white/50 mt-1 text-sm">
          Manage which businesses appear in the "Featured on Zipp" section on the home screen. 
          Adjust the sort order number to control display position (lower = first).
        </p>
      </div>

      {/* Featured list */}
      <section>
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Star size={14} className="text-yellow-400" />
          Currently Featured ({featured.length})
        </h2>
        {featured.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center border border-dashed border-white/10 rounded-xl">
            No featured businesses yet. Add some below.
          </p>
        ) : (
          <div className="space-y-2">
            {featured.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} showOrder />
            ))}
          </div>
        )}
      </section>

      {/* All others */}
      <section>
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">
          Not Featured ({notFeatured.length})
        </h2>
        <div className="space-y-2">
          {notFeatured.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} showOrder={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
