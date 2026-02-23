"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Table, Th, Td } from "@/components/ui/Table";
import { Percent, Plus, Edit, Trash2, Package } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  dealPrice: number;
  discount: number;
  products: string[];
  isActive: boolean;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            <Percent size={28} />
            Deals
          </h1>
          <p className="text-zinc-500 mt-1">
            Create bundled product deals for your business
          </p>
        </div>
        <Button>
          <Plus size={18} className="mr-2" />
          Create Deal
        </Button>
      </div>

      {/* Deals Table */}
      <Table>
        <thead>
          <tr>
            <Th>Deal Name</Th>
            <Th>Products</Th>
            <Th>Original Price</Th>
            <Th>Deal Price</Th>
            <Th>Discount</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {deals.length === 0 ? (
            <tr>
              <Td colSpan={7}>
                <div className="text-center py-12">
                  <Percent size={48} className="mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500 mb-2">No deals yet</p>
                  <p className="text-zinc-600 text-sm mb-4">
                    Bundle products together to create attractive deals
                  </p>
                  <Button size="sm">
                    <Plus size={16} className="mr-2" />
                    Create Deal
                  </Button>
                </div>
              </Td>
            </tr>
          ) : (
            deals.map((deal) => (
              <tr key={deal.id}>
                <Td>
                  <div className="font-medium text-white">{deal.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {deal.description}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-zinc-500" />
                    <span className="text-white">{deal.products.length} items</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-zinc-500 line-through">
                    ${deal.originalPrice.toFixed(2)}
                  </span>
                </Td>
                <Td>
                  <span className="text-white font-semibold">
                    ${deal.dealPrice.toFixed(2)}
                  </span>
                </Td>
                <Td>
                  <span className="text-green-400 font-medium">
                    -{deal.discount}%
                  </span>
                </Td>
                <Td>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                      deal.isActive
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-neutral-500/10 text-zinc-500 border-neutral-500/30"
                    }`}
                  >
                    {deal.isActive ? "Active" : "Inactive"}
                  </span>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit size={14} />
                    </Button>
                    <Button size="sm" variant="danger">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
