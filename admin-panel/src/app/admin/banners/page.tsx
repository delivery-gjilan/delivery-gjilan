'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_BANNERS, CREATE_BANNER, UPDATE_BANNER, DELETE_BANNER, UPDATE_BANNER_ORDER } from '@/graphql/operations/banners';
import Button from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Image, Plus, Edit, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { BannersQuery, CreateBannerInput } from '@/gql/graphql';

export default function BannersPage() {
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);
  const [draggedBanner, setDraggedBanner] = useState<NonNullable<BannersQuery['getBanners']>[number] | null>(null);

  const [formData, setFormData] = useState<CreateBannerInput>({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkType: '',
    linkTarget: '',
    isActive: true,
  });

  const { data, loading, error, refetch } = useQuery(GET_BANNERS, {
    variables: { activeOnly },
  });

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

  const banners = data?.getBanners || [];

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkType: '',
      linkTarget: '',
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
      linkType: banner.linkType || '',
      linkTarget: banner.linkTarget || '',
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
      linkType: '',
      linkTarget: '',
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
      linkType: formData.linkType?.trim() || null,
      linkTarget: formData.linkTarget?.trim() || null,
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

    // Update the order
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
            linkType: banner.linkType,
            linkTarget: banner.linkTarget,
            isActive: !banner.isActive,
          },
        },
      });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
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

      <div className="flex gap-2">
        <Button
          variant={activeOnly === undefined ? 'default' : 'outline'}
          onClick={() => setActiveOnly(undefined)}
        >
          All
        </Button>
        <Button
          variant={activeOnly === true ? 'default' : 'outline'}
          onClick={() => setActiveOnly(true)}
        >
          Active
        </Button>
        <Button
          variant={activeOnly === false ? 'default' : 'outline'}
          onClick={() => setActiveOnly(false)}
        >
          Inactive
        </Button>
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
              <Th>Title</Th>
              <Th>Subtitle</Th>
              <Th>Link</Th>
              <Th>Order</Th>
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
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || 'Banner'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="60"%3E%3Crect fill="%23333" width="100" height="60"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </Td>

                <Td className="font-medium">
                  {banner.title || <span className="text-gray-500 italic">No title</span>}
                </Td>

                <Td>
                  {banner.subtitle || <span className="text-gray-500 italic">No subtitle</span>}
                </Td>

                <Td>
                  {banner.linkType && banner.linkTarget ? (
                    <div className="flex items-center gap-1 text-sm">
                      <ExternalLink className="w-3 h-3" />
                      <span className="text-blue-400">{banner.linkType}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">No link</span>
                  )}
                </Td>

                <Td>
                  <span className="text-gray-400">{banner.sortOrder}</span>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL *
              </label>
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
              {formData.imageUrl && (
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
                Title
              </label>
              <Input
                type="text"
                value={formData.title || ''}
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
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Banner subtitle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link Type
              </label>
              <Select
                value={formData.linkType || ''}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value })}
              >
                <option value="">No Link</option>
                <option value="business">Business</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
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
                  value={formData.linkTarget || ''}
                  onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                  placeholder={
                    formData.linkType === 'url'
                      ? 'https://example.com'
                      : `${formData.linkType} ID`
                  }
                />
              </div>
            )}

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

            <div className="flex gap-3 justify-end pt-4">
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
