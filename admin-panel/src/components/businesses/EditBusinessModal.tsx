'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ScheduleEditor from '@/components/businesses/ScheduleEditor';
import { BusinessType, BusinessesQuery } from '@/gql/graphql';
import { uploadImage, deleteImage } from '@/lib/utils/image-upload';
import { toast } from 'sonner';

type Business = BusinessesQuery['businesses'][number];

interface EditBusinessModalProps {
    isOpen: boolean;
    business: Business | null;
    onClose: () => void;
    onSaved: (freshBusiness?: Business) => void;
    updateBusiness: (vars: { variables: { id: string; input: any } }) => Promise<any>;
    refetch: () => Promise<any>;
}

export default function EditBusinessModal({
    isOpen,
    business,
    onClose,
    onSaved,
    updateBusiness,
    refetch,
}: EditBusinessModalProps) {
    const [uploadingImage, setUploadingImage] = useState(false);
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        businessType: 'RESTAURANT' as BusinessType,
        imageUrl: '',
        location: { latitude: 0, longitude: 0, address: '' },
        workingHours: { opensAt: '08:00', closesAt: '23:00' },
        minOrderAmount: 0,
    });

    // Sync form when modal opens with a business
    useEffect(() => {
        if (isOpen && business) {
            setForm({
                name: business.name,
                phoneNumber: business.phoneNumber || '',
                businessType: business.businessType,
                imageUrl: business.imageUrl || '',
                location: {
                    latitude: business.location?.latitude || 0,
                    longitude: business.location?.longitude || 0,
                    address: business.location?.address || '',
                },
                workingHours: {
                    opensAt: business.workingHours?.opensAt || '08:00',
                    closesAt: business.workingHours?.closesAt || '23:00',
                },
                minOrderAmount: business.minOrderAmount ?? 0,
            });
            setEditImageFile(null);
            setEditImagePreview(business.imageUrl || null);
        }
    }, [isOpen, business]);

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setEditImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    async function handleEdit() {
        if (!business) return;
        if (!form.name.trim() || !form.location.address.trim()) {
            toast.warning('Please fill in all required fields');
            return;
        }

        setUploadingImage(true);
        let imageUrl = form.imageUrl;

        if (editImageFile) {
            if (form.imageUrl) await deleteImage(form.imageUrl);
            const uploadedUrl = await uploadImage(editImageFile, 'businesses');
            if (uploadedUrl) imageUrl = uploadedUrl;
        }
        setUploadingImage(false);

        await updateBusiness({
            variables: {
                id: business.id,
                input: {
                    name: form.name,
                    phoneNumber: form.phoneNumber.trim() || null,
                    businessType: form.businessType,
                    imageUrl: imageUrl || null,
                    location: form.location,
                    workingHours: form.workingHours,
                    minOrderAmount: form.minOrderAmount,
                },
            },
        });

        const result = await refetch();
        const freshBusiness = result.data?.businesses?.find((b: Business) => b.id === business.id);
        onSaved(freshBusiness);
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Business">
            <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Information</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Business Name *</label>
                        <Input
                            placeholder="e.g., My Restaurant"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                            <Input
                                placeholder="e.g., +383 44 123 456"
                                value={form.phoneNumber}
                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Business Type *</label>
                            <Select
                                value={form.businessType}
                                onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                            >
                                <option value="RESTAURANT">Restaurant</option>
                                <option value="MARKET">Market</option>
                                <option value="PHARMACY">Pharmacy</option>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Business Image (optional)</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                        />
                        {editImagePreview && (
                            <div className="mt-2">
                                <img src={editImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div className="border-t border-gray-700 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Location</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Address *</label>
                        <Input
                            placeholder="e.g., 123 Main Street, City"
                            value={form.location.address}
                            onChange={(e) =>
                                setForm({ ...form, location: { ...form.location, address: e.target.value } })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Latitude</label>
                            <Input
                                placeholder="e.g., 41.3874"
                                type="number"
                                step="0.000001"
                                value={form.location.latitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        location: { ...form.location, latitude: parseFloat(e.target.value) || 0 },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Longitude</label>
                            <Input
                                placeholder="e.g., 21.1432"
                                type="number"
                                step="0.000001"
                                value={form.location.longitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        location: { ...form.location, longitude: parseFloat(e.target.value) || 0 },
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Operating Hours */}
                <div className="border-t border-gray-700 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Default Hours</h3>
                    <p className="text-xs text-gray-500">Fallback hours when no daily schedule is set</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Opens At</label>
                            <Input
                                type="time"
                                value={form.workingHours.opensAt}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        workingHours: { ...form.workingHours, opensAt: e.target.value },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Closes At</label>
                            <Input
                                type="time"
                                value={form.workingHours.closesAt}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        workingHours: { ...form.workingHours, closesAt: e.target.value },
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Minimum Order */}
                <div className="border-t border-gray-700 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Ordering Rules</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Minimum Order Amount (€)</label>
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={form.minOrderAmount}
                            onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Set to 0 to disable. Customers cannot place an order below this subtotal.
                        </p>
                    </div>
                </div>

                {/* Per-day Schedule Editor */}
                <div className="border-t border-gray-700 pt-6">
                    {business && (
                        <ScheduleEditor
                            businessId={business.id}
                            schedule={business.schedule ?? []}
                            onSaved={async () => {
                                const result = await refetch();
                                const freshBusiness = result.data?.businesses?.find(
                                    (b: Business) => b.id === business.id,
                                );
                                if (freshBusiness) onSaved(freshBusiness);
                            }}
                        />
                    )}
                </div>

                <Button variant="primary" className="w-full" onClick={handleEdit} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading...' : 'Save Changes'}
                </Button>
            </div>
        </Modal>
    );
}
