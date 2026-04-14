"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState } from "react";
import { getAuthToken } from "@/lib/utils/auth";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import {
    CREATE_BUSINESS,
    CREATE_BUSINESS_WITH_OWNER,
    DELETE_BUSINESS,
    GET_BUSINESSES,
    UPDATE_BUSINESS,
} from "@/graphql/operations/businesses";
import ScheduleEditor from "@/components/businesses/ScheduleEditor";
import { toast } from 'sonner';
import { BusinessType, BusinessesQuery } from "@/gql/graphql";

/* ---------------------------------------------------------
   GRAPHQL TYPES
--------------------------------------------------------- */

type Business = BusinessesQuery["businesses"][number];

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function BusinessesPage() {
    const router = useRouter();

    /* --------------------------
     Apollo
  --------------------------- */
    const { data, loading, refetch } = useQuery<BusinessesQuery>(GET_BUSINESSES);

    const [createBusiness] = useMutation(CREATE_BUSINESS);
    const [createBusinessWithOwner] = useMutation(CREATE_BUSINESS_WITH_OWNER);
    const [updateBusiness] = useMutation(UPDATE_BUSINESS);
    const [deleteBusiness] = useMutation(DELETE_BUSINESS);

    /* --------------------------
     UI State
  --------------------------- */
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [selected, setSelected] = useState<Business | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    /* --------------------------
     Upload State
  --------------------------- */
    const [createImageFile, setCreateImageFile] = useState<File | null>(null);
    const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    /* --------------------------
     Form State
  --------------------------- */

    const [createForm, setCreateForm] = useState({
        name: "",
        phoneNumber: "",
        businessType: "RESTAURANT" as BusinessType,
        imageUrl: "",
        createOwnerNow: true,
        ownerFirstName: "",
        ownerLastName: "",
        ownerEmail: "",
        ownerPassword: "",
        ownerIsDemoAccount: false,
        location: {
            latitude: 0,
            longitude: 0,
            address: "",
        },
        workingHours: {
            opensAt: "08:00",
            closesAt: "23:00",
        },
        minOrderAmount: 0,
    });

    const [editForm, setEditForm] = useState({
        name: "",
        phoneNumber: "",
        businessType: "RESTAURANT" as BusinessType,
        imageUrl: "",
        location: {
            latitude: 0,
            longitude: 0,
            address: "",
        },
        workingHours: {
            opensAt: "08:00",
            closesAt: "23:00",
        },
        minOrderAmount: 0,
    });

    /* --------------------------
     Handlers
  --------------------------- */

    // Resolved API base URL (strips /graphql suffix if present)
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').replace(/\/graphql$/, '');

    // Image upload handler
    async function uploadImage(file: File, folder: string): Promise<string | null> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const token = getAuthToken();
        try {
            const response = await fetch(`${apiBase}/api/upload/image`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.url) {
                return data.url;
            }
            throw new Error(data.error || 'Upload failed');
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error('Failed to upload image');
            return null;
        }
    }

    async function deleteImage(imageUrl: string): Promise<void> {
        const token = getAuthToken();
        try {
            await fetch(`${apiBase}/api/upload/image`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ imageUrl }),
            });
        } catch {
            console.warn('Failed to delete old image from S3:', imageUrl);
        }
    }

    function handleCreateImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setCreateImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCreateImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    async function handleCreate() {
        if (!createForm.name.trim() || !createForm.location.address.trim()) {
            toast.warning("Please fill in all required fields");
            return;
        }

        if (createForm.createOwnerNow) {
            if (
                !createForm.ownerFirstName.trim() ||
                !createForm.ownerLastName.trim() ||
                !createForm.ownerEmail.trim() ||
                !createForm.ownerPassword
            ) {
                toast.warning("Please fill in all owner credential fields");
                return;
            }

            if (createForm.ownerPassword.length < 8) {
                toast.warning("Owner password must be at least 8 characters");
                return;
            }
        }

        setUploadingImage(true);
        let imageUrl = createForm.imageUrl;

        // Upload image if file is selected
        if (createImageFile) {
            const uploadedUrl = await uploadImage(createImageFile, 'businesses');
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        setUploadingImage(false);

        const businessInput = {
            name: createForm.name,
            phoneNumber: createForm.phoneNumber.trim() || null,
            businessType: createForm.businessType,
            imageUrl: imageUrl || null,
            location: {
                latitude: createForm.location.latitude,
                longitude: createForm.location.longitude,
                address: createForm.location.address,
            },
            workingHours: {
                opensAt: createForm.workingHours.opensAt,
                closesAt: createForm.workingHours.closesAt,
            },
            minOrderAmount: createForm.minOrderAmount,
        };

        if (createForm.createOwnerNow) {
            await createBusinessWithOwner({
                variables: {
                    input: {
                        business: businessInput,
                        owner: {
                            email: createForm.ownerEmail.trim(),
                            password: createForm.ownerPassword,
                            firstName: createForm.ownerFirstName.trim(),
                            lastName: createForm.ownerLastName.trim(),
                            isDemoAccount: createForm.ownerIsDemoAccount,
                        },
                    },
                },
            });
            toast.success("Business and owner created successfully");
        } else {
            await createBusiness({
                variables: {
                    input: businessInput,
                },
            });
            toast.success("Business created successfully");
        }

        await refetch();
        setCreateOpen(false);

        setCreateForm({
            name: "",
            phoneNumber: "",
            businessType: "RESTAURANT" as BusinessType,
            imageUrl: "",
            createOwnerNow: true,
            ownerFirstName: "",
            ownerLastName: "",
            ownerEmail: "",
            ownerPassword: "",
            ownerIsDemoAccount: false,
            location: {
                latitude: 0,
                longitude: 0,
                address: "",
            },
            workingHours: {
                opensAt: "08:00",
                closesAt: "23:00",
            },
            minOrderAmount: 0,
        });
        setCreateImageFile(null);
        setCreateImagePreview(null);
    }

    function openEditModal(business: Business) {
        setSelected(business);
        setEditForm({
            name: business.name,
            phoneNumber: business.phoneNumber || "",
            businessType: business.businessType,
            imageUrl: business.imageUrl || "",
            location: {
                latitude: business.location?.latitude || 0,
                longitude: business.location?.longitude || 0,
                address: business.location?.address || "",
            },
            workingHours: {
                opensAt: business.workingHours?.opensAt || "08:00",
                closesAt: business.workingHours?.closesAt || "23:00",
            },
            minOrderAmount: business.minOrderAmount ?? 0,
        });
        setEditImageFile(null);
        setEditImagePreview(business.imageUrl || null);
        setEditOpen(true);
    }

    async function handleEdit() {
        if (!selected) return;
        
        if (!editForm.name.trim() || !editForm.location.address.trim()) {
            toast.warning("Please fill in all required fields");
            return;
        }

        setUploadingImage(true);
        let imageUrl = editForm.imageUrl;

        // Upload new image if file is selected; delete old S3 image first
        if (editImageFile) {
            if (editForm.imageUrl) {
                await deleteImage(editForm.imageUrl);
            }
            const uploadedUrl = await uploadImage(editImageFile, 'businesses');
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        setUploadingImage(false);

        await updateBusiness({
            variables: {
                id: selected.id,
                input: {
                    name: editForm.name,
                    phoneNumber: editForm.phoneNumber.trim() || null,
                    businessType: editForm.businessType,
                    imageUrl: imageUrl || null,
                    location: {
                        latitude: editForm.location.latitude,
                        longitude: editForm.location.longitude,
                        address: editForm.location.address,
                    },
                    workingHours: {
                        opensAt: editForm.workingHours.opensAt,
                        closesAt: editForm.workingHours.closesAt,
                    },
                    minOrderAmount: editForm.minOrderAmount,
                },
            },
        });

        const result = await refetch();
        // Update selected with fresh data so ScheduleEditor re-syncs
        const freshBusiness = result.data?.businesses?.find((b: Business) => b.id === selected.id);
        if (freshBusiness) setSelected(freshBusiness);
        setEditOpen(false);
    }

    async function handleDelete() {
        if (!deleteId) return;

        await deleteBusiness({ variables: { id: deleteId } });
        await refetch();
        setDeleteId(null);
    }

    /* --------------------------
     Render
  --------------------------- */

    if (loading) {
        return (
            <div className="text-white">
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Businesses</h1>
                </div>
                <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            </div>
        );
    }

    const businesses: Business[] = data?.businesses || [];
    
    // Filter businesses based on search query
    const filteredBusinesses = businesses.filter((business) => {
        const query = searchQuery.toLowerCase();
        return (
            business.name.toLowerCase().includes(query) ||
            business.businessType.toLowerCase().includes(query) ||
            business.location?.address.toLowerCase().includes(query)
        );
    });

    const TYPE_BADGE: Record<string, string> = {
        RESTAURANT: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        MARKET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        PHARMACY: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    };

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Businesses</h1>
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                    + Create
                </Button>
            </div>

            {/* SEARCH BAR */}
            <div className="mb-4">
                <Input
                    placeholder="Search businesses by name, type, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* TABLE */}
            <Table>
                <thead>
                    <tr>
                        <Th>Business</Th>
                        <Th>Type</Th>
                        <Th>Address</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBusinesses.length === 0 ? (
                        <tr>
                            <Td colSpan={5}>
                                <div className="text-center text-zinc-500 py-6">
                                    {businesses.length === 0 ? "No businesses yet." : "No businesses match your search."}
                                </div>
                            </Td>
                        </tr>
                    ) : (
                        filteredBusinesses.map((b) => (
                            <tr key={b.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        {b.imageUrl ? (
                                            <img
                                                src={b.imageUrl}
                                                alt=""
                                                className="h-9 w-9 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-zinc-100">{b.name}</span>
                                    </div>
                                </Td>
                                <Td>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[b.businessType] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                        {b.businessType.charAt(0) + b.businessType.slice(1).toLowerCase()}
                                    </span>
                                </Td>
                                <Td>
                                    <span className="text-zinc-400 text-sm truncate max-w-[200px] block">
                                        {b.location?.address || <span className="text-zinc-600">�</span>}
                                    </span>
                                </Td>
                                <Td>
                                    {b.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                            Inactive
                                        </span>
                                    )}
                                </Td>
                                <Td className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/businesses/${b.id}`)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(b)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setDeleteId(b.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            {/* ---------------------------------------------------------
         CREATE MODAL
      ---------------------------------------------------------- */}
            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Create Business"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Business Name *
                        </label>
                        <Input
                            placeholder="e.g., My Restaurant"
                            value={createForm.name}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Phone Number
                        </label>
                        <Input
                            placeholder="e.g., +383 44 123 456"
                            value={createForm.phoneNumber}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    phoneNumber: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Business Type *
                        </label>
                        <Select
                            value={createForm.businessType}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    businessType: e.target.value as BusinessType,
                                })
                            }
                        >
                            <option value="RESTAURANT">Restaurant</option>
                            <option value="MARKET">Market</option>
                            <option value="PHARMACY">Pharmacy</option>
                        </Select>
                    </div>

                    <div className="border-t border-gray-700 pt-4 space-y-3">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={createForm.createOwnerNow}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        createOwnerNow: e.target.checked,
                                    })
                                }
                                className="h-4 w-4"
                            />
                            Create business owner now
                        </label>

                        {createForm.createOwnerNow && (
                            <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/40 p-3">
                                <p className="text-xs text-gray-400">
                                    Owner account will be created as BUSINESS_OWNER and linked to this business.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Owner first name *"
                                        value={createForm.ownerFirstName}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                ownerFirstName: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        placeholder="Owner last name *"
                                        value={createForm.ownerLastName}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                ownerLastName: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Owner email *"
                                    value={createForm.ownerEmail}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            ownerEmail: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    type="password"
                                    placeholder="Owner password * (min 8 chars)"
                                    value={createForm.ownerPassword}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            ownerPassword: e.target.value,
                                        })
                                    }
                                />
                                <label className="flex items-start gap-3 rounded-lg border border-sky-900/50 bg-sky-950/20 p-3">
                                    <input
                                        type="checkbox"
                                        checked={createForm.ownerIsDemoAccount}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                ownerIsDemoAccount: e.target.checked,
                                            })
                                        }
                                        className="mt-1 h-4 w-4 accent-sky-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-sky-200">Demo / App Review owner</div>
                                        <p className="mt-1 text-xs text-sky-100/70">Marks the linked owner account as a demo account for App Review test flows.</p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Business Image (optional)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleCreateImageChange}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                        />
                        {createImagePreview && (
                            <div className="mt-2">
                                <img
                                    src={createImagePreview}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Address *
                        </label>
                        <Input
                            placeholder="e.g., 123 Main Street, City"
                            value={createForm.location.address}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    location: {
                                        ...createForm.location,
                                        address: e.target.value,
                                    },
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Location Coordinates
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Latitude
                                </label>
                                <Input
                                    placeholder="e.g., 41.3874"
                                    type="number"
                                    step="0.000001"
                                    value={createForm.location.latitude}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            location: {
                                                ...createForm.location,
                                                latitude: parseFloat(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Longitude
                                </label>
                                <Input
                                    placeholder="e.g., 21.1432"
                                    type="number"
                                    step="0.000001"
                                    value={createForm.location.longitude}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            location: {
                                                ...createForm.location,
                                                longitude: parseFloat(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Working Hours *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Opens At
                                </label>
                                <Input
                                    type="time"
                                    value={createForm.workingHours.opensAt}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            workingHours: {
                                                ...createForm.workingHours,
                                                opensAt: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Closes At
                                </label>
                                <Input
                                    type="time"
                                    value={createForm.workingHours.closesAt}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            workingHours: {
                                                ...createForm.workingHours,
                                                closesAt: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Minimum Order */}
                    <div className="border-t border-gray-700 pt-4">
                        <label className="block text-xs text-gray-500 mb-1">
                            Minimum Order Amount (�)
                        </label>
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="0 = no minimum"
                            value={createForm.minOrderAmount}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    minOrderAmount: parseFloat(e.target.value) || 0,
                                })
                            }
                        />
                        <p className="text-xs text-gray-600 mt-1">Set to 0 to disable minimum order enforcement</p>
                    </div>

                    <Button
                        variant="primary"
                        className="w-full mt-2"
                        onClick={handleCreate}
                        disabled={uploadingImage}
                    >
                        {uploadingImage
                            ? "Uploading..."
                            : createForm.createOwnerNow
                                ? "Create Business + Owner"
                                : "Create Business"}
                    </Button>
                </div>
            </Modal>

            {/* ---------------------------------------------------------
         EDIT MODAL
      ---------------------------------------------------------- */}
            <Modal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Business"
            >
                <div className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Information</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Business Name *
                            </label>
                            <Input
                                placeholder="e.g., My Restaurant"
                                value={editForm.name}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, name: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Phone Number
                                </label>
                                <Input
                                    placeholder="e.g., +383 44 123 456"
                                    value={editForm.phoneNumber}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            phoneNumber: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Business Type *
                                </label>
                                <Select
                                    value={editForm.businessType}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            businessType: e.target.value as BusinessType,
                                        })
                                    }
                                >
                                    <option value="RESTAURANT">Restaurant</option>
                                    <option value="MARKET">Market</option>
                                    <option value="PHARMACY">Pharmacy</option>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Business Image (optional)
                            </label>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleEditImageChange}
                                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                            />
                            {editImagePreview && (
                                <div className="mt-2">
                                    <img
                                        src={editImagePreview}
                                        alt="Preview"
                                        className="h-32 w-32 object-cover rounded"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="border-t border-gray-700 pt-6 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Location</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Address *
                            </label>
                            <Input
                                placeholder="e.g., 123 Main Street, City"
                                value={editForm.location.address}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        location: {
                                            ...editForm.location,
                                            address: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Latitude
                                </label>
                                <Input
                                    placeholder="e.g., 41.3874"
                                    type="number"
                                    step="0.000001"
                                    value={editForm.location.latitude}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            location: {
                                                ...editForm.location,
                                                latitude: parseFloat(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Longitude
                                </label>
                                <Input
                                    placeholder="e.g., 21.1432"
                                    type="number"
                                    step="0.000001"
                                    value={editForm.location.longitude}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            location: {
                                                ...editForm.location,
                                                longitude: parseFloat(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Operating Hours (Legacy) */}
                    <div className="border-t border-gray-700 pt-6 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Default Hours</h3>
                        <p className="text-xs text-gray-500">Fallback hours when no daily schedule is set</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Opens At
                                </label>
                                <Input
                                    type="time"
                                    value={editForm.workingHours.opensAt}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            workingHours: {
                                                ...editForm.workingHours,
                                                opensAt: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Closes At
                                </label>
                                <Input
                                    type="time"
                                    value={editForm.workingHours.closesAt}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            workingHours: {
                                                ...editForm.workingHours,
                                                closesAt: e.target.value,
                                            },
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
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Minimum Order Amount (�)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                step={0.5}
                                value={editForm.minOrderAmount}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        minOrderAmount: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                            <p className="text-xs text-gray-500 mt-1">Set to 0 to disable. Customers cannot place an order below this subtotal.</p>
                        </div>
                    </div>

                    {/* Per-day Schedule Editor */}
                    <div className="border-t border-gray-700 pt-6">
                        {selected && (
                            <ScheduleEditor
                                businessId={selected.id}
                                schedule={selected.schedule ?? []}
                                onSaved={async () => {
                                    const result = await refetch();
                                    const freshBusiness = result.data?.businesses?.find((b: Business) => b.id === selected.id);
                                    if (freshBusiness) setSelected(freshBusiness);
                                }}
                            />
                        )}
                    </div>

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleEdit}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? "Uploading..." : "Save Changes"}
                    </Button>
                </div>
            </Modal>

            {/* ---------------------------------------------------------
         DELETE CONFIRMATION
      ---------------------------------------------------------- */}
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Business"
            >
                <p className="text-gray-300 mb-4">
                    Are you sure you want to delete this business?
                </p>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setDeleteId(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
