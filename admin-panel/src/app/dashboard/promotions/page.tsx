"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Tag, Plus, Edit, Trash2, Calendar } from "lucide-react";

interface Promotion {
  id: string;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrder: number;
  maxUses: number;
  currentUses: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Tag size={28} />
            Promotions & Coupons
          </h1>
          <p className="text-neutral-400 mt-1">
            Manage discount codes and promotional campaigns
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Create Promotion
        </Button>
      </div>

      {/* Promotions Table */}
      <Table>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Discount</Th>
            <Th>Usage</Th>
            <Th>Valid Period</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {promotions.length === 0 ? (
            <tr>
              <Td colSpan={6}>
                <div className="text-center py-12">
                  <Tag size={48} className="mx-auto text-neutral-600 mb-4" />
                  <p className="text-neutral-400 mb-2">No promotions yet</p>
                  <p className="text-neutral-500 text-sm mb-4">
                    Create your first promotion to attract customers
                  </p>
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Create Promotion
                  </Button>
                </div>
              </Td>
            </tr>
          ) : (
            promotions.map((promo) => (
              <tr key={promo.id}>
                <Td>
                  <div className="font-mono font-medium text-white">
                    {promo.code}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {promo.description}
                  </div>
                </Td>
                <Td>
                  <span className="text-white font-medium">
                    {promo.discountType === "PERCENTAGE"
                      ? `${promo.discountValue}%`
                      : `$${promo.discountValue}`}
                  </span>
                  <div className="text-xs text-neutral-400">
                    Min order: ${promo.minOrder}
                  </div>
                </Td>
                <Td>
                  <span className="text-white">
                    {promo.currentUses} / {promo.maxUses}
                  </span>
                </Td>
                <Td>
                  <div className="text-sm">
                    <div className="text-white">
                      {new Date(promo.validFrom).toLocaleDateString()}
                    </div>
                    <div className="text-neutral-400">
                      to {new Date(promo.validTo).toLocaleDateString()}
                    </div>
                  </div>
                </Td>
                <Td>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                      promo.isActive
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-neutral-500/10 text-neutral-400 border-neutral-500/30"
                    }`}
                  >
                    {promo.isActive ? "Active" : "Inactive"}
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

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Promotion"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Coupon Code
            </label>
            <Input placeholder="SUMMER2024" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description
            </label>
            <Input placeholder="Summer sale 20% off" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Discount Type
              </label>
              <select className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Value
              </label>
              <Input type="number" placeholder="20" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Create Promotion
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
