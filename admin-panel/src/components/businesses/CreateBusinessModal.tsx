'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { BusinessType } from '@/gql/graphql';
import { uploadImage } from '@/lib/utils/image-upload';
import { toast } from 'sonner';

interface CreateBusinessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => Promise<void>;
    createBusiness: (vars: { variables: { input: any } }) => Promise<any>;
    createBusinessWithOwner: (vars: { variables: { input: any } }) => Promise<any>;
}

export default function CreateBusinessModal({
    isOpen,
    onClose,
    onCreated,
    createBusiness,
    createBusinessWithOwner,
}: CreateBusinessModalProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        businessType: 'RESTAURANT' as BusinessType,
        imageUrl: '',
        createOwnerNow: true,
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerIsDemoAccount: false,
        location: { latitude: 0, longitude: 0, address: '' },
        workingHours: { opensAt: '08:00', closesAt: '23:00' },
        minOrderAmount: 0,
    });

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    function resetForm() {
        setForm({
            name: '',
            phoneNumber: '',
            businessType: 'RESTAURANT' as BusinessType,
            imageUrl: '',
            createOwnerNow: true,
            ownerFirstName: '',
            ownerLastName: '',
            ownerEmail: '',
            ownerPassword: '',
            ownerIsDemoAccount: false,
            location: { latitude: 0, longitude: 0, address: '' },
            workingHours: { opensAt: '08:00', closesAt: '23:00' },
            minOrderAmount: 0,
        });
        setImageFile(null);
        setImagePreview(null);
    }

    async function handleCreate() {
        if (!form.name.trim() || !form.location.address.trim()) {
            toast.warning('Please fill in all required fields');
            return;
        }

        if (form.createOwnerNow) {
            if (
                !form.ownerFirstName.trim() ||
                !form.ownerLastName.trim() ||
                !form.ownerEmail.trim() ||
                !form.ownerPassword
            ) {
                toast.warning('Please fill in all owner credential fields');
                return;
            }
            if (form.ownerPassword.length < 8) {
                toast.warning('Owner password must be at least 8 characters');
                return;
            }
        }

        setUploadingImage(true);
        let imageUrl = form.imageUrl;

        if (imageFile) {
            const uploadedUrl = await uploadImage(imageFile, 'businesses');
            if (uploadedUrl) imageUrl = uploadedUrl;
        }
        setUploadingImage(false);

        const businessInput = {
            name: form.name,
            phoneNumber: form.phoneNumber.trim() || null,
            businessType: form.businessType,
            imageUrl: imageUrl || null,
            location: form.location,
            workingHours: form.workingHours,
            minOrderAmount: form.minOrderAmount,
        };

        if (form.createOwnerNow) {
            await createBusinessWithOwner({
                variables: {
                    input: {
                        business: businessInput,
                        owner: {
                            email: form.ownerEmail.trim(),
                            password: form.ownerPassword,
                            firstName: form.ownerFirstName.trim(),
                            lastName: form.ownerLastName.trim(),
                            isDemoAccount: form.ownerIsDemoAccount,
                        },
                    },
                },
            });
            toast.success('Business and owner created successfully');
        } else {
            await createBusiness({ variables: { input: businessInput } });
            toast.success('Business created successfully');
        }

        await onCreated();
        onClose();
        resetForm();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Business">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name *</label>
                    <Input
                        placeholder="e.g., My Restaurant"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone Number</label>
                    <Input
                        placeholder="e.g., +383 44 123 456"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Type *</label>
                    <Select
                        value={form.businessType}
                        onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                    >
                        <option value="RESTAURANT">Restaurant</option>
                        <option value="MARKET">Market</option>
                        <option value="PHARMACY">Pharmacy</option>
                    </Select>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                            type="checkbox"
                            checked={form.createOwnerNow}
                            onChange={(e) => setForm({ ...form, createOwnerNow: e.target.checked })}
                            className="h-4 w-4"
                        />
                        Create business owner now
                    </label>

                    {form.createOwnerNow && (
                        <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                            <p className="text-xs text-zinc-400">
                                Owner account will be created as BUSINESS_OWNER and linked to this business.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Owner first name *"
                                    value={form.ownerFirstName}
                                    onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })}
                                />
                                <Input
                                    placeholder="Owner last name *"
                                    value={form.ownerLastName}
                                    onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })}
                                />
                            </div>
                            <Input
                                type="email"
                                placeholder="Owner email *"
                                value={form.ownerEmail}
                                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                            />
                            <Input
                                type="password"
                                placeholder="Owner password * (min 8 chars)"
                                value={form.ownerPassword}
                                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                            />
                            <label className="flex items-start gap-3 rounded-lg border border-sky-900/50 bg-sky-950/20 p-3">
                                <input
                                    type="checkbox"
                                    checked={form.ownerIsDemoAccount}
                                    onChange={(e) => setForm({ ...form, ownerIsDemoAccount: e.target.checked })}
                                    className="mt-1 h-4 w-4 accent-sky-500"
                                />
                                <div>
                                    <div className="text-sm font-medium text-sky-200">Demo / App Review owner</div>
                                    <p className="mt-1 text-xs text-sky-100/70">
                                        Marks the linked owner account as a demo account for App Review test flows.
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Image (optional)</label>
                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                    />
                    {imagePreview && (
                        <div className="mt-2">
                            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded" />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address *</label>
                    <Input
                        placeholder="e.g., 123 Main Street, City"
                        value={form.location.address}
                        onChange={(e) =>
                            setForm({ ...form, location: { ...form.location, address: e.target.value } })
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Location Coordinates</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Latitude</label>
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
                            <label className="block text-xs text-zinc-500 mb-1">Longitude</label>
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

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Working Hours *</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Opens At</label>
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
                            <label className="block text-xs text-zinc-500 mb-1">Closes At</label>
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

                <div className="border-t border-zinc-800 pt-4">
                    <label className="block text-xs text-zinc-500 mb-1">Minimum Order Amount (€)</label>
                    <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="0 = no minimum"
                        value={form.minOrderAmount}
                        onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-zinc-600 mt-1">Set to 0 to disable minimum order enforcement</p>
                </div>

                <Button variant="primary" className="w-full mt-2" onClick={handleCreate} disabled={uploadingImage}>
                    {uploadingImage
                        ? 'Uploading...'
                        : form.createOwnerNow
                            ? 'Create Business + Owner'
                            : 'Create Business'}
                </Button>
            </div>
        </Modal>
    );
}
