'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { graphql } from '@/gql';
import Image from 'next/image';
import { ChevronDown, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// GraphQL

const GET_BUSINESSES_SIMPLE = graphql(`
  query BusinessesForMarkup {
    businesses {
      id
      name
    }
  }
`);

const GET_PRODUCTS_FOR_MARKUP = graphql(`
  query ProductsForMarkup($businessId: ID!) {
    products(businessId: $businessId) {
      id
      name
      imageUrl
      basePrice
      variants {
        id
        name
        imageUrl
        price
        markupPrice
        nightMarkedupPrice
      }
      product {
        id
        name
        imageUrl
        price
        markupPrice
        nightMarkedupPrice
      }
    }
  }
`);

const UPDATE_PRODUCT_MARKUP = graphql(`
  mutation UpdateProductMarkup($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      markupPrice
      nightMarkedupPrice
    }
  }
`);

// Types

interface ProductRow {
  cardId: string;
  id: string;
  name: string;
  imageUrl: string | null | undefined;
  basePrice: number;
  markupPrice: number | null | undefined;
  nightMarkedupPrice: number | null | undefined;
  variantGroupName?: string;
}

// Helpers

function fmt(n: number) {
  return `€${n.toFixed(2)}`;
}

function DeltaBadge({ base, value }: { base: number; value: number | null | undefined }) {
  if (value == null || value <= 0) return <span className="text-zinc-600 text-xs">—</span>;
  const delta = value - base;
  return (
    <span className="tabular-nums text-zinc-200">
      {fmt(value)}
      {delta !== 0 && (
        <span className={`ml-1.5 text-xs font-medium ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {delta > 0 ? '+' : ''}{fmt(delta)}
        </span>
      )}
    </span>
  );
}

// Page

export default function ProductMarkupPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [markupInput, setMarkupInput] = useState('');
  const [nightInput, setNightInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [productSearch, setProductSearch] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Queries

  const { data: bizData } = useQuery(GET_BUSINESSES_SIMPLE);
  const businesses = bizData?.businesses ?? [];
  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(businessSearch.toLowerCase()),
  );
  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  const { data: productsData, loading, refetch } = useQuery(GET_PRODUCTS_FOR_MARKUP, {
    variables: { businessId: selectedBusinessId },
    skip: !selectedBusinessId,
    fetchPolicy: 'cache-and-network',
  });

  const productRows: ProductRow[] = (productsData?.products ?? []).flatMap((card) => {
    const product = card.product;
    const variants = card.variants ?? [];

    if (!product && variants.length > 0) {
      return variants.map((v) => ({
        cardId: card.id,
        id: v.id,
        name: v.name,
        imageUrl: v.imageUrl ?? card.imageUrl,
        basePrice: v.price ?? card.basePrice,
        markupPrice: v.markupPrice,
        nightMarkedupPrice: v.nightMarkedupPrice,
        variantGroupName: card.name,
      }));
    }

    if (product) {
      return [{
        cardId: card.id,
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl ?? card.imageUrl,
        basePrice: product.price ?? card.basePrice,
        markupPrice: product.markupPrice,
        nightMarkedupPrice: product.nightMarkedupPrice,
      }];
    }

    return [];
  });

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return productRows;
    const q = productSearch.toLowerCase();
    return productRows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.variantGroupName?.toLowerCase().includes(q),
    );
  }, [productRows, productSearch]);

  // Mutation

  const [updateMarkup, { loading: saving }] = useMutation(UPDATE_PRODUCT_MARKUP, {
    onCompleted: () => {
      toast.success('Prices saved');
      setIsModalOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Handlers

  function openModal(product: ProductRow) {
    setEditingProduct(product);
    setMarkupInput(product.markupPrice != null && product.markupPrice > 0 ? String(product.markupPrice) : '');
    setNightInput(product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0 ? String(product.nightMarkedupPrice) : '');
    setIsModalOpen(true);
  }

  function handleSave() {
    if (!editingProduct) return;

    const markupVal = markupInput.trim() === '' ? null : parseFloat(markupInput);
    const nightVal = nightInput.trim() === '' ? null : parseFloat(nightInput);

    if (markupVal !== null && (isNaN(markupVal) || markupVal < 0)) {
      toast.error('Invalid markup price');
      return;
    }
    if (nightVal !== null && (isNaN(nightVal) || nightVal < 0)) {
      toast.error('Invalid night price');
      return;
    }

    updateMarkup({
      variables: {
        id: editingProduct.id,
        input: {
          markupPrice: markupVal,
          nightMarkedupPrice: nightVal,
        },
      },
    });
  }

  // Derived

  const noMarkup = productRows.filter((p) => !p.markupPrice || p.markupPrice <= 0);
  const noNight = productRows.filter((p) => !p.nightMarkedupPrice || p.nightMarkedupPrice <= 0);
  const totalCount = productRows.length;

  const base = editingProduct?.basePrice ?? 0;
  const previewMarkupDelta = markupInput ? parseFloat(markupInput) - base : null;
  const previewNightDelta = nightInput ? parseFloat(nightInput) - base : null;

  // Render

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Product Pricing</h1>
      </div>

      {/* Business selector */}
      <div ref={dropdownRef} className="relative mb-4">
        <button
          onClick={() => setIsDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 hover:border-zinc-700 cursor-pointer"
        >
          <span className={selectedBusiness ? 'text-zinc-100' : 'text-zinc-500'}>
            {selectedBusiness ? selectedBusiness.name : 'Select a business...'}
          </span>
          <ChevronDown
            size={14}
            className={`text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#111113] border border-zinc-800 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  placeholder="Search businesses..."
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#09090b] border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredBusinesses.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-4">No businesses found</p>
              ) : (
                filteredBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBusinessId(b.id);
                      setIsDropdownOpen(false);
                      setBusinessSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedBusinessId === b.id
                        ? 'bg-zinc-800/80 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {selectedBusinessId && !loading && totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline">{totalCount} products</Badge>
          {noMarkup.length > 0 && (
            <Badge variant="warning">{noMarkup.length} without markup</Badge>
          )}
          {noNight.length > 0 && (
            <Badge variant="warning">{noNight.length} without night price</Badge>
          )}
        </div>
      )}

      {/* Product search */}
      {selectedBusinessId && totalCount > 0 && (
        <div className="mb-4">
          <Input
            placeholder="Search products by name..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      {selectedBusinessId && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Base Price</Th>
                <Th>Markup Price</Th>
                <Th>Night Price</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <Td colSpan={5}>
                      <div className="h-10 w-full rounded bg-zinc-800/60 animate-pulse" />
                    </Td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <Td colSpan={5}>
                    <div className="text-center text-zinc-500 py-4">
                      {productRows.length === 0
                        ? 'No products found for this business.'
                        : 'No products match your search.'}
                    </div>
                  </Td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const hasMarkup = product.markupPrice != null && product.markupPrice > 0;
                  const hasNight = product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0;
                  const needsAttention = !hasMarkup || !hasNight;
                  return (
                    <tr
                      key={product.id}
                      className={needsAttention ? 'bg-amber-500/5' : ''}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <div className="relative h-9 w-9 rounded overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0">
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            </div>
                          ) : (
                            <div className="h-9 w-9 rounded border border-zinc-800 bg-zinc-900 flex-shrink-0" />
                          )}
                          <span className="font-medium text-zinc-100">{product.name}</span>
                          {product.variantGroupName && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {product.variantGroupName}
                            </Badge>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="tabular-nums text-zinc-300">{fmt(product.basePrice)}</span>
                      </Td>
                      <Td>
                        {hasMarkup ? (
                          <DeltaBadge base={product.basePrice} value={product.markupPrice} />
                        ) : (
                          <Badge variant="warning">Not set</Badge>
                        )}
                      </Td>
                      <Td>
                        {hasNight ? (
                          <DeltaBadge base={product.basePrice} value={product.nightMarkedupPrice} />
                        ) : (
                          <Badge variant="warning">Not set</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openModal(product)}>
                          Edit
                        </Button>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* No business selected placeholder */}
      {!selectedBusinessId && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500">Select a business above to manage product pricing.</p>
        </div>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct?.name ?? 'Edit Pricing'}
        size="sm"
      >
        {editingProduct && (
          <div className="space-y-5">
            {/* Base price reference */}
            <div className="flex items-center justify-between rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm">
              <span className="text-zinc-400">Base price</span>
              <span className="font-semibold tabular-nums text-zinc-100">{fmt(base)}</span>
            </div>

            {/* Markup price */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Markup price
                <span className="ml-1.5 font-normal text-zinc-600">(settlement only)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={base.toFixed(2)}
                  value={markupInput}
                  onChange={(e) => setMarkupInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-150"
                />
              </div>
              {markupInput !== '' && !isNaN(parseFloat(markupInput)) && (
                <p className={`text-xs font-medium mt-1 ${
                  previewMarkupDelta !== null && previewMarkupDelta > 0 ? 'text-green-400' : 'text-zinc-500'
                }`}>
                  {previewMarkupDelta !== null && previewMarkupDelta !== 0
                    ? `${previewMarkupDelta > 0 ? '+' : ''}${fmt(previewMarkupDelta)} from base`
                    : 'Same as base price'}
                </p>
              )}
            </div>

            {/* Night price */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Night price
                <span className="ml-1.5 font-normal text-zinc-600">(23:00-06:00)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={base.toFixed(2)}
                  value={nightInput}
                  onChange={(e) => setNightInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-150"
                />
              </div>
              {nightInput !== '' && !isNaN(parseFloat(nightInput)) && (
                <p className={`text-xs font-medium mt-1 ${
                  previewNightDelta !== null && previewNightDelta > 0 ? 'text-green-400' : 'text-zinc-500'
                }`}>
                  {previewNightDelta !== null && previewNightDelta !== 0
                    ? `${previewNightDelta > 0 ? '+' : ''}${fmt(previewNightDelta)} from base`
                    : 'Same as base price'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/50">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
