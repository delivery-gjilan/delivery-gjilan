"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";

/* --------------------------
   Types
--------------------------- */

interface ProductCategory {
  id: string;
  name: string;
  isActive: boolean;
}

interface CategoriesQueryResponse {
  productCategories: ProductCategory[];
}

export default function CategoriesBlock({ businessId }: { businessId: string }) {
  /* -----------------------------
     GraphQL
  ------------------------------ */

  const GET_CATEGORIES = gql`
    query ProductCategories($businessId: ID!) {
      productCategories(businessId: $businessId) {
        id
        name
        isActive
      }
    }
  `;

  const CREATE_CATEGORY = gql`
    mutation CreateProductCategory($input: CreateProductCategoryInput!) {
      createProductCategory(input: $input) {
        id
        name
        isActive
      }
    }
  `;

  const UPDATE_CATEGORY = gql`
    mutation UpdateProductCategory($id: ID!, $input: UpdateProductCategoryInput!) {
      updateProductCategory(id: $id, input: $input) {
        id
        name
        isActive
      }
    }
  `;

  const DELETE_CATEGORY = gql`
    mutation DeleteProductCategory($id: ID!) {
      deleteProductCategory(id: $id)
    }
  `;

  /* -----------------------------
     Query
  ------------------------------ */

  const { data, loading, refetch } = useQuery<CategoriesQueryResponse>(
    GET_CATEGORIES,
    { variables: { businessId } }
  );

  const [createCategory] = useMutation(CREATE_CATEGORY);
  const [updateCategory] = useMutation(UPDATE_CATEGORY);
  const [deleteCategory] = useMutation(DELETE_CATEGORY);

  /* -----------------------------
     Local UI State
  ------------------------------ */

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // forms
  const [createForm, setCreateForm] = useState({ name: "" });

  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    isActive: true,
  });

  /* -----------------------------
     Create
  ------------------------------ */

  async function handleCreate() {
    await createCategory({
      variables: {
        input: {
          businessId,
          name: createForm.name,
        },
      },
    });

    await refetch();
    setCreateOpen(false);
    setCreateForm({ name: "" });
  }

  /* -----------------------------
     Edit
  ------------------------------ */

  function openEditModal(cat: ProductCategory) {
    setEditForm({
      id: cat.id,
      name: cat.name,
      isActive: cat.isActive,
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    await updateCategory({
      variables: {
        id: editForm.id,
        input: {
          name: editForm.name,
          isActive: editForm.isActive,
        },
      },
    });

    await refetch();
    setEditOpen(false);
  }

  /* -----------------------------
     Delete
  ------------------------------ */

  async function handleDelete() {
    if (!deleteId) return;

    await deleteCategory({ variables: { id: deleteId } });
    await refetch();
    setDeleteId(null);
  }

  /* -----------------------------
     Render
  ------------------------------ */

  if (loading) return <p className="text-gray-400">Loading categories...</p>;

  const categories = data?.productCategories ?? [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Add Category
        </Button>
      </div>

      {/* Table */}
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <Td>{c.name}</Td>
              <Td>
                {c.isActive ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-red-400">Inactive</span>
                )}
              </Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditModal(c)}>
                    Edit
                  </Button>

                  <Button variant="danger" onClick={() => setDeleteId(c.id)}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {categories.length === 0 && (
        <p className="text-gray-500 text-center py-4">No categories yet.</p>
      )}

      {/* -----------------------------
          MODALS
      ------------------------------ */}

      {/* CREATE */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Category">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category Name
            </label>
            <Input
              placeholder="Category name"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ name: e.target.value })
              }
            />
          </div>

          <Button variant="primary" className="w-full" onClick={handleCreate}>
            Save
          </Button>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Category">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category Name
            </label>
            <Input
              placeholder="Category name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </div>

          <Button variant="primary" className="w-full" onClick={handleEdit}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* DELETE */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
      >
        <p className="text-gray-300 mb-4">
          Are you sure you want to delete this category?
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
