"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useBusinesses } from "@/lib/hooks/useBusinesses";
import { useProducts } from "@/lib/hooks/useProducts";
import { GET_STORE_STATUS, UPDATE_STORE_STATUS } from "@/graphql/operations/store";
import {
    GET_MY_INVENTORY,
    GET_INVENTORY_SUMMARY,
    SET_INVENTORY_QUANTITY,
    BULK_SET_INVENTORY,
    REMOVE_INVENTORY_ITEM,
} from "@/graphql/operations/inventory";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Package,
    Search,
    Plus,
    Minus,
    AlertTriangle,
    PackageX,
    TrendingUp,
    Boxes,
    Warehouse,
    Edit2,
    Trash2,
    PackageCheck,
    ArrowUpDown,
    X,
    ChevronDown,
    DollarSign,
    ShoppingCart,
} from "lucide-react";

/* ===============================================
   TYPES
=============================================== */

interface InventoryItem {
    id: string;
    productId: string;
    productName: string;
    productImageUrl?: string | null;
    productBasePrice: number;
    productMarkupPrice?: number | null;
    productNightPrice?: number | null;
    categoryName?: string | null;
    quantity: number;
    lowStockThreshold?: number | null;
    costPrice?: number | null;
    isLowStock: boolean;
    updatedAt?: string | null;
}

interface InventorySummary {
    totalTrackedProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
}

type SortField = "name" | "quantity" | "category" | "costPrice" | "margin";
type SortDir = "asc" | "desc";
type FilterMode = "all" | "low-stock" | "out-of-stock" | "in-stock";

/* ===============================================
   MAIN PAGE
=============================================== */

export default function InventoryPage() {
    const { businesses, loading: businessesLoading } = useBusinesses();

    const marketBusiness = useMemo(() => {
        return businesses.find((b: any) => b.businessType === "MARKET");
    }, [businesses]);

    const businessId = marketBusiness?.id ?? "";

    if (businessesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-zinc-500">Loading...</div>
            </div>
        );
    }

    if (!businessId) {
        return (
            <div className="text-white space-y-6">
                <PageHeader />
                <div className="bg-[#111113] border border-zinc-800/50 rounded-xl p-12 text-center">
                    <Warehouse className="mx-auto mb-4 text-zinc-600" size={48} />
                    <p className="text-zinc-400">No market business found. Create one first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white space-y-6">
            <PageHeader />
            <InventoryContent businessId={businessId} businessName={marketBusiness?.name ?? "Market"} />
        </div>
    );
}

/* ===============================================
   HEADER
=============================================== */

function PageHeader() {
    return (
        <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2.5">
                <Warehouse className="text-violet-400" size={28} />
                Personal Inventory
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
                Track your wholesale stock. Items you own are fulfilled from your inventory — the rest goes to the market.
            </p>
        </div>
    );
}

/* ===============================================
   INVENTORY CONTENT
=============================================== */

function InventoryContent({ businessId, businessName }: { businessId: string; businessName: string }) {
    // Store status for inventory mode toggle
    const { data: storeStatusData, refetch: refetchStoreStatus } = useQuery(GET_STORE_STATUS);
    const [updateStoreStatus] = useMutation(UPDATE_STORE_STATUS, { onCompleted: () => refetchStoreStatus() });
    const inventoryModeEnabled = storeStatusData?.getStoreStatus?.inventoryModeEnabled ?? false;

    // Inventory data
    const {
        data: inventoryData,
        loading: inventoryLoading,
        refetch: refetchInventory,
    } = useQuery(GET_MY_INVENTORY, { variables: { businessId } });

    const {
        data: summaryData,
        refetch: refetchSummary,
    } = useQuery(GET_INVENTORY_SUMMARY, { variables: { businessId } });

    // Market products (for adding new items to inventory)
    const { products: marketProducts } = useProducts(businessId);

    // Mutations
    const [setInventoryQuantity, { loading: settingQty }] = useMutation(SET_INVENTORY_QUANTITY);
    const [removeInventoryItem] = useMutation(REMOVE_INVENTORY_ITEM);

    // UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [editModal, setEditModal] = useState<{ open: boolean; item?: InventoryItem }>({ open: false });
    const [addModal, setAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const inventory: InventoryItem[] = inventoryData?.myInventory ?? [];
    const summary: InventorySummary | null = summaryData?.inventorySummary ?? null;

    const refetchAll = useCallback(() => {
        refetchInventory();
        refetchSummary();
    }, [refetchInventory, refetchSummary]);

    // Products not yet in inventory (for "Add" modal)
    const trackedProductIds = useMemo(() => new Set(inventory.map((i) => i.productId)), [inventory]);
    const untrackedProducts = useMemo(
        () => marketProducts.filter((p: any) => !trackedProductIds.has(p.id) && p.isAvailable),
        [marketProducts, trackedProductIds],
    );

    // Filtered & sorted inventory
    const filteredInventory = useMemo(() => {
        let items = [...inventory];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(
                (item) =>
                    item.productName.toLowerCase().includes(q) ||
                    (item.categoryName && item.categoryName.toLowerCase().includes(q)),
            );
        }

        // Filter
        if (filterMode === "low-stock") items = items.filter((i) => i.isLowStock && i.quantity > 0);
        else if (filterMode === "out-of-stock") items = items.filter((i) => i.quantity === 0);
        else if (filterMode === "in-stock") items = items.filter((i) => !i.isLowStock && i.quantity > 0);

        // Sort
        items.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case "name":
                    cmp = a.productName.localeCompare(b.productName);
                    break;
                case "quantity":
                    cmp = a.quantity - b.quantity;
                    break;
                case "category":
                    cmp = (a.categoryName ?? "").localeCompare(b.categoryName ?? "");
                    break;
                case "costPrice":
                    cmp = (a.costPrice ?? 0) - (b.costPrice ?? 0);
                    break;
                case "margin":
                    const marginA = a.costPrice ? (a.productMarkupPrice ?? a.productBasePrice) - a.costPrice : 0;
                    const marginB = b.costPrice ? (b.productMarkupPrice ?? b.productBasePrice) - b.costPrice : 0;
                    cmp = marginA - marginB;
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });

        return items;
    }, [inventory, searchQuery, filterMode, sortField, sortDir]);

    // Toggle inventory mode
    const handleToggleInventoryMode = async () => {
        const ss = storeStatusData?.getStoreStatus;
        await updateStoreStatus({
            variables: {
                input: {
                    isStoreClosed: ss?.isStoreClosed ?? false,
                    inventoryModeEnabled: !inventoryModeEnabled,
                },
            },
        });
        toast.success(inventoryModeEnabled ? "Inventory mode disabled" : "Inventory mode enabled");
    };

    // Quick quantity adjust
    const handleQuickAdjust = async (item: InventoryItem, delta: number) => {
        const newQty = Math.max(0, item.quantity + delta);
        try {
            await setInventoryQuantity({
                variables: {
                    input: {
                        businessId,
                        productId: item.productId,
                        quantity: newQty,
                    },
                },
            });
            refetchAll();
        } catch {
            toast.error("Failed to update quantity");
        }
    };

    // Delete item from inventory
    const handleDelete = async (productId: string) => {
        try {
            await removeInventoryItem({
                variables: { businessId, productId },
            });
            refetchAll();
            setDeleteConfirm(null);
            toast.success("Item removed from inventory");
        } catch {
            toast.error("Failed to remove item");
        }
    };

    // Sort toggle
    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    return (
        <div className="space-y-5">
            {/* Inventory Mode Toggle */}
            <div className={`rounded-xl border p-4 flex items-center justify-between ${
                inventoryModeEnabled
                    ? "bg-violet-500/5 border-violet-500/20"
                    : "bg-[#111113] border-zinc-800/50"
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${inventoryModeEnabled ? "bg-violet-500/10" : "bg-zinc-800"}`}>
                        <Warehouse size={18} className={inventoryModeEnabled ? "text-violet-400" : "text-zinc-500"} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-zinc-200">Inventory Mode</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                            {inventoryModeEnabled
                                ? "Active — orders show stock coverage breakdown"
                                : "Off — all orders go straight to the market"}
                        </div>
                    </div>
                </div>
                <Switch checked={inventoryModeEnabled} onCheckedChange={handleToggleInventoryMode} />
            </div>

            {/* Summary Cards */}
            {summary && <SummaryCards summary={summary} />}

            {/* Alerts */}
            <AlertBanner inventory={inventory} />

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5">
                    {(["all", "in-stock", "low-stock", "out-of-stock"] as FilterMode[]).map((mode) => {
                        const labels: Record<FilterMode, string> = {
                            all: "All",
                            "in-stock": "In Stock",
                            "low-stock": "Low Stock",
                            "out-of-stock": "Out of Stock",
                        };
                        const colors: Record<FilterMode, string> = {
                            all: filterMode === "all" ? "bg-violet-500/15 text-violet-400 border-violet-500/20" : "",
                            "in-stock": filterMode === "in-stock" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "",
                            "low-stock": filterMode === "low-stock" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "",
                            "out-of-stock": filterMode === "out-of-stock" ? "bg-red-500/15 text-red-400 border-red-500/20" : "",
                        };
                        return (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                    filterMode === mode
                                        ? colors[mode]
                                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                                }`}
                            >
                                {labels[mode]}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1" />

                <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>
                    <Plus size={14} />
                    Add Product
                </Button>
            </div>

            {/* Inventory Table */}
            {inventoryLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-zinc-800/30 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : filteredInventory.length === 0 ? (
                <div className="bg-[#111113] border border-zinc-800/50 rounded-xl p-12 text-center">
                    <PackageX className="mx-auto mb-3 text-zinc-600" size={40} />
                    <p className="text-zinc-400 text-sm">
                        {inventory.length === 0
                            ? "No products tracked yet. Add products to start managing your inventory."
                            : "No products match your filters."}
                    </p>
                </div>
            ) : (
                <div className="bg-[#111113] border border-zinc-800/50 rounded-xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_100px_100px_100px_100px_120px] gap-3 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/30">
                        <SortHeader label="Product" field="name" current={sortField} dir={sortDir} onToggle={toggleSort} />
                        <SortHeader label="Stock" field="quantity" current={sortField} dir={sortDir} onToggle={toggleSort} />
                        <SortHeader label="Cost" field="costPrice" current={sortField} dir={sortDir} onToggle={toggleSort} />
                        <div className="text-xs font-medium text-zinc-500">Retail</div>
                        <SortHeader label="Margin" field="margin" current={sortField} dir={sortDir} onToggle={toggleSort} />
                        <div className="text-xs font-medium text-zinc-500 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    {filteredInventory.map((item) => (
                        <InventoryRow
                            key={item.id}
                            item={item}
                            onQuickAdjust={handleQuickAdjust}
                            onEdit={() => setEditModal({ open: true, item })}
                            onDelete={() => setDeleteConfirm(item.productId)}
                            adjusting={settingQty}
                        />
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editModal.open && editModal.item && (
                <EditInventoryModal
                    item={editModal.item}
                    businessId={businessId}
                    onClose={() => setEditModal({ open: false })}
                    onSaved={refetchAll}
                />
            )}

            {/* Add Products Modal */}
            {addModal && (
                <AddProductsModal
                    products={untrackedProducts}
                    businessId={businessId}
                    onClose={() => setAddModal(false)}
                    onAdded={refetchAll}
                />
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <Modal isOpen title="Remove from Inventory" onClose={() => setDeleteConfirm(null)} size="sm">
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            This removes the product from your inventory tracking. It won&apos;t delete the product from the market.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(deleteConfirm)}>Remove</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ===============================================
   SUMMARY CARDS
=============================================== */

function SummaryCards({ summary }: { summary: InventorySummary }) {
    const cards = [
        {
            label: "Tracked Products",
            value: summary.totalTrackedProducts,
            icon: Boxes,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
        },
        {
            label: "Total Stock Units",
            value: summary.totalStockValue,
            icon: Package,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
        },
        {
            label: "Low Stock",
            value: summary.lowStockCount,
            icon: AlertTriangle,
            color: summary.lowStockCount > 0 ? "text-amber-400" : "text-zinc-500",
            bg: summary.lowStockCount > 0 ? "bg-amber-500/10" : "bg-zinc-800",
        },
        {
            label: "Out of Stock",
            value: summary.outOfStockCount,
            icon: PackageX,
            color: summary.outOfStockCount > 0 ? "text-red-400" : "text-zinc-500",
            bg: summary.outOfStockCount > 0 ? "bg-red-500/10" : "bg-zinc-800",
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-3">
            {cards.map((card) => (
                <div key={card.label} className="bg-[#111113] border border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-500">{card.label}</span>
                        <div className={`p-1.5 rounded-lg ${card.bg}`}>
                            <card.icon size={14} className={card.color} />
                        </div>
                    </div>
                    <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                </div>
            ))}
        </div>
    );
}

/* ===============================================
   ALERT BANNER
=============================================== */

function AlertBanner({ inventory }: { inventory: InventoryItem[] }) {
    const lowStock = inventory.filter((i) => i.isLowStock && i.quantity > 0);
    const outOfStock = inventory.filter((i) => i.quantity === 0);

    if (lowStock.length === 0 && outOfStock.length === 0) return null;

    return (
        <div className="space-y-2">
            {outOfStock.length > 0 && (
                <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
                    <PackageX size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <div className="text-sm font-medium text-red-300">Out of Stock</div>
                        <div className="text-xs text-red-400/70 mt-0.5">
                            {outOfStock.map((i) => i.productName).join(", ")}
                        </div>
                    </div>
                </div>
            )}
            {lowStock.length > 0 && (
                <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <div className="text-sm font-medium text-amber-300">Low Stock Warning</div>
                        <div className="text-xs text-amber-400/70 mt-0.5">
                            {lowStock.map((i) => `${i.productName} (${i.quantity} left)`).join(", ")}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===============================================
   SORT HEADER
=============================================== */

function SortHeader({
    label,
    field,
    current,
    dir,
    onToggle,
}: {
    label: string;
    field: SortField;
    current: SortField;
    dir: SortDir;
    onToggle: (f: SortField) => void;
}) {
    const active = current === field;
    return (
        <button
            onClick={() => onToggle(field)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
        >
            {label}
            <ArrowUpDown size={10} className={active ? "text-violet-400" : "text-zinc-600"} />
            {active && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
        </button>
    );
}

/* ===============================================
   INVENTORY ROW
=============================================== */

function InventoryRow({
    item,
    onQuickAdjust,
    onEdit,
    onDelete,
    adjusting,
}: {
    item: InventoryItem;
    onQuickAdjust: (item: InventoryItem, delta: number) => void;
    onEdit: () => void;
    onDelete: () => void;
    adjusting: boolean;
}) {
    const effectivePrice = item.productMarkupPrice ?? item.productBasePrice;
    const margin = item.costPrice ? effectivePrice - item.costPrice : null;
    const marginPct = item.costPrice && item.costPrice > 0
        ? ((margin! / item.costPrice) * 100).toFixed(0)
        : null;

    const stockColor =
        item.quantity === 0
            ? "text-red-400"
            : item.isLowStock
            ? "text-amber-400"
            : "text-emerald-400";

    const stockBg =
        item.quantity === 0
            ? "bg-red-500/10"
            : item.isLowStock
            ? "bg-amber-500/10"
            : "bg-emerald-500/10";

    return (
        <div className="grid grid-cols-[1fr_100px_100px_100px_100px_120px] gap-3 px-4 py-3 border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors items-center group">
            {/* Product */}
            <div className="flex items-center gap-3 min-w-0">
                {item.productImageUrl ? (
                    <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-zinc-600" />
                    </div>
                )}
                <div className="min-w-0">
                    <div className="text-sm text-zinc-200 font-medium truncate">{item.productName}</div>
                    {item.categoryName && (
                        <div className="text-xs text-zinc-600 truncate">{item.categoryName}</div>
                    )}
                </div>
            </div>

            {/* Stock with quick adjust */}
            <div className="flex items-center">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onQuickAdjust(item, -1)}
                        disabled={adjusting || item.quantity === 0}
                        className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Minus size={12} />
                    </button>
                    <span className={`text-sm font-semibold min-w-[28px] text-center ${stockColor}`}>
                        {item.quantity}
                    </span>
                    <button
                        onClick={() => onQuickAdjust(item, 1)}
                        disabled={adjusting}
                        className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>

            {/* Cost Price */}
            <div className="text-sm text-zinc-400">
                {item.costPrice != null ? `€${item.costPrice.toFixed(2)}` : "—"}
            </div>

            {/* Retail Price */}
            <div className="text-sm text-zinc-300">
                <span title={`Base: €${item.productBasePrice.toFixed(2)}`}>€{effectivePrice.toFixed(2)}</span>
                {item.productNightPrice != null && (
                    <span className="ml-1 text-[10px] text-indigo-400" title="Night price">🌙€{item.productNightPrice.toFixed(2)}</span>
                )}
            </div>

            {/* Margin */}
            <div>
                {margin != null ? (
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${margin > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            €{margin.toFixed(2)}
                        </span>
                        {marginPct && (
                            <span className="text-[10px] text-zinc-500">({marginPct}%)</span>
                        )}
                    </div>
                ) : (
                    <span className="text-sm text-zinc-600">—</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-violet-400 transition-colors"
                    title="Edit"
                >
                    <Edit2 size={13} />
                </button>
                <button
                    onClick={() => onQuickAdjust(item, 10)}
                    disabled={adjusting}
                    className="px-2 py-1 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-emerald-400 text-[11px] font-medium transition-colors"
                    title="Quick restock +10"
                >
                    +10
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

/* ===============================================
   EDIT INVENTORY MODAL
=============================================== */

function EditInventoryModal({
    item,
    businessId,
    onClose,
    onSaved,
}: {
    item: InventoryItem;
    businessId: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [quantity, setQuantity] = useState(String(item.quantity));
    const [costPrice, setCostPrice] = useState(item.costPrice != null ? String(item.costPrice) : "");
    const [lowStockThreshold, setLowStockThreshold] = useState(String(item.lowStockThreshold ?? 2));

    const [setInventoryQuantity, { loading }] = useMutation(SET_INVENTORY_QUANTITY);

    const handleSave = async () => {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 0) {
            toast.error("Quantity must be 0 or greater");
            return;
        }

        const cost = costPrice.trim() ? parseFloat(costPrice) : null;
        if (cost !== null && (isNaN(cost) || cost < 0)) {
            toast.error("Cost price must be 0 or greater");
            return;
        }

        const threshold = parseInt(lowStockThreshold, 10);

        try {
            await setInventoryQuantity({
                variables: {
                    input: {
                        businessId,
                        productId: item.productId,
                        quantity: qty,
                        costPrice: cost,
                        lowStockThreshold: isNaN(threshold) ? 2 : threshold,
                    },
                },
            });
            toast.success("Inventory updated");
            onSaved();
            onClose();
        } catch {
            toast.error("Failed to update");
        }
    };

    const margin = costPrice.trim() ? item.productBasePrice - parseFloat(costPrice) : null;

    return (
        <Modal isOpen title={`Edit — ${item.productName}`} onClose={onClose} size="sm">
            <div className="space-y-4">
                {/* Product info */}
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/30">
                    {item.productImageUrl ? (
                        <img src={item.productImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-zinc-800" />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Package size={16} className="text-zinc-600" />
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-medium text-zinc-200">{item.productName}</div>
                        <div className="text-xs text-zinc-500">Retail: €{item.productBasePrice.toFixed(2)}</div>
                    </div>
                </div>

                <Input
                    label="Stock Quantity"
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                />

                <Input
                    label="Cost Price (€) — what you paid wholesale"
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="Optional"
                />

                {margin !== null && !isNaN(margin) && (
                    <div className={`text-xs px-3 py-2 rounded-lg border ${
                        margin > 0
                            ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                            : "bg-red-500/5 border-red-500/15 text-red-400"
                    }`}>
                        <TrendingUp size={12} className="inline mr-1.5" />
                        Margin per unit: €{margin.toFixed(2)}
                        {parseFloat(costPrice) > 0 &&
                            ` (${((margin / parseFloat(costPrice)) * 100).toFixed(0)}%)`}
                    </div>
                )}

                <Input
                    label="Low Stock Alert Threshold"
                    type="number"
                    min={0}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/* ===============================================
   ADD PRODUCTS MODAL
=============================================== */

function AddProductsModal({
    products,
    businessId,
    onClose,
    onAdded,
}: {
    products: any[];
    businessId: string;
    onClose: () => void;
    onAdded: () => void;
}) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Map<string, { qty: number; cost: string }>>(new Map());
    const [bulkSetInventory, { loading }] = useMutation(BULK_SET_INVENTORY);

    const filtered = useMemo(() => {
        if (!search.trim()) return products;
        const q = search.toLowerCase();
        return products.filter((p: any) => p.name?.toLowerCase().includes(q));
    }, [products, search]);

    const toggleProduct = (id: string) => {
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.set(id, { qty: 0, cost: "" });
            }
            return next;
        });
    };

    const updateQty = (id: string, qty: number) => {
        setSelected((prev) => {
            const next = new Map(prev);
            const entry = next.get(id);
            if (entry) next.set(id, { ...entry, qty: Math.max(0, qty) });
            return next;
        });
    };

    const updateCost = (id: string, cost: string) => {
        setSelected((prev) => {
            const next = new Map(prev);
            const entry = next.get(id);
            if (entry) next.set(id, { ...entry, cost });
            return next;
        });
    };

    const handleAdd = async () => {
        if (selected.size === 0) {
            toast.error("Select at least one product");
            return;
        }

        const items = Array.from(selected.entries()).map(([productId, data]) => ({
            productId,
            quantity: data.qty,
            costPrice: data.cost.trim() ? parseFloat(data.cost) : null,
        }));

        try {
            await bulkSetInventory({
                variables: {
                    input: { businessId, items },
                },
            });
            toast.success(`${items.length} product${items.length > 1 ? "s" : ""} added to inventory`);
            onAdded();
            onClose();
        } catch {
            toast.error("Failed to add products");
        }
    };

    return (
        <Modal isOpen title="Add Products to Inventory" onClose={onClose} size="lg">
            <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search market products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                </div>

                {selected.size > 0 && (
                    <div className="text-xs text-violet-400 font-medium">
                        {selected.size} product{selected.size > 1 ? "s" : ""} selected
                    </div>
                )}

                {/* Product list */}
                <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-500">
                            {products.length === 0
                                ? "All market products are already tracked in your inventory."
                                : "No products match your search."}
                        </div>
                    ) : (
                        filtered.map((product: any) => {
                            const isSelected = selected.has(product.id);
                            const entry = selected.get(product.id);
                            return (
                                <div
                                    key={product.id}
                                    className={`rounded-lg border transition-all ${
                                        isSelected
                                            ? "bg-violet-500/5 border-violet-500/20"
                                            : "bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50"
                                    }`}
                                >
                                    <button
                                        onClick={() => toggleProduct(product.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                                    >
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt=""
                                                className="w-8 h-8 rounded-lg object-cover border border-zinc-800"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                <Package size={12} className="text-zinc-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-zinc-200 truncate">{product.name}</div>
                                            <div className="text-xs text-zinc-500">
                                                €{Number(product.price).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? "bg-violet-500 border-violet-500"
                                                : "border-zinc-700"
                                        }`}>
                                            {isSelected && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded options when selected */}
                                    {isSelected && entry && (
                                        <div className="px-3 pb-3 flex items-center gap-3 border-t border-zinc-800/30 pt-2.5 mt-0.5">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-zinc-500 font-medium mb-0.5 block">QTY</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={entry.qty}
                                                    onChange={(e) => updateQty(product.id, parseInt(e.target.value) || 0)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full px-2 py-1.5 bg-[#09090b] border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] text-zinc-500 font-medium mb-0.5 block">COST (€)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={entry.cost}
                                                    onChange={(e) => updateCost(product.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="Optional"
                                                    className="w-full px-2 py-1.5 bg-[#09090b] border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleAdd} disabled={loading || selected.size === 0}>
                        {loading ? "Adding..." : `Add ${selected.size} Product${selected.size !== 1 ? "s" : ""}`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
