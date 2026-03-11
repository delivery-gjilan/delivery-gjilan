'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Search } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const GET_PRICING = gql`
  query GetProductPricingByBusiness($businessId: ID!) {
    productPricingByBusiness(businessId: $businessId) {
      id
      productId
      businessId
      businessPrice
      platformMarkup
      baseCustomerPrice
      priceHistory {
        changedAt
        businessPrice
        platformMarkup
        baseCustomerPrice
        changedBy
        reason
      }
      createdAt
      updatedAt
    }
    products(businessId: $businessId) {
      id
      name
      price
      description
      imageUrl
    }
  }
`;

const UPDATE_PRICING = gql`
  mutation UpdateProductPricing($productId: ID!, $businessId: ID!, $input: UpdateProductPricingInput!) {
    updateProductPricing(productId: $productId, businessId: $businessId, input: $input) {
      id
      businessPrice
      platformMarkup
      baseCustomerPrice
    }
  }
`;

const GET_BUSINESSES = gql`
  query GetBusinesses {
    businesses {
      id
      name
    }
  }
`;

export default function ProductPricingPage() {
  const { toast } = useToast();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBusinessSelectorOpen, setIsBusinessSelectorOpen] = useState(true);

  const { data: businessesData } = useQuery(GET_BUSINESSES);
  const businesses = businessesData?.businesses || [];
  
  // Filter businesses by search
  const filteredBusinesses = businesses.filter((business: any) =>
    business.name.toLowerCase().includes(businessSearch.toLowerCase())
  );
  
  // Get selected business name
  const selectedBusiness = businesses.find((b: any) => b.id === selectedBusinessId);

  const { data: pricingData, loading, refetch } = useQuery(GET_PRICING, {
    variables: { businessId: selectedBusinessId },
    skip: !selectedBusinessId,
    fetchPolicy: 'cache-and-network',
  });

  const [updatePricing] = useMutation(UPDATE_PRICING, {
    onCompleted: () => {
      toast({ title: 'Pricing updated successfully' });
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const pricingRecords = pricingData?.productPricingByBusiness || [];
  const products = pricingData?.products || [];

  // Merge products with their pricing data
  const productList = products.map((product: any) => {
    const pricing = pricingRecords.find((p: any) => p.productId === product.id);
    return {
      ...product,
      pricing,
      hasPricing: !!pricing,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Pricing & Markups</CardTitle>
          <CardDescription>
            Manage platform markups on business products. Business price + platform markup = final customer price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Business Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground">Selected Business</div>
                  <div className="text-lg font-semibold">
                    {selectedBusiness ? selectedBusiness.name : 'No business selected'}
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 transition-transform flex-shrink-0",
                  isDropdownOpen && "rotate-180"
                )} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 border rounded-lg bg-background shadow-lg z-50">
                  <div className="p-3 border-b sticky top-0 bg-background">
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
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No businesses found
                      </div>
                    ) : (
                      filteredBusinesses.map((business: any) => (
                        <button
                          key={business.id}
                          onClick={() => {
                            setSelectedBusinessId(business.id);
                            setIsDropdownOpen(false);
                            setBusinessSearch('');
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted",
                            selectedBusinessId === business.id && "bg-primary text-primary-foreground hover:bg-primary"
                          )}
                        >
                          {business.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {selectedBusinessId && (
              <Button variant="outline" onClick={() => refetch()} className="w-full">
                Refresh Products
              </Button>
            )}

            {/* Pricing Table */}
            {selectedBusinessId && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Business Price</TableHead>
                      <TableHead>Platform Markup</TableHead>
                      <TableHead>Customer Price</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : productList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No products found for this business. Products need to be created first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      productList.map((product: any) => (
                        <TableRow 
                          key={product.id}
                          className={cn(
                            !product.hasPricing && "bg-yellow-500/10 hover:bg-yellow-500/20"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.imageUrl && (
                                <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.hasPricing ? (
                              `€${parseFloat(product.pricing.businessPrice).toFixed(2)}`
                            ) : (
                              <span className="text-muted-foreground">€{parseFloat(product.price).toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.hasPricing ? (
                              <span className="text-sm font-medium text-green-600">
                                +€{parseFloat(product.pricing.platformMarkup).toFixed(2)}
                              </span>
                            ) : (
                              <Badge variant="outline">Not Set</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {product.hasPricing ? (
                              `€${parseFloat(product.pricing.baseCustomerPrice).toFixed(2)}`
                            ) : (
                              <span className="text-muted-foreground">€{parseFloat(product.price).toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {product.hasPricing ? (
                              new Date(product.pricing.updatedAt).toLocaleDateString()
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              {product.hasPricing ? 'Edit' : 'Set Pricing'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.hasPricing ? 'Update Product Pricing' : 'Set Product Pricing'}
            </DialogTitle>
            <DialogDescription>
              Adjust business price and platform markup for this product
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <EditPricingForm
              pricing={editingProduct}
              onSubmit={(values) => {
                updatePricing({
                  variables: {
                    productId: editingProduct.id,
                    businessId: selectedBusinessId,
                    input: values,
                  },
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditPricingForm({ pricing, onSubmit }: { pricing: any; onSubmit: (values: any) => void }) {
  const hasPricing = !!pricing.pricing;
  const currentPricing = pricing.pricing || {};
  
  const [businessPrice, setBusinessPrice] = useState<string>(
    String(hasPricing ? currentPricing.businessPrice : pricing.price)
  );
  const [platformMarkup, setPlatformMarkup] = useState<string>(
    String(hasPricing ? currentPricing.platformMarkup : '0')
  );
  const [reason, setReason] = useState('');

  const calculatedTotal = (parseFloat(businessPrice) + parseFloat(platformMarkup)).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      businessPrice: String(businessPrice),
      platformMarkup: String(platformMarkup),
      reason: reason || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <div className="text-sm font-medium mb-1">Product</div>
        <div className="font-semibold">{pricing.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Current base price: €{parseFloat(pricing.price).toFixed(2)}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Business Price (€)</Label>
        <Input
          type="number"
          step="0.01"
          placeholder="10.00"
          value={businessPrice}
          onChange={(e) => setBusinessPrice(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">What the business sets for this product</p>
      </div>

      <div className="space-y-2">
        <Label>Platform Markup (€)</Label>
        <Input
          type="number"
          step="0.01"
          placeholder="2.50"
          value={platformMarkup}
          onChange={(e) => setPlatformMarkup(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Additional platform fee on top</p>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Final Customer Price:</span>
          <span className="text-2xl font-bold">€{calculatedTotal}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reason for Change (Optional)</Label>
        <Textarea
          placeholder="Why are you updating this pricing?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">Stored in price history for audit trail</p>
      </div>

      <Button type="submit" className="w-full">
        {hasPricing ? 'Update Pricing' : 'Set Pricing'}
      </Button>
    </form>
  );
}
