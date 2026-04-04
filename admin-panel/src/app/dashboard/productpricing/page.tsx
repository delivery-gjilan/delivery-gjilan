'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { graphql } from '@/gql';
import Image from 'next/image';
import { ChevronDown, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  if (value == null || value <= 0) return <span className="text-muted-foreground text-xs">—</span>;
  const delta = value - base;
  return (
    <span className="tabular-nums">
      {fmt(value)}
      {delta !== 0 && (
        <span className={cn('ml-1.5 text-xs font-medium', delta > 0 ? 'text-green-600' : 'text-red-500')}>
          {delta > 0 ? '+' : ''}{fmt(delta)}
        </span>
      )}
    </span>
  );
}

// Page

export default function ProductMarkupPage() {
  const { toast } = useToast();

  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [markupInput, setMarkupInput] = useState('');
  const [nightInput, setNightInput] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

    // Variant group card: expand each variant into its own row
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

    // Standalone product card
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

    // Fallback: skip cards with neither product nor variants
    return [];
  });

  // Mutation

  const [updateMarkup, { loading: saving }] = useMutation(UPDATE_PRODUCT_MARKUP, {
    onCompleted: () => {
      toast({ title: 'Prices saved' });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Handlers

  function openDialog(product: ProductRow) {
    setEditingProduct(product);
    setMarkupInput(product.markupPrice != null && product.markupPrice > 0 ? String(product.markupPrice) : '');
    setNightInput(product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0 ? String(product.nightMarkedupPrice) : '');
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (!editingProduct) return;

    const markupVal = markupInput.trim() === '' ? null : parseFloat(markupInput);
    const nightVal = nightInput.trim() === '' ? null : parseFloat(nightInput);

    if (markupVal !== null && (isNaN(markupVal) || markupVal < 0)) {
      toast({ title: 'Invalid markup price', variant: 'destructive' });
      return;
    }
    if (nightVal !== null && (isNaN(nightVal) || nightVal < 0)) {
      toast({ title: 'Invalid night price', variant: 'destructive' });
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

  // Live delta preview for modal
  const base = editingProduct?.basePrice ?? 0;
  const previewMarkupDelta = markupInput ? parseFloat(markupInput) - base : null;
  const previewNightDelta = nightInput ? parseFloat(nightInput) - base : null;

  // Render

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Product Pricing
          </CardTitle>
          <CardDescription>
            Set markup price (for driver settlements) and night price (23:00-06:00) per product.
            Yellow rows have at least one price unset.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Business selector */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <div className="text-xs text-muted-foreground mb-0.5">Business</div>
                <div className="font-semibold">
                  {selectedBusiness ? selectedBusiness.name : 'Select a business...'}
                </div>
              </div>
              <ChevronDown
                className={cn('h-5 w-5 flex-shrink-0 transition-transform', isDropdownOpen && 'rotate-180')}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-background shadow-lg z-50">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search businesses..."
                      value={businessSearch}
                      onChange={(e) => setBusinessSearch(e.target.value)}
                      className="pl-9 h-9"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredBusinesses.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No businesses found</p>
                  ) : (
                    filteredBusinesses.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBusinessId(b.id);
                          setIsDropdownOpen(false);
                          setBusinessSearch('');
                        }}
                        className={cn(
                          'w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted',
                          selectedBusinessId === b.id && 'bg-primary text-primary-foreground hover:bg-primary',
                        )}
                      >
                        {b.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary badges */}
          {selectedBusinessId && !loading && totalCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{totalCount} products</Badge>
              {noMarkup.length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-800 border-yellow-400 hover:bg-yellow-500/20">
                  {noMarkup.length} without markup
                </Badge>
              )}
              {noNight.length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-800 border-yellow-400 hover:bg-yellow-500/20">
                  {noNight.length} without night price
                </Badge>
              )}
            </div>
          )}

          {/* Table */}
          {selectedBusinessId && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Markup Price</TableHead>
                    <TableHead>Night Price</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : productRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No products found for this business.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productRows.map((product) => {
                      const hasMarkup = product.markupPrice != null && product.markupPrice > 0;
                      const hasNight = product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0;
                      const needsAttention = !hasMarkup || !hasNight;
                      return (
                        <TableRow
                          key={product.id}
                          className={cn(needsAttention && 'bg-yellow-400/15')}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <div className="relative h-10 w-10 rounded overflow-hidden border bg-muted flex-shrink-0">
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded border bg-muted flex-shrink-0" />
                              )}
                              <span className="font-medium">{product.name}</span>
                              {product.variantGroupName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-400 text-violet-600">
                                  {product.variantGroupName}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {fmt(product.basePrice)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {hasMarkup ? (
                              <DeltaBadge base={product.basePrice} value={product.markupPrice} />
                            ) : (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-500/10">
                                Not set
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {hasNight ? (
                              <DeltaBadge base={product.basePrice} value={product.nightMarkedupPrice} />
                            ) : (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-500/10">
                                Not set
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openDialog(product)}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingProduct?.name}</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-5 py-1">
              {/* Base price reference strip */}
              <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Base price</span>
                <span className="font-semibold tabular-nums">{fmt(base)}</span>
              </div>

              {/* Markup price */}
              <div className="space-y-1.5">
                <Label>
                  Markup price
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(settlement only, not shown to customer)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={base.toFixed(2)}
                    value={markupInput}
                    onChange={(e) => setMarkupInput(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {markupInput !== '' && !isNaN(parseFloat(markupInput)) && (
                  <p className={cn(
                    'text-xs font-medium',
                    previewMarkupDelta !== null && previewMarkupDelta > 0 ? 'text-green-600' : 'text-muted-foreground',
                  )}>
                    {previewMarkupDelta !== null && previewMarkupDelta !== 0
                      ? `${previewMarkupDelta > 0 ? '+' : ''}${fmt(previewMarkupDelta)} from base`
                      : 'Same as base price'}
                  </p>
                )}
              </div>

              {/* Night price */}
              <div className="space-y-1.5">
                <Label>
                  Night price
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(23:00-06:00)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={base.toFixed(2)}
                    value={nightInput}
                    onChange={(e) => setNightInput(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {nightInput !== '' && !isNaN(parseFloat(nightInput)) && (
                  <p className={cn(
                    'text-xs font-medium',
                    previewNightDelta !== null && previewNightDelta > 0 ? 'text-green-600' : 'text-muted-foreground',
                  )}>
                    {previewNightDelta !== null && previewNightDelta !== 0
                      ? `${previewNightDelta > 0 ? '+' : ''}${fmt(previewNightDelta)} from base`
                      : 'Same as base price'}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
