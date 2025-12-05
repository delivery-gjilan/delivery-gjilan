"use client";

import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useMemo } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";

/* ----------------------------------------------------
   GRAPHQL
---------------------------------------------------- */

const GET_DATA = gql`
  query ProductsAndCategories($businessId: ID!) {
    productCategories(businessId: $businessId) {
      id
      name
    }
    products(businessId: $businessId) {
      id
      categoryId
      name
      description
      price
      imageUrl
      isOnSale
      salePrice
      isAvailable
    }
  }
`;

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isOnSale: boolean;
  salePrice?: number | null;
  isAvailable: boolean;
}

/* ----------------------------------------------------
   COMPONENT
---------------------------------------------------- */

export default function ProductsBlock({ businessId }: { businessId: string }) {
  const { data, loading, refetch } = useQuery<{
    productCategories: Category[];
    products: Product[];
  }>(GET_DATA, {
    variables: { businessId },
  });

  /* ------------------- UI STATE ------------------- */

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ------------------- FORM STATE ------------------- */

  const [createForm, setCreateForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    isOnSale: false,
    salePrice: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    categoryId: "",
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    isOnSale: false,
    salePrice: "",
    isAvailable: true,
  });

  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct] = useMutation(DELETE_PRODUCT);

  /* ------------------- GROUPING ------------------- */

  const grouped = useMemo(() => {
    if (!data) return {};

    const categories = data.productCategories;
    const products = data.products;

    const groups: Record<string, Product[]> = {};

    categories.forEach((c) => {
      groups[c.id] = [];
    });

    products.forEach((p) => {
      if (!groups[p.categoryId]) groups[p.categoryId] = [];
      groups[p.categoryId].push(p);
    });

    return groups;
  }, [data]);

  /* ------------------- HANDLERS ------------------- */

  async function handleCreate() {
    await createProduct({
      variables: {
        input: {
          businessId,
          categoryId: createForm.categoryId,
          name: createForm.name,
          description: createForm.description,
          imageUrl: createForm.imageUrl || null,
          price: parseFloat(createForm.price),
          isOnSale: createForm.isOnSale,
          salePrice: createForm.isOnSale
            ? parseFloat(createForm.salePrice)
            : null,
        },
      },
    });

    setCreateOpen(false);
    await refetch();
  }

  function openEditModal(p: Product) {
    setEditForm({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      price: String(p.price),
      isOnSale: p.isOnSale,
      salePrice: p.salePrice ? String(p.salePrice) : "",
      isAvailable: p.isAvailable,
    });

    setEditOpen(true);
  }

  async function handleEdit() {
    await updateProduct({
      variables: {
        id: editForm.id,
        input: {
          categoryId: editForm.categoryId,
          name: editForm.name,
          description: editForm.description,
          imageUrl: editForm.imageUrl || null,
          price: parseFloat(editForm.price),
          isOnSale: editForm.isOnSale,
          salePrice: editForm.isOnSale
            ? parseFloat(editForm.salePrice)
            : null,
          isAvailable: editForm.isAvailable,
        },
      },
    });

    setEditOpen(false);
    await refetch();
  }

  async function handleDelete() {
    if (!deleteId) return;

    await deleteProduct({ variables: { id: deleteId } });
    setDeleteId(null);
    await refetch();
  }

  /* ------------------- UI ------------------- */

  if (loading) {
    return <p className="text-gray-400">Loading products...</p>;
  }

  const categories = data?.productCategories || [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Products</h2>

        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Add Product
        </Button>
      </div>

      {/* ------------------- CATEGORY GROUPS ------------------- */}

      {categories.map((cat) => {
        const items = grouped[cat.id] || [];

        return (
          <div key={cat.id} className="mb-10">
            <h3 className="text-lg font-semibold text-purple-300 mb-3">
              {cat.name}
            </h3>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm">No products here.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Image</Th>
                    <Th>Name</Th>
                    <Th>Price</Th>
                    <Th>Sale</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No image</span>
                        )}
                      </Td>

                      <Td>{p.name}</Td>

                      <Td>€{p.price.toFixed(2)}</Td>

                      <Td>
                        {p.isOnSale && p.salePrice != null ? (
                          <span className="text-green-400">
                            €{p.salePrice.toFixed(2)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </Td>

                      <Td>
                        {p.isAvailable ? (
                          <span className="text-green-400">Available</span>
                        ) : (
                          <span className="text-red-400">Hidden</span>
                        )}
                      </Td>

                      <Td>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-xs px-3"
                            onClick={() => openEditModal(p)}
                          >
                            Edit
                          </Button>

                          <Button
                            variant="danger"
                            className="text-xs px-3"
                            onClick={() => setDeleteId(p.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        );
      })}

      {/* ------------------- CREATE MODAL ------------------- */}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Product"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category
            </label>
            <Select
              value={createForm.categoryId}
              onChange={(e) =>
                setCreateForm({ ...createForm, categoryId: e.target.value })
              }
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Product Name
            </label>
            <Input
              placeholder="Product name"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <Input
              placeholder="Description (optional)"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({ ...createForm, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Image URL
            </label>
            <Input
              placeholder="Image URL (optional)"
              value={createForm.imageUrl}
              onChange={(e) =>
                setCreateForm({ ...createForm, imageUrl: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Price
            </label>
            <Input
              placeholder="Price"
              type="number"
              step="0.01"
              value={createForm.price}
              onChange={(e) =>
                setCreateForm({ ...createForm, price: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createForm.isOnSale}
              onChange={(e) =>
                setCreateForm({ ...createForm, isOnSale: e.target.checked })
              }
            />
            <span className="text-gray-300">On Sale</span>
          </div>

          {createForm.isOnSale && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Sale Price
              </label>
              <Input
                placeholder="Sale Price"
                type="number"
                step="0.01"
                value={createForm.salePrice}
                onChange={(e) =>
                  setCreateForm({ ...createForm, salePrice: e.target.value })
                }
              />
            </div>
          )}

          <Button variant="primary" className="w-full" onClick={handleCreate}>
            Save
          </Button>
        </div>
      </Modal>

      {/* ------------------- EDIT MODAL ------------------- */}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Product"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category
            </label>
            <Select
              value={editForm.categoryId}
              onChange={(e) =>
                setEditForm({ ...editForm, categoryId: e.target.value })
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Product Name
            </label>
            <Input
              placeholder="Product name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <Input
              placeholder="Description"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Image URL
            </label>
            <Input
              placeholder="Image URL"
              value={editForm.imageUrl}
              onChange={(e) =>
                setEditForm({ ...editForm, imageUrl: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Price
            </label>
            <Input
              placeholder="Price"
              type="number"
              step="0.01"
              value={editForm.price}
              onChange={(e) =>
                setEditForm({ ...editForm, price: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editForm.isOnSale}
              onChange={(e) =>
                setEditForm({ ...editForm, isOnSale: e.target.checked })
              }
            />
            <span className="text-gray-300">On Sale</span>
          </div>

          {editForm.isOnSale && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Sale Price
              </label>
              <Input
                placeholder="Sale Price"
                type="number"
                step="0.01"
                value={editForm.salePrice}
                onChange={(e) =>
                  setEditForm({ ...editForm, salePrice: e.target.value })
                }
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editForm.isAvailable}
              onChange={(e) =>
                setEditForm({ ...editForm, isAvailable: e.target.checked })
              }
            />
            <span className="text-gray-300">Available</span>
          </div>

          <Button variant="primary" className="w-full" onClick={handleEdit}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* ------------------- DELETE MODAL ------------------- */}

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Product"
      >
        <p className="text-gray-300 mb-4">
          Are you sure you want to delete this product?
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
