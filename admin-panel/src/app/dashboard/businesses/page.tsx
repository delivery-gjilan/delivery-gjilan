"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";

/* ---------------------------------------------------------
   GRAPHQL TYPES
--------------------------------------------------------- */

type BusinessType = "RESTAURANT" | "MARKET" | "PHARMACY";

interface Business {
  id: string;
  name: string;
  businessType: BusinessType;
  imageUrl?: string | null;
  isActive: boolean;
}

/* ---------------------------------------------------------
   GRAPHQL QUERIES & MUTATIONS
--------------------------------------------------------- */

const GET_BUSINESSES = gql`
  query GetBusinesses {
    businesses {
      id
      name
      imageUrl
      businessType
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_BUSINESS = gql`
  mutation CreateBusiness($input: CreateBusinessInput!) {
    createBusiness(input: $input) {
      id
      name
      businessType
      imageUrl
      isActive
    }
  }
`;

const UPDATE_BUSINESS = gql`
  mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {
    updateBusiness(id: $id, input: $input) {
      id
      name
      businessType
      imageUrl
      isActive
    }
  }
`;

const DELETE_BUSINESS = gql`
  mutation DeleteBusiness($id: ID!) {
    deleteBusiness(id: $id)
  }
`;

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function BusinessesPage() {
  /* --------------------------
     Apollo
  --------------------------- */
  const { data, loading, refetch } = useQuery<{ businesses: Business[] }>(GET_BUSINESSES);

  const [createBusiness] = useMutation<{ createBusiness: Business }>(CREATE_BUSINESS);
  const [updateBusiness] = useMutation<{ updateBusiness: Business }>(UPDATE_BUSINESS);
  const [deleteBusiness] = useMutation<{ deleteBusiness: boolean }>(DELETE_BUSINESS);

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
  });

  const [editForm, setEditForm] = useState({
    name: "",
    businessType: "RESTAURANT" as BusinessType,
    imageUrl: "",
  });

  /* --------------------------
     Handlers
  --------------------------- */

  async function handleCreate() {
    await createBusiness({
      variables: {
        input: {
          name: createForm.name,
          businessType: createForm.businessType,
          imageUrl: createForm.imageUrl || null,
        },
      },
    });

    await refetch();
    setCreateOpen(false);

    // Reset form
    setCreateForm({
      name: "",
      businessType: "RESTAURANT",
      imageUrl: "",
    });
  }

  function openEditModal(business: Business) {
    setSelected(business);
    setEditForm({
      name: business.name,
      businessType: business.businessType,
      imageUrl: business.imageUrl || "",
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!selected) return;

    await updateBusiness({
      variables: {
        id: selected.id,
        input: {
          name: editForm.name,
          businessType: editForm.businessType,
          imageUrl: editForm.imageUrl || null,
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
                    <span className="text-gray-500">No image</span>
                  )}
                </Td>
                <Td>
                  {b.isActive ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <span className="text-red-400">Inactive</span>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
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
          <Input
            placeholder="Business name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm({ ...createForm, name: e.target.value })
            }
          />

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

          <Input
            placeholder="Image URL (optional)"
            value={createForm.imageUrl}
            onChange={(e) =>
              setCreateForm({ ...createForm, imageUrl: e.target.value })
            }
          />

          <Button variant="primary" className="w-full mt-2" onClick={handleCreate}>
            Create
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
          <Input
            placeholder="Business name"
            value={editForm.name}
            onChange={(e) =>
              setEditForm({ ...editForm, name: e.target.value })
            }
          />

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

          <Input
            placeholder="Image URL (optional)"
            value={editForm.imageUrl}
            onChange={(e) =>
              setEditForm({ ...editForm, imageUrl: e.target.value })
            }
          />

          <Button variant="primary" className="w-full mt-2" onClick={handleEdit}>
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
