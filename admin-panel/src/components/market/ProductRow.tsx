'use client';

import Button from '@/components/ui/Button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, Eye, EyeOff, Tag, GripVertical, Package } from 'lucide-react';

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
            className={`hover:bg-gray-800/50 transition-colors ${
                sortMode ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'bg-gray-800' : ''}`}
        >
            {/* Drag Handle */}
            {sortMode && (
                <td className="px-4 py-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1.5 bg-purple-500/20 rounded cursor-grab active:cursor-grabbing hover:bg-purple-500/30"
                    >
                        <GripVertical size={16} className="text-purple-400" />
                    </div>
                </td>
            )}

            {/* Image */}
            <td className="px-4 py-3">
                <div className="w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-gray-600" />
                        </div>
                    )}
                </div>
            </td>

            {/* Product Name & Description */}
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-medium text-white text-sm">{product.name}</span>
                    {product.description && (
                        <span className="text-xs text-gray-500 truncate max-w-xs" title={product.description}>
                            {product.description}
                        </span>
                    )}
                </div>
            </td>

            {/* Category */}
            <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">{categoryName}</span>
            </td>

            {/* Subcategory */}
            <td className="px-4 py-3">
                {subcategoryName ? (
                    <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                        {subcategoryName}
                    </span>
                ) : (
                    <span className="text-gray-600 text-xs">—</span>
                )}
            </td>

            {/* Price */}
            <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                    {product.isOnSale && product.saleDiscountPercentage != null ? (
                        <>
                            <span className="font-bold text-green-400">
                                ${(product.price * (1 - product.saleDiscountPercentage / 100)).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 line-through">${product.price.toFixed(2)}</span>
                        </>
                    ) : (
                        <span className="font-bold text-white">${product.price.toFixed(2)}</span>
                    )}
                </div>
            </td>

            {/* Markup Price */}
            <td className="px-4 py-3">
                {product.markupPrice != null && product.markupPrice > 0 ? (
                    <span className="font-medium text-zinc-200 tabular-nums">€{product.markupPrice.toFixed(2)}</span>
                ) : (
                    <span className="text-amber-400/70 text-xs">Not set</span>
                )}
            </td>

            {/* Night Price */}
            <td className="px-4 py-3">
                {product.nightMarkedupPrice != null && product.nightMarkedupPrice > 0 ? (
                    <span className="font-medium text-zinc-200 tabular-nums">
                        €{product.nightMarkedupPrice.toFixed(2)}
                    </span>
                ) : (
                    <span className="text-amber-400/70 text-xs">Not set</span>
                )}
            </td>

            {/* On Sale Toggle */}
            <td className="px-4 py-3 text-center">
                <button
                    onClick={onToggleSale}
                    className={`p-2 rounded transition-colors ${
                        product.isOnSale
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                    title={product.isOnSale ? 'Remove from sale' : 'Put on sale'}
                >
                    <Tag size={16} />
                </button>
            </td>

            {/* Available Toggle */}
            <td className="px-4 py-3 text-center">
                <button
                    onClick={onToggleAvailability}
                    className={`p-2 rounded transition-colors ${
                        product.isAvailable
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                    title={product.isAvailable ? 'Mark as unavailable' : 'Mark as available'}
                >
                    {product.isAvailable ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit} className="px-3 py-1.5">
                        <Edit2 size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={onDelete} className="px-3 py-1.5">
                        <Trash2 size={14} />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

export type { Product };
