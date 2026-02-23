"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import {
    CREATE_BUSINESS,
    DELETE_BUSINESS,
    GET_BUSINESS,
    GET_BUSINESSES,
    UPDATE_BUSINESS,
} from "@/graphql/operations/businesses";
import ScheduleEditor from "@/components/businesses/ScheduleEditor";

/* ---------------------------------------------------------
   GRAPHQL TYPES
--------------------------------------------------------- */

type BusinessType = "RESTAURANT" | "MARKET" | "PHARMACY";

interface Location {
    latitude: number;
    longitude: number;
    address: string;
}

interface WorkingHours {
    opensAt: string;
    closesAt: string;
}

interface Business {
    id: string;
    name: string;
    phoneNumber?: string | null;
    businessType: BusinessType;
    imageUrl?: string | null;
    isActive: boolean;
    location?: Location;
    workingHours?: WorkingHours;
    schedule?: Array<{ id: string; dayOfWeek: number; opensAt: string; closesAt: string }>;
}

interface GetBusinessesData {
    businesses: Business[];
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function BusinessesPage() {
    const router = useRouter();

    /* --------------------------
     Apollo
  --------------------------- */
    const { data, loading, refetch } = useQuery<GetBusinessesData>(GET_BUSINESSES);

    const [createBusiness] = useMutation(CREATE_BUSINESS);
    const [updateBusiness] = useMutation(UPDATE_BUSINESS);
    const [deleteBusiness] = useMutation(DELETE_BUSINESS);

    const [getBusinessDetails] = useMutation(GET_BUSINESS);

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
        location: {
            latitude: 0,
            longitude: 0,
            address: "",
        },
        workingHours: {
            opensAt: "08:00",
            closesAt: "23:00",
        },
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
    });

    /* --------------------------
     Handlers
  --------------------------- */

    // Image upload handler
    async function uploadImage(file: File, folder: string): Promise<string | null> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        try {
            const response = await fetch('http://localhost:4000/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.url) {
                return data.url;
            }
            throw new Error(data.error || 'Upload failed');
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');
            return null;
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
            alert("Please fill in all required fields");
            return;
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

        await createBusiness({
            variables: {
                input: {
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
                },
            },
        });

        await refetch();
        setCreateOpen(false);

        setCreateForm({
            name: "",
            phoneNumber: "",
            businessType: "RESTAURANT",
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
        });
        setEditImageFile(null);
        setEditImagePreview(business.imageUrl || null);
        setEditOpen(true);
    }

    async function handleEdit() {
        if (!selected) return;
        
        if (!editForm.name.trim() || !editForm.location.address.trim()) {
            alert("Please fill in all required fields");
            return;
        }

        setUploadingImage(true);
        let imageUrl = editForm.imageUrl;

        // Upload new image if file is selected
        if (editImageFile) {
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
        return <p className="text-gray-400">Loading...</p>;
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>Type</Th>
                            <Th>Image</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredBusinesses.length === 0 ? (
                            <tr>
                                <Td colSpan={5}>
                                    <div className="text-center text-gray-500 py-4">
                                        No businesses found
                                    </div>
                                </Td>
                            </tr>
                        ) : (
                            filteredBusinesses.map((b) => (
                            <tr key={b.id}>
                                <Td>{b.name}</Td>
                                <Td>{b.businessType}</Td>

                                <Td>
                                    {b.imageUrl ? (
                                        <img
                                            src={b.imageUrl}
                                            alt=""
                                            className="h-10 w-10 rounded object-cover"
                                        />
                                    ) : (
                                        <span className="text-gray-500">
                                            No image
                                        </span>
                                    )}
                                </Td>

                                <Td>
                                    {b.isActive ? (
                                        <span className="text-green-400">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-red-400">
                                            Inactive
                                        </span>
                                    )}
                                </Td>

                                <Td>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            className="text-xs px-3"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/businesses/${b.id}`
                                                )
                                            }
                                        >
                                            View
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="text-xs px-3"
                                            onClick={() => openEditModal(b)}
                                        >
                                            Edit
                                        </Button>

                                        <Button
                                            variant="danger"
                                            className="text-xs px-3"
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

                {businesses.length === 0 && (
                    <p className="text-gray-400 text-center py-6">
                        No businesses found.
                    </p>
                )}
            </div>

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
                            <option value="MARKET">Market</option>
                            <option value="PHARMACY">Pharmacy</option>
                        </Select>
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

                    <Button
                        variant="primary"
                        className="w-full mt-2"
                        onClick={handleCreate}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? "Uploading..." : "Create Business"}
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
