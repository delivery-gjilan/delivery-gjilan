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
    businessType: BusinessType;
    imageUrl?: string | null;
    isActive: boolean;
    location?: Location;
    workingHours?: WorkingHours;
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function BusinessesPage() {
    const router = useRouter();

    /* --------------------------
     Apollo
  --------------------------- */
    const { data, loading, refetch } = useQuery(GET_BUSINESSES);

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

    /* --------------------------
     Form State
  --------------------------- */

    const [createForm, setCreateForm] = useState({
        name: "",
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

    async function handleCreate() {
        if (!createForm.name.trim() || !createForm.location.address.trim()) {
            alert("Please fill in all required fields");
            return;
        }

        await createBusiness({
            variables: {
                input: {
                    name: createForm.name,
                    businessType: createForm.businessType,
                    imageUrl: createForm.imageUrl || null,
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
    }

    function openEditModal(business: Business) {
        setSelected(business);
        setEditForm({
            name: business.name,
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
        setEditOpen(true);
    }

    async function handleEdit() {
        if (!selected) return;
        
        if (!editForm.name.trim() || !editForm.location.address.trim()) {
            alert("Please fill in all required fields");
            return;
        }

        await updateBusiness({
            variables: {
                id: selected.id,
                input: {
                    name: editForm.name,
                    businessType: editForm.businessType,
                    imageUrl: editForm.imageUrl || null,
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

        await refetch();
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

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Businesses</h1>
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                    + Create Business
                </Button>
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
                        {businesses.map((b) => (
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
                        ))}
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
                open={createOpen}
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

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Image URL (optional)
                        </label>
                        <Input
                            placeholder="e.g., https://example.com/image.jpg"
                            value={createForm.imageUrl}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    imageUrl: e.target.value,
                                })
                            }
                        />
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
                    >
                        Create Business
                    </Button>
                </div>
            </Modal>

            {/* ---------------------------------------------------------
         EDIT MODAL
      ---------------------------------------------------------- */}
            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Business"
            >
                <div className="space-y-4">
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

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Image URL (optional)
                        </label>
                        <Input
                            placeholder="e.g., https://example.com/image.jpg"
                            value={editForm.imageUrl}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    imageUrl: e.target.value,
                                })
                            }
                        />
                    </div>

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
                                <label className="block text-xs text-gray-500 mb-1">
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
                                <label className="block text-xs text-gray-500 mb-1">
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

                    <Button
                        variant="primary"
                        className="w-full mt-2"
                        onClick={handleEdit}
                    >
                        Save Changes
                    </Button>
                </div>
            </Modal>

            {/* ---------------------------------------------------------
         DELETE CONFIRMATION
      ---------------------------------------------------------- */}
            <Modal
                open={deleteId !== null}
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
