'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_BANNERS, CREATE_BANNER, UPDATE_BANNER, DELETE_BANNER, UPDATE_BANNER_ORDER } from '@/graphql/operations/banners';
import { GET_BUSINESSES_LIST, GET_BUSINESS_PRODUCTS } from '@/graphql/operations/banners/businessProducts';
import { GET_PROMOTIONS } from '@/graphql/operations/promotions/queries';
import Button from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Image, Plus, Edit, Trash2, GripVertical, ExternalLink, Calendar, Tag, Store, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl: string;
  mediaType: 'IMAGE' | 'GIF' | 'VIDEO';
  businessId?: string | null;
  business?: { id: string; name: string } | null;
  productId?: string | null;
  product?: { id: string; name: string } | null;
  promotionId?: string | null;
  promotion?: { id: string; name: string; code?: string | null } | null;
  linkType?: string | null;
  linkTarget?: string | null;
  displayContext: 'HOME' | 'BUSINESS' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'ALL';
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BannerFormData {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  mediaType: 'IMAGE' | 'GIF' | 'VIDEO';
  businessId?: string;
  productId?: string;
  promotionId?: string;
  linkType?: string;
  linkTarget?: string;
  displayContext: 'HOME' | 'BUSINESS' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'ALL';
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}

export default function BannersPage() {
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean | undefined>(undefined);
  const [filterBusinessId, setFilterBusinessId] = useState<string>('');
  const [filterDisplayContext, setFilterDisplayContext] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);
  const [draggedBanner, setDraggedBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);

  const [formData, setFormData] = useState<CreateBannerInput>({
    title: '',
    subtitle: '',
    imageUrl: '',
    mediaType: 'IMAGE',
    businessId: '',
    productId: '',
    promotionId: '',
    linkType: '',
    linkTarget: '',
    displayContext: 'HOME',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  // Fetch banners with filters
  const { data, loading, error, refetch } = useQuery(GET_BANNERS, {
    variables: {
      filter: {
        activeOnly: filterActiveOnly,
        businessId: filterBusinessId || undefined,
        displayContext: filterDisplayContext || undefined,
      },
    },
  });

  // Fetch businesses for dropdown
  const { data: businessesData } = useQuery(GET_BUSINESSES_LIST);

  // Fetch products for selected business
  const { data: productsData, refetch: refetchProducts } = useQuery(GET_BUSINESS_PRODUCTS, {
    variables: { businessId: formData.businessId || '' },
    skip: !formData.businessId,
  });

  // Fetch promotions for dropdown
  const { data: promotionsData } = useQuery(GET_PROMOTIONS, {
    variables: { isActive: true },
  });

  // Refetch products when business changes
  useEffect(() => {
    if (formData.businessId) {
      refetchProducts();
    }
  }, [formData.businessId, refetchProducts]);

  const [createBanner, { loading: creating }] = useMutation(CREATE_BANNER, {
    onCompleted: () => {
      toast.success('Banner created successfully');
      refetch();
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(`Failed to create banner: ${error.message}`);
    },
  });

  const [updateBanner, { loading: updating }] = useMutation(UPDATE_BANNER, {
    onCompleted: () => {
      toast.success('Banner updated successfully');
      refetch();
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(`Failed to update banner: ${error.message}`);
    },
  });

  const [deleteBanner, { loading: deleting }] = useMutation(DELETE_BANNER, {
    onCompleted: () => {
      toast.success('Banner deleted successfully');
      refetch();
      setShowDeleteModal(false);
      setDeletingBanner(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete banner: ${error.message}`);
    },
  });

  const [updateBannerOrder] = useMutation(UPDATE_BANNER_ORDER, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const banners = (data?.getBanners || []) as Banner[];
  const businesses = businessesData?.businesses || [];
  const products = productsData?.products || [];
  const promotions = promotionsData?.getAllPromotions || [];

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      mediaType: 'IMAGE',
      businessId: '',
      productId: '',
      promotionId: '',
      linkType: '',
      linkTarget: '',
      displayContext: 'HOME',
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (banner: NonNullable<BannersQuery['getBanners']>[number]) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      mediaType: banner.mediaType || 'IMAGE',
      businessId: banner.businessId || '',
      productId: banner.productId || '',
      promotionId: banner.promotionId || '',
      linkType: banner.linkType || '',
      linkTarget: banner.linkTarget || '',
      displayContext: banner.displayContext || 'HOME',
      startsAt: banner.startsAt ? new Date(banner.startsAt).toISOString().slice(0, 16) : '',
      endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : '',
      isActive: banner.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = (banner: NonNullable<BannersQuery['getBanners']>[number]) => {
    setDeletingBanner(banner);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      mediaType: 'IMAGE',
      businessId: '',
      productId: '',
      promotionId: '',
      linkType: '',
      linkTarget: '',
      displayContext: 'HOME',
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl.trim()) {
      toast.error('Image URL is required');
      return;
    }

    const input = {
      title: formData.title?.trim() || null,
      subtitle: formData.subtitle?.trim() || null,
      imageUrl: formData.imageUrl.trim(),
      mediaType: formData.mediaType,
      businessId: formData.businessId || null,
      productId: formData.productId || null,
      promotionId: formData.promotionId || null,
      linkType: formData.linkType?.trim() || null,
      linkTarget: formData.linkTarget?.trim() || null,
      displayContext: formData.displayContext,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : null,
      isActive: formData.isActive,
    };

    try {
      if (editingBanner) {
        await updateBanner({
          variables: {
            id: editingBanner.id,
            input,
          },
        });
      } else {
        await createBanner({
          variables: { input },
        });
      }
    } catch (err) {
      console.error('Failed to save banner:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deletingBanner) return;

    try {
      await deleteBanner({
        variables: { id: deletingBanner.id },
      });
    } catch (err) {
      console.error('Failed to delete banner:', err);
    }
  };

  const handleDragStart = (banner: NonNullable<BannersQuery['getBanners']>[number]) => {
    setDraggedBanner(banner);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetBanner: NonNullable<BannersQuery['getBanners']>[number]) => {
    if (!draggedBanner || draggedBanner.id === targetBanner.id) {
      setDraggedBanner(null);
      return;
    }

    await updateBannerOrder({
      variables: {
        bannerId: draggedBanner.id,
        newSortOrder: targetBanner.sortOrder,
      },
    });

    setDraggedBanner(null);
  };

  const toggleActive = async (banner: NonNullable<BannersQuery['getBanners']>[number]) => {
    try {
      await updateBanner({
        variables: {
          id: banner.id,
          input: {
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            mediaType: banner.mediaType,
            businessId: banner.businessId,
            productId: banner.productId,
            promotionId: banner.promotionId,
            linkType: banner.linkType,
            linkTarget: banner.linkTarget,
            displayContext: banner.displayContext,
            startsAt: banner.startsAt,
            endsAt: banner.endsAt,
            isActive: !banner.isActive,
          },
        },
      });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banner Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Banner
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex gap-2">
          <Button
            variant={filterActiveOnly === undefined ? 'default' : 'outline'}
            onClick={() => setFilterActiveOnly(undefined)}
          >
            All
          </Button>
          <Button
            variant={filterActiveOnly === true ? 'default' : 'outline'}
            onClick={() => setFilterActiveOnly(true)}
          >
            Active
          </Button>
          <Button
            variant={filterActiveOnly === false ? 'default' : 'outline'}
            onClick={() => setFilterActiveOnly(false)}
          >
            Inactive
          </Button>
        </div>

        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filter by Business
          </label>
          <Select
            value={filterBusinessId}
            onChange={(e) => setFilterBusinessId(e.target.value)}
          >
            <option value="">All Businesses</option>
            {businesses.map((business: any) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Display Context
          </label>
          <Select
            value={filterDisplayContext}
            onChange={(e) => setFilterDisplayContext(e.target.value)}
          >
            <option value="">All Contexts</option>
            <option value="HOME">Home</option>
            <option value="BUSINESS">Business</option>
            <option value="CATEGORY">Category</option>
            <option value="PRODUCT">Product</option>
            <option value="CART">Cart</option>
            <option value="ALL">All Pages</option>
          </Select>
        </div>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Image className="mx-auto h-12 w-12 mb-4 opacity-50" aria-label="No banners" />
          <p>No banners found. Create your first banner to get started.</p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-12">&nbsp;</Th>
              <Th className="w-32">Preview</Th>
              <Th>Title & Relationships</Th>
              <Th>Context</Th>
              <Th>Schedule</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>

          <tbody>
            {banners.map((banner) => (
              <tr
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(banner)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(banner)}
                className={`border-b border-[#1e1e22] hover:bg-zinc-900/30 ${draggedBanner?.id === banner.id ? 'opacity-50' : ''}`}
              >
                <Td>
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                </Td>

                <Td>
                  <div className="relative w-24 h-16 bg-gray-800 rounded overflow-hidden">
                    {banner.mediaType === 'VIDEO' ? (
                      <video
                        src={banner.imageUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="60"%3E%3Crect fill="%23333" width="100" height="60"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    )}
                    <div className="absolute bottom-0 right-0 bg-black/60 px-1 text-[10px] text-white">
                      {banner.mediaType}
                    </div>
                  </div>
                </Td>

                <Td>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {banner.title || <span className="text-gray-500 italic">No title</span>}
                    </div>
                    {banner.subtitle && (
                      <div className="text-sm text-gray-400">{banner.subtitle}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {banner.business && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">
                          <Store className="w-3 h-3" />
                          {banner.business.name}
                        </span>
                      )}
                      {banner.product && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/30">
                          <Package className="w-3 h-3" />
                          {banner.product.name}
                        </span>
                      )}
                      {banner.promotion && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded border border-purple-500/30">
                          <Tag className="w-3 h-3" />
                          {banner.promotion.code || banner.promotion.name}
                        </span>
                      )}
                    </div>
                  </div>
                </Td>

                <Td>
                  <span className="inline-flex items-center px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">
                    {banner.displayContext}
                  </span>
                </Td>

                <Td>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(banner.startsAt)}
                    </div>
                    {banner.endsAt && (
                      <div className="text-gray-500">to {formatDate(banner.endsAt)}</div>
                    )}
                    {!banner.startsAt && !banner.endsAt && (
                      <span className="text-gray-500">Always active</span>
                    )}
                  </div>
                </Td>

                <Td>
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      banner.isActive 
                        ? 'bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </button>
                </Td>

                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(banner)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(banner)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingBanner ? 'Edit Banner' : 'Create Banner'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Banner title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subtitle
                </label>
                <Input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Banner subtitle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Media URL *
                </label>
                <Input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                {formData.imageUrl && formData.mediaType !== 'VIDEO' && (
                  <div className="mt-2">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Media Type
                </label>
                <Select
                  value={formData.mediaType}
                  onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as any })}
                >
                  <option value="IMAGE">Image</option>
                  <option value="GIF">GIF</option>
                  <option value="VIDEO">Video</option>
                </Select>
              </div>
            </div>

            {/* Relationships */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">
                Relationships
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Store className="w-4 h-4 inline mr-1" />
                  Business (Optional)
                </label>
                <Select
                  value={formData.businessId}
                  onChange={(e) => {
                    setFormData({ ...formData, businessId: e.target.value, productId: '' });
                  }}
                >
                  <option value="">None</option>
                  {businesses.map((business: any) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </Select>
              </div>

              {formData.businessId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Product (Optional)
                  </label>
                  <Select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  >
                    <option value="">None</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Promotion (Optional)
                </label>
                <Select
                  value={formData.promotionId}
                  onChange={(e) => setFormData({ ...formData, promotionId: e.target.value })}
                >
                  <option value="">None</option>
                  {promotions.map((promotion: any) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.code ? `${promotion.code} - ${promotion.name}` : promotion.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">
                Display Settings
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Context
                </label>
                <Select
                  value={formData.displayContext}
                  onChange={(e) => setFormData({ ...formData, displayContext: e.target.value as any })}
                >
                  <option value="HOME">Home Page</option>
                  <option value="BUSINESS">Business Page</option>
                  <option value="CATEGORY">Category Page</option>
                  <option value="PRODUCT">Product Page</option>
                  <option value="CART">Cart Page</option>
                  <option value="ALL">All Pages</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Link Type (Legacy)
                </label>
                <Select
                  value={formData.linkType}
                  onChange={(e) => setFormData({ ...formData, linkType: e.target.value })}
                >
                  <option value="">No Link</option>
                  <option value="business">Business</option>
                  <option value="product">Product</option>
                  <option value="category">Category</option>
                  <option value="promotion">Promotion</option>
                  <option value="url">External URL</option>
                </Select>
              </div>

              {formData.linkType && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Link Target
                  </label>
                  <Input
                    type="text"
                    value={formData.linkTarget}
                    onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                    placeholder={
                      formData.linkType === 'url'
                        ? 'https://example.com'
                        : `${formData.linkType} ID`
                    }
                  />
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Schedule
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date & Time (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to make banner active immediately
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date & Time (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to keep banner active indefinitely
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={!!formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm text-gray-300">
                Active
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4 sticky bottom-0 bg-[#1a1a1d] pb-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating
                  ? 'Saving...'
                  : editingBanner
                  ? 'Update Banner'
                  : 'Create Banner'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBanner && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingBanner(null);
          }}
          title="Delete Banner"
        >
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-gray-300">
                Are you sure you want to delete this banner?
              </p>
              {deletingBanner.title && (
                <p className="text-sm text-gray-400 mt-2">
                  Banner: <strong>{deletingBanner.title}</strong>
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingBanner(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
