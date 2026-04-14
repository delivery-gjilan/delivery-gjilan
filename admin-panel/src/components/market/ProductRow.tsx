'use client';

import Button from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, GripVertical, Package } from 'lucide-react';

interface Product {
    id: string;
    categoryId: string;
    subcategoryId?: string | null;
    variantGroupId?: string | null;
    variantGroupName?: string | null;
    name: string;
    description?: string | null;
    price: number;
    markupPrice?: number | null;
    nightMarkedupPrice?: number | null;
    imageUrl?: string | null;
    isOffer: boolean;
    isOnSale: boolean;
    saleDiscountPercentage?: number | null;
    isAvailable: boolean;
    sortOrder: number;
}

interface ProductRowProps {
    product: Product;
    categoryName: string;
    subcategoryName?: string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleSale: () => void;
    onToggleAvailability: () => void;
    sortMode: boolean;
}

export default function ProductRow({
    product,
    categoryName,
    subcategoryName,
    onEdit,
    onDelete,
    onToggleSale,
    onToggleAvailability,
    sortMode,
}: ProductRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: product.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`transition-colors hover:bg-zinc-800/30 ${
                sortMode ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'bg-zinc-900' : ''}`}
        >
            {/* Drag Handle */}
            {sortMode && (
                <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                    <div
                        {...attributes}
                        {...listeners}
                        className="inline-flex items-center justify-center rounded border border-violet-500/30 bg-violet-500/10 p-1 text-violet-300 hover:bg-violet-500/20 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical size={14} />
                    </div>
                </td>
            )}

            {/* Image */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800">
                    {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-zinc-700" />
                        </div>
                    )}
                </div>
            </td>

            {/* Product Name & Description */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                <div className="flex flex-col">
                    <span className="font-medium text-zinc-100 text-sm">{product.name}</span>
                    {product.description && (
                        <span className="text-xs text-zinc-500 truncate max-w-xs" title={product.description}>
                            {product.description}
                        </span>
                    )}
                </div>
            </td>

            {/* Category */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                <Badge variant="default" className="text-[11px]">{categoryName}</Badge>
            </td>

            {/* Subcategory */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                {subcategoryName ? (
                    <Badge variant="secondary" className="text-[11px]">{subcategoryName}</Badge>
                ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                )}
            </td>

            {/* Price */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                <div className="flex flex-col gap-0.5">
                    {product.isOnSale && product.saleDiscountPercentage != null ? (
                        <>
                            <span className="font-semibold text-green-400 text-sm tabular-nums">
                                €{(product.price * (1 - product.saleDiscountPercentage / 100)).toFixed(2)}
                            </span>
                            <span className="text-xs text-zinc-600 line-through tabular-nums">€{product.price.toFixed(2)}</span>
                        </>
                    ) : (
                        <span className="font-semibold text-zinc-100 text-sm tabular-nums">€{product.price.toFixed(2)}</span>
                    )}
                </div>
            </td>

            {/* Markup Price */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                {product.markupPrice != null && product.markupPrice > 0 ? (
                    <span className="text-sm text-zinc-300 tabular-nums">€{product.markupPrice.toFixed(2)}</span>
                ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                )}
            </td>

            {/* Night Price */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                {product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0 ? (
                    <span className="text-sm text-zinc-300 tabular-nums">€{product.nightMarkedupPrice.toFixed(2)}</span>
                ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                )}
            </td>

            {/* On Sale Toggle */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60">
                <Switch checked={product.isOnSale} onCheckedChange={onToggleSale} />
            </td>

            {/* Available Toggle */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60 text-center">
                <Switch checked={product.isAvailable} onCheckedChange={onToggleAvailability} />
            </td>

            {/* Actions */}
            <td className="px-4 py-2.5 border-b border-[#1e1e22]/60 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit2 size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={onDelete}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

export type { Product };
